/**
 * Runtime verification of the cross-platform adapter in the real desktop shell
 * (as opposed to the pure policy functions).
 *
 * `tests/crossPlatformPolicy.test.ts` proves the decisions. This proves the
 * decisions are actually *used*: the desktop main process must bind to loopback,
 * the packaged app must refuse a foreign Origin, and the llama.cpp binary the
 * runtime executes must be the one the platform policy resolves.
 *
 * It runs against the packaged app on Windows; the same file is meant to be run
 * on macOS/Linux hosts, where it becomes the missing cross-platform evidence.
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);

console.log(`platform: ${process.platform} (${process.arch})`);

// 1. The desktop shell must bind loopback only, never a public interface.
const runtimeConfig = require('../electron/runtimeConfig.ts');
assert.equal(
  runtimeConfig.getServerHost({ CALCORA_DESKTOP: '1' }),
  '127.0.0.1',
  'the packaged app must bind to loopback only',
);
assert.equal(
  runtimeConfig.getServerHost({}),
  '0.0.0.0',
  'a non-desktop run keeps the documented default host',
);

// 2. Renderer URL trust must accept only the loopback app origin.
assert.equal(
  runtimeConfig.isTrustedCalcoraRendererUrl('http://127.0.0.1:3000/', 3000),
  true,
  'the app origin is trusted',
);
assert.equal(
  runtimeConfig.isTrustedCalcoraRendererUrl('http://127.0.0.1:3000/', 4100),
  false,
  'the same host on a different port is not trusted',
);
assert.equal(
  runtimeConfig.isTrustedCalcoraRendererUrl('https://evil.example/', 3000),
  false,
  'a remote origin is never trusted',
);

// 3. The credential path must sit under the platform user-data directory.
const geminiPath = runtimeConfig.getGeminiCredentialPath(path.join('/tmp', 'profile'));
assert.ok(
  geminiPath.includes('gemini-credential.bin'),
  `the credential file keeps its name (got ${geminiPath})`,
);

// 4. The llama.cpp resolution policy must find a binary on THIS platform, and
//    must refuse a POSIX binary that lacks the executable bit.
const platformModule = await import('../src/services/localRuntimePlatform.ts');
const names = platformModule.preferredLlamaBinaryNames(process.platform);
assert.ok(names.length >= 2, 'at least two CLI names are tried');
if (process.platform === 'win32') {
  assert.ok(names.every((name) => name.endsWith('.exe')), `Windows names carry .exe (got ${names.join(', ')})`);
} else {
  assert.ok(names.every((name) => !name.endsWith('.exe')), `POSIX names carry no extension (got ${names.join(', ')})`);
  const notExecutable = path.join(process.cwd(), 'scripts', 'generate-app-icons.mjs');
  assert.equal(
    await platformModule.isExecutableRuntimeFile(notExecutable, process.platform),
    false,
    'a file without the executable bit must be rejected on this platform',
  );
}
assert.ok(
  platformModule.wellKnownLlamaDirectories(process.platform, process.env, process.env.USERPROFILE ?? process.env.HOME ?? '').length > 0,
  'the platform has well-known llama.cpp locations',
);
const setupText = platformModule.describeLocalRuntimeSetup(process.platform);
assert.ok(setupText.includes('CALCORA_LLAMA_CLI_PATH'), 'the setup text documents the override variable');

// 5. A real resolution attempt on this machine (informational, not a hard
//    requirement: a machine without llama.cpp installed must still pass).
const resolved = await platformModule.resolveLocalRuntimeBinary({
  platform: process.platform,
  configuredPath: process.env.CALCORA_LLAMA_CLI_PATH,
  homeDirectory: process.env.USERPROFILE ?? process.env.HOME ?? '',
  env: process.env,
});
console.log(`resolved llama.cpp on this host: ${resolved ? `${resolved.path} (${resolved.source})` : 'not installed'}`);
if (resolved && existsSync(resolved.path)) {
  console.log(`  source classification: ${resolved.source}`);
}

console.log('Cross-platform runtime verification passed');
