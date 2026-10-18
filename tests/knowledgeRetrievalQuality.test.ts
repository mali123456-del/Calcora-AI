/**
 * Phase 5 — knowledge / RAG retrieval audit.
 *
 * Grounding is a claim about sources: when the Tutor grounds an answer, the
 * cited concept must actually be about the asked topic, and when the corpus
 * has nothing relevant the retrieval must return *nothing* rather than the
 * least-bad incidental match. A random-topic "primary concept" would put a
 * MATHEMATICAL KNOWLEDGE GROUNDING block full of irrelevant definitions in
 * front of the learner - honest absence beats a wrong citation.
 *
 * Pinned here:
 *   1. ids are unique (a duplicated id silently makes one item unreachable
 *      through KNOWLEDGE_BY_ID, which keeps only the last writer);
 *   2. topic-less queries ground in the right topic;
 *   3. queries the corpus cannot answer produce NO grounding at all;
 *   4. multilingual alias retrieval stays correct;
 *   5. a caller-stated topic remains authoritative.
 */
import assert from 'node:assert/strict';
import {
  ALL_MATHEMATICS_KNOWLEDGE,
  KNOWLEDGE_BY_ID,
} from '../src/knowledge/mathematicsKnowledgeIndex';
import { retrieveMathematicsKnowledge } from '../src/knowledge/knowledgeRetrieval';

// ---------------------------------------------------------------------------
// 1. Unique ids.
// ---------------------------------------------------------------------------
const ids = ALL_MATHEMATICS_KNOWLEDGE.map(i => i.id);
assert.equal(
  new Set(ids).size,
  ids.length,
  `duplicate knowledge ids: ${[...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))].join(', ')}`,
);

// ---------------------------------------------------------------------------
// 2. Topic-less retrieval grounds in the right topic.
// ---------------------------------------------------------------------------
const topicQueries: Array<[string, string]> = [
  ['derivative of x squared', 'Calculus'],
  ['pythagorean theorem', 'Geometry'],
  ['quadratic formula', 'Algebra'],
  ['mean and standard deviation of a dataset', 'Statistics'],
  ['area of a circle', 'Geometry'],
  ['matrix determinant', 'Linear Algebra'],
  ['probability of independent events', 'Probability'],
];
for (const [q, topic] of topicQueries) {
  const r = retrieveMathematicsKnowledge({ query: q });
  assert.ok(r.primaryConcept, `"${q}" should retrieve a concept`);
  assert.equal(
    r.primaryConcept!.topic,
    topic,
    `"${q}" grounded in ${r.primaryConcept!.topic} (${r.primaryConcept!.id}), expected ${topic}`,
  );
}

// ---------------------------------------------------------------------------
// 3. The corpus cannot answer these - so no grounding may be claimed.
// ---------------------------------------------------------------------------
for (const q of ['limits and continuity', 'combining like terms', 'who won the 1998 football world cup']) {
  const r = retrieveMathematicsKnowledge({ query: q });
  assert.equal(
    r.primaryConcept,
    undefined,
    `"${q}" must not ground in a random topic, got ${r.primaryConcept?.id} [${r.primaryConcept?.topic}]`,
  );
  assert.equal(
    r.groundingContextText,
    '',
    `"${q}" must not produce a grounding block`,
  );
  assert.equal(r.allRetrieved.length, 0, `"${q}" must not cite incidental matches`);
}

// ---------------------------------------------------------------------------
// 4. Multilingual alias retrieval stays correct.
// ---------------------------------------------------------------------------
const cases: Array<[string, string, string]> = [
  ['ur', 'مشتق کیا ہے', 'calc-derivatives-rules'],
  ['zh', '勾股定理', 'geom-pythagorean-theorem'],
  ['de', 'quadratische Gleichung', 'alg-quadratic-formula'],
  ['fr', 'formule quadratique', 'alg-quadratic-formula'],
];
for (const [language, query, expectedId] of cases) {
  const r = retrieveMathematicsKnowledge({ query, language });
  assert.equal(
    r.primaryConcept?.id,
    expectedId,
    `${language} "${query}" grounded in ${r.primaryConcept?.id ?? 'nothing'}, expected ${expectedId}`,
  );
}

// ---------------------------------------------------------------------------
// 5. A caller-stated topic remains authoritative for the primary slot.
// ---------------------------------------------------------------------------
const topic = retrieveMathematicsKnowledge({ query: 'solve for x in this problem', topic: 'Algebra' });
assert.equal(topic.primaryConcept?.topic, 'Algebra', 'the stated topic wins the primary slot');

// Both complex-number items must be individually reachable after the id fix.
const reachable = [...KNOWLEDGE_BY_ID.keys()].filter(id => id.startsWith('complex-'));
assert.equal(reachable.length, 2, `both complex-number items must be reachable, got: ${reachable.join(', ')}`);

console.log('Knowledge retrieval quality tests passed');
