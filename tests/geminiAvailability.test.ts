import assert from 'node:assert/strict';
import { resolveGeminiAvailability } from '../src/services/tutorOrchestrator';

const missing = resolveGeminiAvailability(undefined);
assert.deepEqual(missing, { available: false, reason: 'missing-api-key' });

const blank = resolveGeminiAvailability('   ');
assert.deepEqual(blank, { available: false, reason: 'missing-api-key' });

for (const placeholder of ['MY_GEMINI_API_KEY', 'your-gemini-api-key', 'CHANGE-ME']) {
  const result = resolveGeminiAvailability(placeholder);
  assert.deepEqual(result, { available: false, reason: 'placeholder-api-key' });
}

const offline = resolveGeminiAvailability('real-looking-key', true);
assert.deepEqual(offline, { available: false, reason: 'offline-only' });

const available = resolveGeminiAvailability('real-looking-key');
assert.deepEqual(available, { available: true, reason: 'api-key-available' });

console.log('Gemini availability tests passed: 5/5');
