/**
 * Phase 22 — verified candidate knowledge store.
 *
 * This is the boundary that keeps model-generated text from becoming asserted fact. Model output
 * is admitted as an UNVERIFIED candidate and can only enter the canonical set through an
 * explicit, recorded verification outcome. Every promotion keeps the evidence that justified it.
 *
 * Design constraints taken from the directive:
 *  - Knowledge must remain usable without the originating model weights. Records therefore carry
 *    provenance as *text*, and nothing in this module loads or references a model file.
 *  - Rebuilding an index must not require regenerating the underlying knowledge. The store is
 *    plain JSON, so a search index can be rebuilt from records alone.
 *  - Never treat generated output as ground truth. `ingest` cannot set VERIFIED.
 */

export type GenerationMethod = 'local-gguf' | 'curated' | 'deterministic' | 'imported';

export interface KnowledgeProvenance {
  generationMethod: GenerationMethod;
  /** Opaque id, not a path: records must not depend on the model file still existing. */
  modelId?: string;
  modelName?: string;
  license: string;
  generatedAt: string;
}

export interface VerificationOutcome {
  passed: boolean;
  method: 'deterministic' | 'independent' | 'human-review';
  detail: string;
}

export interface CandidateRecord {
  id: string;
  domain: string;
  topic: string;
  concept: string;
  language: string;
  content: string;
  difficulty?: string;
  provenance?: KnowledgeProvenance;
  verificationStatus: 'UNVERIFIED' | 'VERIFIED';
  verification?: VerificationOutcome;
  rejectionReason?: string;
  version: number;
}

interface StoredRecord extends CandidateRecord {}

export class KnowledgeStore {
  private records = new Map<string, StoredRecord>();

  /**
   * Admit a candidate. Cannot admit anything as VERIFIED: promotion is a separate, audited step.
   *
   * Re-ingesting an existing id updates its content but MUST NOT silently demote it. A record
   * that already passed verification keeps that status and its evidence until it is explicitly
   * re-verified -- otherwise regenerating knowledge would quietly discard verified ground.
   */
  ingest(record: CandidateRecord): string {
    const existing = this.records.get(record.id);
    const stored: StoredRecord = {
      ...record,
      verificationStatus: 'UNVERIFIED',
      verification: undefined,
      rejectionReason: undefined,
      version: existing ? existing.version : 1,
    };
    // Preserve previously earned verification across a content refresh.
    if (existing?.verificationStatus === 'VERIFIED' && existing.verification) {
      stored.verificationStatus = 'VERIFIED';
      stored.verification = existing.verification;
      stored.version = existing.version + 1;
    }
    this.records.set(record.id, stored);
    return record.id;
  }

  add(record: CandidateRecord): string {
    return this.ingest(record);
  }

  /**
   * Promote to canonical knowledge. Requires both a passed verification outcome and provenance,
   * so no record can enter the canonical set without an auditable origin and evidence.
   */
  promote(id: string, outcome: VerificationOutcome): StoredRecord {
    if (!outcome || typeof outcome.passed !== 'boolean') {
      throw new Error('promotion refused: a verification outcome is required');
    }
    const record = this.records.get(id);
    if (!record) throw new Error(`promotion refused: unknown record ${id}`);
    if (!record.provenance) throw new Error('promotion refused: provenance is required');

    if (!outcome.passed) {
      record.verificationStatus = 'UNVERIFIED';
      record.verification = outcome;
      record.rejectionReason = outcome.detail;
      return record;
    }

    record.verificationStatus = 'VERIFIED';
    record.verification = outcome;
    record.rejectionReason = undefined;
    record.version += 1;
    return record;
  }

  all(): StoredRecord[] {
    return [...this.records.values()];
  }

  /** Only records that passed recorded verification. This is the set retrieval may treat as fact. */
  canonical(): StoredRecord[] {
    return this.all().filter((r) => r.verificationStatus === 'VERIFIED');
  }

  candidates(): StoredRecord[] {
    return this.all().filter((r) => r.verificationStatus === 'UNVERIFIED');
  }

  byLanguage(language: string): StoredRecord[] {
    return this.all().filter((r) => r.language === language);
  }

  byDomain(domain: string): StoredRecord[] {
    return this.all().filter((r) => r.domain === domain);
  }

  toJSON(): string {
    return JSON.stringify({ schema: 'calcora.candidateStore/1', records: this.all() }, null, 2);
  }

  /** A corrupted or unknown payload yields an empty store rather than an exception. */
  static fromJSON(serialised: string): KnowledgeStore {
    const store = new KnowledgeStore();
    try {
      const parsed = JSON.parse(serialised) as { records?: StoredRecord[] };
      for (const record of parsed?.records ?? []) {
        if (record && typeof record.id === 'string') store.records.set(record.id, record);
      }
    } catch {
      return new KnowledgeStore();
    }
    return store;
  }
}