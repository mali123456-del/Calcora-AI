import React, { useState, useMemo } from 'react';
import { UNIT_CATEGORIES, convertUnits } from '../engine/unitConverter';
import { UnitCategory } from '../types';
import {
  ArrowRightLeft,
  Ruler,
  Scale,
  Thermometer,
  Square,
  Box,
  Clock,
  Gauge,
  Database,
  Wind,
  Zap,
  Copy,
  Check,
  CornerDownRight,
} from 'lucide-react';

interface UnitConverterPanelProps {
  onApplyResultToCalculator?: (expr: string) => void;
}

const CATEGORY_ICONS: Record<string, React.FC<{ className?: string }>> = {
  Ruler,
  Scale,
  Thermometer,
  Square,
  Box,
  Clock,
  Gauge,
  Database,
  Wind,
  Zap,
};

export const UnitConverterPanel: React.FC<UnitConverterPanelProps> = ({
  onApplyResultToCalculator,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<UnitCategory>('length');
  const [inputValue, setInputValue] = useState<string>('1');
  const [copied, setCopied] = useState<boolean>(false);

  const currentCategoryData = useMemo(() => {
    return UNIT_CATEGORIES.find((c) => c.id === selectedCategory) || UNIT_CATEGORIES[0];
  }, [selectedCategory]);

  const [fromUnitId, setFromUnitId] = useState<string>(() => currentCategoryData.units[0].id);
  const [toUnitId, setToUnitId] = useState<string>(
    () => currentCategoryData.units[1]?.id || currentCategoryData.units[0].id
  );

  // When category changes, reset selected units to defaults of that category
  const handleCategoryChange = (catId: UnitCategory) => {
    setSelectedCategory(catId);
    const cat = UNIT_CATEGORIES.find((c) => c.id === catId);
    if (cat && cat.units.length > 1) {
      setFromUnitId(cat.units[0].id);
      setToUnitId(cat.units[1].id);
    }
  };

  const handleSwap = () => {
    const temp = fromUnitId;
    setFromUnitId(toUnitId);
    setToUnitId(temp);
  };

  const conversion = useMemo(() => {
    const val = parseFloat(inputValue);
    try {
      return convertUnits(
        selectedCategory,
        fromUnitId,
        toUnitId,
        Number.isNaN(val) ? 0 : val
      );
    } catch {
      return { result: 0, display: '0', formula: '' };
    }
  }, [selectedCategory, fromUnitId, toUnitId, inputValue]);

  const handleCopy = () => {
    navigator.clipboard?.writeText(conversion.display);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full flex flex-col gap-5">
      {/* Category Pills Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {UNIT_CATEGORIES.map((cat) => {
          const Icon = CATEGORY_ICONS[cat.iconName] || Ruler;
          const isActive = cat.id === selectedCategory;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleCategoryChange(cat.id as UnitCategory)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'bg-slate-900/60 dark:bg-slate-900/60 light:bg-slate-100 text-slate-400 dark:text-slate-400 light:text-slate-600 hover:text-white dark:hover:text-white hover:bg-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{cat.name}</span>
            </button>
          );
        })}
      </div>

      {/* Main Conversion Workspace */}
      <div className="p-5 sm:p-6 rounded-2xl bg-slate-900/90 dark:bg-slate-900/90 light:bg-white border border-slate-800 dark:border-slate-800 light:border-slate-300 shadow-sm flex flex-col gap-6">
        <div className="grid grid-cols-1 md:grid-cols-11 gap-4 items-center">
          {/* FROM SECTION (5 cols) */}
          <div className="md:col-span-5 flex flex-col gap-2">
            <label className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
              From
            </label>
            <input
              id="unit-input-value"
              type="number"
              step="any"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Value"
              className="w-full px-4 py-3 rounded-xl bg-slate-950/80 dark:bg-slate-950/80 light:bg-slate-50 border border-slate-800 dark:border-slate-800 light:border-slate-300 text-white dark:text-white light:text-slate-900 font-mono-math text-lg focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
            />
            <select
              id="unit-select-from"
              value={fromUnitId}
              onChange={(e) => setFromUnitId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-800/80 dark:bg-slate-800/80 light:bg-slate-100 border border-slate-700/80 dark:border-slate-700/80 light:border-slate-300 text-slate-200 dark:text-slate-200 light:text-slate-800 text-sm font-medium focus:outline-none"
            >
              {currentCategoryData.units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.symbol})
                </option>
              ))}
            </select>
          </div>

          {/* SWAP BUTTON (1 col) */}
          <div className="md:col-span-1 flex justify-center py-2">
            <button
              id="btn-unit-swap"
              type="button"
              onClick={handleSwap}
              className="w-10 h-10 rounded-full bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 text-slate-300 flex items-center justify-center transition-all shadow-md active:scale-90"
              title="Swap From and To units"
            >
              <ArrowRightLeft className="w-4 h-4" />
            </button>
          </div>

          {/* TO SECTION (5 cols) */}
          <div className="md:col-span-5 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                To (Converted)
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                  title="Copy result"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <div className="w-full px-4 py-3 rounded-xl bg-slate-950/80 dark:bg-slate-950/80 light:bg-slate-50 border border-slate-800 dark:border-slate-800 light:border-slate-300 text-cyan-400 dark:text-cyan-400 light:text-cyan-700 font-mono-math text-lg font-bold overflow-x-auto whitespace-nowrap">
              {conversion.display}
            </div>

            <select
              id="unit-select-to"
              value={toUnitId}
              onChange={(e) => setToUnitId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-800/80 dark:bg-slate-800/80 light:bg-slate-100 border border-slate-700/80 dark:border-slate-700/80 light:border-slate-300 text-slate-200 dark:text-slate-200 light:text-slate-800 text-sm font-medium focus:outline-none"
            >
              {currentCategoryData.units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.symbol})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Footer: Formula & Apply to Calculator Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-800 dark:border-slate-800 light:border-slate-200 text-xs">
          <div className="font-mono-math text-slate-400 dark:text-slate-400 light:text-slate-600">
            Conversion Factor: <span className="text-slate-200 dark:text-slate-200 light:text-slate-900 font-semibold">{conversion.formula}</span>
          </div>

          {onApplyResultToCalculator && (
            <button
              type="button"
              onClick={() => onApplyResultToCalculator(conversion.display)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/20 font-medium transition-colors"
            >
              <span>Apply to Calculator</span>
              <CornerDownRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
