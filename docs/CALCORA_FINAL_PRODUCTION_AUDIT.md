# Calcora Final Production Audit — 2026-10-08/09 · re-verified 2026-10-12

**Repository:** `C:\My projects\Calcora-AI-production` · **Branch:** `main` · **HEAD:** `91b57c5` (= `origin/main`)

**Commit/push has NOT occurred.** The merge remains in progress (`MERGE_HEAD 293c31a…`).

---

## 0. 2026-10-12 delta

A full re-run of every gate against the rebuilt package. The 2026-10-09 release in
`C:\Users\kk\calcora-build` was left untouched throughout; the new build went to
`C:\Users\kk\calcora-build-next` and was promoted to *current verified build* only after it
passed the same 48-check gate. Nothing was deleted to make room for it.

| Gate | 2026-10-09 | 2026-10-12 | Note |
|---|---|---|---|
| Typecheck | 0 issues | **0 issues** | unchanged |
| Regression | 67/67 | **68/68**, 91.9 s | one suite added |
| Packaged smoke | 48 / 0 / 0 | **48 / 0 / 0**, exit 0 | rebuilt package, same gate |
| Model-free tutor benchmark | 87.5% (14/16) | **100% (16/16)** | 2 groups flipped, both RED-first |
| UI text-contrast audit | not run | **397 fails / 134 root causes** | PARTIAL — §7 |

### New defects fixed (5, all RED-first where behaviour changed)

| Defect | Evidence | Fix |
|---|---|---|
| Prose parsed as arithmetic — `x^2 is x. is that right` extracted the whole sentence as an expression | tokenizer ACCEPTS `x^2 is x` (identifiers parse as variables), so "longest prefix the tokenizer accepts" can never work | stop-at-prose-word operand walk (`leadingOperand()`) |
| Follow-up with a carried operand — `And its derivative?` returned `unknown` because extraction received only the prompt | benchmark group `follow-up-context` at 0% | gated referent resolution; only a bare relative operation request may borrow an operand, so `Explain what a derivative is` still falls through conceptually |
| **All 91 `light:` classes were dead** — Tailwind had no `light` variant, so light mode silently used dark styling | keypad digits measured **white-on-grey, ~2.3:1** in light mode | `@custom-variant light (&:where(.light, .light *))` |
| Two `h1` elements | shell brand + dashboard hero | hero demoted to `h2` |
| `capabilityRegistry.ts` claimed "no planning loop exists" for the tool-calling agent | `server.ts` serves `runMathAgent`; `tests/mathAgent.test.ts` covers it | evidence corrected; capability stays `planned` |

### Accent & token corrections, each driven by a measured ratio

- Filled buttons `cyan-600` → `cyan-700`: white text **3.68:1 → 5.44:1**
- `hover:bg-cyan-500` on `text-white` buttons → `cyan-800`: **2.28:1 → 5.44:1**
- `indigo` / `purple` / `violet` collapsed into the brand accent across 19 files (0 remaining)
- `--cc-accent` light `#0891b2` → `#0e7490`; `--cc-text-faint` light `#64748b` → `#5b6b80`, dark `#7d8aa1` → `#8795ac`; `--cc-success`/`--cc-warning` shaded one step
- `--cc-info` moved off indigo to sky, so the app has exactly one brand accent

See `docs/CALCORA_UI_REDESIGN_AUDIT.md` for the full method and the open backlog.

---

### Measured performance (packaged, `tests/exeSmokeTest.ts`)

| Operation | Measured |
|---|---|
| Backend health, first launch | 9 ms |
| Backend health after restart | 4 ms |
| Deterministic math tool `2 + 3` | 24 ms |
| Math Agent derivative | 24 ms |
| Tutor equation solve | 27 ms |
| Tutor Urdu derivative | 23 ms |
| **Local GGUF generation (single turn)** | **21,672 ms** |

The deterministic path is single-digit-to-low-tens of milliseconds. The only slow operation is
local model inference, which is CPU-bound and measured at 8.3–12.9 s idle and 45–55 s under
contention elsewhere in this audit — an honest characteristic of running the model on-device,
not a defect introduced by this run.

---

## 1. Verification summary

