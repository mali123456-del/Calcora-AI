/**
 * Regression tests for the streaming Tutor client (askAIMathAssistantStream).
 *
 * The endpoint is absent in the test environment (no server), so fetch is
 * replaced with controlled mocks that inject synthetic SSE bytes. The invariants
 * under test:
 *  - streamed delta frames feed `onDelta` for DISPLAY only and never reach the
 *    returned response pieces without verification authority;
 *  - the final `result` frame is mapped exactly like the JSON endpoint payload;
 *  - an `error` frame followed by a fallback `result` frame resolves to the
 *    result, not the error;
 *  - an error stream with no result never fabricates a cloud answer;
 *  - a caller stop aborts immediately with the honest "stopped" answer;
 *  - a stalled stream is bounded and falls back truthfully; and
 *  - a pre-SSE (older JSON) backend response still maps identically.
 */
import { strict as assert } from 'node:assert';

const originalFetch = globalThis.fetch;

function sseResponse(body: ReadableStream, headers: Record<string, string> = {}): Response {
  return new Response(body, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream; charset=utf-8', ...headers },
  });
}

function streamFrom(chunks: string[]): ReadableStream {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(new TextEncoder().encode(chunk));
      controller.close();
    },
  });
}

const fakeFetch = (impl: (url: RequestInfo | URL, init?: RequestInit) => Promise<Response>): typeof fetch =>
  ((url: RequestInfo | URL, init?: RequestInit) => impl(url, init)) as typeof fetch;

const verifiedResultPayload = JSON.stringify({
  success: true,
  answer: 'Subtract 5 from both sides.',
  expression: '2x + 5 = 17',
  steps: ['Rearranged'],
  formula: null,
  deterministicResult: 'x = 6',
  deterministicExactResult: null,
  deterministicSteps: ['2x + 5 = 17 => x = 6'],
  deterministicVerified: true,
  verification: { state: 'VERIFIED', method: 'independent-recalculation', reason: 'Substituting x = 6 satisfies the original equation.' },
  geminiState: 'GEMINI_CONFIGURED',
  meta: { responseProfile: 'balanced', tutorMode: 'assistant', language: 'en', grounded: false },
});

const { askAIMathAssistantStream, askAIMathAssistant } = await import('../src/ai/client');

// 1. Deltas feed onDelta; the final result frame is authoritative.
async function runDeltaCase(): Promise<void> {
  globalThis.fetch = fakeFetch(async (url) => {
    assert.ok(String(url).includes('/api/ai/math/stream'), 'the streaming call must target the streaming endpoint');
    return sseResponse(streamFrom([
      'event: delta\ndata: "Prefix te',
      'xt"\n\n',
      ': ping\n\n',
      'event: delta\ndata: " more"\n\n',
      `event: result\ndata: ${verifiedResultPayload}\n\n`,
    ]));
  });

  const deltas: string[] = [];
  const response = await askAIMathAssistantStream('Solve 2x + 5 = 17', [], '2x + 5 = 17', '12', 'solve', {}, (partial) => deltas.push(partial));
  assert.deepEqual(deltas, ['Prefix text', 'Prefix text more'], 'onDelta reports the growing prefix');
  assert.equal(response.expression, '2x + 5 = 17');
  assert.equal(response.isVerified, true, 'the verified result frame maps to a verified response');
  assert.equal(response.verifiedResult, 'x = 6');
  assert.ok(response.answer.includes('x = 6'), 'the verified result leads the answer');
  assert.ok((response.steps ?? []).includes('2x + 5 = 17 => x = 6'), 'deterministic steps are surfaced');
}

// 2. An error frame followed by a fallback result frame: the result wins.
async function runErrorThenResultCase(): Promise<void> {
  globalThis.fetch = fakeFetch(async () =>
    sseResponse(streamFrom([
      'event: error\ndata: {"success":false,"error":"upstream failed"}\n\n',
      'event: result\ndata: {"success":true,"isOfflineFallback":true,"answer":"Local deterministic Tutor response","steps":[],"deterministicResult":"2 + 3 = 5","deterministicVerified":true,"verification":{"state":"VERIFIED","reason":"Recalculated independently."},"geminiState":"GEMINI_SERVER_ERROR"}\n\n',
    ])));
  const afterError = await askAIMathAssistantStream('What is 2 + 3?');
  assert.equal(afterError.isVerified, true, 'a fallback result frame still maps through verification');
  assert.equal(afterError.isOfflineFallback, true, 'the honest offline fallback flag is preserved');
  assert.ok(afterError.answer.includes('2 + 3 = 5'), 'the deterministic result is surfaced');
}

