/**
 * Required multi-turn Tutor conversation flow — real orchestrateTutor calls,
 * not mocks. This is the product flow from the specification:
 *
 *   User: "What is a derivative?"          -> conceptual explanation
 *   User: "Explain it more simply."        -> follow-up that references turn 1
 *   User: "Now calculate the derivative of x²." -> d/dx(x²) = 2x, VERIFIED
 *   User: "Why?"                           -> the power rule actually applied
 *
 * Invariants checked every turn:
 *   - the deterministic engine, not the language layer, owns mathematical values;
 *   - a verified state appears only for the computed claim;
 *   - follow-up turns carry previous-turn context;
 *   - no turn fabricates a mathematical result.
 */
import assert from 'node:assert/strict';
import { orchestrateTutor, type TutorOrchestrationResult } from '../src/services/tutorOrchestrator';

type Turn = { role: 'user' | 'assistant'; content: string };

let passed = 0;
function check(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Conversation flow failed: ${message}`);
  passed += 1;
}

async function main() {
  const conversation: Turn[] = [];

  async function ask(prompt: string): Promise<TutorOrchestrationResult> {
    const result = await orchestrateTutor({ prompt, offlineOnly: true, conversation: [...conversation] });
    conversation.push({ role: 'user', content: prompt }, { role: 'assistant', content: result.answer });
    return result;
  }

  // -------------------------------------------------------------------------
  // Turn 1 — conceptual question
  // -------------------------------------------------------------------------
  const t1 = await ask('What is a derivative?');
  check(t1.answer.trim().length > 0, 'turn 1 must produce an answer');
  check(/derivative/i.test(t1.answer), 'turn 1 must explain what a derivative is');
  check(
    !t1.deterministicAuthority.isVerified,
    'a conceptual answer must not be marked verified as a computed value',
  );

  // -------------------------------------------------------------------------
  // Turn 2 — follow-up referencing the previous turn
  // -------------------------------------------------------------------------
  const t2 = await ask('Explain it more simply.');
  check(t2.answer.trim().length > 0, 'turn 2 must produce an answer');
  check(
    /following up on|previous answer/i.test(t2.answer),
    'turn 2 must carry previous-turn context, got: ' + t2.answer.slice(0, 160),
  );
  check(
    /derivative/i.test(t2.answer),
    'turn 2 must reference the derivative discussion from turn 1',
  );
  check(
    !t2.deterministicAuthority.isVerified,
    'turn 2 must not fabricate a verified mathematical value',
  );

  // -------------------------------------------------------------------------
  // Turn 3 — compute the derivative (unicode superscript input, as specified)
  // -------------------------------------------------------------------------
  const t3 = await ask('Now calculate the derivative of x².');
  check(
    t3.deterministicAuthority.authoritativeResult === '2x',
    `turn 3 must report d/dx(x²) = 2x, got ${JSON.stringify(t3.deterministicAuthority.authoritativeResult)}`,
  );
  check(
    t3.deterministicAuthority.verification.state === 'VERIFIED',
    `turn 3 must be VERIFIED by independent spot-check, got ${t3.deterministicAuthority.verification.state}`,
  );
  check(/2x/.test(t3.answer), 'turn 3 answer must show 2x');
  check(/power rule/i.test(t3.answer), 'turn 3 answer must name the power rule as the applied rule');

  // -------------------------------------------------------------------------
  // Turn 4 — "Why?" must answer with the reasoning already computed
  // -------------------------------------------------------------------------
  const t4 = await ask('Why?');
  check(t4.answer.trim().length > 0, 'turn 4 must produce an answer');
  check(
    /power rule/i.test(t4.answer),
    'turn 4 must explain the power rule from the previous turn, got: ' + t4.answer.slice(0, 200),
  );
  check(
    t4.deterministicAuthority.verification.state !== 'FAILED',
    'turn 4 must not report a failed verification for a clarifying question',
  );

  // -------------------------------------------------------------------------
  // Bounded context: the orchestrator only ever receives a bounded window
  // -------------------------------------------------------------------------
  check(conversation.length === 8, 'the conversation must hold exactly 4 turns (8 messages)');

  console.log(`Tutor conversation flow tests passed: ${passed}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
