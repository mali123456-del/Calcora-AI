import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { askAIMathAssistant } from '../src/ai/client';
import { orchestrateTutor, type TutorOrchestrationResult } from '../src/services/tutorOrchestrator';
import { resolveDisplayState } from '../src/components/VerificationBadge';
import { localExplanationMatchesDeterministicResult } from '../src/services/localExplanationGuard';
import type { VerificationOutcome } from '../src/verification/verificationStates';

const MODES = ['assistant', 'tutor', 'solver-review', 'socratic', 'step-by-step', 'quiz'] as const;

function assertTypedContract(result: TutorOrchestrationResult): void {
  assert.equal(typeof result.answer, 'string');
  assert.ok(Array.isArray(result.steps));
  assert.ok(['VERIFIED', 'UNVERIFIED', 'FAILED', 'UNAVAILABLE'].includes(result.deterministicAuthority.verification.state));
  assert.equal(
    result.deterministicAuthority.isVerified,
    result.deterministicAuthority.verification.state === 'VERIFIED',
  );
}

async function main(): Promise<void> {
  // The production orchestration API supports natural conversation without claiming
  // a mathematical result or forcing calculator verification on a greeting.
  const greeting = await orchestrateTutor({ prompt: 'Hello!', offlineOnly: true, mode: 'assistant' });
  assertTypedContract(greeting);
  assert.match(greeting.answer, /^(?:hello|hi|hey|welcome)\b/i);
  assert.equal(greeting.deterministicAuthority.isAvailable, false);
  assert.notEqual(greeting.deterministicAuthority.verification.state, 'VERIFIED');

  const capabilities = await orchestrateTutor({ prompt: 'What can Calcora do?', offlineOnly: true, mode: 'assistant' });
  assertTypedContract(capabilities);
  assert.match(capabilities.answer, /calculat|equation|tutor|graph/i);
  assert.equal(capabilities.deterministicAuthority.isAvailable, false);

  const conceptual = await orchestrateTutor({ prompt: 'Explain algebra to me', offlineOnly: true, mode: 'tutor' });
  assertTypedContract(conceptual);
  assert.ok(conceptual.answer.length > 40);
  assert.equal(conceptual.deterministicAuthority.isAvailable, false);
  assert.notEqual(conceptual.deterministicAuthority.verification.state, 'VERIFIED');

  // Every primary teaching mode remains reachable through the same production service.
  for (const mode of MODES) {
    const result = await orchestrateTutor({ prompt: 'Calculate 2 + 3', offlineOnly: true, mode });
    assertTypedContract(result);
    assert.equal(result.mode, mode);
  }

  const stepByStep = await orchestrateTutor({ prompt: 'Calculate 2 + 3', offlineOnly: true, mode: 'step-by-step' });
  assert.equal(stepByStep.deterministicAuthority.authoritativeResult, '5');
  assert.equal(stepByStep.deterministicAuthority.verification.state, 'VERIFIED');

  const unsupportedStepByStep = await orchestrateTutor({ prompt: 'Differentiate an unsupported symbolic function', offlineOnly: true, mode: 'step-by-step' });
  assert.equal(unsupportedStepByStep.deterministicAuthority.isVerified, false);
  assert.doesNotMatch(unsupportedStepByStep.answer, /Verified by authoritative calculation engine/i);

  const quiz = await orchestrateTutor({ prompt: 'Give me a quiz', offlineOnly: true, mode: 'quiz' });
  assert.ok(quiz.answer.length > 40);
  assert.notEqual(quiz.deterministicAuthority.verification.state, 'VERIFIED');

  // Failure and unsupported inputs must never become verified merely because a tutor
  // response exists.
  for (const prompt of ['Calculate 1 / 0', 'Calculate exp(1000)', 'Who won the 1998 football world cup?']) {
    const result = await orchestrateTutor({ prompt, offlineOnly: true });
    assertTypedContract(result);
    assert.equal(result.deterministicAuthority.isVerified, false, prompt);
    assert.notEqual(result.deterministicAuthority.verification.state, 'VERIFIED', prompt);
    assert.equal(result.deterministicAuthority.authoritativeResult, null, prompt);
  }

  const verified = await orchestrateTutor({ prompt: 'Calculate 7 * 8', offlineOnly: true, mode: 'assistant' });
  assertTypedContract(verified);
  assert.equal(verified.deterministicAuthority.authoritativeResult, '56');
  assert.equal(verified.deterministicAuthority.verification.state, 'VERIFIED');
  assert.equal(verified.deterministicAuthority.verification.method, 'exact-rational');
  assert.equal(verified.deterministicAuthority.verification.independent, '56');
  assert.equal(localExplanationMatchesDeterministicResult('The answer is 56.', '56'), true);
  assert.equal(localExplanationMatchesDeterministicResult('The answer is 57.', '56'), false);
  assert.equal(localExplanationMatchesDeterministicResult('The result is 56. Therefore, the answer is 57.', '56'), false);

  // Exercise the actual API route used by the panel with no cloud credential.
  const envKeys = [
    'CALCORA_MANUAL_START', 'CALCORA_PORT', 'CALCORA_HOST', 'CALCORA_DESKTOP',
    'NODE_ENV', 'GEMINI_API_KEY', 'CALCORA_ALLOW_PUBLIC_GEMINI',
    'CALCORA_ENABLE_INTELLIGENCE_SYNC',
  ] as const;
  const previous = new Map(envKeys.map((key) => [key, process.env[key]]));
  let server: Server | undefined;
  try {
    process.env.CALCORA_MANUAL_START = '1';
    process.env.CALCORA_PORT = '0';
    process.env.CALCORA_HOST = '127.0.0.1';
    process.env.CALCORA_DESKTOP = '1';
    process.env.NODE_ENV = 'production';
    process.env.GEMINI_API_KEY = '';
    process.env.CALCORA_ALLOW_PUBLIC_GEMINI = 'false';
    process.env.CALCORA_ENABLE_INTELLIGENCE_SYNC = 'false';

    const { startServer } = await import('../server');
    server = await startServer();
    const address = server.address();
    assert.ok(address && typeof address === 'object');
    const baseUrl = `http://127.0.0.1:${address.port}`;

    const response = await fetch(`${baseUrl}/api/ai/math`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        prompt: 'Calculate 7 * 8',
        tutorMode: 'assistant',
        language: 'en',
        topic: 'Arithmetic',
        offlineOnly: true,
      }),
    });
    assert.equal(response.status, 200, `live Tutor route status: ${response.status}`);
    const payload = await response.json() as {
      answer: string;
      deterministicResult: string | null;
      deterministicVerified: boolean;
      verification: VerificationOutcome;
      meta: { requiresCloudApiKey: boolean; responseSource: string };
    };
    assert.equal(payload.deterministicResult, '56');
    assert.equal(payload.deterministicVerified, true);
    assert.equal(payload.verification.state, 'VERIFIED');
    assert.equal(payload.verification.independent, '56');
    assert.equal(payload.meta.requiresCloudApiKey, false);
    assert.match(payload.answer, /56/);

    for (const prompt of ['Calculate 1 / 0', 'Calculate exp(1000)']) {
      const failedResponse = await fetch(`${baseUrl}/api/ai/math`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ prompt, tutorMode: 'assistant', language: 'en', offlineOnly: true }),
      });
      assert.equal(failedResponse.status, 200, prompt);
      const failedPayload = await failedResponse.json() as {
        deterministicResult: string | null;
        deterministicVerified: boolean;
        verification: VerificationOutcome;
      };
      assert.equal(failedPayload.deterministicResult, null, prompt);
      assert.equal(failedPayload.deterministicVerified, false, prompt);
      assert.notEqual(failedPayload.verification.state, 'VERIFIED', prompt);
    }

    // The browser client must preserve the server's canonical verification outcome;
    // it may not elevate provider prose or a legacy boolean over the canonical state.
    const originalFetch = globalThis.fetch;
    const canonical: VerificationOutcome = {
      state: 'UNAVAILABLE',
      method: 'none',
      reason: 'The deterministic engine could not evaluate this input.',
      actual: null,
      independent: null,
      checkedAt: Date.now(),
    };
    globalThis.fetch = async () => new Response(JSON.stringify({
      success: true,
      answer: 'A conversational response with no numeric claim.',
      expression: null,
      deterministicResult: '999',
      deterministicVerified: true,
      verification: canonical,
      isOfflineFallback: true,
      meta: { responseSource: 'local-deterministic' },
    }), { status: 200, headers: { 'content-type': 'application/json' } });
    try {
      const clientResult = await askAIMathAssistant('Hello', [], undefined, undefined, 'explain', {
        privacyMode: 'offline',
        tutorMode: 'assistant',
      });
      assert.equal(clientResult.verification?.state, 'UNAVAILABLE');
      assert.equal(clientResult.isVerified, false);
      assert.equal(clientResult.verifiedResult, undefined, 'an unverified server number is not surfaced as a verified result');
      assert.doesNotMatch(clientResult.answer, /^999(?:\b|\s)/, 'the legacy boolean cannot elevate a number over canonical UNAVAILABLE');
      assert.equal(resolveDisplayState({
        verification: clientResult.verification,
        isVerified: clientResult.isVerified,
        hasMathematicalResult: true,
      }).state, 'UNAVAILABLE');
    } finally {
      globalThis.fetch = async () => new Response(JSON.stringify({
        success: true,
        answer: 'The answer is 57.',
        expression: '7 * 8',
        deterministicResult: '57',
        deterministicVerified: true,
        isOfflineFallback: true,
        meta: { responseSource: 'local-deterministic' },
      }), { status: 200, headers: { 'content-type': 'application/json' } });
      try {
        const aiOnlyResult = await askAIMathAssistant('What is 7 * 8?', [], undefined, undefined, 'explain', {
          privacyMode: 'offline',
          tutorMode: 'assistant',
        });
        assert.equal(aiOnlyResult.isVerified, false, 'client-side expression evaluation alone cannot verify a model claim');
        assert.equal(aiOnlyResult.verifiedResult, undefined);
        assert.equal(aiOnlyResult.verification?.state, 'FAILED');
      } finally {
        globalThis.fetch = originalFetch;
      }
    }
  } finally {
    if (server?.listening) {
      await new Promise<void>((resolve, reject) => server!.close((error) => error ? reject(error) : resolve()));
      server.closeAllConnections();
    }
    for (const key of envKeys) {
      const value = previous.get(key);
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }

  console.log('Tutor pipeline contract tests passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
