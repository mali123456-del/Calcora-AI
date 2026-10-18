/**
 * Cross-platform desktop policy.
 *
 * Everything here is a pure decision function: no Electron imports, no
 * filesystem, no `process.platform` reads inside the logic. The platform is
 * passed in, which is what makes Windows, macOS and Linux behaviour testable
 * from one machine instead of three.
 *
 * The shared product identity (window size, colours, features) stays identical;
 * only behaviour that genuinely differs per platform is expressed here.
 */

export interface WindowLifecyclePolicy {
  /** Quit the app when the last window closes (Windows/Linux). */
  quitWhenAllWindowsClosed: boolean;
  /** Re-create the window when the dock/taskbar icon is activated (macOS). */
  recreateWindowOnActivate: boolean;
}

/**
 * macOS applications stay running with no window and re-create it on dock
 * activation; Windows and Linux quit with their last window.
 */
export function getWindowLifecyclePolicy(platform: string): WindowLifecyclePolicy {
  const isMac = platform === 'darwin';
  return {
    quitWhenAllWindowsClosed: !isMac,
    recreateWindowOnActivate: isMac,
  };
}

export type RecoveryAction = 'retry' | 'open-logs' | 'quit';

/**
 * Button order of the startup-failure dialog. macOS appends a Cancel button, so
 * the same array yields a fourth index there; both extra indices must quit
 * rather than silently fall through to a retry loop.
 */
export function describeRecoveryDialogButtons(platform: string): string[] {
  const base = ['Retry', 'Open logs folder', 'Quit'];
  return platform === 'darwin' ? [...base, 'Cancel'] : base;
}

/**
 * Maps a dialog response index to an action. Index 2 is Quit on Windows/Linux and
 * index 3 is the macOS Cancel button; both end the retry loop.
 */
export function resolveRecoveryAction(responseIndex: number): RecoveryAction {
  if (responseIndex === 0) return 'retry';
  if (responseIndex === 1) return 'open-logs';
  return 'quit';
}

/**
 * Whether the operating system's credential store may hold the Gemini key.
 *
 * Windows uses DPAPI and macOS the Keychain. On Linux, safeStorage silently
 * falls back to a plaintext backend ("basic_text") on desktops without a secret
 * service; storing a key there would write it unencrypted, so Calcora refuses.
 */
export function canUseOsCredentialStore(
  platform: string,
  encryptionAvailable: boolean,
  linuxStorageBackend: string,
): boolean {
  if (!encryptionAvailable) return false;
  if (platform !== 'linux') return true;
  return linuxStorageBackend !== 'basic_text' && linuxStorageBackend !== 'unknown';
}
