# Calcora AI

Calcora AI is a deterministic-first scientific calculator and mathematics workbench. The local calculation engine is authoritative for numeric results; optional AI providers may explain or tutor but must not replace a verified engine result.

## Current capabilities

- Scientific calculator, equation/system solving, calculus tools, matrices, unit conversion, finance, probability, statistics, and 2D function plotting.
- Local Tutor with five progressive hint levels, check-work/mistake feedback, offline conversations, and deterministic verification for supported problems.
- Language catalog with honest local support levels: **FULL** is currently English and Urdu; some other languages are partial; remaining languages are detection-only. A registry entry does not guarantee complete tutoring quality.
- Local extraction and page-aware grounding for PDFs containing selectable text. Scanned/image-only PDFs are identified as requiring OCR; OCR is not currently performed.
- Voice input uses the browser Web Speech API when available. Locale is based on the chosen Tutor language or browser language; browser support and recognition quality vary. Each transcript is detected for language, sanitized for spoken math, and given an explicit verdict (`empty` / `non-math` / `ambiguous` / `ready`); only a `ready` transcript is forwarded to the Tutor, so a spoken word is never silently rewritten into a number.
- Image and handwriting recognition go through a real provider abstraction (`src/services/recognitionProviders.ts`). **No OCR/vision provider ships with Calcora**, so both report an honest unavailable state and transcribe nothing. When a provider is registered, its transcript is treated as a proposal: the deterministic engine re-solves it before any number is shown, low confidence is disclosed, and provider failure or blank output produces no text.
- Data Lab imports quoted CSV, TSV, and XLSX files, with size/row/column bounds, basic numeric validation, descriptive mean, and linear regression. XLSX currently reads only the first worksheet. The interface exports a JSON analysis.
- Electron desktop targets Windows NSIS and portable x64 packages; Gemini credentials can be saved using Electron secure storage when an OS credential backend is available.

## Requirements

- Node.js 22.12+ (Vite/Electron dependency requirements; use the Node 22 line in CI).
- npm.

## Setup and development

```powershell
npm install
npm run dev
```

The development Express/Vite server listens on `0.0.0.0:3000` by default. Set `CALCORA_HOST=127.0.0.1` if you want to restrict a local development server to loopback. `CALCORA_PORT` can override the port.

Type-check, tests, and production bundling:

```powershell
npm run lint
npm run verify
```

`npm run verify` includes the repository-native unit, regression, Tutor, PDF, security, Data Lab, and desktop-runtime checks, then emits `dist/server.cjs`, `dist-electron/main.cjs`, `dist-electron/preload.cjs`, and the Vite renderer in `dist/`.

### Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `GEMINI_API_KEY` | — | Optional cloud AI credential. Server-side only; never use a `VITE_` prefix. |
| `CALCORA_ALLOW_PUBLIC_GEMINI` | `false` | Allows cloud Gemini calls on a hosted deployment. Desktop/local builds ignore this. |
| `CALCORA_ALLOWED_ORIGINS` | — | Comma-separated exact origins allowed to call the API. Loopback is always allowed; `*` is rejected. |
| `CALCORA_INTELLIGENCE_SCAN_TOKEN` | — | Operator token for `POST /api/ai/intelligence/scan` (`x-calcora-intelligence-token`). |
| `CALCORA_LEARNING_EVALUATION_TOKEN` | — | Operator token for `POST /api/ai/learning/evaluate` (`x-calcora-learning-token`). |
| `CALCORA_HOST` / `CALCORA_PORT` | `0.0.0.0` / `3000` | Server bind address. Desktop forces `127.0.0.1` and an ephemeral port. |
| `CALCORA_ENABLE_INTELLIGENCE_SYNC` | `false` | Enables the daily public-metadata sync scheduler. |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | — | Optional live knowledge retrieval. Never expose the service-role key to a client bundle. |

See `.env.example` for the annotated list.

### Optional verification runs

`npm run verify` is self-contained and needs no browser. Two further checks are available when the environment supports them:

```powershell
npx tsx tests/browserVerification.ts   # real Chrome via playwright-core, against a running `npm run dev`
npx tsx tests/liveVerification.ts      # end-to-end HTTP against a running server
```

The browser run needs the dev server on `http://localhost:3000` and Chrome installed. It drives the real UI (Tutor, PDF grounding, themes, calculator) and fails on any unexpected console error, HTTP error, or outbound network request.

## Privacy, AI providers, and credentials

