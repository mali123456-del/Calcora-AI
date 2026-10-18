/**
 * Builds a developer trace from live calculator state by DELEGATING to the independent
 * verifier, so the developer workspace reports the same authority the Tutor uses rather
 * than a state the UI asserts about itself.
 *
 * The rule throughout: when there is nothing to verify, say so. An unevaluated request
 * yields UNAVAILABLE with no invented derivation steps.
 */
import { verifyDeterministicOutcome } from '../verification/independentVerifier';
import { buildCalculationTrace, type CalculationTrace, type TraceStep } from './calculationTrace';

export interface CalculatorStateInput {
  expression?: string | null;
  reportedResult?: string | null;
  /** False when the deterministic engine reported it could not evaluate the request. */
  engineSucceeded?: boolean;
}

const DERIVATIVE_NOTATION = /d\s*\/\s*d\s*[a-z]/i;

export function traceCalculatorState(state: CalculatorStateInput): CalculationTrace | null {
  const expression = typeof state.expression === 'string' ? state.expression.trim() : '';
  if (!expression) return null;

  const reported =
    typeof state.reportedResult === 'string' && state.reportedResult.trim() ? state.reportedResult.trim() : null;

  const engineSucceeded = state.engineSucceeded !== false;

  let kind: 'calculation' | 'equation' | 'derivative' = 'calculation';
  let roots: string[] | undefined;
  if (expression.includes('=')) {
    kind = 'equation';
    roots = reported ? reported.split(',').map((root) => root.trim()).filter(Boolean) : [];
  } else if (DERIVATIVE_NOTATION.test(expression)) {
    kind = 'derivative';
  }

  const outcome = verifyDeterministicOutcome({
    kind,
    expression,
    result: reported,
    roots,
    engineSucceeded,
  });

  // Derivation steps exist only when there is a real result to describe. An unevaluated or
  // unverified request must not acquire a plausible-looking derivation.
  const steps: TraceStep[] =
    reported && engineSucceeded
      ? [
          { label: 'Submitted expression', detail: expression },
          { label: 'Engine result', result: reported },
        ]
      : [];

  return buildCalculationTrace({
    engine: 'calcora-deterministic',
    expression,
    steps,
    verification: {
      state: outcome.state,
      ...(outcome.reason === undefined ? {} : { reason: outcome.reason }),
      ...(outcome.method === undefined ? {} : { method: outcome.method }),
    },
    provenance: { source: 'calculator' },
  });
}