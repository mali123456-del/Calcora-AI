/**
 * Phase 4 — multilingual verification for the 11 required languages.
 *
 * English, Urdu, Arabic, German, French, Spanish, Chinese, Japanese, Korean,
 * Russian and Turkish are verified on three levels, and every claim here is a
 * claim about *measured* behaviour, not registry intent:
 *
 *   1. Detection  — a natural concept question in each language detects as
 *                   that language.
 *   2. Honest levels — the reported support level per language matches the
 *                   pinned truth table (en/ur FULL, the other nine PARTIAL)
 *                   and the registry counts are exactly FULL=2, PARTIAL=35,
 *                   DETECTION_ONLY=78.
 *   3. Behaviour  — every one of the 11 actually answers its own concept
 *                   question offline (never a decline) and carries the
 *                   localized answer label of that language. FULL claims are
 *                   checked for real script content; the Arabic answer must
 *                   not leak Urdu-only strings and vice versa.
 */
import assert from 'node:assert/strict';
import { orchestrateTutor } from '../src/services/tutorOrchestrator';
import { detectLanguages } from '../src/services/languageDetection';
import {
  getTutorSupportLevel,
  getTutorSupportCounts,
  getTutorSupportProfile,
  type TutorSupportLevel,
} from '../src/ai/tutorLanguages';
import { getLanguageTemplate } from '../src/knowledge/multilingualTutor';
import { getLocalizedTermsForConcept } from '../src/knowledge/multilingualMathConcepts';

const questions: Array<[string, string]> = [
  ['en', 'Explain what a derivative is'],
  ['ur', 'مشتق کیا ہے؟'],
  ['ar', 'ما هو المشتق؟'],
  ['de', 'Was ist eine Ableitung?'],
  ['fr', "Qu'est-ce qu'une dérivée ?"],
  ['es', '¿Qué es la derivada?'],
  ['zh', '什么是导数？'],
  ['ja', '微分とは何ですか？'],
  ['ko', '미적분이 뭐야?'],
  ['ru', 'Что такое производная?'],
  ['tr', 'Türev nedir?'],
];

// ---------------------------------------------------------------------------
// 1. Detection.
// ---------------------------------------------------------------------------
for (const [code, q] of questions) {
  assert.equal(detectLanguages(q).primary, code, `detection: "${q}" should detect ${code}`);
}

// ---------------------------------------------------------------------------
// 2. Honest support levels: pinned truth table.
// ---------------------------------------------------------------------------
const pinned: Record<string, TutorSupportLevel> = {
  en: 'FULL_TUTOR_SUPPORT',
  ur: 'FULL_TUTOR_SUPPORT',
  ar: 'PARTIAL_TUTOR_SUPPORT',
  de: 'PARTIAL_TUTOR_SUPPORT',
  fr: 'PARTIAL_TUTOR_SUPPORT',
  es: 'PARTIAL_TUTOR_SUPPORT',
  zh: 'PARTIAL_TUTOR_SUPPORT',
  ja: 'PARTIAL_TUTOR_SUPPORT',
  ko: 'PARTIAL_TUTOR_SUPPORT',
  ru: 'PARTIAL_TUTOR_SUPPORT',
  tr: 'PARTIAL_TUTOR_SUPPORT',
};
for (const [code] of questions) {
  assert.equal(getTutorSupportLevel(code), pinned[code], `${code} must report ${pinned[code]}`);
}
assert.deepEqual(
  getTutorSupportCounts(),
  { FULL_TUTOR_SUPPORT: 2, PARTIAL_TUTOR_SUPPORT: 35, DETECTION_ONLY: 78 },
  'the published support counts are the measured truth table',
);

// ---------------------------------------------------------------------------
// 3. Behaviour: all 11 answer their own concept question, with their own label.
// ---------------------------------------------------------------------------
for (const [code, q] of questions) {
  const r = await orchestrateTutor({ prompt: q, topic: 'Derivatives', language: code, offlineOnly: true });
  assert.ok(
    !r.answer.includes('No deterministic result could be produced'),
    `${code} declined its own concept question "${q}": ${r.answer.slice(0, 160)}`,
  );
  assert.ok(r.answer.length > 120, `${code} produced a thin concept answer (${r.answer.length} chars)`);
  const label = getLanguageTemplate(code).answerLabel;
  assert.ok(
    r.answer.includes(label),
    `${code} answer must carry its localized label "${label}": ${r.answer.slice(0, 120)}`,
  );
}

// ---------------------------------------------------------------------------
// 4. Script honesty per claim level.
// ---------------------------------------------------------------------------
// FULL (ur): real Urdu script and Urdu mathematical terminology.
const ur = await orchestrateTutor({ prompt: 'مشتق کیا ہے؟', topic: 'Derivatives', language: 'ur', offlineOnly: true });
assert.ok(/[\u0600-\u06FF]/.test(ur.answer), 'the Urdu answer carries Urdu/Arabic script');
const urTerms = getLocalizedTermsForConcept('calc-derivatives-rules', 'ur', 'Derivatives');
assert.ok(
  urTerms.length > 0 && urTerms.some(t => ur.answer.includes(t)),
  `the Urdu answer names the concept in Urdu terminology (terms seen: ${urTerms.join(', ')})`,
);

