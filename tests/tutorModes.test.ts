/**
 * Hint, check-work and mistake-explanation regression tests.
 *
 * These modes previously fell through to a generic "Deterministic Math Tutor is
 * active" placeholder. They must instead: give a usable hint when a problem is
 * active, ask for the problem when none is, check a submitted answer against the
 * deterministic solution, and identify the first incorrect step in submitted work.
 */
import { orchestrateTutor } from '../src/services/tutorOrchestrator';

let passed = 0;

function check(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Tutor mode regression failed: ${message}`);
  passed += 1;
}

const ACTIVE_PROBLEM = {
  rawProblem: '2x + 5 = 15',
  canonicalExpression: '2x + 5 = 15',
  problemType: 'linear-equation',
  topic: 'Algebra' as const,
  difficulty: 'intermediate' as const,
  authoritativeResult: '5',
  derivationSteps: [
    'Standard Form: 2x - 10 = 0',
    'Subtract constant from both sides: 2x = 10',
    'Divide both sides by 2: x = 10 ÷ 2',
    'Final Solution: x = 5',
  ],
  currentSubstepIndex: 0,
  messageCount: 3,
  updatedAt: Date.now(),
};

function generic(answer: string): boolean {
  return /Deterministic Math Tutor is active/i.test(answer);
}

async function main() {
  // ------------------------------------------------------------------
  // 1. Hint WITH an active problem: useful, and must not reveal the answer.
  // ------------------------------------------------------------------
  const hintWithProblem = await orchestrateTutor({
    prompt: 'Give me a hint',
    mode: 'hint',
    hintLevel: 1,
    topic: 'Algebra',
    language: 'en',
    offlineOnly: true,
    problemContext: ACTIVE_PROBLEM,
  });
  check(!generic(hintWithProblem.answer), `hint with active problem returned a placeholder: ${hintWithProblem.answer}`);
  check(
    hintWithProblem.answer.includes('2x'),
    `hint must reference the active problem, got: ${hintWithProblem.answer}`,
  );
  check(
    // A real hint quotes at least one real derivation step as guidance.
    /Standard Form|Subtract constant|Divide both sides/i.test(hintWithProblem.answer),
    `hint must give an actionable real step, got: ${hintWithProblem.answer}`,
  );
  check(
    !/\bx\s*=\s*5\b/.test(hintWithProblem.answer),
    `hint-only request must not reveal the final answer, got: ${hintWithProblem.answer}`,
  );

  // ------------------------------------------------------------------
  // 2. A higher hint level may advance, but hint mode must still not state the answer.
  // ------------------------------------------------------------------
  const hintLevel3 = await orchestrateTutor({
    prompt: 'Give me a hint',
    mode: 'hint',
    hintLevel: 3,
    topic: 'Algebra',
    language: 'en',
    offlineOnly: true,
    problemContext: ACTIVE_PROBLEM,
  });
  check(!generic(hintLevel3.answer), 'level-3 hint must not be a placeholder');
  check(
    hintLevel3.answer.length > hintWithProblem.answer.length - 1,
    'a higher hint level should reveal at least as much guidance',
  );

  // ------------------------------------------------------------------
  // 3. Hint WITHOUT an active problem must ask for the problem.
  // ------------------------------------------------------------------
  const hintNoProblem = await orchestrateTutor({
    prompt: 'Give me a hint',
    mode: 'hint',
    hintLevel: 1,
    topic: 'Algebra',
    language: 'en',
    offlineOnly: true,
  });
  check(!generic(hintNoProblem.answer), 'hint without a problem must not be a placeholder');
  check(
    /what (problem|equation|question)|which (problem|equation)|send|share|type|provide|paste/i.test(hintNoProblem.answer),
    `hint without a problem should ask for it, got: ${hintNoProblem.answer}`,
  );

  // ------------------------------------------------------------------
  // 4. Urdu hint without a problem must ask in Urdu, not English placeholder.
  // ------------------------------------------------------------------
  const urduHintNoProblem = await orchestrateTutor({
    prompt: 'مجھے hint دو',
    mode: 'hint',
    hintLevel: 1,
    topic: 'Algebra',
    language: 'ur',
    offlineOnly: true,
  });
  check(!generic(urduHintNoProblem.answer), 'Urdu hint must not be a placeholder');
  check(
    /[\u0600-\u06FF]/.test(urduHintNoProblem.answer),
    `Urdu hint should be localized, got: ${urduHintNoProblem.answer}`,
  );
  check(
    /مسئله|مساوات|سوال|بھیج|فراہم|لکھیں|بتائیں/.test(urduHintNoProblem.answer),
    `Urdu hint should ask for the problem in Urdu, got: ${urduHintNoProblem.answer}`,
  );

  // ------------------------------------------------------------------
  // 5. check-work with a correct answer.
  // ------------------------------------------------------------------
  const correct = await orchestrateTutor({
    prompt: 'x = 5',
    mode: 'check-work',
    userAnswer: 'x = 5',
    topic: 'Algebra',
    language: 'en',
    offlineOnly: true,
    problemContext: ACTIVE_PROBLEM,
  });
  check(!generic(correct.answer), 'correct-answer check must not be a placeholder');
  check(
    /correct|right|well done|\bspot on\b/i.test(correct.answer),
    `correct answer must be confirmed, got: ${correct.answer}`,
  );

  // ------------------------------------------------------------------
  // 6. check-work with a wrong answer must state the verified value.
  // ------------------------------------------------------------------
  const wrong = await orchestrateTutor({
    prompt: 'x = 7',
    mode: 'check-work',
    userAnswer: 'x = 7',
    topic: 'Algebra',
    language: 'en',
    offlineOnly: true,
    problemContext: ACTIVE_PROBLEM,
  });
  check(!generic(wrong.answer), 'wrong-answer check must not be a placeholder');
  check(
    /not quite|incorrect|wrong|does not/i.test(wrong.answer),
    `wrong answer must be identified, got: ${wrong.answer}`,
  );
  check(
    /\b5\b/.test(wrong.answer),
    `wrong answer should show the verified value, got: ${wrong.answer}`,
  );

  // ------------------------------------------------------------------
  // 7. Submitted work: identify the FIRST incorrect step, do not fabricate steps.
  // ------------------------------------------------------------------
  const badWork = await orchestrateTutor({
    prompt: '2x + 5 = 15, so 2x = 20, so x = 10',
    mode: 'check-work',
    userAnswer: '2x + 5 = 15, so 2x = 20, so x = 10',
    topic: 'Algebra',
    language: 'en',
    offlineOnly: true,
  });
  check(!generic(badWork.answer), 'mistake explanation must not be a placeholder');
  check(
    /2x\s*=\s*10|2x - 10|2x = 10/.test(badWork.answer),
    `mistake explanation should reach the correct intermediate step, got: ${badWork.answer}`,
  );
  check(
    !/step 1 is wrong|your first step is wrong/i.test(badWork.answer) || /2x = 10/.test(badWork.answer),
    `first incorrect step should be identified accurately, got: ${badWork.answer}`,
  );

  // ------------------------------------------------------------------
  // 8. Invalid/incomplete expression must be distinguished from a wrong answer.
  // ------------------------------------------------------------------
  const invalid = await orchestrateTutor({
    prompt: 'x =',
    mode: 'check-work',
    userAnswer: 'x =',
    topic: 'Algebra',
    language: 'en',
    offlineOnly: true,
    problemContext: ACTIVE_PROBLEM,
  });
  check(!generic(invalid.answer), 'invalid expression must not be a placeholder');
  check(
    /not a complete|incomplete|valid (equation|expression)|could not (read|parse)|isn't a complete/i.test(invalid.answer),
    `incomplete expression should be called out as such, got: ${invalid.answer}`,
  );
  check(
    !/incorrect answer/i.test(invalid.answer),
    'incomplete expression must not be reported as a merely wrong answer',
  );

  // ------------------------------------------------------------------
  // 8b. check-work with NO active problem must not verify the answer against
  //     itself. Regression: "x = 7" used to be solved to 7 and called correct.
  // ------------------------------------------------------------------
  const noProblem = await orchestrateTutor({
    prompt: 'x = 7',
    mode: 'check-work',
    userAnswer: 'x = 7',
    topic: 'Algebra',
    language: 'en',
    offlineOnly: true,
  });
  check(
    !/correct|right answer|spot on/i.test(noProblem.answer),
    `must not confirm an unverified answer: ${noProblem.answer}`,
  );
  check(
    /cannot confirm|no deterministic solution|send the (full )?problem|working/i.test(noProblem.answer),
    `should say it cannot verify without the problem, got: ${noProblem.answer}`,
  );
  check(
    !noProblem.deterministicAuthority.isVerified,
    'must not report a verified result when nothing was actually verified',
  );

  // ------------------------------------------------------------------
  // 9. No false verification claims when the engine verified nothing.
  // ------------------------------------------------------------------
  const unverified = await orchestrateTutor({
    prompt: 'Solve this for me: 7x^3 + 2 = 99x - 4x^2 + 12',
    mode: 'check-work',
    userAnswer: 'x = 3',
    topic: 'Algebra',
    language: 'en',
    offlineOnly: true,
  });
  check(
    !/verified by (the )?deterministic|confirmed correct/i.test(unverified.answer) || unverified.deterministicAuthority.isVerified,
    'must not claim verification the engine did not perform',
  );

  // ------------------------------------------------------------------
  // 10. Context survives mode/language/difficulty changes.
  // ------------------------------------------------------------------
  const firstTurn = await orchestrateTutor({
    prompt: 'Solve 3y - 4 = 11',
    topic: 'Algebra',
    language: 'en',
    offlineOnly: true,
  });
  check(
    firstTurn.deterministicAuthority.isVerified && firstTurn.deterministicAuthority.authoritativeResult === '5',
    `base solve must be deterministic, got ${firstTurn.deterministicAuthority.authoritativeResult}`,
  );

  const carriedContext = {
    rawProblem: '3y - 4 = 11',
    canonicalExpression: '3y - 4 = 11',
    topic: 'Algebra' as const,
    difficulty: 'beginner' as const,
    authoritativeResult: '5',
    derivationSteps: firstTurn.deterministicAuthority.derivationSteps,
    currentSubstepIndex: 0,
    messageCount: 2,
    updatedAt: Date.now(),
  };

  const hintAfterSwitch = await orchestrateTutor({
    prompt: 'Give me a hint',
    mode: 'hint',
    hintLevel: 1,
    topic: 'Geometry',        // topic changed
    difficulty: 'advanced',   // difficulty changed
    language: 'en',           // language changed
    offlineOnly: true,
    problemContext: carriedContext,
  });
  check(
    hintAfterSwitch.answer.includes('3y') || hintAfterSwitch.answer.includes('3y - 4 = 11'),
    `active problem must survive topic/difficulty change, got: ${hintAfterSwitch.answer}`,
  );

  console.log(`Tutor mode tests passed: ${passed}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
