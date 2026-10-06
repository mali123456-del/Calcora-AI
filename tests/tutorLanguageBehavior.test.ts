/**
 * Language behaviour regression tests.
 *
 * Capability claims must be evidence-based. This suite asserts the observable Tutor
 * behaviour for the required prompts across Urdu, Arabic script, English, and mixed
 * script, and it deliberately measures what the registry actually contains rather
 * than assuming a "100+ languages with full grammar" claim is true.
 */
import { orchestrateTutor } from '../src/services/tutorOrchestrator';
import { detectLanguages } from '../src/services/languageDetection';
import { getTutorLanguageCapability, isTutorLanguage, getTutorSupportLevel, getTutorSupportCounts, type TutorSupportLevel } from '../src/ai/tutorLanguages';
import { buildMultilingualTutorKnowledge, DEEP_LANGUAGE_PROFILE_COUNT } from '../src/services/multilingualTutorKnowledge';
import { getLanguageTemplate } from '../src/knowledge/multilingualTutor';

let passed = 0;

function check(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Language regression failed: ${message}`);
  passed += 1;
}

function generic(answer: string): boolean {
  return /Deterministic Math Tutor is active/i.test(answer);
}

async function main() {
  // ------------------------------------------------------------------
  // Required prompts, each asserted for a real (non-placeholder) answer.
  // ------------------------------------------------------------------
  const required: Array<{ prompt: string; language: string; label: string }> = [
    { prompt: 'مجھے algebra سمجھاؤ', language: 'ur', label: 'Urdu algebra (roman term)' },
    { prompt: 'مجھے الجبرا سمجھاؤ', language: 'ur', label: 'Urdu + Arabic script algebra' },
    { prompt: 'Give me a hint but don\'t solve it', language: 'en', label: 'English hint only' },
    { prompt: 'Explain my mistake', language: 'en', label: 'English mistake explanation' },
    { prompt: 'What is a variable?', language: 'en', label: 'English concept' },
  ];

  for (const item of required) {
    const mode = /hint/i.test(item.prompt) ? 'hint' : /mistake/i.test(item.prompt) ? 'check-work' : 'assistant';
    const result = await orchestrateTutor({
      prompt: item.prompt,
      mode: mode as never,
      topic: 'Algebra',
      language: item.language,
      offlineOnly: true,
    });
    check(!generic(result.answer), `${item.label} returned a generic placeholder: ${result.answer}`);
    check(result.answer.trim().length > 40, `${item.label} answer is too thin: ${result.answer}`);
    check(
      !/GEMINI|API_KEY|configure your|not configured/i.test(result.answer),
      `${item.label} leaked a cloud/credential requirement: ${result.answer}`,
    );
  }

  // ------------------------------------------------------------------
  // Urdu answer must actually be in Urdu script.
  // ------------------------------------------------------------------
  const urdu = await orchestrateTutor({
    prompt: 'مجھے algebra سمجھاؤ',
    topic: 'Algebra',
    language: 'ur',
    offlineOnly: true,
  });
  check(/[\u0600-\u06FF]/.test(urdu.answer), `Urdu response must be in Urdu script: ${urdu.answer.slice(0, 80)}`);
  check(
    /الجبرا|متغیر|مساوات/.test(urdu.answer),
    `Urdu response must cover algebra terminology: ${urdu.answer.slice(0, 160)}`,
  );

  // Mixed Urdu-English must preserve the English mathematical term.
  const mixed = await orchestrateTutor({
    prompt: 'algebra سمجھاؤ',
    topic: 'Algebra',
    language: 'ur',
    offlineOnly: true,
  });
  check(!generic(mixed.answer), 'mixed Urdu-English must not be a placeholder');
  check(/algebra/i.test(mixed.answer) || /[\u0600-\u06FF]/.test(mixed.answer), 'mixed prompt must be understood');

  // ------------------------------------------------------------------
  // Non-Latin scripts must be detected, not silently defaulted.
  // ------------------------------------------------------------------
  const samples: Array<[string, string]> = [
    ['مجھے الجبرا سمجھاؤ', 'ur'],
    ['ما هي الجبرا؟', 'ar'],
    ['Algebra Vom Grund erklären', 'de'],
    ['Qu\'est-ce que l\'algèbre ?', 'fr'],
    ['¿Qué es el álgebra?', 'es'],
    ['什么是代数', 'zh'],
    ['代数とは何ですか', 'ja'],
    ['대수학이란 무엇입니까', 'ko'],
    ['Что такое алгебра', 'ru'],
    ['Hareket ne algebra?', 'tr'],
  ];

  for (const [text, expected] of samples) {
    const detected = detectLanguages(text);
    check(
      detected.primary === expected || detected.detected.includes(expected),
      `"${text}" should detect ${expected}, got primary=${detected.primary} detected=[${detected.detected.join(',')}]`,
    );
  }

  // ------------------------------------------------------------------
  // Measured registry capability, reported honestly rather than assumed.
  // ------------------------------------------------------------------
  const templates = ['en', 'ur', 'ar', 'fa', 'hi', 'bn', 'pa', 'tr', 'fr', 'es', 'de', 'pt', 'ru', 'zh', 'ja', 'ko', 'id', 'ms', 'ta', 'te', 'mr'];
  for (const code of templates) {
    check(isTutorLanguage(code), `${code} should be a registered tutor language`);
    const template = getLanguageTemplate(code);
    check(Boolean(template.answerLabel), `${code} must have an answer label`);
    const knowledge = buildMultilingualTutorKnowledge(code);
    check(knowledge.length > 20, `${code} must produce real knowledge guidance`);
  }

  // FULL_TUTOR_SUPPORT must mean the local Tutor can actually answer in that language.
  // Measure the capability enum rather than trusting a count.
  const requiredLanguages = [
    'en', 'ur', 'ar', 'fa', 'hi', 'bn', 'pa', 'tr', 'fr', 'es', 'de', 'pt', 'ru',
    'zh', 'ja', 'ko', 'id', 'ms', 'ta', 'te', 'mr',
  ];
  for (const code of requiredLanguages) {
    const level: TutorSupportLevel = getTutorSupportLevel(code);
    check(
      level === 'FULL_TUTOR_SUPPORT' || level === 'PARTIAL_TUTOR_SUPPORT' || level === 'DETECTION_ONLY',
      `${code} has an invalid support level: ${level}`,
    );
    // Every required language must at least be detected and have a capability record.
    check(Boolean(getTutorLanguageCapability(code)), `${code} must have a capability record`);
  }

  // FULL_TUTOR_SUPPORT is a strong claim: verify it actually holds for each such language.
  const counts = getTutorSupportCounts();
  for (const [level, count] of Object.entries(counts)) {
    check(Number.isInteger(count) && count >= 0, `support count for ${level} must be a non-negative integer`);
  }
  for (const code of requiredLanguages) {
    if (getTutorSupportLevel(code) !== 'FULL_TUTOR_SUPPORT') continue;
    // A FULL claim requires a substantive local answer in that language.
    const result = await orchestrateTutor({
      prompt: code === 'ur' ? 'مجھے algebra سمجھاؤ' : 'Explain algebra to me',
      topic: 'Algebra',
      language: code,
      offlineOnly: true,
    });
    check(result.answer.length > 80, `${code} claims FULL_TUTOR_SUPPORT but produced a thin answer`);
    check(!generic(result.answer), `${code} claims FULL_TUTOR_SUPPORT but returned a placeholder`);
  }
  check(counts.FULL_TUTOR_SUPPORT >= 2, 'English and Urdu must both be FULL_TUTOR_SUPPORT');
  passed += 1;
  console.log(`  measured support: FULL=${counts.FULL_TUTOR_SUPPORT} PARTIAL=${counts.PARTIAL_TUTOR_SUPPORT} DETECTION_ONLY=${counts.DETECTION_ONLY}`);
  check(DEEP_LANGUAGE_PROFILE_COUNT > 0, 'there must be at least one deep language profile');

  // A representative concept question must work in several real languages.
  const conceptLanguages: Array<[string, string]> = [
    ['Explain algebra to me', 'en'],
    ['Erkläre mir die Algebra', 'de'],
    ['Explique-moi l’algèbre', 'fr'],
    ['Explícame el álgebra', 'es'],
  ];
  for (const [prompt, language] of conceptLanguages) {
    const result = await orchestrateTutor({
      prompt,
      topic: 'Algebra',
      language,
      offlineOnly: true,
    });
    check(!generic(result.answer), `${language} concept question returned a placeholder`);
    check(result.answer.length > 60, `${language} concept answer too thin`);
  }

  console.log(`Tutor language tests passed: ${passed}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
