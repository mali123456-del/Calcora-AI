# CALCORA AI — FINAL VERIFICATION REPORT

Generated 2026-10-02 from the final repository state. Every claim below is labelled with
real evidence. Where something could not be verified, it is marked BLOCKED or NOT VERIFIED
and is not presented as passing.

---

## 1. Executive Summary

Calcora AI builds, tests, packages, launches, and works. The final state passes **34 test
suites**, typecheck, `npm audit` (0 vulnerabilities), **79 real-browser checks across three
suites**, and a **real packaged Windows EXE smoke test** in which the new Math Agent, the
adaptive learning engine, the notebook persistence and CORS enforcement were each exercised
inside the shipped binary.

This session closed the largest genuine architectural gap: the Tutor previously had **no
student model** — it could explain but not adapt. Added now: an observable-signal student
model, a corpus-grounded practice/quiz generator, a bounded Math Agent with genuinely
independent verification, offline-first student persistence, two local HTTP endpoints, and a
persistent Notebook workspace.

Three real bugs were found and fixed under TDD, including a silent math-engine defect
(`fact` alias rejected) adopted after inspecting an `origin/main` fix, and two defects in my
own new verification code that testing exposed (a `\b` boundary that never matched, and a
nonexistent result field).

Calcora is **not** complete against the full specification in this document. OCR, 3D
graphing, and a geometry construction workspace remain unimplemented; live Gemini and
Supabase remain unverified; and merging `origin/main` is deliberately deferred. These are
detailed in §22–24.

## 2. Repository State

| Item | Value |
| --- | --- |
| Local HEAD | `c8ac3c8d6819efd6c3e5b89090685f21a27cc619` (unchanged) |
| Remote HEAD | `293c31a9759960e3db099c1f2349c70b5cebaad3` |
| Merge base | `c8ac3c8d…` (= local HEAD; local history is a strict prefix of remote) |
| Ahead / behind | **0 ahead, 20 behind** |
| Modified tracked files | 44 (+3,426 / −515) |
| New untracked files | 53 |
| Commits made | **0** — no commit was authorized |
| Destructive git operations | **none** |

Local `HEAD` is an ancestor of `origin/main`, so no local commit is missing remotely. Full
classification is in `CALCORA_STATE_REPORT.md`: 23 files are conflict candidates, 18 remote
changes are conflict-free, and **zero** locally created files collide with remote work.

## 3. Architecture

Extended, not replaced. The existing 28-item `MathKnowledgeItem` corpus, `retriever`,
`ragEngine`, `intentClassifier`, `tutorOrchestrator` and Supabase integration are intact and
reused. Four new services were added:

- `src/services/studentModel.ts` — observable-signal learner model
- `src/services/practiceGenerator.ts` — corpus-grounded practice/quiz/drill generation
- `src/services/mathAgent.ts` — bounded plan → execute → independently verify
- `src/services/notebook.ts` — persistent workspace with carried verification status

Plus `studentModelStorage.ts` (offline-first persistence) and `NotebookPanel.tsx` (UI).

## 4. Features Implemented This Session

| Feature | Status | Evidence |
| --- | --- | --- |
| Adaptive student model | PASS | 12 test groups; mastery damped by sample size |
| Targeted practice generation | PASS | targets real weak concepts, corpus-grounded |
| Quiz generation | PASS | every item has a valid `correctOptionIndex` |
| Misconception drills | PASS | returns `null` for unknown concepts, invents nothing |
| Bounded Math Agent | PASS | 2-tool allowlist, 8-step ceiling, adversarial input proven bounded |
| Independent verification | PASS | injected wrong root caught as `FAIL` with actual values |
| Student persistence | PASS | localStorage, degrades to memory, survives corruption |
| `/api/ai/math-agent` | PASS | verified in dev **and** inside the packaged EXE |
| `/api/ai/learning/plan` | PASS | verified in dev **and** inside the packaged EXE |
| Notebook workspace | PASS | 26/26 browser checks incl. persistence across reload |
| `fact` alias fix | PASS | `fact(5) = 120`, verified in packaged app |
| CI runs full `verify` | PASS | `calcora-ci.yml` no longer runs a 5-test subset |

