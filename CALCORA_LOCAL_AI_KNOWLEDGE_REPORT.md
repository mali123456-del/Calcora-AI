# Calcora Local AI + Knowledge Report

**Audit/run date:** 2026-10-06  
**Checkout:** `main` at `c8ac3c8d6819efd6c3e5b89090685f21a27cc619`, 20 commits behind `origin/main`  
**Evidence boundary:** This report describes the local checkout and tests executed in this environment. It does not claim a runtime/model inference that was not run.

## Executive result

- **PASS** — completed read-only repository/model audit before implementation; existing user modifications, GGUF models, release data, docs, and tests were preserved.
- **PASS** — optional, server-side `llama.cpp` CLI adapter is integrated into Calcora’s Local-only Tutor; the deterministic math engine and independent verifier remain the sole mathematical authority.
- **PASS** — local model status and selection are surfaced in the Tutor, with offline-only request routing and deterministic fallback when the model/runtime is missing.
- **PASS** — TypeScript check; all **45 package `test:*` scripts**; focused runtime/privacy/verifier checks; real-browser run (**68/68**); Vite renderer build; and esbuild server/Electron main/preload bundling.
- **PARTIAL** — four local GGUFs are identified and available to discovery, but no llama.cpp CLI was installed or present on `PATH`; actual inference, GGUF load compatibility and model comparison are **NOT VERIFIED**.
- **PARTIAL** — model-independent curated/local knowledge, RAG, formula catalog, and multilingual resources already exist and are reused. This task did not create an LLM knowledge-extraction pipeline/store or expand formula/language content.
- **PASS** — real-browser verification (`tests/browserVerification.ts`): 68 checks passed, 0 failed. It selected a discovered GGUF, confirmed the Local-only switch and opaque model ID request, checked deterministic verification, PDF grounding, and theme behavior; no cloud/external requests, console errors, HTTP failures, or failed requests were observed.
- **NOT VERIFIED** — packaged Electron runtime was not launched; actual model inference remains blocked by the missing llama.cpp executable.

## 1. Repository state and preservation

**PASS** — inspected `package.json`, `package-lock.json`, `server.ts`, Electron files, `src/`, tests, knowledge, docs, scripts, release/build folders, `models/`, existing reports, and the working tree before modifying source.

The working tree was already heavily modified: dozens of tracked changes, extensive untracked source/test/docs/release/model files, and three deleted `dist/` binaries. The checkout is 20 commits behind `origin/main`. No destructive Git command was used, no dependency/runtime was installed, and no model, repository file, or release artifact was deleted. The pre-existing changes/deletions remain as discovered. Build verification wrote only under `%TEMP%\calcora-safe-build-20261006`.

Baseline `npm run lint` passed before implementation.

## 2. Existing architecture reused

- **Deterministic calculation:** `src/engine/mathEngine.ts`, equation/calculus/statistics/unit engines, and allowlisted `src/engine/toolLayer.ts`.
- **Independent verification:** `src/verification/independentVerifier.ts` / exact-rational and equation residual paths; canonical four states carried through the Tutor response and `VerificationBadge`.
- **Knowledge/RAG:** 28 curated math items with computed verification status (`4 VERIFIED`, `24 REVIEW_REQUIRED`, `0 UNVERIFIED` in the tested corpus), retrieval/index and optional Supabase path. Knowledge is never a numerical authority.
- **Tutor:** `src/services/tutorOrchestrator.ts` is the deterministic local Tutor production path with local templates, learning/conversation context, hint/mode behavior and no-Gemini operation. `src/ai/tutorOrchestrator.ts` remains the separate optional cloud precomputation path.
- **Privacy/security:** `src/ai/offlinePolicy.ts`, same-origin `/api/ai/math`, origin policy, bounded request body/rate limits, path-safe Electron loopback service and no exposed runtime path in client model metadata.
- **Multilingual:** 115 registered languages; measurement in `test:tutor-languages` reported `FULL=2`, `PARTIAL=35`, `DETECTION_ONLY=78`. `test:languages` measured 44 deep grammar profiles and 44 response templates. These are tiered claims, not proof of 115 full grammars.
- **Persistence:** Existing knowledge is Calcora-owned/static/indexed; learner/history/notebook data has separate model-independent local persistence and safe user-data import/export. No model-derived fact is persisted as verified.
- **Formula inventory:** `FORMULA_CATALOG` has 13 display entries; broader formulas and concepts are distributed across deterministic engine modules and curated knowledge. This task does not represent the existing catalog as comprehensive.

## 3. Changes made

