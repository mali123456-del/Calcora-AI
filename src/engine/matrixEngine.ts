/**
 * Matrix & Vector Mathematical Engine
 * Comprehensive support for 2x2 and 3x3 matrices and 2D/3D vectors
 * Determinant, inverse via Gaussian elimination, multiplication, trace,
 * transpose, dot product, cross product, norm, and vector angles.
 */

import { sanitizeNumber } from './mathEngine';

// Validation helpers
export function validateMatrix(m: number[][]): { rows: number; cols: number } {
  if (!Array.isArray(m) || m.length === 0) {
    throw new Error('Matrix cannot be empty');
  }
  const rows = m.length;
  const cols = m[0].length;
  if (cols === 0) throw new Error('Matrix columns cannot be empty');

  for (let r = 0; r < rows; r++) {
    if (!Array.isArray(m[r]) || m[r].length !== cols) {
      throw new Error(`Inconsistent matrix row length at row ${r + 1}`);
    }
    for (let c = 0; c < cols; c++) {
      if (typeof m[r][c] !== 'number' || Number.isNaN(m[r][c])) {
        throw new Error(`Invalid numeric entry at (${r + 1}, ${c + 1})`);
      }
    }
  }
  return { rows, cols };
}

// Matrix Addition: A + B
export function addMatrices(A: number[][], B: number[][]): number[][] {
  const dimA = validateMatrix(A);
  const dimB = validateMatrix(B);

  if (dimA.rows !== dimB.rows || dimA.cols !== dimB.cols) {
    throw new Error(`Cannot add: Dimension mismatch (${dimA.rows}×${dimA.cols}) vs (${dimB.rows}×${dimB.cols})`);
  }

  const result: number[][] = [];
  for (let r = 0; r < dimA.rows; r++) {
    const row: number[] = [];
    for (let c = 0; c < dimA.cols; c++) {
      row.push(sanitizeNumber(A[r][c] + B[r][c]));
    }
    result.push(row);
  }
  return result;
}

// Matrix Subtraction: A - B
export function subtractMatrices(A: number[][], B: number[][]): number[][] {
  const dimA = validateMatrix(A);
  const dimB = validateMatrix(B);

  if (dimA.rows !== dimB.rows || dimA.cols !== dimB.cols) {
    throw new Error(`Cannot subtract: Dimension mismatch (${dimA.rows}×${dimA.cols}) vs (${dimB.rows}×${dimB.cols})`);
  }

  const result: number[][] = [];
  for (let r = 0; r < dimA.rows; r++) {
    const row: number[] = [];
    for (let c = 0; c < dimA.cols; c++) {
      row.push(sanitizeNumber(A[r][c] - B[r][c]));
    }
    result.push(row);
  }
  return result;
}

// Matrix Multiplication: A × B
export function multiplyMatrices(A: number[][], B: number[][]): number[][] {
  const dimA = validateMatrix(A);
  const dimB = validateMatrix(B);

  if (dimA.cols !== dimB.rows) {
    throw new Error(`Cannot multiply: Columns of A (${dimA.cols}) must equal rows of B (${dimB.rows})`);
  }

  const result: number[][] = [];
  for (let r = 0; r < dimA.rows; r++) {
    const row: number[] = [];
    for (let c = 0; c < dimB.cols; c++) {
      let sum = 0;
      for (let k = 0; k < dimA.cols; k++) {
        sum += A[r][k] * B[k][c];
      }
      row.push(sanitizeNumber(sum));
    }
    result.push(row);
  }
  return result;
}

// Scalar Multiplication: k × A
export function scaleMatrix(A: number[][], scalar: number): number[][] {
  const dim = validateMatrix(A);
  const result: number[][] = [];
  for (let r = 0; r < dim.rows; r++) {
    const row: number[] = [];
    for (let c = 0; c < dim.cols; c++) {
      row.push(sanitizeNumber(A[r][c] * scalar));
    }
    result.push(row);
  }
  return result;
}

// Matrix Transpose: Aᵀ
export function transposeMatrix(A: number[][]): number[][] {
  const dim = validateMatrix(A);
  const result: number[][] = [];
  for (let c = 0; c < dim.cols; c++) {
    const row: number[] = [];
    for (let r = 0; r < dim.rows; r++) {
      row.push(A[r][c]);
    }
    result.push(row);
  }
  return result;
}

// Determinant: det(A)
export function determinantMatrix(A: number[][]): number {
  const dim = validateMatrix(A);
  if (dim.rows !== dim.cols) {
    throw new Error('Determinant is only defined for square matrices.');
  }

  const n = dim.rows;
  if (n === 1) return A[0][0];

  if (n === 2) {
    return sanitizeNumber(A[0][0] * A[1][1] - A[0][1] * A[1][0]);
  }

  if (n === 3) {
    const a = A[0][0], b = A[0][1], c = A[0][2];
    const d = A[1][0], e = A[1][1], f = A[1][2];
    const g = A[2][0], h = A[2][1], i = A[2][2];
    const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
    return sanitizeNumber(det);
  }

  // Gaussian reduction for n >= 4
  const m = A.map((row) => [...row]);
  let det = 1;

  for (let i = 0; i < n; i++) {
    let pivot = i;
    for (let r = i + 1; r < n; r++) {
      if (Math.abs(m[r][i]) > Math.abs(m[pivot][i])) {
        pivot = r;
      }
    }

    if (Math.abs(m[pivot][i]) < 1e-12) return 0;

    if (pivot !== i) {
      const temp = m[i];
      m[i] = m[pivot];
      m[pivot] = temp;
      det *= -1;
    }

    det *= m[i][i];

    for (let r = i + 1; r < n; r++) {
      const factor = m[r][i] / m[i][i];
      for (let c = i; c < n; c++) {
        m[r][c] -= factor * m[i][c];
      }
    }
  }

  return sanitizeNumber(det);
}

