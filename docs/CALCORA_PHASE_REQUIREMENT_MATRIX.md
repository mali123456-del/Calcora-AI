# Calcora Phase & Requirement Traceability Matrix

Every requirement is traced to a phase, an acceptance gate, and the artefact that
proves it. Statuses are the measured state, not the intended state.

**Status legend**

| Status | Meaning |
|--------|---------|
| `PASS` | Gate executed and its output recorded |
| `PARTIAL` | Gate executed; a named subset of the requirement is unmet |
| `FAIL` | Gate executed and did not pass |
| `NOT VERIFIED` | Gate could not be executed in this environment |
| `BLOCKED` | Gate requires a decision or an authorisation that has not been given |
| `NOT_IMPLEMENTED` | The capability genuinely does not exist and is declared as such |

No status is upgraded on the strength of code existing. A capability is `PASS`
only when something reachable from the product demonstrably does it.

---

## 1. Environment & platform claims

| Requirement | Status | Evidence |
|---|---|---|
| Windows `PACKAGE` | **PASS** | `npm run dist:win` → NSIS setup + portable EXE, `DIST=0` |
| Windows `LAUNCH` | **PASS** | packaged smoke drives the built EXE over CDP |
| macOS `PACKAGE` | `NOT VERIFIED` | no macOS host in this environment |
| macOS `LAUNCH` | `NOT VERIFIED` | no macOS host; also **not** signed or notarised — no claim is made |
| Linux `PACKAGE` | `NOT VERIFIED` | no Linux host in this environment |
| Linux `LAUNCH` | `NOT VERIFIED` | no Linux host |
| Cross-platform CI exists | **PASS** | `.github/workflows/cross-platform.yml` builds ubuntu/windows/macos; `scripts/probe-cross-platform-packaging.ps1`; `tests/crossPlatform{Policy,Runtime}.test.ts` |

> The cross-platform workflows are authored and structurally valid. They have
> **not run in this environment**, so cross-platform support is declared on the
> strength of CI definitions only, never as a shipped result.

---

## 2. Language & localisation claims

| Requirement | Status | Evidence |
|---|---|---|
| Registered locales | **PASS** | 115 registered · 44 with grammar (`docs`, Phase 24 `languageCoverageReport.ts`) |
| Grammar coverage | **PARTIAL** | 2 FULL · 35 PARTIAL · 78 detection-only |
| RTL correctness | **PASS** | 9 RTL defects fixed and re-verified |
| "100+ languages" as a product claim | **NOT MADE** | 115 registered is a registry count, not 115 usable languages. The UI reports the FULL/PARTIAL/detection split |

---

## 3. Model & capability claims

| Requirement | Status | Evidence |
|---|---|---|
| Deterministic engine is the mathematical authority | **PASS** | tutor benchmark grades against engine output; the LLM may only explain |
| LLM never invents arithmetic | **PASS** | `tests/tutorResponseGuard.test.ts`, `verificationStates`, `verificationDifferential` |
| Capability registry is honest | **PASS** | 20 capabilities, each with `behaviour` + evidence; 3 model-dependent; 5 `planned` |
| Registry accuracy audit | **PASS** | one false claim found and corrected this run — see §5 |
| Model retirement | `BLOCKED` | gates #1–#7 not cleared; `deletionManifest.ts` `authorized=true` count = **0** |
| GGUF models preserved | **PASS** | 4 primary models intact, 6,146 MB, SHA-256 recorded |

### Model-free tutor benchmark — the decisive measurement

Run with `offlineOnly: true`, so no language model may be consulted. Thresholds
were fixed before the run and were not tuned to it.

```
overall score: 100.0%   (16/16 tasks)      previous: 87.5% (14/16)
groups below threshold: 0                  previous: 2
```

| Group | Result |
|---|---|
| math-reference · concept-explanation · language-conversation | 100% |
| follow-up-context · topic-change · misconception-correction | 100% |
| unsupported-knowledge · tool-routing-verification | 100% |
| offline-degradation · safety-refusal | 100% |

