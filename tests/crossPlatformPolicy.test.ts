/**
 * Cross-platform policy tests - Windows, macOS, Linux.
 *
 * Calcora's shared core (math engine, verification, Tutor, knowledge, model
 * abstraction) must stay platform-independent, and platform differences must be
 * concentrated in a few *testable* policy functions rather than scattered
 * `process.platform` checks. These tests pin that policy:
 *
 *   1. window lifecycle: macOS keeps the app alive and re-creates the window on
 *      dock activation; Windows and Linux quit when the last window closes.
 *   2. credential storage: Linux must refuse the plaintext fallback backend.
 *   3. startup recovery: the dialog index maps to the same action on every
 *      platform, including the extra Cancel button macOS adds.
 *   4. local runtime binary resolution: the llama.cpp CLI is found from an
 *      explicit setting or from per-platform well-known locations, using the
 *      right file name for the platform, and the reported setup instructions
 *      are platform-specific and honest.
 */
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  getWindowLifecyclePolicy,
  resolveRecoveryAction,
  canUseOsCredentialStore,
  describeRecoveryDialogButtons,
} from '../electron/platformPolicy';
import {
  preferredLlamaBinaryNames,
  wellKnownLlamaDirectories,
  resolveLocalRuntimeBinary,
  describeLocalRuntimeSetup,
  isExecutableRuntimeFile,
} from '../src/services/localRuntimePlatform';

// ---------------------------------------------------------------------------
// 1. Window lifecycle
// ---------------------------------------------------------------------------
assert.equal(getWindowLifecyclePolicy('darwin').quitWhenAllWindowsClosed, false, 'macOS must not quit when the window closes');
assert.equal(getWindowLifecyclePolicy('darwin').recreateWindowOnActivate, true, 'clicking the dock icon must re-create the window on macOS');
assert.equal(getWindowLifecyclePolicy('win32').quitWhenAllWindowsClosed, true, 'Windows quits with the last window');
assert.equal(getWindowLifecyclePolicy('win32').recreateWindowOnActivate, false, 'Windows does not need dock activation handling');
assert.equal(getWindowLifecyclePolicy('linux').quitWhenAllWindowsClosed, true, 'Linux quits with the last window');
assert.equal(getWindowLifecyclePolicy('linux').recreateWindowOnActivate, false, 'Linux does not need dock activation handling');

// ---------------------------------------------------------------------------
// 2. Credential storage
// ---------------------------------------------------------------------------
assert.equal(canUseOsCredentialStore('win32', true, 'unknown'), true, 'Windows uses DPAPI-backed safeStorage');
assert.equal(canUseOsCredentialStore('darwin', true, 'unknown'), true, 'macOS uses the Keychain-backed safeStorage');
assert.equal(canUseOsCredentialStore('linux', true, 'gnome_libsecret'), true, 'Linux with libsecret may store credentials');
assert.equal(canUseOsCredentialStore('linux', true, 'kwallet5'), true, 'Linux with kwallet may store credentials');
assert.equal(canUseOsCredentialStore('linux', true, 'basic_text'), false, 'Linux plaintext fallback must be refused');
assert.equal(canUseOsCredentialStore('linux', true, 'unknown'), false, 'Linux with an unknown backend must be refused');
assert.equal(canUseOsCredentialStore('win32', false, 'dpapi'), false, 'no encryption available means no credential storage');

// ---------------------------------------------------------------------------
// 3. Startup recovery dialog
// ---------------------------------------------------------------------------
assert.equal(resolveRecoveryAction(0), 'retry', 'the first button retries');
assert.equal(resolveRecoveryAction(1), 'open-logs', 'the second button opens the logs folder');
assert.equal(resolveRecoveryAction(2), 'quit', 'the third button quits');
assert.equal(resolveRecoveryAction(3), 'quit', 'the extra macOS Cancel button must quit, not fall through to retry');
assert.ok(
  describeRecoveryDialogButtons('darwin').length >= 4,
  'macOS must offer a Cancel button in the startup failure dialog',
);

// ---------------------------------------------------------------------------
// 4. Local runtime binary resolution per platform
// ---------------------------------------------------------------------------
assert.deepEqual(preferredLlamaBinaryNames('win32'), ['llama-completion.exe', 'llama-cli.exe'], 'Windows uses the .exe CLI names');
assert.deepEqual(preferredLlamaBinaryNames('darwin'), ['llama-completion', 'llama-cli'], 'macOS uses extensionless CLI names');
assert.deepEqual(preferredLlamaBinaryNames('linux'), ['llama-completion', 'llama-cli'], 'Linux uses extensionless CLI names');

