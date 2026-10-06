import assert from 'node:assert/strict';
import { TUTOR_LANGUAGES } from '../src/ai/tutorLanguages';
import { detectLanguage, detectLanguages } from '../src/services/languageDetection';
import {
  buildMultilingualTutorKnowledge,
  detectLanguageFromText,
  DEEP_LANGUAGE_PROFILE_COUNT,
} from '../src/services/multilingualTutorKnowledge';
import {
  SUPPORTED_LANGUAGES,
  getLanguageTemplate,
  getLanguageSystemInstruction,
} from '../src/knowledge/multilingualTutor';
import { analyzeTutorInput } from '../src/services/multilingualTutorInput';

// 1. Registry breadth.
assert.ok(TUTOR_LANGUAGES.length >= 100, `expected 100+ registered languages, got ${TUTOR_LANGUAGES.length}`);

// 2. Deep grammar profiles expanded to 40+.
assert.ok(DEEP_LANGUAGE_PROFILE_COUNT >= 40, `expected 40+ deep profiles, got ${DEEP_LANGUAGE_PROFILE_COUNT}`);

// 3. Offline template + system-instruction coverage mirrors the deep set.
assert.ok(SUPPORTED_LANGUAGES.length >= 40, `expected 40+ template languages, got ${SUPPORTED_LANGUAGES.length}`);
assert.equal(getLanguageTemplate('nl').answerLabel, 'ANTWOORD:');
assert.equal(getLanguageTemplate('si').answerLabel, 'පිළිතුර:');
assert.match(getLanguageSystemInstruction('vi'), /Tiếng Việt/);

// 4. Deep, language-specific knowledge is exposed.
assert.ok(buildMultilingualTutorKnowledge('nl').includes('de/het gender'));
assert.ok(buildMultilingualTutorKnowledge('sw').includes('noun classes'));
assert.ok(buildMultilingualTutorKnowledge('he').includes('right-to-left'));
assert.ok(buildMultilingualTutorKnowledge('fi').includes('vowel harmony'));
assert.ok(buildMultilingualTutorKnowledge('ur').includes('gender agreement'));
assert.ok(buildMultilingualTutorKnowledge('ja').includes('particles'));

// 5. Script-driven detection.
const scriptCases: Array<[string, string]> = [
  ['مجھے الجبرا سمجھاؤ', 'ur'],
  ['أريد حل هذه المعادلة', 'ar'],
  ['حل کریں 2x + 4 = 10', 'ur'],
  ['二次方程式を説明してください', 'ja'],
  ['이 방정식을 풀어주세요', 'ko'],
  ['Реши 2x + 4 = 10', 'ru'],
  ['будь ласка, поясніть це', 'uk'],
  ['Πώς λύνω αυτή την εξίσωση;', 'el'],
  ['ขอวิธีแก้สมการนี้', 'th'],
  ['해를 구해 주세요', 'ko'],
  ['אנא הסבר', 'he'],
  ['2x + 4 = 10', 'en'],
];
for (const [text, expected] of scriptCases) {
  assert.equal(detectLanguageFromText(text), expected, `${text} should detect as ${expected}`);
}

// 6. Latin-script detection via diacritics and function words.
const latinCases: Array<[string, string]> = [
  ['Explain algebra', 'en'],
  ['¿Puedes explicar la derivada?', 'es'],
  ['Wie löse ich diese Gleichung?', 'de'],
  ['Comment résoudre cette équation ?', 'fr'],
  ['Lütfen bunu çöz', 'tr'],
  ['Bạn có thể giải thích không?', 'vi'],
  ['terima kasih, tolong jelaskan', 'id'],
  ['tafadhali eleza', 'sw'],
  ['Jak rozwiązać to równanie?', 'pl'],
  ['dankie vir jou hulp', 'af'],
];
for (const [text, expected] of latinCases) {
  assert.equal(detectLanguage(text), expected, `${text} should detect as ${expected}`);
}

// 7. analyzeTutorInput keeps its contract while ranking more candidates.
const mixed = analyzeTutorInput('مجھے quadratic equation سمجھاؤ in simple words');
assert.ok(mixed.detectedLanguages.includes('ur'));
assert.ok(mixed.detectedLanguages.includes('en'));
assert.ok(mixed.scripts.includes('Latin'));
assert.ok(mixed.scripts.includes('Arabic'));
assert.ok(mixed.styles.includes('mixed-script'));
assert.ok(mixed.styles.includes('code-switched'));

const roman = analyzeTutorInput('yar mujhe quadratic equation simple way men samjhao please');
assert.equal(roman.requestedLanguage, 'ur');
assert.ok(roman.styles.includes('romanized'));

// 8. Detector exposes ranked, typed signals.
const ranked = detectLanguages('Comment résoudre cette équation ?');
assert.equal(ranked.primary, 'fr');
assert.ok(ranked.signals.length >= 1);
assert.ok(ranked.signals.every(signal => ['script', 'diacritic', 'romanized', 'function-words'].includes(signal.method)));

console.log(
  `PASS language coverage: ${TUTOR_LANGUAGES.length} registered, ${DEEP_LANGUAGE_PROFILE_COUNT} deep profiles, ${SUPPORTED_LANGUAGES.length} templates`,
);
