/**
 * RED-first coverage for the developer trace builder (Phase 8).
 *
 * The developer workspace must not merely *display* a state -- it must DERIVE it from the
 * independent verifier, so what a developer sees is the same authority the Tutor uses.
 * These tests pin that the builder routes the request to the right verification kind and
 * reproduces the verifier's outcome verbatim, including FAILED and UNAVAILABLE.
 */
import assert from 'node:assert/strict';
import { traceCalculatorState } from '../src/services/developerTrace';

function main() {
  // No live expression means no trace at all -- never a fabricated placeholder.
  assert.equal(traceCalculatorState({}), null, 'an empty calculator state must not produce a trace');
  assert.equal(traceCalculatorState({ expression: '  ' }), null, 'a blank expression must not produce a trace');

  // A plain calculation is independently recomputed.
  const calculation = traceCalculatorState({ expression: '2+3', reportedResult: '5' });
  assert.ok(calculation, 'a calculation state must produce a trace');
  assert.equal(calculation.engine, 'calcora-deterministic', 'the trace names the deterministic engine');
  assert.equal(calculation.verification.state, 'VERIFIED', '2+3 = 5 must be independently VERIFIED');
  assert.equal(calculation.expression, '2+3', 'the trace records the expression');

  // A correct result cannot simply be asserted by the caller.
  const wrong = traceCalculatorState({ expression: '2+3', reportedResult: '6' });
  assert.ok(wrong);
  assert.notEqual(wrong.verification.state, 'VERIFIED', 'a wrong result must never be reported VERIFIED');

  // An equation is verified by substituting its roots.
  const equation = traceCalculatorState({ expression: '2x + 5 = 15', reportedResult: '5' });
  assert.ok(equation);
  assert.equal(equation.verification.state, 'VERIFIED', 'x = 5 satisfies 2x + 5 = 15 and must verify');
  const badRoot = traceCalculatorState({ expression: '2x + 5 = 15', reportedResult: '7' });
  assert.ok(badRoot);
  assert.notEqual(badRoot.verification.state, 'VERIFIED', 'a root that does not satisfy the equation must not verify');

  // When the engine could not evaluate the request, the trace says so -- it never invents
  // a result to look complete.
  const unevaluated = traceCalculatorState({ expression: '2+3', reportedResult: null, engineSucceeded: false });
  assert.ok(unevaluated);
  assert.equal(unevaluated.verification.state, 'UNAVAILABLE', 'an unevaluated engine must yield UNAVAILABLE, not VERIFIED');
  assert.equal(unevaluated.steps.length, 0, 'no derivation steps may be invented for an unevaluated request');

  // Different mathematics yields different reproducible ids.
  const a = traceCalculatorState({ expression: '2+3', reportedResult: '5' });
  const b = traceCalculatorState({ expression: '2+4', reportedResult: '6' });
  assert.ok(a && b);
  assert.notEqual(a.id, b.id, 'different problems must produce different trace ids');
  assert.match(a.id, /^calc-[0-9a-f]{16}$/, 'trace ids stay stable and greppable');

  console.log('PASS  an empty calculator state produces no trace');
  console.log('PASS  a correct calculation is independently VERIFIED');
  console.log('PASS  a wrong calculation is never reported VERIFIED');
  console.log('PASS  equations verify by substituting the root');
  console.log('PASS  an unevaluated engine yields UNAVAILABLE with no invented steps');
  console.log('PASS  distinct problems get distinct reproducible trace ids');
}

main();