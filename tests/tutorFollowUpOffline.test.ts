import assert from 'node:assert/strict';
import { orchestrateTutor } from '../src/services/tutorOrchestrator';

async function main() {
  const result = await orchestrateTutor({
    prompt: 'Why?',
    mode: 'assistant',
    language: 'en',
    offlineOnly: true,
    conversation: [
      { role: 'user', content: 'Solve 2x + 3 = 11' },
      { role: 'assistant', content: 'The deterministic solution is x = 4. First subtract 3 from both sides, then divide by 2.' },
    ],
  });

  assert.match(result.answer, /Solve 2x \+ 3 = 11/, 'local follow-up should resolve the prior problem');
  assert.match(result.answer, /x = 4/, 'local follow-up should carry the actual previous answer');
  assert.match(result.answer, /which (?:line|step)|specific/i, 'ask for precision rather than inventing which detail is meant');
  assert.equal(result.deterministicAuthority.isVerified, false, 'quoted prior response is not a new deterministic calculation');

  console.log('Offline Tutor follow-up tests passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