- Tutor **Local only** is the default and must not call Gemini or cloud Tutor persistence. PDF questions remain local even when cloud consent is selected.
- Cloud AI is optional and requires explicit user consent in Tutor. On hosted deployments, requests to Gemini are disabled unless `CALCORA_ALLOW_PUBLIC_GEMINI=true` is deliberately configured. Set `GEMINI_API_KEY` only in the server environment; never use a `VITE_` prefix for secrets.
- In the desktop app, open the Tutor's **Desktop Gemini settings** and enter a key. The main process encrypts it through Electron `safeStorage` and keeps the credential file under the current user's Calcora data directory. If Electron reports secure storage unavailable (including Linux `basic_text` storage), the app refuses to save it. Desktop keys are not embedded in the package.
- Optional local GGUF Tutor explanations use a server-side `llama.cpp` CLI adapter. The adapter discovers `.gguf` files under `models/` (or `CALCORA_MODELS_DIR`), classifies `coder` filenames as the coding role, and returns opaque model IDs to the Tutor UI. No inference runtime is bundled or downloaded. With no configured CLI, the selected model fails gracefully to the deterministic local Tutor; there is no cloud fallback in Local only mode. See [Local GGUF runtime](#optional-local-gguf-runtime).
- Set `CALCORA_ENABLE_INTELLIGENCE_SYNC=true` only when daily public metadata sync is desired. Manual `/api/ai/intelligence/scan` requires `CALCORA_INTELLIGENCE_SCAN_TOKEN` and the `x-calcora-intelligence-token` header. `/api/ai/learning/evaluate` requires `CALCORA_LEARNING_EVALUATION_TOKEN` and the `x-calcora-learning-token` header. These are server/operator controls, not browser configuration values.
- The math, Tutor, and status API routes use bounded request sizes and in-memory per-process rate limits.
- **Cross-origin policy**: the API refuses any request whose `Origin` is not loopback (`localhost` / `127.0.0.0/8` / `[::1]`) or explicitly allowed, returning `403` *before* any handler runs. Without this, any third-party page could make the server perform work and spend Gemini quota on the user's behalf — the request is sent even when the response cannot be read. Set `CALCORA_ALLOWED_ORIGINS` to a comma-separated list of exact origins (for example `https://calcora.app`). A wildcard (`*`) is rejected deliberately. The desktop app ignores this list because it only ever serves its own loopback renderer.
- For public/multi-instance deployments, add an identity-aware shared rate limiter, TLS termination, user authentication/authorization, monitoring, and provider spend limits. The in-memory limiter is not a distributed abuse-control system.

## AI, knowledge and adaptive Tutor architecture

```
goal / prompt
  ├─ intent + concept detection (deterministic, local)
  ├─ knowledge retrieval  → MathKnowledgeItem corpus (28 curated items, graded
  │                         beginner→expert, with prerequisites, common mistakes,
  │                         worked examples and alternative methods)
  ├─ deterministic tool execution (allowlisted: calculate, solveEquation)
  ├─ INDEPENDENT re-verification  → PASS / FAIL / UNKNOWN
  └─ explanation + targeted practice + learning-state update
```

- **Verification is a second code path, not a restatement.** For equations the Agent
  substitutes each reported root back into the original expression and checks the residual;
  for calculations it recomputes independently. A mismatch is reported as `FAIL` and the
  Agent does not pick a winner. `UNKNOWN` means genuinely not checkable and is never
  upgraded to `PASS`.
- **The Agent is bounded.** `MAX_AGENT_STEPS = 8`, a 5 s wall-clock budget, a closed
  two-tool allowlist, and no recursion path. Adversarial input cannot exceed the ceiling.
- **The student model is derived from observable events only**
  (`src/services/studentModel.ts`). It records counts and ratios — never a psychological
  state, emotion, or permanent ability. Mastery is damped by sample size
  (`min(1, attempts/4)`), so two correct answers read as `developing`, not `mastered`.
  Every signal carries the evidence that produced it. With no history, accuracy is `null`,
  not `0`.
- **Practice is corpus-grounded.** `src/services/practiceGenerator.ts` draws from real
  worked examples, labelling each item `knowledge-corpus` or `generated`. A concept with no
  data yields no invented exercise. `verifyPracticeAnswer` returns `checked: false` rather
  than fabricating a verification when it cannot genuinely check.

Local endpoints (no cloud, safe in Private/Offline mode):

| Endpoint | Purpose |
| --- | --- |
| `POST /api/ai/math-agent` | Bounded plan → deterministic execute → independent verify |
| `POST /api/ai/learning/plan` | Student analysis + targeted practice + quiz |

## Optional local GGUF runtime

Local GGUF inference is an optional explanation layer; it never computes or verifies Calcora results. Install/build a compatible `llama.cpp` `llama-cli` separately, keep models outside the application package, and configure the server environment:

```powershell
$env:CALCORA_LLAMA_CLI_PATH = 'C:\tools\llama.cpp\llama-cli.exe'
$env:CALCORA_MODELS_DIR = 'C:\My projects\Calcora-AI-production\models'
npm run dev
```

On desktop builds, set these variables in the environment used to launch Calcora. `CALCORA_MODELS_DIR` defaults to `<app root>/models`, but large GGUF files are intentionally not bundled. `CALCORA_LLAMA_CONTEXT_SIZE` defaults to 2048 tokens (bounded to 512–8192), `CALCORA_LLAMA_THREADS` defaults to at most four logical CPU threads with one core left for the app when possible, and `CALCORA_LOCAL_MODEL_TIMEOUT_MS` defaults to 120 seconds (bounded to 1–180 seconds). The subprocess uses `shell: false`, the model's embedded chat template, a one-turn prompt, a 320-token generation cap, and bounded output. Only one local inference is allowed at a time.

The API reports `runtime: none` when no CLI is configured or the path is missing, while still reporting discovered GGUF metadata. A configured executable's presence is not proof that it is a compatible build or that it can load a particular model; actual inference and per-model performance require an explicit runtime smoke test. Inference output is labelled unverified explanatory text; any deterministic value and verification badge continue to come from Calcora's existing engines. Model-generated facts are not automatically stored as verified knowledge.

The existing `src/ai/ollamaClient.ts` is not used for GGUF inference. Calcora does not require or install Ollama.

## Notebook workspace

A persistent workspace for a learner's own work: problems, calculations, steps,
explanations, Tutor exchanges, notes, references and practice
(`src/services/notebook.ts`, `src/components/NotebookPanel.tsx`).

- Every entry is checked by the deterministic engine on creation and its
  `PASS | FAIL | UNKNOWN` status is displayed verbatim. An unverified entry is explicitly
  labelled "Not verified" and is never rendered as `PASS`.
- Notebook state is isolated from calculator state, uses its own storage key, and validates
  everything on read: corrupt or hand-edited storage degrades to an empty list.
- Overlong entry text is **rejected, not truncated** — silently cutting a mathematical
  expression can change its meaning.

## Electron development and Windows packaging

```powershell
npm run electron
npm run dist:win
```

The Windows build writes artifacts to `release/`:

- `Calcora-AI-<version>-x64-setup.exe` — NSIS installer
- `Calcora-AI-<version>-x64-portable.exe` — portable executable
- `*.blockmap` and `latest.yml` may be emitted by Electron Builder

The bundled main process starts the CJS backend and waits for `/api/health`. If startup fails, Electron displays Retry / Open logs folder / Quit and writes a startup diagnostic under Electron's user data `logs/` directory. Packaging does not by itself prove runtime behavior; launch the packaged build on a supported Windows desktop before release.

> **Launching the packaged app from a script or CI shell.** If the environment variable `ELECTRON_RUN_AS_NODE` is set to a truthy value, the packaged `.exe` starts as a plain Node process instead of the Electron app: it exits immediately with status 0 and prints nothing, and any Electron CLI flag (for example `--enable-logging`) fails with `bad option`. This looks exactly like a broken build but is an environment artifact. Clear the variable before launching:

```powershell
$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = "release\win-unpacked\Calcora AI.exe"
$psi.UseShellExecute = $false
$psi.EnvironmentVariables.Remove("ELECTRON_RUN_AS_NODE")
[System.Diagnostics.Process]::Start($psi)
```

## Known limitations / not implemented

- Image OCR/vision and handwriting recognition have a provider seam but **no provider is configured**, so both report an honest unavailable state; images and ink are neither transcribed nor uploaded. This is a capability limit, not a stub that returns a guess.
- Scanned PDF OCR is unavailable.
- Data Lab has no charting, Python notebook, or full spreadsheet multi-sheet workflow; XLSX imports only its first worksheet.
- Graphing is 2D `y=f(x)` plotting. Parametric, polar, implicit, surface/3D plotting are not implemented.
- Geometry knowledge/formulas exist, but there is no dedicated interactive geometry construction workspace.
- The student model tracks observable attempt outcomes and hint usage only. It does not yet select the hint level from those signals (the hint ladder is still fixed), which is the main divergence from misconception-tailored tutoring (see `docs/COMPETITOR_GAP_ANALYSIS.md`).
- Full local language Tutor prose is only classified for English and Urdu; cloud quality in other languages is provider-dependent and not native-speaker-certified.
- Live Supabase vector retrieval, embedding deployment, and production RAG relevance have not been verified by this local repository check.
- No browser-native speech API is guaranteed; dictation may be unavailable by browser, permission, or locale.

## Troubleshooting

- If a PDF reports no selectable text, it is likely scanned; the app currently cannot OCR it.
- If voice input is unavailable, check the browser's Web Speech support and microphone permission, or type the prompt.
- If Gemini is unavailable, verify the optional key, network access, project permissions, quota, and whether the selected Tutor mode is Local only. No cloud fallback should occur from Local only.
- If the Windows installer cannot find artifacts, check `release/` (not Vite's `dist/`).
- For desktop startup diagnostics, use the Retry / Open logs folder dialog or inspect `<Electron userData>/logs/startup.log`.

## Security notes

`npm audit` covers known dependency advisories only; it is not a security certification. Review application-level controls before deployment. Do not expose operator tokens, Supabase service-role credentials, or Gemini keys in client bundles or public environment variables. The packaged desktop app is not code-signed by this repository's build configuration; configure signing/notarization in release infrastructure when distributing broadly.
