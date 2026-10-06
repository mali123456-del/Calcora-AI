# Calcora Local AI Implementation Plan

Audit date: 2026-10-06. This plan is based on the current checkout, not on a presumed clean branch.

## Repository evidence

- Checkout is `main` at `c8ac3c8d6819efd6c3e5b89090685f21a27cc619`, 20 commits behind `origin/main`.
- The worktree already contains many modified and untracked files plus three deleted release binaries. These are pre-existing user changes and must remain untouched. In particular, the normal `npm run verify` ends with a build that writes to `dist/` and `dist-electron/`; the tracked `dist-electron/main.cjs` is already modified. Validate source builds into a dedicated temporary output directory instead of overwriting those artifacts.
- Baseline `npm run lint` (`tsc --noEmit`) passes.
- Existing architecture already has the deterministic math engine (`src/engine/mathEngine.ts`), independent verifier (`src/verification/independentVerifier.ts`), curated knowledge/RAG (`src/knowledge/`, `src/knowledge/ragEngine.ts`), a 100+ language registry with explicitly tiered local capabilities (`src/ai/tutorLanguages.ts`), local Tutor orchestration (`src/services/tutorOrchestrator.ts`), privacy routing (`src/ai/offlinePolicy.ts`, `src/ai/client.ts`), bounded request/security controls, model-independent user-data export/import, and Electron's loopback server.
- The offline Tutor currently uses deterministic computation and local templates. `src/ai/ollamaClient.ts` and `src/ai/offlinePolicy.ts` only implement an Ollama-shaped HTTP stub. This task must not use or install Ollama.
- `models/` currently contains four Qwen2.5 GGUF files:

| File | Bytes | SHA-256 |
| --- | ---: | --- |
| `qwen2.5-1.5b-instruct-q4_k_m.gguf` | 1,117,320,736 | `6A1A2EB6D15622BF3C96857206351BA97E1AF16C30D7A74EE38970E434E9407E` |
| `Qwen2.5-3B-Instruct-Q4_K_M.gguf` | 2,104,932,768 | `626B4A6678B86442240E33DF819E00132D3BA7DDDFE1CDC4FBB18E0A9615C62D` |
| `qwen2.5-coder-1.5b-instruct-q4_k_m.gguf` | 1,117,320,768 | `CC324AF070C2ECBFD324A30884D2F951A7FF756ABA85CB811A6EC436933BB046` |
| `Qwen2.5-Coder-3B-Instruct-Q4_K_M.gguf` | 2,104,932,800 | `724FB256BEC1FF062B2F65E4569E871AD2E95AB2A3989723D1769C54294730B7` |

- Host observed: Windows 10 x64, four logical processors, Node 24.18.0. No `llama-cli` executable was found on `PATH`; the project does not currently vendor or bundle an inference runtime. GGUF CLI/runtime compatibility therefore cannot be live-verified without user-provided runtime software.
- `src/engine/formulaLibrary.ts` is a small display catalog while broader formula/knowledge coverage is distributed through the deterministic engines and knowledge corpus. Knowledge verification currently uses `VERIFIED | UNVERIFIED | REVIEW_REQUIRED`; it is not a model-extraction store.
- Existing docs and tests already report meaningful partial language coverage and local Tutor capabilities; no evidence supports claiming 100+ fully supported grammars, verified generated knowledge, fine-tuning, or live cloud retrieval.

## Evidence-based scope and sequence

1. **Complete the inventory / protect working-tree data.** Preserve all existing changes, models, build/release artifacts and documents. Do not run destructive Git commands, install runtimes, or invoke the output-destructive `clean` script.
2. **Implement a local GGUF runtime boundary.** Add a Node-only `llama.cpp` CLI adapter with safe model discovery, model-role metadata, validated model IDs, bounded CPU/context/thread defaults, strict argument-array subprocess invocation (`shell: false`), timeout/termination, bounded output, and explicit unavailable diagnostics. No runtime download and no Ollama path.
3. **Wire privacy-safe discovery and optional inference.** Add local model status to the existing local Calcora API and let the existing offline Tutor optionally ask a selected local model for explanatory prose. The deterministic Tutor/verifier remain the source of all numerical output and verification; failure/absence of a model must fall back to the existing local Tutor and never to Gemini in private/offline mode. Surface status/model selection in the current Tutor UI using its existing native-control patterns and local preference storage.
4. **Add regression coverage.** Test model discovery/role assignment/selection, malformed and missing model/runtime cases, subprocess argument safety, timeout cleanup, offline no-cloud behavior, and that model prose cannot change deterministic result/verification. Use injected test dependencies or a fake runtime; do not require a real model or runtime for CI.
5. **Document model setup and evidence.** Explain that llama.cpp is an optional separately installed prerequisite, list actual model inventory, state extraction/comparison and runtime compatibility as blocked/not verified while the executable is absent, and maintain honest language and knowledge status claims.
6. **Verify safely.** Run focused tests and all repository test scripts. Run typecheck. Build Vite and server/Electron bundles to unique temporary paths, not the existing `dist/`, `dist-electron/`, `release/` or user files. Browser/Electron checks are attempted only if the environment/runtime supports them; otherwise mark them not verified/blocked with evidence.
7. **Publish an evidence-labelled final report.** Create `CALCORA_LOCAL_AI_KNOWLEDGE_REPORT.md` with repository state, phase statuses, changes, tests/build/runtime evidence and exact remaining actions. Do not claim actual model inference, knowledge extraction, comparison, fine-tuning, 100-language fluency, or replacement readiness unless demonstrated.

## Explicit implementation boundaries

- No GGUF model is copied, modified, removed, or packaged by this implementation.
- No `llama.cpp` download/install is performed automatically. A missing runtime is an unavailable state, not a reason to fall back to cloud.
- No model output is stored as verified knowledge by default. Knowledge extraction/comparison requiring inference remains blocked until a real runtime is available and probes are actually run.
- Fine-tuning is not planned: the observed host has four logical CPUs, and no evidence justifies CPU training. RAG, local knowledge, prompting and model weights remain distinct.
- Existing static formula, RAG, multilingual, Tutor, user-data import/export, security, Electron and verification implementations are reused rather than replaced.

## Definition of done

- [x] Local GGUF runtime discovery and selection are integrated without Ollama or automatic installation, with safe timeout and fallback behavior.
- [x] Tests prove deterministic mathematical authority, offline privacy, runtime/model-unavailable fallback and safe subprocess handling.
- [x] All test/build/runtime claims in the final report are evidence-backed; unavailable hardware/runtime/live credentials are explicitly marked.
