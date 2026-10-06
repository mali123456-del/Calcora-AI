/**
 * Calcora AI — learner turn classification (GAP-05).
 *
 * Why
 * ---
 * MMTutorBench (ACL 2026) classifies a learner's follow-up into three kinds, and the
 * distinction matters because each needs a different Tutor response:
 *
 *   PROGRESSIVE     The next step of the same problem. The Tutor should advance.
 *   EXPLORATORY     The learner is probing: trying a method, asking for an example,
 *                   asking what happens if a value changes.
 *   INTROSPECTIVE   The learner is examining their own work: why this step, where
 *                   this went wrong, is this the right approach.
 *
 * The existing Tutor handled Progressive continuity. This adds the other two
 * deterministically.
 *
 * Constraints
 * -----------
 * Classification is rule-based and inspectable: every turn is matched against named
 * patterns, and the matched pattern is returned so a caller can see why. Nothing here
 * infers a mental state, an emotion or a personality trait; the labels describe the
 * *form of the text*, not the state of the person who wrote it. An unrecognised turn
 * is reported as PROGRESSIVE, the safe default, rather than being forced into a
 * category it does not fit.
 */

export type TutorTurnKind = 'PROGRESSIVE' | 'EXPLORATORY' | 'INTROSPECTIVE';

export interface TurnClassification {
  kind: TutorTurnKind;
  /** The named pattern that decided the classification. */
  matchedRule: string;
  /** True when no specific pattern applied and the default was used. */
  defaulted: boolean;
  /** Which observable features contributed. Names features, not states. */
  signals: string[];
}

/**
 * Introspective: the learner refers to their own reasoning, solution, attempt or
 * method. Matched before Exploratory because "why did I get X wrong" is about the
 * learner and must not be classified as a general question about the method.
 */
const INTROSPECTIVE_PATTERNS: Array<{ rule: string; pattern: RegExp }> = [
  { rule: 'self-directed-why', pattern: /\bwhy\s+(?:did|do|does|am|is)\s+(?:i|my|we|our)\b/i },
  { rule: 'self-referential-mistake', pattern: /\b(?:i|we)\s+(?:made|mess[ -]?up|got|keep|keep\s+getting)\b/i },
  { rule: 'own-attempt-review', pattern: /\b(?:my|our)\s+(?:answer|attempt|work|solution|steps?|method|reasoning)\b/i },
  { rule: 'check-my-work', pattern: /\b(?:check|review|verify|correct|am i right|is this right)\b[^.?!]*\b(?:my|this|these)\b/i },
  { rule: 'where-did-i-go-wrong', pattern: /\bwhere\s+(?:did|do)\s+(?:i|we)\s+(?:go\s+)?wrong\b/i },
  { rule: 'self-doubt-phrasing', pattern: /\b(?:i|we)\s+(?:am|are)\s+(?:confused|lost|stuck)\b/i },
  { rule: 'understand-my-error', pattern: /\bunderstand\s+(?:my|our|the)\s+(?:mistake|error|confusion)\b/i },
  { rule: 'did-i-use-the-right-method', pattern: /\b(?:did|do|should)\s+(?:i|we)\s+use\s+the\s+(?:right|correct)\b/i },
];

/**
 * Exploratory: probing, trying, comparing, or asking for a variation or example.
 */
