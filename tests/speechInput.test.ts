import assert from 'node:assert/strict';
import { resolveSpeechRecognitionLocale } from '../src/services/speechInput';
import { sanitizeSpokenMath } from '../src/utils/sanitizer';

assert.equal(resolveSpeechRecognitionLocale('en', 'ur-PK'), 'en-US');
assert.equal(resolveSpeechRecognitionLocale('ur', 'en-US'), 'ur-PK');
assert.equal(resolveSpeechRecognitionLocale('auto', 'ur-PK'), 'ur-PK');
assert.equal(resolveSpeechRecognitionLocale('auto', 'en-GB'), 'en-US');
assert.equal(resolveSpeechRecognitionLocale('auto', 'unsupported-XX'), 'en-US');
assert.equal(sanitizeSpokenMath('2 multiplied by 3'), '2 * 3');
assert.equal(sanitizeSpokenMath('2 divided by 3'), '2 / 3');
assert.equal(sanitizeSpokenMath('two plus two'), 'two + two');
assert.equal(sanitizeSpokenMath(''), '');
assert.equal(sanitizeSpokenMath('  '), '');
assert.equal(sanitizeSpokenMath('<script>alert(1)</script>'), '');

console.log('Speech input tests passed');
