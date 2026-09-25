import assert from 'node:assert/strict';
import { analyzeTutorInput, buildInputUnderstandingInstruction } from '../src/services/multilingualTutorInput';

const romanUrdu = analyzeTutorInput('yar mujhe quadratic equation simple way men samjhao please');
assert.ok(romanUrdu.detectedLanguages.includes('ur'));
assert.ok(romanUrdu.detectedLanguages.includes('en'));
assert.ok(romanUrdu.styles.includes('romanized'));
assert.equal(romanUrdu.requestedLanguage, 'ur');

const mixed = analyzeTutorInput('مجھے quadratic equation سمجھاؤ in simple words');
assert.ok(mixed.detectedLanguages.includes('ur'));
assert.ok(mixed.detectedLanguages.includes('en'));
assert.ok(mixed.styles.includes('mixed-script'));
assert.ok(mixed.styles.includes('code-switched'));

const japanese = analyzeTutorInput('二次方程式を説明してください');
assert.equal(japanese.requestedLanguage, 'ja');
assert.ok(japanese.scripts.includes('CJK'));
assert.ok(japanese.scripts.includes('Hiragana/Katakana'));

const selected = analyzeTutorInput('please explain x^2 + 2x + 1', 'ur');
assert.equal(selected.requestedLanguage, 'ur');
assert.ok(buildInputUnderstandingInstruction(selected).includes('Preserve formulas'));

console.log('PASS multilingual input understanding');
