import { app, BrowserWindow, dialog, ipcMain, safeStorage, shell } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import {
  DESKTOP_GEMINI_ENV_KEY,
  getDesktopRuntimeEnvironment,
  getGeminiCredentialPath,
  isTrustedCalcoraRendererUrl,
  resolveGeminiApiKey,
} from './runtimeConfig';
import {
  canUseOsCredentialStore,
  describeRecoveryDialogButtons,
  getWindowLifecyclePolicy,
  resolveRecoveryAction,
} from './platformPolicy';

Object.assign(process.env, getDesktopRuntimeEnvironment());

const WINDOW_LIFECYCLE = getWindowLifecyclePolicy(process.platform);

let LOG_DIRECTORY = '';
let STARTUP_LOG = '';
let CREDENTIAL_PATH = '';
let quitRequested = false;
let mainWindow: BrowserWindow | null = null;

function canStoreCredentialsSecurely(): boolean {
  const backend = process.platform === 'linux' ? safeStorage.getSelectedStorageBackend() : 'unknown';
  return canUseOsCredentialStore(process.platform, safeStorage.isEncryptionAvailable(), backend);
}

function logStartupFailure(error: unknown): void {
  const detail = error instanceof Error ? `${error.name}: ${error.message}` : 'Unknown startup error';
  try {
    fs.mkdirSync(LOG_DIRECTORY, { recursive: true });
    fs.appendFileSync(STARTUP_LOG, `[${new Date().toISOString()}] ${detail}\n`);
  } catch {
    // A logging failure should not prevent recovery UI from appearing.
  }
}

function readStoredGeminiKey(): string | undefined {
  if (!canStoreCredentialsSecurely()) return undefined;
  try {
    const encrypted = fs.readFileSync(CREDENTIAL_PATH);
    const key = safeStorage.decryptString(encrypted).trim();
    return key || undefined;
  } catch {
    return undefined;
  }
}

function registerGeminiCredentialHandlers(): void {
  const isTrustedSender = (event: Electron.IpcMainInvokeEvent) =>
    Boolean(event.senderFrame)
    && event.senderFrame === event.sender.mainFrame
    && isTrustedCalcoraRendererUrl(
      event.senderFrame.url,
      Number(process.env.CALCORA_RUNTIME_PORT) || 3000,
    );

  ipcMain.handle('calcora:gemini-status', (event) => {
    if (!isTrustedSender(event)) {
      return { configured: false, secureStorageAvailable: false, message: 'Credential settings are unavailable to this renderer.' };
    }
    const secureStorageAvailable = canStoreCredentialsSecurely();
    const desktopKey = readStoredGeminiKey();
    const environmentKey = !desktopKey && Boolean(resolveGeminiApiKey());
    return {
      configured: Boolean(desktopKey || environmentKey),
      managedByDesktop: Boolean(desktopKey),
      secureStorageAvailable,
      message: desktopKey
        ? 'Gemini key is encrypted with the operating-system credential store.'
        : environmentKey
          ? 'Gemini key is provided by the server environment and is not managed by desktop settings.'
          : secureStorageAvailable
            ? 'No Gemini key is saved. Add an optional key for this desktop user.'
            : 'Secure credential storage is unavailable; Calcora will not save a key on this device.',
    };
  });

  ipcMain.handle('calcora:gemini-set-key', (event, value: unknown) => {
    if (!isTrustedSender(event)) {
      return { success: false, message: 'Credential settings are unavailable to this renderer.' };
    }
    if (typeof value !== 'string' || value.trim().length < 10 || value.trim().length > 256) {
      return { success: false, message: 'Enter a valid Gemini API key.' };
    }
    const key = value.trim();
    if (/^(MY_GEMINI_API_KEY|your-gemini-api-key|CHANGE-ME)$/i.test(key)) {
      return { success: false, message: 'The placeholder value cannot be saved as a credential.' };
    }
    if (!canStoreCredentialsSecurely()) {
      return { success: false, message: 'Secure credential storage is unavailable on this device.' };
    }
    try {
      fs.mkdirSync(path.dirname(CREDENTIAL_PATH), { recursive: true });
      const tempPath = `${CREDENTIAL_PATH}.tmp`;
      fs.writeFileSync(tempPath, safeStorage.encryptString(key), { mode: 0o600 });
      fs.renameSync(tempPath, CREDENTIAL_PATH);
      process.env[DESKTOP_GEMINI_ENV_KEY] = key;
      return { success: true, message: 'Gemini key saved securely for this desktop user.' };
    } catch {
      return { success: false, message: 'The Gemini key could not be stored securely.' };
    }
  });

  ipcMain.handle('calcora:gemini-clear-key', (event) => {
    if (!isTrustedSender(event)) {
      return { success: false, message: 'Credential settings are unavailable to this renderer.' };
    }
    try {
      if (fs.existsSync(CREDENTIAL_PATH)) fs.unlinkSync(CREDENTIAL_PATH);
      delete process.env[DESKTOP_GEMINI_ENV_KEY];
      return { success: true, message: 'The desktop Gemini key was removed.' };
    } catch {
      return { success: false, message: 'The stored Gemini key could not be removed.' };
    }
  });
}