**Two groups flipped this run**, both TDD red-first:

1. **`misconception-correction`** — extraction accepted prose as arithmetic, so
   `x^2 is x. is that right` extracted the whole sentence as an expression.
   Fixed with a stop-at-prose-word operand walk (`leadingOperand()`), not a
   "longest prefix the tokenizer accepts" rule, because the tokenizer happily
   accepts `x^2 is x` (identifiers parse as variables).
2. **`follow-up-context`** — `And its derivative?` carries its operand in an
   earlier turn. Extraction received only the prompt. Added a gated referent
   resolution: only a prompt that is *nothing but* a relative operation request
   may borrow an operand, so `Explain what a derivative is` still falls through
   to the conceptual path instead of silently computing a stale expression.

> **Consequence for retirement:** those two groups are no longer model
> dependencies. This is *evidence*, not authorisation — retirement still
> requires cleared gates and explicit sign-off.

---

## 4. UI redesign requirements

Full detail in `docs/CALCORA_UI_REDESIGN_AUDIT.md`.

| Requirement | Status | Evidence |
|---|---|---|
| Nothing hidden or removed by the redesign | **PASS** | all 19 tabs present exactly once; all 4 `Not implemented` tiles retained with honest labels |
| Every `#tab-*` id present and clickable | **PASS** | 19/19 live |
| Design tokens established | **PASS** | `--cc-*` layer in `src/index.css` |
| One restrained accent, no rainbow | **PASS** | `indigo`/`purple`/`violet` → brand cyan across 19 files; 0 remaining |
| Minimum 11px type | **PASS** | 0 text nodes below 11px across all tabs |
| Accessible names on controls | **PASS** (after RED→GREEN fix) | `tests/controlAccessibility.ts`: RED 882/916 named (**34 unnamed**, exit 1) → GREEN **916/916**, exit 0; 0 anchors without `href` |
| Landmark structure | **PASS** | `banner`/`nav`/`main` = 1 each, single `h1` |
| Text contrast (WCAG AA) | **PARTIAL** | 397 failing nodes / 134 root causes, measured and ranked; see §6 |
| Icon rebuilt | **PASS** | original "solved curve"; ICO/ICNS/10 PNGs regenerated; verified at 16–256px on light and dark |

---

## 5. Registry correction made this run

`capabilityRegistry.ts` declared `tool-calling-agent` with the evidence
*"no planning loop or approval gate exists"*. That is **false**: `server.ts`
serves `runMathAgent` at `/api/ai/math-agent`, and `tests/mathAgent.test.ts`
covers it.

Corrected to state what is true — a bounded plan → tool → verify → explain
pipeline exists and is served, but it executes its single verified tool with no
human approval gate and can orchestrate no second tool. The capability stays
`planned`; only the evidence was wrong. `tests/capabilityRegistry.test.ts`
(9 assertions) still passes.

Five capabilities remain `planned`, each with an evidence-backed blocker:
`coding-assistant`, `code-reviewer`, `research-assistant`, `document-explainer`,
`tool-calling-agent`.

---

## 6. Known unmet requirements

| # | Requirement | Status | Note |
|---|---|---|---|
| 1 | WCAG AA text contrast in light mode | `PARTIAL` | 397 nodes / 134 root causes; pre-existing Tailwind palette steps (`slate-400` 2.61:1, `cyan-500` 2.33:1) used as muted text. Every central override was modelled and rejected because it trades light-mode failures for dark-tile failures; the correct fix is per-component across ~40 files |
| 2 | macOS / Linux packaging and launch | `NOT VERIFIED` | no host machine |
| 3 | LFS prune of 4 locally-unreachable objects (≤2,630.04 MB) | `BLOCKED` | remote recoverability not verified (HTTP 401 on the LFS batch endpoint); retained |
| 4 | `DRPSu` removal (930.6 MB) | `BLOCKED` | user decision, outside Calcora scope; retained |
| 5 | Primary-model retirement (6,146 MB) | `BLOCKED` | gates not cleared; authorisation not given |
| 6 | Commit / push | `BLOCKED` | `MERGE_HEAD` present; 31 staged / 44 unstaged / 52 untracked; awaiting authorisation |
| 7 | Coding / research / document capabilities | `NOT_IMPLEMENTED` | declared `planned` with blockers |

