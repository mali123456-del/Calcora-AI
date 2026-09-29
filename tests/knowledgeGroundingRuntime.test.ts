import { strict as assert } from 'node:assert';
import { retrieveMathematicsKnowledge } from '../src/knowledge/knowledgeRetrieval';
import { resolveMultilingualConceptIds } from '../src/knowledge/multilingualMathConcepts';
import { orchestrateTutor } from '../src/services/tutorOrchestrator';

const cases = [
  ['en', 'What is a derivative?', 'calc-derivatives-rules'],
  ['ur', 'مشتق کیا ہے؟', 'calc-derivatives-rules'],
  ['es', '¿Qué es una derivada?', 'calc-derivatives-rules'],
  ['ar', 'ما هو المشتق؟', 'calc-derivatives-rules'],
  ['fr', "Qu'est-ce qu'une dérivée ?", 'calc-derivatives-rules'],
  ['de', 'Was ist eine Ableitung?', 'calc-derivatives-rules'],
  ['zh', '什么是导数？', 'calc-derivatives-rules'],
  ['ja', '導関数とは何ですか？', 'calc-derivatives-rules'],
  ['ko', '도함수란 무엇인가요?', 'calc-derivatives-rules'],
] as const;

for (const [language, query, expectedId] of cases) {
  const resolved = resolveMultilingualConceptIds(query);
  assert.ok(resolved.includes(expectedId), \`Expected \${language} query to resolve to \${expectedId}\`);

  const result = retrieveMathematicsKnowledge({ query, language, limit: 3 });
  assert.equal(result.primaryConcept?.id, expectedId, \`Expected \${language} retrieval to return \${expectedId}\`);
  assert.match(result.groundingContextText, /MATHEMATICAL KNOWLEDGE GROUNDING/);
}

const offline = await orchestrateTutor({
  prompt: 'What is a derivative?',
  language: 'en',
  offlineOnly: true,
});

assert.equal(offline.success, true);
assert.ok(offline.groundingSources.includes('Derivatives and Operational Differentiation Rules'));
assert.match(offline.answer, /instantaneous rate of change/i);
assert.equal(offline.responseSource, 'deterministic-fallback');

const invalid = await orchestrateTutor({
  prompt: '2+@',
  language: 'en',
  offlineOnly: true,
});

assert.equal(invalid.success, true);
assert.equal(invalid.deterministicAuthority.isVerified, false);
assert.deepEqual(invalid.steps, ['Input analyzed.', 'No verified local knowledge matched the request.']);

console.log('Knowledge grounding runtime tests passed');
