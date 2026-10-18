# Calcora AI — Cross-Platform Runtime (Windows / macOS / Linux)

Status: living document. Every status below is backed by a command that was
actually run on the machine that produced it. Anything not exercised is written
as `NOT VERIFIED`, never as "works".

## 1. Design principle

**Shared product identity + shared core functionality + platform-native behavior
where beneficial.** The UI is deliberately *not* forked per platform: the same
calculator, Tutor, verification, knowledge and agent surfaces ship everywhere.
Platform differences are concentrated in two small, pure, unit-tested policy
modules instead of scattered `process.platform` checks.

```
Calcora Core (platform-independent)
├── Math Engine + symbolic differentiation        src/engine/*
├── Math Agent                                    src/services/mathAgent.ts
├── Tutor Orchestrator (live offline path)        src/services/tutorOrchestrator.ts
├── Tutor pre-computation (cloud branch)           src/ai/tutorOrchestrator.ts
├── Knowledge / RAG                               src/knowledge/*
├── Verification contract                         src/verification/*
├── Conversation + multilingual logic             src/services/*
└── Model Runtime Abstraction (GGUF + CLI)         src/services/localGgufRuntime.ts
        │
        ├── Desktop policy adapter                 electron/platformPolicy.ts
        ├── Runtime resolution adapter             src/services/localRuntimePlatform.ts
        └── Packaged desktop shell                 electron/main.ts
```

## 2. What stays platform-independent

| Area | Why it is shared | Evidence |
|---|---|---|
| Deterministic math engine, symbolic differentiation | Same answers must be produced on every OS; it is the verification authority | `tests/mathEngineRegression`, `tests/mathRegression100`, `tests/symbolicDerivative` |
| Math Agent (bounded tool use, spot-check verification) | Tool allow-list and verification states are one contract | `tests/mathAgent`, `tests/adaptiveTutorIntegration` |
| Tutor orchestrator + verification outcome | Four-state contract (`VERIFIED/FAILED/UNVERIFIED/UNAVAILABLE`) is identical | `tests/verificationStates`, `tests/liveTutorVerification` |
| Knowledge / RAG grounding | Same corpus, same grounding floor, same honesty rules | `tests/knowledgeRetrievalQuality`, `tests/knowledgeVerification` |
| Multilingual detection, support levels, templates | Detection and localization data are platform-neutral | `tests/multilingualVerification11`, `tests/languageCoverage` |
| Security boundaries (IPC trust, credential vault, path safety) | Same rules; only the OS keychain differs | `tests/apiSecurity`, `tests/desktopRuntimeConfig`, `tests/corsPolicy` |
| Model abstraction (GGUF discovery, bounded generation) | Same manifest/IDs (`gguf-<16 hex>`), same spawn contract | `tests/localGgufRuntime`, `tests/localModelApi` |

## 3. Platform adapter layer

### `electron/platformPolicy.ts` (pure, tested by `tests/crossPlatformPolicy.test.ts`)

| Decision | Windows | macOS | Linux |
|---|---|---|---|
| Quit when last window closes | yes | **no** (app stays alive) | yes |
| Re-create window on dock/taskbar activation | n/a | **yes** (`activate` handler) | n/a |
| Startup-failure dialog buttons | Retry / Open logs / Quit | + macOS **Cancel** (index 3 quits) | Retry / Open logs / Quit |
| Credential store allowed | DPAPI (`safeStorage`) | Keychain | only libsecret/kwallet; plaintext `basic_text` and `unknown` are refused |

### `src/services/localRuntimePlatform.ts` (pure + injectable FS probes)

| Decision | Windows | macOS | Linux |
|---|---|---|---|
| llama.cpp CLI names | `llama-completion.exe`, `llama-cli.exe` | `llama-completion`, `llama-cli` | `llama-completion`, `llama-cli` |
| Well-known locations | `%USERPROFILE%\calcora-tools\llama.cpp`, `%LOCALAPPDATA%\calcora-tools\llama.cpp`, `%ProgramFiles%\llama.cpp\bin` | `/opt/homebrew/bin`, `/usr/local/bin`, `~/.local/bin`, `~/calcora-tools/llama.cpp`, `~/llama.cpp/build/bin` | `/usr/local/bin`, `/usr/bin`, `~/.local/bin`, `~/calcora-tools/llama.cpp`, `~/llama.cpp/build/bin` |
| Acceptance test | file exists | file exists **and** executable bit | file exists **and** executable bit |
| Setup message when missing | names the `.exe` and `CALCORA_LLAMA_CLI_PATH` | adds Gatekeeper/quarantine (`xattr -d com.apple.quarantine …`) | adds `chmod +x` |
| Spawn working directory | CLI's own directory (DLL-backed shim resolves `llama.dll`) | same | same |

