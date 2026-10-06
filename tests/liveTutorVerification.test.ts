/**
 * GAP-04a — live Tutor path verification tests.
 *
 * These exercise `orchestrateTutor` from `src/services/tutorOrchestrator.ts`, which is
 * the production Tutor the server calls. They exist to prove that the verification
 * state on the live path is *computed*, not aliased to "the engine returned a success".
 *
 * Before Wave 1 this file would fail on every `verification` assertion, because the
 * live path reported only `isVerified === isAvailable`.
 */
import { orchestrateTutor } from '../src/services/tutorOrchestrator';
import { VERIFICATION_STATES } from '../src/verification/verificationStates';

let passed = 0;
const failures: string[] = [];

function check(condition: boolean, message: string): void {
  if (condition) {
    passed += 1;
    console.log(`  PASS  ${message}`);
  } else {
    failures.push(message);
    console.log(`  FAIL  ${message}`);
  }
}

function section(name: string): void {
  console.log(`\n--- ${name} ---`);
}

async function main(): Promise<void> {
  section('live path always carries a canonical verification state');

  const prompts = [
    'Calculate 7 * 8',
    'Solve 2x + 4 = 10',
    'What is a derivative?',
    'Who won the 1998 football world cup?',
    '',
  ];

  for (const prompt of prompts) {
    const result = await orchestrateTutor({ prompt, offlineOnly: true });
    const state = result.deterministicAuthority.verification?.state;
    check(
      state !== undefined && VERIFICATION_STATES.includes(state),
      `prompt ${JSON.stringify(prompt.slice(0, 30))} reports a canonical state (got ${state})`,
    );
  }

  section('a genuinely computable answer reaches VERIFIED');
  const arithmetic = await orchestrateTutor({ prompt: 'Calculate 7 * 8', offlineOnly: true });
  check(
    arithmetic.deterministicAuthority.isAvailable,
    '7 * 8 produced a deterministic result',
  );
  check(
    arithmetic.deterministicAuthority.verification.state === 'VERIFIED',
    `7 * 8 is VERIFIED by an independent path (got ${arithmetic.deterministicAuthority.verification.state})`,
  );
  check(
    arithmetic.deterministicAuthority.verification.method === 'exact-rational',
    `the check is a separate evaluator, not a self-recomputation (got ${arithmetic.deterministicAuthority.verification.method})`,
  );
  check(
    arithmetic.deterministicAuthority.verification.independent !== null,
    'the independent observation is recorded on the live path',
  );
  check(
    arithmetic.deterministicAuthority.isVerified === true,
    'the derived isVerified boolean agrees with the state',
  );

  const equation = await orchestrateTutor({ prompt: 'Solve 2x + 4 = 10', offlineOnly: true });
  check(
    equation.deterministicAuthority.verification.state === 'VERIFIED',
    `2x + 4 = 10 is VERIFIED by root substitution (got ${equation.deterministicAuthority.verification.state})`,
  );
  check(
    equation.deterministicAuthority.verification.method === 'equation-residual',
    `equations use residual substitution (got ${equation.deterministicAuthority.verification.method})`,
  );

  section('isVerified is no longer an alias for isAvailable');
  // A conceptual prompt has no deterministic result, so both must be false and the
  // state must be UNAVAILABLE rather than a silent "not verified" boolean.
  const conceptual = await orchestrateTutor({ prompt: 'What is a derivative?', offlineOnly: true });
  check(
    conceptual.deterministicAuthority.isAvailable === false
      && conceptual.deterministicAuthority.isVerified === false,
    'a conceptual prompt has neither availability nor verification',
  );
  check(
    conceptual.deterministicAuthority.verification.state === 'UNAVAILABLE',
    `a conceptual prompt is UNAVAILABLE, not silently unverified (got ${conceptual.deterministicAuthority.verification.state})`,
  );

  section('FAILED is reachable and exposes the comparison');
  // Drive the real verifier through the live shape: a claim the engine did not make.
  const { verifyCalculation } = await import('../src/verification/independentVerifier');
  const mismatch = verifyCalculation('7 * 8', '57');
  check(mismatch.state === 'FAILED', 'a mismatched claim is FAILED');
  check(
    mismatch.actual === '57' && mismatch.independent === '56',
    `FAILED exposes actual vs independent for display (actual=${mismatch.actual}, independent=${mismatch.independent})`,
  );
  check(
    /mismatch/i.test(mismatch.reason),
    'the FAILED reason names the mismatch explicitly',
  );

  section('no answer path reports VERIFIED without an independent observation');
  const allStates = [
    await orchestrateTutor({ prompt: 'Calculate 24 - 4 * (3 + 2) + 18 / 3', offlineOnly: true }),
    await orchestrateTutor({ prompt: 'Solve x^2 - 5x + 6 = 0', offlineOnly: true }),
    await orchestrateTutor({ prompt: 'Calculate 1/3 + 1/6', offlineOnly: true }),
  ];
  check(
    allStates.every((r) => {
      const v = r.deterministicAuthority.verification;
      return v.state !== 'VERIFIED' || v.independent !== null;
    }),
    'VERIFIED is never reported without an independent observation',
  );
  check(
    allStates
      .filter((r) => r.deterministicAuthority.verification.state === 'VERIFIED')
      .every((r) => r.deterministicAuthority.isVerified === true),
    'the derived boolean and the state never disagree on the verified path',
  );

  section('responses never claim verification they do not have');
  const unsupported = await orchestrateTutor({ prompt: 'Who won the 1998 football world cup?', offlineOnly: true });
  check(
    !/100% verified/i.test(unsupported.answer),
    'an unsupported request does not claim results are 100% verified',
  );

  section('offline operation never requires a cloud key');
  const offline = await orchestrateTutor({ prompt: 'Calculate 7 * 8', offlineOnly: true });
  check(offline.isOfflineFallback, 'offlineOnly keeps the local path');
  check(
    offline.deterministicAuthority.verification.state === 'VERIFIED',
    'verification still reaches VERIFIED with no cloud model available',
  );

  section('known limitation: antiderivatives are authoritative but not independently verified');
  // The engine solves a definite integral authoritatively, but this build has no
  // independent re-derivation for an antiderivative. The honest state is
  // UNAVAILABLE, not VERIFIED. This test exists so the boundary is visible and
  // cannot be quietly upgraded into a false VERIFIED later.
  const integral = await orchestrateTutor({ prompt: 'integrate x^2 from 0 to 3', offlineOnly: true });
  check(
    integral.deterministicAuthority.isAvailable,
    'a definite integral is still produced by the deterministic engine',
  );
  check(
    integral.deterministicAuthority.verification.state !== 'VERIFIED',
    `an antiderivative is not claimed as independently verified (got ${integral.deterministicAuthority.verification.state})`,
  );
  check(
    integral.deterministicAuthority.isVerified === false,
    'the derived boolean agrees that an antiderivative is not independently verified',
  );
  check(
    integral.deterministicAuthority.verification.state === 'UNAVAILABLE'
      || integral.deterministicAuthority.verification.state === 'UNVERIFIED',
    `the antiderivative limitation is reported honestly (got ${integral.deterministicAuthority.verification.state})`,
  );

  console.log(`\nLive Tutor verification tests passed: ${passed}, failed: ${failures.length}`);
  if (failures.length) {
    for (const f of failures) console.log(`  FAILED: ${f}`);
    process.exit(1);
  }
}

void main();
