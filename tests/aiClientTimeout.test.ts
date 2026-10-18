/**
 * RED-first regression for an unbounded Tutor request.
 *
 * Defect: `askAIMathAssistant` awaited `fetch('/api/ai/math')` with no AbortSignal and
 * no timeout. When the backend never answered, the promise never settled, so the panel's
 * `catch` and `finally` could never run and `#ai-prompt-input` stayed `disabled` forever
 * (observed in the packaged app: the input never re-enabled across a 300 s wait, while
 * the same derivative answered over HTTP in 14-20 ms).
 *
 * This test pins three requirements:
 *  1. a stalled request must settle rather than hang the UI;
 *  2. the client must hand fetch a real AbortSignal, so the wait is actually bounded;
 *  3. when it gives up, it must fall back to the DETERMINISTIC engine and say so --
 *     it must never imply a cloud or model answer arrived.
 */
import assert from 'node:assert/strict';
import { askAIMathAssistant } from '../src/ai/client';

const REQUEST_TIMEOUT_MS = 50;
// Generous relative to the 50 ms client bound; it only exists so that an unbounded
// implementation reports a readable failure instead of hanging the sweep forever.
const WATCHDOG_MS = 5_000;

type Settled = { ok: true; value: Awaited<ReturnType<typeof askAIMathAssistant>> } | { ok: false };

async function main() {
  const originalFetch = globalThis.fetch;
  let sawSignal = false;

  // A backend that accepts the request and then never replies. It only rejects if the
  // caller supplied an AbortSignal and fired it -- which is precisely the missing bound.
  globalThis.fetch = ((_input: unknown, init?: RequestInit) => {
    const signal = init?.signal;
    if (signal) {
      sawSignal = true;
      return new Promise<Response>((_resolve, reject) => {
        signal.addEventListener('abort', () => {
          reject(new DOMException('The operation was aborted.', 'AbortError'));
        });
      });
    }
    return new Promise<Response>(() => {
      /* never settles: this is the defect being pinned */
    });
  }) as typeof fetch;

  let settled: Settled;
  try {
    const call = askAIMathAssistant('Find the derivative of x^2', [], undefined, undefined, 'teach', {
      requestTimeoutMs: REQUEST_TIMEOUT_MS,
    }).then((value) => ({ ok: true as const, value }));
    settled = await Promise.race<Settled>([
      call,
      new Promise<Settled>((resolve) => setTimeout(() => resolve({ ok: false }), WATCHDOG_MS)),
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(settled.ok, true, `a stalled Tutor request must settle within ${WATCHDOG_MS} ms instead of hanging the UI forever`);
  assert.equal(sawSignal, true, 'the client must pass an AbortSignal so the wait is genuinely bounded');

  const response = (settled as { ok: true; value: Awaited<ReturnType<typeof askAIMathAssistant>> }).value;

  assert.equal(
    response.isOfflineFallback,
    true,
    'a timed-out request must degrade to the deterministic fallback rather than imply an answer arrived',
  );
  assert.match(
    String(response.providerMessage ?? ''),
    /timed out|no response|stopped waiting/i,
    'the user must be told the request timed out instead of being shown a silent stall',
  );
  assert.doesNotMatch(
    String(response.providerMessage ?? ''),
    /from (gemini|the cloud)/i,
    'a timed-out request must not claim a cloud answer was received',
  );

  // The deterministic engine remains the authority even on the timeout path: a question
  // it can answer exactly must still come back VERIFIED rather than vague.
  const offlineOnly = { privacyMode: 'offline' as const, requestTimeoutMs: REQUEST_TIMEOUT_MS };
  const hung = ((_input: unknown, init?: RequestInit) => {
    const signal = init?.signal;
    return new Promise<Response>((_resolve, reject) => {
      signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
    });
  }) as typeof fetch;
  globalThis.fetch = hung;
  try {
    const exact = await askAIMathAssistant('Solve 2x + 5 = 15', [], undefined, undefined, 'solve', offlineOnly);
    assert.match(String(exact.answer), /x\s*=\s*5/, 'the deterministic solver still decides the answer after a timeout');
    assert.equal(exact.isVerified, true, 'a correctly solved equation must be VERIFIED after a timeout');
    assert.equal(
      exact.verification?.state,
      'VERIFIED',
      'verification must substitute the root back into the equation, not compare it to the expression value',
    );
    assert.equal(exact.verifiedResult, '5', 'the verified root is reported as the authoritative result');
  } finally {
    globalThis.fetch = originalFetch;
  }

  console.log('PASS  a stalled Tutor request settles on the deterministic fallback');
  console.log('PASS  the Tutor request is bounded by an AbortSignal');
  console.log('PASS  a timeout is reported honestly and never as a cloud answer');
  console.log('PASS  the deterministic engine stays authoritative after a timeout');
}

main().catch((error) => {
  console.error('FAIL ', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});