---

## 7. Regression gates

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | **0 issues** |
| `node scripts/run-test-sweep.mjs` | **68/68 PASS**, exit 0 (75.5 s, final source) |
| `tests/capabilityRegistry.test.ts` | 9/9 PASS |
| `tests/problemExtractor.test.ts` | 43/43 PASS |
| Model-free tutor benchmark | **16/16, 100%**, 0 groups below threshold |
| `npm run dist:win` | **PASS**, `DIST=0` — NSIS 147.38 MB + portable 147.15 MB to `C:\Users\kk\calcora-build-next` (pre-a11y-fix source) |
| Rebuild onto final source (post-a11y) | **PASS**, `EB_EXIT=0` → `C:\Users\kk\calcora-build-latest` — see §7b for why it could not go to `release/` |
| Packaged EXE smoke (`tests/exeSmokeTest.ts`) | **48 PASS / 0 FAIL / 0 N/V**, exit 0 — icon byte-identical 22,608 B, local GGUF generation 10,229 ms, Urdu derivative VERIFIED |
| Live DOM contracts (19 tabs × 2 themes) | **PASS** — 19 tabs, 0 hidden, min font 11px, 4 `Not implemented` tiles, 0 horizontal overflow |
| `tests/controlAccessibility.ts` (Phase 9) | **PASS** — RED 34 unnamed → **GREEN 916/916 named**, 0 failures, exit 0; 0 console errors; 5 disabled controls verified gated, 4 zero-size verified hidden |
| `tests/browserVerification.ts` | see §7a |

No gate was relaxed to achieve a green result, and no test was weakened.

### 7a. Browser suite — product green; suite unreliable under contention

`tests/browserVerification.ts` is **not** part of the 68-suite sweep. Five runs were made, plus
two instrumented replicas and an external model-timing monitor.

| Run | Result | Failure point |
|---|---|---|
| 1 | 28 PASS / 0 FAIL → `BROWSER=1` | `page.waitForResponse` 60 s at `[2d]` (line 247) |
| 2 | 5 PASS / 0 FAIL → `BROWSER=1` | `waitForFunction` 120 s at `waitForTutorReady` (line 123) |
| 3 | 5 PASS / 0 FAIL → `BROWSER=1` | line 123, identical to run 2 |
| 4 | 5 PASS / 0 FAIL → `BROWSER=1` | line 123, identical to run 2 |
| 5 | **75 PASS / 0 FAIL → `BROWSER=0`** | **clean run** |

**Status: `PARTIAL`.** The suite does produce a green run — 75 checks, zero failures, exit 0 — but
4 of 5 runs failed, so it is not reliable here. Claiming `PASS` on the strength of one green run
while suppressing four failures would misrepresent it.

#### Four hypotheses tested, not assumed

| Hypothesis | Test | Verdict |
|---|---|---|
| rAF throttled, so `waitForFunction` (default `polling: 'raf'`) never observes a tick | measured **179 ticks / 3 s = 60 ticks/s**; same predicate resolved via `waitForFunction` in **11 ms** with `raf` *and* with `polling: 100` | **Rejected** — instrument is healthy |
| Orphaned harness browsers starve the CPU | `0` Playwright/headless processes; the 16 Chrome processes are this session's browser | **Rejected** |
| `/api/ai/math` rate limiter (8 req/60 s) strands the composer in `disabled` | a 429 returns fast (not a 120 s hang), and `finally { setIsLoading(false) }` at `AIAssistantPanel.tsx:704` always clears it | **Rejected** |
| Deterministic product regression in the tutor round-trip | run 5 green; both replicas green; packaged smoke 48/48 | **Rejected** |

