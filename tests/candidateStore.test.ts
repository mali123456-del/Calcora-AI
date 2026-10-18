/**
 * RED-first coverage for the verified knowledge catalogue (Phase 22).
 *
 * The load-bearing requirement is that model-generated material may never enter the catalogue
 * as fact. These tests pin:
 *  - generated candidates are admitted only as UNVERIFIED, never as VERIFIED;
 *  - promotion to VERIFIED requires a recorded deterministic verification result;
 *  - promotion is impossible without provenance (method, model version, licence);
 *  - a rejected verification keeps the record out of the canonical set;
 *  - deduplication is by stable id, so re-generation cannot create duplicates;
 *  - records remain usable with the originating model absent (no weight reference is required);
 *  - an empty or corrupted store degrades safely rather than throwing.
 */
import assert from 'node:assert/strict';
import {
  KnowledgeStore,
  type CandidateRecord,
  type VerificationOutcome,
} from '../src/knowledge/candidateStore';

const provenance = {
  generationMethod: 'local-gguf' as const,
  modelId: 'gguf-0123456789abcdef',
  modelName: 'Qwen2.5-3B-Instruct-Q4_K_M',
  license: 'Apache-2.0',
  generatedAt: '2026-10-08T00:00:00.000Z',
};

function candidate(overrides: Partial<CandidateRecord> = {}): CandidateRecord {
  return {
    id: 'deriv-power-rule',
    domain: 'calculus',
    topic: 'differentiation',
    concept: 'Power rule',
    language: 'en',
    content: 'd/dx(x^n) = n*x^(n-1)',
    provenance,
    verificationStatus: 'UNVERIFIED',
    ...overrides,
  };
}

function main() {
  const store = new KnowledgeStore();

  // 1. Generated material enters as UNVERIFIED, never as VERIFIED.
  store.ingest(candidate());
  assert.equal(store.all().length, 1, 'a candidate is admitted to the candidate set');
  assert.equal(store.all()[0].verificationStatus, 'UNVERIFIED', 'generated material is never admitted as VERIFIED');
  assert.equal(store.canonical().length, 0, 'an unverified candidate is not canonical knowledge');

  // 2. Promotion is impossible without a verification result.
  assert.throws(
    () => store.promote('deriv-power-rule', undefined as unknown as VerificationOutcome),
    /verification/i,
    'promotion without a verification outcome must be refused',
  );

  // 3. Promotion requires provenance.
  // `add`/`ingest` return the id, so the id must be used directly rather than `.id` on it.
  const noProvenanceId = store.add(candidate({ id: 'x', provenance: undefined as never }));
  assert.throws(
    () => store.promote(noProvenanceId, { passed: true, method: 'deterministic', detail: 'checked' }),
    /provenance/i,
    'promotion without provenance must be refused',
  );

  // 4. A passing deterministic result promotes the record.
  store.promote('deriv-power-rule', { passed: true, method: 'deterministic', detail: 'd/dx(x^2)=2x verified' });
  assert.equal(store.canonical().length, 1, 'a verified record becomes canonical knowledge');
  const promoted = store.canonical()[0];
  assert.equal(promoted.verificationStatus, 'VERIFIED', 'promotion records VERIFIED');
  assert.equal(promoted.verification?.method, 'deterministic', 'the verification method is retained as evidence');
  assert.match(String(promoted.verification?.detail), /verified/, 'the verification detail is retained as evidence');

  // 5. A FAILED verification keeps the record out of the canonical set.
  const wrongId = store.add(candidate({ id: 'deriv-wrong', content: 'd/dx(x^n) = n*x^(n+1)' }));
  store.promote(wrongId, { passed: false, method: 'deterministic', detail: 'disproved by substitution' });
  assert.equal(store.canonical().length, 1, 'a failed verification must not enter canonical knowledge');
  assert.equal(store.all().find((r) => r.id === wrongId)?.verificationStatus, 'UNVERIFIED', 'a rejected candidate stays unverified');
  assert.match(String(store.all().find((r) => r.id === wrongId)?.rejectionReason), /disproved/, 'the rejection reason is retained');

  // 6. Deduplication by stable id.
  const before = store.all().length;
  store.ingest(candidate());
  assert.equal(store.all().length, before, 're-ingesting the same id must not duplicate the record');
  assert.equal(
    store.all().find((r) => r.id === 'deriv-power-rule')?.verificationStatus,
    'VERIFIED',
    'a content refresh must not silently demote already-verified knowledge',
  );

  // 7. Records survive the absence of the originating model.
  const serialised = store.toJSON();
  const restored = KnowledgeStore.fromJSON(serialised);
  assert.equal(restored.canonical().length, 1, 'the catalogue is restorable without any model weights');
  assert.equal(restored.all().length, store.all().length, 'every record round-trips through storage');
  assert.equal(
    restored.canonical()[0].provenance.modelName,
    'Qwen2.5-3B-Instruct-Q4_K_M',
    'provenance records what produced the knowledge even after the model is gone',
  );

  // 8. Corrupted input degrades safely.
  const corrupted = KnowledgeStore.fromJSON('{ this is not json');
  assert.equal(corrupted.all().length, 0, 'a corrupted store yields an empty catalogue instead of throwing');
  assert.equal(corrupted.canonical().length, 0, 'a corrupted store has no canonical knowledge');

  // 9. Language and domain are queryable, so retrieval can filter by either.
  store.add(candidate({ id: 'ur-welcome', language: 'ur', domain: 'language', content: 'خوش آمدید' }));
  assert.equal(store.byLanguage('ur').length, 1, 'records are retrievable by language');
  assert.equal(store.byDomain('calculus').length >= 1, true, 'records are retrievable by domain');

  console.log('PASS  generated material is admitted only as UNVERIFIED');
  console.log('PASS  promotion is refused without a verification outcome');
  console.log('PASS  promotion is refused without provenance');
  console.log('PASS  a passing deterministic verification promotes the record with evidence');
  console.log('PASS  a failed verification is rejected, retained with its reason, and stays non-canonical');
  console.log('PASS  records deduplicate by stable id');
  console.log('PASS  the catalogue is usable with the originating model absent');
  console.log('PASS  a corrupted store degrades to empty instead of throwing');
  console.log('PASS  records are retrievable by language and domain');
}

main();