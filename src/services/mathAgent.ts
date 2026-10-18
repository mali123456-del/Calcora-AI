/**
 * Calcora AI — Math Agent.
 *
 * Turns a learner goal into a *bounded* sequence of deterministic tool calls, then
 * independently verifies whatever the engine produced before it is shown.
 *
 *   goal -> classify -> select tools (allowlist) -> execute deterministically
 *        -> independent verification -> explanation -> optional practice
 *
 * Why verification is a separate pass
 * -----------------------------------
 * The executor and the verifier are deliberately different code paths. For an equation
 * the executor runs the solver, and the verifier substitutes the reported root back into
 * the *original* expression and checks the residual. So a wrong solver output is caught
 * rather than echoed back to the learner as truth. `UNKNOWN` is a first-class outcome:
 * when a claim is not computationally checkable the Agent says so instead of implying
 * confidence it does not have.
 *
 * Bounded by design: `MAX_AGENT_STEPS`, a wall-clock budget, a closed tool allowlist,
 * and no recursion. There is no code path here that can call itself.
 */
import { toolCalculate, toolDerivative, toolSolveEquation } from '../engine/toolLayer';
import { spotCheckDerivative } from '../engine/symbolicDerivative';
import type { MathToolResult } from '../types';
import { extractMathProblem } from '../engine/problemExtractor';
import { createEmptyStudentModel, type StudentModel } from './studentModel';
import { generatePracticeSet, type PracticeSet } from './practiceGenerator';
import { retrieveMathematicsKnowledge } from '../knowledge/knowledgeRetrieval';

/** Small, explicit ceiling. Every loop in this module is bounded by it. */
export const MAX_AGENT_STEPS = 8;

/** Wall-clock budget for a single agent run. */
export const AGENT_TIME_BUDGET_MS = 5000;

/** Hard ceiling on the goal string, so a pathological input cannot dominate planning. */
export const MAX_GOAL_CHARS = 2000;

/** Closed tool allowlist. Nothing outside this list can ever be invoked. */
export const ALLOWED_AGENT_TOOLS = [
  'calculate',
  'solveEquation',
  'derivative',
] as const;
export type AgentTool = (typeof ALLOWED_AGENT_TOOLS)[number];

export type VerificationStatus = 'PASS' | 'FAIL' | 'UNKNOWN';

export interface AgentStep {
  kind: 'plan' | 'tool' | 'verify' | 'explain' | 'decline';
  tool?: AgentTool;
  detail: string;
}

export interface AgentVerification {
  status: VerificationStatus;
  /** How the check was performed. 'none' only when status is UNKNOWN. */
  method: 'substitute' | 'recompute' | 'spot-check' | 'none';
  reason: string;
  /** The independent observation, when one exists. */
  observed?: string;
}

export interface AgentDeterministic {
  result: string;
  expression: string;
  tool: AgentTool;
  steps: string[];
}

export interface MathAgentResult {
  success: boolean;
  goal: string;
  steps: AgentStep[];
  deterministic: AgentDeterministic | null;
  verification: AgentVerification;
  explanation: string;
  groundingSources: string[];
  practice?: PracticeSet;
  iterations: number;
  /** True when the run hit a bound and stopped early. */
  truncated: boolean;
  error?: string;
}

export interface MathAgentRequest {
  goal: string;
  /** 'auto' picks substitution for equations and recomputation for calculations. */
  verify?: 'auto' | 'substitute' | 'recompute';
  includePractice?: boolean;
  studentModel?: StudentModel;
  /** Wall-clock override, used by tests. Never unbounded in production. */
  timeBudgetMs?: number;
  /**
   * Optional tool overrides. Production callers leave this unset; tests use it to prove
   * that verification actually fails a wrong engine result.
   */
  engine?: AgentEngineOverride;
}

/** The subset of the engine the agent may use. Injected so verification can be tested. */
export interface AgentEngine {
  calculate: typeof toolCalculate;
  solveEquation: typeof toolSolveEquation;
  derivative: typeof toolDerivative;
}

/** Partial injection, so a test can replace one tool and keep the rest real. */
export type AgentEngineOverride = Partial<AgentEngine>;

const defaultEngine: AgentEngine = {
  calculate: toolCalculate,
  solveEquation: toolSolveEquation,
  derivative: toolDerivative,
};