#### Direct evidence the product path is healthy

| Measurement | Result |
|---|---|
| `POST /api/ai/math` derivative, direct to backend | **200 in 1,075 ms** |
| Replica #1 — full harness flow, instrumented | request → response → input re-enabled in **26,614 ms**, HTTP 200, `hasUrdu=true`, badges 1 → 2 |
| Replica #2 — same flow, predicate polled independently | predicate true at **32,801 ms** |
| Urdu turn direct over HTTP | **200 in 34,013 ms** |
| Manual fill → `#btn-ai-submit` → response lands | body 4,216 → 6,056 chars; badges `UNVERIFIED` + `VERIFIED` |
| Model turn durations during the **green** run 5 | **32 s, 82 s, 45 s** |

#### Root cause: latency variance, not a defect

A normal turn takes 26–34 s against a 120 s wait — ~3.5× margin. But turn 2 of the green run
itself took **82 s**, and failed runs 2–4 abandoned requests left server-side generation running up
to `DEFAULT_TIMEOUT_MS` (`localGgufRuntime.ts:23`), overlapping the next run's turn on the same CPU.

One structural observation, recorded **without editing the test**: the harness waits
`{ timeout: 120000 }` while the server's model ceiling defaults to `120_000` — identical values, so
on a slow turn the harness can only observe the input re-enable at the same instant the server gives
up. Widening that timeout would be tuning a gate to fit observed behaviour, so it was left alone.

The sections this suite covers are independently confirmed: tutor round-trip, derivative rendering
and verification badges by the probes above, and the packaged smoke's **48/48** against freshly
built code.

**No test was modified, relaxed or weakened in the course of this investigation.**

---

### 7b. Packaging cannot target `release/` — workspace directory lock

Rebuilding onto final source surfaced a **reproducible, environment-level** failure:

```
⨯ EPERM: operation not permitted, rename
  'release\win-unpacked.tmp' -> 'release\win-unpacked'   (failedTask=build)
```

Diagnosis (each step measured, nothing destructive):

| Observation | Result |
|---|---|
| Rename target `release\win-unpacked` | **absent** — so this was not a real collision |
| Files inside `win-unpacked.tmp` | writable, and individually deletable |
| Renaming a **child** directory (`locales`) | **succeeded** — so only the *top-level* directory handle was pinned |
| Processes holding the path | none found |
| Retried rename ×5 over ~15 s | **5/5 denied** |
| Rebuilt to a brand-new dir *inside* the workspace (`release-next`) | **same EPERM** — so it is not a pre-existing lock |

The same failure on a directory created seconds earlier means the workspace
acquires a handle on newly created directories — an agent/watcher side effect, not
a defect in electron-builder or in the project. `tests/exeSmokeTest.ts:30` already
records the same phenomenon ("watched workspace"), which corroborates it.

**Resolution:** emit build output **outside** the workspace. `directories.output`
was overridden to `C:\Users\kk\calcora-build-latest` via a generated config whose
key set was verified identical to `package.json`'s `build` block; `EB_EXIT=0`,
NSIS 147.38 MB, portable 147.15 MB, `win-unpacked` renamed cleanly. The temp
config and my `release-next` artifact were then removed, and `release/` is empty.

**Also observed, recorded honestly:** when `CALCORA_SMOKE_LLAMA` is supplied, the
packaged app exited with code 0 after starting its server in **2 of 4** attempts
(health never reached, 90 s timeout); the llama runtime itself is healthy
(`--version` → `0.6.0-dev build 11500`, exit 0), and a later run passed
`local GGUF generation: 10,229 ms`. Final result: **48/48**, exit 0. Root cause of
the intermittent launch exit was **not established** and is reported as observed
rather than explained.