`CALCORA_LLAMA_CLI_PATH` always wins; `CALCORA_LLAMA_DIR` is honoured as an extra
well-known directory. Models are discovered independently of the runtime, and a
missing runtime degrades to the deterministic Tutor rather than failing.

### `electron/main.ts` (shared shell, one lock for all platforms)

* single-instance lock — a second launch focuses the existing window instead of
  starting a colliding backend (Windows double-click, macOS dock reopen, Linux
  desktop re-activation all take this path);
* renderer URL trust (`isTrustedCalcoraRendererUrl`), `contextIsolation: true`,
  `nodeIntegration: false`, `sandbox: true` — identical security posture;
* external links opened only for `https:`/`mailto:`;
* logs and credentials live under `app.getPath('userData')`, which is
  `%APPDATA%` on Windows, `~/Library/Application Support` on macOS and
  `$XDG_CONFIG_HOME`/`~/.config` on Linux.

## 4. Packaging configuration (shared, per-platform targets)

| Platform | Targets | Icon | Artifact name | Notes |
|---|---|---|---|---|
| Windows | NSIS installer + portable `.exe` | `build/icons/calcora-icon.ico` (16–256) | `Calcora-AI-<version>-x64[-setup|-portable].exe` | installer allows install-dir choice, desktop + start-menu shortcuts |
| macOS | `dmg` + `zip` | `build/icons/calcora-icon.icns` (16–1024) | `Calcora-AI-<version>-<arch>.dmg/.zip` | unsigned: no identity is configured (see limitations) |
| Linux | `AppImage` + `deb` | `build/icons/*.png` + electron-builder desktop entry | `Calcora-AI-<version>-<arch>.AppImage/.deb` | category `Education`, maintainer set |

`build.files` ships `dist`, `dist-electron`, `package.json` and `node_modules`
only: **the `models/` folder is never packaged** (6 GB of GGUF stays in the
working tree), and the app icon is copied to `resources/icons/calcora-icon.png`
for the browser window.

Commands:

```bash
npm run build            # vite + server.cjs + main.cjs + preload.cjs (all platforms)
npm run icons            # PNG set + ICO + ICNS from electron/assets/calcora-icon.svg
npm run dist:win         # NSIS + portable
npm run dist:mac         # dmg + zip
npm run dist:linux       # AppImage + deb
```

## 5. Verification matrix (honest, per platform)

`PASS` = executed and observed. `PARTIAL` = works with a documented caveat.
`NOT VERIFIED` = not exercised in this environment. `BLOCKED` = cannot be
exercised here at all (no OS/build environment).

Verified on this machine: **Windows 11 x64, Node 24, Electron 44.7.0**. macOS and
Linux have no build host here, so their rows can only be *NOT VERIFIED*; the
packaging probe (`scripts/probe-cross-platform-packaging.ps1`) records what this
host can and cannot produce rather than assuming.

