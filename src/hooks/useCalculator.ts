import { useState, useEffect, useCallback, useMemo } from 'react';
import { AngleMode, HistoryItem } from '../types';
import {
  calculateExpression,
  formatResult,
  sanitizeNumber,
  decimalToFraction,
  formatEngineeringNotation,
} from '../engine/mathEngine';

const STORAGE_KEY_HISTORY = 'calc_history_records';
const STORAGE_KEY_ANGLE = 'calc_angle_mode';
const STORAGE_KEY_MEMORY = 'calc_memory_value';
const STORAGE_KEY_SLOTS = 'calc_memory_slots';

export function useCalculator() {
  const [expression, setExpression] = useState<string>('');
  const [currentInput, setCurrentInput] = useState<string>('0');
  const [isCalculated, setIsCalculated] = useState<boolean>(false);
  const [lastAnswer, setLastAnswer] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  // Sub-modes inside Scientific Calculator: Standard, Scientific, Engineering
  const [subMode, setSubMode] = useState<'standard' | 'scientific' | 'engineering'>('scientific');

  // Display Precision: 'auto' | 2 | 4 | 6 | 8 | 10
  const [precision, setPrecision] = useState<'auto' | 2 | 4 | 6 | 8 | 10>('auto');

  // Alternative representations of last computed value
  const [fractionDisplay, setFractionDisplay] = useState<string | null>(null);
  const [engineeringDisplay, setEngineeringDisplay] = useState<string | null>(null);

  // Angle mode (DEG, RAD, GRAD)
  const [angleMode, setAngleModeState] = useState<AngleMode>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ANGLE);
      if (saved === 'DEG' || saved === 'RAD' || saved === 'GRAD') return saved;
    } catch {}
    return 'DEG';
  });

  // Primary Memory (M)
  const [memory, setMemoryState] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MEMORY);
      if (saved !== null) {
        const val = parseFloat(saved);
        if (!Number.isNaN(val)) return val;
      }
    } catch {}
    return 0;
  });

  const [hasMemory, setHasMemory] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MEMORY);
      return saved !== null && saved !== '0';
    } catch {}
    return false;
  });

  // Named Memory Slots (A, B, C) - Phase 19 Memory System 2.0
  const [memorySlots, setMemorySlots] = useState<{ A: number; B: number; C: number }>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SLOTS);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
    return { A: 0, B: 0, C: 0 };
  });

  // History
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_HISTORY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed.slice(0, 100);
      }
    } catch (e) {
      console.warn('Failed to parse calculator history, resetting:', e);
    }
    return [];
  });

  // Save angle mode changes
  const setAngleMode = useCallback((mode: AngleMode) => {
    setAngleModeState(mode);
    try {
      localStorage.setItem(STORAGE_KEY_ANGLE, mode);
    } catch {}
  }, []);

  // Save memory changes
  const updateMemory = useCallback((val: number) => {
    const sanitized = sanitizeNumber(val);
    setMemoryState(sanitized);
    setHasMemory(sanitized !== 0);
    try {
      localStorage.setItem(STORAGE_KEY_MEMORY, String(sanitized));
    } catch {}
  }, []);

  // Save memory slots
  const storeMemorySlot = useCallback((slot: 'A' | 'B' | 'C') => {
    const val = parseFloat(currentInput);
    if (!Number.isNaN(val)) {
      setMemorySlots((prev) => {
        const updated = { ...prev, [slot]: sanitizeNumber(val) };
        try {
          localStorage.setItem(STORAGE_KEY_SLOTS, JSON.stringify(updated));
        } catch {}
        return updated;
      });
    }
  }, [currentInput]);

  const recallMemorySlot = useCallback((slot: 'A' | 'B' | 'C') => {
    const val = memorySlots[slot];
    if (val !== undefined) {
      setCurrentInput(formatResult(val));
      setIsCalculated(false);
    }
  }, [memorySlots]);

  const clearMemorySlot = useCallback((slot: 'A' | 'B' | 'C') => {
    setMemorySlots((prev) => {
      const updated = { ...prev, [slot]: 0 };
      try {
        localStorage.setItem(STORAGE_KEY_SLOTS, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  // Save history changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history));
    } catch {}
  }, [history]);

  // Live preview evaluation
  const livePreview = useMemo(() => {
    if (error) return null;
    const fullExpr = expression + (currentInput !== '0' || expression === '' ? currentInput : '');
    if (!fullExpr || isCalculated) return null;

    // Avoid previewing trailing open operators
    if (/[\+\-\*\/\^\(]\s*$/.test(fullExpr)) return null;

    try {
      const res = calculateExpression(fullExpr, angleMode);
      if (!res.error && Number.isFinite(res.value)) {
        if (precision !== 'auto') {
          return res.value.toFixed(precision);
        }
        return res.display;
      }
    } catch {}
    return null;
  }, [expression, currentInput, isCalculated, angleMode, error, precision]);

  // Input Digit
  const inputDigit = useCallback((digit: string) => {
    setError(null);
    if (isCalculated) {
      setExpression('');
      setCurrentInput(digit);
      setIsCalculated(false);
      return;
    }

    if (currentInput === '0') {
      setCurrentInput(digit);
    } else {
      setCurrentInput((prev) => prev + digit);
    }
  }, [isCalculated, currentInput]);

  // Input Decimal
  const inputDecimal = useCallback(() => {
    setError(null);
    if (isCalculated) {
      setExpression('');
      setCurrentInput('0.');
      setIsCalculated(false);
      return;
    }

    if (!currentInput.includes('.')) {
      setCurrentInput((prev) => (prev === '' ? '0.' : prev + '.'));
    }
  }, [isCalculated, currentInput]);

  // Input Operator (+, -, *, /, ^, %, mod)
  const inputOperator = useCallback((op: string) => {
    setError(null);
    let sym = op;
    if (sym === '×') sym = '*';
    if (sym === '÷') sym = '/';
    if (sym === '−') sym = '-';

    if (isCalculated) {
      setExpression(currentInput + ' ' + sym + ' ');
      setCurrentInput('0');
      setIsCalculated(false);
      return;
    }

    if (currentInput !== '0' && currentInput !== '') {
      setExpression((prev) => prev + currentInput + ' ' + sym + ' ');
      setCurrentInput('0');
    } else if (expression.length > 0) {
      const trimmed = expression.trim();
      const updated = trimmed.replace(/[\+\-\*\/\^\%]|mod$/, sym);
      setExpression(updated + ' ');
    } else if (sym === '-') {
      setCurrentInput('-');
    }
  }, [isCalculated, currentInput, expression]);

  // Input Function (sin(, cos(, sqrt(, etc.)
  const inputFunction = useCallback((fn: string) => {
    setError(null);
    if (isCalculated) {
      setExpression(fn);
      setCurrentInput('0');
      setIsCalculated(false);
      return;
    }

    if (currentInput !== '0' && currentInput !== '') {
      setExpression((prev) => prev + currentInput + ' * ' + fn);
    } else {
      setExpression((prev) => prev + fn);
    }
    setCurrentInput('0');
  }, [isCalculated, currentInput]);

  // Input Constant (pi, e, phi)
  const inputConstant = useCallback((c: string) => {
    setError(null);
    let val = c;
    if (c === 'π' || c === 'pi') val = 'π';
    if (c === 'e') val = 'e';
    if (c === 'φ' || c === 'phi') val = 'φ';

    if (isCalculated || currentInput === '0') {
      setCurrentInput(val);
      setIsCalculated(false);
    } else {
      setExpression((prev) => prev + currentInput + ' * ');
      setCurrentInput(val);
    }
  }, [isCalculated, currentInput]);

  // Input Parenthesis
  const inputParenthesis = useCallback((paren: '(' | ')') => {
    setError(null);
    if (paren === '(') {
      if (currentInput !== '0' && currentInput !== '') {
        setExpression((prev) => prev + currentInput + ' * (');
      } else {
        setExpression((prev) => prev + '(');
      }
      setCurrentInput('0');
    } else {
      if (currentInput !== '0' && currentInput !== '') {
        setExpression((prev) => prev + currentInput + ')');
        setCurrentInput('0');
      } else {
        setExpression((prev) => prev + ')');
      }
    }
  }, [currentInput]);

  // Scientific Notation Exp (1e5)
  const inputExp = useCallback(() => {
    setError(null);
    if (!currentInput.includes('e') && !currentInput.includes('E')) {
      setCurrentInput((prev) => (prev === '0' ? '1e' : prev + 'e'));
    }
  }, [currentInput]);

  // Factorial (!)
  const inputFactorial = useCallback(() => {
    setError(null);
    if (currentInput !== '0' && currentInput !== '') {
      setCurrentInput((prev) => prev + '!');
    } else if (expression.length > 0) {
      setExpression((prev) => prev.trim() + '! ');
    }
  }, [currentInput, expression]);

  // Toggle Sign (+/-)
  const toggleSign = useCallback(() => {
    if (currentInput === '0') return;
    if (currentInput.startsWith('-')) {
      setCurrentInput(currentInput.slice(1));
    } else {
      setCurrentInput('-' + currentInput);
    }
  }, [currentInput]);

  // Percentage Action (%)
  const inputPercentage = useCallback(() => {
    setError(null);
    if (currentInput !== '0') {
      const num = parseFloat(currentInput);
      if (!Number.isNaN(num)) {
        setCurrentInput(formatResult(num / 100));
      }
    }
  }, [currentInput]);

  // Reciprocal (1/x)
  const inputReciprocal = useCallback(() => {
    setError(null);
    const num = parseFloat(currentInput);
    if (Number.isNaN(num) || num === 0) {
      setError('Cannot divide by zero');
      return;
    }
    const res = 1 / num;
    setCurrentInput(formatResult(sanitizeNumber(res)));
  }, [currentInput]);

  // Square (x^2)
  const inputSquare = useCallback(() => {
    setError(null);
    if (currentInput !== '0' && currentInput !== '') {
      setCurrentInput((prev) => prev + '^2');
    }
  }, [currentInput]);

  // Clear All (AC)
  const clearAll = useCallback(() => {
    setExpression('');
    setCurrentInput('0');
    setIsCalculated(false);
    setError(null);
    setFractionDisplay(null);
    setEngineeringDisplay(null);
  }, []);

  // Clear Entry (CE)
  const clearEntry = useCallback(() => {
    setCurrentInput('0');
    setError(null);
  }, []);

  // Backspace
  const backspace = useCallback(() => {
    if (isCalculated) {
      clearAll();
      return;
    }
    if (currentInput.length > 1) {
      setCurrentInput((prev) => prev.slice(0, -1));
    } else if (currentInput !== '0') {
      setCurrentInput('0');
    } else if (expression.length > 0) {
      setExpression((prev) => prev.slice(0, -1).trimEnd());
    }
  }, [isCalculated, currentInput, expression, clearAll]);

  // Execute Calculation (=)
  const calculate = useCallback(() => {
    setError(null);
    let fullExpr = expression;
    if (currentInput !== '0' || fullExpr === '') {
      fullExpr += currentInput;
    }
    fullExpr = fullExpr.trim();

    if (!fullExpr) return;

    const res = calculateExpression(fullExpr, angleMode);

    if (res.error) {
      setError(res.error);
      return;
    }

    setLastAnswer(res.value);

    let displayVal = res.display;
    if (precision !== 'auto') {
      displayVal = res.value.toFixed(precision);
    }

    setCurrentInput(displayVal);
    setExpression(fullExpr + ' =');
    setIsCalculated(true);

    // Compute alternative representations
    const frac = decimalToFraction(res.value);
    setFractionDisplay(frac ? `${frac.numerator}/${frac.denominator}` : null);

    const eng = formatEngineeringNotation(res.value);
    setEngineeringDisplay(eng ? eng.display : null);

    // Append to history
    const newItem: HistoryItem = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      expression: fullExpr,
      result: displayVal,
      angleMode,
      timestamp: Date.now(),
      verified: true,
    };
    setHistory((prev) => [newItem, ...prev.slice(0, 99)]);
  }, [expression, currentInput, angleMode, precision]);

  // Toggle Exact Fraction <-> Decimal
  const toggleExactFraction = useCallback(() => {
    if (!fractionDisplay) return;
    if (currentInput === fractionDisplay) {
      setCurrentInput(precision === 'auto' ? formatResult(lastAnswer) : lastAnswer.toFixed(precision));
    } else {
      setCurrentInput(fractionDisplay);
    }
  }, [fractionDisplay, currentInput, lastAnswer, precision]);

  // Memory Actions
  const memoryClear = useCallback(() => {
    updateMemory(0);
  }, [updateMemory]);

  const memoryRecall = useCallback(() => {
    if (!hasMemory) return;
    setCurrentInput(formatResult(memory));
    setIsCalculated(false);
  }, [hasMemory, memory]);

  const memoryStore = useCallback(() => {
    const val = parseFloat(currentInput);
    if (!Number.isNaN(val)) {
      updateMemory(val);
    }
  }, [currentInput, updateMemory]);

  const memoryAdd = useCallback(() => {
    const val = parseFloat(currentInput);
    if (!Number.isNaN(val)) {
      updateMemory(memory + val);
    }
  }, [currentInput, memory, updateMemory]);

  const memorySubtract = useCallback(() => {
    const val = parseFloat(currentInput);
    if (!Number.isNaN(val)) {
      updateMemory(memory - val);
    }
  }, [currentInput, memory, updateMemory]);

  // History Actions
  const reuseHistory = useCallback((item: HistoryItem) => {
    setExpression('');
    setCurrentInput(item.result);
    setIsCalculated(false);
    setError(null);
  }, []);

  const toggleHistoryFavorite = useCallback((id: string) => {
    setHistory((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isFavorite: !item.isFavorite } : item))
    );
  }, []);

  const addHistoryNote = useCallback((id: string, note: string) => {
    setHistory((prev) =>
      prev.map((item) => (item.id === id ? { ...item, note } : item))
    );
  }, []);

  const deleteHistoryItem = useCallback((id: string) => {
    setHistory((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    try {
      localStorage.removeItem(STORAGE_KEY_HISTORY);
    } catch {}
  }, []);

  const applyExpressionDirectly = useCallback((expr: string) => {
    setExpression('');
    setCurrentInput(expr);
    setIsCalculated(false);
    setError(null);
  }, []);

  const applyExpressionAndCalculate = useCallback((expr: string) => {
    const clean = expr.trim();
    if (!clean) return;
    setError(null);

    const res = calculateExpression(clean, angleMode);
    if (res.error) {
      setExpression('');
      setCurrentInput(clean);
      setIsCalculated(false);
      setError(res.error);
      return;
    }

    setLastAnswer(res.value);
    const displayVal = precision === 'auto' ? res.display : res.value.toFixed(precision);
    setCurrentInput(displayVal);
    setExpression(clean + ' =');
    setIsCalculated(true);

    const frac = decimalToFraction(res.value);
    setFractionDisplay(frac ? `${frac.numerator}/${frac.denominator}` : null);
    const eng = formatEngineeringNotation(res.value);
    setEngineeringDisplay(eng ? eng.display : null);

    const newItem: HistoryItem = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      expression: clean,
      result: displayVal,
      angleMode,
      timestamp: Date.now(),
      verified: true,
    };
    setHistory((prev) => [newItem, ...prev.slice(0, 99)]);
  }, [angleMode, precision]);

  return {
    expression,
    currentInput,
    isCalculated,
    livePreview,
    lastAnswer,
    error,
    angleMode,
    subMode,
    precision,
    fractionDisplay,
    engineeringDisplay,
    memory,
    hasMemory,
    memorySlots,
    history,
    setSubMode,
    setPrecision,
    setAngleMode,
    inputDigit,
    inputDecimal,
    inputOperator,
    inputFunction,
    inputConstant,
    inputParenthesis,
    inputExp,
    inputFactorial,
    inputPercentage,
    inputReciprocal,
    inputSquare,
    toggleSign,
    clearAll,
    clearEntry,
    backspace,
    calculate,
    memoryClear,
    memoryRecall,
    memoryStore,
    memoryAdd,
    memorySubtract,
    storeMemorySlot,
    recallMemorySlot,
    clearMemorySlot,
    reuseHistory,
    toggleHistoryFavorite,
    addHistoryNote,
    deleteHistoryItem,
    clearHistory,
    applyExpressionDirectly,
    applyExpressionAndCalculate,
    toggleExactFraction,
  };
}