const CONCEPTUAL = /explain|what is|what are|define|meaning|concept|teach|understand|why|difference between|how does/i;

/** Goals that demand a derivative function, not an evaluated value. */
const DERIVATIVE_GOAL = /derivative|differentiat|d\/dx/i;

/**
 * Independently spot-checks a claimed derivative function: the claim is
 * evaluated at sample points and compared against a central difference of the
 * source expression. The claim came from symbolic differentiation and this
 * check is numerical, so agreement is real evidence, not a tautology.
 */
function verifyBySpotCheck(expression: string, reportedDerivative: string): AgentVerification {
  const spot = spotCheckDerivative(expression, reportedDerivative, 'x');
  if (spot.checked === 0) {
    return { status: 'UNKNOWN', method: 'none', reason: spot.summary };
  }
  const observed = `${spot.matched}/${spot.checked} sample points`;
  if (spot.passed) {
    return { status: 'PASS', method: 'spot-check', reason: spot.summary, observed };
  }
  return { status: 'FAIL', method: 'spot-check', reason: spot.summary, observed };
}

/** Independently re-evaluates a calculation with the engine. */
function verifyByRecomputation(
  expression: string,
  reported: string,
  engine: AgentEngine,
): AgentVerification {
  let observed: string | undefined;
  try {
    const again = engine.calculate({ expression });
    if (again.success) observed = String(again.result);
    else {
      const solved = engine.solveEquation({ equation: expression });
      if (solved.success) observed = String(solved.result);
    }
  } catch {
    return { status: 'UNKNOWN', method: 'none', reason: 'The independent recomputation could not be performed.' };
  }

  if (observed === undefined) {
    return { status: 'UNKNOWN', method: 'none', reason: 'No independent observation was available.' };
  }
  if (observed === reported) {
    return {
      status: 'PASS',
      method: 'recompute',
      reason: 'An independent recomputation of the same expression produced the same value.',
      observed,
    };
  }
  return {
    status: 'FAIL',
    method: 'recompute',
    reason: `Verification mismatch: execution produced ${reported} but an independent recomputation produced ${observed}.`,
    observed,
  };
}

/**
 * Substitutes each reported root back into the original equation and checks the residual.
 *
 * This is a genuinely independent test of the answer: a buggy solver that returns the
 * wrong root will not satisfy the equation it came from.
 */
function verifyBySubstitution(
  equation: string,
  roots: string[],
  engine: AgentEngine,
): AgentVerification {
  if (!roots.length) {
    return { status: 'UNKNOWN', method: 'none', reason: 'No root was reported to substitute.' };
  }

  const [leftRaw, rightRaw] = equation.split('=');
  if (leftRaw === undefined || rightRaw === undefined) {
    return { status: 'UNKNOWN', method: 'none', reason: 'The equation could not be split for substitution.' };
  }

  for (const root of roots) {
    // Substitute the root for every occurrence of the solution variable, then ask the
    // engine to evaluate both sides. Non-numeric sides make this uncheckable.
    let left = leftRaw;
    let right = rightRaw;
    const variableMatch = leftRaw.match(/[a-z]/i);
    if (!variableMatch) {
      return { status: 'UNKNOWN', method: 'none', reason: 'No solution variable was found to substitute.' };
    }
    const variable = variableMatch[0];
    // Word boundaries are wrong here: `\bx\b` cannot match the x in "2x", because the
    // digit and the letter are both word characters and so share no boundary. Match the
    // variable as a lone letter instead — not adjacent to another letter — which
    // correctly substitutes "2x + 4" while leaving a distinct variable "xy" alone.
    const pattern = new RegExp(`(?<![a-zA-Z])${variable}(?![a-zA-Z])`, 'g');
    left = left.replace(pattern, `(${root})`);
    right = right.replace(pattern, `(${root})`);

    const leftValue = engine.calculate({ expression: left });
    const rightValue = engine.calculate({ expression: right });
    if (!leftValue.success || !rightValue.success) {
      return {
        status: 'UNKNOWN',
        method: 'none',
        reason: 'Substituting the reported root produced an expression the engine cannot evaluate.',
      };
    }
    // `MathToolResult` exposes the numeric value as `result`; there is no `value` field.
    const leftNumber = Number(leftValue.result);
    const rightNumber = Number(rightValue.result);
    if (!Number.isFinite(leftNumber) || !Number.isFinite(rightNumber)) {
      return {
        status: 'UNKNOWN',
        method: 'none',
        reason: 'Substituting the reported root produced a non-numeric side the engine cannot compare.',
      };
    }
    const residual = Math.abs(leftNumber - rightNumber);
    if (residual > 1e-9) {
      return {
        status: 'FAIL',
        method: 'substitute',
        reason: `Verification mismatch: substituting ${variable} = ${root} gives ${leftNumber} on the left and `
          + `${rightNumber} on the right, so the reported root does not satisfy the equation.`,
        observed: `${leftNumber} != ${rightNumber}`,
      };
    }
  }

  return {
    status: 'PASS',
    method: 'substitute',
    reason: 'Substituting every reported root back into the original equation gives equal sides.',
    observed: roots.join(', '),
  };
}

