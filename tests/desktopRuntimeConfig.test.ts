import assert from 'node:assert/strict';
import { getDesktopRuntimeEnvironment } from '../electron/runtimeConfig';

const result = getDesktopRuntimeEnvironment({ PATH: '/tmp', NODE_ENV: 'development' });

assert.equal(result.NODE_ENV, 'production');
assert.equal(result.CALCORA_DESKTOP, '1');
assert.equal(result.PATH, '/tmp');

console.log('Desktop runtime configuration tests passed');
