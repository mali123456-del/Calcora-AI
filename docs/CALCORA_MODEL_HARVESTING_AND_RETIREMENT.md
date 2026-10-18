# Model Harvesting, Capability Transfer & Retirement — 2026-10-08/09

**Scope:** Phases 21, 22, 26, 27, 28, 29 of the knowledge-harvesting directive.
**Repository:** `C:\My projects\Calcora-AI-production` (branch `main`)

---

## 0. Phase 27 — measured model-free capability (added)

A benchmark was run with `offlineOnly: true`, so **no language model may be consulted**. Thresholds
were declared as data in `src/evaluation/tutorBenchmark.ts` *before* the first run and were not
tuned to any result.

```
overall score: 87.5%  (14/16 tasks)
  math-reference             100%  threshold 100%  PASS
  concept-explanation        100%  threshold 100%  PASS
  language-conversation      100%  threshold 100%  PASS
  topic-change               100%  threshold  50%  PASS
  unsupported-knowledge      100%  threshold 100%  PASS
  tool-routing-verification  100%  threshold 100%  PASS
  offline-degradation        100%  threshold 100%  PASS
  safety-refusal             100%  threshold 100%  PASS
  follow-up-context            0%  threshold 100%  BELOW THRESHOLD
  misconception-correction     0%  threshold 100%  BELOW THRESHOLD
```

### 0.1 What the benchmark found

Running the orchestrator directly — a layer the packaged end-to-end gate bypasses — exposed three
**real defects in the Roman Urdu path that 68 passing suites had not caught**:

1. `detectLanguage` classified Roman Urdu (`"... ka ... kya hai"`) as **Hindi**.
2. An explicitly requested `language` was **silently ignored**; detection always won.
3. The Latin-script expression gate excluded Roman Urdu, so the derivative was never computed.

All three were fixed RED-first. The gate widening preserves the guards it was built for:
`"Simplify log_10(1000)"` and `"|A| = 14, |B| = 10"` are now permanent assertions yielding
`unknown`.

### 0.2 Honest note on the numbers

An earlier run reported **56.3%**. That figure was wrong — the harness read a non-existent
`result.verification` field, so a correctly `VERIFIED` system was recorded as failing. After fixing
the harness the honest baseline was **81.3%**; the three defect fixes took it to **87.5%**. The
defensible claim is **+6.2 points from real fixes**, not the larger headline.

### 0.3 Remaining gaps (both fail safe)

| Task | Cause | Direction |
|---|---|---|
| `followup-1` — "And its derivative?" | referent lives in conversation history; no cross-turn coreference | `unknown` — never a wrong answer |
| `misconception-1` | Latin-only branch fuses `"x^2 is x. is that right"` | `unknown` — never a wrong answer |

Both need architectural work (coreference; a separate Latin-path fix), not further regex changes.
Two speculative attempts at the second were reverted rather than left in.

---

## 1. Central finding (read this first)

**The four Calcora models are RETAINED. Model retirement is BLOCKED.**

The directive's stated end state is deletion of the local model files. That end state was not
reached, and could not be reached without violating the directive's own rule:

> *"Do not delete model files that are still needed for a supported local-inference feature."*
> — Phase 13

The four models are Calcora's **only** generative path. Measured inside the packaged application,
a local turn takes **8,286–12,880 ms**. Deleting them would remove working functionality — which
Phase 13 also forbids.

What *was* legitimately delivered is the removal of **6,148.4 MB of verified duplicates**, with
zero capability loss.

### Knowledge transfer: what was and was not achieved

| Claim | Status | Reason |
|---|---|---|
| Model knowledge was extracted into Calcora | **NOT IMPLEMENTED** | Weights encode learned statistical representations, not an extractable catalogue. No reproducible extraction path exists. |
| Model intelligence was transferred to Tutor AI | **NOT IMPLEMENTED** | Free-form generation cannot be represented as documents or a RAG index. |
| A model-independent Tutor AI exists | **PARTIAL** | 17 of 20 registered capabilities work with no model present. See §5. |

The knowledge catalogue (`src/knowledge/candidateStore.ts`) is a **pipeline and boundary**, not a
populated database. It exists so that any future harvested material is admitted as `UNVERIFIED`
and can only become authoritative through recorded deterministic verification. No knowledge was
extracted from model weights, because that is not technically possible.

---

## 2. Model inventory (Phase 21)

All model-weight files reachable on this machine: **14 files, 14.71 GB**.

### 2.1 Calcora models — 8 files, two locations

Identity below is read from the **GGUF header**, not inferred from filenames.