| Gate | Status | Evidence |
|---|---|---|
| Build | **PASS** | `npm run build` exit 0 · `npm run dist:win` **`DIST=0`** |
| Typecheck | **PASS** | `tsc --noEmit` 0 issues |
| Regression | **PASS** | **68/68** suites, 75.5 s, exit 0 (was 67/67, 70.3 s) |
| Packaged smoke | **PASS** | **48 PASS / 0 FAIL / 0 N/V** |
| Browser suite (`browserVerification.ts`) | **PARTIAL** | run 5: **75 PASS / 0 FAIL**, exit 0 — but 4 of 5 runs timed out under CPU contention; see matrix §7a |
| Packaged interactive UI | **PASS** | renders `d/dx(x^2) = 2x`, 2 verification badges |
| Windows package | **PASS** | NSIS 147.38 MB, portable 147.15 MB (2026-10-12 build) |
| Architecture | **PASS** | x64 read from PE header, not filename |
| Icon in package | **PASS** | byte-identical, **22,608 B** (rebuilt this run; was 17,880 B on 2026-10-09) |
| Deterministic math | **PASS** | `2+3=5`, `d/dx(x^2)=2x`, Urdu derivative VERIFIED |
| Security | **PASS** | 404/400, no CORS grant, CSP live |
| Local AI | **PASS** | llama.cpp, 4 models, 8.3–12.9 s |
| Developer trace | **PASS** | `calc-57a85855178d8a7b`, VERIFIED, reproducible |
| macOS | **NOT VERIFIED** | no host |
| Linux | **NOT VERIFIED** | no host |

## 2. Defects fixed (9, all RED-first)

Correcting the record on three earlier mistakes: I attributed the packaged-UI hang to slow local
inference (disproven at 300 s), to a form navigation (`e.preventDefault()` was present), and to a
broken single-instance lock (measured exit 0 in 0.33 s). The real cause was harness defect #4
below — a vacuous assertion that reported PASS while the app was dead.

| Defect | Fix |
|---|---|
| Unbounded `fetch` in the Tutor client | `AbortController`, 200 s (above the 180 s server ceiling) |
| Fallback verified root against expression | substitute roots via `verifyEquation` |
| "find" triggered auto-calculation, unmounting the Tutor | `autoCalculateIntent.ts` policy |
| `exitCode === null \|\| signalCode === null` could never fail | `&&` |
| App spawned `detached: false` (exits in ~5 s) | `detached: true` |
| `app.kill()` orphaned children holding the lock | `killAppTree` via `taskkill /T /F` |
| Silent port fallback hid discovery failure | fail loudly, `port` starts at 0 |
| 9 RTL languages defaulted to LTR | `direction: 'rtl'` declared |
| Re-ingest demoted verified knowledge | verification preserved across refresh |

## 3. Storage

**9,924.1 MB recovered.** C: free 8,589 → **18,513.1 MB**. Repo 16,620.5 → 16,329.8 MB. Largest
single item is now `.git/lfs` at 9,398.6 MB — flagged, **not** pruned.

## 4. Model retirement

**BLOCKED for the 4 primary models** (sole generative path, 8.3–12.9 s/turn). **COMPLETE for the
duplicates: 6,148.4 MB removed**, SHA-256 proven identical, 67/67 regression before and after,
48/48 packaged gate afterward. Capability blast radius of deleting the models: **3 of 20**.

## 5. Honest limitations

1. **macOS / Linux NOT VERIFIED** — no host.
2. **100+ languages NOT IMPLEMENTED as capability** — 115 registered for detection, 44 grammar
   profiles, **2** full local Tutor answers.
3. **5 capabilities planned, not implemented**: Coding Assistant, Code Reviewer, Research
   Assistant, Document Explainer, tool-calling agent.
4. **No training performed.** No dataset, config, or artifact exists.
5. **No knowledge extracted from model weights** — not technically possible; weights are not an
   extractable catalogue.
6. **Local generation latency varies ~5×** with CPU contention.
7. **Binaries are NotSigned.**

## 6. Git state

`MERGE_HEAD 293c31a…` present. 31 staged / 44 unstaged / 46 untracked. No `reset --hard`, no
`clean`, no `restore`, no `rebase`, no force-push, no worktree removal. The staged
`release-wave1/…/default_app.asar` deletion and the `src/knowledge/ragEngine.ts` deletion are
preserved untouched. **No commit, no push, no merge completion.**