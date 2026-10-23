/**
 * Regression tests for the streaming Tutor endpoint (/api/ai/math/stream).
 *
 * The endpoint is exercised over an in-process HTTP server. Only the no-cloud
 * paths are asserted against the real implementation (no network access): the
 * offline/local branch must emit the exact verified payload the JSON endpoint
 * returns inside a properly framed `result` event, and the pre-stream input
 * validation must keep returning standard HTTP error statuses.
 */
import { strict as assert } from 'node:assert';
import type { Server } from 'node:http';

import { parseSseFrames } from '../src/ai/mathSseProtocol';

const ENV_KEYS = [
  'CALCORA_MANUAL_START', 'CALCORA_PORT', 'CALCORA_HOST', 'CALCORA_DESKTOP', 'NODE_ENV',
  'CALCORA_INTELLIGENCE_SCAN_TOKEN', 'CALCORA_LEARNING_EVALUATION_TOKEN',
  'CALCORA_ALLOW_PUBLIC_GEMINI', 'GEMINI_API_KEY', 'CALCORA_RUNTIME_PORT', 'CALCORA_ADMIN_TOKEN',
] as const;

async function main(): Promise<void> {
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
    delete process.env.GEMINI_API_KEY;
    delete process.env.CALCORA_ALLOW_PUBLIC_GEMINI;
    const { startServer } = await import('../server');
    server = await startServer();
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    const base = `http://127.0.0.1:${address.port}`;

    // Validation parity with the JSON endpoint: a malformed body still returns a
    // real HTTP status code BEFORE any stream is opened.
    const missingPrompt = await fetch(`${base}/api/ai/math/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: '   ' }),
    });
    assert.equal(missingPrompt.status, 400, 'empty prompt must be rejected with HTTP 400');

    const oversize = await fetch(`${base}/api/ai/math/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'x'.repeat(1001) }),
    });
    assert.equal(oversize.status, 400, 'an over-limit prompt must be rejected with HTTP 400');

    // Offline branch: one `result` frame carrying the same deterministic Tutor
    // payload the JSON endpoint returns. No key, no network — always.
    const streamed = await fetch(`${base}/api/ai/math/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'What is 2 + 3?', offlineOnly: true, tutorMode: 'assistant' }),
    });
    assert.equal(streamed.status, 200);
    assert.match(streamed.headers.get('content-type') ?? '', /text\/event-stream/, 'SSE content type');
    assert.match(streamed.headers.get('cache-control') ?? '', /no-store/, 'no proxy caching');
    const raw = await streamed.text();
    const { frames, rest } = parseSseFrames(raw.replace(/\r\n/g, '\n'));
    assert.equal(rest, '', 'the complete stream must be fully framed');
    const resultFrame = frames.find((frame) => frame.event === 'result');
    assert.ok(resultFrame, 'a result frame must be present');
    const payload = JSON.parse(resultFrame!.data) as Record<string, unknown>;
    assert.equal(payload.success, true, 'the local Tutor payload is successful');
    assert.equal(payload.isOfflineFallback, true, 'the local path is labelled honestly');
    assert.equal(typeof payload.answer, 'string', 'a local answer text is present');
    assert.equal(payload.geminiState, undefined, 'a local-only path must not advertise cloud state');
    assert.ok(payload.verification && typeof payload.verification === 'object', 'canonical verification outcome is present');
    assert.ok(
      !frames.some((frame) => frame.event === 'delta'),
      'a locally computed answer is already complete: no provisional streaming of local text',
    );

    // No prompt → the two endpoints validate identically.
    const jsonEndpoint = await fetch(`${base}/api/ai/math`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: '   ' }),
    });
    assert.equal(jsonEndpoint.status, 400, 'the streaming route validates like the JSON route');

    console.log('AI math stream endpoint regression tests passed');
  } finally {
    if (server) server.close();
    for (const [key, value] of Object.entries(previousEnvironment)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

main().catch((error) => {
  console.error('AI math stream endpoint tests failed:', error);
  process.exit(1);
});
