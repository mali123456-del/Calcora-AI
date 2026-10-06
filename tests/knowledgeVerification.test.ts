/**
 * GAP-13a — knowledge verification status tests.
 *
 * The point of this suite is that the status is *measured*, not asserted. If a
 * future change marks the whole corpus VERIFIED by hand, these tests fail.
 */
import { ALL_MATHEMATICS_KNOWLEDGE, KNOWLEDGE_BY_ID, KNOWLEDGE_BY_TOPIC } from '../src/knowledge/mathematicsKnowledgeIndex';
import {
  KNOWLEDGE_VERIFICATION_STATUSES,
  auditKnowledgeCorpus,
  collectKnowledgeEvidence,
  computeKnowledgeVerificationStatus,
  knowledgeIsAuthoritative,
  summariseKnowledgeAudit,
} from '../src/knowledge/knowledgeVerification';
import { retrieveMathematicsKnowledge } from '../src/knowledge/knowledgeRetrieval';
import { calculateExpression } from '../src/engine/mathEngine';

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

section('every knowledge item carries a status');
check(ALL_MATHEMATICS_KNOWLEDGE.length > 0, 'the corpus is non-empty (precondition)');
const missing = ALL_MATHEMATICS_KNOWLEDGE.filter((i) => !i.verificationStatus);
check(missing.length === 0, `no item is missing a verificationStatus (missing=${missing.length})`);
const invalid = ALL_MATHEMATICS_KNOWLEDGE.filter(
  (i) => !KNOWLEDGE_VERIFICATION_STATUSES.includes(i.verificationStatus!),
);
check(invalid.length === 0, `every status is one of the published values (invalid=${invalid.length})`);

section('the corpus is NOT uniformly verified');
const counts = summariseKnowledgeAudit(ALL_MATHEMATICS_KNOWLEDGE);
console.log(`  distribution: ${JSON.stringify(counts)}`);
check(
  counts.VERIFIED! < ALL_MATHEMATICS_KNOWLEDGE.length,
  `not every item claims VERIFIED (VERIFIED=${counts.VERIFIED} of ${ALL_MATHEMATICS_KNOWLEDGE.length})`,
);
check(
  (counts.REVIEW_REQUIRED ?? 0) > 0,
  'at least one item honestly needs review rather than claiming verification',
);
check(
  Object.values(counts).reduce((a, b) => a + b, 0) === ALL_MATHEMATICS_KNOWLEDGE.length,
  'every item is counted in exactly one bucket',
);

section('no item contradicts the deterministic engine');
const contradictions = ALL_MATHEMATICS_KNOWLEDGE.filter((i) => collectKnowledgeEvidence(i).hasContradiction);
check(
  contradictions.length === 0,
  `no worked example contradicts the engine (contradictions=${contradictions.map((c) => c.id).join(', ')})`,
);

section('the status is derived, not hand-asserted');
// Re-running the audit on the audited corpus must be a fixed point. If a status had
// been typed in by hand and disagreed with the evidence, this would drift.
const reaudited = auditKnowledgeCorpus(ALL_MATHEMATICS_KNOWLEDGE);
const drifted = reaudited.filter((item, i) => item.verificationStatus !== ALL_MATHEMATICS_KNOWLEDGE[i].verificationStatus);
check(drifted.length === 0, `re-auditing the corpus is a fixed point (drifted=${drifted.length})`);
check(
  computeKnowledgeVerificationStatus(ALL_MATHEMATICS_KNOWLEDGE[0])
    === ALL_MATHEMATICS_KNOWLEDGE[0].verificationStatus,
  'recomputing a single item reproduces its recorded status',
);

section('a VERIFIED item is backed by real checked evidence');
for (const item of ALL_MATHEMATICS_KNOWLEDGE.filter((i) => i.verificationStatus === 'VERIFIED')) {
  const evidence = collectKnowledgeEvidence(item);
  check(
    evidence.agreedExamples > 0,
    `${item.id} is VERIFIED only because ${evidence.agreedExamples} example(s) were re-derived and agreed`,
  );
}

section('knowledge is never the authority for a numerical result');
check(
  KNOWLEDGE_VERIFICATION_STATUSES.every((s) => knowledgeIsAuthoritative(s) === false),
  'no knowledge status is ever treated as authoritative over the math engine',
);
check(knowledgeIsAuthoritative(undefined) === false, 'a missing status is also never authoritative');

section('retrieval carries the status and does not override computation');
const retrieval = retrieveMathematicsKnowledge({ query: 'linear equations', topic: 'Algebra' });
if (retrieval.primaryConcept) {
  check(
    KNOWLEDGE_VERIFICATION_STATUSES.includes(retrieval.primaryConcept.verificationStatus!),
    'a retrieved concept carries its verification status',
  );
  const engine = calculateExpression('2 + 3 * 4');
  check(
    engine.value === 14 && !Number.isNaN(engine.value),
    'the deterministic engine still computes the value regardless of knowledge status',
  );
} else {
  check(false, 'retrieval returned a primary concept (precondition)');
}

section('indexed views expose the status');
const byIdSample = [...KNOWLEDGE_BY_ID.values()].slice(0, 5);
check(
  byIdSample.every((i) => Boolean(i.verificationStatus)),
  'items reached through the id index carry a status',
);
const topicSample = [...KNOWLEDGE_BY_TOPIC.values()].flat().slice(0, 5);
check(
  topicSample.every((i) => Boolean(i.verificationStatus)),
  'items reached through the topic index carry a status',
);

console.log(`\nKnowledge verification tests passed: ${passed}, failed: ${failures.length}`);
if (failures.length) {
  for (const f of failures) console.log(`  FAILED: ${f}`);
  process.exit(1);
}
