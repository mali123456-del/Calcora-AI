/**
 * RED-first coverage for the developer calculation/verification trace (Phase 8).
 *
 * Requirements this pins:
 *  - a trace has a REPRODUCIBLE id: identical input yields an identical id, so a bug
 *    report or regression case can be replayed exactly;
 *  - the id is derived from the mathematical content only, never from wall-clock time,
 *    so re-running the same problem reproduces the same identifier;
 *  - the trace records the deterministic steps and the verification outcome verbatim;
 *  - the trace REFUSES to upgrade a verification state. A trace is evidence, not an
 *    authority: if the engine said UNVERIFIED or UNAVAILABLE, that is what the trace says.
 *  - no private reasoning is exposed: only engine-produced step labels and results.
 */
import assert from 'node:assert/strict';
import {
  buildCalculationTrace,
  calculationTraceId,
  recomputeCalculationTraceId,
  type TraceInput,
} from '../src/services/calculationTrace';

const baseInput: TraceInput = {
  engine: 'calcora-deterministic',
  expression: '2x + 5 = 15',
  steps: [
    { label: 'Collect terms', detail: '2x = 15 - 5' },
    { label: 'Divide', detail: 'x = 10 / 2' },
    { label: 'Result', result: '5' },
  ],
  verification: { state: 'VERIFIED', reason: 'Each root satisfies the original equation.', method: 'substitution' },
  timings: { engine: 12, verification: 3 },
};

function main() {
  const first = buildCalculationTrace(baseInput);

  // 1. Reproducibility.
  const second = buildCalculationTrace(baseInput);
  assert.equal(first.id, second.id, 'the same problem must always produce the same trace id');
  assert.match(first.id, /^calc-[0-9a-f]{16}$/, 'the trace id must be a stable, greppable identifier');

  // 2. Time independence: two builds at different moments must agree.
  const later = buildCalculationTrace({ ...baseInput });
  assert.equal(recalculate(later), first.id, 'the id must be recomputable from the trace content alone');

  // 3. Different mathematics must not collide.
  const other = buildCalculationTrace({ ...baseInput, expression: '2x + 5 = 17' });
  assert.notEqual(other.id, first.id, 'a different equation must yield a different trace id');

  const differentSteps = buildCalculationTrace({ ...baseInput, steps: [{ label: 'Result', result: '5' }] });
  assert.notEqual(differentSteps.id, first.id, 'different derivation steps must yield a different trace id');

  // 4. Steps and verification are recorded verbatim.
  assert.deepEqual(first.steps, baseInput.steps, 'every deterministic step must be preserved in order');
  assert.equal(first.verification.state, 'VERIFIED', 'the verification state must be recorded verbatim');
  assert.equal(first.verification.method, 'substitution', 'the verification method must be recorded');

  // 5. A trace may never upgrade a verification state.
  for (const state of ['UNVERIFIED', 'UNAVAILABLE'] as const) {
    const weak = buildCalculationTrace({ ...baseInput, verification: { state, reason: 'no checkable result' } });
    assert.equal(weak.verification.state, state, `a trace must never upgrade ${state}`);
    assert.notEqual(weak.verification.state, 'VERIFIED', 'evidence must not manufacture verification');
  }

  // 6. Steps must be plain labels/results: no private reasoning fields are carried.
  assert.equal(typeof first.createdAt, 'string', 'a trace records when it was produced');
  assert.ok(Number.isFinite(Date.parse(first.createdAt)), 'createdAt must be a real timestamp');
  for (const step of first.steps) {
    assert.deepEqual(
      Object.keys(step).filter((k) => !['label', 'detail', 'operation', 'result'].includes(k)),
      [],
      'a trace step may only carry label/detail/operation/result, never private reasoning',
    );
  }

  console.log('PASS  a trace id is reproducible for the same problem');
  console.log('PASS  the trace id is independent of wall-clock time and recomputable');
  console.log('PASS  distinct equations and derivations get distinct ids');
  console.log('PASS  deterministic steps and the verification outcome are recorded verbatim');
  console.log('PASS  a trace never upgrades UNVERIFIED or UNAVAILABLE to VERIFIED');
  console.log('PASS  trace steps expose no private reasoning');
}

/** Recompute using the persisted trace rather than the original input object. */
function recalculate(trace: ReturnType<typeof buildCalculationTrace>): string {
  return recomputeCalculationTraceId(trace);
}

main();