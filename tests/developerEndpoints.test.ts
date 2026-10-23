/**
 * Developer API playground contract tests (Phase 8 batch 5).
 *
 * The playground must only reach the real endpoint allowlist, must measure real
 * durations, must classify cancellation and network failure honestly, and must
 * redact sentinel secrets from anything that enters history or an export.
 */
import { strict as assert } from 'node:assert';
import {
  DEVELOPER_ENDPOINTS,
  findDeveloperEndpoint,
  parseJsonBody,
  runDeveloperRequest,
  createDeveloperRequestHistory,
  sanitizeForDeveloperArtifacts,
  MAX_CAPTURED_BODY,
} from '../src/services/developerEndpoints';

/* --- the allowlist only contains real Calcora endpoints --- */

const REAL_SERVER_ROUTES = new Set([
  '/api/health',
  '/api/ai/local-models',
  '/api/ai/intelligence/status',
  '/api/ai/learning/policy',
  '/api/math/tool',
  '/api/ai/math',
]);

for (const endpoint of DEVELOPER_ENDPOINTS) {
  assert.ok(REAL_SERVER_ROUTES.has(endpoint.path), `${endpoint.path} must be a real Calcora endpoint`);
  assert.ok(['GET', 'POST'].includes(endpoint.method), `${endpoint.path}: method must be GET or POST`);
  assert.equal(endpoint.path.startsWith('/api/'), true, `${endpoint.path}: stays inside the /api namespace`);
  if (endpoint.method === 'POST') {
    assert.ok(endpoint.bodyHint, `${endpoint.path}: POST entries document the body contract`);
    assert.ok(endpoint.exampleBody, `${endpoint.path}: POST entries carry a real example`);
    const parsed = parseJsonBody(endpoint.exampleBody);
    assert.equal(parsed.ok, true, `${endpoint.path}: the documented example body must itself be valid JSON`);
  }
}

assert.equal(findDeveloperEndpoint('math-tool')?.path, '/api/math/tool');
assert.equal(findDeveloperEndpoint('not-real'), undefined);

/* --- body validation --- */

assert.deepEqual(parseJsonBody(''), { ok: true, value: undefined });
assert.equal(parseJsonBody('[]').ok, false, 'an array is not a request body');
assert.equal(parseJsonBody('"hello"').ok, false, 'a bare string is not a request body');
assert.equal(parseJsonBody('{broken').ok, false, 'invalid JSON is rejected before send');
const parsed = parseJsonBody('{"tool":"calculate"}');
assert.deepEqual(parsed, { ok: true, value: { tool: 'calculate' } });

/* --- execution: success, measured duration, truncation --- */

const fakeFetchOk = (async () =>
  new Response(JSON.stringify({ status: 'ok' }), { status: 200, headers: { 'Content-Type': 'application/json' } })) as typeof fetch;

const health = findDeveloperEndpoint('health')!;
{
  const outcome = await runDeveloperRequest(health, '', { fetchImpl: fakeFetchOk });
  assert.equal(outcome.kind, 'response');
  assert.equal(outcome.status, 200);
  assert.equal(outcome.ok, true);
  assert.ok(outcome.durationMs >= 0);
  assert.ok(outcome.bodyText.includes('status'));
  assert.equal(outcome.classification, 'response');
}

const fakeFetchHuge = (async () =>
  new Response('x'.repeat(MAX_CAPTURED_BODY + 100), { status: 200 })) as typeof fetch;
{
  const outcome = await runDeveloperRequest(health, '', { fetchImpl: fakeFetchHuge });
  assert.ok(outcome.bodyText.length < MAX_CAPTURED_BODY + 200, 'huge responses are captured truncated');
  assert.ok(outcome.bodyText.includes('truncated'), 'the truncation is visible');
}

/* --- HTTP error surfaces the real status and body; never marked ok --- */

const fakeFetch400 = (async () =>
  new Response(JSON.stringify({ error: 'Unsupported math tool' }), { status: 400 })) as typeof fetch;
{
  const outcome = await runDeveloperRequest(findDeveloperEndpoint('math-tool')!, '{"tool":"nope"}', { fetchImpl: fakeFetch400 });
  assert.equal(outcome.status, 400);
  assert.equal(outcome.ok, false);
  assert.ok(outcome.bodyText.includes('Unsupported math tool'));
}