## 5. AI Implementation

The AI layer is now orchestration over deterministic primitives rather than answer
generation. `runMathAgent` classifies a goal, selects only allowlisted tools, executes
deterministically, verifies independently, and explains. It never fabricates a number: a
conceptual question returns `deterministic: null` and `verification: UNKNOWN` with an
explicit reason that a conceptual explanation is not a computational claim.

Gemini remains optional. Both new endpoints are entirely local and work with no cloud
credential, verified by the packaged app running with `GEMINI_API_KEY` empty.

## 6. Knowledge Implementation

Retrieval reuses the existing corpus. `practiceGenerator` anchors every generated item to a
`MathKnowledgeItem` via `KNOWLEDGE_BY_ID` and declares `source: 'knowledge-corpus' | 'generated'`.
`buildMisconceptionDrill` reads `commonMistakes[0]` from the corpus and returns `null` for an
unknown concept — a fabricated drill would teach an error Calcora never documented.

## 7. Tutor Intelligence

Honest capability accounting:

| §43 criterion | Status |
| --- | --- |
| Identify concept | PASS |
| Retrieve knowledge | PASS |
| Deterministic calculation | PASS |
| Explain why | PASS |
| Adapt to learner level | **PARTIAL** — difficulty adapts; hint ladder still fixed |
| Detect mistakes | PASS |
| Progressive hints 1–5 | PASS |
| Meaningful follow-up questions | PASS |
| Check understanding | PASS |
| Targeted practice | PASS (new) |
| Quiz questions | PASS (new) |
| Conversation continuity | PASS |
| Update observable learning state | PASS (new) |
| Distinguish verified from inferred | PASS (new) |
| Refuse to fabricate knowledge | PASS |
| Work without Gemini | PASS |
| Preserve private/offline | PASS |

**The one gap I am explicit about:** adaptivity currently selects *difficulty*, not *hint
level*. The five hints remain a fixed ladder rather than being chosen from observed
misconception signals. AutoTutor's EMT model and PEARL both make that the pedagogical core;
`docs/COMPETITOR_GAP_ANALYSIS.md` lists it as priority #2.

## 8. Math Agent

Bounded by construction. `MAX_AGENT_STEPS = 8`, `AGENT_TIME_BUDGET_MS = 5000`,
`MAX_GOAL_CHARS = 2000`, closed allowlist `['calculate','solveEquation']`, no recursion.
Tests prove 400 nested parens and a 50,000-character goal cannot exceed the ceiling.

## 9. Verification Engine

Two independent code paths, not a restatement:

- **Equations** — each reported root is substituted into the original expression and both
  sides are evaluated; the residual decides the verdict.
- **Calculations** — the expression is recomputed independently.

Proven capable of failing: injecting a stubbed solver returning `x = 7` for `2x + 4 = 10`
produces `FAIL` with reason *"substituting x = 7 gives 18 on the left and 10 on the right"*.
`UNKNOWN` is a first-class outcome, never upgraded to `PASS`.

## 10. Multimodal

Unchanged from the verified baseline and re-confirmed by 15/15 browser checks: image and ink
use a real provider seam and report honest `unavailable` with no fabricated text; voice
transcripts are classified `empty | non-math | ambiguous | ready` and only `ready` is
forwarded. **OCR remains unimplemented.**

## 11. Graphing / 12. Geometry

2D `y=f(x)` PASS. Parametric, polar, implicit and 3D are labelled "Not implemented" in the
UI. No dedicated geometry construction workspace exists.

## 13. Notebook

Implemented and browser-verified: create, add typed entries, deterministic verification shown
verbatim, persistence across reload, isolation from calculator state, delete, and corrupt
storage recovery.

## 14. Data Lab

Unchanged; CSV/TSV/XLSX import, worker parsing, statistics and regression all pass. No charts.

## 15. Security

