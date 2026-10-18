import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Eye, EyeOff, ZoomIn, ZoomOut, RotateCcw, Plus, Trash2, Crosshair, ArrowRight } from 'lucide-react';
import { GraphFunction, GraphViewport } from '../types';
import { generatePlotCurves, screenToMath, mathToScreen, PlottedCurve } from '../engine/graphEngine';

const PRESET_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899'];

const DEFAULT_FUNCTIONS: GraphFunction[] = [
  { id: 'f1', expression: 'x^2 - 4', color: '#6366f1', visible: true },
  { id: 'f2', expression: 'sin(x)', color: '#10b981', visible: true },
];

const DEFAULT_VIEWPORT: GraphViewport = {
  xMin: -10,
  xMax: 10,
  yMin: -10,
  yMax: 10,
};

interface GraphingPanelProps {
  onSendToCalculator?: (expr: string) => void;
}

export const GraphingPanel: React.FC<GraphingPanelProps> = ({ onSendToCalculator }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [functions, setFunctions] = useState<GraphFunction[]>(DEFAULT_FUNCTIONS);
  const [viewport, setViewport] = useState<GraphViewport>(DEFAULT_VIEWPORT);
  const [traceCoord, setTraceCoord] = useState<{ x: number; y: number; canvasX: number; canvasY: number } | null>(
    null
  );

  // Resize canvas according to container
  const [canvasDim, setCanvasDim] = useState({ width: 600, height: 400 });

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth;
        const h = Math.max(380, Math.min(520, window.innerHeight * 0.45));
        setCanvasDim({ width: w, height: h });
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Update function expression
  const updateFunctionExpr = (id: string, expr: string) => {
    setFunctions((prev) => prev.map((f) => (f.id === id ? { ...f, expression: expr } : f)));
  };

  // Toggle function visibility
  const toggleFunctionVisibility = (id: string) => {
    setFunctions((prev) => prev.map((f) => (f.id === id ? { ...f, visible: !f.visible } : f)));
  };

  // Remove function
  const removeFunction = (id: string) => {
    setFunctions((prev) => prev.filter((f) => f.id !== id));
  };

  // Add new function
  const addFunction = () => {
    if (functions.length >= 4) return;
    const nextColor = PRESET_COLORS[functions.length % PRESET_COLORS.length];
    const newFn: GraphFunction = {
      id: `f${Date.now()}`,
      expression: 'x',
      color: nextColor,
      visible: true,
    };
    setFunctions((prev) => [...prev, newFn]);
  };

  // Preset Viewports
  const setPresetViewport = (preset: 'standard' | 'trig' | 'positive') => {
    if (preset === 'standard') {
      setViewport({ xMin: -10, xMax: 10, yMin: -10, yMax: 10 });
    } else if (preset === 'trig') {
      setViewport({
        xMin: -Math.round(2 * Math.PI * 10) / 10,
        xMax: Math.round(2 * Math.PI * 10) / 10,
        yMin: -2,
        yMax: 2,
      });
    } else if (preset === 'positive') {
      setViewport({ xMin: 0, xMax: 20, yMin: 0, yMax: 20 });
    }
  };

  // Zoom In / Out
  const zoom = (factor: number) => {
    setViewport((prev) => {
      const xCenter = (prev.xMin + prev.xMax) / 2;
      const yCenter = (prev.yMin + prev.yMax) / 2;
      const xHalf = ((prev.xMax - prev.xMin) * factor) / 2;
      const yHalf = ((prev.yMax - prev.yMin) * factor) / 2;
      return {
        xMin: xCenter - xHalf,
        xMax: xCenter + xHalf,
        yMin: yCenter - yHalf,
        yMax: yCenter + yHalf,
      };
    });
  };

  // Draw on Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvasDim;
    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Clear Canvas
    ctx.clearRect(0, 0, width, height);

    // Background
    ctx.fillStyle = '#0f172a'; // slate-900 dark theme
    ctx.fillRect(0, 0, width, height);

    const xSpan = viewport.xMax - viewport.xMin;
    const ySpan = viewport.yMax - viewport.yMin;

    // Draw Grid Lines
    ctx.strokeStyle = '#1e293b'; // slate-800
    ctx.lineWidth = 1;

    // Grid spacing calculation
    const calcStep = (span: number) => {
      const raw = span / 10;
      const power = Math.pow(10, Math.floor(Math.log10(raw)));
      const mult = raw / power;
      if (mult < 2) return power;
      if (mult < 5) return 2 * power;
      return 5 * power;
    };

    const xStep = calcStep(xSpan);
    const yStep = calcStep(ySpan);

    // Vertical grid lines
    const firstX = Math.ceil(viewport.xMin / xStep) * xStep;
    for (let x = firstX; x <= viewport.xMax; x += xStep) {
      const sx = ((x - viewport.xMin) / xSpan) * width;
      ctx.beginPath();
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, height);
      ctx.stroke();

      // Number tick
      ctx.fillStyle = '#64748b';
      ctx.font = '10px monospace';
      ctx.fillText(x.toFixed(1).replace(/\.0$/, ''), sx + 2, height - 6);
    }

    // Horizontal grid lines
    const firstY = Math.ceil(viewport.yMin / yStep) * yStep;
    for (let y = firstY; y <= viewport.yMax; y += yStep) {
      const sy = height - ((y - viewport.yMin) / ySpan) * height;
      ctx.beginPath();
      ctx.moveTo(0, sy);
      ctx.lineTo(width, sy);
      ctx.stroke();

      // Number tick
      ctx.fillStyle = '#64748b';
      ctx.font = '10px monospace';
      ctx.fillText(y.toFixed(1).replace(/\.0$/, ''), 4, sy - 3);
    }

    // Main Axes (X=0, Y=0)
    ctx.strokeStyle = '#475569'; // slate-600
    ctx.lineWidth = 1.5;

    // Y axis (where x = 0)
    if (viewport.xMin <= 0 && viewport.xMax >= 0) {
      const originX = ((0 - viewport.xMin) / xSpan) * width;
      ctx.beginPath();
      ctx.moveTo(originX, 0);
      ctx.lineTo(originX, height);
      ctx.stroke();
    }

    // X axis (where y = 0)
    if (viewport.yMin <= 0 && viewport.yMax >= 0) {
      const originY = height - ((0 - viewport.yMin) / ySpan) * height;
      ctx.beginPath();
      ctx.moveTo(0, originY);
      ctx.lineTo(width, originY);
      ctx.stroke();
    }

    // Plot curves
    const curves = generatePlotCurves(functions, viewport, width, height, 400);

    for (const curve of curves) {
      if (curve.points.length < 2) continue;

      ctx.strokeStyle = curve.color;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      ctx.beginPath();
      let isDrawing = false;

      for (let i = 0; i < curve.points.length; i++) {
        const pt = curve.points[i];
        if (pt.canvasY >= -100 && pt.canvasY <= height + 100) {
          if (!isDrawing) {
            ctx.moveTo(pt.canvasX, pt.canvasY);
            isDrawing = true;
          } else {
            ctx.lineTo(pt.canvasX, pt.canvasY);
          }
        } else {
          isDrawing = false;
        }
      }
      ctx.stroke();

      // Draw Roots (Zeros)
      for (const r of curve.roots) {
        if (r.x >= viewport.xMin && r.x <= viewport.xMax) {
          const rootPos = mathToScreen(r.x, 0, viewport, width, height);
          ctx.fillStyle = curve.color;
          ctx.beginPath();
          ctx.arc(rootPos.canvasX, rootPos.canvasY, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }
    }

    // Draw Trace Crosshair
    if (traceCoord) {
      ctx.strokeStyle = '#38bdf8'; // sky-400
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);

      // Crosshair lines
      ctx.beginPath();
      ctx.moveTo(traceCoord.canvasX, 0);
      ctx.lineTo(traceCoord.canvasX, height);
      ctx.moveTo(0, traceCoord.canvasY);
      ctx.lineTo(width, traceCoord.canvasY);
      ctx.stroke();

      ctx.setLineDash([]); // reset

      // Indicator Dot
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(traceCoord.canvasX, traceCoord.canvasY, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [functions, viewport, canvasDim, traceCoord]);

  // Handle canvas mouse move for trace inspector
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    const math = screenToMath(cx, cy, viewport, canvasDim.width, canvasDim.height);
    setTraceCoord({
      x: Math.round(math.x * 1000) / 1000,
      y: Math.round(math.y * 1000) / 1000,
      canvasX: cx,
      canvasY: cy,
    });
  };

  const handleCanvasMouseLeave = () => {
    setTraceCoord(null);
  };

  return (
    <div id="graphing-panel-container" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Crosshair className="w-5 h-5 text-cyan-500" />
            2D Graphing Workspace
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time multi-function plotter with zero/root detection and coordinate tracing
          </p>
        </div>

        {/* Viewport Presets & Zoom */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              onClick={() => setPresetViewport('standard')}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-colors"
            >
              Standard [-10, 10]
            </button>
            <button
              onClick={() => setPresetViewport('trig')}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-colors"
            >
              Trig [-2π, 2π]
            </button>
            <button
              onClick={() => setPresetViewport('positive')}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-colors"
            >
              Positive [0, 20]
            </button>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              onClick={() => zoom(0.8)}
              className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => zoom(1.25)}
              className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPresetViewport('standard')}
              className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors"
              title="Reset Viewport"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Function Inputs List */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Functions (Max 4)
              </h3>
              {functions.length < 4 && (
                <button
                  onClick={addFunction}
                  className="text-xs text-cyan-500 hover:underline flex items-center gap-1 font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Function</span>
                </button>
              )}
            </div>

            <div className="space-y-3">
              {functions.map((fn, idx) => (
                <div
                  key={fn.id}
                  className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50"
                >
                  <div
                    className="w-3.5 h-3.5 rounded-full shrink-0"
                    style={{ backgroundColor: fn.color }}
                  />
                  <span className="text-xs font-mono font-bold text-slate-500">
                    f{idx + 1}(x) =
                  </span>
                  <input
                    type="text"
                    value={fn.expression}
                    onChange={(e) => updateFunctionExpr(fn.id, e.target.value)}
                    placeholder="e.g. sin(x)"
                    className="flex-1 font-mono text-sm px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-cyan-500"
                  />
                  <button
                    onClick={() => toggleFunctionVisibility(fn.id)}
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    title={fn.visible ? 'Hide curve' : 'Show curve'}
                  >
                    {fn.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4 text-slate-300" />}
                  </button>
                  {functions.length > 1 && (
                    <button
                      onClick={() => removeFunction(fn.id)}
                      className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                      title="Delete function"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Quick Templates */}
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[11px] font-medium text-slate-400 block mb-2">Sample Curves:</span>
              <div className="flex flex-wrap gap-1.5">
                {['x^2 - 4', 'sin(x)', 'cos(x)', 'e^x', 'ln(x)', '2^x', '1/x'].map((ex) => (
                  <button
                    key={ex}
                    onClick={() => {
                      if (functions.length > 0) {
                        updateFunctionExpr(functions[0].id, ex);
                      }
                    }}
                    className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-cyan-50 dark:hover:bg-cyan-950/50 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Canvas Plotter */}
        <div className="lg:col-span-7 space-y-3">
          <div
            ref={containerRef}
            className="w-full relative rounded-2xl overflow-hidden border border-slate-800 shadow-md bg-slate-950"
          >
            <canvas
              ref={canvasRef}
              style={{ width: `${canvasDim.width}px`, height: `${canvasDim.height}px` }}
              onMouseMove={handleCanvasMouseMove}
              onMouseLeave={handleCanvasMouseLeave}
              className="cursor-crosshair block"
            />

            {/* Coordinate Inspector Overlay Badge */}
            <div className="absolute bottom-3 right-3 px-3 py-1.5 rounded-xl bg-slate-900/90 backdrop-blur-xs border border-slate-700/80 text-xs font-mono text-white shadow-lg flex items-center gap-2">
              <span className="text-cyan-400">Trace:</span>
              {traceCoord ? (
                <span>
                  x: <strong className="text-emerald-400">{traceCoord.x}</strong>, y:{' '}
                  <strong className="text-sky-400">{traceCoord.y}</strong>
                </span>
              ) : (
                <span className="text-slate-400">Hover canvas to inspect (x, y)</span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
            <span>Domain: [{viewport.xMin}, {viewport.xMax}]</span>
            <span>White dots represent detected x-intercepts (roots)</span>
            <span>Range: [{viewport.yMin}, {viewport.yMax}]</span>
          </div>
        </div>
      </div>
    </div>
  );
};
