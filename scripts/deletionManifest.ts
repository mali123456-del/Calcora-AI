/**
 * Phase 29 — deletion manifest for model-weight files.
 *
 * This manifest exists to make deletion auditable and reversible-by-hash. It deliberately
 * separates two categories that are easy to conflate:
 *
 *  - PROVEN_DUPLICATE: a byte-identical copy exists elsewhere (verified by SHA-256). Removing
 *    it destroys no unique data. This is the only category that can ever be deleted safely.
 *  - UNIQUE: no other copy exists anywhere on the machine. Deleting it permanently removes the
 *    only instance of that capability.
 *
 * Nothing here is executable by itself. `authorized` is false for every entry because Phase 29
 * requires explicit user authorization (step 9) before any permanent deletion, and the
 * capability gate for the chat/coding models has not been satisfied.
 */

export type ManifestCategory = 'PROVEN_DUPLICATE' | 'UNIQUE' | 'NOT_CALCORA';
export type AuthorizationStatus = 'NOT_REQUESTED' | 'REQUESTED' | 'GRANTED' | 'DENIED';

export interface DeletionCandidate {
  path: string;
  fileName: string;
  sizeBytes: number;
  sizeMB: number;
  sha256: string;
  category: ManifestCategory;
  /** The path that preserves a byte-identical copy, for PROVEN_DUPLICATE entries. */
  identicalCopyAt?: string;
  capabilityProvided: string;
  dependentFeatures: string[];
  /** Verification commands an operator can run to confirm state before acting. */
  verifyBeforeDelete: string[];
  verifyAfterDelete: string[];
  authorization: AuthorizationStatus;
  authorized: false;
}

/** SHA-256 measured this session on 2026-10-08 (Get-FileHash). */
export const MODEL_SHA256 = {
  'qwen2.5-1.5b-instruct-q4_k_m.gguf': '6A1A2EB6D15622BF3C96857206351BA97E1AF16C30D7A74EE38970E434E9407E',
  'Qwen2.5-3B-Instruct-Q4_K_M.gguf': '626B4A6678B86442240E33DF819E00132D3BA7DDDFE1CDC4FBB18E0A9615C62D',
  'qwen2.5-coder-1.5b-instruct-q4_k_m.gguf': 'CC324AF070C2ECBFD324A30884D2F951A7FF756ABA85CB811A6EC436933BB046',
  'Qwen2.5-Coder-3B-Instruct-Q4_K_M.gguf': '724FB256BEC1FF062B2F65E4569E871AD2E95AB2A3989723D1769C54294730B7',
} as const;

export const MODEL_SIZES_MB = {
  'qwen2.5-1.5b-instruct-q4_k_m.gguf': 1065.6,
  'Qwen2.5-3B-Instruct-Q4_K_M.gguf': 2007.4,
  'qwen2.5-coder-1.5b-instruct-q4_k_m.gguf': 1065.6,
  'Qwen2.5-Coder-3B-Instruct-Q4_K_M.gguf': 2007.4,
} as const;

export const PRIMARY_MODEL_DIR = 'C:\\My projects\\Calcora-AI-production\\models';
export const WORKTREE_MODEL_DIR =
  'C:\\Users\\kk\\.local\\share\\kilo\\worktree-pool\\calcora-ai-production-f0ad1ac9a6c8\\bright-bearberry\\models';

/**
 * The four worktree copies. Each is proven byte-identical to the primary of the same name, so
 * the primary is the sole recovery path and must remain intact.
 */
export function buildDeletionManifest(): DeletionCandidate[] {
  const candidates: DeletionCandidate[] = [];

  for (const [fileName, sha256] of Object.entries(MODEL_SHA256)) {
    const sizeMB = MODEL_SIZES_MB[fileName as keyof typeof MODEL_SIZES_MB];
    const primaryPath = `${PRIMARY_MODEL_DIR}\\${fileName}`;
    const worktreePath = `${WORKTREE_MODEL_DIR}\\${fileName}`;
    const isCoder = fileName.toLowerCase().includes('coder');
    const capability = isCoder
      ? 'Coding Assistant / Code Reviewer prose generation'
      : 'Tutor prose, explanations, multilingual phrasing';

    candidates.push({
      path: worktreePath,
      fileName,
      sizeBytes: Math.round(sizeMB * 1024 * 1024),
      sizeMB,
      sha256,
      category: 'PROVEN_DUPLICATE',
      identicalCopyAt: primaryPath,
      capabilityProvided: capability,
      dependentFeatures: [],
      verifyBeforeDelete: [
        `Get-FileHash -Algorithm SHA256 "${worktreePath}"`,
        `Get-FileHash -Algorithm SHA256 "${primaryPath}"`,
        '# Both hashes must equal each other before deleting either.',
        `git worktree list --porcelain  # confirm the owning worktree state`,
      ],
      verifyAfterDelete: [
        `Get-FileHash -Algorithm SHA256 "${primaryPath}"  # must still match`,
        '# Then run: node scripts/run-test-sweep.mjs  (expect 64/64)',
        '# Then run the packaged smoke test against C:\\Users\\kk\\calcora-build',
      ],
      authorization: 'NOT_REQUESTED',
      authorized: false,
    });

    candidates.push({
      path: primaryPath,
      fileName,
      sizeBytes: Math.round(sizeMB * 1024 * 1024),
      sizeMB,
      sha256,
      category: 'UNIQUE',
      capabilityProvided: capability,
      dependentFeatures: [
        '/api/ai/local-models discovery',
        'local GGUF generation path',
        'AIAssistantPanel local-model selector',
      ],
      verifyBeforeDelete: [
        '# BLOCKED: this is Calcora\'s only copy and its only generative path.',
        '# Measured generation 8.3-12.8 s/turn in the packaged app.',
        '# Requires a passing capability-replacement benchmark first (Phase 27/28).',
      ],
      verifyAfterDelete: ['# N/A -- deletion is not authorized and would remove the capability.'],
      authorization: 'NOT_REQUESTED',
      authorized: false,
    });
  }

  return candidates;
}

export function summarizeManifest(candidates: DeletionCandidate[]): {
  duplicates: { count: number; bytes: number };
  unique: { count: number; bytes: number };
} {
  const duplicates = candidates.filter((c) => c.category === 'PROVEN_DUPLICATE');
  const unique = candidates.filter((c) => c.category === 'UNIQUE');
  return {
    duplicates: { count: duplicates.length, bytes: duplicates.reduce((sum, c) => sum + c.sizeBytes, 0) },
    unique: { count: unique.length, bytes: unique.reduce((sum, c) => sum + c.sizeBytes, 0) },
  };
}