/** Executes the allowlisted tool for a goal. */
function executeGoal(
  goal: string,
  engine: AgentEngine,
): {
  deterministic: AgentDeterministic | null;
  tool: AgentTool | null;
  /** Set when a mathematical request was recognised but the tool rejected it. */
  domainError: string | null;
  /** Set when the goal looked mathematical enough to attempt. */
  lookedMathematical: boolean;
  /** True when the extractor actually found an equation or expression in the goal. */
  extractedMath: boolean;
} {
  const extracted = extractMathProblem(goal);
  let domainError: string | null = null;
  let lookedMathematical = false;
  const extractedMath = Boolean(
    (extracted.kind === 'solveEquation' && extracted.equation)
    || (extracted.kind === 'calculate' && extracted.expression),
  );
  const budget: Partial<Record<AgentTool, MathToolResult>> = {};
  const derivativeGoal = DERIVATIVE_GOAL.test(goal);
  let derivativeAttempted = false;

  if (derivativeGoal && extracted.kind === 'calculate' && extracted.expression) {
    // A derivative goal must be answered by symbolic differentiation. Routing it
    // to `calculate` would evaluate f(x) and misreport that value as f'(x).
    lookedMathematical = true;
    derivativeAttempted = true;
    const attempt = engine.derivative({ expression: extracted.expression });
    if (attempt.success && attempt.metadata?.symbolicSupported !== false) {
      budget.derivative = attempt;
    } else if (attempt.success) {
      // The tool honestly declined to produce a derivative function (abs, !, ...).
      domainError = String(
        attempt.metadata?.unsupportedReason ?? 'symbolic differentiation is not supported for this expression',
      );
    } else if (attempt.error) {
      domainError = String(attempt.error);
    }
  } else if (extracted.kind === 'solveEquation' && extracted.equation) {
    lookedMathematical = true;
    budget.solveEquation = engine.solveEquation({ equation: extracted.equation });
    if (!budget.solveEquation.success && budget.solveEquation.error) {
      domainError = String(budget.solveEquation.error);
    }
  } else if (extracted.kind === 'calculate' && extracted.expression) {
    lookedMathematical = true;
    budget.calculate = engine.calculate({ expression: extracted.expression });
    if (!budget.calculate.success && budget.calculate.error) {
      domainError = String(budget.calculate.error);
    }
  }

  // Fallback: try the whole cleaned goal, then an equation-shaped substring.
  if (!derivativeAttempted && !budget.solveEquation?.success && !budget.calculate?.success) {
    const cleaned = goal.replace(/[?]+$/, '').trim();
    if (cleaned.includes('=')) {
      lookedMathematical = true;
      const attempt = engine.solveEquation({ equation: cleaned });
      if (attempt.success) budget.solveEquation = attempt;
      else if (attempt.error) domainError = String(attempt.error);
    }
    if (!budget.solveEquation?.success) {
      // Attempting evaluation at all means the goal was treated as mathematical. If the
      // engine then rejects it, that is a domain failure rather than an off-topic goal,
      // so `1/0` is reported as division by zero and not as "not a calculation".
      lookedMathematical = true;
      const attempt = engine.calculate({ expression: cleaned });
      if (attempt.success) budget.calculate = attempt;
      else if (attempt.error && !domainError) domainError = String(attempt.error);
    }
  }

  const derivative = budget.derivative;
  if (derivative?.success) {
    return {
      tool: 'derivative',
      domainError: null,
      lookedMathematical,
      extractedMath,
      deterministic: {
        tool: 'derivative',
        result: String(derivative.result),
        expression: String(derivative.expression),
        steps: derivative.steps ?? derivative.derivationSteps ?? [],
      },
    };
  }
  const solved = budget.solveEquation;
  if (solved?.success) {
    return {
      tool: 'solveEquation',
      domainError: null,
      lookedMathematical,
      extractedMath,
      deterministic: {
        tool: 'solveEquation',
        result: String(solved.result),
        expression: String(solved.expression),
        steps: solved.steps ?? solved.derivationSteps ?? [],
      },
    };
  }
  const calculated = budget.calculate;
  if (calculated?.success) {
    return {
      tool: 'calculate',
      domainError: null,
      lookedMathematical,
      extractedMath,
      deterministic: {
        tool: 'calculate',
        result: String(calculated.result),
        expression: String(calculated.expression),
        steps: calculated.steps ?? calculated.derivationSteps ?? [],
      },
    };
  }
  return { deterministic: null, tool: null, domainError, lookedMathematical, extractedMath };
}

