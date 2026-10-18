# Calcora AI — Technology Evaluation (Phase 7)

Date: 2026-10-08
Rule: adopt only *material* wins, and only after `npm audit`, typecheck, the full
regression sweep, a production build and a packaged-EXE smoke test all pass.
Rejected candidates are recorded with their reason rather than silently dropped.

## 0. Blocking defect found first

`package.json` declared `"@Supabase/supabase-js"` (capital letters) while
`package-lock.json` used the correct lowercase `@supabase/supabase-js`. npm
rejects capital letters in scoped names, so **every** `npm install` / `npm update`
failed with `E404 … package name is not valid`. Dependency maintenance — and
therefore any security update — was impossible.

Fix: correct the key in `package.json` to `@supabase/supabase-js` (matches the
lockfile and the import specifiers). Verified by `npm install` → exit 0.

## 1. Adopted (patch/minor, all inside existing semver ranges)

| Package | Before | After | Why it is material | Verified by |
|---|---|---|---|---|
| source-map-js (transitive) | 1.0.0 (high-severity advisory GHSA-68fv-2mgg-jv7q: event-loop DoS via indexed source-map offsets) | 1.2.2 | removes the only high-severity production-tree finding; `node_modules` is packaged, so it ships | `npm audit --production` now reports 4 low, 0 high |
| katex | 0.18.9 | 0.18.10 | latest 0.18 patch; clears the transitive katex findings reachable from the 0.18 line | audit + PDF/markdown tests |
| electron | 44.5.1 | 44.7.0 | Chromium security patches in the runtime that actually ships the UI | packaged-EXE smoke test (launch, UI, restart) |
| vite | 8.3.1 | 8.3.4 | dev/build server patches used by the production build | `npm run build` + browser verification |
| @vitejs/plugin-react | 6.1.1 | 6.1.2 | plugin patch used by the production build | build + browser verification |
| pdfjs-dist | 6.3.289 | 6.4.299 | PDF parsing fixes on the document-RAG path | `pdfExtraction`, `pdfTutorIntegration`, document-grounded browser check |
| @google/genai | 2.24.0 | 2.28.0 | optional cloud SDK patches (Gemini stays unconfigured/off by default) | `geminiAvailability`, `geminiRuntime`, `geminiStatus` |
| @napi-rs/canvas | 1.0.9 | 1.0.10 | produces the shipped ICO/ICNS/PNG icon set | `npm run icons` output + icon inspection |
| @types/node | 22.20.4 | 22.20.5 | type patch | `npx tsc --noEmit` |
| playwright-core | 1.63.0 | 1.64.0 | dev-only test driver used by browser/EXE verification | browser + EXE smoke |
| @supabase/supabase-js | 2.117.2 | 2.117.3 | RAG client patch (optional feature, unset by default) | tsc + knowledge suites |

Install-script note: npm 11's allow-scripts gate skipped Electron's postinstall,
leaving `node_modules/electron/dist` empty. The binary was restored by running
Electron's own installer (`node node_modules/electron/install.js`), verified by the
presence of a 234.9 MB `electron.exe`.

## 2. Rejected (no material win or breaking-change risk)

| Candidate | Current | Latest | Why rejected |
|---|---|---|---|
| express | 4.22.3 | 5.2.1 | major; every route, middleware and error path would need revalidation for no product gain |
| dotenv | 17.4.2 | 18.0.6 | major; env injection already behaves correctly (0 vars in `.env`) |
| lucide-react | 0.546.0 | 1.53.0 | major; icon set churn across every component, purely cosmetic |
| motion | 12.43.0 | 14.0.0 | major; animation library churn with no UX requirement attached |
| katex | 0.18.10 | 0.19.0 | major, and it would drag `rehype-katex`/`remark-math` majors; see accepted risk below |
| @types/express | 4.17.25 | 5.0.6 | types major tied to the rejected express 5 migration |
| @types/node | 22.20.5 | 26.x | types major; the project targets Node 22 APIs |

## 3. Accepted risk (documented, not hidden)

Four low-severity advisories remain, all in the markdown-math rendering chain
(`remark-math` → `micromark-extension-math` → `katex`, and `rehype-katex` →
`katex`). They are only reachable when a model/answer string is rendered as
markdown math in the UI. Clearing them requires the katex 0.19 major plus
matching `rehype-katex`/`remark-math` majors — rejected under the rule above.

This chain is **not** part of the mathematical trust boundary: every number that
Calcora presents is produced by the deterministic engine and re-derived by the
independent verifier, never by KaTeX. The risk is limited to presentation of
already-verified text.

## 4. Evaluation of larger technology options

| Option | Decision | Reason |
|---|---|---|
| Bundling llama.cpp binaries inside the installer | **Rejected** | would multiply installer size by hundreds of MB, complicate signing/notarization on macOS, and break on every host architecture; the per-platform resolution adapter (`CALCORA_LLAMA_CLI_PATH` + well-known locations) covers Windows, macOS and Linux with one code path |
| Persistent `llama-server` process instead of spawn-per-request | **Deferred, not rejected** | materially better latency for multi-turn chat, but it introduces a long-lived child process, port allocation and shutdown semantics that need their own lifecycle tests; recorded as the next performance phase, not smuggled into this release |
| Adding a cloud LLM dependency | **Rejected** | the product guarantee is a local, deterministic, verifiable Tutor; cloud stays an explicit, opt-in consent path |
| Platform-specific UI forks | **Rejected** | shared identity is a product feature; only behaviour that genuinely differs is platform-specific (see `docs/CROSS_PLATFORM_RUNTIME.md` §3) |
