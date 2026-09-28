import { orchestrateTutor } from '../src/ai/tutorOrchestrator';
import { orchestrateTutor as orchestrateProductionTutor } from '../src/services/tutorOrchestrator';
import { executeMathTool } from '../src/engine/toolLayer';
import { extractMathProblem } from '../src/engine/problemExtractor';
import { buildQuickPrompt, getQuickPromptProfile } from '../src/utils/aiQuickPrompts';

const cases = [
  ['what is 7 times 8?', '56'],
  ['calculate 17 times 24', '408'],
  ['3 * 4 =', '12'],
  ['integrate x^2 from 0 to 3', '9'],
  ['solve 2x + 4 = 10', '3'],
] as const;

async function main() {
  for (const [prompt, expected] of cases) {
    const r = await orchestrateTutor(prompt);
    if (!r.deterministic?.success || r.answer !== expected || !r.authoritative) throw new Error(`Deterministic-first regression failed: ${prompt} -> ${r.answer}`);
  }

  const extractedNatural = extractMathProblem('what is 7 times 8?');
  if (extractedNatural.kind !== 'calculate' || extractedNatural.expression !== '7 * 8') throw new Error(`Natural-language multiplication extraction failed: ${JSON.stringify(extractedNatural)}`);

  const extractedTrailingEquals = extractMathProblem('3 * 4 =');
  if (extractedTrailingEquals.kind !== 'calculate' || extractedTrailingEquals.expression !== '3 * 4') throw new Error(`Trailing-equals arithmetic extraction failed: ${JSON.stringify(extractedTrailingEquals)}`);

  const deepPrompt = buildQuickPrompt('check-errors', { inputPrompt: '3 * 4' });
  if (deepPrompt.includes('[CALCORA_RESPONSE_PROFILE:') || getQuickPromptProfile('check-errors') !== 'deep') throw new Error('Quick Prompt leaked internal response-profile metadata');

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

  console.log(`Tutor orchestration tests passed: ${cases.length + 4}`);
}

main().catch((error) => { console.error(error); process.exit(1); });
