import React, { useState } from 'react';
import { Grid, Layers, Play, ArrowRight, RotateCcw } from 'lucide-react';
import {
  addMatrices,
  subtractMatrices,
  multiplyMatrices,
  scaleMatrix,
  transposeMatrix,
  determinantMatrix,
  invertMatrix,
  traceMatrix,
  dotProduct,
  crossProduct3D,
  vectorMagnitude,
  normalizeVector,
  angleBetweenVectors,
} from '../engine/matrixEngine';

interface MatrixPanelProps {
  onSendToCalculator?: (expr: string) => void;
}

export const MatrixPanel: React.FC<MatrixPanelProps> = ({ onSendToCalculator }) => {
  const [activeTab, setActiveTab] = useState<'matrix' | 'vector'>('matrix');
  const [dim, setDim] = useState<2 | 3>(2);

  // Matrix A and B states
  const [matA, setMatA] = useState<number[][]>([
    [1, 2],
    [3, 4],
  ]);
  const [matB, setMatB] = useState<number[][]>([
    [2, 0],
    [1, 2],
  ]);
  const [scalarK, setScalarK] = useState<string>('2');

  const [matrixResult, setMatrixResult] = useState<{
    matrix?: number[][];
    scalar?: number;
    title: string;
    description?: string;
  } | null>(null);
  const [matError, setMatError] = useState<string | null>(null);

  // Vectors state
  const [vecU, setVecU] = useState<number[]>([1, 2, 3]);
  const [vecV, setVecV] = useState<number[]>([4, 5, 6]);
  const [vectorResult, setVectorResult] = useState<{
    vector?: number[];
    scalar?: number;
    title: string;
    description?: string;
  } | null>(null);
  const [vecError, setVecError] = useState<string | null>(null);

  const handleDimChange = (newDim: 2 | 3) => {
    setDim(newDim);
    if (newDim === 2) {
      setMatA([
        [1, 2],
        [3, 4],
      ]);
      setMatB([
        [2, 0],
        [1, 2],
      ]);
    } else {
      setMatA([
        [1, 2, 3],
        [0, 1, 4],
        [5, 6, 0],
      ]);
      setMatB([
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
      ]);
    }
    setMatrixResult(null);
  };

  const updateCellA = (r: number, c: number, val: string) => {
    const num = parseFloat(val) || 0;
    const next = matA.map((row, ri) => (ri === r ? row.map((col, ci) => (ci === c ? num : col)) : row));
    setMatA(next);
  };

  const updateCellB = (r: number, c: number, val: string) => {
    const num = parseFloat(val) || 0;
    const next = matB.map((row, ri) => (ri === r ? row.map((col, ci) => (ci === c ? num : col)) : row));
    setMatB(next);
  };

  // Matrix action runners
  const runMatrixOp = (op: 'add' | 'sub' | 'mul' | 'detA' | 'invA' | 'transA' | 'traceA' | 'scaleA') => {
    setMatError(null);
    try {
      if (op === 'add') {
        const res = addMatrices(matA, matB);
        setMatrixResult({ matrix: res, title: 'Matrix A + B' });
      } else if (op === 'sub') {
        const res = subtractMatrices(matA, matB);
        setMatrixResult({ matrix: res, title: 'Matrix A − B' });
      } else if (op === 'mul') {
        const res = multiplyMatrices(matA, matB);
        setMatrixResult({ matrix: res, title: 'Matrix A × B' });
      } else if (op === 'detA') {
        const det = determinantMatrix(matA);
        setMatrixResult({ scalar: det, title: 'Determinant det(A)' });
      } else if (op === 'invA') {
        const inv = invertMatrix(matA);
        setMatrixResult({ matrix: inv, title: 'Inverse Matrix A⁻¹' });
      } else if (op === 'transA') {
        const trans = transposeMatrix(matA);
        setMatrixResult({ matrix: trans, title: 'Transpose Aᵀ' });
      } else if (op === 'traceA') {
        const tr = traceMatrix(matA);
        setMatrixResult({ scalar: tr, title: 'Trace tr(A)' });
      } else if (op === 'scaleA') {
        const k = parseFloat(scalarK) || 1;
        const res = scaleMatrix(matA, k);
        setMatrixResult({ matrix: res, title: `${k} × Matrix A` });
      }
    } catch (err: any) {
      setMatError(err.message || 'Matrix operation failed');
      setMatrixResult(null);
    }
  };

  // Vector action runners
  const runVectorOp = (op: 'dot' | 'cross' | 'magU' | 'normU' | 'angle') => {
    setVecError(null);
    try {
      if (op === 'dot') {
        const d = dotProduct(vecU, vecV);
        setVectorResult({ scalar: d, title: 'Dot Product (u · v)' });
      } else if (op === 'cross') {
        const c = crossProduct3D(vecU, vecV);
        setVectorResult({ vector: c, title: 'Cross Product (u × v)' });
      } else if (op === 'magU') {
        const m = vectorMagnitude(vecU);
        setVectorResult({ scalar: m, title: 'Magnitude ||u||' });
      } else if (op === 'normU') {
        const n = normalizeVector(vecU);
        setVectorResult({ vector: n, title: 'Unit Vector û' });
      } else if (op === 'angle') {
        const ang = angleBetweenVectors(vecU, vecV, 'DEG');
        setVectorResult({ scalar: ang, title: 'Angle between u and v (°)' });
      }
    } catch (err: any) {
      setVecError(err.message || 'Vector operation failed');
      setVectorResult(null);
    }
  };

  return (
    <div id="matrix-panel-container" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-cyan-500" />
            Linear Algebra: Matrix & Vector
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Determinants, inverses, products, transposes, dot & cross products
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
            <button
              onClick={() => setActiveTab('matrix')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'matrix'
                  ? 'bg-white dark:bg-slate-700 text-cyan-600 dark:text-cyan-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Matrix Engine
            </button>
            <button
              onClick={() => setActiveTab('vector')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'vector'
                  ? 'bg-white dark:bg-slate-700 text-cyan-600 dark:text-cyan-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Vector Engine
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'matrix' ? (
        <div id="matrix-engine-content" className="space-y-6">
          {/* Dimension Selector */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Matrix Size:</span>
            <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
              <button
                onClick={() => handleDimChange(2)}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  dim === 2
                    ? 'bg-white dark:bg-slate-700 text-cyan-600 dark:text-cyan-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                2 × 2
              </button>
              <button
                onClick={() => handleDimChange(3)}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  dim === 3
                    ? 'bg-white dark:bg-slate-700 text-cyan-600 dark:text-cyan-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                3 × 3
              </button>
            </div>
          </div>

          {/* Matrix Grids */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Matrix A */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Matrix A</h3>
                <span className="text-xs text-cyan-500 font-mono">[{dim}×{dim}]</span>
              </div>
              <div
                className="grid gap-2"
                style={{ gridTemplateColumns: `repeat(${dim}, minmax(0, 1fr))` }}
              >
                {matA.map((row, r) =>
                  row.map((val, c) => (
                    <input
                      key={`a-${r}-${c}`}
                      type="number"
                      value={val}
                      onChange={(e) => updateCellA(r, c, e.target.value)}
                      aria-label={`Matrix A row ${r + 1} column ${c + 1}`}
                      className="font-mono text-center text-sm py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
                    />
                  ))
                )}
              </div>
              <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => runMatrixOp('detA')}
                  className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 text-slate-700 dark:text-slate-300 hover:text-cyan-600 transition-colors"
                >
                  det(A)
                </button>
                <button
                  onClick={() => runMatrixOp('invA')}
                  className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 text-slate-700 dark:text-slate-300 hover:text-cyan-600 transition-colors"
                >
                  A⁻¹
                </button>
                <button
                  onClick={() => runMatrixOp('transA')}
                  className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 text-slate-700 dark:text-slate-300 hover:text-cyan-600 transition-colors"
                >
                  Aᵀ
                </button>
                <button
                  onClick={() => runMatrixOp('traceA')}
                  className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 text-slate-700 dark:text-slate-300 hover:text-cyan-600 transition-colors"
                >
                  tr(A)
                </button>
              </div>
            </div>

            {/* Matrix B */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Matrix B</h3>
                <span className="text-xs text-cyan-500 font-mono">[{dim}×{dim}]</span>
              </div>
              <div
                className="grid gap-2"
                style={{ gridTemplateColumns: `repeat(${dim}, minmax(0, 1fr))` }}
              >
                {matB.map((row, r) =>
                  row.map((val, c) => (
                    <input
                      key={`b-${r}-${c}`}
                      type="number"
                      value={val}
                      onChange={(e) => updateCellB(r, c, e.target.value)}
                      aria-label={`Matrix B row ${r + 1} column ${c + 1}`}
                      className="font-mono text-center text-sm py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
                    />
                  ))
                )}
              </div>
              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                <label htmlFor="matrix-scalar-k" className="text-xs text-slate-500">Scalar k:</label>
                <input
                  id="matrix-scalar-k"
                  type="number"
                  value={scalarK}
                  onChange={(e) => setScalarK(e.target.value)}
                  className="w-16 px-2 py-1 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
                <button
                  onClick={() => runMatrixOp('scaleA')}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 text-slate-700 dark:text-slate-300 hover:text-cyan-600 transition-colors"
                >
                  k · A
                </button>
              </div>
            </div>
          </div>

          {/* Binary Operations */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => runMatrixOp('add')}
              className="px-4 py-2 bg-cyan-700 hover:bg-cyan-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
            >
              Add: A + B
            </button>
            <button
              onClick={() => runMatrixOp('sub')}
              className="px-4 py-2 bg-cyan-700 hover:bg-cyan-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
            >
              Subtract: A − B
            </button>
            <button
              onClick={() => runMatrixOp('mul')}
              className="px-4 py-2 bg-cyan-700 hover:bg-cyan-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
            >
              Multiply: A × B
            </button>
          </div>

          {matError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl text-rose-600 dark:text-rose-400 text-xs">
              {matError}
            </div>
          )}

          {/* Matrix Result Display */}
          {matrixResult && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  {matrixResult.title}
                </h4>
                {matrixResult.scalar !== undefined && onSendToCalculator && (
                  <button
                    onClick={() => onSendToCalculator(String(matrixResult.scalar))}
                    className="text-xs text-cyan-500 hover:underline flex items-center gap-1"
                  >
                    <span>Send to Calc</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>

              {matrixResult.scalar !== undefined && (
                <div className="text-3xl font-mono font-bold text-cyan-600 dark:text-cyan-400">
                  {matrixResult.scalar}
                </div>
              )}

              {matrixResult.matrix && (
                <div className="inline-block p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center">
                    <span className="text-3xl font-light text-slate-400 select-none mr-2">[</span>
                    <div className="space-y-1">
                      {matrixResult.matrix.map((row, ri) => (
                        <div key={ri} className="flex gap-4 font-mono text-sm">
                          {row.map((val, ci) => (
                            <span key={ci} className="w-16 text-right font-medium text-slate-800 dark:text-slate-200">
                              {Number.isInteger(val) ? val : val.toFixed(3)}
                            </span>
                          ))}
                        </div>
                      ))}
                    </div>
                    <span className="text-3xl font-light text-slate-400 select-none ml-2">]</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Vector Engine Content */
        <div id="vector-engine-content" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Vector u */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3">
                Vector u = [x, y, z]
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {vecU.map((v, i) => (
                  <div key={i}>
                    <label className="block text-[11px] text-slate-400 mb-0.5">
                      {['ux', 'uy', 'uz'][i]}
                    </label>
                    <input
                      type="number"
                      value={v}
                      onChange={(e) => {
                        const num = parseFloat(e.target.value) || 0;
                        setVecU(vecU.map((val, idx) => (idx === i ? num : val)));
                      }}
                      className="w-full font-mono text-center text-sm py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => runVectorOp('magU')}
                  className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 text-slate-700 dark:text-slate-300 hover:text-cyan-600 transition-colors"
                >
                  ||u|| (Magnitude)
                </button>
                <button
                  onClick={() => runVectorOp('normU')}
                  className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 text-slate-700 dark:text-slate-300 hover:text-cyan-600 transition-colors"
                >
                  û (Normalize)
                </button>
              </div>
            </div>

            {/* Vector v */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3">
                Vector v = [x, y, z]
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {vecV.map((v, i) => (
                  <div key={i}>
                    <label className="block text-[11px] text-slate-400 mb-0.5">
                      {['vx', 'vy', 'vz'][i]}
                    </label>
                    <input
                      type="number"
                      value={v}
                      onChange={(e) => {
                        const num = parseFloat(e.target.value) || 0;
                        setVecV(vecV.map((val, idx) => (idx === i ? num : val)));
                      }}
                      className="w-full font-mono text-center text-sm py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Vector Operations */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => runVectorOp('dot')}
              className="px-4 py-2 bg-cyan-700 hover:bg-cyan-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
            >
              Dot Product: u · v
            </button>
            <button
              onClick={() => runVectorOp('cross')}
              className="px-4 py-2 bg-cyan-700 hover:bg-cyan-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
            >
              Cross Product: u × v
            </button>
            <button
              onClick={() => runVectorOp('angle')}
              className="px-4 py-2 bg-cyan-700 hover:bg-cyan-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
            >
              Angle Between (θ)
            </button>
          </div>

          {vecError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl text-rose-600 dark:text-rose-400 text-xs">
              {vecError}
            </div>
          )}

          {/* Vector Result Display */}
          {vectorResult && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
                {vectorResult.title}
              </h4>

              {vectorResult.scalar !== undefined && (
                <div className="text-3xl font-mono font-bold text-cyan-600 dark:text-cyan-400">
                  {vectorResult.scalar}
                </div>
              )}

              {vectorResult.vector && (
                <div className="font-mono text-lg font-bold text-cyan-600 dark:text-cyan-400">
                  [{vectorResult.vector.map((x) => (Number.isInteger(x) ? x : x.toFixed(3))).join(', ')}]
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
