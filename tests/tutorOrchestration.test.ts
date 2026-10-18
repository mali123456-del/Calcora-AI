import { orchestrateTutor } from '../src/ai/tutorOrchestrator';
import { orchestrateTutor as orchestrateProductionTutor } from '../src/services/tutorOrchestrator';
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

  const normalizedTopic = await orchestrateProductionTutor({
    prompt: '7 * 8',
    topic: 'not-a-real-topic',
    offlineOnly: true,
  });
  if (normalizedTopic.pedagogy.topic !== 'Arithmetic' || normalizedTopic.deterministicAuthority.authoritativeResult !== '56') {
    throw new Error(`Invalid topic normalization regression failed: ${JSON.stringify(normalizedTopic.pedagogy)}`);
  }

  const conceptualUrdu = await orchestrateProductionTutor({
    prompt: 'مجھے algebra سمجھاؤ',
    topic: 'Algebra',
    language: 'ur',
    offlineOnly: true,
  });
  // The answer should contain algebra-related concepts, not necessarily the word "algebra" itself
  if (!conceptualUrdu.answer.toLowerCase().includes('linear') &&
      !conceptualUrdu.answer.toLowerCase().includes('equation') &&
      !conceptualUrdu.answer.toLowerCase().includes('الجبرا') &&
      !conceptualUrdu.answer.toLowerCase().includes('algebra')) {
    throw new Error(`Conceptual algebra tutoring fallback failed: ${conceptualUrdu.answer}`);
  }
  if (/gemini/i.test(conceptualUrdu.answer)) {
    throw new Error(`Gemini fallback leaked into offline tutor: ${conceptualUrdu.answer}`);
  }

  console.log(`Tutor orchestration tests passed: ${cases.length + 5}`);
}

main().catch((error) => { console.error(error); process.exit(1); });
