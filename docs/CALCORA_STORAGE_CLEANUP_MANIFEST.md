# Storage Cleanup Manifest — 2026-10-09 (Deep Forensic Audit)

**Scope:** Deep forensic storage cleanup command. Stage A audit → Stage B verified cleanup.
**Method:** Every deletion verified by content hash or application metadata *before* removal, and
re-measured after. No broad folder deletion. No name/size-based inference.

---

## 1. Free disk space

| Point | Free (MB) | Free (GB) |
|---|---|---|
| Before this audit's deletion | 18,726.0 | 18.29 |
| After | **18,966.1** | **18.52** |

**Reclaimed this round: 240.2 MB (0.235 GB)** — measured by
`Get-CimInstance Win32_LogicalDisk`, not estimated.

**Cumulative across all cleanup rounds in this session: 10,164.3 MB**, from an 8,589 MB
forensic baseline to 18,966.1 MB free.

## 2. Reclaimed by category (this round)

| Category | Bytes | Item |
|---|---|---|
| Superseded third-party installer staging | 240.2 MB | `%LOCALAPPDATA%\Temp\vscode-stable-user-x64` |

That is the **only** deletion performed in this round. Section 3 explains why nothing else
qualified.

## 3. Deleted path, with verification

**Path:** `C:\Users\kk\AppData\Local\Temp\vscode-stable-user-x64`
**Contents:** `CodeSetup-stable-2a59476c9bfcb90b3ddc372c36762471b7dfad1c.exe` (240.16 MB) +
`update-metadata.json`

| Verification step | Evidence |
|---|---|
| Ownership | VS Code user-setup staging under `%TEMP%` — not Calcora, not user profile data |
| Identity | Publisher's `update-metadata.json` declared `productVersion: 1.141.0` |
| Integrity | File SHA-256 `e377a8e2e081a4b59dfd19514abdf4f35aa95aa697e217ad819a0fccff11c602` — **matched the publisher's declared hash exactly** |
| Superseded | Installed VS Code is **1.141.0**, installed 2026-10-06 — three days *before* the file was downloaded on 10-09. A no-op re-download |
| Abandoned | Newest write 219 minutes before audit; **0** VS Code processes running |
| Lock test | Exclusive `File.Open(..., ReadWrite, None)` **succeeded** — no process holds the file |
| Reference check | The single matching process was the audit's own `pwsh` (`IsSelf: True`), excluded |
| Classification | VERIFIED EXACT DUPLICATE / superseded staging payload |
| Recovery | Re-downloadable from the recorded URL; no unique data |
| Post-check | Directory absent; VS Code still installed at 1.141.0 |

## 4. Retained — protected, required, or uncertain

| Path | Size (MB) | Classification | Reason retained |
|---|---|---|---|
| `.git` | 9,401.4 | **PROTECTED** | Section 5. Contains the object store |
| `.git/lfs` | 9,398.6 | **PROTECTED** | Section 5/7. LFS active, 3 tracked rules |
| `models` (4 GGUF) | 6,146.0 | **PROTECTED** | Section 5. Sole runtime copy; only generative path (8.3–12.9 s/turn) |
| `node_modules` | 772.9 | REQUIRED DEPENDENCY | `package-lock.json` present; regeneration is a full re-download, not a rebuild |
| `C:\Users\kk\calcora-build` | — | REQUIRED OUTPUT | Last known-good package; protected until replaced artifacts verified |
| `AppData\Local\electron\Cache` | 151.0 | RETAINED | Holds `electron-v44.7.0-win32-x64.zip`, the exact runtime this build consumes. Deleting forces a re-**download** and breaks offline packaging |
| `AppData\Local\electron-builder\Cache` | 15.4 | RETAINED | NSIS 3.0.4.1 + nsis-resources + 7zip toolchain required by `electron-builder` |
| `.local\share\kilo\worktree-pool` | 1.8 | **PROTECTED** | Contains a **registered git worktree**. `models/` already 0 MB after duplicate removal |
| `AppData\Local\npm-cache` | 2.5 | RETAINED | Negligible; shared by all npm projects on the machine |
| `dist/`, `dist-electron/` | 5.9 | REBUILDABLE OUTPUT | Rebuilt by `npm run build`; trivial size |
| `AppData\Roaming\DRPSu` | 930.6 | **REVIEW_REQUIRED** | Orphaned third-party data. SHA-256 disproved the duplicate theory — the two 360TS installers differ. Not Calcora-related |
| `@opencodedesktop-updater` | 432.3 | REQUIRED | Holds a live pending update for the running OpenCode Desktop |
| Chrome `OptGuideOnDeviceModel` | 2,670.0 | **NOT CALCORA** | Chrome profile data |
| `docs/` competitor research (5 files) | ~61 KB | RETAINED | Redundancy is a judgment about research intent |

