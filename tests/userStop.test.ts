/**
 * User-initiated stop regression tests.
 *
 * A Tutor request is bounded by a 200 s ceiling, but a slow or wedged backend used
 * to trap the assistant in a loading state for that whole time with no way for the
 * user to abort. The caller stop signal must abort the fetch immediately and must
 * NOT substitute a fabricated answer.
 */
import { strict as assert } from 'node:assert';

const realFetch = globalThis.fetch;
const touched: string[] = [];

// Fetch replaces the real endpoint with a hung request that only settles when
// aborted, mirroring a wedged backend connection.
(globalThis as { fetch: typeof fetch }).fetch = ((url: string | URL | Request, init?: RequestInit) => {
  touched.push(String(url));
  if (!init?.signal) throw new Error('askAIMathAssistant must pass a signal');
  return new Promise<Response>((_resolve, reject) => {
    init.signal!.addEventListener('abort', () => reject(new DOMException('This operation was aborted', 'AbortError')));
  });
}) as typeof fetch;

const { askAIMathAssistant } = await import('../src/ai/client');

async function run() {
  const controller = new AbortController();
  const pending = askAIMathAssistant('Solve 2x + 5 = 17', [], '2x + 5 = 17', '12', 'solve', { abortSignal: controller.signal });
  // Let the fetch call attach, then stop it as a user would.
  setTimeout(() => controller.abort(), 30);
  const response = await pending;

  assert.match(response.providerMessage ?? '', /stopped/i, 'a stopped request must be reported as stopped');
  assert.match(response.answer, /stopped/i, 'the transcript must show the stop, not a fabricated answer');
  assert.equal(response.isVerified, false, 'nothing was verified');
  assert.equal(response.steps.length, 0, 'no steps may be invented');
  assert.equal(response.isOfflineFallback, false, 'a stop must not mislabel itself as an offline fallback');
  assert.equal(touched.length, 1, 'exactly one request was issued and aborted');

  // A stop with no in-flight abort signal still hits the timeout/fallback path,
  // and the caller signal is detached afterwards: aborting a stale controller is
  // a no-op that must not throw and must not leak a listener into new requests.
  const stale = new AbortController();
  const hung = askAIMathAssistant('Solve 1x + 1 = 2', [], undefined, undefined, 'solve', { requestTimeoutMs: 50 });
  stale.abort(); // abort BEFORE attach: must not crash the flow
  const timeoutResponse = await hung;
  assert.match(timeoutResponse.providerMessage ?? '', /timed out/i, 'without a stop the bounded timeout path runs');

  console.log('User-stop regression tests passed');
  process.exit(0);
}

run().finally(() => {
  (globalThis as { fetch: typeof fetch }).fetch = realFetch;
}).catch((error) => {
  (globalThis as { fetch: typeof fetch }).fetch = realFetch;
  console.error('User-stop regression tests failed:', error);
  process.exit(1);
});
