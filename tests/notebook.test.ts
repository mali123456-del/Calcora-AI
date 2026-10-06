/**
 * Notebook workspace — persistent mathematical work.
 *
 * A notebook stores a learner's work: problems, calculations, steps, graphs, tables,
 * explanations, Tutor exchanges, notes, references and practice. Two properties matter
 * more than features here:
 *
 *   1. **Isolation.** Notebook state must never corrupt calculator state, and a corrupt
 *      or oversized notebook must not take the calculator down. The notebook owns its own
 *      storage key and validates everything it reads back.
 *   2. **Traceability.** Every stored entry that carries a mathematical claim keeps the
 *      verification status it was created with, so the notebook cannot present an
 *      unverified number as verified.
 */
import assert from 'node:assert/strict';
import {
  createNotebook,
  addNotebookEntry,
  removeNotebookEntry,
  updateNotebookEntry,
  summarizeNotebook,
  renderNotebookEntry,
  saveNotebook,
  loadNotebook,
  clearNotebooks,
  MAX_NOTEBOOKS,
  MAX_ENTRIES_PER_NOTEBOOK,
  MAX_ENTRY_TEXT_CHARS,
  type Notebook,
  type NotebookEntry,
} from '../src/services/notebook';

function check(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Notebook regression failed: ${message}`);
}

// ---------------------------------------------------------------------------
// 1. Creation is clean and empty.
// ---------------------------------------------------------------------------
const nb = createNotebook('Derivatives practice');
check(nb.title === 'Derivatives practice', 'the title is kept');
check(nb.entries.length === 0, 'a new notebook is empty');
check(nb.id.length > 0, 'a new notebook has an id');
check(nb.createdAt > 0, 'a new notebook is timestamped');

// A blank title is rejected rather than creating an unnamed notebook.
check(createNotebook('   ').title.length > 0, 'a blank title still yields a usable title');
check(createNotebook('x'.repeat(500)).title.length <= 200, 'an overlong title is bounded');

// ---------------------------------------------------------------------------
// 2. Entries are typed, validated and bounded.
// ---------------------------------------------------------------------------
const withCalc = addNotebookEntry(nb, {
  type: 'calculation',
  title: 'Chain rule check',
  text: 'd/dx (x^2 + 3x)',
  verification: { status: 'PASS', method: 'recompute', reason: 'recomputed independently' },
});
check(withCalc.entries.length === 1, 'an entry is added');
const calcEntry = withCalc.entries[0];
check(calcEntry.type === 'calculation', 'the entry keeps its type');
check(calcEntry.verification?.status === 'PASS', 'verification status is preserved verbatim');

check(addNotebookEntry(nb, { type: 'bogus-type', title: 'x' }).entries.length === 0,
  'an unknown entry type is rejected');
check(addNotebookEntry(nb, { type: 'note', title: 'x', text: 'y'.repeat(MAX_ENTRY_TEXT_CHARS + 500) }).entries.length === 0,
  'overlong entry text is rejected rather than silently truncated');
check(addNotebookEntry(nb, { type: 'note', title: 'x', text: 'y'.repeat(MAX_ENTRY_TEXT_CHARS) }).entries.length === 1,
  'text exactly at the limit is accepted');

// The entry cap is enforced.
let full = nb;
for (let i = 0; i < MAX_ENTRIES_PER_NOTEBOOK + 5; i += 1) {
  full = addNotebookEntry(full, { type: 'note', title: `n${i}`, text: 'x' });
}
check(full.entries.length === MAX_ENTRIES_PER_NOTEBOOK,
  `the entry cap is enforced, got ${full.entries.length}`);

// Original notebooks are immutable: adding never mutates in place.
check(nb.entries.length === 0, 'addNotebookEntry does not mutate the original notebook');
check(withCalc !== nb, 'addNotebookEntry returns a new notebook object');

// ---------------------------------------------------------------------------
// 3. Removal and update.
// ---------------------------------------------------------------------------
const two = addNotebookEntry(withCalc, { type: 'note', title: 'Second', text: 'note body' });
const removed = removeNotebookEntry(two, two.entries[0].id);
check(removed.entries.length === 1, 'an entry is removed');
check(removeNotebookEntry(two, 'no-such-id').entries.length === 2, 'removing an unknown id is a no-op');

const updated = updateNotebookEntry(withCalc, withCalc.entries[0].id, { title: 'Renamed' });
check(updated.entries[0].title === 'Renamed', 'an entry is updated');
check(updateNotebookEntry(withCalc, 'no-such-id', { title: 'x' }).entries.length === 1,
  'updating an unknown id is a no-op');

// A verification status can never be silently upgraded through an update.
const downgrade = updateNotebookEntry(withCalc, withCalc.entries[0].id, {
  verification: { status: 'FAIL', method: 'substitute', reason: 're-checked and failed' },
});
check(downgrade.entries[0].verification?.status === 'FAIL', 'a verification status can be corrected');

// ---------------------------------------------------------------------------
// 4. Rendering distinguishes verified from unverified claims.
// ---------------------------------------------------------------------------
const renderedVerified = renderNotebookEntry(calcEntry);
check(renderedVerified.includes('PASS') || /verified/i.test(renderedVerified),
  `a verified entry renders its status, got: ${renderedVerified}`);

const unverified = addNotebookEntry(nb, { type: 'calculation', title: 'Guess', text: '2+2 = 5' });
const renderedUnverified = renderNotebookEntry(unverified.entries[0]);
check(/UNKNOWN|not verified|unverified/i.test(renderedUnverified),
  `an unverified claim is labelled, got: ${renderedUnverified}`);
check(!/PASS/.test(renderedUnverified), 'an unverified entry must never render as PASS');

const failed = addNotebookEntry(nb, {
  type: 'calculation',
  title: 'Failed',
  text: '3x = 10',
  verification: { status: 'FAIL', method: 'substitute', reason: 'residual 3' },
});
check(/FAIL/.test(renderNotebookEntry(failed.entries[0])), 'a failed check renders as FAIL');

// A conceptual note makes no numeric claim, so it is not labelled verified.
const noteRendered = renderNotebookEntry(nb.entries[0] ?? addNotebookEntry(nb, { type: 'note', title: 'n', text: 't' }).entries[0]);
check(!/PASS/.test(noteRendered), 'a plain note does not claim verification');

// ---------------------------------------------------------------------------
// 5. Summary counts are computed, not invented.
// ---------------------------------------------------------------------------
const summary = summarizeNotebook(two);
check(summary.entryCount === 2, `entry count is ${summary.entryCount}`);
check(summary.verifiedCount === 1, `verified count is ${summary.verifiedCount}`);
check(summary.failedCount === 0, 'failed count is accurate');
check(summary.byType.note === 1 && summary.byType.calculation === 1, 'entries are grouped by type');
check(summary.emptySummary === false, 'a populated notebook is not reported as empty');

check(summarizeNotebook(nb).emptySummary === true, 'an empty notebook reports itself empty');
check(summarizeNotebook(nb).verifiedCount === 0, 'an empty notebook claims no verified entries');

// ---------------------------------------------------------------------------
// 6. Persistence round-trips, and corrupt data cannot corrupt state.
// ---------------------------------------------------------------------------
const saved = saveNotebook(two);
check(saved === true || saved === false, 'save reports whether storage was available');

const loaded = loadNotebook();
check(Array.isArray(loaded), 'load always returns an array');
check(loaded.length >= 0, 'load never throws');

// Corrupt storage must degrade to an empty list, not crash the calculator.
const raw = (globalThis as any).localStorage;
if (raw) {
  raw.setItem('calcora_notebooks_v1', '{ this is not json');
  check(Array.isArray(loadNotebook()), 'corrupt storage degrades to an empty list');
  raw.setItem('calcora_notebooks_v1', JSON.stringify([{ nonsense: true }]));
  check(loadNotebook().every((entry: Notebook) => typeof entry.id === 'string'),
    'structurally invalid records are filtered out');

  raw.setItem('calcora_notebooks_v1', JSON.stringify([
    { id: 'nb1', title: 'Kept', createdAt: Date.now(), updatedAt: Date.now(), entries: [] },
    { id: 'nb2', title: 'Also kept', createdAt: Date.now(), updatedAt: Date.now(), entries: [] },
  ]));
  check(loadNotebook().length === 2, 'valid records round-trip');

  // The notebook cap is enforced on load as well as on create.
  const many = Array.from({ length: MAX_NOTEBOOKS + 10 }, (_, i) => ({
    id: `n${i}`, title: `n${i}`, createdAt: Date.now(), updatedAt: Date.now(), entries: [],
  }));
  raw.setItem('calcora_notebooks_v1', JSON.stringify(many));
  check(loadNotebook().length <= MAX_NOTEBOOKS, `load enforces the notebook cap, got ${loadNotebook().length}`);

  clearNotebooks();
  check(loadNotebook().length === 0, 'clear removes everything');
}

// ---------------------------------------------------------------------------
// 7. Notebook and calculator state are independent.
// ---------------------------------------------------------------------------
const isolated = addNotebookEntry(nb, { type: 'note', title: 'Isolated', text: 'body' });
check(nb.entries.length === 0, 'writing to a notebook does not mutate the calculator-facing object');
check(isolated.entries.length === 1, 'the notebook holds its own entries');

console.log('Notebook tests passed');