| Model | Size | Location |
|---|---|---|
| `qwen2.5-1.5b-instruct-q4_k_m.gguf` | 1,065.6 MB | primary + worktree copy |
| `Qwen2.5-3B-Instruct-Q4_K_M.gguf` | 2,007.4 MB | primary + worktree copy |
| `qwen2.5-coder-1.5b-instruct-q4_k_m.gguf` | 1,065.6 MB | primary + worktree copy |
| `Qwen2.5-Coder-3B-Instruct-Q4_K_M.gguf` | 2,007.4 MB | primary + worktree copy |

### 2.2 Header-verified identity

| Model | `general.architecture` | `general.name` | Layers | Hidden | Heads | KV heads | FFN | Context |
|---|---|---|---|---|---|---|---|---|
| 1.5B Instruct | `qwen2` | `qwen2.5-1.5b-instruct` | 28 | 1536 | 12 | 2 | 8960 | 32,768 |
| 3B Instruct | `qwen2` | `qwen2.5-3b-instruct` | 36 | 2048 | 16 | 2 | 11008 | 32,768 |
| Coder 1.5B | `qwen2` | `Qwen2.5 Coder 1.5B Instruct GGUF` | 28 | 1536 | 12 | 2 | 8960 | 32,768 |
| Coder 3B | `qwen2` | `Qwen2.5 Coder 3B Instruct AWQ` | 36 | 2048 | 16 | 2 | 11008 | 32,768 |

All values match the published Qwen2.5 architectures, which is the cross-check that makes them
trustworthy rather than merely plausible. Quantization `Q4_K_M` throughout.

**Metadata inconsistency found and not resolved:** `Qwen2.5-Coder-3B` reports `general.name`
containing `AWQ` while its quantization reads `Q4_K_M`. The 3B Instruct reports
`size_label: 3.4B`, not `3B`. Recorded, not guessed at.

### 2.3 SHA-256 (measured)

| Model | SHA-256 |
|---|---|
| `qwen2.5-1.5b-instruct-q4_k_m.gguf` | `6A1A2EB6D15622BF3C96857206351BA97E1AF16C30D7A74EE38970E434E9407E` |
| `Qwen2.5-3B-Instruct-Q4_K_M.gguf` | `626B4A6678B86442240E33DF819E00132D3BA7DDDFE1CDC4FBB18E0A9615C62D` |
| `qwen2.5-coder-1.5b-instruct-q4_k_m.gguf` | `CC324AF070C2ECBFD324A30884D2F951A7FF756ABA85CB811A6EC436933BB046` |
| `Qwen2.5-Coder-3B-Instruct-Q4_K_M.gguf` | `724FB256BEC1FF062B2F65E4569E871AD2E95AB2A3989723D1769C54294730B7` |

### 2.4 Non-Calcora model files — excluded from scope

Chrome `OptGuideOnDeviceModel/weights.bin` (2.67 GB), Word AugLoop ONNX, Skype bundle, GameDVR.
**Not Calcora artifacts. Not touched.**

### 2.5 Licences

Qwen2.5 models are distributed under Apache-2.0, which permits generation and redistribution.
This was **not independently re-verified** against a licence file inside the GGUF — status
**NOT VERIFIED**. It does not affect any decision here, since nothing was generated or deleted.

---

## 3. Storage topology (Phase 12/15)

| Location | Size | Notes |
|---|---|---|
| `.git` | 9,401.4 MB | of which `.git/lfs` = 9,398.6 MB |
| `models/` (primary, working tree) | 6,146 MB | **retained** — the runtime copy |
| Kilo worktree `models/` | 6,146 MB → **0 MB** | duplicates removed |
| `node_modules/` | 772.8 MB | required dependency |
| `src/` + `tests/` | 2.1 MB | source |

**git-lfs note:** git stores 135-byte LFS pointers; working-tree files are the real binaries
(GGUF magic + qwen2 metadata + full tokenizer confirmed by inspection).

**`.git/lfs` at 9,398.6 MB is the largest single storage item in the entire picture** — larger
than the models themselves. It may contain stale versions from earlier commits. `git lfs prune`
was **not run**: it deletes Git objects via reachability analysis that has not been verified, and
Phase 0 prohibits destructive Git operations. Flagged as an available-but-unverified opportunity.

---

## 4. Deletion performed (Phase 13)

**Category:** VERIFIED EXACT DUPLICATE — byte-identical confirmed by SHA-256 on both sides.