## 5. Duplicate detection performed

| Pair | Method | Result |
|---|---|---|
| 4 worktree GGUF vs 4 primary GGUF | SHA-256 on both sides | **Byte-identical** → already removed (6,148.4 MB, earlier round) |
| Remaining project files | Grouped by size, hashed candidates | **No duplicate pairs found** |
| VS Code installer payload | SHA-256 vs publisher metadata | Superseded duplicate of an already-installed version |

## 6. Errors or regressions discovered

**No regressions.** One stale measurement and one wrong assumption were corrected during the audit
rather than acted on:

- The `.local\share\kilo` figure of **157.7 MB** was **stale** — captured before the duplicate
  model removal. Actual: **1.8 MB**.
- The VS Code payload was initially assessed as "in-flight" from its location under `%TEMP%`;
  measurement (219 min old, 0 processes, exclusive-open success) showed it abandoned. Assuming
  TEMP implies disposable is exactly the inference this audit was told to avoid.

## 7. Post-cleanup verification (Section 8)

| Check | Result |
|---|---|
| Git HEAD | `91b57c5` — unchanged |
| Branch | `main` — unchanged |
| `MERGE_HEAD` | `293c31a…` — **preserved** |
| Working tree | staged 31 / unstaged 44 / untracked 52 — **identical to pre-cleanup** |
| VS Code | still installed, 1.141.0 |
| Node / npm / git | v24.18.0 / 11.16.0 / 2.55.0 |
| `tsc --noEmit` | 0 issues |
| Regression | **68/68 PASS** |

## 8. Git operations performed

**None.** No `reset`, `clean`, `restore`, checkout-overwrite, rebase, force-push, pull, merge,
merge-abort, worktree removal, or commit/push. No protected item was renamed, moved, or relabelled
to bypass its classification.

## 9. Remaining candidates requiring separate authorization

| Item | Size | Blocker |
|---|---|---|
| `.git/lfs` objects | 9,398.6 MB | Section 7 forbids `git lfs prune` here. Needs a reachability report first |
| 4 primary GGUF models | 6,146.0 MB | Section 5 protected; sole generative path |
| `AppData\Roaming\DRPSu` | 930.6 MB | Third-party orphan; ownership/purpose uncertain |
| `@opencodedesktop-updater` | 432.3 MB | Live pending update for a running application |
| Commit / push | — | Merge unresolved; not authorized |

## 10. Status

| Area | Status |
|---|---|
| Forensic audit | **PASS** |
| Verified cleanup | **PASS** — 240.2 MB, hash-verified |
| No-feature-lost verification | **PASS** — 68/68, tsc 0, git state identical |
| Protected items respected | **PASS** |
| Git state preserved | **PASS** |
| Additional reclaim available | **NOT VERIFIED** — requires separate authorization (§9) |

---

# 11. Read-Only Follow-up Investigation — 2026-10-12

**Scope:** separate, strictly read-only investigation of the three candidates left open in §9:
`.git/lfs`, `DRPSu`, and the four primary GGUF models.
**Constraint honoured:** nothing was deleted, renamed, moved, quarantined, or staged. No
`git lfs prune`, no history rewrite, no index modification, no commit/push/reset/clean/rebase/merge.

**Preserved state at start and end of this investigation (re-measured):**

| Fact | Value |
|---|---|
| `HEAD` | `91b57c5364432728f4ec6d296dc9e1bfdb66c7ef` (unchanged) |
| Branch | `main` (unchanged) |
| `MERGE_HEAD` | `293c31a9759960e3db099c1f2349c70b5cebaad3` (**preserved**) |
| Working tree | staged 31 / unstaged 44 / untracked 52 (unchanged) |
| `.git/index.lock` | absent |
| C: free at start of investigation | 18,956–18,966 MB |

Status vocabulary: **PASS · PARTIAL · FAIL · BLOCKED · NOT VERIFIED**.

---

## 11.1 Git LFS object reachability matrix

### Method

Read-only commands only: `git lfs ls-files --all --long`, `git rev-list --objects`, `git cat-file blob`,
`git for-each-ref`, `git reflog --all`, `git fsck --dangling --unreachable`, `git lfs push --dry-run`,
and a direct (read-only) LFS batch lookup. Object list on disk read from `.git/lfs/objects`.

