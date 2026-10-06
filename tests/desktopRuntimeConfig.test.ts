import assert from 'node:assert/strict';
import {
  DESKTOP_GEMINI_ENV_KEY,
  getDesktopRuntimeEnvironment,
  getGeminiCredentialPath,
  getServerHost,
  getServerPort,
  isTrustedCalcoraRendererUrl,
  resolveGeminiApiKey,
} from '../electron/runtimeConfig';

const result = getDesktopRuntimeEnvironment({ PATH: '/tmp', NODE_ENV: 'development' });

assert.equal(result.NODE_ENV, 'production');
assert.equal(result.CALCORA_DESKTOP, '1');
assert.equal(result.CALCORA_PORT, '0');
assert.equal(result.PATH, '/tmp');
assert.equal(getServerHost(result), '127.0.0.1');
assert.equal(getServerHost({}), '0.0.0.0');
assert.equal(getServerHost({ CALCORA_HOST: '127.0.0.2' }), '127.0.0.2');
assert.equal(getServerHost({ CALCORA_DESKTOP: '1', CALCORA_HOST: '0.0.0.0' }), '127.0.0.1');
assert.equal(getServerPort({ CALCORA_PORT: '3456' }), 3456);
assert.equal(getServerPort({ CALCORA_PORT: '70000' }), 3000);
assert.equal(getServerPort({}), 3000);
assert.equal(getServerPort(result), 0);
assert.equal(getGeminiCredentialPath('C:/Users/sample/AppData/Roaming/Calcora AI'), 'C:/Users/sample/AppData/Roaming/Calcora AI/gemini-credential.bin');
assert.equal(resolveGeminiApiKey({ CALCORA_DESKTOP: '1', [DESKTOP_GEMINI_ENV_KEY]: 'desktop-key' }), 'desktop-key');
assert.equal(resolveGeminiApiKey({ CALCORA_DESKTOP: '1', GEMINI_API_KEY: 'environment-key' }), 'environment-key');
assert.equal(resolveGeminiApiKey({ CALCORA_DESKTOP: '1', GEMINI_API_KEY: 'MY_GEMINI_API_KEY' }), undefined);
assert.equal(resolveGeminiApiKey({ CALCORA_DESKTOP: '1', [DESKTOP_GEMINI_ENV_KEY]: 'desktop-key', GEMINI_API_KEY: 'environment-key' }), 'desktop-key');
assert.equal(isTrustedCalcoraRendererUrl('http://127.0.0.1:3000/'), true);
assert.equal(isTrustedCalcoraRendererUrl('http://127.0.0.1:43123/', 43123), true);
assert.equal(isTrustedCalcoraRendererUrl('https://127.0.0.1:3000/'), false);
assert.equal(isTrustedCalcoraRendererUrl('http://127.0.0.1:3000.evil.test/'), false);
assert.equal(isTrustedCalcoraRendererUrl('http://localhost:3000/'), false);

console.log('Desktop runtime configuration tests passed');
