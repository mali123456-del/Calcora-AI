/**
 * RED-first regression for writing direction (Phase 24).
 *
 * Found by the coverage report: every right-to-left language in the language registry was
 * missing its `direction`, so all of them silently defaulted to LTR. That breaks bidirectional
 * rendering precisely for the languages the directive requires tested -- Urdu, Arabic, Persian,
 * Hebrew and the rest -- and it was invisible while the registry was only counted, never audited
 * per language.
 */
import assert from 'node:assert/strict';
import { TUTOR_LANGUAGES, getTutorLanguage } from '../src/ai/tutorLanguages';
import { buildLanguageCoverage } from '../src/services/languageCoverageReport';

/** Languages written right-to-left. Membership is a property of the writing system, not a preference. */
const RTL_LANGUAGES = ['ur', 'ar', 'fa', 'he', 'ps', 'yi', 'ku', 'sd', 'ug'];

function main() {
  for (const code of RTL_LANGUAGES) {
    const language = getTutorLanguage(code);
    assert.notEqual(language.code, 'en', `language ${code} must exist in the registry`);
    assert.equal(
      language.direction,
      'rtl',
      `${language.name} (${code}) is written right-to-left and must declare direction: 'rtl'`,
    );
  }

  // LTR languages must not be flipped by the fix.
  for (const code of ['en', 'hi', 'de', 'fr', 'es', 'zh']) {
    const language = getTutorLanguage(code);
    assert.notEqual(
      language.direction,
      'rtl',
      `${language.name} (${code}) is left-to-right and must not be marked rtl`,
    );
  }

  // The coverage report must surface direction rather than defaulting it away.
  const coverage = buildLanguageCoverage([]);
  for (const row of coverage) {
    assert.ok(row.direction === 'ltr' || row.direction === 'rtl', `direction for ${row.code} must be explicit`);
  }
  const urdu = coverage.find((row) => row.code === 'ur');
  assert.equal(urdu?.direction, 'rtl', 'the coverage report must report Urdu as right-to-left');
  assert.ok(
    urdu?.knownLimitations.some((l) => /right-to-left/i.test(l)),
    'an RTL language must carry the bidirectional-rendering caveat',
  );

  // Every registered language resolves to a known direction.
  for (const language of TUTOR_LANGUAGES) {
    assert.ok(
      language.direction === undefined || language.direction === 'ltr' || language.direction === 'rtl',
      `language ${language.code} has an invalid direction`,
    );
  }

  console.log(`PASS  all ${RTL_LANGUAGES.length} right-to-left languages declare direction: 'rtl'`);
  console.log('PASS  left-to-right languages are not flipped');
  console.log('PASS  the coverage report surfaces direction instead of defaulting it');
  console.log('PASS  RTL languages carry the bidirectional-rendering caveat');
  console.log('PASS  every registered language resolves to a known direction');
}

main();