export const determinant = determinantMatrix;

// Matrix Inverse: A⁻¹
export function invertMatrix(A: number[][]): number[][] {
  const dim = validateMatrix(A);
  if (dim.rows !== dim.cols) {
    throw new Error('Matrix must be square to have an inverse.');
  }

  const det = determinantMatrix(A);
  if (Math.abs(det) < 1e-12) {
    throw new Error('Matrix is singular (determinant = 0) and cannot be inverted.');
  }

  const n = dim.rows;

  if (n === 2) {
    const invDet = 1 / det;
    return [
      [sanitizeNumber(A[1][1] * invDet), sanitizeNumber(-A[0][1] * invDet)],
      [sanitizeNumber(-A[1][0] * invDet), sanitizeNumber(A[0][0] * invDet)],
    ];
  }

  // Gauss-Jordan elimination on [A | I]
  const aug: number[][] = [];
  for (let r = 0; r < n; r++) {
    const row = [...A[r]];
    for (let c = 0; c < n; c++) {
      row.push(r === c ? 1 : 0);
    }
    aug.push(row);
  }

  for (let i = 0; i < n; i++) {
    let pivot = i;
    for (let r = i + 1; r < n; r++) {
      if (Math.abs(aug[r][i]) > Math.abs(aug[pivot][i])) {
        pivot = r;
      }
    }

    if (Math.abs(aug[pivot][i]) < 1e-12) {
      throw new Error('Matrix is singular during elimination.');
    }

    if (pivot !== i) {
      const temp = aug[i];
      aug[i] = aug[pivot];
      aug[pivot] = temp;
    }

    const pVal = aug[i][i];
    for (let c = 0; c < 2 * n; c++) {
      aug[i][c] /= pVal;
    }

    for (let r = 0; r < n; r++) {
      if (r !== i) {
        const factor = aug[r][i];
        for (let c = 0; c < 2 * n; c++) {
          aug[r][c] -= factor * aug[i][c];
        }
      }
    }
  }

  const inv: number[][] = [];
  for (let r = 0; r < n; r++) {
    const row: number[] = [];
    for (let c = 0; c < n; c++) {
      row.push(sanitizeNumber(aug[r][n + c]));
    }
    inv.push(row);
  }

  return inv;
}

export const inverseMatrix = invertMatrix;

// Matrix Trace: tr(A)
export function traceMatrix(A: number[][]): number {
  const dim = validateMatrix(A);
  if (dim.rows !== dim.cols) {
    throw new Error('Trace is only defined for square matrices.');
  }

  let tr = 0;
  for (let i = 0; i < dim.rows; i++) {
    tr += A[i][i];
  }
  return sanitizeNumber(tr);
}

// Vector Operations
export function dotProduct(u: number[], v: number[]): number {
  if (u.length !== v.length) {
    throw new Error(`Vectors must have identical dimension: ${u.length} vs ${v.length}`);
  }
  let sum = 0;
  for (let i = 0; i < u.length; i++) {
    sum += u[i] * v[i];
  }
  return sanitizeNumber(sum);
}

export function crossProduct3D(u: number[], v: number[]): number[] {
  const u3 = [u[0] || 0, u[1] || 0, u[2] || 0];
  const v3 = [v[0] || 0, v[1] || 0, v[2] || 0];

  const cx = u3[1] * v3[2] - u3[2] * v3[1];
  const cy = u3[2] * v3[0] - u3[0] * v3[2];
  const cz = u3[0] * v3[1] - u3[1] * v3[0];

  return [sanitizeNumber(cx), sanitizeNumber(cy), sanitizeNumber(cz)];
}

export function vectorMagnitude(u: number[]): number {
  const sumSq = u.reduce((acc, val) => acc + val * val, 0);
  return sanitizeNumber(Math.sqrt(sumSq));
}

export function normalizeVector(u: number[]): number[] {
  const mag = vectorMagnitude(u);
  if (mag === 0) {
    throw new Error('Cannot normalize a zero vector.');
  }
  return u.map((val) => sanitizeNumber(val / mag));
}

export function angleBetweenVectors(u: number[], v: number[], mode: 'DEG' | 'RAD' = 'DEG'): number {
  const dot = dotProduct(u, v);
  const magU = vectorMagnitude(u);
  const magV = vectorMagnitude(v);

  if (magU === 0 || magV === 0) {
    throw new Error('Angle is undefined for zero vectors.');
  }

  const cosTheta = Math.max(-1, Math.min(1, dot / (magU * magV)));
  const rad = Math.acos(cosTheta);

  if (mode === 'DEG') {
    return sanitizeNumber((rad * 180) / Math.PI);
  }
  return sanitizeNumber(rad);
}
