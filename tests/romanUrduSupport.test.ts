/**
 * RED-first coverage for Roman Urdu support (Phase 24).
 *
 * Three defects were found by running the model-free benchmark, which the packaged end-to-end
 * gate had masked because the server path performs extra extraction before the orchestrator:
 *
 *  1. `detectLanguage` classifies Roman Urdu ("... ka ... kya hai") as Hindi, because the
 *     Roman-Urdu function words are Hindi loanwords in Devanagari-derived vocabulary.
 *  2. `orchestrateTutor` ignores an explicitly requested `language` and always auto-detects,
 *     so selecting a language in the UI silently has no effect.
 *  3. `extractMathProblem` only mines an embedded expression from non-Latin script. Roman Urdu
 *     is written in Latin characters, so the derivative is never computed.
 *
 * The Latin-script widening must NOT reintroduce the failures the gate exists to prevent, which
 * the knowledge audit caught: "Simplify log_10(1000)" and "|A| = 14, |B| = 10" must still yield
 * no extracted expression.
 */

import assert from 'node:assert/strict';
import { extractMathProblem } from '../src/engine/problemExtractor';
import { detectLanguage } from '../src/services/languageDetection';
import { orchestrateTutor } from '../src/services/tutorOrchestrator';

/** True when the answer is composed in Urdu script. */
const hasUrduScript = (text: string): boolean => /[\u0600-\u06FF]/.test(text);
const hasHindiScript = (text: string): boolean => /[\u0900-\u097F]/.test(text);

async function main() {
  // --- 1. Roman Urdu must not be classified as Hindi ---
  assert.equal(
    detectLanguage('x^2 ka derivative kya hai?'),
    'ur',
    'Roman Urdu must be detected as Urdu, not Hindi',
  );
  assert.equal(
    detectLanguage('2x + 5 = 15 ka hal batao'),
    'ur',
    'Roman Urdu phrasing must be detected as Urdu',
  );
  // Detection of genuinely Hindi prose must not regress.
  assert.equal(
    detectLanguage('x^2 का डेरिवेटिव क्या है'),
    'hi',
    'Devanagari Hindi must still be detected as Hindi',
  );

  // --- 2. The embedded expression must be extracted from Roman Urdu ---
  const romanUrdu = extractMathProblem('x^2 ka derivative kya hai?');
  assert.equal(
    romanUrdu.kind,
    'calculate',
    'a Roman Urdu derivative request must be computed, not answered conceptually',
  );
  assert.equal(
    'expression' in romanUrdu ? romanUrdu.expression : undefined,
    'x^2',
    'the Latin-script expression must be extracted from Roman Urdu prose',
  );

  const romanUrduEquation = extractMathProblem('2x + 5 = 15 ka hal batao');
  assert.notEqual(
    romanUrduEquation.kind,
    'unknown',
    'a Roman Urdu equation request must be recognised',
  );

  // --- 3. The gate that protects Latin prose must still hold ---
  // These two were mis-read by the knowledge audit and are the reason the gate exists.
  for (const prose of ['Simplify log_10(1000)', '|A| = 14, |B| = 10']) {
    const extracted = extractMathProblem(prose);
    assert.equal(
      extracted.kind,
      'unknown',
      `ordinary Latin prose must not have an expression invented from it: ${JSON.stringify(prose)}`,
    );
  }

  // --- 4. An explicit language request must be honoured ---
  const urdu = await orchestrateTutor({
    prompt: 'x^2 ka derivative kya hai?',
    offlineOnly: true,
    language: 'ur',
  });
  assert.ok(
    hasUrduScript(String(urdu.answer)) && !hasHindiScript(String(urdu.answer).slice(0, 12)),
    'an explicit request for Urdu must produce Urdu script, not Hindi',
  );

  const english = await orchestrateTutor({
    prompt: 'x^2 ka derivative kya hai?',
    offlineOnly: true,
    language: 'en',
  });
  assert.equal(
    hasUrduScript(String(english.answer).slice(0, 12)),
    false,
    'an explicit request for English must not be overridden by auto-detection',
  );

  // --- 5. The deterministic result must be produced, not just localized ---
  const authority = (urdu as unknown as { deterministicAuthority?: { authoritativeResult?: string | null } })
    .deterministicAuthority;
  assert.equal(
    authority?.authoritativeResult,
    '2x',
    'a Roman Urdu derivative request must be computed deterministically as 2x',
  );

  console.log('PASS  Roman Urdu is detected as Urdu, not Hindi');
  console.log('PASS  Devanagari Hindi detection is unaffected');
  console.log('PASS  a Latin expression is extracted from Roman Urdu prose');
  console.log('PASS  a Roman Urdu equation request is recognised');
  console.log('PASS  Latin prose still yields no invented expression (log_10, |A| guard preserved)');
  console.log('PASS  an explicit language request is honoured, not overridden by detection');
  console.log('PASS  a Roman Urdu derivative is computed deterministically as 2x');

  // --- 6. A DEFAULT 'en' must not outrank a non-English detection ---
  // Regression: when `language` defaults to 'en', treating any non-empty value as an explicit
  // request made a default English beat a correctly detected Urdu prompt, so a script-detected
  // Urdu question was answered with the English label. Caught by multilingualVerification11.
  const detectedOnly = await orchestrateTutor({
    prompt: 'مشتق کیا ہے؟',
    offlineOnly: true,
  });
  assert.ok(
    hasUrduScript(String(detectedOnly.answer).slice(0, 12)),
    'a script-detected Urdu prompt with no explicit language must still answer in Urdu',
  );
  console.log('PASS  a default "en" does not outrank a non-English script detection');
}

main().catch((error) => {
  console.error('FAIL ', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});