const homeWindows = await mkdtemp(path.join(tmpdir(), 'calcora-home-win-'));
const winTools = path.join(homeWindows, 'calcora-tools', 'llama.cpp');
await mkdir(winTools, { recursive: true });
await writeFile(path.join(winTools, 'llama-completion.exe'), 'MZ');

const homePosix = await mkdtemp(path.join(tmpdir(), 'calcora-home-posix-'));
const posixTools = path.join(homePosix, 'calcora-tools', 'llama.cpp');
await mkdir(posixTools, { recursive: true });
const posixBinary = path.join(posixTools, 'llama-completion');
await writeFile(posixBinary, '#!/bin/sh\n');

const windowsResolution = await resolveLocalRuntimeBinary({
  platform: 'win32',
  configuredPath: undefined,
  homeDirectory: homeWindows,
  env: {},
  hasExecutableBit: () => true,
});
assert.equal(windowsResolution?.path, path.join(winTools, 'llama-completion.exe'), 'Windows finds llama-completion.exe in the well-known tools folder');
assert.equal(windowsResolution?.source, 'well-known', 'a well-known location is reported as such');

const posixResolution = await resolveLocalRuntimeBinary({
  platform: 'linux',
  configuredPath: undefined,
  homeDirectory: homePosix,
  env: {},
  // A downloaded binary without the executable bit must not be accepted on POSIX.
  hasExecutableBit: (candidate: string) => candidate !== posixBinary,
});
assert.equal(
  posixResolution,
  null,
  'a llama.cpp binary without the executable bit must not be accepted on Linux',
);

const posixExecutable = await resolveLocalRuntimeBinary({
  platform: 'darwin',
  configuredPath: undefined,
  homeDirectory: homePosix,
  env: {},
  hasExecutableBit: () => true,
});
assert.equal(posixExecutable?.path, posixBinary, 'macOS finds the extensionless binary once it is executable');

const configuredPath = path.join(posixTools, 'configured-cli');
await writeFile(configuredPath, '#!/bin/sh\n');
const configuredWins = await resolveLocalRuntimeBinary({
  platform: 'linux',
  configuredPath,
  homeDirectory: homePosix,
  env: {},
  hasExecutableBit: () => true,
});
assert.equal(configuredWins?.path, configuredPath, 'an explicit CALCORA_LLAMA_CLI_PATH always wins over well-known locations');
assert.equal(configuredWins?.source, 'configured', 'the configured source is reported');

assert.equal(
  await isExecutableRuntimeFile(path.join(homeWindows, 'missing'), 'win32', () => false),
  false,
  'a missing file is never executable',
);
assert.deepEqual(
  wellKnownLlamaDirectories('win32', { USERPROFILE: 'C:\\Users\\kk', LOCALAPPDATA: 'C:\\Users\\kk\\AppData\\Local' }, 'C:\\Users\\kk').slice(0, 2),
  [path.join('C:\\Users\\kk', 'calcora-tools', 'llama.cpp'), path.join('C:\\Users\\kk\\AppData\\Local', 'calcora-tools', 'llama.cpp')],
  'Windows well-known directories follow the user profile and local app data',
);

// Per-platform, honest setup instructions (no invented "it just works").
const windowsSetup = describeLocalRuntimeSetup('win32');
const darwinSetup = describeLocalRuntimeSetup('darwin');
const linuxSetup = describeLocalRuntimeSetup('linux');
for (const [platform, text] of Object.entries({ win32: windowsSetup, darwin: darwinSetup, linux: linuxSetup })) {
  assert.ok(text.includes('CALCORA_LLAMA_CLI_PATH'), `${platform} setup text must document the override variable`);
}
assert.ok(/xattr|quarantine|Gatekeeper/i.test(darwinSetup), 'macOS setup text must mention Gatekeeper/quarantine for downloaded binaries');
assert.ok(/chmod|\+x/i.test(linuxSetup), 'Linux setup text must mention the executable bit');
assert.ok(/\.exe/i.test(windowsSetup), 'Windows setup text must name the .exe CLI');

console.log('Cross-platform policy tests passed');