// 3. An error frame with no result at all must NOT fabricate a cloud answer:
//    the local deterministic fallback is used and labelled truthfully.
async function runErrorOnlyCase(): Promise<void> {
  globalThis.fetch = fakeFetch(async () =>
    sseResponse(streamFrom(['event: error\ndata: {"success":false,"error":"stream died"}\n\n'])));
  const errorOnly = await askAIMathAssistantStream('Math help please');
  assert.equal(errorOnly.isVerified, false, 'nothing ended up verified');
  assert.match(errorOnly.providerMessage ?? '', /streaming path/i, 'the failure is reported honestly on the streaming path');
}

// 4. A caller stop must abort and answer honestly, never with fallback content.
async function runStopCase(): Promise<void> {
  globalThis.fetch = fakeFetch((_url, init) => {
    if (!init?.signal) throw new Error('the stream call must pass a signal');
    return new Promise<Response>((_resolve, reject) => {
      init.signal!.addEventListener('abort', () => reject(new DOMException('This operation was aborted', 'AbortError')), { once: true });
    });
  });
  const stopController = new AbortController();
  const pending = askAIMathAssistantStream('Solve 9x = 90', [], '9x = 90', '10', 'solve', { abortSignal: stopController.signal });
  setTimeout(() => stopController.abort(), 30);
  const stopped = await pending;
  assert.match(stopped.providerMessage ?? '', /stopped/i, 'a stopped stream reports the stop');
  assert.match(stopped.answer, /stopped/i, 'the transcript shows the stop, not invented content');
  assert.equal(stopped.isVerified, false, 'nothing was verified');
  assert.equal(stopped.steps.length, 0, 'no steps are invented for a stopped stream');
  assert.equal(stopped.isOfflineFallback, false, 'a stop must not mislabel itself as an offline fallback');
}

// 5. A stalled stream (response that never yields data) is bounded by the
//    request ceiling and falls back truthfully.
async function runStallCase(): Promise<void> {
  globalThis.fetch = fakeFetch((_url, init) => {
    if (!init?.signal) throw new Error('the stream call must pass a signal');
    return new Promise<Response>((resolve, reject) => {
      init.signal!.addEventListener('abort', () => reject(new DOMException('This operation was aborted', 'AbortError')), { once: true });
      // Resolve with a valid but permanently quiet stream body.
      setTimeout(() => resolve(sseResponse(new ReadableStream<Uint8Array>({ start() { /* never yields */ } }))), 5);
    });
  });
  const stalled = await askAIMathAssistantStream('Solve 1x + 1 = 2', [], undefined, undefined, 'solve', { requestTimeoutMs: 120 });
  assert.match(stalled.providerMessage ?? '', /stalled/i, 'a stalled stream hits its bound and reports it');
  assert.equal(stalled.isVerified, false, 'a stall never fabricates verification');
}

// 6. An older backend replying with plain JSON still maps identically to the
//    non-streaming path, transport-for-transport.
async function runLegacyJsonCase(): Promise<void> {
  globalThis.fetch = fakeFetch(async (url) => {
    assert.ok(String(url).includes('/api/ai/math/stream'), 'the legacy backend is reached via the same URL');
    return new Response(verifiedResultPayload, { status: 200, headers: { 'Content-Type': 'application/json' } });
  });
  const legacy = await askAIMathAssistantStream('Solve 2x + 5 = 17', [], '2x + 5 = 17', '12', 'solve');
  assert.equal(legacy.isVerified, true);
  assert.equal(legacy.verifiedResult, 'x = 6');

  globalThis.fetch = fakeFetch(async (url) => {
    assert.ok(String(url).includes('/api/ai/math') && !String(url).includes('/stream'), 'the JSON transport uses the JSON endpoint');
    return new Response(verifiedResultPayload, { status: 200, headers: { 'Content-Type': 'application/json' } });
  });
  const viaJson = await askAIMathAssistant('Solve 2x + 5 = 17', [], '2x + 5 = 17', '12', 'solve');
  const strip = (r: { providerMessage?: string }) => ({ providerMessage: r.providerMessage });
  void strip;
  assert.equal(viaJson.isVerified, legacy.isVerified);
  assert.equal(viaJson.verifiedResult, legacy.verifiedResult);
  assert.equal(viaJson.expression, legacy.expression);
  assert.deepEqual(viaJson.steps, legacy.steps);
}

runDeltaCase()
  .then(runErrorThenResultCase)
  .then(runErrorOnlyCase)
  .then(runStopCase)
  .then(runStallCase)
  .then(runLegacyJsonCase)
  .then(() => {
    globalThis.fetch = originalFetch;
    console.log('Streaming Tutor client regression tests passed');
    process.exit(0);
  })
  .catch((error) => {
    globalThis.fetch = originalFetch;
    console.error('Streaming Tutor client regression tests failed:', error);
    process.exit(1);
  });
