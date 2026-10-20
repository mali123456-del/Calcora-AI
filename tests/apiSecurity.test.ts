import assert from 'node:assert/strict';

const ENV_KEYS = [
  'CALCORA_MANUAL_START', 'CALCORA_PORT', 'CALCORA_HOST', 'CALCORA_DESKTOP', 'NODE_ENV',
  'CALCORA_INTELLIGENCE_SCAN_TOKEN', 'CALCORA_LEARNING_EVALUATION_TOKEN',
  'CALCORA_ALLOW_PUBLIC_GEMINI', 'GEMINI_API_KEY', 'CALCORA_RUNTIME_PORT', 'CALCORA_ADMIN_TOKEN',
] as const;

async function main() {
  const previousEnvironment = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
  let server: import('node:http').Server | undefined;
  try {
    process.env.CALCORA_MANUAL_START = '1';
    process.env.CALCORA_PORT = '0';
    process.env.CALCORA_DESKTOP = '0';
    process.env.CALCORA_HOST = '127.0.0.1';
    process.env.NODE_ENV = 'production';
    process.env.CALCORA_ADMIN_TOKEN = 'test-admin-token-must-have-at-least-32-characters';
    process.env.CALCORA_INTELLIGENCE_SCAN_TOKEN = 'test-operator-token';
    process.env.CALCORA_LEARNING_EVALUATION_TOKEN = 'test-learning-token';
    const { startServer } = await import('../server');
    server = await startServer();
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    const base = `http://127.0.0.1:${address.port}`;

    const health = await fetch(`${base}/api/health`);
    assert.equal(health.status, 200);
    assert.equal(health.headers.get('x-powered-by'), null);
    assert.equal(health.headers.get('x-content-type-options'), 'nosniff');

    // A strict CSP must accompany every production response: tutor answers, PDF
    // text and OCR transcripts are all rendered into this same origin.
    const servedCsp = health.headers.get('content-security-policy');
    assert.ok(servedCsp, 'a production response must carry a Content-Security-Policy');
    assert.ok(servedCsp.includes("default-src 'self'"), `CSP must default to self (got: ${servedCsp})`);
    assert.ok(servedCsp.includes("object-src 'none'"), 'CSP must forbid plugins');
    assert.ok(!servedCsp.includes('unsafe-eval'), 'CSP must not allow unsafe-eval');

    // Cross-origin abuse must be refused before any handler runs.
    const crossOrigin = await fetch(`${base}/api/ai/math`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'https://evil.example.com' },
      body: JSON.stringify({ prompt: '2 + 2' }),
    });
    assert.equal(crossOrigin.status, 403, 'an unrecognised Origin must be refused');
    assert.equal(crossOrigin.headers.get('access-control-allow-origin'), null, 'no CORS grant on a refused origin');

    const crossOriginOpaque = await fetch(`${base}/api/ai/math`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'null' },
      body: JSON.stringify({ prompt: '2 + 2' }),
    });
    assert.equal(crossOriginOpaque.status, 403, 'an opaque (null) Origin must be refused');

    const loopbackOrigin = await fetch(`${base}/api/health`, { headers: { origin: `http://127.0.0.1:${address.port}` } });
    assert.equal(loopbackOrigin.status, 200, 'the app\'s own loopback origin is allowed');
    assert.equal(loopbackOrigin.headers.get('access-control-allow-origin'), `http://127.0.0.1:${address.port}`);

    const preflight = await fetch(`${base}/api/ai/math`, {
      method: 'OPTIONS',
      headers: { origin: 'https://evil.example.com', 'access-control-request-method': 'POST' },
    });
    assert.equal(preflight.status, 403, 'a cross-origin preflight is refused');

    const scanUnauthorized = await fetch(`${base}/api/ai/intelligence/scan`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    assert.equal(scanUnauthorized.status, 401);
    assert.deepEqual(await scanUnauthorized.json(), { success: false, error: 'Unauthorized intelligence scan request' });

    const learningUnauthorized = await fetch(`${base}/api/ai/learning/evaluate`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    assert.equal(learningUnauthorized.status, 401);

    const protectedDocuments = await fetch(`${base}/api/documents`, { headers: { 'x-calcora-admin-token': 'wrong-token' } });
    assert.equal(protectedDocuments.status, 401, 'document access requires the server-only admin token in production');
    const protectedPurge = await fetch(`${base}/api/privacy/purge`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    assert.equal(protectedPurge.status, 401, 'data purge cannot be triggered without authorization');
    const authorizedDocuments = await fetch(`${base}/api/documents`, { headers: { 'x-calcora-admin-token': process.env.CALCORA_ADMIN_TOKEN! } });
    assert.equal(authorizedDocuments.status, 200, 'authorized document access remains available');
    assert.deepEqual(await authorizedDocuments.json(), { success: true, documents: [] });
    const adminPreflight = await fetch(`${base}/api/documents`, {
      method: 'OPTIONS',
      headers: { origin: `http://127.0.0.1:${address.port}`, 'access-control-request-headers': 'x-calcora-admin-token' },
    });
    assert.match(adminPreflight.headers.get('access-control-allow-headers') ?? '', /x-calcora-admin-token/i);

    const tooLong = await fetch(`${base}/api/ai/math`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ prompt: 'x'.repeat(1001) }) });
    assert.equal(tooLong.status, 400);

    const malformedJson = await fetch(`${base}/api/math/tool`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{' });
    assert.equal(malformedJson.status, 400);
    assert.match((await malformedJson.json()).error, /valid JSON/i);

    const oversizedJson = await fetch(`${base}/api/math/tool`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ value: 'x'.repeat(1_100_000) }) });
    assert.equal(oversizedJson.status, 413);

    process.env.CALCORA_ALLOW_PUBLIC_GEMINI = 'false';
    process.env.GEMINI_API_KEY = 'MY_GEMINI_API_KEY';
    const publicCloudDisabled = await fetch(`${base}/api/ai/math`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ prompt: '2 + 2', tutorMode: 'assistant', offlineOnly: false }) });
    assert.equal(publicCloudDisabled.status, 200);
    const localResponse = await publicCloudDisabled.json();
    assert.match(localResponse.meta?.providerMessage, /Gemini API key is missing|Public Gemini access is disabled/i);
    assert.equal(localResponse.tutorEngine, 'local-deterministic');

    let lastStatus = 0;
    for (let i = 0; i < 9; i += 1) {
      const response = await fetch(`${base}/api/ai/math`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ prompt: '' }) });
      lastStatus = response.status;
    }
    assert.equal(lastStatus, 429, 'Tutor API should apply its per-IP rate limit');
  } finally {
    if (server?.listening) await new Promise<void>((resolve, reject) => server?.close((error) => error ? reject(error) : resolve()));
    for (const key of ENV_KEYS) {
      const value = previousEnvironment[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
  console.log('API security integration tests passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
