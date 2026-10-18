/**
 * Phase 24 — per-language coverage report.
 *
 * The directive is explicit: a language list is not language capability, and coverage must be
 * reported independently for each language. So this report never emits a headline aggregate that
 * could be mistaken for capability; it emits per-language rows and a tier summary whose tiers
 * are derived from measured behaviour, not declared intent.
 *
 * Every metric is computed from the live registries and the grammar corpus, so the report cannot
 * drift from what the application actually does.
 */

import { TUTOR_LANGUAGES, getTutorSupportLevel, type TutorSupportLevel } from '../ai/tutorLanguages';
import { DEEP_LANGUAGE_PROFILE_COUNT } from './multilingualTutorKnowledge';

export type LanguageTier =
  | 'FULL'          // local answer template exists
  | 'PARTIAL'       // template localized, prose falls back to canonical English knowledge
  | 'DETECTION';    // detected and classified, no localized answer surface

export interface LanguageCoverage {
  code: string;
  name: string;
  nativeName: string;
  mathLocale: string;
  direction: 'ltr' | 'rtl';
  /** Measured, not declared. */
  tier: LanguageTier;
  supportLevel: TutorSupportLevel;
  /** True when a hand-written grammar profile exists for this language. */
  grammarProfile: boolean;
  uiTranslation: 'none' | 'partial' | 'full';
  tutorAnswerInLanguage: boolean;
  mathTerminology: 'english-canonical' | 'localized';
  knownLimitations: string[];
}

/** Tier derived from the runtime's own support level, so it cannot drift from behaviour. */
function tierFor(level: TutorSupportLevel): LanguageTier {
  if (level === 'FULL_TUTOR_SUPPORT') return 'FULL';
  if (level === 'PARTIAL_TUTOR_SUPPORT') return 'PARTIAL';
  return 'DETECTION';
}

export function buildLanguageCoverage(grammarProfileCodes: string[]): LanguageCoverage[] {
  const grammarProfiles = new Set(grammarProfileCodes);

  return TUTOR_LANGUAGES.map((language) => {
    const level = getTutorSupportLevel(language.code);
    const tier = tierFor(level);
    const hasGrammar = grammarProfiles.has(language.code);
    const direction = language.direction ?? 'ltr';
    const limitations: string[] = [];

    if (tier === 'DETECTION') {
      limitations.push('No localized answer template: the Tutor does not compose an answer in this language.');
    } else if (tier === 'PARTIAL') {
      limitations.push('Labels, steps and badges are localized; longer concept prose renders from canonical English knowledge.');
    }
    if (!hasGrammar) limitations.push('No hand-written grammar profile for this language.');
    if (direction === 'rtl') {
      limitations.push('Right-to-left: bidirectional rendering with embedded formulas needs visual confirmation.');
    }

    return {
      code: language.code,
      name: language.name,
      nativeName: language.nativeName,
      mathLocale: language.mathLocale,
      direction,
      tier,
      supportLevel: level,
      grammarProfile: hasGrammar,
      uiTranslation: 'none',
      tutorAnswerInLanguage: tier === 'FULL',
      mathTerminology: tier === 'FULL' ? 'localized' : 'english-canonical',
      knownLimitations: limitations,
    };
  });
}

export function summariseCoverage(coverage: LanguageCoverage[]): {
  /** Per-tier counts. NOT a capability claim -- each tier is stated with its meaning. */
  tiers: Record<LanguageTier, number>;
  withGrammarProfile: number;
  registryTotal: number;
  deepProfileCount: number;
  /** Spoken plainly so a summary line can never be quoted as "115 languages supported". */
  statement: string;
} {
  const tiers: Record<LanguageTier, number> = { FULL: 0, PARTIAL: 0, DETECTION: 0 };
  for (const row of coverage) tiers[row.tier] += 1;
  const withGrammar = coverage.filter((row) => row.grammarProfile).length;

  return {
    tiers,
    withGrammarProfile: withGrammar,
    registryTotal: coverage.length,
    deepProfileCount: DEEP_LANGUAGE_PROFILE_COUNT,
    statement:
      `${coverage.length} languages are registered for detection and metadata. ` +
      `${tiers.FULL} have a full local answer template, ${tiers.PARTIAL} localize the answer surface only, ` +
      `and ${tiers.DETECTION} are detection-only. ${withGrammar} have hand-written grammar profiles ` +
      `(the corpus declares ${DEEP_LANGUAGE_PROFILE_COUNT}). These counts are capabilities, not a language list.`,
  };
}