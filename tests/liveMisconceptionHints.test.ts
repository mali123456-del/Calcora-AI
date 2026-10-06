/**
 * GAP-01 live-path proof.
 *
 * The misconception module is only worth building if the running Tutor uses it. This
 * test drives `orchestrateTutor` in hint mode with a real wrong submission and asserts
 * that the returned answer addresses the observed error, and that two different errors
 * on the same concept produce different guidance.
 */
import { orchestrateTutor } from '../src/services/tutorOrchestrator';

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
  section('a wrong submission produces a classified misconception on the live path');
  const signHint = await orchestrateTutor({
    prompt: '2x + 4 = 10',
    mode: 'hint',
    topic: 'Algebra',
    userAnswer: '-3',
    problemContext: { rawProblem: 'Solve 2x + 4 = 10', canonicalExpression: '2x + 4 = 10' } as never,
    hintLevel: 1,
    offlineOnly: true,
  });

  check(Boolean(signHint.misconception), 'the live hint path reports a misconception state');
  check(
    signHint.misconception?.errorClass === 'sign_error',
    `a sign error is classified on the live path (got ${signHint.misconception?.errorClass})`,
  );
  check(
    /Observed pattern/i.test(signHint.answer),
    'the hint answer announces the observed pattern',
  );
  check(
    /sign/i.test(signHint.answer),
    `the guidance addresses the sign specifically (answer head: ${signHint.answer.slice(0, 90).replace(/\n/g, ' | ')})`,
  );

  section('different errors on the same concept yield different live guidance');
  const oneSided = await orchestrateTutor({
    prompt: '2x + 5 = 17',
    mode: 'hint',
    topic: 'Algebra',
    userAnswer: '2x = 5 - 17',
    problemContext: { rawProblem: 'Solve 2x + 5 = 17', canonicalExpression: '2x + 5 = 17' } as never,
    hintLevel: 1,
    offlineOnly: true,
  });

  check(
    oneSided.misconception?.errorClass !== signHint.misconception?.errorClass,
    `a one-sided operation classifies differently from a sign error (got ${oneSided.misconception?.errorClass} vs ${signHint.misconception?.errorClass})`,
  );
  check(
    oneSided.answer !== signHint.answer,
    'the two different errors produce two different hint answers',
  );
  check(
    /both sides/i.test(oneSided.answer),
    `the one-sided-operation guidance mentions both sides (head: ${oneSided.answer.slice(0, 120).replace(/\n/g, ' | ')})`,
  );

  section('a correct submission does not invent a misconception');
  const correct = await orchestrateTutor({
    prompt: '2x + 4 = 10',
    mode: 'hint',
    topic: 'Algebra',
    userAnswer: '3',
    problemContext: { rawProblem: 'Solve 2x + 4 = 10', canonicalExpression: '2x + 4 = 10' } as never,
    hintLevel: 1,
    offlineOnly: true,
  });
  check(
    correct.misconception === null,
    `a correct submission yields no misconception (got ${correct.misconception?.errorClass ?? 'null'})`,
  );
  check(
    !/Observed pattern/i.test(correct.answer),
    'a correct submission does not claim an observed error pattern',
  );

  section('no submitted work means no fabricated classification');
  const noWork = await orchestrateTutor({
    prompt: '2x + 4 = 10',
    mode: 'hint',
    topic: 'Algebra',
    hintLevel: 1,
    offlineOnly: true,
  });
  check(noWork.misconception === null, 'with no submitted work, no misconception is reported');

  section('the live hint path stays deterministic and offline');
  const repeat = await orchestrateTutor({
    prompt: '2x + 4 = 10',
    mode: 'hint',
    topic: 'Algebra',
    userAnswer: '-3',
    problemContext: { rawProblem: 'Solve 2x + 4 = 10', canonicalExpression: '2x + 4 = 10' } as never,
    hintLevel: 1,
    offlineOnly: true,
  });
  check(repeat.answer === signHint.answer, 'the same input produces the same hint');
  check(
    signHint.deterministicAuthority.verification.state !== 'FAILED',
    `the live path does not report a spurious verification failure (got ${signHint.deterministicAuthority.verification.state})`,
  );

  console.log(`\nLive misconception hint tests passed: ${passed}, failed: ${failures.length}`);
  if (failures.length) {
    for (const f of failures) console.log(`  FAILED: ${f}`);
    process.exit(1);
  }
}

void main();