# Regression Results — 2026-10-08/09

**Branch:** `main` · **Baseline commit:** `91b57c5` · **Typecheck:** 0 issues

---

## 1. Full suite

```
Sweep complete in 80.8s
suites: 68, passed: 68, failed: 0
SWEEP_EXIT=0
```

**68/68 PASS.** The directive baseline was 60/60; the model-free benchmark added two more; the count rose because every bug found was
given a regression test rather than being fixed silently.

## 2. Packaged Windows application

```
Packaged smoke checks passed: 48, failed: 0, not verified: 0
SMOKE_EXIT=0
```

| Group | Checks | Result |
|---|---|---|
| Package contents, arch, version, icon | 16 | PASS |
| Launch, filesystem, single instance, restart | 8 | PASS |
| Calculator, engine, agent, tutor, knowledge | 14 | PASS |
| Local AI (llama.cpp) | 3 | PASS |
| Security boundaries | 3 | PASS |
| Packaged interactive UI | 3 | PASS |

## 3. Measured latencies

| Operation | Idle | Under CPU contention |
|---|---|---|
| Health (first launch) | 5–8 ms | — |
| `2 + 3` deterministic | 18–30 ms | — |
| Math agent derivative | 12–27 ms | — |
| Tutor equation | 17–32 ms | — |
| Tutor Urdu derivative | 14–31 ms | — |
| **Local GGUF generation** | **8,286–12,880 ms** | **45,042–54,604 ms** |
| Health after restart | 3–14 ms | — |

**Local inference varies ~5× with CPU availability.** No single figure is representative; the
range is reported instead.

## 4. Defects found and fixed this cycle (all RED-first)

| # | Defect | Evidence of failure before fix | Test |
|---|---|---|---|
| 1 | `askAIMathAssistant` awaited `fetch` with no `AbortSignal`; a wedged backend left the prompt input disabled permanently | `false !== true` — never settled within 5 s | `aiClientTimeout.test.ts` (4) |
| 2 | Deterministic fallback called `verifyCalculation('2x + 5 = 15','5')`, comparing the **root** to the **expression**; correct `x = 5` reported UNVERIFIED | `UNVERIFIED` against a correct answer | `aiClientTimeout.test.ts` |
| 3 | Auto-calculate heuristic matched bare "find", so "Find the derivative of x^2" navigated out of the Tutor and **unmounted the answer 2 s after submit** | `waitForFunction` timeout at 30 s, 120 s **and** 300 s — identical | `autoCalculateIntent.test.ts` (4) |
| 4 | Packaged smoke asserted `exitCode === null \|\| signalCode === null` — **vacuous**; a clean `exit 0` satisfied the second clause, so launch "PASS" was reported while the app was dead | printed `exit=0` and still said PASS | corrected in `exeSmokeTest.ts` |
| 5 | Smoke test spawned the app `detached: false`; the packaged app exits 0 within ~5 s in that mode | backend started, then exit 0 | corrected in `exeSmokeTest.ts` |
| 6 | `killAppTree` absent — `app.kill()` orphaned children holding the single-instance lock and debug port | restart health 90,086 ms timeout | corrected in `exeSmokeTest.ts` |
| 7 | Silent port fallback to a hardcoded 39871 masked discovery failure as `ECONNREFUSED` | misleading error | corrected in `exeSmokeTest.ts` |
| 8 | All 9 RTL languages (ur, ar, fa, he, ps, yi, ku, sd, ug) lacked `direction`, defaulting to LTR | coverage report showed Urdu as `ltr` | `writingDirection.test.ts` (5) |
| 9 | Re-ingesting a knowledge record silently demoted verified knowledge to UNVERIFIED | `canonical().length` 0 where 1 expected | `candidateStore.test.ts` |
| 10 | Roman Urdu (`... ka ... kya hai`) detected as Hindi | `detectLanguage` returned `hi` | `romanUrduSupport.test.ts` |
| 11 | Explicitly requested `language` silently ignored | `language:'ur'` and `language:'en'` both returned Hindi | `romanUrduSupport.test.ts` |
| 12 | Latin-expression gate excluded Roman Urdu, so the derivative was never computed | `authoritativeResult: (none)` | `romanUrduSupport.test.ts` |
| 13 | Default `'en'` outranked a correctly detected Urdu prompt | `ANSWER:` instead of `جواب:` | caught by `multilingualVerification11` |

## 5. New test suites added (60 → 67)

| Suite | Assertions | Pins |
|---|---|---|
| `aiClientTimeout` | 4 | bounded requests, honest timeout reporting, deterministic authority retained |
| `autoCalculateIntent` | 4 | calculus never auto-calculates; arithmetic still works |
| `calculationTrace` | 6 | reproducible time-independent ids; never upgrades verification; no private reasoning |
| `developerTrace` | 6 | derives state from the independent verifier; no invented steps |
| `capabilityRegistry` | 9 | evidence required; planned ≠ available; model-dependency labelled |
| `candidateStore` | 9 | verified-knowledge boundary enforced in code |
| `writingDirection` | 5 | RTL correctness across 9 languages |
| `romanUrduSupport` | 8 | Roman Urdu detection, extraction, explicit-language precedence |

## 6. Honest limitations

1. **macOS — NOT VERIFIED.** No host. Configuration exists; no build or runtime evidence.
2. **Linux — NOT VERIFIED.** No host. Same.
3. **Local generation latency** varies ~5× with CPU contention; range reported, not a single figure.
4. **100+ languages — NOT IMPLEMENTED as capability.** 115 registered for detection, 44 with
   grammar profiles, **2** with full local Tutor answers. Registry size is not capability.
5. **Coding Assistant / Code Reviewer / Research Assistant / Document Explainer / tool-calling
   agent** — planned, not implemented, despite being named as expected modes.
6. **No training was performed.** No dataset, configuration, or artifact exists.
7. Binaries are `NotSigned`.