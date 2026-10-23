import assert from 'node:assert/strict';
import {
  isInteractiveKeyboardTarget,
  shouldHandleCalculatorShortcut,
  shouldOpenShortcutsGuide,
  shouldToggleCommandPalette,
} from '../src/utils/keyboardGuards';

type TestEvent = {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  target?: unknown;
};

const event = (values: Partial<TestEvent> = {}): TestEvent => ({
  key: '5',
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  ...values,
});

const fakeTarget = (tagName: string, extra: Record<string, unknown> = {}) => ({ tagName, ...extra });

assert.equal(shouldHandleCalculatorShortcut(event(), false), true, 'plain calculator keys are handled');
assert.equal(shouldHandleCalculatorShortcut(event({ ctrlKey: true }), false), false, 'Ctrl shortcuts are preserved');
assert.equal(shouldHandleCalculatorShortcut(event({ metaKey: true }), false), false, 'Cmd shortcuts are preserved');
assert.equal(shouldHandleCalculatorShortcut(event({ altKey: true }), false), false, 'Alt shortcuts are preserved');
assert.equal(shouldHandleCalculatorShortcut(event(), true), false, 'calculator shortcuts pause in dialogs');

for (const tagName of ['INPUT', 'TEXTAREA', 'SELECT', 'OPTION', 'BUTTON']) {
  assert.equal(isInteractiveKeyboardTarget(fakeTarget(tagName)), true, `${tagName} owns keyboard events`);
  assert.equal(shouldHandleCalculatorShortcut(event({ target: fakeTarget(tagName) }), false), false);
}
assert.equal(isInteractiveKeyboardTarget(fakeTarget('DIV', { isContentEditable: true })), true, 'contenteditable fields own keyboard events');
assert.equal(isInteractiveKeyboardTarget(fakeTarget('DIV', { closest: () => ({}) })), true, 'nested interactive controls are detected');
assert.equal(isInteractiveKeyboardTarget(fakeTarget('DIV', { closest: () => null })), false, 'ordinary content remains available to calculator shortcuts');

assert.equal(shouldOpenShortcutsGuide(event({ key: '?' }), false), true, 'unmodified question mark opens the guide');
assert.equal(shouldOpenShortcutsGuide(event({ key: '?', ctrlKey: true }), false), false, 'modified question mark is not captured');
assert.equal(shouldOpenShortcutsGuide(event({ key: '?', target: fakeTarget('INPUT') }), false), false, 'question mark does not steal input');
assert.equal(shouldOpenShortcutsGuide(event({ key: '?' }), true), false, 'question mark does not open over another dialog');

assert.equal(shouldToggleCommandPalette(event({ key: 'k', ctrlKey: true }), false), true, 'Ctrl+K opens the palette');
assert.equal(shouldToggleCommandPalette(event({ key: 'K', metaKey: true }), false), true, 'Cmd+K opens the palette');
assert.equal(shouldToggleCommandPalette(event({ key: 'k', ctrlKey: true, shiftKey: true }), false), false, 'modified Ctrl+Shift+K is not captured');
assert.equal(shouldToggleCommandPalette(event({ key: 'k', ctrlKey: true }), true), false, 'palette shortcut does not overlay a blocking dialog');

console.log('Keyboard shortcut guard tests passed');
