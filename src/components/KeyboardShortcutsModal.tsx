import React, { useEffect, useRef } from 'react';
import { Keyboard, X } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { keys: ['0–9'], action: 'Enter a digit' },
  { keys: ['+', '−', '*', '/'], action: 'Add, subtract, multiply, or divide' },
  { keys: ['^'], action: 'Enter a power operator' },
  { keys: ['%'], action: 'Enter the calculator’s percent operator' },
  { keys: ['!'], action: 'Apply factorial' },
  { keys: ['(', ')'], action: 'Insert parentheses' },
  { keys: ['.', ','], action: 'Enter a decimal point' },
  { keys: ['Enter', '='], action: 'Calculate the expression' },
  { keys: ['Backspace', 'Delete'], action: 'Remove the last entry' },
  { keys: ['Esc'], action: 'Clear the current calculation in Calculator mode' },
  { keys: ['Ctrl', '/', 'Cmd', 'K'], action: 'Open or close the command palette' },
  { keys: ['?'], action: 'Open this keyboard shortcuts guide' },
] as const;

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  'a[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({ isOpen, onClose }) => {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (!focusable?.length) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="keyboard-shortcuts-title"
        aria-describedby="keyboard-shortcuts-description"
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
      >
        <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-300">
              <Keyboard aria-hidden="true" size={20} />
            </span>
            <div>
              <h2 id="keyboard-shortcuts-title" className="text-base font-bold text-slate-900 dark:text-slate-100">Keyboard shortcuts</h2>
              <p id="keyboard-shortcuts-description" className="text-xs text-slate-500 dark:text-slate-400">Use your keyboard to calculate faster.</p>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close keyboard shortcuts"
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <X aria-hidden="true" size={18} />
          </button>
        </header>
        <div className="max-h-[65vh] overflow-y-auto px-5 py-3">
          <dl className="divide-y divide-slate-100 dark:divide-slate-800">
            {SHORTCUTS.map(({ keys, action }) => (
              <div key={action} className="flex items-center justify-between gap-4 py-3">
                <dt className="text-sm text-slate-700 dark:text-slate-200">{action}</dt>
                <dd className="flex shrink-0 flex-wrap justify-end gap-1">
                  {keys.map((key) => (
                    <kbd key={key} className="min-w-7 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-center font-mono text-xs text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      {key}
                    </kbd>
                  ))}
                </dd>
              </div>
            ))}
          </dl>
          <p className="pb-2 pt-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            Calculator shortcuts work only in Calculator mode and pause while an editable control or dialog is active.
          </p>
        </div>
      </section>
    </div>
  );
};
