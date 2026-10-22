# Calcora Feature Acceptance Matrix — 2026-10-08/09

Status vocabulary: PASS · PARTIAL · FAIL · BLOCKED · NOT VERIFIED · NOT IMPLEMENTED

---

## 1. Core mathematics

| Feature | Status | Evidence |
|---|---|---|
| Arithmetic / scientific functions | **PASS** | `2+3=5` packaged, 18–30 ms |
| Equation solving | **PASS** | `2x+5=15 → 5` VERIFIED |
| Symbolic differentiation | **PASS** | `d/dx(x^2)=2x`, agent reports verified |
| Matrices / statistics / finance / currency | **PASS** | dedicated panels + regression suites |
| Graphing | **PASS** | `GraphingPanel` wired to calculator |
| Independent verification | **PASS** | shared by Tutor, agent, and developer view |
| Deterministic authority over LLM | **PASS** | client cannot upgrade a verified result |

## 2. Tutor AI

| Feature | Status | Evidence |
|---|---|---|
| Multi-turn conversation | **PASS** | `tutorConversationFlow.test.ts` |
| 11 differentiated modes | **PASS** | `tutorOrchestrator.ts:71–102` switch |
| Socratic / hints / quiz / exam / check-work / review | **PASS** | distinct orchestrator branches |
| Persistent history | **PASS** | conversation suites |
| Offline behaviour | **PASS** | `offlineOnly` honoured in packaged gate |
| Coding Assistant | **NOT IMPLEMENTED** | coder model present, no orchestrator branch |
| Code Reviewer | **NOT IMPLEMENTED** | no review pipeline |
| Research Assistant | **NOT IMPLEMENTED** | no external source retrieval |
| Document Explainer | **NOT IMPLEMENTED** | extraction exists, tutoring blocked on non-loopback |
| Tool-calling agent | **NOT IMPLEMENTED** | 1 verified tool, no planning loop |
| Streaming / stop / regenerate | **PASS** | SSE endpoint `/api/ai/math/stream` + client `askAIMathAssistantStream` + panel streaming bubble + Regenerate; suites `test:math-sse-protocol`, `test:ai-stream-endpoint`, `test:ai-stream-client`, `test:user-stop`. Deltas are provisional; only the final `result` frame (same verification pipeline as the JSON endpoint) is authoritative. Cloud token streaming is contract-tested (offline/result-path + parity), not exercised against a live Gemini key |

## 3. Knowledge / RAG

| Feature | Status | Evidence |
|---|---|---|
| Curated knowledge corpus | **PASS** | 32 modules, ~230 KB |
| Retrieval + grounding threshold | **PASS** | 92.7 µs/query (9.2× faster) |
| Provenance + licence metadata | **PASS** | `sourceMetadata` with `licenseOrStatus` |
| Verified-knowledge boundary | **PASS** | `candidateStore.ts`, 9 assertions |
| Model knowledge extraction | **NOT IMPLEMENTED** | not technically possible |
| Citation of external sources | **NOT IMPLEMENTED** | retrieval is local-only |

## 4. Multilingual

| Metric | Measured |
|---|---|
| Registered for detection | **115** |
| Hand-written grammar profiles | **44** declared / 20 verified present |
| Full local answer template | **2** (`en`, `ur`) |
| Partial (template only) | **35** |
| Detection-only | **78** |
| RTL direction correctness | **PASS** — 9 languages fixed and pinned |

**100+ language capability: NOT IMPLEMENTED.** The registry size is not capability, and the report
states so per language rather than in aggregate.

## 5. Platform / packaging

| Platform | Status | Evidence |
|---|---|---|
| Windows build/package/launch/UI | **PASS** | 48/48 packaged gate |
| Windows icon | **PASS** | byte-identical in package |
| macOS | **NOT VERIFIED** | no host; config present |
| Linux | **NOT VERIFIED** | no host; config present |
| Cross-platform abstraction | **PASS** | `localRuntimePlatform.ts`, `platformPolicy.ts` |

## 6. Developer / quality

