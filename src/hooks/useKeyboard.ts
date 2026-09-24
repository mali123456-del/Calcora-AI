import { useEffect } from 'react';

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
  useEffect(() => {
    if (!isEnabled) return;

    function handleKeyDown(e: KeyboardEvent) {
      // Do not capture if typing in an input, textarea, or contentEditable element
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          (activeEl as HTMLElement).isContentEditable)
      ) {
        return;
      }

      // Do not capture if any modal dialog is currently active in the document
      const hasActiveModal = Boolean(
        document.querySelector('[role="dialog"], [aria-modal="true"]')
      );
      if (hasActiveModal) {
        return;
      }

      const key = e.key;

      // Digits 0-9
      if (/^[0-9]$/.test(key)) {
        e.preventDefault();
        handlers.onDigit(key);
        return;
      }

      // Operators
      if (['+', '-', '*', '/'].includes(key)) {
        e.preventDefault();
        handlers.onOperator(key);
        return;
      }

      if (key === '^') {
        e.preventDefault();
        handlers.onOperator('^');
        return;
      }

      if (key === '%') {
        e.preventDefault();
        handlers.onOperator('%');
        return;
      }

      if (key === '!') {
        e.preventDefault();
        handlers.onFactorial();
        return;
      }

      // Parentheses
      if (key === '(' || key === ')') {
        e.preventDefault();
        handlers.onParenthesis(key);
        return;
      }

      // Decimal point
      if (key === '.' || key === ',') {
        e.preventDefault();
        handlers.onDecimal();
        return;
      }

      // Calculate: Enter or = key
      if (key === 'Enter' || key === '=') {
        e.preventDefault();
        handlers.onCalculate();
        return;
      }

      // Backspace: Backspace or Delete key
      if (key === 'Backspace' || key === 'Delete') {
        e.preventDefault();
        handlers.onBackspace();
        return;
      }

      // Clear All: Escape key
      if (key === 'Escape') {
        e.preventDefault();
        handlers.onClear();
        return;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers, isEnabled]);
}
