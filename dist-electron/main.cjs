var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// electron/main.ts
var import_electron = require("electron");
var import_node_fs = __toESM(require("node:fs"), 1);
var import_node_path = __toESM(require("node:path"), 1);

// electron/runtimeConfig.ts
var DESKTOP_GEMINI_ENV_KEY = "CALCORA_DESKTOP_GEMINI_API_KEY";
function getDesktopRuntimeEnvironment(env = process.env) {
  return {
    ...env,
    NODE_ENV: "production",
    CALCORA_DESKTOP: "1",
    CALCORA_PORT: "0"
  };
}
function getGeminiCredentialPath(userDataPath) {
  const separator = userDataPath.includes("\\") ? "\\" : "/";
  return `${userDataPath.replace(/[\\/]+$/, "")}${separator}gemini-credential.bin`;
}
function resolveGeminiApiKey(env = process.env) {
  const desktopCredential = env.CALCORA_DESKTOP === "1" ? env[DESKTOP_GEMINI_ENV_KEY]?.trim() : void 0;
  const environmentCredential = env.GEMINI_API_KEY?.trim();
  const key = desktopCredential || environmentCredential;
  return key && !["MY_GEMINI_API_KEY", "your-gemini-api-key", "CHANGE-ME"].includes(key) ? key : void 0;
}
function isTrustedCalcoraRendererUrl(rawUrl, expectedPort = 3e3) {
  try {
    const url = new URL(rawUrl);
    return url.protocol === "http:" && url.hostname === "127.0.0.1" && Number(url.port) === expectedPort && (url.pathname === "/" || url.pathname === "/index.html") && !url.username && !url.password;
  } catch {
    return false;
  }
}