### Local GGUF runtime and API

- Added `src/services/localGgufRuntime.ts`: Node-only discovery from a flat configured `.gguf` directory; opaque filename/size-derived IDs; `coder` role recognition; file/symlink/realpath checks; optional absolute `CALCORA_LLAMA_CLI_PATH`; bounded context (512–8192, default 2048), threads (1–32, CPU-safe default up to 4), generation cap (320 tokens), response size and timeout (1–180 seconds, default 120s); one active inference at a time; abort/timeout process termination; and safe diagnostics without returning executable stderr/path content.
- CLI arguments are passed as an argv array with `shell: false`, `windowsHide: true`, `--simple-io`, `-st`, `--no-display-prompt`, finite `-n/-c/-t`, and the GGUF embedded chat template (no forced template). Node parent-side timeout/cancel terminates the child. No arbitrary user/model command execution.
- Added `GET /api/ai/local-models` with request rate limiting. It returns role, file name, size, opaque ID and diagnostic; never executable/model absolute paths. Model discovery does not require that an inference runtime exists.
- Extended private/offline `POST /api/ai/math` with an optional validated `localModelId`. IDs must exist in the current server-side manifest. Document-backed requests, unapproved Tutor modes, cloud-selected Tutor requests, and unrecognized model IDs do not invoke the model.
- Added numeric-claim guard `src/services/localExplanationGuard.ts`: explicit local-model answer/result/equation claims that disagree with a deterministic numeric result are omitted; the deterministic Tutor response remains. Accepted local text is always labelled **not independently verified**, and response verification/result/formula remain those of Calcora's existing deterministic path.
- Added `src/ai/localModels.ts` and `src/ai/localModelClient.ts` for typed browser metadata and bounded/abortable status fetching.
- Updated `src/ai/client.ts`, `src/ai/offlinePolicy.ts`, `src/services/tutorOrchestrator.ts`, and `src/types.ts` so selected local model IDs are sent only for local-only non-document requests and local-model response provenance is typed. Removed the browser-facing Ollama endpoint route from the local provider status contract; `src/ai/ollamaClient.ts` remains unused legacy code, not called by this integration.

### Tutor interface

- Added an accessible native model selector and `role="status"` runtime diagnostic beside the existing privacy/mode controls in `src/components/AIAssistantPanel.tsx`.
- Discovered models are selectable even when the runtime is unavailable, so setup can be chosen; selecting a model stores only its opaque ID and switches privacy mode to Local only. A removed model clears its preference. The selection does not persist into exports or the remote knowledge store.
- Assistant messages identify the optional model prose and display the explicit “not verified” label. The deterministic Tutor works without a model or API key.
- The existing compact flex control row now wraps at medium widths to accommodate the new selector/status.

### Tests and documentation

- Added `tests/localGgufRuntime.test.ts` and `tests/localModelApi.test.ts`; extended `tests/privateTutorRouting.test.ts`.
- Added `test:local-gguf` and `test:local-model-api` package scripts and registered them in `npm run verify`.
- Updated `.env.example` with CLI path, model directory, context, CPU thread and timeout settings; added setup, privacy, limits, and limitations to `README.md`.
- Wrote the pre-change evidence plan in `docs/CALCORA_LOCAL_AI_IMPLEMENTATION_PLAN_2026-10-06.md`.

## 4. Model inventory and comparison

All four expected model variants were present. Files were not moved, opened for inference, or altered.

| Model | Bytes | SHA-256 | Role by filename |
| --- | ---: | --- | --- |
| `qwen2.5-1.5b-instruct-q4_k_m.gguf` | 1,117,320,736 | `6A1A2EB6D15622BF3C96857206351BA97E1AF16C30D7A74EE38970E434E9407E` | general |
| `Qwen2.5-3B-Instruct-Q4_K_M.gguf` | 2,104,932,768 | `626B4A6678B86442240E33DF819E00132D3BA7DDDFE1CDC4FBB18E0A9615C62D` | general |
| `qwen2.5-coder-1.5b-instruct-q4_k_m.gguf` | 1,117,320,768 | `CC324AF070C2ECBFD324A30884D2F951A7FF756ABA85CB811A6EC436933BB046` | coding |
| `Qwen2.5-Coder-3B-Instruct-Q4_K_M.gguf` | 2,104,932,800 | `724FB256BEC1FF062B2F65E4569E871AD2E95AB2A3989723D1769C54294730B7` | coding |

