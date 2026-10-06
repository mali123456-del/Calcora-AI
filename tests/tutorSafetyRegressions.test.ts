import assert from 'node:assert/strict';
import { askAIMathAssistant } from '../src/ai/client';
import { orchestrateTutor } from '../src/services/tutorOrchestrator';

async function main() {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('offline test boundary'); };
  const originalWarn = console.warn;
  console.warn = () => {};

  // A private/offline step check must never label an unchecked submission verified.
  const ungroundedStep = await askAIMathAssistant(
    '2x = 20',
    [],
    undefined,
    undefined,
    'teach',
    { privacyMode: 'offline', tutorMode: 'check-work', userStep: '2x = 20' },
  );
  assert.equal(ungroundedStep.isVerified, false, 'a step without its original problem cannot be verified');
  assert.match(ungroundedStep.verificationNote ?? '', /could not verify|not verified|no cloud/i);
  assert.doesNotMatch(ungroundedStep.answer, /verified by calculator engine/i);

  const verifiedStep = await askAIMathAssistant(
    '2x = 10',
    [],
    '2x + 5 = 15',
    undefined,
    'teach',
    { privacyMode: 'offline', tutorMode: 'check-work', userStep: '2x = 10' },
  );
  assert.equal(verifiedStep.isVerified, true, 'a locally checked equivalent step may be verified');
  assert.match(verifiedStep.answer, /correct/i);

  // When work contains the original equation and multiple transformations, identify
  // the learner's first invalid transition—not the first item in the correct chain.
  const reviewed = await orchestrateTutor({
    prompt: '2x + 5 = 15, so 2x = 20, so x = 10',
    userAnswer: '2x + 5 = 15, so 2x = 20, so x = 10',
    mode: 'check-work',
    topic: 'Algebra',
    language: 'en',
    offlineOnly: true,
  });
  assert.match(reviewed.answer, /2x\s*=\s*20/, 'feedback must identify the actual submitted incorrect step');
  assert.match(reviewed.answer, /2x\s*=\s*10/, 'feedback must give the deterministic correction');
  assert.match(reviewed.answer, /first (?:incorrect|wrong) step/i, 'feedback must label where the work first diverges');
  assert.equal(reviewed.deterministicAuthority.authoritativeResult, '5');

  const hintContext = {
    rawProblem: '2 + 2',
    canonicalExpression: '2 + 2',
    topic: 'Arithmetic' as const,
    difficulty: 'beginner' as const,
    authoritativeResult: '4',
    derivationSteps: ['Compute 2 + 2 = 4'],
    currentSubstepIndex: 0,
    messageCount: 0,
    updatedAt: Date.now(),
  };
  const earlyHint = await orchestrateTutor({
    prompt: 'Give me a hint',
    problemContext: hintContext,
    mode: 'hint',
    hintLevel: 1,
    language: 'en',
    offlineOnly: true,
  });
  assert.doesNotMatch(earlyHint.answer, /\b4\b/, 'level 1 hint must not leak a one-step final result');
  const revealedSolution = await orchestrateTutor({
    prompt: 'Give me a hint',
    problemContext: hintContext,
    mode: 'hint',
    hintLevel: 5,
    language: 'en',
    offlineOnly: true,
  });
  assert.match(revealedSolution.answer, /4/, 'level 5 may reveal the deterministic final result');
  assert.match(revealedSolution.answer, /complete solution/i);

  globalThis.fetch = originalFetch;
  console.warn = originalWarn;
  console.log('Tutor safety regression tests passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
