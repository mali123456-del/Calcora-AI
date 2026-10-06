/**
 * Calcora AI — knowledge verification audit (GAP-13a).
 *
 * Why this exists
 * ---------------
 * Every tutor answer may cite a knowledge item as grounding. Before this module a
 * knowledge item carried no statement of its own reliability, so a curated
 * definition and a hand-written paragraph were indistinguishable to the Tutor. The
 * Tutor therefore had no way to know whether the context it retrieved deserved the
 * word "verified".
 *
 * What it does
 * ------------
 * It computes a per-item status from evidence that actually exists in the repository,
 * by re-deriving each item's worked examples with the deterministic engine and
 * checking the result against the stated solution. It never asserts a status by hand:
 * `auditKnowledgeCorpus` derives every value, so the distribution in the tests is a
 * measurement rather than a claim.
 *
 * The three states
 * ----------------
 *   VERIFIED          Every example that could be machine-checked was re-derived by
 *                     the deterministic engine and agreed with the stated solution,
 *                     and at least one example was checkable.
 *   REVIEW_REQUIRED   The item has content the engine could not settle either way —
 *                     a conceptual example, a symbolic identity, or a reference
 *                     source. Not wrong, but not confirmed by this build either.
 *   UNVERIFIED        Nothing in the item could be checked at all.
 *
 * Retrieval safety
 * ----------------
 * Knowledge is context, never authority. `knowledgeIsAuthoritative` returns false for
 * every status, because a curated definition can never outrank a computed value.
 * That is enforced here rather than left to each call site.
 */

import { extractMathProblem } from '../engine/problemExtractor';
import { solveEquation } from '../engine/equationSolver';
import { calculateExpression } from '../engine/mathEngine';
import { verifyEquation } from '../verification/independentVerifier';
import type { MathKnowledgeItem } from './knowledgeTypes';

export type KnowledgeVerificationStatus = 'VERIFIED' | 'UNVERIFIED' | 'REVIEW_REQUIRED';

export const KNOWLEDGE_VERIFICATION_STATUSES: readonly KnowledgeVerificationStatus[] = [
  'VERIFIED',
  'UNVERIFIED',
  'REVIEW_REQUIRED',
];

export interface KnowledgeVerificationEvidence {
  /** Examples the engine was able to re-derive and check. */
  checkedExamples: number;
  /** Examples whose re-derivation agreed with the stated solution. */
  agreedExamples: number;
  /** Examples that could be re-derived but disagreed. A non-zero count is a defect. */
  disagreedExamples: number;
  /** Examples the engine could not settle either way. */
  uncheckableExamples: number;
  /** Formulas in the item that evaluated cleanly as closed expressions. */
  checkableFormulas: number;
  /** Formulas containing variables or constructs outside closed arithmetic. */
  symbolicFormulas: number;
  /** True when the item's examples contradict the deterministic engine. */
  hasContradiction: boolean;
}

function emptyEvidence(): KnowledgeVerificationEvidence {
  return {
    checkedExamples: 0,
    agreedExamples: 0,
    disagreedExamples: 0,
    uncheckableExamples: 0,
    checkableFormulas: 0,
    symbolicFormulas: 0,
    hasContradiction: false,
  };
}

/** Strip prose and LaTeX noise so an engine call sees a bare expression. */
function toBareExpression(text: string): string {
  return text
    .replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '($1)/($2)')
    .replace(/\\sqrt\{([^{}]+)\}/g, 'sqrt($1)')
    .replace(/\\left|\\right|\\!|\\,|\\;|\\ /g, '')
    .replace(/[$^]/g, '')
    .replace(/\\cdot|\\times/g, '*')
    .replace(/\\div/g, '/')
    .replace(/[{}]/g, '')
    .trim();
}

/**
 * Extract the numeric answer(s) a worked example claims.
 *
 * A stated answer may be a plain number ("6"), a fraction ("7/12"), a mixed form
 * ("1 1/2") or a decimal. Matching bare digits alone would split "7/12" into two
 * unrelated numbers and report a correct worked example as a contradiction, so
 * fractions are recognised first and evaluated as single values.
 */
function statedValues(solution: string): number[] {
  const text = solution ?? '';
  const values: number[] = [];

  // Fractions, including simple mixed numbers such as "1 1/2".
  const fractionPattern = /(-?\d+)\s+(\d+)\s*\/\s*(\d+)|(-?\d+)\s*\/\s*(\d+)/g;
  let match: RegExpExecArray | null;
  while ((match = fractionPattern.exec(text)) !== null) {
    if (match[1] !== undefined) {
      const whole = Number(match[1]);
      const numerator = Number(match[2]);
      const denominator = Number(match[3]);
      if (denominator !== 0) {
        const sign = whole < 0 ? -1 : 1;
        values.push(sign * (Math.abs(whole) + numerator / denominator));
      }
    } else if (match[4] !== undefined) {
      const numerator = Number(match[4]);
      const denominator = Number(match[5]);
      if (denominator !== 0) values.push(numerator / denominator);
    }
  }

  // Decimal or integer answers, ignoring any digits already consumed by a fraction.
  const withoutFractions = text.replace(fractionPattern, ' ');
  for (const raw of withoutFractions.match(/-?\d+(?:\.\d+)?/g) ?? []) {
    const asNumber = Number(raw);
    if (Number.isFinite(asNumber)) values.push(asNumber);
  }

  return values;
}

function valueMatches(values: readonly number[], target: number): boolean {
  return values.some((value) => Math.abs(value - target) < 1e-9);
}