async function startBackend(): Promise<void> {
  const backendModule = '../dist/server.cjs';
  await import(backendModule);

  for (let attempt = 0; attempt < 80; attempt += 1) {
    const port = Number(process.env.CALCORA_RUNTIME_PORT);
    if (Number.isInteger(port) && port > 0 && port <= 65535) {
      try {
        const response = await fetch(`http://127.0.0.1:${port}/api/health`);
        if (response.ok) return;
      } catch {
        // The local server is still starting.
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error('Calcora backend did not become ready within 20 seconds.');
}

async function createWindow(): Promise<void> {
  await startBackend();

  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, 'icons', 'calcora-icon.png')
    : path.join(app.getAppPath(), 'build', 'icons', 'calcora-icon.png');
  const preloadPath = path.join(app.getAppPath(), 'dist-electron', 'preload.cjs');

  const window = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#0b1020',
    icon: iconPath,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  const backendPort = Number(process.env.CALCORA_RUNTIME_PORT);
  const rendererUrl = `http://127.0.0.1:${backendPort}/`;
  mainWindow = window;
  window.on('closed', () => {
    if (mainWindow === window) mainWindow = null;
  });
  await window.loadURL(rendererUrl);
  window.webContents.on('will-navigate', (event, url) => {
    if (!isTrustedCalcoraRendererUrl(url, backendPort)) event.preventDefault();
  });
  window.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsed = new URL(url);
      if (parsed.protocol === 'https:' || parsed.protocol === 'mailto:') void shell.openExternal(url);
    } catch {
      // Reject malformed or unsupported external URLs.
    }
    return { action: 'deny' };
  });
}

async function startWithRecovery(): Promise<void> {
  while (!quitRequested) {
    try {
      await createWindow();
      return;
    } catch (error) {
      logStartupFailure(error);
      const result = await dialog.showMessageBox({
        type: 'error',
        title: 'Calcora AI could not start',
        message: 'The local Calcora service did not become ready, so the calculator window could not open.',
        detail: `A diagnostic entry was written to the Calcora logs folder:\n${LOG_DIRECTORY}`,
        // Button order is fixed: the action is resolved from the response index,
        // and macOS appends its own Cancel button, which must also end the loop.
        buttons: describeRecoveryDialogButtons(process.platform),
        defaultId: 0,
        cancelId: describeRecoveryDialogButtons(process.platform).length - 1,
        noLink: true,
      });
      const action = resolveRecoveryAction(result.response);
      if (action === 'quit') {
        app.quit();
        return;
      }
      if (action === 'open-logs') {
        await shell.openPath(LOG_DIRECTORY);
      }
    }
  }
}

/**
 * One Calcora per desktop session.
 *
 * Without this lock, a second launch (double-clicking the shortcut, or an
 * installer relaunch) starts a second backend that collides with the first
 * one's port, which surfaces as the "could not start" recovery dialog instead of
 * a second window. The lock is identical on Windows, macOS and Linux.
 */
const isPrimaryInstance = app.requestSingleInstanceLock();
if (!isPrimaryInstance) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });

  app.whenReady()
    .then(() => {
      const userDataPath = app.getPath('userData');
      LOG_DIRECTORY = path.join(userDataPath, 'logs');
      STARTUP_LOG = path.join(LOG_DIRECTORY, 'startup.log');
      CREDENTIAL_PATH = getGeminiCredentialPath(userDataPath);
      process.env.CALCORA_APP_ROOT = app.getAppPath();
      process.env[DESKTOP_GEMINI_ENV_KEY] = readStoredGeminiKey() ?? '';
      registerGeminiCredentialHandlers();
      return startWithRecovery();
    })
    .catch((error: unknown) => {
      logStartupFailure(error);
      return startWithRecovery();
    });

  app.on('before-quit', () => {
    quitRequested = true;
  });

  app.on('window-all-closed', () => {
    if (WINDOW_LIFECYCLE.quitWhenAllWindowsClosed) app.quit();
  });

  /**
   * macOS convention: the app stays running with no window, and clicking the dock
   * icon re-creates it. Windows and Linux quit with the last window instead, so
   * there is nothing to re-activate there.
   */
  app.on('activate', () => {
    if (!WINDOW_LIFECYCLE.recreateWindowOnActivate) return;
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
      return;
    }
    void startWithRecovery();
  });
}
