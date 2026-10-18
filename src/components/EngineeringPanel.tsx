import React, { useState } from 'react';
import {
  Wrench,
  Zap,
  Activity,
  Gauge,
  Waves,
  ArrowRight,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import {
  solveOhmsLaw,
  calculateElectricalPower,
  calculateForce,
  calculateKineticEnergy,
  calculatePotentialEnergy,
  calculateDensity,
  calculatePressure,
  calculateWaveVelocity,
} from '../engine/engineeringEngine';

interface EngineeringPanelProps {
  onSendToCalculator?: (expr: string) => void;
}

export const EngineeringPanel: React.FC<EngineeringPanelProps> = ({ onSendToCalculator }) => {
  const [activeCategory, setActiveCategory] = useState<'electrical' | 'mechanics' | 'physics'>('electrical');

  // Ohm's Law State
  const [ohmsV, setOhmsV] = useState<string>('12');
  const [ohmsI, setOhmsI] = useState<string>('0.5');
  const [ohmsR, setOhmsR] = useState<string>('');
  const [ohmsResult, setOhmsResult] = useState<any>(null);
  const [ohmsError, setOhmsError] = useState<string | null>(null);

  // Power State
  const [pwrV, setPwrV] = useState<string>('120');
  const [pwrI, setPwrI] = useState<string>('1.5');
  const [pwrResult, setPwrResult] = useState<any>(null);
  const [pwrError, setPwrError] = useState<string | null>(null);

  // Mechanics: Force State
  const [forceMass, setForceMass] = useState<string>('1500');
  const [forceAccel, setForceAccel] = useState<string>('2.5');
  const [forceResult, setForceResult] = useState<any>(null);
  const [forceError, setForceError] = useState<string | null>(null);

  // Mechanics: Kinetic Energy State
  const [keMass, setKeMass] = useState<string>('1200');
  const [keVel, setKeVel] = useState<string>('25');
  const [keResult, setKeResult] = useState<any>(null);
  const [keError, setKeError] = useState<string | null>(null);

  // Physics: Density State
  const [densMass, setDensMass] = useState<string>('540');
  const [densVol, setDensVol] = useState<string>('0.2');
  const [densResult, setDensResult] = useState<any>(null);
  const [densError, setDensError] = useState<string | null>(null);

  // Physics: Pressure State
  const [presForce, setPresForce] = useState<string>('500');
  const [presArea, setPresArea] = useState<string>('0.05');
  const [presResult, setPresResult] = useState<any>(null);
  const [presError, setPresError] = useState<string | null>(null);

  // Handlers
  const handleSolveOhms = () => {
    setOhmsError(null);
    try {
      const v = ohmsV.trim() ? parseFloat(ohmsV) : undefined;
      const i = ohmsI.trim() ? parseFloat(ohmsI) : undefined;
      const r = ohmsR.trim() ? parseFloat(ohmsR) : undefined;
      const res = solveOhmsLaw({ voltage: v, current: i, resistance: r });
      setOhmsResult(res);
    } catch (e: any) {
      setOhmsError(e.message || 'Error calculating Ohm’s Law');
      setOhmsResult(null);
    }
  };

  const handleCalcPower = () => {
    setPwrError(null);
    try {
      const v = pwrV.trim() ? parseFloat(pwrV) : undefined;
      const i = pwrI.trim() ? parseFloat(pwrI) : undefined;
      const res = calculateElectricalPower({ voltage: v, current: i });
      setPwrResult(res);
    } catch (e: any) {
      setPwrError(e.message || 'Error calculating Power');
      setPwrResult(null);
    }
  };

  const handleCalcForce = () => {
    setForceError(null);
    try {
      const m = parseFloat(forceMass);
      const a = parseFloat(forceAccel);
      if (Number.isNaN(m) || Number.isNaN(a)) throw new Error('Please enter valid numeric values');
      const res = calculateForce(m, a);
      setForceResult(res);
    } catch (e: any) {
      setForceError(e.message || 'Error calculating Force');
      setForceResult(null);
    }
  };

  const handleCalcKE = () => {
    setKeError(null);
    try {
      const m = parseFloat(keMass);
      const v = parseFloat(keVel);
      if (Number.isNaN(m) || Number.isNaN(v)) throw new Error('Please enter valid numeric values');
      const res = calculateKineticEnergy(m, v);
      setKeResult(res);
    } catch (e: any) {
      setKeError(e.message || 'Error calculating Kinetic Energy');
      setKeResult(null);
    }
  };

  const handleCalcDensity = () => {
    setDensError(null);
    try {
      const m = parseFloat(densMass);
      const v = parseFloat(densVol);
      if (Number.isNaN(m) || Number.isNaN(v)) throw new Error('Please enter valid numeric values');
      const res = calculateDensity(m, v);
      setDensResult(res);
    } catch (e: any) {
      setDensError(e.message || 'Error calculating Density');
      setDensResult(null);
    }
  };

  const handleCalcPressure = () => {
    setPresError(null);
    try {
      const f = parseFloat(presForce);
      const a = parseFloat(presArea);
      if (Number.isNaN(f) || Number.isNaN(a)) throw new Error('Please enter valid numeric values');
      const res = calculatePressure(f, a);
      setPresResult(res);
    } catch (e: any) {
      setPresError(e.message || 'Error calculating Pressure');
      setPresResult(null);
    }
  };

  return (
    <div id="engineering-panel-container" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Wrench className="w-5 h-5 text-amber-500" />
            Engineering & Applied Physics Toolkit
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Precision solvers for electrical circuits, mechanics dynamics, fluids, and thermodynamics.
          </p>
        </div>

        {/* Sub-Category Nav */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setActiveCategory('electrical')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeCategory === 'electrical'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Electrical</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory('mechanics')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeCategory === 'mechanics'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Mechanics</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory('physics')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeCategory === 'physics'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Gauge className="w-3.5 h-3.5" />
            <span>Physics & Fluids</span>
          </button>
        </div>
      </div>

      {/* CATEGORY 1: ELECTRICAL */}
      {activeCategory === 'electrical' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card 1: Ohm's Law */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                Ohm's Law Solver (V = I × R)
              </h3>
              <span className="text-[11px] font-mono-math px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                Leave 1 empty to solve
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Voltage (V)</label>
                <input
                  type="number"
                  value={ohmsV}
                  onChange={(e) => setOhmsV(e.target.value)}
                  placeholder="e.g. 12"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Current (I, A)</label>
                <input
                  type="number"
                  value={ohmsI}
                  onChange={(e) => setOhmsI(e.target.value)}
                  placeholder="e.g. 0.5"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Resistance (R, Ω)</label>
                <input
                  type="number"
                  value={ohmsR}
                  onChange={(e) => setOhmsR(e.target.value)}
                  placeholder="e.g. 24"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {ohmsError && (
              <p className="text-xs text-rose-500 bg-rose-500/10 p-2 rounded-lg">{ohmsError}</p>
            )}

            <button
              type="button"
              onClick={handleSolveOhms}
              className="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors shadow-sm"
            >
              Solve Unknown Variable
            </button>

            {ohmsResult && (
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                    Solved {ohmsResult.solvedVariable}:
                  </span>
                  <span className="text-sm font-mono-math font-bold text-amber-500">
                    {ohmsResult.value} {ohmsResult.unit}
                  </span>
                </div>
                <div className="text-[11px] font-mono-math text-slate-500 space-y-0.5">
                  {ohmsResult.steps.map((st: string, idx: number) => (
                    <div key={idx}>{st}</div>
                  ))}
                </div>
                {onSendToCalculator && (
                  <button
                    type="button"
                    onClick={() => onSendToCalculator(String(ohmsResult.value))}
                    className="self-end text-[11px] flex items-center gap-1 text-cyan-500 hover:underline"
                  >
                    <span>Insert {ohmsResult.value}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Card 2: Electrical Power */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-500" />
              Electrical Power (P = V × I)
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="eng-power-voltage" className="block text-[11px] font-medium text-slate-500 mb-1">Voltage (V)</label>
                <input
                  id="eng-power-voltage"
                  type="number"
                  value={pwrV}
                  onChange={(e) => setPwrV(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label htmlFor="eng-power-current" className="block text-[11px] font-medium text-slate-500 mb-1">Current (A)</label>
                <input
                  id="eng-power-current"
                  type="number"
                  value={pwrI}
                  onChange={(e) => setPwrI(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {pwrError && (
              <p className="text-xs text-rose-500 bg-rose-500/10 p-2 rounded-lg">{pwrError}</p>
            )}

            <button
              type="button"
              onClick={handleCalcPower}
              className="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors shadow-sm"
            >
              Calculate Power (Watts)
            </button>

            {pwrResult && (
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                    Calculated Power:
                  </span>
                  <span className="text-sm font-mono-math font-bold text-amber-500">
                    {pwrResult.powerWatts} W
                  </span>
                </div>
                {onSendToCalculator && (
                  <button
                    type="button"
                    onClick={() => onSendToCalculator(String(pwrResult.powerWatts))}
                    className="self-end text-[11px] flex items-center gap-1 text-cyan-500 hover:underline"
                  >
                    <span>Insert {pwrResult.powerWatts} W</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* CATEGORY 2: MECHANICS */}
      {activeCategory === 'mechanics' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card 1: Force F = ma */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-500" />
              Newton's Second Law: Force (F = m × a)
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Mass (kg)</label>
                <input
                  type="number"
                  value={forceMass}
                  onChange={(e) => setForceMass(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Acceleration (m/s²)</label>
                <input
                  type="number"
                  value={forceAccel}
                  onChange={(e) => setForceAccel(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {forceError && (
              <p className="text-xs text-rose-500 bg-rose-500/10 p-2 rounded-lg">{forceError}</p>
            )}

            <button
              type="button"
              onClick={handleCalcForce}
              className="w-full py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors shadow-sm"
            >
              Calculate Force (Newtons)
            </button>

            {forceResult && (
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                    Net Force:
                  </span>
                  <span className="text-sm font-mono-math font-bold text-cyan-400">
                    {forceResult.forceNewtons} N
                  </span>
                </div>
                {onSendToCalculator && (
                  <button
                    type="button"
                    onClick={() => onSendToCalculator(String(forceResult.forceNewtons))}
                    className="self-end text-[11px] flex items-center gap-1 text-cyan-500 hover:underline"
                  >
                    <span>Insert {forceResult.forceNewtons} N</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Card 2: Kinetic Energy */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-500" />
              Kinetic Energy (E_k = ½ × m × v²)
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Mass (kg)</label>
                <input
                  type="number"
                  value={keMass}
                  onChange={(e) => setKeMass(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Velocity (m/s)</label>
                <input
                  type="number"
                  value={keVel}
                  onChange={(e) => setKeVel(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {keError && (
              <p className="text-xs text-rose-500 bg-rose-500/10 p-2 rounded-lg">{keError}</p>
            )}

            <button
              type="button"
              onClick={handleCalcKE}
              className="w-full py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors shadow-sm"
            >
              Calculate Kinetic Energy (Joules)
            </button>

            {keResult && (
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                    Kinetic Energy:
                  </span>
                  <span className="text-sm font-mono-math font-bold text-cyan-400">
                    {keResult.energyJoules} J
                  </span>
                </div>
                {onSendToCalculator && (
                  <button
                    type="button"
                    onClick={() => onSendToCalculator(String(keResult.energyJoules))}
                    className="self-end text-[11px] flex items-center gap-1 text-cyan-500 hover:underline"
                  >
                    <span>Insert {keResult.energyJoules} J</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* CATEGORY 3: PHYSICS & FLUIDS */}
      {activeCategory === 'physics' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card 1: Density */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Gauge className="w-4 h-4 text-emerald-500" />
              Density (ρ = m / V)
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Mass (kg)</label>
                <input
                  type="number"
                  value={densMass}
                  onChange={(e) => setDensMass(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Volume (m³)</label>
                <input
                  type="number"
                  value={densVol}
                  onChange={(e) => setDensVol(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {densError && (
              <p className="text-xs text-rose-500 bg-rose-500/10 p-2 rounded-lg">{densError}</p>
            )}

            <button
              type="button"
              onClick={handleCalcDensity}
              className="w-full py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors shadow-sm"
            >
              Calculate Density (kg/m³)
            </button>

            {densResult && (
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                    Density:
                  </span>
                  <span className="text-sm font-mono-math font-bold text-emerald-500">
                    {densResult.densityKgM3} kg/m³
                  </span>
                </div>
                {onSendToCalculator && (
                  <button
                    type="button"
                    onClick={() => onSendToCalculator(String(densResult.densityKgM3))}
                    className="self-end text-[11px] flex items-center gap-1 text-cyan-500 hover:underline"
                  >
                    <span>Insert {densResult.densityKgM3}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Card 2: Pressure */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Gauge className="w-4 h-4 text-emerald-500" />
              Pressure (P = F / A)
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Force (N)</label>
                <input
                  type="number"
                  value={presForce}
                  onChange={(e) => setPresForce(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Area (m²)</label>
                <input
                  type="number"
                  value={presArea}
                  onChange={(e) => setPresArea(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {presError && (
              <p className="text-xs text-rose-500 bg-rose-500/10 p-2 rounded-lg">{presError}</p>
            )}

            <button
              type="button"
              onClick={handleCalcPressure}
              className="w-full py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors shadow-sm"
            >
              Calculate Pressure (Pascals)
            </button>

            {presResult && (
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                    Pressure:
                  </span>
                  <span className="text-sm font-mono-math font-bold text-emerald-500">
                    {presResult.pressurePascals} Pa
                  </span>
                </div>
                {onSendToCalculator && (
                  <button
                    type="button"
                    onClick={() => onSendToCalculator(String(presResult.pressurePascals))}
                    className="self-end text-[11px] flex items-center gap-1 text-cyan-500 hover:underline"
                  >
                    <span>Insert {presResult.pressurePascals} Pa</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