/* --- cancellation is classified as cancelled, duration measured --- */

{
  const controller = new AbortController();
  const neverFetch = (async (_url: unknown, init?: { signal?: AbortSignal }) =>
    new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('The operation was aborted.', 'AbortError')));
    })) as unknown as typeof fetch;
  const pending = runDeveloperRequest(health, '', { fetchImpl: neverFetch, signal: controller.signal });
  controller.abort();
  const outcome = await pending;
  assert.equal(outcome.classification, 'cancelled');
  assert.equal(outcome.status, 499, 'cancellation is not presented as a server response');
  assert.equal(outcome.ok, false);
}

/* --- network failure is sanitized --- */

{
  const failingFetch = (async () => {
    const boom = new Error('Failed to fetch http://secret-host.example/internal?token=SENTINEL_TOKEN_VALUE');
    throw boom;
  }) as typeof fetch;
  const outcome = await runDeveloperRequest(health, '', { fetchImpl: failingFetch });
  assert.equal(outcome.classification, 'network');
  assert.equal(outcome.status, 0);
  assert.ok(!outcome.bodyText.includes('secret-host'), 'the underlying URL transcript is never surfaced');
  assert.ok(!outcome.bodyText.includes('SENTINEL_TOKEN_VALUE'), 'sentinel values never reach the outcome');
  assert.ok(outcome.bodyText.includes('network error'), 'an honest classification is given');
}

/* --- off-allowlist tampering is refused --- */

{
  const forged = { ...health, path: 'http://169.254.169.254/latest/meta-data' } as typeof health;
  const outcome = await runDeveloperRequest(forged, '', { fetchImpl: fakeFetchOk as typeof fetch });
  assert.equal(outcome.status, 0, 'forged endpoints are never executed');
  assert.ok(outcome.bodyText.includes('not sent'));
}

/* --- secret redaction --- */

{
  const sanitized = sanitizeForDeveloperArtifacts({
    apiKey: 'SENTINEL-GEMINI-KEY-ABBACABA',
    Authorization: 'Bearer SENTINEL-BEARER-123',
    nested: { storageToken: 'SENTINEL-STORAGE-123', safe: 'keep me' },
    bodyText: 'the header was Bearer SENTINEL-BEARER-456 inside a message',
  }) as Record<string, unknown>;
  assert.equal(sanitized.apiKey, '[redacted]');
  assert.equal(sanitized.Authorization, '[redacted]');
  assert.equal((sanitized.nested as Record<string, unknown>).storageToken, '[redacted]');
  assert.equal((sanitized.nested as Record<string, unknown>).safe, 'keep me');
  assert.ok(!JSON.stringify(sanitized).includes('SENTINEL'), `no sentinel survives: ${JSON.stringify(sanitized)}`);
}

/* --- bounded history --- */

{
  const history = createDeveloperRequestHistory(3);
  for (let i = 0; i < 10; i++) {
    history.add({
      endpointId: 'math-tool',
      method: 'POST',
      path: '/api/math/tool',
      at: 1000 + i,
      requestBody: `{"attempt":${i}}`,
      outcome: { kind: 'response', status: 200, ok: true, durationMs: i, bodyText: 'ok', classification: 'response' },
    });
  }
  assert.equal(history.entries.length, 3, 'history is bounded by retention');
  assert.equal(history.entries[2].at, 1009, 'most recent request survives');
  history.setRetention(2);
  assert.equal(history.entries.length, 2, 'lowering retention drops the oldest entries');
  history.clear();
  assert.equal(history.entries.length, 0);
}

/* --- the runner never uses anything but endpoint.path (no URL field by construction) --- */

{
  const seenUrls: string[] = [];
  const recordingFetch = (async (url: unknown) => {
    seenUrls.push(String(url));
    return new Response('{}', { status: 200 });
  }) as unknown as typeof fetch;
  await runDeveloperRequest(health, '', { fetchImpl: recordingFetch as typeof fetch });
  assert.deepEqual(seenUrls, ['/api/health'], 'fetch receives exactly the allowlisted path — a relative one');
}

console.log('Developer API playground contract tests passed');
