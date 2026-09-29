import { calculateExpression } from './mathEngine';
import { solveEquation } from './equationSolver';
import { solveSystemFromString } from './algebraEngine';
import { evaluateLimit } from './calculusEngine';
import { createClient } from '@supabase/supabase-js';
import { numericalDerivative, simpsonsRuleDefiniteIntegral } from './calculusEngine';
import { computeStatistics } from './statisticsEngine';
import { determinantMatrix, multiplyMatrices } from './matrixEngine';
import { convertUnits } from './unitConverter';
import type { MathToolResult, MathVerificationBadge } from '../types';
export type { MathToolResult, MathVerificationBadge };

const MAX_EXPRESSION = 500;
const MAX_MATRIX_DIM = 12;
const MAX_DATA_POINTS = 10000;

export type MathToolName =
  | 'calculate' | 'solveEquation' | 'solveSystem' | 'derivative'
  | 'integrate' | 'limit' | 'statistics' | 'matrix' | 'unitConversion' | 'retrieveKnowledge';

export interface ToolRequest {
  tool: MathToolName;
  args: Record<string, unknown>;
}

function badge(message: string, verified = true): MathVerificationBadge {
  return {
    isVerified: verified,
    verificationMethod: verified ? 'deterministic-engine' : 'not-deterministically-verified',
    verificationMessage: message,
    timestamp: new Date().toISOString(),
    confidence: verified ? 1 : 0,
  };
}

function result(
  toolName: string,
  expression: string,
  value: string,
  steps: string[] = [],
  extra: Partial<MathToolResult> = {},
): MathToolResult {
  return {
    success: true,
    toolName,
    expression,
    result: value,
    exactResult: value,
    derivationSteps: steps,
    domain: null,
    domainRestrictions: [],
    verificationBadge: badge('Deterministically verified.'),
    executionTimeMs: 0,
    ...extra,
    steps,
    restrictions: extra.domainRestrictions ?? [],
    verification: {
      isVerified: extra.verificationBadge?.isVerified ?? true,
      method: extra.verificationBadge?.verificationMethod ?? 'deterministic-engine',
      message: extra.verificationBadge?.verificationMessage ?? 'Deterministically verified.',
    },
  };
}

function fail(toolName: string, expression: string, error: string): MathToolResult {
  return {
    success: false,
    toolName,
    expression,
    result: '',
    exactResult: '',
    derivationSteps: [],
    domain: null,
    domainRestrictions: [],
    verificationBadge: badge('Not verified because the deterministic tool rejected the request.', false),
    error,
    steps: [],
    restrictions: [],
    verification: {
      isVerified: false,
      method: 'not-deterministically-verified',
      message: 'Not verified.',
    },
  };
}

function str(v: unknown, name: string): string {
  if (typeof v !== 'string' || !v.trim() || v.length > MAX_EXPRESSION) throw new Error(`${name} must be a non-empty string within the input limit`);
  return v.trim();
}
function num(v: unknown, name: string, min = -1e12, max = 1e12): number {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max) throw new Error(`${name} must be a finite number within safe bounds`);
  return v;
}

export function toolCalculate(args: Record<string, unknown>): MathToolResult {
  const started = Date.now();
  try {
    const expression = str(args.expression, 'expression');
    const angleMode = args.angleMode === 'RAD' || args.angleMode === 'GRAD' ? args.angleMode : 'DEG';
    const r = calculateExpression(expression, angleMode);
    if (r.error) return fail('calculate', expression, r.error);
    const value = String(r.value);
    const steps = [`${expression} = ${r.display || value}`];
    return result('calculate', expression, value, steps, {
      exactResult: r.exactFraction ?? value,
      approximateResult: value,
      executionTimeMs: Date.now() - started,
    });
  } catch (e) { return fail('calculate', String(args.expression ?? ''), e instanceof Error ? e.message : 'Calculation failed'); }
}

