import assert from 'node:assert/strict';
import { classifyGeminiRuntimeFailure, parseGeminiJsonResponse, isValidGeminiResponse } from '../src/services/geminiRuntime';

assert.equal(classifyGeminiRuntimeFailure(new Error('fetch failed: network unreachable')), 'network');
assert.equal(classifyGeminiRuntimeFailure(new Error('Gemini request timeout')), 'timeout');
assert.equal(classifyGeminiRuntimeFailure(new Error('404 model not found')), 'model-unavailable');
assert.equal(classifyGeminiRuntimeFailure(new Error('Gemini model returned an empty response')), 'empty-response');
assert.equal(classifyGeminiRuntimeFailure(new Error('Malformed JSON payload')), 'malformed-response');
assert.equal(classifyGeminiRuntimeFailure(new Error('unexpected structure')), 'unexpected-structure');
assert.equal(classifyGeminiRuntimeFailure(new Error('HTTP 503')), 'request');

assert.deepEqual(parseGeminiJsonResponse('{"answer":"42","steps":["calculate"]}'), {
  answer: '42',
  steps: ['calculate'],
});
assert.deepEqual(parseGeminiJsonResponse('```json
{"answer":"42"}
```'), { answer: '42' });
assert.equal(parseGeminiJsonResponse(''), null);
assert.equal(parseGeminiJsonResponse('not json'), null);
assert.equal(parseGeminiJsonResponse('{"answer":""}'), null);
assert.equal(parseGeminiJsonResponse('{"answer":"42","steps":"not-an-array"}'), null);
assert.equal(parseGeminiJsonResponse('["42"]'), null);

assert.equal(isValidGeminiResponse({ answer: 'valid' }), true);
assert.equal(isValidGeminiResponse({ answer: 'valid', steps: [] }), true);
assert.equal(isValidGeminiResponse({ answer: '', steps: [] }), false);
assert.equal(isValidGeminiResponse({ answer: 'valid', steps: {} }), false);

console.log('Gemini runtime failure tests passed: 18/18');
