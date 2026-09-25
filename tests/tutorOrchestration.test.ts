import { orchestrateTutor } from '../src/ai/tutorOrchestrator';
import { executeMathTool } from '../src/engine/toolLayer';

const cases = [
  ['what is 7 times 8?', '56'],
  ['calculate 17 times 24', '408'],
  ['integrate x^2 from 0 to 3', '9'],
  ['solve 2x + 4 = 10', '3'],
] as const;

async function main() {
  for (const [prompt, expected] of cases) {
    const r = await orchestrateTutor(prompt);
    if (!r.deterministic?.success || r.answer !== expected || !r.authoritative) {
      throw new Error(`Deterministic-first regression failed: ${prompt} -> ${r.answer}`);
    }
  }

  const malformed = await executeMathTool('calculate', { expression: '2 + 2; process.exit(1)' });
  if (malformed.success) throw new Error('Unsafe expression was accepted');

  console.log(`Tutor orchestration tests passed: ${cases.length + 1}`);
}

main().catch((error) => { console.error(error); process.exit(1); });
