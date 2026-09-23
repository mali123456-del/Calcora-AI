/**
 * Graphing Engine
 * Safe deterministic grid evaluator for 2D function plotting
 * Supports multi-function rendering, trace inspection, and intersection approximations
 */

import { GraphFunction, GraphViewport } from '../types';
import { evaluateFunctionAt } from './calculusEngine';

export interface PlotPoint {
  x: number;
  y: number;
  canvasX: number;
  canvasY: number;
}

export interface PlottedCurve {
  id: string;
  expression: string;
  color: string;
  points: PlotPoint[];
  roots: { x: number; y: number }[];
}

/**
 * Generate plot curves across the viewport
 */
export function generatePlotCurves(
  functions: GraphFunction[],
  viewport: GraphViewport,
  width: number,
  height: number,
  numSamples = 400
): PlottedCurve[] {
  const curves: PlottedCurve[] = [];
  const xSpan = viewport.xMax - viewport.xMin;
  const ySpan = viewport.yMax - viewport.yMin;

  if (xSpan <= 0 || ySpan <= 0 || width <= 0 || height <= 0) {
    return [];
  }

  const step = xSpan / numSamples;

  for (const fn of functions) {
    if (!fn.visible || !fn.expression.trim()) continue;

    const points: PlotPoint[] = [];
    const roots: { x: number; y: number }[] = [];
    let prevY: number | null = null;
    let prevX: number | null = null;

    for (let i = 0; i <= numSamples; i++) {
      const x = viewport.xMin + i * step;
      try {
        const y = evaluateFunctionAt(fn.expression, x);

        if (Number.isFinite(y)) {
          // Check for sign change to detect root
          if (prevY !== null && prevX !== null && ((prevY < 0 && y >= 0) || (prevY > 0 && y <= 0))) {
            const rootX = prevX - prevY * ((x - prevX) / (y - prevY));
            roots.push({ x: rootX, y: 0 });
          }

          // Convert to canvas coordinates
          const canvasX = ((x - viewport.xMin) / xSpan) * width;
          const canvasY = height - ((y - viewport.yMin) / ySpan) * height;

          points.push({ x, y, canvasX, canvasY });
          prevY = y;
          prevX = x;
        } else {
          prevY = null;
          prevX = null;
        }
      } catch {
        prevY = null;
        prevX = null;
      }
    }

    curves.push({
      id: fn.id,
      expression: fn.expression,
      color: fn.color,
      points,
      roots,
    });
  }

  return curves;
}

/**
 * Screen to Math coordinates
 */
export function screenToMath(
  canvasX: number,
  canvasY: number,
  viewport: GraphViewport,
  width: number,
  height: number
): { x: number; y: number } {
  const xSpan = viewport.xMax - viewport.xMin;
  const ySpan = viewport.yMax - viewport.yMin;

  const x = viewport.xMin + (canvasX / width) * xSpan;
  const y = viewport.yMin + ((height - canvasY) / height) * ySpan;

  return { x, y };
}

/**
 * Math to Screen coordinates
 */
export function mathToScreen(
  x: number,
  y: number,
  viewport: GraphViewport,
  width: number,
  height: number
): { canvasX: number; canvasY: number } {
  const xSpan = viewport.xMax - viewport.xMin;
  const ySpan = viewport.yMax - viewport.yMin;

  const canvasX = ((x - viewport.xMin) / xSpan) * width;
  const canvasY = height - ((y - viewport.yMin) / ySpan) * height;

  return { canvasX, canvasY };
}