- **PASS** — name, size and SHA-256 measured; API discovery returned four files, correct general/coding role, no absolute paths.
- **BLOCKED** — no `llama-cli`, `llama-cli.exe`, or equivalent executable was found on `PATH` or configured in the server environment.
- **NOT VERIFIED** — whether this specific GGUF build/runtime combination loads; inference latency, memory, tokens/sec, quality/accuracy, instruction following, tutoring, multilingual, hallucination rate and model-to-model comparisons.
- **NOT VERIFIED** — model extraction probes, candidate knowledge ingestion, model replacement readiness and the ability to run a real model after replacing another. The tests use fake model files/runtime adapters and do not claim inference.
- Fine-tuning was not attempted or prepared. This 4-logical-core host and absent training resource evidence do not justify CPU fine-tuning. RAG/knowledge, prompt instructions and model weights remain distinct.

## 5. Knowledge, formula and language phases

- **PASS** — existing curated knowledge verification and RAG regression suite passed; existing verification statuses are measured from the current project corpus. Deterministic verification remains absolute authority.
- **PARTIAL** — no new persistent model-independent knowledge acquisition database, backup/restore feature or model-provenance schema was added. Existing curated knowledge and existing learner data storage are unchanged; model output is not stored as verified.
- **PARTIAL** — existing 13-entry display catalog and distributed knowledge/formulas were audited, not broadly expanded. No generated formula is added to the authoritative catalog.
- **PARTIAL** — existing 115-language metadata/detection/template framework is retained and its tests pass. No new claim of 100+ full grammars or native-speaker verification.
- **NOT VERIFIED** — 100+ language full grammatical support, native-speaker review, model-generated language coverage, 100-language matrix, model language comparison or fully localized prose for every registry entry.

## 6. Tutor, verification and security

- **PASS** — local Tutor stays usable without Gemini credentials. When local inference is absent/fails/times out/unrecognized, the existing deterministic/local-template response is returned with status; no private/offline cloud fallback is enabled.
- **PASS** — deterministic results and canonical verifier outcome are generated before optional prose. Tests verify `2 + 3 = 5`, `3 + 4 = 7`, and existing equation/root cases remain `VERIFIED`; incompatible numeric model claims are filtered by the new guard test.
- **PASS** — user-supplied model ID is only an opaque ID; arbitrary paths/CLI arguments are not accepted. Runtime/model path validation, symlink rejection, shell-free argv, request bounds, role assignment, response byte limits, timeout/cancel and single-inference concurrency are covered by tests or implementation checks.
- **PARTIAL** — local model use is available in permitted assistant/tutor/step-by-step/review modes; strict final-answer-concealment modes intentionally stay on the deterministic Tutor path.
- **PASS** — no package dependency was added. No Ollama was installed or used. No runtime auto-download occurs.
- **NOT VERIFIED** — adversarial safety across actual model prompts, operating-system process-tree kill on all platforms, Windows/packaged-Electron local runtime, public/multi-user authorization, or actual GGUF loading.

## 7. Test, build and live UI/runtime evidence

- **PASS** — initial baseline `npm run lint` before edits.
- **PASS** — final `npm run lint` (`tsc --noEmit`), including after final server tests.
- **PASS** — all **45 package `test:*` scripts** were enumerated from `package.json` and executed successfully after integration.
- **PASS** — focused final run: `test:local-gguf`, `test:local-model-api`, `test:private-tutor-routing`, `test:live-tutor-verification`; additional focused Tutor mode/language/follow-up/safety and Gemini runtime/status suites also passed.
- **PASS** — `test:local-model-api` starts a production-mode loopback server with temporary fake models, reports runtime unavailable, returns verified deterministic result `5`, retains `VERIFIED`, and requires no cloud key; invalid model ID also falls back to a verified deterministic result. Temporary fixtures are outside the repository and removed by the test.
- **PASS** — Vite 8.3.1 built 1,994 modules into `%TEMP%\calcora-safe-build-20261006\dist` (`✓ built in 3m 1s`). The server bundle and Electron main/preload bundles built with esbuild to the same temp directory. Existing `dist/`, `dist-electron/`, `release/`, and release files were not overwritten.
- **PASS** — app started from `npm run dev` on loopback for browser QA. `GET /api/ai/local-models` returned all four files, role metadata and an honest `llama.cpp is not configured` diagnostic.
- **PASS** — `npx tsx tests/browserVerification.ts` with `CALCORA_BASE=http://127.0.0.1:3000`: 68 checks passed, 0 failed, no external network requests, cloud LLM requests, console errors, HTTP errors or failed network requests. The suite covers local model selection and privacy, Tutor modes, deterministic verification, PDF grounding, offline fallback and themes.
- **NOT VERIFIED** — packaged Electron app was not launched; actual GGUF inference remains unavailable.
- `npm run verify` was deliberately **not** invoked because it writes over the pre-existing workspace `dist/` and `dist-electron/` artifacts. All 45 package tests and safe isolated source builds were run instead.

