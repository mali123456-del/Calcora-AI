/**
 * Adaptive Tutor + Math Agent HTTP integration.
 *
 * Proves the two new local endpoints are genuinely reachable and that their honesty
 * guarantees hold across the real Express boundary:
 *   - the Agent reports a deterministically verified result for a real equation
 *   - the Agent refuses an off-topic goal instead of inventing a number
 *   - the learning plan reports "no evidence" for an empty history rather than a
 *     fabricated student profile
 *   - a real attempt history produces targeted, corpus-grounded practice
 */
import assert from 'node:assert/strict';
import type { Server } from 'node:http';

const ENV_KEYS = [
  'CALCORA_PORT',
  'CALCORA_HOST',
  'NODE_ENV',
  'GEMINI_API_KEY',
  'CALCORA_ALLOW_PUBLIC_GEMINI',
  'CALCORA_DESKTOP',
  'CALCORA_MANUAL_START',
  'CALCORA_INTELLIGENCE_SCAN_TOKEN',
  'CALCORA_LEARNING_EVALUATION_TOKEN',
] as const;

const previousEnvironment = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
let server: Server | undefined;

try {
  // Injected env must win over any developer .env on disk, and the endpoints under test
  // are local, so no cloud credential is provided.
  process.env.CALCORA_MANUAL_START = '1';
  process.env.CALCORA_PORT = '0';
  process.env.CALCORA_HOST = '127.0.0.1';
  process.env.NODE_ENV = 'production';
  process.env.GEMINI_API_KEY = '';
  process.env.CALCORA_ALLOW_PUBLIC_GEMINI = 'false';
  process.env.CALCORA_DESKTOP = '1';

  const { startServer } = await import('../server');
  server = await startServer();
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}`;

  async function post(route: string, body: unknown) {
    const response = await fetch(`${base}${route}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    // Read the body exactly once: a fetch body can only be consumed a single time.
    const text = await response.text();
    assert.equal(response.status, 200, `${route} returned ${response.status}: ${text}`);
    return JSON.parse(text) as any;
  }

  const health = await fetch(`${base}/api/health`);
  assert.equal(health.status, 200);
  assert.equal(health.headers.get('x-powered-by'), null);

  // ------------------------------------------------------------------
  console.log('\n[1] Math Agent: verified deterministic equation');
  const solved = await post('/api/ai/math-agent', { goal: 'Solve 3x - 4 = 11' });
  assert.equal(solved.success, true);
  assert.equal(solved.deterministicResult, '5', `expected x = 5, got ${solved.deterministicResult}`);
  assert.equal(solved.deterministicVerified, true);
  assert.equal(solved.verification.status, 'PASS', `expected PASS, got ${JSON.stringify(solved.verification)}`);
  assert.equal(solved.verification.method, 'substitute');
  assert.equal(solved.agent.bounded, true, 'the agent reports itself as bounded');
  assert.deepEqual(
    [...solved.agent.allowedTools].sort(),
    ['calculate', 'derivative', 'solveEquation'],
    'the agent allowlist is exactly the three deterministic math tools',
  );

  // ------------------------------------------------------------------
  console.log('[1b] Math Agent: derivative goal is symbolic and verified');
  const derived = await post('/api/ai/math-agent', { goal: 'Find the derivative of x^2' });
  assert.equal(derived.success, true, `derivative goal must succeed: ${derived.explanation}`);
  assert.equal(derived.deterministicResult, '2x', `d/dx(x^2) must be 2x, got ${derived.deterministicResult}`);
  assert.equal(derived.deterministicVerified, true, `derivative must verify: ${JSON.stringify(derived.verification)}`);
  assert.equal(derived.verification.status, 'PASS', `derivative must verify: ${JSON.stringify(derived.verification)}`);
  assert.equal(derived.verification.method, 'spot-check', 'the derivative is checked by central-difference spot-check');
  assert.match(derived.explanation, /d\/dx\(x\^2\) = 2x/, 'the explanation renders d/dx(x^2) = 2x');
  assert.ok(!/x\^2 = 2x/.test(derived.explanation), 'the false equation "x^2 = 2x" never appears');

  // ------------------------------------------------------------------
  console.log('[2] Math Agent: off-topic goal produces no number');
  const offTopic = await post('/api/ai/math-agent', { goal: 'Who won the 1998 football world cup?' });
  assert.equal(offTopic.deterministicResult, null, 'an off-topic goal yields no result value');
  assert.notEqual(offTopic.verification.status, 'PASS');
  assert.match(offTopic.explanation, /outside|not a calculation|unsupported|cannot/i);

  // ------------------------------------------------------------------
  console.log('[3] Math Agent: domain failure is not reported as "out of scope"');
  const undefined1 = await post('/api/ai/math-agent', { goal: 'Calculate 1/0' });
  assert.equal(undefined1.deterministicResult, null, '1/0 has no value');
  assert.notEqual(undefined1.verification.status, 'PASS', '1/0 must never verify');
  assert.match(`${undefined1.explanation} ${undefined1.error}`, /zero|domain|undefined|error/i);
  assert.doesNotMatch(
    undefined1.explanation,
    /outside Calcora's mathematical scope/,
    'a domain failure must not be mislabelled as an out-of-scope request',
  );

  // ------------------------------------------------------------------
  console.log('[4] Adaptive learning: empty history reports no evidence');
  const empty = await post('/api/ai/learning/plan', { events: [] });
  assert.equal(empty.success, true);
  assert.equal(empty.analysis.totalAttempts, 0);
  assert.equal(empty.analysis.overallAccuracy, null, 'accuracy is null, not a fabricated 0');
  assert.deepEqual(empty.analysis.weakConcepts, [], 'no weak concepts are invented');
  assert.deepEqual(empty.analysis.masteredConcepts, [], 'no mastery is invented');
  assert.deepEqual(empty.analysis.misconceptionSignals, [], 'no signals are invented');
  assert.ok(empty.practice.items.length > 0, 'practice is still offered from the corpus');
  assert.ok(
    empty.practice.items.every((item: any) => item.source === 'knowledge-corpus' || item.source === 'generated'),
    'every practice item declares its source',
  );

  // ------------------------------------------------------------------
  console.log('[5] Adaptive learning: real history produces targeted practice');
  const planned = await post('/api/ai/learning/plan', {
    events: [
      { id: 'a1', conceptId: 'alg-quadratic-formula', topic: 'Algebra', difficulty: 'beginner', outcome: 'incorrect', hintLevelUsed: 0, mode: 'practice', timestamp: 1 },
      { id: 'a2', conceptId: 'alg-quadratic-formula', topic: 'Algebra', difficulty: 'beginner', outcome: 'incorrect', hintLevelUsed: 2, mode: 'practice', timestamp: 2 },
      { id: 'a3', conceptId: 'alg-linear-equations', topic: 'Algebra', difficulty: 'beginner', outcome: 'correct', hintLevelUsed: 0, mode: 'practice', timestamp: 3 },
      { id: 'a4', conceptId: 'alg-linear-equations', topic: 'Algebra', difficulty: 'beginner', outcome: 'correct', hintLevelUsed: 0, mode: 'practice', timestamp: 4 },
    ],
    count: 3,
  });
  assert.equal(planned.analysis.totalAttempts, 4);
  assert.ok(planned.analysis.overallAccuracy !== null && planned.analysis.overallAccuracy > 0.49);
  assert.ok(
    planned.analysis.weakConcepts.includes('alg-quadratic-formula'),
    `the weak concept is identified, got ${JSON.stringify(planned.analysis.weakConcepts)}`,
  );
  assert.ok(planned.analysis.recommendations.length > 0, 'a recommendation is produced');
  assert.ok(
    planned.analysis.misconceptionSignals.every((signal: any) => typeof signal.evidence === 'string' && signal.evidence.length > 0),
    'every signal carries evidence',
  );
  assert.ok(
    planned.practice.items.some((item: any) => item.conceptId === 'alg-quadratic-formula'),
    'practice targets the weak concept',
  );
  assert.ok(planned.practice.rationale.length > 0, 'practice explains its own selection');
  assert.ok(planned.quiz.items.length > 0, 'a quiz is generated');
  assert.ok(
    planned.quiz.items.every((item: any) => typeof item.correctOptionIndex === 'number' && item.correctOptionIndex >= 0),
    'every quiz item has a valid correct option',
  );

  // ------------------------------------------------------------------
  console.log('[6] Input validation');
  const emptyGoal = await fetch(`${base}/api/ai/math-agent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ goal: '' }),
  });
  assert.equal(emptyGoal.status, 400, 'an empty goal is rejected');

  const oversized = await fetch(`${base}/api/ai/math-agent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ goal: 'x'.repeat(9000) }),
  });
  assert.equal(oversized.status, 400, 'an oversized goal is rejected');

  // Malformed events must be filtered out, not crash the plan.
  const malformed = await post('/api/ai/learning/plan', {
    events: [null, 'nope', 42, { conceptId: 'alg-linear-equations', outcome: 'correct' }],
  });
  assert.equal(malformed.analysis.totalAttempts, 1, 'only well-formed events are accepted');

  // ------------------------------------------------------------------
  console.log('[7] Cross-origin policy still applies to the new routes');
  const crossOrigin = await fetch(`${base}/api/ai/math-agent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'https://evil.example.com' },
    body: JSON.stringify({ goal: '2+2' }),
  });
  assert.equal(crossOrigin.status, 403, 'the new routes are covered by the origin policy');

  console.log('\nAdaptive Tutor + Math Agent integration tests passed');
} finally {
  if (server?.listening) {
    await new Promise<void>((resolve, reject) => {
      server!.close((error) => (error ? reject(error) : resolve()));
    });
  }
  for (const key of ENV_KEYS) {
    const value = previousEnvironment[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}