// electron/main.ts
Object.assign(process.env, getDesktopRuntimeEnvironment());
var LOG_DIRECTORY = "";
var STARTUP_LOG = "";
var CREDENTIAL_PATH = "";
var quitRequested = false;
function canStoreCredentialsSecurely() {
  if (!import_electron.safeStorage.isEncryptionAvailable()) return false;
  if (process.platform !== "linux") return true;
  const backend = import_electron.safeStorage.getSelectedStorageBackend();
  return backend !== "basic_text" && backend !== "unknown";
}
function logStartupFailure(error) {
  const detail = error instanceof Error ? `${error.name}: ${error.message}` : "Unknown startup error";
  try {
    import_node_fs.default.mkdirSync(LOG_DIRECTORY, { recursive: true });
    import_node_fs.default.appendFileSync(STARTUP_LOG, `[${(/* @__PURE__ */ new Date()).toISOString()}] ${detail}
`);
  } catch {
  }
}
function readStoredGeminiKey() {
  if (!canStoreCredentialsSecurely()) return void 0;
  try {
    const encrypted = import_node_fs.default.readFileSync(CREDENTIAL_PATH);
    const key = import_electron.safeStorage.decryptString(encrypted).trim();
    return key || void 0;
  } catch {
    return void 0;
  }
}
function registerGeminiCredentialHandlers() {
  const isTrustedSender = (event) => Boolean(event.senderFrame) && event.senderFrame === event.sender.mainFrame && isTrustedCalcoraRendererUrl(
    event.senderFrame.url,
    Number(process.env.CALCORA_RUNTIME_PORT) || 3e3
  );
  import_electron.ipcMain.handle("calcora:gemini-status", (event) => {
    if (!isTrustedSender(event)) {
      return { configured: false, secureStorageAvailable: false, message: "Credential settings are unavailable to this renderer." };
    }
    const secureStorageAvailable = canStoreCredentialsSecurely();
    const desktopKey = readStoredGeminiKey();
    const environmentKey = !desktopKey && Boolean(resolveGeminiApiKey());
    return {
      configured: Boolean(desktopKey || environmentKey),
      managedByDesktop: Boolean(desktopKey),
      secureStorageAvailable,
      message: desktopKey ? "Gemini key is encrypted with the operating-system credential store." : environmentKey ? "Gemini key is provided by the server environment and is not managed by desktop settings." : secureStorageAvailable ? "No Gemini key is saved. Add an optional key for this desktop user." : "Secure credential storage is unavailable; Calcora will not save a key on this device."
    };
  });
  import_electron.ipcMain.handle("calcora:gemini-set-key", (event, value) => {
    if (!isTrustedSender(event)) {
      return { success: false, message: "Credential settings are unavailable to this renderer." };
    }
    if (typeof value !== "string" || value.trim().length < 10 || value.trim().length > 256) {
      return { success: false, message: "Enter a valid Gemini API key." };
    }
    const key = value.trim();
    if (/^(MY_GEMINI_API_KEY|your-gemini-api-key|CHANGE-ME)$/i.test(key)) {
      return { success: false, message: "The placeholder value cannot be saved as a credential." };
    }
    if (!canStoreCredentialsSecurely()) {
      return { success: false, message: "Secure credential storage is unavailable on this device." };
    }
    try {
      import_node_fs.default.mkdirSync(import_node_path.default.dirname(CREDENTIAL_PATH), { recursive: true });
      const tempPath = `${CREDENTIAL_PATH}.tmp`;
      import_node_fs.default.writeFileSync(tempPath, import_electron.safeStorage.encryptString(key), { mode: 384 });
      import_node_fs.default.renameSync(tempPath, CREDENTIAL_PATH);
      process.env[DESKTOP_GEMINI_ENV_KEY] = key;
      return { success: true, message: "Gemini key saved securely for this desktop user." };
    } catch {
      return { success: false, message: "The Gemini key could not be stored securely." };
    }
  });
  import_electron.ipcMain.handle("calcora:gemini-clear-key", (event) => {
    if (!isTrustedSender(event)) {
      return { success: false, message: "Credential settings are unavailable to this renderer." };
    }
    try {
      if (import_node_fs.default.existsSync(CREDENTIAL_PATH)) import_node_fs.default.unlinkSync(CREDENTIAL_PATH);
      delete process.env[DESKTOP_GEMINI_ENV_KEY];
      return { success: true, message: "The desktop Gemini key was removed." };
    } catch {
      return { success: false, message: "The stored Gemini key could not be removed." };
    }
  });
}
async function startBackend() {
  const backendModule = "../dist/server.cjs";
  await import(backendModule);
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const port = Number(process.env.CALCORA_RUNTIME_PORT);
    if (Number.isInteger(port) && port > 0 && port <= 65535) {
      try {
        const response = await fetch(`http://127.0.0.1:${port}/api/health`);
        if (response.ok) return;
      } catch {
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Calcora backend did not become ready within 20 seconds.");
}
async function createWindow() {
  await startBackend();
  const iconPath = import_electron.app.isPackaged ? import_node_path.default.join(process.resourcesPath, "icons", "calcora-icon.png") : import_node_path.default.join(import_electron.app.getAppPath(), "build", "icons", "calcora-icon.png");
  const preloadPath = import_node_path.default.join(import_electron.app.getAppPath(), "dist-electron", "preload.cjs");
  const window = new import_electron.BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: "#0b1020",
    icon: iconPath,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  const backendPort = Number(process.env.CALCORA_RUNTIME_PORT);
  const rendererUrl = `http://127.0.0.1:${backendPort}/`;
  await window.loadURL(rendererUrl);
  window.webContents.on("will-navigate", (event, url) => {
    if (!isTrustedCalcoraRendererUrl(url, backendPort)) event.preventDefault();
  });
  window.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsed = new URL(url);
      if (parsed.protocol === "https:" || parsed.protocol === "mailto:") void import_electron.shell.openExternal(url);
    } catch {
    }
    return { action: "deny" };
  });
}
async function startWithRecovery() {
  while (!quitRequested) {
    try {
      await createWindow();
      return;
    } catch (error) {
      logStartupFailure(error);
      const result = await import_electron.dialog.showMessageBox({
        type: "error",
        title: "Calcora AI could not start",
        message: "The local Calcora service did not become ready, so the calculator window could not open.",
        detail: `A diagnostic entry was written to the Calcora logs folder:
${LOG_DIRECTORY}`,
        buttons: ["Retry", "Open logs folder", "Quit"],
        defaultId: 0,
        cancelId: 2,
        noLink: true
      });
      if (result.response === 2 || result.response === 3) {
        import_electron.app.quit();
        return;
      }
      if (result.response === 1) {
        await import_electron.shell.openPath(LOG_DIRECTORY);
      }
    }
  }
}
import_electron.app.whenReady().then(() => {
  const userDataPath = import_electron.app.getPath("userData");
  LOG_DIRECTORY = import_node_path.default.join(userDataPath, "logs");
  STARTUP_LOG = import_node_path.default.join(LOG_DIRECTORY, "startup.log");
  CREDENTIAL_PATH = getGeminiCredentialPath(userDataPath);
  process.env.CALCORA_APP_ROOT = import_electron.app.getAppPath();
  process.env[DESKTOP_GEMINI_ENV_KEY] = readStoredGeminiKey() ?? "";
  registerGeminiCredentialHandlers();
  return startWithRecovery();
}).catch((error) => {
  logStartupFailure(error);
  return startWithRecovery();
});
import_electron.app.on("before-quit", () => {
  quitRequested = true;
});
import_electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") import_electron.app.quit();
});
