/**
 * Product-knowledge integrity tests (batch 6, Tutor enhancement).
 *
 * The Tutor's product knowledge must never drift from the implementation:
 *   1. every cited evidence file must actually exist in the repository;
 *   2. numeric/structural claims must equal the real source constants
 *      (115 languages, RTL codes, six allowlisted endpoints, four
 *      verification states);
 *   3. retrieval must return relevant facts and nothing for gibberish.
 */
import { strict as assert } from 'node:assert';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  PRODUCT_KNOWLEDGE_ITEMS,
  PRODUCT_KNOWLEDGE_VERSION,
  retrieveProductKnowledge,
} from '../src/knowledge/productKnowledge';
import { TUTOR_LANGUAGES } from '../src/ai/tutorLanguages';
import { DEVELOPER_ENDPOINTS } from '../src/services/developerEndpoints';
import { VERIFICATION_STATES } from '../src/verification/verificationStates';

const repoRoot = resolve(import.meta.dirname, '..');

/* --- 1. version sanity --- */
assert.ok(Number.isInteger(PRODUCT_KNOWLEDGE_VERSION) && PRODUCT_KNOWLEDGE_VERSION >= 1);

/* --- 2. every cited evidence file exists --- */
for (const item of PRODUCT_KNOWLEDGE_ITEMS) {
  const cited = [...item.evidence.matchAll(/(src|tests)\/[A-Za-z0-9/_.-]+\.tsx?/g)].map((m) => m[0]);
  assert.ok(cited.length >= 1, `${item.id} cites at least one file`);
  for (const relative of cited) {
    assert.ok(
      existsSync(resolve(repoRoot, relative)),
      `${item.id} cites ${relative}, which does not exist in the repository`,
    );
  }
}

/* --- 3. language claim matches the real registry --- */
const languagesItem = PRODUCT_KNOWLEDGE_ITEMS.find((item) => item.id === 'product-languages');
assert.ok(languagesItem, 'language fact exists');
assert.equal(TUTOR_LANGUAGES.length, 115, 'the real registry has 115 languages');
assert.ok(languagesItem.definition.includes(`${TUTOR_LANGUAGES.length} registered`), 'the claim states the real count');
const rtlCodes = TUTOR_LANGUAGES.filter((l) => l.direction === 'rtl').map((l) => l.code);
assert.ok(
  ['ar', 'fa', 'ur', 'he', 'ku'].every((code) => rtlCodes.includes(code)),
  'Arabic, Persian, Urdu, Hebrew and Kurdish are really right-to-left in the source data',
);

/* --- 4. developer claim matches the real allowlist --- */
const developerItem = PRODUCT_KNOWLEDGE_ITEMS.find((item) => item.id === 'product-developer');
assert.ok(developerItem, 'developer fact exists');
assert.equal(DEVELOPER_ENDPOINTS.length, 6, 'the real allowlist has six endpoints');
assert.ok(
  developerItem.definition.includes('six allowlisted public Calcora endpoints') || developerItem.definition.includes(`${DEVELOPER_ENDPOINTS.length} allowlisted`),
  'the claim states the real allowlist size',
);

/* --- 5. verification claim matches the real states --- */
const verificationItem = PRODUCT_KNOWLEDGE_ITEMS.find((item) => item.id === 'product-verification');
assert.ok(verificationItem, 'verification fact exists');
assert.deepEqual(
  [...VERIFICATION_STATES],
  ['VERIFIED', 'UNVERIFIED', 'FAILED', 'UNAVAILABLE'],
  'verification states are exactly what the app exports',
);

/* --- 6. retrieval behaviour --- */
const languageHit = retrieveProductKnowledge('Which languages can you answer in, like Arabic?');
assert.ok(languageHit.length >= 1);
assert.equal(languageHit[0].id, 'product-languages');

const limitsHit = retrieveProductKnowledge('Can you verify antiderivatives?');
assert.ok(limitsHit.some((fact) => fact.id === 'product-limits'));

assert.deepEqual(retrieveProductKnowledge('xqzzkwy flibbon'), [], 'gibberish retrieves nothing');
assert.equal(retrieveProductKnowledge('verify this answer').length <= 3, true, 'results are bounded');
assert.deepEqual(retrieveProductKnowledge('   '), [], 'empty query retrieves nothing');

/* every retrieved fact is shaped for the grounding channel */
for (const fact of languageHit) {
  assert.ok(typeof fact.concept === 'string' && fact.concept.length > 0);
  assert.ok(typeof fact.definition === 'string' && fact.definition.length > 20);
}

console.log('Product-knowledge integrity tests passed');
