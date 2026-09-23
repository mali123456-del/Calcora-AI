/**
 * Probability & Combinatorics Mathematical Engine
 * Accurate computations for:
 * - Permutations: nPr = n! / (n - r)!
 * - Combinations: nCr = n! / (r! (n - r)!)
 * - Binomial Distribution: P(X = k) = C(n, k) * p^k * (1 - p)^(n - k)
 * - Poisson Distribution: P(X = k) = (λ^k * e^(-λ)) / k!
 * - Discrete Random Variable: Expected Value E[X] & Variance Var(X)
 */

import { sanitizeNumber } from './mathEngine';

// Factorial helper with overflow protection
export function factorial(n: number): number {
  if (n < 0 || !Number.isInteger(n)) {
    throw new Error('Factorial is only defined for non-negative integers');
  }
  if (n > 170) {
    throw new Error('Factorial value exceeds standard floating-point representation (n > 170)');
  }
  let res = 1;
  for (let i = 2; i <= n; i++) {
    res *= i;
  }
  return res;
}

// Permutations: nPr
export function permutations(n: number, r: number): {
  result: number;
  formula: string;
  steps: string[];
} {
  if (n < 0 || r < 0 || !Number.isInteger(n) || !Number.isInteger(r)) {
    throw new Error('n and r must be non-negative integers');
  }
  if (r > n) {
    throw new Error('r cannot be greater than n in permutations');
  }

  let res = 1;
  for (let i = 0; i < r; i++) {
    res *= n - i;
  }

  const finalVal = sanitizeNumber(res);
  return {
    result: finalVal,
    formula: 'nPr = n! / (n - r)!',
    steps: [`${n}P${r} = ${n}! / (${n} - ${r})!`, `${n}P${r} = ${finalVal}`],
  };
}

// Combinations: nCr
export function combinations(n: number, r: number): {
  result: number;
  formula: string;
  steps: string[];
} {
  if (n < 0 || r < 0 || !Number.isInteger(n) || !Number.isInteger(r)) {
    throw new Error('n and r must be non-negative integers');
  }
  if (r > n) {
    throw new Error('r cannot be greater than n in combinations');
  }

  const k = Math.min(r, n - r);
  let num = 1;
  let den = 1;

  for (let i = 1; i <= k; i++) {
    num *= n - i + 1;
    den *= i;
  }

  const finalVal = sanitizeNumber(num / den);
  return {
    result: finalVal,
    formula: 'nCr = n! / [r! (n - r)!]',
    steps: [`${n}C${r} = ${n}! / [${r}! × (${n} - ${r})!]`, `${n}C${r} = ${finalVal}`],
  };
}

// Binomial Distribution: P(X = k)
export function binomialProbability(
  trialsN: number,
  successesK: number,
  probSuccessP: number
): {
  exactProbability: number;
  cumulativeLessThanOrEqual: number;
  formula: string;
  steps: string[];
} {
  if (trialsN < 0 || successesK < 0 || !Number.isInteger(trialsN) || !Number.isInteger(successesK)) {
    throw new Error('Trials (n) and successes (k) must be non-negative integers');
  }
  if (successesK > trialsN) {
    throw new Error('Successes (k) cannot exceed total trials (n)');
  }
  if (probSuccessP < 0 || probSuccessP > 1) {
    throw new Error('Probability of success (p) must be between 0 and 1');
  }

  const nCk = combinations(trialsN, successesK).result;
  const pK = Math.pow(probSuccessP, successesK);
  const qNK = Math.pow(1 - probSuccessP, trialsN - successesK);
  const exact = sanitizeNumber(nCk * pK * qNK);

  // Cumulative P(X <= k)
  let cumulative = 0;
  for (let i = 0; i <= successesK; i++) {
    const c = combinations(trialsN, i).result;
    cumulative += c * Math.pow(probSuccessP, i) * Math.pow(1 - probSuccessP, trialsN - i);
  }

  return {
    exactProbability: exact,
    cumulativeLessThanOrEqual: sanitizeNumber(cumulative),
    formula: 'P(X = k) = C(n, k) × p^k × (1 - p)^(n - k)',
    steps: [
      `C(${trialsN}, ${successesK}) = ${nCk}`,
      `p^k = (${probSuccessP})^${successesK} = ${sanitizeNumber(pK)}`,
      `(1 - p)^(n - k) = (${sanitizeNumber(1 - probSuccessP)})^${trialsN - successesK} = ${sanitizeNumber(qNK)}`,
      `P(X = ${successesK}) = ${nCk} × ${sanitizeNumber(pK)} × ${sanitizeNumber(qNK)} = ${exact}`,
    ],
  };
}

// Discrete Random Variable: Expected Value & Variance
export function discreteExpectedValue(
  pairs: { x: number; p: number }[]
): {
  expectedValue: number;
  variance: number;
  standardDeviation: number;
  steps: string[];
} {
  if (pairs.length === 0) {
    throw new Error('Distribution pairs cannot be empty');
  }

  let totalProb = 0;
  let ex = 0;
  let ex2 = 0;

  for (const pair of pairs) {
    if (pair.p < 0 || pair.p > 1) {
      throw new Error(`Probability ${pair.p} must be between 0 and 1`);
    }
    totalProb += pair.p;
    ex += pair.x * pair.p;
    ex2 += pair.x * pair.x * pair.p;
  }

  if (Math.abs(totalProb - 1.0) > 0.01) {
    throw new Error(`Sum of probabilities must equal 1.0 (Current sum: ${sanitizeNumber(totalProb)})`);
  }

  const variance = Math.max(0, ex2 - ex * ex);
  const stdDev = Math.sqrt(variance);

  return {
    expectedValue: sanitizeNumber(ex),
    variance: sanitizeNumber(variance),
    standardDeviation: sanitizeNumber(stdDev),
    steps: [
      `E[X] = Σ(x_i × p_i) = ${sanitizeNumber(ex)}`,
      `E[X²] = Σ(x_i² × p_i) = ${sanitizeNumber(ex2)}`,
      `Var(X) = E[X²] - (E[X])² = ${sanitizeNumber(variance)}`,
      `σ = √Var(X) = ${sanitizeNumber(stdDev)}`,
    ],
  };
}
