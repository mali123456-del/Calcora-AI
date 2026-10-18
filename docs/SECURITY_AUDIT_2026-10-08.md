# Calcora AI — Security Audit (Phase 8)

Date: 2026-10-08
Scope: the shipped desktop app (Electron shell + local server + renderer) and the
new code written in this cycle (platform policy, llama.cpp resolution, grounding
floor, symbolic differentiation, CSP).

## 1. Existing posture (verified, not assumed)

| Control | Where | Evidence |
|---|---|---|
| Strict JSON body parsing, 1 MB cap | `server.ts` `express.json({ limit: '1mb', strict: true })` | `apiSecurity` (malformed JSON → 400) |
| Per-route rate limits | `server.ts` 171-178 via `createRateLimitMiddleware` | `requestSecurity`, `apiSecurity` |
| Origin policy / CORS allowlist, untrusted origins refused with 403, no ACAO grant | `src/services/corsPolicy.ts` | `corsPolicy`, `apiSecurity` |
| `trust proxy` disabled so client IPs cannot be spoofed via `X-Forwarded-For` | `server.ts:165` | code review |
| `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `X-Frame-Options: DENY`, `Permissions-Policy` (camera off, microphone self, geolocation off) | `server.ts` 179-189 | `apiSecurity` |
| Operator tokens for intelligence scan and learning evaluation, fail-closed when unset | `src/services/requestSecurity.ts` | `requestSecurity`, `apiSecurity` |
| Renderer trust: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`; navigation restricted to the loopback renderer URL; `window.open` allowed only for `https:`/`mailto:` | `electron/main.ts` | `desktopRuntimeConfig`, code review |
| IPC handlers verify the sender frame *and* its URL before touching credentials | `electron/main.ts` `isTrustedSender` | `desktopRuntimeConfig`, code review |
| Secrets at rest use the OS credential store; Linux plaintext backend refused | `electron/platformPolicy.ts` `canUseOsCredentialStore` | `crossPlatformPolicy` |
| Local model execution: argv-only spawn (`shell: false`), no user text in a command, model path realpath-checked against the models directory, symlinks rejected | `src/services/localGgufRuntime.ts` | `localGgufRuntime`, `localModelApi` |
| No server path disclosure in the status API | `/api/ai/local-models` | `localModelApi` |
| The local network surface is loopback-only in the desktop shell | `electron/runtimeConfig.ts` (`CALCORA_DESKTOP=1` → 127.0.0.1) | `desktopRuntimeConfig` |

## 2. Findings in this cycle and what was done

### 2.1 No Content Security Policy (fixed)

The renderer and the API share one loopback origin, and several strings the app
did not author are rendered into that page: Tutor answers, extracted PDF text,
OCR transcripts and model-written markdown. With no CSP, any of those becoming
markup would also become script in an origin that can reach every local API route.

Fix: `src/services/contentSecurityPolicy.ts` + middleware in `server.ts`.

```
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';
img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self';
worker-src 'self' blob:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'
```

* `unsafe-inline` appears **only** for styles (React inline styles, KaTeX).
  Inline *scripts* stay blocked, and `unsafe-eval` is not granted.
* `worker-src 'self' blob:` is required by pdf.js, which creates its parser worker
  from a blob URL.
* `connect-src 'self'` is correct because the renderer only ever calls its own
  local API; there is no cloud origin to allow, which also means a compromised
  page cannot exfiltrate anything to a remote host.
* Applied in production only: the dev server runs the Vite middleware, which needs
  an inline HMR client and a websocket. `tests/requestSecurity` pins both branches.

### 2.2 llama.cpp binary resolution (reviewed)

The runtime now probes well-known directories per platform. Reviewed for the
attack surface:

* the configured path always wins and is validated, never searched-around;
* every candidate must be a **regular file** and, on POSIX, carry the executable
  bit — a symlink is rejected outright (`isRegularFile` checks
  `!info.isSymbolicLink()`), so a planted symlink cannot redirect the runtime;
* nothing about the probe changes how the command is built: argv only,
  `shell: false`, no interpolation;
* a rejected binary produces an honest platform-specific diagnostic instead of a
  spawn error, and the Tutor falls back to the deterministic path.

### 2.3 Grounding floor (reviewed)

The Phase 5 change makes retrieval refuse to cite an item below the relevance
floor. This *reduces* attack surface (no fabricated citation text reaches the
model context) and was pinned by tests so it cannot silently weaken.

### 2.4 Symbolic differentiation (reviewed)

New parser/printer code operating on untrusted learner input. Reviewed for
catastrophic input: recursion is bounded by expression depth, there is no
`eval`/`Function` construction, and unsupported forms are reported rather than
approximated. Every derivative is checked by central difference before it may be
labelled verified.

## 3. Accepted risks / not done

| Item | Status | Why |
|---|---|---|
| Windows binaries are unsigned | known, verified | `Get-AuthenticodeSignature` on the shipped `Calcora-AI-1.0.0-x64-setup.exe`, the portable build and `Calcora AI.exe` all report **`NotSigned`** with no signer certificate. electron-builder logs a "signing with signtool.exe" line for these artifacts, but that is its edit/verification step, not a code signature — no certificate is configured, so Windows SmartScreen may warn. macOS builds are likewise unsigned and un-notarized. Documented, not claimed away. |
| No auto-updater | known | updates are manual installs on every platform |
| 4 low-severity `katex` advisories | accepted | markdown-math rendering only; reachable fixes require breaking majors. The math trust boundary never uses KaTeX output. See `docs/TECH_EVALUATION_2026-10-08.md` §3. |
| `style-src 'unsafe-inline'` | accepted | required by React inline styles and KaTeX; script execution remains blocked |
| Answer content is rendered as markdown | existing | the CSP above is the mitigation; no raw HTML rendering was added |

## 4. Verification commands

```bash
npx tsc --noEmit
npx tsx tests/requestSecurity.test.ts
npx tsx tests/apiSecurity.test.ts
npx tsx tests/corsPolicy.test.ts
npx tsx tests/crossPlatformPolicy.test.ts
npx tsx tests/localGgufRuntime.test.ts
npx tsx tests/localModelApi.test.ts
npx tsx tests/desktopRuntimeConfig.test.ts
node scripts/run-test-sweep.mjs          # full sweep, must be 59/59
```