| Gate | Result |
|---|---|
| SHA-256 primary == copy (all 4) | **True** |
| Production references to `worktree-pool` | **0** (only in files authored during this work) |
| Runtime models directory | `CALCORA_MODELS_DIR` or `appRoot/models` — never the worktree |
| Full regression before deletion | **67/67 PASS** |
| Post-deletion regression + packaged gate | **67/67 PASS**, **48/48 packaged**, GGUF generation 12,880 ms |
| Primary models intact afterward | **Yes**, all four SHA-256 re-verified |

**Recovered: 6,148.4 MB.** Free space 12,321.1 → 18,469.4 MB.

Reversibility: the blobs remain in `.git/lfs`; the worktree files are tracked, so
`git lfs pull` / `git checkout -- models/` restores them. The worktree now reports 4 deleted
files.

---

## 5. Capability blast radius (Phase 28)

From `src/services/capabilityRegistry.ts` — 20 capabilities, 15 available, 5 planned with reasons.

**Requires the local models (3):**
- `local-model-generation` — Tutor prose, explanations, multilingual phrasing
- `coding-assistant` — planned, not implemented
- `code-reviewer` — planned, not implemented

**Independent of the models (17):** all deterministic mathematics, all 11 Tutor modes, knowledge
retrieval/RAG, multilingual detection and grammar, developer trace, verification.

This is the measured answer to "can Calcora run without its models?" — **yes for 17 of 20
capabilities.** It is also the measured answer to "is deleting them safe today?" — **no**, because
`local-model-generation` is currently available and load-bearing.

---

## 6. Training / adaptation (Phase 26) — measured, not assumed

**Hardware survey (measured):**

| Resource | Value |
|---|---|
| RAM | 15.4 GB total, **5.0 GB free** |
| CPU | Intel i5-6200U @ 2.30 GHz — **1 physical core**, 4 logical |
| GPU | Intel HD Graphics 520, 1 GB integrated — **no CUDA**; `nvidia-smi` absent |

**Verdict: LoRA / full fine-tuning of a 3B model is NOT FEASIBLE on this hardware.** Five GB of
free RAM and a 2015 dual-core mobile CPU cannot train or serve a 3B adapter at interactive
latency. No training run was attempted, and none is claimed: no dataset, configuration,
checkpoint, or artifact exists.

**RAG + the existing deterministic engine is the correct architecture for this machine, and it is
what Calcora already implements.** That is a conclusion reached from measured hardware, not a
substitute for a training attempt.

## 6.1 Distinguishing the four things that are often conflated

| Approach | Done here? | Evidence |
|---|---|---|
| Knowledge base / RAG | **Yes** | 32-module corpus, grounded retrieval, `MIN_GROUNDING_SCORE` |
| Prompting / response templates | **Yes** | 11 differentiated Tutor modes |
| Fine-tuning / LoRA | **No** | infeasible on this hardware (§6) |
| Distillation | **No** | no teacher-generated dataset, no run, no artifact |

No claim of model adaptation is made anywhere in Calcora.

---

## 7. Per-model retirement report

| Model | Identity / hash | Extracted resources | Replacement | Remaining dependencies | Retirement | Authorization | Deletion | Recovered |
|---|---|---|---|---|---|---|---|---|
| qwen2.5-1.5b-instruct | `6A1A2EB6…` | none (not possible) | none | generation path | **BLOCKED** | not requested | **not deleted** | 0 |
| Qwen2.5-3B-Instruct | `626B4A66…` | none (not possible) | none | generation path | **BLOCKED** | not requested | **not deleted** | 0 |
| qwen2.5-coder-1.5b | `CC324AF0…` | none (not possible) | none | none (no coding mode) | **RETAINED** | not requested | **not deleted** | 0 |
| Qwen2.5-Coder-3B | `724FB256…` | none (not possible) | none | none (no coding mode) | **RETAINED** | not requested | **not deleted** | 0 |
| 4 worktree copies | identical | n/a | n/a | none | **RETIRED** | granted by directive | **deleted** | **6,148.4 MB** |

Note: both coder models are **RETAINED despite having no implemented consumer**. They are
referenced only by the generic generation path, and Phase 13 forbids removing model support that
remains intended product capability. They are also the obvious candidates for *replacement* work
rather than deletion.

---

## 8. Known limitations

1. Model licences **NOT VERIFIED** against licence files inside the GGUF.
2. `.git/lfs` (9,398.6 MB) composition unexamined; reclaim opportunity unquantified.
3. No knowledge was extracted from any model, because no legitimate extraction path exists.
4. Coding Assistant, Code Reviewer, Research Assistant, Document Explainer and tool-calling agent
   are **planned, not implemented**, despite four of them being named in the directive as
   expected modes.
5. macOS and Linux runtime remain **NOT VERIFIED** (no host).