### Object store

**11 LFS object files, 9,398.55 MB total** (authoritative recursive count; an earlier "13 files"
included non-object files under `.git/lfs`). LFS config: 3 tracked rules in `.gitattributes`
(`dist/*.exe`, `dist/win-unpacked/*.exe`, `*.gguf`), remote
`https://github.com/mahnoorfaisal-kogents/Calcora-AI.git`.

### Reachability matrix

Legend: **refs** = reachable from `refs/heads/*` or `refs/remotes/*`; **MERGE** = reachable from
`MERGE_HEAD`; **index** = staged; **reflog** = reachable from any reflog entry; **dangling** =
reachable from any unreachable commit; **remote** = verified present on the GitHub LFS endpoint.

| # | OID | MB | refs | MERGE | index | reflog | dangling | remote | Class |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `626b4a6678…9615c62d` | 2007.42 | ✅ | – | ✅ | ✅ | – | ✅ | **CONFIRMED REQUIRED** |
| 2 | `724fb256be…54294730b7` | 2007.42 | ✅ | – | ✅ | ✅ | – | ✅ | **CONFIRMED REQUIRED** |
| 3 | `6a1a2eb6d1…e434e9407e` | 1065.56 | ✅ | – | ✅ | ✅ | – | ✅ | **CONFIRMED REQUIRED** |
| 4 | `cc324af070…6933bb046` | 1065.56 | ✅ | – | ✅ | ✅ | – | ✅ | **CONFIRMED REQUIRED** |
| 5 | `2c8a65d29a…ba97dd95` | 210.96 | ✅ | ✅ | – | ✅ | – | ✅ | **CONFIRMED REQUIRED** |
| 6 | `ddea8a797e…ed8c1ab9a` | 211.17 | ✅ | ✅ | – | ✅ | – | ✅ | **CONFIRMED REQUIRED** |
| 7 | `767b5f6fdf…ef45e55d11` | 200.41 | ✅ | ✅ | – | ✅ | – | ✅ | **CONFIRMED REQUIRED** |
| 8 | `dac93417a2…f91d9a58f` | 2007.42 | ❌ | ❌ | ❌ | ❌ | ❌ | **NOT VERIFIED** | **UNREACHABLE (local)** |
| 9 | `ccf836e1d2…a2a6c08077` | 211.21 | ❌ | ❌ | ❌ | ❌ | ❌ | **NOT VERIFIED** | **UNREACHABLE (local)** |
| 10 | `3ff01d0338…1a2de6089` | 211.00 | ❌ | ❌ | ❌ | ❌ | ❌ | **NOT VERIFIED** | **UNREACHABLE (local)** |
| 11 | `099acd6e99…e56707ac9050` | 200.41 | ❌ | ❌ | ❌ | ❌ | ❌ | **NOT VERIFIED** | **UNREACHABLE (local)** |

| Class | Objects | Bytes |
|---|---|---|
| Confirmed required | 7 | 6,768.51 MB |
| Unreachable locally, remote unknown | 4 | 2,630.04 MB |
| Potentially required (unknown reachability) | 0 | 0 |
| Unknown | 0 | 0 |

### Evidence details

- **Refs inventory:** `refs/heads/main` (`91b57c5`), `refs/heads/backup/local-before-full-sync-20261006-065222`
  (`c8ac3c8`), `refs/heads/backup/pre-autonomous-sync-20261006-072821` (`91b57c5`),
  `refs/remotes/origin/{HEAD,main,backup/local-checkpoint-20261006-073327,feat/tutor-2-knowledge-grounding,fix/production-server-cjs-runtime}`.
  **0 tags.** 329 commits reachable from all refs; 93 from `MERGE_HEAD`.