export function toolSolveEquation(args: Record<string, unknown>): MathToolResult {
  const started = Date.now();
  try {
    const equation = str(args.equation, 'equation');
    const r = solveEquation(equation);
    if (!r.isValid || r.error) return fail('solveEquation', equation, r.error ?? 'Equation could not be solved');
    const roots = r.solutions.map(String).join(', ');
    return result('solveEquation', equation, roots, r.steps, {
      approximateResult: roots,
      domainRestrictions: r.discriminant !== undefined && r.discriminant < 0 ? ['No real roots'] : [],
      executionTimeMs: Date.now() - started,
      metadata: { type: r.type, variables: r.variables, discriminant: r.discriminant },
    });
  } catch (e) { return fail('solveEquation', String(args.equation ?? ''), e instanceof Error ? e.message : 'Equation solving failed'); }
}

export async function toolRetrieveKnowledge(args: Record<string, unknown>): Promise<MathToolResult> {
  try {
    const query = str(args.query, 'query');
    const limit = Math.min(Math.max(typeof args.limit === 'number' ? Math.floor(args.limit) : 8, 1), 20);
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) return fail('retrieveKnowledge', query, 'Supabase knowledge retrieval is not configured');
    const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await supabase.rpc('search_math_knowledge_text', { search_query: query, result_limit: limit });
    if (error) return fail('retrieveKnowledge', query, 'Knowledge retrieval failed');
    const rows = Array.isArray(data) ? data : [];
    const payload = rows.map((row: any) => ({ knowledgeId: row.knowledge_id, concept: row.concept, topic: row.topic, definition: row.definition, formulas: row.formulas, examples: row.examples, commonMistakes: row.common_mistakes, rank: row.rank }));
    return result('retrieveKnowledge', query, JSON.stringify(payload), [`Retrieved ${rows.length} verified knowledge entries from Calcora's mathematical corpus.`], { metadata: { count: rows.length, matches: payload } });
  } catch (e) { return fail('retrieveKnowledge', String(args.query ?? ''), e instanceof Error ? e.message : 'Knowledge retrieval failed'); }
}

export function toolDerivative(args: Record<string, unknown>): MathToolResult {
  const started = Date.now();
  try {
    const expression = str(args.expression ?? args.fnExpr, 'expression');
    const x = num(args.x ?? 0, 'x', -1e6, 1e6);
    const r = numericalDerivative(expression, x, args.order === 2 ? 2 : 1);
    return result('derivative', expression, String(r.value), r.steps, { approximateResult: String(r.value), executionTimeMs: Date.now() - started, metadata: { tangentLine: r.tangentLine } });
  } catch (e) { return fail('derivative', String(args.expression ?? args.fnExpr ?? ''), e instanceof Error ? e.message : 'Derivative failed'); }
}

export function toolIntegrate(args: Record<string, unknown>): MathToolResult {
  const started = Date.now();
  try {
    const fnExpr = str(args.fnExpr ?? args.expression, 'fnExpr');
    const a = num(args.a, 'a', -1e6, 1e6);
    const b = num(args.b, 'b', -1e6, 1e6);
    if (a === b) return result('integrate', fnExpr, '0', ['The integration interval has zero width.'], { executionTimeMs: Date.now() - started });
    if (Math.abs(b - a) > 1e6) return fail('integrate', fnExpr, 'Integration interval is too large');
    const r = simpsonsRuleDefiniteIntegral(fnExpr, a, b);
    return result('integrate', `∫[${a},${b}] ${fnExpr} dx`, String(r), [`Evaluate ${fnExpr} on [${a}, ${b}]`, `Composite Simpson's rule ≈ ${r}`], { approximateResult: String(r), executionTimeMs: Date.now() - started });
  } catch (e) { return fail('integrate', String(args.fnExpr ?? args.expression ?? ''), e instanceof Error ? e.message : 'Integration failed'); }
}

export function toolStatistics(args: Record<string, unknown>): MathToolResult {
  try {
    const data = args.data;
    if (!Array.isArray(data) || data.length === 0 || data.length > MAX_DATA_POINTS || !data.every(v => typeof v === 'number' && Number.isFinite(v))) {
      return fail('statistics', 'dataset', 'data must contain finite numbers within the dataset limit');
    }
    const r = computeStatistics(data as number[]);
    return result('statistics', `[${data.join(', ')}]`, JSON.stringify({ mean:r.mean, median:r.median, mode:r.mode, varianceSample:r.varianceSample, variancePopulation:r.variancePopulation, stdDevSample:r.stdDevSample, stdDevPopulation:r.stdDevPopulation, iqr:r.iqr }), [
      `Count = ${r.count}`, `Mean = ${r.mean}`, `Median = ${r.median}`, `IQR = ${r.iqr}`
    ], { executionTimeMs: 0, metadata: r as unknown as Record<string, unknown> });
  } catch (e) { return fail('statistics', 'dataset', e instanceof Error ? e.message : 'Statistics failed'); }
}