// PARTIAL (ar): Arabic label + Arabic terminology, and it must NOT carry the
// Urdu-only strings of the Urdu branch (Arabic and Urdu share a script but
// not the language).
const ar = await orchestrateTutor({ prompt: 'ما هو المشتق؟', topic: 'Derivatives', language: 'ar', offlineOnly: true });
assert.ok(ar.answer.includes(getLanguageTemplate('ar').answerLabel), 'the Arabic answer carries the Arabic label');
assert.ok(
  !ar.answer.includes('\u0627\u0647\u0645 \u0627\u0635\u0637\u0644\u0627\u062d'),
  'the Arabic answer must not leak the Urdu terminology prefix',
);
const arTerms = getLocalizedTermsForConcept('calc-derivatives-rules', 'ar', 'Derivatives');
assert.ok(
  arTerms.length > 0 && arTerms.some(t => ar.answer.includes(t)),
  `the Arabic answer names the concept in Arabic terminology (terms seen: ${arTerms.join(', ')})`,
);

// ---------------------------------------------------------------------------
// 5. The published behaviour text must not overclaim: measurement shows that
//    concept definitions, hints and document answers fall back to English
//    outside the FULL English/Urdu templates, and the published text has to
//    disclose that fallback rather than imply full localization.
// ---------------------------------------------------------------------------
const urProfile = getTutorSupportProfile('ur');
assert.ok(
  urProfile.localBehaviour.includes('English'),
  `the FULL behaviour text must disclose the English canonical-definition fallback, got: ${urProfile.localBehaviour}`,
);
for (const code of ['de', 'fr', 'ar', 'zh', 'ru']) {
  const profile = getTutorSupportProfile(code);
  assert.ok(
    profile.localBehaviour.includes('English'),
    `${code} PARTIAL behaviour text must disclose the English fallback, got: ${profile.localBehaviour}`,
  );
  assert.ok(
    /label|template/i.test(profile.localBehaviour),
    `${code} PARTIAL behaviour text must describe what IS localized (template layer), got: ${profile.localBehaviour}`,
  );
}
const detProfile = getTutorSupportProfile('si');
assert.ok(
  detProfile.localBehaviour.includes('detected'),
  `the DETECTION_ONLY text must say the language is only detected, got: ${detProfile.localBehaviour}`,
);

// ---------------------------------------------------------------------------
// 6. Detection-driven answering: with no explicit language, the concept answer
//    must follow the prompt's own language - Urdu gets the Urdu label and
//    Arabic gets the Arabic label (the old script check gave both Urdu).
// ---------------------------------------------------------------------------
const autoUr = await orchestrateTutor({ prompt: 'مشتق کیا ہے؟', topic: 'Derivatives', offlineOnly: true });
assert.ok(
  autoUr.answer.startsWith(getLanguageTemplate('ur').answerLabel),
  `a default-language Urdu prompt must get the Urdu label, got: ${autoUr.answer.slice(0, 80)}`,
);
const autoAr = await orchestrateTutor({ prompt: 'ما هو المشتق؟', topic: 'Derivatives', offlineOnly: true });
assert.ok(
  autoAr.answer.startsWith(getLanguageTemplate('ar').answerLabel),
  `a default-language Arabic prompt must get the Arabic label, got: ${autoAr.answer.slice(0, 80)}`,
);
assert.ok(
  !autoAr.answer.includes('\u0627\u0647\u0645 \u0627\u0635\u0637\u0644\u0627\u062d'),
  'the default-language Arabic answer must not leak the Urdu terminology prefix',
);

// ---------------------------------------------------------------------------
// 7. A derivative asked in a non-English language must be *computed*, not just
//    described. The expression is written in Latin characters inside an Urdu or
//    Arabic sentence, which no English verb pattern can see, and the derivative
//    keyword itself is a non-Latin word - so this is where a Latin-only pipeline
//    silently degrades to a conceptual answer.
// ---------------------------------------------------------------------------
const derivativeCases: Array<[string, string]> = [
  ['ur', 'x^2 کا مشتق کیا ہے؟'],
  ['ar', 'ما مشتق x^2؟'],
];
for (const [language, prompt] of derivativeCases) {
  const derivative = await orchestrateTutor({ prompt, topic: 'Derivatives', language, offlineOnly: true });
  assert.ok(
    /d\/dx\s*\(x\^2\)\s*=\s*2x/.test(derivative.answer),
    `${language} "${prompt}" must be computed as d/dx(x^2) = 2x, got: ${derivative.answer.slice(0, 140)}`,
  );
  assert.equal(
    derivative.deterministicAuthority.verification.state,
    'VERIFIED',
    `${language} derivative must be VERIFIED`,
  );
}

// A conceptual question in the same language must NOT invent a computation.
const urduConceptOnly = await orchestrateTutor({
  prompt: 'مشتق کیا ہے؟', topic: 'Derivatives', language: 'ur', offlineOnly: true,
});
assert.ok(
  !/d\/dx/.test(urduConceptOnly.answer),
  'a purely conceptual Urdu question must not fabricate a derivative equation',
);

console.log('Multilingual verification for the 11 required languages passed');