## 8. Phase status matrix

| Requested phase | Status | Evidence / limit |
| --- | --- | --- |
| 1. Full repository audit | **PASS** | Pre-edit tree/package/code/docs/tests/models/Git state inspected; preserved pre-existing modifications. |
| 2. Local model runtime | **PARTIAL** | llama.cpp adapter, discovery/selection/timeout/cleanup/fallback wired and fake-tested; CLI absent so true inference is blocked. |
| 3. Model knowledge extraction | **BLOCKED** | No local runtime executable; no probes executed. Does not pretend weights expose all knowledge. |
| 4. Formula knowledge system | **PARTIAL** | Existing catalog (13 display entries), distributed engines/knowledge reused; no comprehensive formula expansion. |
| 5. Knowledge store + RAG | **PARTIAL** | Existing curated offline corpus/RAG and local persistent learner data remain; no new model-independent generated knowledge database/import/backup pipeline. |
| 6. 100+ language architecture | **PARTIAL** | Existing registry/tests: 115 codes, 44 deep profiles/templates; actual support measured FULL=2/PARTIAL=35/DETECTION_ONLY=78. |
| 7. Tutor intelligence | **PASS** | Existing Assistant/Tutor/Review/Socratic/Step-by-Step/Quiz and learning paths retained; new optional local explanation path is mode-limited. |
| 8. Knowledge + Tutor integration | **PARTIAL** | Existing retrieval→deterministic calculation→verification retained; optional model prose follows. No model candidate knowledge ingestion. |
| 9. Model comparison/merging | **BLOCKED** | No llama.cpp executable; no performance or quality probes run. |
| 10. Model-independent knowledge | **PARTIAL** | Curated knowledge is separate from model weights; no new cross-model acquisition/merge pipeline. |
| 11. Training/fine-tuning | **NOT IMPLEMENTED** | No training attempted; CPU-only host does not justify fine-tuning. RAG is not described as training. |
| 12. Knowledge verification | **PASS** | Existing corpus audit and deterministic formula/example verification tests pass; generated model knowledge is not ingested. |
| 13. Security/privacy | **PASS** | Local-only request API, opaque IDs, path validation, shell-free argv, size/token/context/thread/time bounds, abort, no Ollama/cloud fallback; real model attack testing not verified. |
| 14. Testing | **PASS** | 45 package test scripts, typecheck and focused model/privacy/verification regressions pass. |
| 15. Browser/UI/Electron | **PARTIAL** | Browser/UI 68/68 PASS, including selector/privacy; packaged Electron runtime was not launched. |
| 16. Documentation | **PASS** | Plan, local runtime setup/environment and this phase/status report added; limitations stated. |
| 17. Model replacement readiness | **NOT VERIFIED** | Not safe to claim until an actual model can be run and replacement checks are performed. Models were not removed. |

## 9. Remaining blockers and exact next commands

1. Install/build a compatible `llama.cpp` runtime outside Calcora (not done automatically), then configure an absolute `CALCORA_LLAMA_CLI_PATH` and `CALCORA_MODELS_DIR` in the environment used by the server/Electron process.
2. Smoke-test each model using the Tutor UI and verify the reported engine/status, latency, memory, output quality and deterministic result match. Until then, the current expected status is `runtime: none`; the deterministic Tutor remains the supported local path.
3. After installing a compatible runtime, run actual inference against each discovered model and launch/test packaged Electron separately before claiming desktop inference/runtime support.
4. Keep the existing release/deleted `dist/` artifacts and all local modifications untouched. Do not run `npm run clean`, `git clean`, `git reset`, `git stash`, checkout/restore, rebase, or an automatic merge as part of follow-up.

For PowerShell setup after a compatible CLI is installed:

```powershell
$env:CALCORA_LLAMA_CLI_PATH = 'C:\tools\llama.cpp\llama-cli.exe'
$env:CALCORA_MODELS_DIR = 'C:\My projects\Calcora-AI-production\models'
npm run dev
npm run test:local-gguf
npm run test:local-model-api
```

To run the full existing verification script only after protecting/relocating pre-existing generated outputs, use `npm run verify`; it ends with a build that writes to the workspace's regular `dist/` and `dist-electron/` directories.