function valueMatchesText(values: readonly number[], text: string): boolean {
  return values.some((value) => String(value) === text.trim());
}

/**
 * Try to re-derive a single worked example with the deterministic engine.
 *
 * Returns 'agreed' | 'disagreed' | 'uncheckable'. Never guesses: if the problem text
 * does not reduce to something the engine can evaluate, the example is reported as
 * uncheckable rather than assumed correct.
 */
function checkExample(example: { problem: string; solution: string }): 'agreed' | 'disagreed' | 'uncheckable' {
  const extracted = extractMathProblem(example.problem);

  if (extracted.kind === 'solveEquation' && extracted.equation) {
    const solved = solveEquation(extracted.equation);
    if (!solved.isValid || !solved.solutions.length) return 'uncheckable';
    const stated = statedValues(example.solution);
    if (!stated.length) return 'uncheckable';
    // Independently confirm the solver's own roots, then compare to what the item claims.
    const verified = verifyEquation(
      extracted.equation,
      solved.solutions.map((s) => String(s).trim()).filter((s) => s.length > 0),
    );
    if (verified.state !== 'VERIFIED') return 'disagreed';
    const solverValues = solved.solutions
      .map((s) => statedValues(String(s)))
      .reduce<number[]>((acc, values) => acc.concat(values), []);
    return solverValues.some((value) => valueMatches(stated, value)) ? 'agreed' : 'disagreed';
  }

  if (extracted.kind === 'calculate' && extracted.expression) {
    const bare = toBareExpression(extracted.expression);
    const stated = statedValues(example.solution);
    if (!stated.length) return 'uncheckable';
    const calculated = calculateExpression(bare);
    if (calculated.error || !Number.isFinite(calculated.value)) return 'uncheckable';
    return valueMatches(stated, calculated.value) || valueMatchesText(stated, calculated.display)
      ? 'agreed'
      : 'disagreed';
  }

  return 'uncheckable';
}

/** Collect the evidence for one item without deciding a status. */
export function collectKnowledgeEvidence(item: MathKnowledgeItem): KnowledgeVerificationEvidence {
  const evidence = emptyEvidence();

  for (const example of item.examples ?? []) {
    const outcome = checkExample({ problem: example.problem ?? '', solution: example.solution ?? '' });
    if (outcome === 'agreed') {
      evidence.checkedExamples += 1;
      evidence.agreedExamples += 1;
    } else if (outcome === 'disagreed') {
      evidence.checkedExamples += 1;
      evidence.disagreedExamples += 1;
      evidence.hasContradiction = true;
    } else {
      evidence.uncheckableExamples += 1;
    }
  }

  for (const formula of item.formulas ?? []) {
    const bare = toBareExpression(formula);
    // A closed expression with no letters and no unsupported function is checkable.
    if (/[a-z]/i.test(bare)) {
      evidence.symbolicFormulas += 1;
      continue;
    }
    const calculated = calculateExpression(bare);
    if (calculated.error || !Number.isFinite(calculated.value)) {
      evidence.symbolicFormulas += 1;
    } else {
      evidence.checkableFormulas += 1;
    }
  }

  return evidence;
}

/**
 * Decide an item's status from its evidence.
 *
 * A contradiction with the deterministic engine always wins and forces
 * REVIEW_REQUIRED, because an item that contradicts the engine must never be
 * presented as verified, whatever else it contains.
 */
export function computeKnowledgeVerificationStatus(
  item: MathKnowledgeItem,
  evidence: KnowledgeVerificationEvidence = collectKnowledgeEvidence(item),
): KnowledgeVerificationStatus {
  if (evidence.hasContradiction) return 'REVIEW_REQUIRED';

  const hasExamples = (item.examples?.length ?? 0) > 0;
  if (evidence.agreedExamples > 0 && evidence.disagreedExamples === 0) {
    // Machine-checked examples agreed. Reference-grade sources still warrant a look.
    const sourceType = item.sourceMetadata?.sourceType;
    if (sourceType === 'open_educational_reference') return 'REVIEW_REQUIRED';
    return 'VERIFIED';
  }

  if (hasExamples && evidence.uncheckableExamples > 0) return 'REVIEW_REQUIRED';
  if (evidence.checkableFormulas > 0) return 'REVIEW_REQUIRED';
  return 'UNVERIFIED';
}

/**
 * Apply the audit across a corpus and return new items carrying the computed status.
 *
 * The input items are not mutated, so a caller can audit an arbitrary subset.
 */
export function auditKnowledgeCorpus(items: readonly MathKnowledgeItem[]): MathKnowledgeItem[] {
  return items.map((item) => {
    const evidence = collectKnowledgeEvidence(item);
    return { ...item, verificationStatus: computeKnowledgeVerificationStatus(item, evidence) };
  });
}

/**
 * Knowledge is never the authority for a numerical result.
 *
 * This always returns false by design. It exists so that any future call site which
 * is tempted to branch on knowledge status has an explicit, documented answer
 * available at the point of use rather than inventing its own.
 */
export function knowledgeIsAuthoritative(_status: KnowledgeVerificationStatus | undefined): boolean {
  return false;
}

/** Human-readable summary of an audit, used by tests and diagnostics. */
export function summariseKnowledgeAudit(items: readonly MathKnowledgeItem[]): Record<string, number> {
  const counts: Record<string, number> = { VERIFIED: 0, UNVERIFIED: 0, REVIEW_REQUIRED: 0 };
  for (const item of items) {
    const status = item.verificationStatus ?? computeKnowledgeVerificationStatus(item);
    counts[status] = (counts[status] ?? 0) + 1;
  }
  return counts;
}
