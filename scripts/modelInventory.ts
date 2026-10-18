/**
 * Phase 21 — machine-readable model inventory.
 *
 * Emits the inventory for every model-weight file Calcora can reach, with the fields the
 * directive requires: exact path, size, identity, verifiable capabilities, the Calcora
 * features that depend on it, what is legally/technically extractable, the proposed
 * destination, and retirement/backup status.
 *
 * The central honesty constraint, encoded here: a GGUF file is a learned statistical
 * representation, NOT an extractable catalogue of facts, formulas or grammar. This inventory
 * therefore records `extractableKnowledge` only for what is genuinely reproducible, and marks
 * free-form generative capability as something that cannot be "transferred" into documents.
 *
 * Identity is read from the GGUF header itself (magic, general.* keys, qwen2.* tensor shapes)
 * rather than inferred from the filename, so a mislabelled file cannot masquerade.
 */

import { closeSync, existsSync, openSync, readSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

export type RetirementStatus = 'ACTIVE' | 'DUPLICATE_CANDIDATE' | 'NOT_CALCORA';

export interface ModelIdentity {
  /** e.g. "qwen2" -- read from general.architecture */
  architecture: string;
  /** e.g. "qwen2.5-3b-instruct" -- read from general.name */
  modelName: string;
  /** e.g. "3B" -- read from general.size_label when present */
  sizeLabel: string;
  /** block/embedding/head counts, read from the qwen2.* tensor metadata */
  structure: Record<string, number>;
  /** e.g. "Q4_K_M" -- from general.file_type / filename when absent in metadata */
  quantization: string;
  contextLength?: number;
  instructionTuned: boolean;
  verifiedFrom: 'gguf-header';
}

export interface ModelInventoryEntry {
  id: string;
  path: string;
  fileName: string;
  sizeBytes: number;
  sizeMB: number;
  sha256?: string;
  format: 'GGUF' | 'ONNX' | 'BIN' | 'OTHER';
  identity: ModelIdentity | { architecture: string; verifiedFrom: 'path-context' | 'unreadable' };
  dependentFeatures: string[];
  extractableKnowledge: string[];
  extractableNote: string;
  proposedDestination: string;
  requiredMethod: string;
  dependenciesToRemoveBeforeRetirement: string[];
  retirementStatus: RetirementStatus;
  backupStatus: 'NONE' | 'DUPLICATE_ELSEWHERE' | 'NOT_APPLICABLE';
  deletionAuthorized: false;
}

const GGUF_MAGIC = 'GGUF';

/**
 * Read verifiable identity out of the GGUF header.
 *
 * GGUF stores `key -> typed value` pairs, so the raw bytes contain the keys as printable runs.
 * We scan the leading region for those runs rather than fully deserialising the container: the
 * goal is verified identity, not a complete parse, and a bounded scan cannot be fooled by
 * tensor payloads later in the file.
 */
export function readGgufIdentity(filePath: string): ModelIdentity | { architecture: string; verifiedFrom: 'unreadable' } {
  let fd: number | undefined;
  try {
    const headerLength = 262_144; // metadata lives well inside this; tensor data starts after
    const buffer = Buffer.alloc(headerLength);
    fd = openSync(filePath, 'r');
    const read = readSync(fd, buffer, 0, headerLength, 0);
    if (buffer.subarray(0, 4).toString('latin1') !== GGUF_MAGIC) {
      return { architecture: 'not-gguf', verifiedFrom: 'unreadable' };
    }
    const text = buffer.subarray(0, read).toString('latin1');

    const valueAfter = (key: string): string | undefined => {
      // key is length-prefixed; the printable run after it is the value for string fields.
      const index = text.indexOf(key);
      if (index < 0) return undefined;
      const tail = text.slice(index + key.length, index + key.length + 96);
      const run = /[\x20-\x7E]{2,}/.exec(tail);
      return run?.[0]?.trim();
    };

    // GGUF numeric metadata layout, established by inspecting the actual bytes of a real file
    // (four independent keys, all four decoding to the published Qwen2.5-3B shape):
    //   <key> | uint32LE length-prefix of the NEXT key | uint32LE value | ...
    // So the value sits at key.length + 4, not at key.length. Two earlier readings of this
    // layout produced plausible-but-wrong numbers (4, and 469762048); the published-architecture
    // cross-check is what makes this offset trustworthy rather than merely plausible.
    const structure: Record<string, number> = {};
    let contextLength: number | undefined;

    const readNumericAfterKey = (key: string): number | undefined => {
      const index = text.indexOf(key);
      if (index < 0) return undefined;
      const valueStart = index + key.length + 4;
      if (valueStart + 4 > read) return undefined;
      const value = buffer.readUInt32LE(valueStart);
      // Plausibility gate: a real tensor dimension or context length. Anything outside this
      // range means the offset is wrong, and reporting a fabricated number is worse than
      // reporting none.
      if (value === 0 || value > 1_000_000) return undefined;
      return value;
    };

    for (const [key, label] of [
      ['qwen2.block_count', 'blockCount'],
      ['qwen2.embedding_length', 'embeddingLength'],
      ['qwen2.attention.head_count', 'headCount'],
      ['qwen2.attention.head_count_kv', 'headCountKv'],
      ['qwen2.feed_forward_length', 'feedForwardLength'],
    ] as const) {
      const value = readNumericAfterKey(key);
      if (value !== undefined) structure[label] = value;
    }

    const context = readNumericAfterKey('qwen2.context_length');
    if (context !== undefined && context >= 512 && context < 10_000_000) contextLength = context;

    const modelName = valueAfter('general.name') ?? 'unknown';
    const architecture = valueAfter('general.architecture') ?? 'unknown';
    const sizeLabel = valueAfter('general.size_label') ?? 'unknown';
    const finetune = valueAfter('general.finetune') ?? '';

    return {
      architecture,
      modelName,
      sizeLabel,
      structure,
      quantization: /Q4_K_M/i.test(modelName) || /Q4_K_M/i.test(filePath) ? 'Q4_K_M' : 'see general.file_type',
      ...(contextLength === undefined ? {} : { contextLength }),
      instructionTuned: /instruct/i.test(modelName) || /instruct/i.test(finetune),
      verifiedFrom: 'gguf-header',
    };
  } catch {
    return { architecture: 'unreadable', verifiedFrom: 'unreadable' };
  } finally {
    if (fd !== undefined) { try { closeSync(fd); } catch { /* already closed */ } }
  }
}

/** Feature dependencies established by reading the runtime, not assumed. */
function dependentFeatures(fileName: string): string[] {
  const lower = fileName.toLowerCase();
  const features = ['/api/ai/local-models discovery', 'local GGUF generation path', 'AIAssistantPanel local-model selector'];
  if (lower.includes('coder')) features.push('Coding Assistant and Code Reviewer behaviour (model-routed)');
  else features.push('Tutor prose, explanations and multilingual phrasing (model-routed)');
  return features;
}

const EXTRACTABLE_NOTE =
  'Free-form generative ability cannot be extracted into documents: weights encode learned statistical ' +
  'representations, not a queryable catalogue of facts, formulas or grammar rules. Model output may be ' +
  'retained only as an UNVERIFIED candidate until the deterministic engine or an independent check confirms it.';

export function buildModelInventory(repoRoot: string): ModelInventoryEntry[] {
  const primaryDir = path.join(repoRoot, 'models');
  const worktreeDir = path.join(
    process.env.USERPROFILE ?? '', '.local', 'share', 'kilo', 'worktree-pool',
    'calcora-ai-production-f0ad1ac9a6c8', 'bright-bearberry', 'models',
  );
  const entries: ModelInventoryEntry[] = [];

  for (const dir of [primaryDir, worktreeDir]) {
    if (!existsSync(dir)) continue;
    const isDuplicateLocation = dir === worktreeDir;
    for (const fileName of readdirSync(dir)) {
      const full = path.join(dir, fileName);
      let stats;
      try { stats = statSync(full); } catch { continue; }
      if (!stats.isFile()) continue;
      const isGguf = fileName.toLowerCase().endsWith('.gguf');
      entries.push({
        id: `${fileName}@${isDuplicateLocation ? 'worktree-copy' : 'primary'}`,
        path: full,
        fileName,
        sizeBytes: stats.size,
        sizeMB: Math.round((stats.size / 1024 / 1024) * 10) / 10,
        sha256: undefined,
        format: isGguf ? 'GGUF' : fileName.endsWith('.onnx') ? 'ONNX' : fileName.endsWith('.bin') ? 'BIN' : 'OTHER',
        identity: isGguf
          ? readGgufIdentity(full)
          : { architecture: 'not-gguf', verifiedFrom: 'path-context' },
        dependentFeatures: dependentFeatures(fileName),
        extractableKnowledge: [
          'Reproducible candidate explanations and worked examples (model-generated, UNVERIFIED until validated)',
          'Candidate practice questions and multilingual phrasing (same verification requirement)',
        ],
        extractableNote: EXTRACTABLE_NOTE,
        proposedDestination: 'src/knowledge candidate store -> promoted to canonical only after verification',
        requiredMethod: 'controlled generation -> deterministic verification -> promotion with provenance',
        dependenciesToRemoveBeforeRetirement: [
          'Every Calcora feature consuming free-form generation must be replaced by independently verified behaviour, or descoped with explicit authorization',
        ],
        retirementStatus: isDuplicateLocation ? 'DUPLICATE_CANDIDATE' : 'ACTIVE',
        backupStatus: isDuplicateLocation ? 'DUPLICATE_ELSEWHERE' : 'NONE',
        deletionAuthorized: false,
      });
    }
  }
  return entries;
}