| Feature | Status | Evidence |
|---|---|---|
| Calculation + verification trace | **PASS** | reproducible id, verified in packaged CDP run |
| Structured JSON export | **PASS** | `DeveloperPanel` |
| API Playground (real allowlist, validated bodies, cancel, measured duration, bounded sanitized history) | **PASS** | `developerEndpoints.ts`, `tests/developerEndpoints.test.ts` |
| Provider/model inspector (registry states, masked keys, honest untested labels) | **PASS** | `DeveloperPanel.tsx` Providers tab over `/api/models/registry` + `/api/ai/local-models` |
| Diagnostics (bounded capture, severity/subsystem filters, redacted export) | **PASS** | `developerDiagnostics.ts`, `tests/developerDiagnostics.test.ts` |
| Developer settings (clamped retention/bound, confirm on reset) | **PASS** | `DeveloperPanel.tsx` Settings tab |
| Cancellation on panel unmount / tab switch + stale-generation guard | **PASS** | `AIAssistantPanel.tsx` cleanup effect and generation guard |
| Capability registry | **PASS** | 20 entries, 9 assertions |
| Typecheck | **PASS** | 0 issues |
| Regression | **PASS** | 67/67 |

## 7. Security / privacy

| Control | Status | Evidence |
|---|---|---|
| Production CSP | **PASS** | verified live in packaged app |
| Unknown route 404 | **PASS** | after fixing the earlier 200 leak |
| Malformed JSON 400 | **PASS** | packaged gate |
| CORS origin rejection | **PASS** | packaged gate |
| Rate limiting | **PASS** | `/api/ai/math` 8/min |
| Code signing | **NOT VERIFIED** | binaries `NotSigned` |

## 8. Models / runtime

| Item | Status | Evidence |
|---|---|---|
| 4 GGUF models present | **PASS** | SHA-256 verified |
| llama.cpp integration | **PASS** | generation 8.3–12.9 s |
| Models excluded from package | **PASS** | verified inside `app.asar` |
| Duplicate copies retired | **PASS** | 6,148.4 MB removed |
| Primary model retirement | **BLOCKED** | sole generative path |
| Fine-tuning / LoRA / distillation | **NOT IMPLEMENTED** | no run performed |
## 9. Batch 6 (dashboard/navigation, hybrid local AI, tutor product knowledge)

| Item | Status | Evidence |
|---|---|---|
| Home dashboard (hero, quick-ask -> Tutor, quick tiles) | **PASS** | `HomeDashboardPanel.tsx`; browser smoke: quick-ask prefilled Tutor, verified answer returned |
| Recent Activity from real data only | **PASS** | real `calc.history` + real `loadTutorStats()`; honest empty state; no fabricated metrics |
| System Status probes (measured, honest) | **PASS** | `/api/health` 4 s timeout, service-worker controller, localStorage write probe, `/api/ai/local-models`; browser smoke: API Online / SW Active / Local Storage Healthy / honest cloud pointer to Developer > Providers |
| Desktop sidebar navigation | **PASS** | `AppSidebar.tsx` lg+ only; 18 items all map to real rendered workspaces; `aria-current`; Online/Offline footer via browser connectivity events; header remains the compact nav |
| Ollama status discovery (GET /api/tags, 2.5 s bounded) | **PASS** | `universalModelManager.probeOllamaStatus()` + `tests/ollamaRegistryStatus.test.ts` (reachable / ECONNREFUSED / HTTP 503) |
| Ollama chat completion through the model manager | **NOT IMPLEMENTED** | discovery labeled status-only in the diagnostic; no completion path claimed |
| Tutor product knowledge (versioned, curated) | **PASS** | `src/knowledge/productKnowledge.ts` (v2, 9 evidence-backed facts) injected through `buildTutorGroundingContext`; `tests/productKnowledge.test.ts` re-derives 115 languages, RTL codes, 6-endpoint allowlist, 4 verification states and requires every cited file to exist |
| Live cloud provider runtime test | **BLOCKED** | no authorized API key available; nothing fabricated |
| Windows installer (NSIS + portable, `dist:win`) | **PASS** | `release\Calcora-AI-1.0.0-x64-setup.exe` 124.1 MB, `release\Calcora-AI-1.0.0-x64-portable.exe` 123.8 MB, EXIT=0 |
| Packaged-app first launch + embedded backend health | **PASS** | unpacked launch smoke: calculator window held 12 s+, `/api/health` `{"status":"ok"}` from the embedded backend; fixed by the self-contained server bundle (`tests/serverBundleSelfContain.mjs`) after the junction/node_modules walk failure |
| Code signing of installer artifacts | **NOT VERIFIED** | signtool steps ran without a certificate; artifacts remain unsigned |
