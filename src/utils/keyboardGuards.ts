type KeyboardEventLike = Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey'> & { target?: unknown };

type ElementLike = {
  tagName?: unknown;
  isContentEditable?: unknown;
  closest?: (selectors: string) => unknown;
  parentElement?: unknown;
};

const INTERACTIVE_TARGETS = [
  'input',
  'textarea',
  'select',
  'option',
  'button',
  'a[href]',
  'summary',
  '[contenteditable]:not([contenteditable="false"])',
  '[role="textbox"]',
  '[role="button"]',
  '[role="link"]',
  '[role="combobox"]',
  '[role="listbox"]',
  '[role="checkbox"]',
  '[role="radio"]',
  '[role="slider"]',
  '[role="spinbutton"]',
  '[role="switch"]',
  '[role="menuitem"]',
  '[role="tab"]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/** True when a key event originated inside a control that owns keyboard input. */
export function isInteractiveKeyboardTarget(target: unknown): boolean {
  if (!target || typeof target !== 'object') return false;

  const initial = target as ElementLike;
  const element = typeof initial.tagName === 'string'
    ? initial
    : initial.parentElement && typeof initial.parentElement === 'object'
      ? initial.parentElement as ElementLike
      : initial;
  const tagName = typeof element.tagName === 'string' ? element.tagName.toUpperCase() : '';

  if (['INPUT', 'TEXTAREA', 'SELECT', 'OPTION', 'BUTTON'].includes(tagName)) return true;
  if (element.isContentEditable === true) return true;
  return typeof element.closest === 'function' && Boolean(element.closest(INTERACTIVE_TARGETS));
}

/** Calculator key handling is reserved for unmodified keys outside controls and dialogs. */
export function shouldHandleCalculatorShortcut(event: KeyboardEventLike, hasOpenDialog: boolean): boolean {
  return !hasOpenDialog
    && !event.ctrlKey
    && !event.metaKey
    && !event.altKey
    && !isInteractiveKeyboardTarget(event.target);
}

export function shouldToggleCommandPalette(event: KeyboardEventLike, hasBlockingDialog: boolean): boolean {
  return (event.ctrlKey || event.metaKey)
    && !event.altKey
    && !event.shiftKey
    && event.key.toLowerCase() === 'k'
    && !hasBlockingDialog;
}

/** The `?` guide shortcut must never steal text or keys from another dialog. */
export function shouldOpenShortcutsGuide(event: KeyboardEventLike, hasOpenDialog: boolean): boolean {
  return event.key === '?'
    && !hasOpenDialog
    && !event.ctrlKey
    && !event.metaKey
    && !event.altKey
    && !isInteractiveKeyboardTarget(event.target);
}
