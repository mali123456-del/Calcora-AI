import assert from 'node:assert/strict';
import {
  classifyGeminiError,
  getGeminiCredentialState,
  GEMINI_CANDIDATE_MODELS,
  GEMINI_DEFAULT_MODEL,
} from '../src/services/geminiStatus';

assert.equal(getGeminiCredentialState(undefined).state, 'GEMINI_NOT_CONFIGURED');
assert.equal(getGeminiCredentialState('   ').state, 'GEMINI_NOT_CONFIGURED');
assert.equal(getGeminiCredentialState('configured-without-exposing-value').state, 'GEMINI_CONFIGURED');

assert.equal(classifyGeminiError({ status: 401, message: 'API key not valid' }).state, 'GEMINI_INVALID_KEY');
assert.equal(classifyGeminiError({ status: 401, message: 'authentication failed' }).state, 'GEMINI_UNAUTHORIZED');
assert.equal(classifyGeminiError({ status: 403, message: 'permission denied' }).state, 'GEMINI_FORBIDDEN');
assert.equal(classifyGeminiError({ status: 429, message: 'rate limit exceeded' }).state, 'GEMINI_RATE_LIMITED');
assert.equal(classifyGeminiError({ status: 429, message: 'quota exhausted' }).state, 'GEMINI_QUOTA_EXCEEDED');
assert.equal(classifyGeminiError({ status: 404, message: 'model not found' }).state, 'GEMINI_MODEL_UNAVAILABLE');
assert.equal(classifyGeminiError({ status: 503, message: 'service unavailable' }).state, 'GEMINI_SERVER_ERROR');
assert.equal(classifyGeminiError(new Error('fetch failed: network unreachable')).state, 'GEMINI_NETWORK_ERROR');
assert.equal(classifyGeminiError(new Error('Gemini request timeout')).state, 'GEMINI_TIMEOUT');
assert.equal(classifyGeminiError(new Error('Gemini returned an empty response')).state, 'GEMINI_EMPTY_RESPONSE');
assert.equal(classifyGeminiError(new Error('Malformed JSON payload')).state, 'GEMINI_MALFORMED_RESPONSE');
assert.equal(classifyGeminiError(new Error('Google detected leaked API key and revoked the key')).state, 'GEMINI_LEAKED_OR_BLOCKED_KEY');
assert.equal(classifyGeminiError(new Error('response blocked by safety policy')).state, 'GEMINI_SAFETY_BLOCK');
assert.equal(classifyGeminiError(new Error('unexpected failure')).state, 'GEMINI_UNKNOWN_ERROR');

const classified = classifyGeminiError({ status: 503, message: 'secret API key should never be returned to users' });
assert.equal(classified.userMessage.includes('secret'), false);
assert.equal(classified.userMessage.includes('API key'), false);

// --- Gemini model id integrity -------------------------------------------------
// Regression guard for the bug where the server named the non-existent model
// `gemini-3.8-flash`, which the SDK rejects with GEMINI_MODEL_UNAVAILABLE. Only
// real, currently-available ids may appear in the canonical list.
assert.ok(GEMINI_CANDIDATE_MODELS.length > 0, 'candidate model list must not be empty');
assert.equal(
  new Set(GEMINI_CANDIDATE_MODELS).size,
  GEMINI_CANDIDATE_MODELS.length,
  'candidate model ids must be unique',
);
for (const model of GEMINI_CANDIDATE_MODELS) {
  assert.match(model, /^gemini-[a-z0-9][a-z0-9.-]*$/, `unexpected model id shape: ${model}`);
  assert.equal(/\d+\.\d+\.\d+/.test(model), false, `model id must not embed a fabricated semantic version: ${model}`);
}
assert.equal(GEMINI_DEFAULT_MODEL, GEMINI_CANDIDATE_MODELS[0]);
assert.equal(GEMINI_CANDIDATE_MODELS.includes('gemini-2.5-flash' as never), true);

console.log('Gemini model id integrity tests passed');
