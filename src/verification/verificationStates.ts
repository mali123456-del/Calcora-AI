/**
 * Calcora AI — canonical verification contract.
 *
 * This module is the single source of truth for "what state is this mathematical
 * answer in?". Before Wave 1 the product carried a single boolean
 * (`deterministicVerified` / `isVerified`) which could not distinguish
 * "independently confirmed" from "we never checked" from "the check disagreed".
 * A boolean forces those three very different situations to look identical.
 *
 * The four states and the exact conditions under which each may be used:
 *
 *   VERIFIED     A deterministic engine produced a result AND an independent
 *                second code path re-derived the same value. Both the reported
 *                value and the independent observation are recorded.
 *
 *   FAILED       The independent re-derivation actually ran and disagreed with
 *                the reported value. `actual` and `independent` are both
 *                populated so the disagreement can be shown to the learner.
 *
 *   UNVERIFIED   The response is conceptual, or verification does not apply to
 *                it. This does NOT mean the answer is wrong or suspected wrong.
 *
 *   UNAVAILABLE  The required deterministic capability does not exist, or the
 *                input could not be evaluated. The system declines rather than
 *                guessing. This is never a failure of the answer's truth; it is a
 *                failure to produce a checkable claim.
 *
 * Invariants enforced by `tests/verificationStates.test.ts`:
 *   - VERIFIED always carries an `independent` observation.
 *   - FAILED always carries an `independent` observation, for comparison.
 *   - Every outcome carries a non-empty, non-shaming `reason`.
 */

export const VERIFICATION_STATES = ['VERIFIED', 'UNVERIFIED', 'FAILED', 'UNAVAILABLE'] as const;

export type VerificationState = (typeof VERIFICATION_STATES)[number];

/**
 * How the check was performed.
 *
 * `exact-rational`     A separate exact rational arithmetic evaluator re-derived
 *                      the value. This is a genuinely different algorithm from the
 *                      floating-point shunting-yard evaluator in mathEngine, so it
 *                      can expose precedence or precision faults rather than
 *                      reproduce them.
 * `equation-residual`  Every reported root was substituted back into the original
 *                      equation and both sides compared. A wrong root cannot
 *                      satisfy the equation it came from.
 * `recompute`          A second, independently written numeric evaluator agreed.
 * `none`               No independent check was possible.
 */
export type VerificationMethod = 'exact-rational' | 'equation-residual' | 'recompute' | 'none';

export interface VerificationOutcome {
  readonly state: VerificationState;
  readonly method: VerificationMethod;
  /** Human-readable explanation. Never implies the learner is at fault. */
  readonly reason: string;
  /** The value the system is reporting, when there is one. */
  readonly actual: string | null;
  /** The independently derived value. Present for VERIFIED and FAILED. */
  readonly independent: string | null;
  readonly checkedAt: number;
}

function outcome(
  state: VerificationState,
  method: VerificationMethod,
  reason: string,
  actual: string | null,
  independent: string | null,
): VerificationOutcome {
  return { state, method, reason, actual, independent, checkedAt: Date.now() };
}

export function verifiedBy(method: VerificationMethod, reason: string, actual: string, independent: string): VerificationOutcome {
  return outcome('VERIFIED', method, reason, actual, independent);
}

export function failedVerification(method: VerificationMethod, reason: string, actual: string | null, independent: string | null): VerificationOutcome {
  return outcome('FAILED', method, reason, actual, independent);
}

export function unverified(reason: string): VerificationOutcome {
  return outcome('UNVERIFIED', 'none', reason, null, null);
}

export function unavailable(reason: string): VerificationOutcome {
  return outcome('UNAVAILABLE', 'none', reason, null, null);
}

/**
 * Map the Agent's historical PASS/FAIL/UNKNOWN triple onto the canonical states.
 *
 * Kept so the existing bounded Math Agent can adopt the canonical contract without
 * having two parallel notions of "verified" in the codebase.
 */
export function fromAgentStatus(
  status: 'PASS' | 'FAIL' | 'UNKNOWN',
  method: 'substitute' | 'recompute' | 'none',
  reason: string,
  observed: string | undefined,
  actual: string | null,
): VerificationOutcome {
  if (status === 'PASS') {
    const mapped: VerificationMethod = method === 'substitute' ? 'equation-residual' : method === 'recompute' ? 'recompute' : 'none';
    return verifiedBy(mapped, reason, actual ?? observed ?? '', observed ?? actual ?? '');
  }
  if (status === 'FAIL') {
    const mapped: VerificationMethod = method === 'substitute' ? 'equation-residual' : method === 'recompute' ? 'recompute' : 'none';
    return failedVerification(mapped, reason, actual, observed ?? null);
  }
  return unverified(reason);
}

/** Backwards-compatible boolean view, for call sites not yet migrated. */
export function isVerifiedState(state: VerificationState): boolean {
  return state === 'VERIFIED';
}
