/**
 * Math Agent — bounded planning, deterministic execution and independent verification.
 *
 * The Agent is the layer that turns a learner goal into a bounded sequence of
 * deterministic tool calls. Two properties are non-negotiable and are pinned here:
 *
 *   1. **Bounded.** Max steps, a wall-clock budget, an explicit tool allowlist, and a
 *      hard iteration ceiling. A planner that can recurse forever is a hang, not a
 *      feature.
 *   2. **Deterministically verified.** Every numeric claim is produced by the engine and
 *      then re-checked by an *independent* second computation. A mismatch is reported
 *      as FAIL and the Agent does not pick a winner. UNKNOWN means genuinely not
 *      checkable — it is never silently upgraded to PASS.
 */
import assert from 'node:assert/strict';
import {
  runMathAgent,
  MAX_AGENT_STEPS,
  ALLOWED_AGENT_TOOLS,
  type MathAgentResult,
} from '../src/services/mathAgent';

function check(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Math agent regression failed: ${message}`);
}

// ---------------------------------------------------------------------------
// 1. The tool allowlist is explicit and closed.
// ---------------------------------------------------------------------------
check(ALLOWED_AGENT_TOOLS.includes('calculate'), 'calculate is allowed');
check(ALLOWED_AGENT_TOOLS.includes('solveEquation'), 'solveEquation is allowed');
check(!ALLOWED_AGENT_TOOLS.some((tool) => /shell|exec|spawn|eval|file|network|fetch/i.test(tool)),
  'the allowlist contains no shell, exec, file or network tools');
check(MAX_AGENT_STEPS > 0 && MAX_AGENT_STEPS <= 16, `max steps must be a small positive bound, got ${MAX_AGENT_STEPS}`);

// ---------------------------------------------------------------------------
// 2. A simple arithmetic goal produces a verified deterministic result.
// ---------------------------------------------------------------------------
const arithmetic = await runMathAgent({ goal: 'Calculate 17 * 23' });
check(arithmetic.success, `arithmetic goal should succeed, got: ${arithmetic.error}`);
check(arithmetic.deterministic?.result === '391', `17*23 must be 391, got ${arithmetic.deterministic?.result}`);
check(arithmetic.verification.status === 'PASS', `independent check must pass, got ${arithmetic.verification.status} (${arithmetic.verification.reason})`);
check(arithmetic.verification.method !== 'none', 'a PASS must name the method that verified it');
check(arithmetic.steps.length > 0, 'the agent records its steps');
check(arithmetic.steps.every((step) => step.kind !== 'unknown'), 'every step has a declared kind');
check(arithmetic.iterations <= MAX_AGENT_STEPS, `agent respected its step ceiling, got ${arithmetic.iterations}`);

// ---------------------------------------------------------------------------
// 3. An equation goal is solved and independently verified.
// ---------------------------------------------------------------------------
const equation = await runMathAgent({ goal: 'Solve 2x + 4 = 10' });
check(equation.deterministic?.result === '3', `2x+4=10 must give 3, got ${equation.deterministic?.result}`);
check(equation.verification.status === 'PASS', `equation must verify, got ${equation.verification.status}`);

// ---------------------------------------------------------------------------
// 4. Substituting the solution back must actually satisfy the equation —
//    the verifier is a real check, not a tautology.
// ---------------------------------------------------------------------------
const substitution = await runMathAgent({
  goal: 'Solve 3x - 4 = 11',
  verify: 'substitute',
});
check(substitution.deterministic?.result === '5', `3x-4=11 must give 5, got ${substitution.deterministic?.result}`);
check(substitution.verification.status === 'PASS', `substitution check must pass, got ${substitution.verification.status}`);
check(/substitut/i.test(substitution.verification.method), `method should be substitution, got ${substitution.verification.method}`);

// A deliberately wrong verified result must be caught. This proves the verifier can fail.
// The injected stub returns a correctly shaped MathToolResult reporting a wrong root.
import { runMathAgentWithEngine } from '../src/services/mathAgent';
const mismatch = await runMathAgentWithEngine({
  goal: 'Solve 2x + 4 = 10',
  engine: {
    solveEquation: () => ({
      success: true,
      toolName: 'solveEquation',
      expression: '2x + 4 = 10',
      result: '7',
      steps: ['injected wrong root'],
    }) as never,
  },
});
check(mismatch.deterministic?.result === '7', `the injected value must be reported verbatim, got ${mismatch.deterministic?.result}`);
check(
  mismatch.verification.status === 'FAIL',
  `a root that does not satisfy the equation must FAIL, got ${mismatch.verification.status}`,
);
check(
  /does not satisfy|mismatch|not satisfy/i.test(mismatch.verification.reason),
  `FAIL must explain the mismatch, got: ${mismatch.verification.reason}`,
);
check(/x = 7/.test(mismatch.verification.reason), 'the failing root is named in the reason');
check(/18/.test(mismatch.verification.reason) && /10/.test(mismatch.verification.reason),
  `the reason shows the actual substituted values, got: ${mismatch.verification.reason}`);

// ---------------------------------------------------------------------------
// 5. UNKNOWN is a real outcome, not a disguised PASS.
// ---------------------------------------------------------------------------
const uncheckable = await runMathAgent({
  goal: 'Explain what a derivative is',
});
check(uncheckable.deterministic === null, 'a conceptual question produces no fabricated number');
check(
  ['UNKNOWN', 'FAIL'].includes(uncheckable.verification.status),
  `an uncheckable claim must be UNKNOWN, got ${uncheckable.verification.status}`,
);
check(uncheckable.verification.status !== 'PASS', 'a conceptual question must never report PASS');
check(uncheckable.success, 'a conceptual question is still answered');
check(uncheckable.explanation.length > 0, 'an explanation is produced for a conceptual question');

// ---------------------------------------------------------------------------
// 6. Unsupported goals fail honestly instead of hallucinating a result.
// ---------------------------------------------------------------------------
const nonsense = await runMathAgent({ goal: 'Who won the 1998 football world cup?' });
check(nonsense.deterministic === null, 'an off-topic goal produces no mathematical result');
check(
  /cannot|does not|unsupported|not a mathematical|not a calculation|out of scope|outside/i.test(nonsense.explanation),
  `an off-topic goal is declined honestly, got: ${nonsense.explanation}`,
);
check(
  !/\b\d+\b/.test(nonsense.explanation),
  `a declined goal invents no number, got: ${nonsense.explanation}`,
);

// ---------------------------------------------------------------------------
// 7. The agent is bounded under adversarial input.
// ---------------------------------------------------------------------------
const loops = await runMathAgent({ goal: 'solve ' + '('.repeat(400) });
check(loops.iterations <= MAX_AGENT_STEPS, 'adversarial input cannot exceed the step ceiling');
check(Array.isArray(loops.steps), 'adversarial input still returns a well-formed result');

const longGoal = await runMathAgent({ goal: 'x'.repeat(50_000) });
check(longGoal.iterations <= MAX_AGENT_STEPS, 'an oversized goal cannot exceed the step ceiling');
check(longGoal.explanation.length >= 0, 'an oversized goal still returns a result');

// ---------------------------------------------------------------------------
// 8. A deterministic failure is reported as a failure, not smoothed over.
// ---------------------------------------------------------------------------
const divisionByZero = await runMathAgent({ goal: 'Calculate 1/0' });
check(divisionByZero.deterministic === null, 'an undefined calculation yields no result value');
check(
  divisionByZero.verification.status !== 'PASS',
  'an undefined calculation must never report PASS',
);
check(
  /zero|undefined|domain|not defined|error|cannot/i.test(`${divisionByZero.explanation} ${divisionByZero.verification.reason}`),
  `a domain failure is explained, got: ${divisionByZero.explanation}`,
);

// ---------------------------------------------------------------------------
// 9. The agent may propose targeted practice, and it must be corpus-grounded.
// ---------------------------------------------------------------------------
const withPractice = await runMathAgent({ goal: 'Solve x^2 - 5x + 6 = 0', includePractice: true });
check(withPractice.practice && withPractice.practice.items.length > 0, 'practice is generated when requested');
if (withPractice.practice) {
  const concept = withPractice.practice.targetConcepts[0];
  check(Boolean(concept), 'practice names a target concept');
  check(
    withPractice.practice.items.every((item) => item.source === 'knowledge-corpus' || item.source === 'generated'),
    'every proposed practice item declares its source',
  );
  check(
    withPractice.practice.items.every((item) => !item.source || item.evidenceId !== undefined),
    'corpus-grounded practice carries an evidence id',
  );
}

// ---------------------------------------------------------------------------
// 10. Result shape is stable for callers.
// ---------------------------------------------------------------------------
const shape: MathAgentResult = arithmetic;
for (const key of ['success', 'goal', 'steps', 'deterministic', 'verification', 'explanation', 'iterations'] as const) {
  check(key in shape, `result exposes "${key}"`);
}
check(Array.isArray(shape.steps), 'steps is an array');

// ---------------------------------------------------------------------------
// 11. Derivative goals are computed SYMBOLICALLY and independently spot-checked.
// ---------------------------------------------------------------------------
// The historical behaviour evaluated the expression as a value or declined the
// goal outright. A derivative must produce f'(x), verify it against a central
// difference (a different algorithm from the symbolic derivation), and never
// render the false equation "x^2 = 2x".
const derivative = await runMathAgent({ goal: 'Find the derivative of x^2' });
check(
  derivative.deterministic?.tool === 'derivative',
  `derivative goals must use the derivative tool, got ${String(derivative.deterministic?.tool)} (success=${derivative.success}, explanation=${derivative.explanation.slice(0, 120)})`,
);
check(derivative.deterministic?.result === '2x', `d/dx(x^2) must be 2x, got ${String(derivative.deterministic?.result)}`);
check(
  derivative.verification.status === 'PASS',
  `the symbolic derivative must pass the spot-check, got ${derivative.verification.status} (${derivative.verification.reason})`,
);
check(
  derivative.verification.method === 'spot-check',
  `the derivative check must be a spot-check, got ${derivative.verification.method}`,
);
check(
  /d\/dx\(x\^2\) = 2x/.test(derivative.explanation),
  `the explanation must render d/dx(x^2) = 2x, got: ${derivative.explanation.split('\n')[0]}`,
);
check(!/x\^2 = 2x/.test(derivative.explanation), 'the false equation "x^2 = 2x" must never be shown');

const ddx = await runMathAgent({ goal: 'd/dx(x^3 + 2x)' });
check(ddx.deterministic?.result === '3x^2 + 2', `d/dx(x^3 + 2x) must be 3x^2 + 2, got ${String(ddx.deterministic?.result)}`);
check(
  ddx.verification.status === 'PASS',
  `d/dx(x^3 + 2x) must verify, got ${ddx.verification.status} (${ddx.verification.reason})`,
);

// An unsupported form must decline without claiming a derivative function: a
// labelled point estimate is never presented as f'(x).
const absDerivative = await runMathAgent({ goal: 'Find the derivative of abs(x)' });
check(absDerivative.deterministic === null, 'an unsupported derivative must not produce a claimed derivative');
check(absDerivative.verification.status !== 'PASS', 'an unsupported derivative must never report PASS');
check(
  /abs|not supported|symbolic/i.test(absDerivative.explanation),
  `the unsupported form is explained honestly, got: ${absDerivative.explanation.slice(0, 200)}`,
);

// The verifier must be able to FAIL: an injected wrong derivative is caught.
const wrongDerivative = await runMathAgentWithEngine({
  goal: 'Find the derivative of x^2',
  engine: {
    derivative: () => ({
      success: true,
      toolName: 'derivative',
      expression: 'x^2',
      result: '3x',
      metadata: { symbolicSupported: true },
      steps: ['injected wrong derivative'],
    }) as never,
  },
});
check(wrongDerivative.deterministic?.result === '3x', 'the injected derivative is reported verbatim');
check(
  wrongDerivative.verification.status === 'FAIL',
  `a wrong derivative must FAIL the spot-check, got ${wrongDerivative.verification.status} (${wrongDerivative.verification.reason})`,
);
check(
  /disagree|vs|mismatch/i.test(wrongDerivative.verification.reason),
  `FAIL must explain the disagreement, got: ${wrongDerivative.verification.reason}`,
);

console.log('Math agent tests passed');