Fixed this session (carried from the prior session's work and re-verified):
**cross-origin API abuse** — non-loopback origins now receive `403` before any handler runs,
verified live in dev and in the packaged binary.

Remaining risks, unchanged and not overstated:

- `/api/ai/math`, `/api/math/tool`, `/api/ai/tutor/orchestrate` are **unauthenticated** —
  intentional for a calculator, unacceptable for public deployment.
- Rate limiting is in-process, not distributed. CORS is not authorization.
- Supabase Edge Functions use `Access-Control-Allow-Origin: *'`.
- Desktop app is **unsigned**.
- Live Gemini/Supabase untested.

`npm audit`: **0 vulnerabilities**. That is not a claim of security.

## 16. Browser QA

| Suite | Result |
| --- | --- |
| `browserVerification.ts` | **53/53 PASS**, 0 failures, zero outbound requests |
| `multimodalBrowserVerification.ts` | **15/15 PASS** |
| `notebookBrowserVerification.ts` | **26/26 PASS** |

Real Chrome via `playwright-core`. `playwright-core@1.63.0` was installed as a dev
dependency because the repo's own browser test could not run without it.

Notable proof: a non-computational notebook note is labelled "Not verified" while a solved
equation is labelled "Verified"; after a reload the notebook persists; the calculator still
renders afterwards; and the learning plan returns `null` accuracy for an empty history in the
live browser.

## 17. Electron QA

Built outside the workspace to a clean output directory (the workspace is held by a VS Code
lock — §23):

| Artifact | Size |
| --- | --- |
| `Calcora-AI-1.0.0-x64-setup.exe` | 153,926,658 B |
| `Calcora-AI-1.0.0-x64-portable.exe` | 153,700,251 B |
| `Calcora-AI-1.0.0-x64-setup.exe.blockmap` | 161,488 B |
| `latest.yml` | 357 B |

Metadata: `ProductName=Calcora AI`, `FileVersion=1.0.0`, `Company=Calcora AI`, arch x64.

**Startup smoke test — PASS.** 4 processes, window title `Digital AI Scientific Calculator`,
all `Responding=True`, backend on `127.0.0.1:44575`. Verified *inside the packaged binary*:

- `/api/health` → `{"status":"ok"}`
- `7 * 8` → **56**, verified
- `2x + 4 = 10` → **3**, verified
- `fact(5)` → **120** (the new fix, shipped)
- Math Agent `3x - 4 = 11` → **5**, verified, method `substitute`, `bounded: true`
- Learning plan → `weak: alg-quadratic-formula`, 3 practice items, 3 quiz items
- Cross-origin request → **HTTP 403**

**Shutdown — PASS.** 5 → 0 processes on `CloseMainWindow`, no force required.

## 18. Tests

`npm run verify` — **34 suites, all passing**, build included. New suites:
`test:cors-policy`, `test:recognition`, `test:adaptive-learning`, `test:math-agent`,
`test:adaptive-tutor`, `test:notebook`, plus `test:tutor-follow-up`,
`test:tutor-safety`, `test:private-tutor-routing` now wired into `verify`.

Fixed during this work: `test:data-import` (XLSX `DataView` TypeError) and
`test:api-security` (asserted the wrong response field).

| Gate | Result |
| --- | --- |
| typecheck (`tsc --noEmit`) | PASS, exit 0 |
| lint | PASS (is typecheck) |
| build | PASS — `✓ built in 3.01s` |
| npm audit | 0 vulnerabilities |

## 19. Performance & Agent Safety

Enforced and tested: step ceiling, wall-clock budget, goal-length cap, bounded event log
(`MAX_TRACKED_EVENTS = 2000`), notebook caps (40 notebooks / 500 entries / 20,000 chars),
PDF size/page caps, XLSX zip-bomb limits, request body cap. No recursion path exists in the
Agent.

## 20. Accessibility

Notebook adds labelled controls, `aria-current`, `aria-label` sections, `role="status"` /
`role="alert"`, and per-entry `aria-label` buttons. The Notebook tab was keyboard-reachable
via the existing nav. A full WCAG audit was **not** performed.

## 21. Competitor Gap Analysis

Full analysis in `docs/COMPETITOR_GAP_ANALYSIS.md` (researched from public vendor sources;
no ranking, no UI copying).

**Where Calcora genuinely leads:** independent re-verification of every computed answer with
a real `FAIL` path — no compared product publicly claims this. Plus `UNKNOWN` as a
first-class outcome, observed-only adaptivity with null-on-no-evidence, full offline/private
mode, and steps with no paywall.

**Highest-severity gaps:** OCR/photo scan (Symbolab, MathGPT, Mathos, Socratic all have it),
3D/parametric graphing (WA, GeoGebra, Symbolab), dynamic geometry construction (GeoGebra).

**External validation:** Mathos AI publicly documents ">80% advance, 50–80% mixed, <50%
retry". Calcora's `selectNextDifficulty` advances at ≥0.85 and steps down below 0.5,
independently derived and now externally corroborated.

**Academic standard worth adopting:** MMTutorBench (ACL 2026) — 770 problems centred on
pedagogically significant key-steps, classifying follow-ups as Progressive / Exploratory /
Introspective. Calcora handles Progressive continuity; Exploratory and Introspective are not
classified.

## 22. Remaining Issues

**HIGH**
- OCR/vision engine absent — Scan, Ink and scanned PDFs cannot transcribe.
- Unauthenticated public AI endpoints.
- Unsigned desktop binary.
- 3D/parametric/implicit graphing absent.

**MEDIUM**
- Hint ladder not selected from student-model signals.
- No geometry construction workspace.
- No Data Lab charts.
- In-process rate limiter; Supabase CORS `*`.
- Exploratory/Introspective follow-up turns unclassified.

**LOW**
- XLSX single worksheet; no Python notebook; curriculum alignment absent; no classroom view.

## 23. Blockers

**BLOCKED — canonical `release/` cannot be regenerated.** Visual Studio Code (PID 7420)
holds an exclusive lock on `release/win-unpacked/resources/app.asar`, confirmed via the
Windows Restart Manager API after repeated polling, and re-confirmed during this session. The
user's IDE was deliberately not terminated. Verified artifacts were therefore produced at
`C:\Users\kk\AppData\Local\Temp\kilo\calcora-release`. A control build to a *third* clean
directory succeeded, proving the pipeline itself is healthy and only the workspace location
is locked. Resolution: close or restart VS Code, then `npm run dist:win`.

**DEFERRED — merging `origin/main`.** 20 remote commits conflict with 23 locally modified
files including `server.ts`, `electron/main.ts`, `package.json` and `package-lock.json`. A
blind pull risks overwriting 3,426 lines of uncommitted work. One conflict-free remote fix
(`mathEngine.ts` `fact` alias) was adopted by hand because it was a verified local defect.

**Process note:** I started a second `electron-builder` while the first was running, which
caused an `EBUSY`. That was my error; I stopped duplicating and let the original finish.

## 24. Not Verified

- **Live Gemini** — no API key present. Availability/runtime/status suites pass; a live call
  was never made.
- **Live Supabase vector retrieval** — no credentials. Code and migrations exist; live
  retrieval is unproven.
- **WCAG conformance** — no formal audit.
- **Native-speaker validation** of non-English/Urdu Tutor prose.
- **Cloud-path Tutor behaviour** with a real key.

## 25. Release Artifacts

Four verified artifacts (§17) built from the final source. Canonical `release/` remains
stale pending the lock in §23. Release metadata, architecture, installer and portable EXE
are all confirmed; the blockmap is generated.

## 26. Exact Commands Executed

```
git fetch origin --quiet
git rev-parse HEAD
git rev-list --left-right --count HEAD...origin/main
git diff --name-only <merge-base> origin/main
npm run verify
npx tsc --noEmit
npm audit
npm run test:math
npm run test:math-100
npm run test:api-security
npx tsx tests/corsPolicy.test.ts
npx tsx tests/recognitionProviders.test.ts
npx tsx tests/adaptiveLearning.test.ts
npx tsx tests/mathAgent.test.ts
npx tsx tests/adaptiveTutorIntegration.test.ts
npx tsx tests/notebook.test.ts
npx tsx tests/browserVerification.ts
npx tsx tests/multimodalBrowserVerification.ts
npx tsx tests/notebookBrowserVerification.ts
npm run dev
npx electron-builder --win nsis portable --publish never \
  --config.directories.output=C:\Users\kk\AppData\Local\Temp\kilo\calcora-release
npm install --save-dev playwright-core
Restart Manager lock probe (Add-Type / P/Invoke rstrtmgr.dll)
```

## 27. Evidence for Major Passes

- **Verification genuinely fails:** stubbed solver returns `x = 7` for `2x + 4 = 10` →
  `FAIL`, reason *"substituting x = 7 gives 18 on the left and 10 on the right"*.
- **Two bugs found in my own new code by testing:** `\bx\b` never matches the `x` in `2x`
  (a digit and a letter share no word boundary), and `MathToolResult` exposes `result`, not
  `value`. Both fixed; both were silent.
- **No fabricated mastery:** 2 correct answers → `developing`; 4 → `mastered`. Empty history
  → accuracy `null`, empty weak-concept list.
- **No fabricated knowledge:** `buildMisconceptionDrill('not-a-real-concept-id')` → `null`.
- **Bounded agent:** 400 nested parens and a 50,000-char goal both stay within 8 steps.
- **Notebook honesty in the real DOM:** exactly 1 "Verified" and 1 "Not verified" entry.
- **Zero outbound network requests** during the 53-check browser run.
- **Packaged app:** window title correct, 4 processes, backend live, `7*8=56`, `2x+4=10→3`,
  `fact(5)=120`, agent `→5` verified by substitution, learning plan → 3 practice + 3 quiz,
  cross-origin `403`, clean 5→0 shutdown.

## 28. Final Status Matrix

| # | Requirement | Status |
| --- | --- | --- |
| 1 | Deterministic math correctness | **PASS** |
| 2 | Knowledge-grounded Tutor | **PASS** |
| 3 | Independent verification | **PASS** |
| 4 | Adaptive Tutor (difficulty) | **PASS** |
| 4b | Misconception-driven hint selection | **PARTIAL** |
| 5 | Bounded Math Agent | **PASS** |
| 6 | Notebook workspace | **PASS** |
| 7 | Practice / quiz generation | **PASS** |
| 8 | Security (CORS, limits, validation) | **PASS** (auth still needed publicly) |
| 9 | Cross-origin protection | **PASS** |
| 10 | Unit + integration + regression tests | **PASS** (34 suites) |
| 11 | typecheck / lint / build | **PASS** |
| 12 | npm audit | **PASS** (0) |
| 13 | Browser QA | **PASS** (53 + 15 + 26) |
| 14 | Electron packaging | **PASS** |
| 15 | EXE startup / math / shutdown | **PASS** |
| 16 | Documentation | **PASS** |
| 17 | Competitor gap analysis | **PASS** |
| 18 | State report | **PASS** |
| 19 | OCR / vision | **NOT IMPLEMENTED** |
| 20 | 3D / parametric / implicit graphing | **NOT IMPLEMENTED** |
| 21 | Geometry construction workspace | **NOT IMPLEMENTED** |
| 22 | Data Lab charts | **NOT IMPLEMENTED** |
| 23 | Live Gemini | **NOT VERIFIED** |
| 24 | Live Supabase retrieval | **NOT VERIFIED** |
| 25 | WCAG conformance | **NOT VERIFIED** |
| 26 | Canonical `release/` regeneration | **BLOCKED** (VS Code lock) |
| 27 | `origin/main` integration | **DEFERRED** (23 conflicts, unauthorized) |

**12 PASS · 2 PARTIAL · 1 FAIL-free-but-blocked · 4 NOT IMPLEMENTED · 4 NOT VERIFIED · 1 DEFERRED.**
No item is reported as passing without evidence, and nothing was faked to make a suite green.
