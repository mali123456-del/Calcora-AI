/**
 * Developer diagnostics tests (Phase 8 batch 5).
 *
 * The diagnostic buffer must be bounded, keep honest truncated messages only,
 * classify real console/window reports, and produce an export that contains no
 * sentinel credentials.
 */
import { strict as assert } from 'node:assert';
import {
  createDeveloperDiagnostics,
  truncateDiagnosticMessage,
  type DeveloperSeverity,
} from '../src/services/developerDiagnostics';

/* --- message truncation --- */

assert.equal(truncateDiagnosticMessage('   a   b   '), 'a b');
const long = truncateDiagnosticMessage('x'.repeat(1000));
assert.equal(long.length, 301, 'a long message is kept as a bounded prefix');
assert.ok(long.endsWith('…'));

/* --- recording and bounds --- */

let clock = 1_000_000;
const diag = createDeveloperDiagnostics({ max: 5, now: () => clock });
diag.record('info', 'tutor', 'provider selected: local tutor');
diag.record('warn', 'stream', 'AI Tutor request timed out after 50 ms');
diag.record('error', 'playground', 'request failed');
diag.record('info', 'tutor', 'a'.repeat(2000));
for (let i = 0; i < 3; i++) diag.record('debug', 'engine', `step ${i}`);
assert.equal(diag.entries.length, 5, 'the buffer respects its bound');
assert.deepEqual(
  diag.entries.map((entry) => entry.message.slice(0, 14)),
  ['request failed', 'a'.repeat(14), 'step 0', 'step 1', 'step 2'],
  'the two oldest entries aged out; the truncated flood prefix survived',
);

const withKeys = createDeveloperDiagnostics();
withKeys.record('warn', 'gateway', 'Gemini key stored securely: AIzaSySENTINELFAKEKEY123456');
assert.ok(!JSON.stringify(withKeys.entries).includes('AIzaSy'), 'captured entries are redacted at record time');

/* --- export redaction --- */

const exported = withKeys.exportReport();
assert.ok(exported.includes('[redacted]'), 'the value is visibly replaced by a redaction marker');
assert.ok(exported.includes('severity counts:'), 'the export carries honest counts');

const diagExport = diag.exportReport();
assert.ok(diagExport.includes('[error] playground: request failed'), 'each line carries severity, subsystem, message');

/* --- severity and subsystem filters --- */

const filtered = diag.fromSeverity('warn');
assert.equal(filtered.every((entry) => (['warn', 'error'] as DeveloperSeverity[]).includes(entry.severity)), true);
assert.equal(filtered.length, 1);
assert.equal(diag.bySubsystem('engine').length, 3);

/* --- live-capture notify hook (UI re-render trigger) --- */

{
  let notified = 0;
  const notifying = createDeveloperDiagnostics({ now: () => clock, onRecord: () => { notified += 1; } });
  notifying.record('info', 'a', 'one');
  notifying.record('warn', 'a', 'two');
  notifying.record('error', 'a', 'three');
  assert.equal(notified, 3, 'onRecord fires for every captured entry so a viewer can refresh');
  notifying.clear();
  assert.equal(notified, 3, 'clear does not pretend to be a new record');
}

/* --- clear and resize --- */

diag.clear();
assert.equal(diag.entries.length, 0);
diag.setMax(2);
diag.record('info', 'a', 'one');
diag.record('info', 'a', 'two');
diag.record('info', 'a', 'three');
assert.equal(diag.entries.length, 2, 'resizing trims to the new bound');
assert.notEqual(diag.entries, diag.entries, 'entries returns a fresh copy, not the internal array');

/* --- runtime capture detaches cleanly and preserves the original console --- */

{
  const original = console.error.bind(console);
  const captured = createDeveloperDiagnostics({ now: () => clock });
  console.error('AI streaming call failed; using the local deterministic fallback.');
  assert.equal(captured.entries.length, 0, 'nothing recorded before attach');
  const detach = captured.attachRuntimeCapture();
  console.error('AI streaming call failed; using the local deterministic fallback.');
  assert.equal(captured.entries.length, 1, 'a real console.error is captured');
  assert.equal(captured.entries[0].severity, 'error');
  assert.equal(captured.entries[0].subsystem, 'console');
  console.warn('Supabase math RAG unavailable; using local knowledge index');
  assert.equal(captured.entries[1].severity, 'warn');
  captured.setMax(1);
  console.error('second');
  assert.equal(captured.entries.length, 1);
  assert.equal(captured.entries[0].message, 'second');
  detach();
  console.error('after detach - untouched');
  assert.equal(captured.entries.length, 1, 'no capture after detach');
  console.error = original; // restore for later suites in case attach/detach failed
  console.error('restoration check');
}

console.log('Developer diagnostics tests passed');