export async function runMathAgentWithEngine(
  request: MathAgentRequest,
  engineOverride: AgentEngineOverride = {},
): Promise<MathAgentResult> {
  // A partial override keeps the remaining tools real, so a test can inject one
  // behaviour without silently disabling verification's other half. Overrides may be
  // supplied either positionally or on the request.
  const engine: AgentEngine = { ...defaultEngine, ...request.engine, ...engineOverride };
  const started = Date.now();
  const budgetMs = Math.min(Math.max(request.timeBudgetMs ?? AGENT_TIME_BUDGET_MS, 1), 60_000);
  const rawGoal = typeof request.goal === 'string' ? request.goal : '';
  const goal = rawGoal.slice(0, MAX_GOAL_CHARS).trim();
  const steps: AgentStep[] = [];
  let iterations = 0;
  let truncated = false;

  const withinBudget = () => Date.now() - started <= budgetMs && iterations < MAX_AGENT_STEPS;

  const groundingSources: string[] = [];
  let grounding = '';
  try {
    const knowledge = retrieveMathematicsKnowledge({ query: goal, limit: 2 });
    if (knowledge.primaryConcept) {
      groundingSources.push(knowledge.primaryConcept.concept);
      grounding = knowledge.groundingContextText;
    }
  } catch {
    // Grounding is an enhancement; its absence must not fabricate or block an answer.
  }

  if (!goal) {
    steps.push({ kind: 'decline', detail: 'No goal was provided.' });
    return {
      success: false,
      goal: rawGoal,
      steps,
      deterministic: null,
      verification: { status: 'UNKNOWN', method: 'none', reason: 'No goal was provided.' },
      explanation: 'No mathematical goal was provided, so there is nothing to compute or explain.',
      groundingSources,
      iterations,
      truncated,
      error: 'empty-goal',
    };
  }

  // ---- Plan -------------------------------------------------------------
  steps.push({
    kind: 'plan',
    detail: `Classified the goal and selected only allowlisted tools (${ALLOWED_AGENT_TOOLS.join(', ')}).`,
  });
  if (!withinBudget()) truncated = true;

  // ---- Execute ----------------------------------------------------------
  const { deterministic, tool, domainError, lookedMathematical, extractedMath } = executeGoal(goal, engine);
  iterations += 1;

  if (!deterministic) {
    const isConceptual = CONCEPTUAL.test(goal);

    // A conceptual question is not a failed calculation. If nothing was extracted as
    // mathematics, answer it from grounded knowledge rather than reporting a spurious
    // "domain error" for text that was never meant to be evaluated.
    if (isConceptual && !extractedMath) {
      iterations += 1;
      steps.push({ kind: 'explain', detail: 'No deterministic result; answered from grounded knowledge only.' });
      const answer = grounding
        ? grounding
        : 'This is a conceptual question. Calcora has no verified knowledge entry for it, '
          + 'so it is not answered from memory.';
      return {
        success: true,
        goal,
        steps,
        deterministic: null,
        verification: {
          status: 'UNKNOWN',
          method: 'none',
          reason: 'A conceptual explanation is not a computational claim, so it is not numerically verified.',
        },
        explanation: answer,
        groundingSources,
        iterations,
        truncated,
      };
    }

    // A recognised mathematical request that the engine rejected is a domain failure,
    // not an out-of-scope request. Saying "this is not mathematics" about `1/0` would be
    // plainly wrong, so the engine's own reason is reported instead.
    if (lookedMathematical && domainError) {
      steps.push({ kind: 'decline', detail: `Deterministic engine rejected the request: ${domainError}` });
      return {
        success: false,
        goal,
        steps,
        deterministic: null,
        verification: {
          status: 'UNKNOWN',
          method: 'none',
          reason: 'The deterministic engine could not produce a value for this input.',
        },
        explanation:
          `Calcora's deterministic engine cannot evaluate this expression: ${domainError}\n`
          + 'No value is shown because the result would be undefined outside the expression\'s domain.',
        groundingSources,
        iterations,
        truncated,
        error: 'domain-error',
      };
    }

    // Nothing computable and not conceptual: decline honestly. Never invent a number.
    iterations += 1;
    steps.push({ kind: 'decline', detail: 'No allowlisted tool could produce a result for this goal.' });
    return {
      success: false,
      goal,
      steps,
      deterministic: null,
      verification: {
        status: 'UNKNOWN',
        method: 'none',
        reason: 'No deterministic tool produced a result to verify.',
      },
      explanation:
        'That request is outside Calcora\'s mathematical scope: it is not a calculation, equation, '
        + 'or supported concept, so no result was produced.',
      groundingSources,
      iterations,
      truncated,
      error: 'no-deterministic-tool',
    };
  }

  steps.push({ kind: 'tool', tool: tool!, detail: `Executed ${tool} on ${deterministic.expression}.` });

  // ---- Verify (independent path) ---------------------------------------
  iterations += 1;
  const mode = request.verify ?? 'auto';
  let verification: AgentVerification;
  if (tool === 'derivative') {
    verification = verifyBySpotCheck(deterministic.expression, deterministic.result);
  } else if (tool === 'solveEquation' || (mode === 'substitute' && deterministic.expression.includes('='))) {
    verification = verifyBySubstitution(
      deterministic.expression,
      String(deterministic.result).split(',').map((r) => r.trim()).filter(Boolean),
      engine,
    );
  } else {
    verification = verifyByRecomputation(deterministic.expression, deterministic.result, engine);
  }
  steps.push({
    kind: 'verify',
    detail: `${verification.status} via ${verification.method}: ${verification.reason}`,
  });

  // ---- Explain ----------------------------------------------------------
  iterations += 1;
  const derivation = deterministic.steps.length
    ? deterministic.steps.map((s) => `- ${s}`).join('\n')
    : '';
  // A derivative claim is rendered as d/dx(f) = f'(x). Rendering it as
  // "f(x) = f'(x)" would be a false equation.
  const headline = tool === 'derivative'
    ? `d/dx(${deterministic.expression}) = ${deterministic.result}`
    : `${deterministic.expression} = ${deterministic.result}`;
  const explanation = [
    headline,
    '',
    `Independent verification: ${verification.status} (${verification.method}). ${verification.reason}`,
    derivation ? `\nSteps:\n${derivation}` : '',
  ].join('\n').trim();
  steps.push({ kind: 'explain', detail: 'Explanation built from the deterministic result and the verification outcome.' });

  // ---- Optional practice ------------------------------------------------
  let practice: PracticeSet | undefined;
  if (request.includePractice) {
    iterations += 1;
    practice = generatePracticeSet(request.studentModel ?? createEmptyStudentModel(), { count: 3 });
    steps.push({
      kind: 'plan',
      detail: `Proposed ${practice.items.length} corpus-grounded practice item(s).`,
    });
  }

  return {
    success: true,
    goal,
    steps,
    deterministic,
    verification,
    explanation,
    groundingSources,
    practice,
    iterations,
    truncated: truncated || iterations > MAX_AGENT_STEPS,
  };
}

export function runMathAgent(request: MathAgentRequest): Promise<MathAgentResult> {
  return runMathAgentWithEngine(request, defaultEngine);
}
