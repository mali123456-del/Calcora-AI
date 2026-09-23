/**
 * Statistics & Regression Engine
 * Computes descriptive statistics, quartiles, dispersion, z-scores,
 * and linear regression with correlation coefficient (r) and R².
 */

import { RegressionResult, StatisticsResult } from '../types';
import { sanitizeNumber } from './mathEngine';

/**
 * Parse a raw text input string into an array of clean numbers
 */
export function parseDataset(input: string): number[] {
  if (!input || !input.trim()) return [];

  // Split by commas, semicolons, whitespace, or newlines
  const tokens = input.split(/[\s,;\n\t]+/);
  const numbers: number[] = [];

  for (const t of tokens) {
    const trimmed = t.trim();
    if (!trimmed) continue;
    const val = parseFloat(trimmed);
    if (!Number.isNaN(val) && Number.isFinite(val)) {
      numbers.push(val);
    }
  }

  return numbers;
}

/**
 * Compute full descriptive statistics on a dataset
 */
export function computeStatistics(data: number[]): StatisticsResult {
  if (data.length === 0) {
    throw new Error('Dataset must contain at least one valid number');
  }

  const n = data.length;
  const sorted = [...data].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, val) => acc + val, 0);
  const mean = sum / n;
  const min = sorted[0];
  const max = sorted[n - 1];
  const range = max - min;

  // Median
  let median: number;
  const mid = Math.floor(n / 2);
  if (n % 2 === 1) {
    median = sorted[mid];
  } else {
    median = (sorted[mid - 1] + sorted[mid]) / 2;
  }

  // Mode
  const freqMap = new Map<number, number>();
  let maxFreq = 0;
  for (const v of sorted) {
    const f = (freqMap.get(v) || 0) + 1;
    freqMap.set(v, f);
    if (f > maxFreq) maxFreq = f;
  }

  const mode: number[] = [];
  if (maxFreq > 1) {
    for (const [v, f] of freqMap.entries()) {
      if (f === maxFreq) mode.push(v);
    }
  }

  // Dispersion: Population & Sample Variance
  let sumSqDiff = 0;
  for (const v of sorted) {
    sumSqDiff += Math.pow(v - mean, 2);
  }

  const variancePopulation = sumSqDiff / n;
  const varianceSample = n > 1 ? sumSqDiff / (n - 1) : 0;
  const stdDevPopulation = Math.sqrt(variancePopulation);
  const stdDevSample = Math.sqrt(varianceSample);

  // Quartiles (Tukey method)
  const lowerHalf = sorted.slice(0, mid);
  const upperHalf = n % 2 === 1 ? sorted.slice(mid + 1) : sorted.slice(mid);

  const getMedianOfSlice = (arr: number[]) => {
    if (arr.length === 0) return median;
    const m = Math.floor(arr.length / 2);
    return arr.length % 2 === 1 ? arr[m] : (arr[m - 1] + arr[m]) / 2;
  };

  const q1 = getMedianOfSlice(lowerHalf);
  const q3 = getMedianOfSlice(upperHalf);
  const iqr = q3 - q1;

  return {
    count: n,
    sum: sanitizeNumber(sum),
    mean: sanitizeNumber(mean),
    median: sanitizeNumber(median),
    mode: mode.map(sanitizeNumber),
    min: sanitizeNumber(min),
    max: sanitizeNumber(max),
    range: sanitizeNumber(range),
    varianceSample: sanitizeNumber(varianceSample),
    variancePopulation: sanitizeNumber(variancePopulation),
    stdDevSample: sanitizeNumber(stdDevSample),
    stdDevPopulation: sanitizeNumber(stdDevPopulation),
    q1: sanitizeNumber(q1),
    q3: sanitizeNumber(q3),
    iqr: sanitizeNumber(iqr),
    sortedData: sorted,
  };
}

/**
 * Compute Linear Regression: y = mx + b
 */
export function computeLinearRegression(points: { x: number; y: number }[]): RegressionResult {
  const n = points.length;
  if (n < 2) {
    throw new Error('Linear regression requires at least 2 distinct points');
  }

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  let sumY2 = 0;

  for (const pt of points) {
    sumX += pt.x;
    sumY += pt.y;
    sumXY += pt.x * pt.y;
    sumX2 += pt.x * pt.x;
    sumY2 += pt.y * pt.y;
  }

  const denominator = n * sumX2 - sumX * sumX;
  if (Math.abs(denominator) < 1e-12) {
    throw new Error('All x coordinates are identical (vertical line)');
  }

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  // Correlation coefficient r
  const rNumerator = n * sumXY - sumX * sumY;
  const rDenominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  const r = rDenominator > 0 ? rNumerator / rDenominator : 0;
  const rSquared = r * r;

  const residuals = points.map((pt) => {
    const predicted = slope * pt.x + intercept;
    return {
      x: pt.x,
      y: pt.y,
      predicted: sanitizeNumber(predicted),
      residual: sanitizeNumber(pt.y - predicted),
    };
  });

  const sign = intercept >= 0 ? '+' : '-';
  const cleanSlope = sanitizeNumber(slope);
  const cleanIntercept = sanitizeNumber(Math.abs(intercept));
  const equation = `y = ${cleanSlope}x ${sign} ${cleanIntercept}`;

  return {
    type: 'linear',
    equation,
    slope: cleanSlope,
    intercept: sanitizeNumber(intercept),
    r: sanitizeNumber(r),
    rSquared: sanitizeNumber(rSquared),
    residuals,
  };
}

/**
 * Calculate Z-Score for a specific observation
 */
export function calculateZScore(x: number, mean: number, stdDev: number): number {
  if (stdDev === 0) return 0;
  return sanitizeNumber((x - mean) / stdDev);
}