| Area | Windows 10/11 x64 | macOS (Intel / Apple Silicon) | Linux |
|---|---|---|---|
| BUILD | PASS — `npm run build` exit 0 (renderer 297 KB shell, `server.cjs` 517 KB, `main.cjs` 12 KB, `preload.cjs` 1.2 KB) | NOT VERIFIED — no macOS host | NOT VERIFIED — no Linux host |
| PACKAGE | PASS — electron-builder 26.15.3 produced `Calcora-AI-1.0.0-x64-setup.exe` (147 MB), `-portable.exe` (147 MB) and `win-unpacked\Calcora AI.exe` (235 MB); exit 0. Built with `--config.directories.output` outside the repo (see §6). | NOT VERIFIED — targets configured (dmg, zip), untested here | NOT VERIFIED — targets configured (AppImage, deb), untested here |
| LAUNCH | PASS — `Calcora AI.exe` starts and stays running; the backend binds an ephemeral **loopback** port and `/api/health` returns 200; the packaged production server sends the full CSP | NOT VERIFIED | NOT VERIFIED |
| CALCULATOR | PASS — deterministic engine suite + real-browser UI check (7 × 8 = 56) | NOT VERIFIED | NOT VERIFIED |
| MATH ENGINE | PASS — 59/59 suites incl. the 100-case regression; angle-mode, precedence and symbolic differentiation all covered | NOT VERIFIED (platform-independent) | NOT VERIFIED (platform-independent) |
| MATH AGENT | PASS — **packaged app**: `d/dx(x^2)` → `2x`, `verification.status = PASS`, `method = spot-check`, headline renders `d/dx(x^2) = 2x` | NOT VERIFIED | NOT VERIFIED |
| TUTOR | PASS — **packaged app**: unsupported `abs(x)` returns "No derivative function is claimed" with state `UNAVAILABLE`; an **Urdu** request `x^2 کا مشتق کیا ہے؟` is *computed* and reported VERIFIED as `d/dx(x^2) = 2x`; offline and grounding paths verified against the packaged backend | NOT VERIFIED | NOT VERIFIED |
| LOCAL AI | PASS (packaged) - llama.cpp resolved via the new well-known-location resolver, 4 GGUF models listed, and a selected model produces real generation (`source = local-model`); a 1.5B turn costs 35-120 s on this CPU. With no resolvable runtime the app reports `runtime: none` and falls back to the deterministic Tutor rather than pretending | BLOCKED - needs a macOS llama.cpp build (`brew install llama.cpp`) plus Gatekeeper approval of an unsigned binary | BLOCKED - needs a Linux llama.cpp build + `chmod +x` |
| OFFLINE MODE | PASS - packaged app honours `offlineOnly`; every Tutor/agent suite runs offline; the UI defaults to Local only | NOT VERIFIED | NOT VERIFIED |
| KNOWLEDGE/RAG | PASS - retrieval relevance floor, corpus verification, grounding honesty; an unanswerable query produces no citation | NOT VERIFIED (platform-independent code) | NOT VERIFIED (platform-independent code) |
| ICON | PASS — ICO (7 sizes: 16/24/32/48/64/128/256), PNG 16→1024, packaged window icon **byte-identical** to the generated icon (17,880 bytes, verified in the packaged app); macOS `.icns` chunks icp4…ic10 present | PARTIAL — `.icns` generated and structurally validated (magic, declared length, all 7 chunk types); **not** verified in Finder/dock | PARTIAL — PNG set + electron-builder desktop entry configured; **not** verified on a desktop |
| UI | PARTIAL — packaged window renders the app (558 chars) and its backend serves every product path; driving the packaged UI over CDP timed out, so DOM-level interaction in the *packaged* window is **NOT VERIFIED**. The same flows are verified in real Chrome against the dev server (Command Hub boot, Urdu Tutor answer, UNVERIFIED/VERIFIED badge states, theme switching, zero cloud LLM requests) | NOT VERIFIED | NOT VERIFIED |
| FILESYSTEM | PASS (packaged) - user-data directory created under `%APPDATA%\Calcora AI`; model and llama paths resolved without leaking server paths through the API | NOT VERIFIED | NOT VERIFIED (XDG paths untested) |
| PERFORMANCE | PASS — retrieval hot path 849 → 92.7 µs/query (9.2×); bundle split measured | NOT VERIFIED | NOT VERIFIED |
| SECURITY | PASS - CSP live in the packaged app, nosniff/referrer/frame/permissions headers, per-route rate limits, IPC sender verification, fail-closed credential policy; binaries verified unsigned | NOT VERIFIED | PARTIAL - Linux plaintext credential backends refused (unit-tested), end-to-end untested |

**macOS signing/notarization: NOT DONE and NOT CLAIMED.** No signing identity is
configured; the `.app`/`.dmg` would be unsigned and un-notarized, and Gatekeeper
would require user approval.

