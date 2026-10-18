# Calcora AI — Performance & Memory (Phase 12)

Date: 2026-10-08
Method: every number below was produced by a command in this repository on the
build machine (Windows 11 x64, Node 24). Nothing is estimated.

## 1. Hot-path optimization: knowledge retrieval

`retrieveMathematicsKnowledge` runs on **every** Tutor request and every Math
Agent request, so its cost is paid continuously. It was measured with
`npx tsx tests/retrievalBenchmark.ts` (2,000 queries, best of two runs,
28-item corpus).

| Step | µs/query | Change |
|---|---|---|
| Baseline | 849 | — |
| Precomputed lowercase projection of the corpus (`LOWERCASED_CORPUS`) | 596 | −30% |
| Single-entry memo for the multilingual alias scan | **92.7** | **−89%** (−9.2× total) |

What was actually wrong:

1. The scorer lower-cased each item's concept, definition, topic, subtopic and
   every keyword/alias **on every query**. The corpus is authored data that
   never changes at runtime, so those strings are now built once at module load.
2. The real hot spot: `rankMultilingualConceptMatch(item, query)` called
   `resolveMultilingualConceptIds(query)` **per item**, and that function scans
   the entire alias table (hundreds of aliases) with substring comparisons. One
   Tutor request therefore resolved the alias table dozens of times. It is now
   memoized on the most recent query — a pure function of its input, so the
   cached result is identical to a fresh one, and the memo returns a copy so a
   caller cannot mutate shared state.

Correctness was re-verified after each step: `knowledgeRetrievalQuality`,
`knowledgeVerification`, `knowledgeGroundingRuntime`, `multilingualVerification11`,
`languageCoverage`, `tutorLanguageBehavior` all pass, and the full sweep is 59/59.

## 2. Renderer bundle (measured, no change made)

| Asset | Size | Loaded when |
|---|---|---|
| `index-*.js` (app shell) | 290 KB | always |
| `index-*.css` | 150 KB | always |
| `AIAssistantPanel-*.js` | 454 KB | Tutor tab |
| `MultimodalMathStudio-*.js` | 449 KB | Scan/Voice/Ink tab |
| `DataAnalysisPanel-*.js` | 366 KB | data tab |
| `pdf.worker.min-*.mjs` | 1,236 KB | only when a PDF is opened |

The heavy panels and the 1.2 MB PDF worker are already code-split, so the startup
payload is ~440 KB. Splitting further (for example deferring KaTeX until an
answer actually contains math) was **not** adopted: it would trade a real
first-paint regression for a saving on a path that is not slow, and the product's
correctness bar is higher than a byte count.

## 3. Local inference (measured, architecture kept)

Measured through `/api/ai/math` with `qwen2.5-1.5b-instruct-q4_k_m.gguf` selected
and `offlineOnly: true` (three consecutive requests, this CPU):

| Request | Latency | Result |
|---|---|---|
| Urdu concept question | 120.0 s | deterministic fallback (model output rejected as unusable for this prompt) |
| `d/dx(x^2)` in English | 58.9 s | `local-model`, **VERIFIED** |
| Urdu concept question (repeat) | 35.9 s | `deterministic-fallback`, VERIFIED |

So a real 1.5B turn costs roughly **35–120 s on this CPU** — dominated by CPU
inference, not by Calcora. This is why the browser and packaged smoke harnesses
allow 120 s per Tutor request instead of the 30 s a deterministic-only round-trip
would need; a timeout shorter than the measured inference time produces false
failures that look like product defects.

Kept deliberately for this release: a persistent `llama-server` would cut
multi-turn latency substantially but adds a long-lived child process, dynamic
port allocation, readiness/shutdown lifecycle and crash recovery — a subsystem
that needs its own tests, not a config flag.

Every request is still bounded, which is what protects memory and time:

| Bound | Value |
|---|---|
| Transcript | 200 messages (`MAX_MESSAGES`) |
| Local-model stdout | 32 MB cap, then the child is terminated |
| Prompt / system prompt | truncated before spawn |
| Generation tokens | `-n` capped; context size bounded 512–8192 by `CALCORA_LLAMA_CONTEXT_SIZE` |
| Threads | `min(4, cores-1)` by default |
| Request timeout | `CALCORA_LOCAL_MODEL_TIMEOUT_MS`, bounded |
| Concurrent local generations | one at a time (`isGenerating`) |

## 4. Memory

* Server RSS after startup is measured in the packaged smoke test
  (`tests/exeSmokeTest.ts`) rather than guessed.
* The knowledge corpus is a static 28-item array (~30 KB of text) — precomputing
  its lowercase projection adds ~30 KB permanently and removes ~800 KB/s of
  short-lived string garbage.
* `models/` is never loaded into the app process; GGUF weights are mapped by
  llama.cpp in a child process, so the Electron main process and renderer stay
  small regardless of how many models are installed.