- **MERGE_HEAD:** references only the 3 `dist/` EXE objects (#5–#7) — no GGUF. Confirms the merge
  does not pin any unreferenced object.
- **Index:** the 4 GGUF objects (#1–#4) — no unreferenced object is staged.
- **Reflog/dangling:** `reflog --all` = 8 unique commits, none references the 4; `git fsck --dangling
  --unreachable` reported **0 dangling commits** (85 lines, all non-commit). Pseudo-refs present:
  `AUTO_MERGE e3b049be…`, `FETCH_HEAD 91b57c5…`, `ORIG_HEAD 91b57c5…`; no stash.
- **Remote (verified, 7):** `git lfs push --dry-run origin main` returned **empty** — the server already
  holds every object reachable from `main`, including all 4 GGUF and the 3 EXEs. `git ls-remote`
  confirms network/auth are working.
- **Remote (unverified, 4):** a direct POST to the LFS batch endpoint returned **HTTP 401**
  (credentials required). Remote presence of objects #8–#11 is therefore **NOT VERIFIED**.

### Corrections made during this investigation (recorded, not hidden)

1. An initial reading of `git lfs push --dry-run --all` suggested the remote lacked the 7 objects.
   **That was wrong:** `--all` deliberately skips the server comparison and lists everything
   referenced locally. The ref-scoped `push --dry-run origin main` (which *does* contact the server)
   proved the opposite — the remote already has them.
2. `git cat-file -e <oid>` returning `False` for the 4 targets is **not evidence of unreachability** —
   LFS OIDs are not git objects, so that command can never resolve them. It was discarded as a test.

### Conclusion — Git LFS

**RETENTION REQUIRED — BLOCKED for any pruning.** The 7 referenced objects are load-bearing
(the merge diff-leftovers / runtime models). The 4 locally-unreachable objects are **not** proved
recoverable elsewhere (remote NOT VERIFIED), so §7's rule applies: *if reachability cannot be proved
safely, retain the objects.* **`git lfs prune` remains out of scope and was not run.** No exact
reclaimable figure can be stated without the remote check; the theoretical upper bound if all 4
proved redundant **and** recoverable is **2,630.04 MB**.

---

## 11.2 `DRPSu` — ownership resolved

**Exact absolute path:** `C:\Users\kk\AppData\Roaming\DRPSu` (only match on the machine).

| Field | Finding |
|---|---|
| Size | **930.6 MB**, 637 files |
| Owner / product | **DriverPack Solution** (vendor `drp.su`) — a third-party driver/software updater |
| Identity evidence | `settings.json` keys (`enableSoftAndDriverUtilities`, `driverSelection.useMachineLearning`, `createDriversBackup`); logs reference `http://static.drp.su/update/logs/...`; `PROGRAMS\DriverPack-Alice.exe` |
| Contents | `PROGRAMS` 703.28 MB (9 EXE incl. `360TS_Setup.exe`, `Chrone.exe`, `FirefoxEn.exe`, `OperaBlink64.exe`, `SearcherBar.exe` + `.torrent` files); `DRIVERS` 207.64 MB (Intel/Realtek/Lenovo `-drp.zip`); `Logs` 19.38 MB |
| Calcora link | **ZERO** — 623 text files scanned for `calcora` returned no match; no external references found |
| Installed software | **No** registry uninstall entry for DriverPack/DRP |
| Process handles | **No** running process from DRPSu |
| Scheduled tasks / services | **None** reference DRPSu |
| Startup entries | **None** (`Run`/`RunOnce` clean) |
| Activity | Created 2026-09-14; newest write **2026-09-16** → **26 days stale**, nothing in-flight |

**Classification:** `REVIEW_REQUIRED` — **third-party, not Calcora, not a Calcora dependency.** It
bundles multiple browser/security installers ("bundled-offer" pattern typical of this class of
utility). Recovery: re-downloadable from the vendor; contains no unique user work. **Retained in full
in this investigation** — ownership is resolved, but a removal decision is the user's, and it is
outside Calcora's scope.

---

## 11.3 Four primary GGUF models — retirement readiness

| Model | MB | SHA-256 (from Phase 21) | Location |
|---|---|---|---|
| `qwen2.5-1.5b-instruct-q4_k_m.gguf` | 1065.56 | `6A1A2EB6…E434E9407E` | `models/` |
| `Qwen2.5-3B-Instruct-Q4_K_M.gguf` | 2007.42 | `626B4A66…9615C62D` | `models/` |
| `qwen2.5-coder-1.5b-instruct-q4_k_m.gguf` | 1065.56 | `CC324AF0…6933BB046` | `models/` |
| `Qwen2.5-Coder-3B-Instruct-Q4_K_M.gguf` | 2007.42 | `724FB256…54294730B7` | `models/` |

- **Copies on machine:** a bounded search of all plausible roots (project, worktree pool,
  `calcora-build`, Downloads, Desktop, Documents, TEMP, Roaming, Programs) found **exactly these 4
  files (6,146 MB)** and **zero** in the registered worktree (`models/` = empty). These are the sole
  local copies.
- **Runtime resolution:** `src/services/localGgufRuntime.ts` resolves
  `CALCORA_MODELS_DIR` → else `CALCORA_APP_ROOT/models` → else `process.cwd()/models`; it enumerates
  `*.gguf` (rejecting symlinks) at call time. **Referencing this path is what makes the models
  load-bearing.**
- **Model-dependent capabilities (blast radius = 3 of 20):**
  `local-model-generation` (**available** — the only one actually load-bearing),
  `coding-assistant` (planned), `code-reviewer` (planned) — from `capabilityRegistry.ts`.
  The other **17 capabilities are model-independent.**
- **Alternative generation path (measured):** the client-side deterministic fallback
  `fallbackLocalMathTutor` (`src/ai/client.ts:269`) answers equations, percentages, explanations and
  arithmetic **with no model**, and the engine remains the mathematical authority. It is *narrower*
  than the model path (no free-form prose), which is exactly why retirement is blocked today.

### Acceptance tests that must exist and pass before model retirement can be considered

| # | Gate | Path | Status today |
|---|---|---|---|
| 1 | Packaged end-to-end gate (48 checks), incl. `[19-20]` local-model discovery + real GGUF generation (`meta.responseSource === 'local-model'`) | `tests/exeSmokeTest.ts` | **PARTIAL** — model checks `NOT VERIFIED` unless `CALCORA_SMOKE_LLAMA` is supplied |
| 2 | Runtime discovery, ID hashing, path-traversal rejection, timeout, absent-dir behaviour | `tests/localGgufRuntime.test.ts` | PASS |
| 3 | Local-models API contract + offline routing with `localModelId` | `tests/localModelApi.test.ts` | PASS |
| 4 | Offline Tutor forwards only the opaque model ID | `tests/privateTutorRouting.test.ts` | PASS |
| 5 | Capability registry enumerates every `requiresModel` entry and never marks deterministic math model-dependent | `tests/capabilityRegistry.test.ts` | PASS |
| 6 | Model-free benchmark (declared thresholds) | `src/evaluation/tutorBenchmark.ts` + `tests/runModelFreeBenchmark.ts` | **PARTIAL** — 87.5% (14/16); `follow-up-context` and `misconception-correction` below threshold |
| 7 | Full regression sweep | `scripts/run-test-sweep.mjs` | PASS (68/68 as of 2026-10-09) |

**Blocking conditions for retirement (all must be cleared):**

1. `local-model-generation` must either be **reimplemented without weights** (so the client fallback
   reaches parity on the tasks the model currently serves), or explicitly **removed from the accepted
   feature set** with the user's authorization.
2. Gate **#6** must meet its declared thresholds for **all** groups (currently `follow-up-context` and
   `misconception-correction` fail, both failing safe to `unknown`).
3. Gate **#1** must be run **with** `CALCORA_SMOKE_LLAMA` so the model path is actually exercised —
   today it skips as `NOT VERIFIED`.
4. A **model-absent regression run** must prove graceful degradation (app starts, Tutor answers via
   the deterministic fallback, no error surfaced) — this test does **not** exist yet and must be
   written **RED-first** before any deletion.
5. Explicit **user authorization** for the destructive step (Phase 13 rule), plus a verified
   recoverability path (LFS remote presence — currently **NOT VERIFIED** for the 4 unreferenced
   objects, and the referenced GGUF blobs *are* confirmed present on the remote).

**Conclusion — models:** **BLOCKED.** Deleting any model today removes the `local-model-generation`
capability, which is an accepted, packaged, load-bearing feature (8.3–12.9 s/turn measured).
No model was deleted or modified.

---

## 11.4 Outcome and options for a separate authorization decision

| Area | Status | Reclaim if authorized | Precondition |
|---|---|---|---|
| `.git/lfs` — 4 locally-unreachable objects | **BLOCKED / NOT VERIFIED** | ≤ 2,630.04 MB | prove remote recoverability, then authorize |
| `.git/lfs` — 7 referenced objects | **PROTECTED** | 0 | must not be touched |
| `DRPSu` (DriverPack Solution) | **REVIEW_REQUIRED** | 930.6 MB | user decision; not Calcora; no unique data |
| 4 primary GGUF models | **BLOCKED** | 6,146.0 MB | gates #1–#5 above + explicit authorization |
| Commit / push | **BLOCKED** | 0 | merge unresolved; not authorized |

**No destructive action was taken. Nothing was deleted, moved, or quarantined. The merge, index, and
all work are intact.** The evidence above is complete enough for a separate authorization decision;
further action requires the user's explicit instruction.