**Existing CI (`cross-platform.yml`) verifies `npm run verify` + packaging on
ubuntu/windows/macos runners, but it never launches the packaged app.** On
Windows this cycle proved why that matters: packaging succeeded (exit 0) while
two separate launch-time faults only appeared when the app was actually started —
the backend port the desktop shell chooses, and a build directory that vanished
between runs. Adding a packaged launch+smoke step to that workflow is the
recommended next change; `tests/exeSmokeTest.ts` is written to drop straight in.

## 6. Building in a watched workspace (Windows finding)

`electron-builder` failed twice here with
`EPERM … rename '…\win-unpacked.tmp' -> '…\win-unpacked'` when its output
directory was **inside the repository**. The staging directory could be created,
written, renamed-file-inside and deleted, but the top-level rename stayed denied
for over 20 s. The identical build succeeded once the output directory was moved
outside the workspace, so this is environment interference (a directory handle held
by a workspace watcher), not an application defect.

```bash
# verified working on this machine
npx electron-builder --win nsis portable --publish never \
  --config.directories.output=%USERPROFILE%\calcora-build
```

`tests/exeSmokeTest.ts` defaults to that same location for the same reason, and
accepts `CALCORA_SMOKE_RELEASE_DIR` to point elsewhere. The committed
configuration still targets `release/`, which is what CI uses on native runners.

**Packaging environment notes (Windows, this machine):**

* A first build takes ~8 minutes; most of it is `7za` compressing the NSIS
  payload. The `.tmp` → final rename failing is the failure mode above, not a
  slow build.
* Building into `%TEMP%` is unsafe for verification: Windows temp cleanup removed
  a completed 530 MB package directory between runs. Build to a stable path.
* Binaries are **unsigned** (`Get-AuthenticodeSignature` → `NotSigned` for the
  installer, the portable build and `Calcora AI.exe`). electron-builder prints
  "signing with signtool.exe" during the build, but that is its metadata step; no
  certificate is configured.

## 7. How to verify macOS and Linux (nothing here is theoretical)

The rows for macOS and Linux are `NOT VERIFIED` because this release was built
and tested on Windows only. To turn them into real results, run the same two
commands on each platform — nothing about the probes is Windows-specific:

```bash
# 1. Confirm the app builds there
npm run build

# 2. Package it, and record exactly what the host can produce
pwsh scripts/probe-cross-platform-packaging.ps1 -IncludeLinux   # Linux host
pwsh scripts/probe-cross-platform-packaging.ps1 -IncludeMac     # macOS host

# 3. Then exercise the packaged product itself, which is the part that matters
npx tsx tests/exeSmokeTest.ts        # CALCORA_SMOKE_LLAMA must point at that
                                     # platform's llama.cpp build
```

The smoke test is already platform-aware: it resolves the user-data directory per
platform (`%APPDATA%\Calcora AI`, `~/Library/Application Support/Calcora AI`,
`$XDG_CONFIG_HOME/Calcora AI`), reads the llama.cpp CLI from the platform's own
well-known locations, and expects the platform's icon format. On macOS, add a
Gatekeeper step before running it (see §3), because an unsigned app will not
launch until the user approves it.

What would still remain unproven even on those hosts: notarization (no signing
identity is configured anywhere), Apple-Silicon vs Intel runtime behaviour of
llama.cpp, and Wayland-specific window behaviour.

## 8. Known limitations (stated, not hidden)

* **No code signing or notarization is configured.** Windows builds are
  unsigned, and the macOS `.app`/`.dmg` are not signed or notarized. Calcora AI
  is *not* distributed as a signed/notarized product, and macOS users must
  approve the app (right-click → Open, or the quarantine removal shown in §3)
  while Gatekeeper has no signing identity to trust.
* **No auto-updater.** `electron-updater` is not wired up; updates are manual
  installs on every platform.
* **macOS architecture strategy.** electron-builder builds for the host
  architecture by default; universal binaries are not produced. Intel and Apple
  Silicon builds must be produced separately and are reported separately.
* **Wayland window icons.** Under Wayland the compositor draws the app icon from
  the desktop entry, not from `BrowserWindow.icon`; X11 uses the packaged PNG.
* **Linux secret service.** On desktops without libsecret/kwallet, Calcora
  refuses to store a Gemini key rather than falling back to plaintext.
* **llama.cpp is a separate install on every platform.** Calcora ships no
  bundled inference binary; each platform follows §3 to install or point at one.
