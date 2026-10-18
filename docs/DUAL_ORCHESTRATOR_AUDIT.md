# Calcora AI — Dual Orchestrator Audit (Phase 9)

Date: 2026-10-08
Question: `src/ai/tutorOrchestrator.ts` and `src/services/tutorOrchestrator.ts`
both export a function called `orchestrateTutor`. Is one of them dead code?

## 1. Verdict: no deletion — both are live, with different jobs

| | `src/services/tutorOrchestrator.ts` | `src/ai/tutorOrchestrator.ts` |
|---|---|---|
| Size | 1,813 lines | 155 lines |
| Exports | `orchestrateTutor` (options object), `resolveGeminiAvailability`, result/option types, fallback-status types | `orchestrateTutor` (prompt + positional options), `isAuthoritativeToolResult`, result/option types |
| Responsibilities | pedagogy, multilingual grounding, tutor modes, misconception hints, document grounding, bounded conversation memory, canonical verification outcome | deterministic pre-computation **only**: extract → tool → independent verification → bare result string |
| Production caller | `server.ts:16` imports it as `orchestrateLocalTutor`, invoked at `server.ts:93` — the offline/local Tutor path the browser UI reaches | `server.ts:15` imports it as `orchestrateTutor`, invoked at `server.ts:454` — the optional cloud branch, which needs an authoritative number before asking a cloud model to write prose |
| Tests | 20+ suites (tutor modes, languages, conversation, follow-up, safety, pipeline contract, knowledge grounding, misconception hints, PDF tutor, agent, …) | `tests/tutorOrchestration.test.ts` (compares both), plus the shared type is used by the guard |

They are **not** interchangeable: the thin module's `answer` is deliberately the
bare result (the cloud prompt supplies the voice), while the canonical module's
`answer` is a fully composed, localized explanation with steps and a verification
state. Merging them would silently change the contract the cloud branch and its
tests depend on. The module header in `src/ai/tutorOrchestrator.ts` already
documents this scope note; this audit re-verified it against the live call sites.

## 2. Dead code found and removed

| Finding | Evidence | Action |
|---|---|---|
| `mathematicsKnowledgeIndex.searchKnowledgeBase` computed `const multilingualConceptIds = resolveMultilingualConceptIds(normalized)` and never used it; the multilingual boost actually arrives through `rankMultilingualConceptMatch` (which calls the resolver itself) | the local was unreferenced; after deleting it, `resolveMultilingualConceptIds` had no remaining use in that file | removed the local **and** the now-unused import; `tsc` clean, knowledge suites green |

Search method: every `export` in both orchestrators was enumerated and each name
grepped across `src/`, `electron/`, `tests/` and `server.ts`. No other export
proved to be dead: `isAuthoritativeToolResult`, `resolveGeminiAvailability` and
the exported types all have consumers.

## 3. Coupling worth flagging (not changed)

`src/services/tutorResponseGuard.ts` imports **only the type**
`TutorOrchestrationResult` from `src/ai/tutorOrchestrator` — the thin module —
even though the canonical module exports an equivalent type. It is a type-only
edge, so it cannot affect runtime behaviour, but it points a security-sensitive
component at the non-canonical module. Recorded as a cleanup candidate for a
later refactor; deliberately not bundled into this release, because touching a
response guard late in the release cycle is exactly the kind of blind refactor
this audit exists to prevent.

## 4. Known limitation (already documented in the module header)

`/api/ai/math` computes the deterministic result once *per branch*: the cloud
branch calls the thin orchestrator, and the local fallback calls the canonical
one, so a request with cloud consent can run the deterministic pipeline twice.
Recorded rather than refactored blind: a shared single-computation path would
have to reconcile two different result shapes.
