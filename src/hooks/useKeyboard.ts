import { useEffect, useRef } from 'react';
import { shouldHandleCalculatorShortcut } from '../utils/keyboardGuards';

interface KeyboardHandlers {
  onDigit: (d: string) => void;
  onDecimal: () => void;
  onOperator: (op: string) => void;
  onParenthesis: (p: '(' | ')') => void;
  onCalculate: () => void;
  onClear: () => void;
  onBackspace: () => void;
  onFactorial: () => void;
}

export function useKeyboard(handlers: KeyboardHandlers, isEnabled: boolean = true) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!isEnabled) return;

    function handleKeyDown(e: KeyboardEvent) {
      const hasActiveModal = Boolean(
        document.querySelector('[role="dialog"], [aria-modal="true"]')
      );
      if (!shouldHandleCalculatorShortcut(e, hasActiveModal)) return;

      const currentHandlers = handlersRef.current;
      const key = e.key;

      // Digits 0-9
      if (/^[0-9]$/.test(key)) {
        e.preventDefault();
        currentHandlers.onDigit(key);
        return;
      }

      // Operators
      if (['+', '-', '*', '/'].includes(key)) {
        e.preventDefault();
        currentHandlers.onOperator(key);
        return;
      }

      if (key === '^') {
        e.preventDefault();
        currentHandlers.onOperator('^');
        return;
      }

      if (key === '%') {
        e.preventDefault();
        currentHandlers.onOperator('%');
        return;
      }

      if (key === '!') {
        e.preventDefault();
        currentHandlers.onFactorial();
        return;
      }

      // Parentheses
      if (key === '(' || key === ')') {
        e.preventDefault();
        currentHandlers.onParenthesis(key);
        return;
      }

      // Decimal point
      if (key === '.' || key === ',') {
        e.preventDefault();
        currentHandlers.onDecimal();
        return;
      }

      // Calculate: Enter or = key
      if (key === 'Enter' || key === '=') {
        e.preventDefault();
        currentHandlers.onCalculate();
        return;
      }

      // Backspace: Backspace or Delete key
      if (key === 'Backspace' || key === 'Delete') {
        e.preventDefault();
        currentHandlers.onBackspace();
        return;
      }

      // Clear All: Escape key
      if (key === 'Escape') {
        e.preventDefault();
        currentHandlers.onClear();
        return;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEnabled]);
}
