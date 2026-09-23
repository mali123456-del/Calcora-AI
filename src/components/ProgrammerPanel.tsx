import React, { useState, useMemo } from 'react';
import { Binary, RotateCcw, ArrowRight, Copy, Check } from 'lucide-react';
import {
  BitWidth,
  parseNumberInBase,
  formatNumberInBases,
  performBitwiseOp,
  performBitShift,
} from '../engine/programmerEngine';

interface ProgrammerPanelProps {
  onSendToCalculator?: (expr: string) => void;
}

export const ProgrammerPanel: React.FC<ProgrammerPanelProps> = ({ onSendToCalculator }) => {
  const [bitWidth, setBitWidth] = useState<BitWidth>(32);
  const [currentVal, setCurrentVal] = useState<bigint>(0n);
  const [storedVal, setStoredVal] = useState<bigint | null>(null);
  const [pendingOp, setPendingOp] = useState<
    'AND' | 'OR' | 'XOR' | 'NAND' | 'NOR' | 'XNOR' | 'SHL' | 'SHR' | 'ROL' | 'ROR' | null
  >(null);
  const [copiedBase, setCopiedBase] = useState<string | null>(null);

  // Formatted representations across bases
  const bases = useMemo(() => {
    return formatNumberInBases(currentVal, bitWidth);
  }, [currentVal, bitWidth]);

  // Handle typing from inputs
  const handleInputChange = (base: 'HEX' | 'DEC' | 'OCT' | 'BIN', text: string) => {
    try {
      const parsed = parseNumberInBase(text, base, bitWidth);
      setCurrentVal(parsed);
    } catch {
      // allow typing intermediate
    }
  };

  // Flip an individual bit from visual grid
  const handleToggleBit = (bitIndex: number) => {
    const mask = 1n << BigInt(bitIndex);
    const updated = currentVal ^ mask;
    setCurrentVal(parseNumberInBase(updated.toString(), 'DEC', bitWidth));
  };

  // Run bitwise action
  const handleBitwiseClick = (
    op: 'AND' | 'OR' | 'XOR' | 'NAND' | 'NOR' | 'XNOR' | 'SHL' | 'SHR' | 'ROL' | 'ROR'
  ) => {
    setStoredVal(currentVal);
    setPendingOp(op);
    setCurrentVal(0n);
  };

  const handleExecute = () => {
    if (storedVal !== null && pendingOp) {
      if (['SHL', 'SHR', 'ROL', 'ROR'].includes(pendingOp)) {
        const shiftAmt = Number(currentVal);
        const res = performBitShift(storedVal, pendingOp as any, shiftAmt, bitWidth);
        setCurrentVal(res);
      } else {
        const res = performBitwiseOp(storedVal, currentVal, pendingOp as any, bitWidth);
        setCurrentVal(res);
      }
      setStoredVal(null);
      setPendingOp(null);
    }
  };

  const handleNot = () => {
    const res = performBitwiseOp(currentVal, 0n, 'NOT', bitWidth);
    setCurrentVal(res);
  };

  const handleClear = () => {
    setCurrentVal(0n);
    setStoredVal(null);
    setPendingOp(null);
  };

  const copyToClipboard = (text: string, base: string) => {
    navigator.clipboard.writeText(text);
    setCopiedBase(base);
    setTimeout(() => setCopiedBase(null), 1500);
  };

  // Generate bit array for visual toggler (display up to bitWidth bits)
  const bitArray = useMemo(() => {
    const arr: { index: number; value: number }[] = [];
    for (let i = bitWidth - 1; i >= 0; i--) {
      const bit = Number((currentVal >> BigInt(i)) & 1n);
      arr.push({ index: i, value: bit });
    }
    return arr;
  }, [currentVal, bitWidth]);

  return (
    <div id="programmer-panel-container" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Binary className="w-5 h-5 text-indigo-500" />
            Programmer Calculator
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Base conversions (HEX, DEC, OCT, BIN), logic bitwise gates, and bit-level toggler
          </p>
        </div>

        {/* Word Size (8, 16, 32, 64-bit) */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
          {([8, 16, 32, 64] as BitWidth[]).map((w) => (
            <button
              key={w}
              onClick={() => {
                setBitWidth(w);
                setCurrentVal((prev) => parseNumberInBase(prev.toString(), 'DEC', w));
              }}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                bitWidth === w
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {w === 8 ? 'BYTE' : w === 16 ? 'WORD' : w === 32 ? 'DWORD' : 'QWORD'} ({w}b)
            </button>
          ))}
        </div>
      </div>

      {/* 4 Bases Synchronized View Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* HEX */}
        <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span className="font-semibold text-indigo-500">HEX (16)</span>
            <button
              onClick={() => copyToClipboard(bases.hex, 'HEX')}
              className="p-1 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              {copiedBase === 'HEX' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
          <input
            type="text"
            value={bases.hex}
            onChange={(e) => handleInputChange('HEX', e.target.value)}
            className="w-full font-mono text-base font-bold text-slate-900 dark:text-white bg-transparent focus:outline-hidden"
          />
        </div>

        {/* DEC */}
        <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span className="font-semibold text-emerald-500">DEC (10)</span>
            <button
              onClick={() => copyToClipboard(bases.dec, 'DEC')}
              className="p-1 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              {copiedBase === 'DEC' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
          <input
            type="text"
            value={bases.dec}
            onChange={(e) => handleInputChange('DEC', e.target.value)}
            className="w-full font-mono text-base font-bold text-slate-900 dark:text-white bg-transparent focus:outline-hidden"
          />
        </div>

        {/* OCT */}
        <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span className="font-semibold text-amber-500">OCT (8)</span>
            <button
              onClick={() => copyToClipboard(bases.oct, 'OCT')}
              className="p-1 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              {copiedBase === 'OCT' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
          <input
            type="text"
            value={bases.oct}
            onChange={(e) => handleInputChange('OCT', e.target.value)}
            className="w-full font-mono text-base font-bold text-slate-900 dark:text-white bg-transparent focus:outline-hidden"
          />
        </div>

        {/* BIN */}
        <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span className="font-semibold text-purple-500">BIN (2)</span>
            <button
              onClick={() => copyToClipboard(bases.bin, 'BIN')}
              className="p-1 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              {copiedBase === 'BIN' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
          <input
            type="text"
            value={bases.bin}
            onChange={(e) => handleInputChange('BIN', e.target.value)}
            className="w-full font-mono text-xs font-bold text-slate-900 dark:text-white bg-transparent focus:outline-hidden break-all"
          />
        </div>
      </div>

      {/* Visual Bit Toggler Matrix */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Interactive Bit Toggler ({bitWidth}-bit Register)
          </h3>
          <span className="text-[11px] text-slate-400">Click any bit to flip 0 ↔ 1</span>
        </div>

        <div className="flex flex-wrap gap-1.5 justify-center py-2 bg-slate-50 dark:bg-slate-800/40 rounded-xl p-3 border border-slate-200/80 dark:border-slate-800">
          {bitArray.map((b) => (
            <button
              key={b.index}
              onClick={() => handleToggleBit(b.index)}
              className={`w-7 h-9 flex flex-col items-center justify-center rounded-lg border text-xs font-mono transition-all ${
                b.value === 1
                  ? 'bg-indigo-600 border-indigo-700 text-white font-bold shadow-xs'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 hover:border-indigo-400'
              }`}
            >
              <span>{b.value}</span>
              <span className="text-[8px] opacity-60 leading-none">{b.index}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Bitwise Logic & Shift Operator Pad */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
        <button
          onClick={() => handleBitwiseClick('AND')}
          className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-colors ${
            pendingOp === 'AND'
              ? 'bg-indigo-600 text-white border-indigo-600'
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
          }`}
        >
          AND
        </button>
        <button
          onClick={() => handleBitwiseClick('OR')}
          className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-colors ${
            pendingOp === 'OR'
              ? 'bg-indigo-600 text-white border-indigo-600'
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
          }`}
        >
          OR
        </button>
        <button
          onClick={() => handleBitwiseClick('XOR')}
          className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-colors ${
            pendingOp === 'XOR'
              ? 'bg-indigo-600 text-white border-indigo-600'
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
          }`}
        >
          XOR
        </button>
        <button
          onClick={handleNot}
          className="py-2.5 px-3 rounded-xl text-xs font-bold border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        >
          NOT (~)
        </button>
        <button
          onClick={() => handleBitwiseClick('NAND')}
          className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-colors ${
            pendingOp === 'NAND'
              ? 'bg-indigo-600 text-white border-indigo-600'
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
          }`}
        >
          NAND
        </button>
        <button
          onClick={() => handleBitwiseClick('NOR')}
          className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-colors ${
            pendingOp === 'NOR'
              ? 'bg-indigo-600 text-white border-indigo-600'
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
          }`}
        >
          NOR
        </button>

        <button
          onClick={() => handleBitwiseClick('SHL')}
          className="py-2.5 px-3 rounded-xl text-xs font-bold border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        >
          Lsh (&lt;&lt;)
        </button>
        <button
          onClick={() => handleBitwiseClick('SHR')}
          className="py-2.5 px-3 rounded-xl text-xs font-bold border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        >
          Rsh (&gt;&gt;)
        </button>
        <button
          onClick={() => handleBitwiseClick('ROL')}
          className="py-2.5 px-3 rounded-xl text-xs font-bold border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        >
          RoL
        </button>
        <button
          onClick={() => handleBitwiseClick('ROR')}
          className="py-2.5 px-3 rounded-xl text-xs font-bold border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        >
          RoR
        </button>
        <button
          onClick={handleClear}
          className="py-2.5 px-3 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 transition-colors"
        >
          CLEAR
        </button>
        <button
          onClick={handleExecute}
          className="py-2.5 px-3 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors"
        >
          EXECUTE (=)
        </button>
      </div>

      {/* Send to Main Calculator */}
      {onSendToCalculator && (
        <div className="flex justify-end">
          <button
            onClick={() => onSendToCalculator(bases.dec)}
            className="text-xs text-indigo-500 hover:underline flex items-center gap-1 font-semibold"
          >
            <span>Send Decimal ({bases.dec}) to Scientific Calculator</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