export function toolMatrix(args: Record<string, unknown>): MathToolResult {
  try {
    const operation = str(args.operation, 'operation');
    const a = args.a;
    if (!Array.isArray(a) || a.length === 0 || a.length > MAX_MATRIX_DIM || !a.every(row => Array.isArray(row) && row.length > 0 && row.length <= MAX_MATRIX_DIM && row.every(v => typeof v === 'number' && Number.isFinite(v)))) {
      return fail('matrix', operation, 'Matrix dimensions or values are invalid');
    }
    const A = a as number[][];
    if (operation === 'determinant') {
      const value = determinantMatrix(A);
      return result('matrix', 'det(A)', String(value), [`det(A) = ${value}`]);
    }
    if (operation === 'multiply') {
      const b = args.b;
      if (!Array.isArray(b)) return fail('matrix', operation, 'Matrix B is required');
      const B = b as number[][];
      const value = multiplyMatrices(A, B);
      return result('matrix', 'A × B', JSON.stringify(value), ['Validate dimensions', 'Multiply corresponding rows and columns']);
    }
    return fail('matrix', operation, 'Unsupported matrix operation');
  } catch (e) { return fail('matrix', String(args.operation ?? ''), e instanceof Error ? e.message : 'Matrix operation failed'); }
}

export function toolUnitConversion(args: Record<string, unknown>): MathToolResult {
  try {
    const value = num(args.value, 'value', -1e12, 1e12);
    const from = str(args.from, 'from');
    const to = str(args.to, 'to');
    const category = str(args.category, 'category') as any;
    const r = convertUnits(category, from, to, value);
    const converted = r.result;
    if (!Number.isFinite(converted)) return fail('unitConversion', `${value} ${from} → ${to}`, 'Conversion failed');
    return result('unitConversion', `${value} ${from} → ${to}`, String(converted), [r.formula, `${value} ${from} = ${converted} ${to}`], { formula: r.formula });
  } catch (e) { return fail('unitConversion', '', e instanceof Error ? e.message : 'Unit conversion failed'); }
}

export async function executeMathTool(name: MathToolName, args: Record<string, unknown>): Promise<MathToolResult> {
  switch (name) {
    case 'calculate': return toolCalculate(args);
    case 'solveEquation': return toolSolveEquation(args);
    case 'derivative': return toolDerivative(args);
    case 'integrate': return toolIntegrate(args);
    case 'statistics': return toolStatistics(args);
    case 'matrix': return toolMatrix(args);
    case 'unitConversion': return toolUnitConversion(args);
    case 'retrieveKnowledge': return toolRetrieveKnowledge(args);
    case 'solveSystem': {
      const equations = args.equations;
      if (!Array.isArray(equations) || equations.length !== 2 || !equations.every(v => typeof v === 'string')) return fail(name, '', 'Provide exactly two linear equations');
      const r = solveSystemFromString(equations[0] as string, equations[1] as string);
      if (!r.isSolvable) return fail(name, equations.join(' ; '), r.error ?? 'System could not be solved');
      const value = JSON.stringify(r.solutions);
      return result(name, equations.join(' ; '), value, r.steps, { metadata: { variables: r.variables } });
    }
    case 'limit': {
      const expression = str(args.expression ?? args.fnExpr, 'expression');
      const c = num(args.c ?? args.x, 'c', -1e6, 1e6);
      const direction = args.direction === 'left' || args.direction === 'right' ? args.direction : 'both';
      const r = evaluateLimit(expression, c, direction);
      if (!r.exists) return result(name, expression, String(r.value), r.steps, { approximateResult: String(r.value), verificationBadge: badge('Deterministically evaluated; limit does not exist.', true) });
      return result(name, expression, String(r.value), r.steps, { approximateResult: String(r.value) });
    }
    default: return fail(name, '', 'Unknown or disallowed math tool');
  }
}