const EXPLORATORY_PATTERNS: Array<{ rule: string; pattern: RegExp }> = [
  { rule: 'what-if', pattern: /\bwhat\s+(?:if|happens|would\s+happen)\b/i },
  { rule: 'alternative-method', pattern: /\b(?:another|other|alternative|different|another\s+way)\s+(?:way|method|approach|technique)\b/i },
  { rule: 'give-example', pattern: /\b(?:can you\s+)?(?:give|show|provide|need)\s+(?:me\s+)?(?:an?\s+)?(?:example|examples|similar)\b/i },
  { rule: 'try-it', pattern: /\b(?:let me|can i|may i|let'?s)\s+try\b/i },
  { rule: 'explore-concept', pattern: /\b(?:tell me more|more about|explain more|go deeper|elaborate)\b/i },
  { rule: 'compare-approaches', pattern: /\b(?:compare|contrast|difference between|better)\b[^.?!]*\b(?:method|approach|way)\b/i },
  { rule: 'generalise-rule', pattern: /\b(?:does this (?:always|work)|will this always|is this always)\b/i },
  { rule: 'counterfactual', pattern: /\b(?:suppose|what if i|instead)\b/i },
  { rule: 'why-general', pattern: /\bwhy\s+(?:does|do|is|are|can|must)\b/i },
  { rule: 'how-did-you', pattern: /\bhow\s+(?:did|do)\s+you\b/i },
];

/**
 * Progressive: continuing the same problem. Matched last so that a turn which also
 * contains a "what if" is still Progressive when it is plainly the next step.
 */
const PROGRESSIVE_PATTERNS: Array<{ rule: string; pattern: RegExp }> = [
  { rule: 'next-step', pattern: /\b(?:next|continue|carry on|go on|proceed|keep going)\b/i },
  { rule: 'explicit-next-question', pattern: /\bwhat\s+(?:is|are)\s+the\s+next\b/i },
  { rule: 'then-what', pattern: /\b(?:and\s+)?then\s+(?:what|do i|do we|how)\b/i },
  { rule: 'first-step', pattern: /\b(?:how|where)\s+(?:do i|do we|to)\s+(?:start|begin)\b/i },
  { rule: 'final-answer', pattern: /\b(?:so|thus|therefore)\s+(?:the answer|x|y|it)\b/i },
  { rule: 'show-steps', pattern: /\b(?:show|give|list)\s+(?:the\s+)?(?:steps|work|working|solution)\b/i },
];

/**
 * Classify a learner turn.
 *
 * @param text    The learner's message.
 * @param context Optional observable context. `hasSubmittedWork` is true when the
 *                learner has already submitted an answer, which makes an introspective
 *                reading more likely but is never used on its own to infer a state.
 */
export function classifyLearnerTurn(
  text: string,
  context: { hasSubmittedWork?: boolean; isFollowUp?: boolean } = {},
): TurnClassification {
  const input = (text ?? '').trim();

  if (!input) {
    return { kind: 'PROGRESSIVE', matchedRule: 'empty-turn', defaulted: true, signals: ['empty input'] };
  }

  const signals: string[] = [];
  if (context.hasSubmittedWork) signals.push('prior work submitted');
  if (context.isFollowUp) signals.push('conversation follow-up');

  for (const { rule, pattern } of INTROSPECTIVE_PATTERNS) {
    if (pattern.test(input)) {
      return {
        kind: 'INTROSPECTIVE',
        matchedRule: rule,
        defaulted: false,
        signals: [...signals, `self-reference: ${rule}`],
      };
    }
  }

  for (const { rule, pattern } of EXPLORATORY_PATTERNS) {
    if (pattern.test(input)) {
      return {
        kind: 'EXPLORATORY',
        matchedRule: rule,
        defaulted: false,
        signals: [...signals, `probe: ${rule}`],
      };
    }
  }

  for (const { rule, pattern } of PROGRESSIVE_PATTERNS) {
    if (pattern.test(input)) {
      return {
        kind: 'PROGRESSIVE',
        matchedRule: rule,
        defaulted: false,
        signals: [...signals, `continuation: ${rule}`],
      };
    }
  }

  return {
    kind: 'PROGRESSIVE',
    matchedRule: 'no-specific-pattern',
    defaulted: true,
    signals: [...signals, 'no specific pattern matched; treated as continuing the current problem'],
  };
}

/** A one-line, factual description of a turn kind, for UI and logs. */
export function describeTurnKind(kind: TutorTurnKind): string {
  switch (kind) {
    case 'PROGRESSIVE':
      return 'Continuing the current problem.';
    case 'EXPLORATORY':
      return 'Probing a method, variation or example.';
    case 'INTROSPECTIVE':
      return 'Examining the learner\'s own submitted work or reasoning.';
    default:
      return 'Continuing the current problem.';
  }
}
