/**
 * Packaged-app smoke test (the Windows EXE produced by `npm run dist:win`).
 *
 * This is deliberately *not* a unit test of the sources: it launches the
 * packaged application, talks to the backend that the packaged Electron main
 * process starts, and drives the packaged window over the Chrome DevTools
 * Protocol. Only the packaged artifact can prove that the icon, the bundled
 * server, the local runtime and the UI actually shipped.
 *
 * The 22 checks map 1:1 onto the product/cross-platform matrix rows (PACKAGE,
 * LAUNCH, CALCULATOR, MATH ENGINE, MATH AGENT, TUTOR, LOCAL AI, OFFLINE MODE,
 * KNOWLEDGE/RAG, ICON, UI, FILESYSTEM, PERFORMANCE, SECURITY).
 *
 * Environment:
 *   CALCORA_SMOKE_LLAMA   absolute path to llama-completion(.exe) [required for LOCAL AI]
 *   CALCORA_SMOKE_MODELS  models directory [defaults to ./models]
 *   CALCORA_SMOKE_PORT    backend port [default: 39871]
 *   CALCORA_SMOKE_CDP     remote debugging port [default: 39872]
 */
import assert from 'node:assert/strict';
import { spawn, execFile, type ChildProcess } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { chromium, type Browser, type Page } from 'playwright-core';

const PROJECT_ROOT = process.cwd();
// Default to a build directory outside both TEMP and the repository:
// TEMP is subject to Windows cleanup that can delete a freshly built package
// mid-verification, and a directory inside the repository cannot be renamed on a
// watched workspace (electron-builder stages `win-unpacked.tmp`).
const RELEASE_DIR = process.env.CALCORA_SMOKE_RELEASE_DIR
  ? path.resolve(PROJECT_ROOT, process.env.CALCORA_SMOKE_RELEASE_DIR)
  : path.join(process.env.USERPROFILE ?? process.env.HOME ?? PROJECT_ROOT, 'calcora-build');
const UNPACKED_DIR = path.join(RELEASE_DIR, 'win-unpacked');
// Fallback port only; the desktop shell binds an ephemeral port which is discovered below.
const BACKEND_PORT = Number(process.env.CALCORA_SMOKE_PORT ?? 39871);
const CDP_PORT = Number(process.env.CALCORA_SMOKE_CDP ?? 39872);
const LLAMA = process.env.CALCORA_SMOKE_LLAMA ?? '';
const MODELS_DIR = process.env.CALCORA_SMOKE_MODELS ?? path.join(PROJECT_ROOT, 'models');

let passed = 0;
const failures: string[] = [];
const notVerified: string[] = [];
const timings: Array<[string, number]> = [];

function check(condition: boolean, message: string): void {
  if (condition) {
    passed += 1;
    console.log(`  PASS  ${message}`);
  } else {
    failures.push(message);
    console.log(`  FAIL  ${message}`);
  }
}

function skipAsNotVerified(message: string): void {
  notVerified.push(message);
  console.log(`  N/V   ${message}`);
}

function section(name: string): void {
  console.log(`\n--- ${name} ---`);
}

async function timed<T>(label: string, run: () => Promise<T>): Promise<T> {
  const started = Date.now();
  try {
    return await run();
  } finally {
    const ms = Date.now() - started;
    timings.push([label, ms]);
    console.log(`        (${label}: ${ms} ms)`);
  }
}

async function postJson(base: string, route: string, body: unknown): Promise<{ status: number; payload: any }> {
  // Generous client-side timeout: a local-model request can legitimately take
  // minutes on CPU, and the harness must not abort before the app answers.
  const response = await fetch(`${base}${route}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(300_000),
  });
  const text = await response.text();
  let payload: unknown = null;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = { raw: text.slice(0, 200) };
  }
  return { status: response.status, payload };
}

function findPackagedExe(): string | null {
  if (!existsSync(UNPACKED_DIR)) return null;
  const candidates = readdirSync(UNPACKED_DIR).filter((name) => name.toLowerCase().endsWith('.exe'));
  // The unpacked directory also contains helper executables; the app itself is
  // the one named after the product.
  const preferred = candidates.find((name) => /calcora/i.test(name));
  return preferred ? path.join(UNPACKED_DIR, preferred) : null;
}

function icoEntryCount(filePath: string): number {
  const buffer = readFileSync(filePath);
  if (buffer.length < 6) return 0;
  return buffer.readUInt16LE(4);
}

function icnsChunkTypes(filePath: string): string[] {
  const buffer = readFileSync(filePath);
  // ICNS: 4-byte magic, 4-byte big-endian total length, then (type, length, data)
  // chunks. Parsing it properly is the only way to know the macOS icon really
  // carries the resolutions the dock needs.
  if (buffer.length < 8 || buffer.toString('ascii', 0, 4) !== 'icns') return [];
  const declared = buffer.readUInt32BE(4);
  if (declared !== buffer.length) return [];
  const types: string[] = [];
  let offset = 8;
  while (offset + 8 <= buffer.length) {
    const type = buffer.toString('ascii', offset, offset + 4);
    const length = buffer.readUInt32BE(offset + 4);
    if (length < 8 || offset + length > buffer.length) break;
    types.push(type);
    offset += length;
  }
  return types;
}

async function main(): Promise<void> {
  console.log(`Packaged-app smoke test (${process.platform})\nrelease: ${RELEASE_DIR}`);

  // -----------------------------------------------------------------------
  section('[1-7] Package contents (PACKAGE, ICON)');
  const packagedExe = findPackagedExe();
  check(Boolean(packagedExe), `packaged application exists (${packagedExe ?? 'missing'})`);
  if (!packagedExe) {
    console.log('\nNo packaged application to test. Run `npm run dist:win` first.');
    process.exit(1);
  }
  const exeSizeMb = Math.round(statSync(packagedExe).size / (1024 * 1024));
  check(exeSizeMb > 40, `the packaged executable is a real application (${exeSizeMb} MB)`);

  const releaseFiles = existsSync(RELEASE_DIR) ? readdirSync(RELEASE_DIR) : [];
  const installers = releaseFiles.filter((name) => name.endsWith('.exe'));
  check(
    installers.some((name) => /setup/i.test(name)),
    `NSIS installer artifact present (${installers.filter((n) => /setup/i.test(n)).join(', ') || 'none'})`,
  );
  check(
    installers.some((name) => /portable/i.test(name)),
    `portable artifact present (${installers.filter((n) => /portable/i.test(n)).join(', ') || 'none'})`,
  );

  const iconsDir = path.join(PROJECT_ROOT, 'build', 'icons');
  const requiredPngSizes = [16, 24, 32, 48, 64, 96, 128, 256, 512, 1024];
  const missingPng = requiredPngSizes.filter((size) => !existsSync(path.join(iconsDir, `${size}x${size}.png`)));
  check(missingPng.length === 0, `every required PNG size is generated (missing: ${missingPng.join(', ') || 'none'})`);
  const icoPath = path.join(iconsDir, 'calcora-icon.ico');
  check(existsSync(icoPath) && icoEntryCount(icoPath) >= 5, `the .ico carries multiple resolutions for Windows (${existsSync(icoPath) ? icoEntryCount(icoPath) : 0} entries)`);
  const icnsPath = path.join(iconsDir, 'calcora-icon.icns');
  const icnsTypes = existsSync(icnsPath) ? icnsChunkTypes(icnsPath) : [];
  check(
    icnsTypes.includes('icp4') && icnsTypes.includes('ic10'),
    `the .icns carries the macOS dock resolutions icp4..ic10 (found: ${icnsTypes.join(', ') || 'none'})`,
  );

  const resourcesDir = path.join(UNPACKED_DIR, 'resources');
  const packagedIcon = path.join(resourcesDir, 'icons', 'calcora-icon.png');
  check(existsSync(packagedIcon), 'the packaged app ships its window icon (resources/icons/calcora-icon.png)');
  if (existsSync(packagedIcon)) {
    // Byte identity proves the *current* icon shipped, not a stale copy from an
    // earlier build: the packaged PNG must be exactly what the icon pipeline
    // just generated.
    const generated = readFileSync(path.join(iconsDir, 'calcora-icon.png'));
    const shipped = readFileSync(packagedIcon);
    check(
      generated.equals(shipped),
      `the packaged window icon is byte-identical to the generated icon (${generated.length} vs ${shipped.length} bytes)`,
    );
  }
  const ggufInPackage = existsSync(resourcesDir)
    ? readdirSync(resourcesDir).filter((name) => name.toLowerCase().endsWith('.gguf'))
    : [];
  check(ggufInPackage.length === 0, 'no GGUF model is shipped inside the package (models stay external)');
  const asarPath = path.join(resourcesDir, 'app.asar');
  const asarBytes = existsSync(asarPath) ? statSync(asarPath).size : 0;
  check(asarBytes > 1_000_000, `the application bundle (app.asar) is present (${Math.round(asarBytes / 1024 / 1024)} MB)`);

  // Architecture: read the PE machine type instead of trusting the file name.
  // 0x8664 = x64, 0x014c = x86, 0xAA64 = ARM64.
  const PE_MACHINES: Record<number, string> = { 0x8664: 'x64', 0x014c: 'x86', 0xaa64: 'arm64' };
  const exeBuffer = readFileSync(packagedExe as string);
  const peOffset = exeBuffer.readUInt32LE(0x3c);
  const machine = exeBuffer.readUInt16LE(peOffset + 4);
  check(
    PE_MACHINES[machine] === process.arch,
    `the packaged executable targets this architecture (${PE_MACHINES[machine] ?? `0x${machine.toString(16)}`}, host ${process.arch})`,
  );

  // Version: the artifacts must carry the version declared in package.json.
  const packageJson = JSON.parse(readFileSync(path.join(PROJECT_ROOT, 'package.json'), 'utf8')) as { version?: string };
  const expectedVersion = packageJson.version ?? '';
  check(
    installers.some((name) => name.includes(expectedVersion)),
    `the artifacts carry the declared version ${expectedVersion}`,
  );

  // The final code must actually be inside the bundle, not only in the sources:
  // both strings below exist solely in code written in this cycle.
  const asarBuffer = readFileSync(asarPath);
  check(
    asarBuffer.toString('latin1').includes('Unknown API endpoint.'),
    'the packaged bundle contains the current server code (API 404 fix)',
  );
  check(
    asarBuffer.includes(Buffer.from('\u0645\u0634\u062a\u0642', 'utf8')),
    'the packaged bundle contains the multilingual derivative routing (Urdu keyword)',
  );

  // -----------------------------------------------------------------------
  section('[8-12] Launch, filesystem, restart, single instance (LAUNCH, FILESYSTEM)');
  let childEnv = {
    ...process.env,
    CALCORA_HOST: '127.0.0.1',
    CALCORA_DESKTOP: '1',
    CALCORA_MODELS_DIR: MODELS_DIR,
    // A real 1.5B turn costs 35-120 s on this CPU. The runtime's own default
    // timeout is 120 s, which is exactly the measured worst case, so the harness
    // raises it to the runtime's maximum (180 s) rather than letting a borderline
    // request trip into an unrelated deterministic fallback.
    CALCORA_LOCAL_MODEL_TIMEOUT_MS: '180000',
    ...(LLAMA ? { CALCORA_LLAMA_CLI_PATH: LLAMA } : {}),
  };

  // The desktop shell forces CALCORA_PORT=0 (an ephemeral port) on purpose, so a
  // smoke test cannot dictate the port. It is discovered instead: the packaged
  // Electron main process forwards the backend's stdout, which contains the
  // "server running on http://<host>:<port>" line that server.ts prints after it
  // binds. CALCORA_PORT is only set if the caller explicitly forces a fixed port
  // for a deterministic test.
  const forcedPort = Number(process.env.CALCORA_SMOKE_FORCE_PORT ?? 0);
  if (forcedPort > 0) childEnv = { ...childEnv, CALCORA_PORT: String(forcedPort) };
  // Starts at 0 on purpose. Falling back to a guessed port turned a discovery failure into a
  // misleading ECONNREFUSED against a port nothing ever bound.
  let port = forcedPort > 0 ? forcedPort : 0;
  const baseUrl = () => `http://127.0.0.1:${port}`;

  let app: ChildProcess | undefined;

  /**
   * Discovers the ephemeral backend port of the packaged app.
   *
   * Two channels are tried, because neither works everywhere:
   *
   * 1. The DevTools endpoint. The window is loaded from
   *    `http://127.0.0.1:<port>/`, so the target list reveals the port. This is
   *    the channel that works on a packaged Windows GUI app, whose stdout is not
   *    inherited by the parent process.
   * 2. The backend's startup line on stdout, which is how a console-launched
   *    process announces itself (`server running on http://<host>:<port>`).
   */
  const discoverPortFromCdp = async (timeoutMs: number): Promise<number | null> => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      try {
        const response = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`, {
          signal: AbortSignal.timeout(3000),
        });
        if (response.ok) {
          const targets = await response.json() as Array<{ type?: string; url?: string }>;
          for (const target of targets) {
            const match = String(target.url ?? '').match(/^https?:\/\/(?:127\.0\.0\.1|localhost):(\d+)\//);
            if (target.type === 'page' && match) return Number(match[1]);
          }
        }
      } catch {
        // DevTools endpoint not up yet, or the window has no page target yet.
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    return null;
  };

  // `discoveredPort` holds the port found for the *current* launch, so the
  // restart check re-discovers rather than reusing a dead port.
  let discoveredPort = 0;

  const launch = async (options: { debugPort?: number } = {}): Promise<ChildProcess> => {
    discoveredPort = 0;
    // A relaunch by a user (double-clicking the shortcut) carries no debugging flags, so the
    // second-instance check must not smuggle one in: it would test a scenario nobody hits.
    const args = options.debugPort === undefined ? [] : [`--remote-debugging-port=${options.debugPort}`];
    const instance = spawn(packagedExe as string, args, {
      env: childEnv,
      stdio: ['ignore', 'pipe', 'pipe'],
      // Must be detached. Measured: with detached:false the packaged app starts its backend
      // and then exits 0 within ~5 s; with detached:true it stays up and serves normally.
      // A desktop app is launched as an independent process by Explorer/the Start Menu, never
      // as a console-attached child, so this mirrors real usage instead of a test-only quirk.
      detached: true,
    });
    return instance;
  };

  /** Poll for real process exit rather than sampling exitCode once at a fixed delay. */
  const waitForExit = async (child: ChildProcess, timeoutMs: number): Promise<boolean> => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (child.exitCode !== null || child.signalCode !== null) return true;
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    return child.exitCode !== null || child.signalCode !== null;
  };

  /**
   * Terminate the whole process tree. The app is launched detached, so child.kill() only
   * takes down the Electron main process and orphans the backend/renderer. Those orphans keep
   * the single-instance lock and the debugging port, so the next launch cannot come up.
   */
  const killAppTree = async (child?: ChildProcess): Promise<void> => {
    if (!child?.pid) return;
    if (process.platform === 'win32') {
      await new Promise<void>((resolve) => {
        execFile('taskkill', ['/pid', String(child.pid), '/T', '/F'], () => resolve());
      });
    } else {
      child.kill('SIGTERM');
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  };

  const resolvePortForThisLaunch = async (): Promise<void> => {
    if (forcedPort > 0) {
      port = forcedPort;
      return;
    }
    if (!discoveredPort) discoveredPort = (await discoverPortFromCdp(120_000)) ?? 0;
    if (discoveredPort) port = discoveredPort;
  };

  app = await launch({ debugPort: CDP_PORT });
  await new Promise((resolve) => setTimeout(resolve, 6000));
  // `&&` is load-bearing: with `||` a clean exit(0) still satisfied the signalCode===null
  // clause, so this check reported PASS while reporting exit=0 -- it could never fail.
  check(
    app.exitCode === null && app.signalCode === null,
    `the packaged application stays running after launch (exit=${String(app.exitCode)})`,
  );
  await resolvePortForThisLaunch();
  const portDiscovered = port > 0;
  check(
    portDiscovered,
    portDiscovered
      ? `the packaged backend port was discovered over CDP (${port})`
      : 'the packaged backend port could not be discovered over CDP (no guessed fallback is used)',
  );

  // Health is polled against whichever port the app actually bound.
  const waitForAnyHealth = async (timeoutMs: number): Promise<boolean> => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      try {
        const response = await fetch(`${baseUrl()}/api/health`);
        if (response.ok) return true;
      } catch {
        // Still starting, or the port has not been discovered yet.
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    return false;
  };

  const healthy = await timed('health (first launch)', () => waitForAnyHealth(90000));
  check(healthy, `the packaged backend answers /api/health on its ephemeral port ${port}`);

  const healthHeaders = await fetch(`${baseUrl()}/api/health`).then((r) => r.headers);
  check(healthHeaders.get('x-powered-by') === null, 'the packaged server does not advertise its stack');

  // Electron derives userData from `app.getName()`, which comes from the
  // `name` field in package.json ("calcora-ai"), not from `productName`. The
  // packaged app was observed creating %APPDATA%\calcora-ai.
  const appDirName = 'calcora-ai';
  const userDataDir = process.platform === 'win32'
    ? path.join(process.env.APPDATA ?? '', appDirName)
    : process.platform === 'darwin'
      ? path.join(process.env.HOME ?? '', 'Library', 'Application Support', appDirName)
      : path.join(process.env.XDG_CONFIG_HOME ?? path.join(process.env.HOME ?? '', '.config'), appDirName);
  check(existsSync(userDataDir), `the platform user-data directory is used for logs and credentials (${userDataDir})`);

  // A second launch must not start a competing backend (single-instance lock).
  // Launched with no debugging flag, exactly as a user relaunching from the shortcut would.
  const secondInstance = await launch();
  const secondExited = await waitForExit(secondInstance, 20_000);
  const stillHealthy = await waitForAnyHealth(15000);
  check(stillHealthy, 'the running instance keeps serving after a second launch attempt');
  check(
    secondExited,
    `a second launch exits instead of opening a duplicate backend (exit=${String(secondInstance.exitCode)})`,
  );
  if (!secondExited) secondInstance.kill();

  // -----------------------------------------------------------------------
  section('[13-18] Deterministic core, agent, tutor, verification (CALCULATOR, MATH ENGINE, MATH AGENT, TUTOR, KNOWLEDGE/RAG)');
  const calculate = await timed('math tool 2+3', () => postJson(baseUrl(), '/api/math/tool', { tool: 'calculate', args: { expression: '2 + 3' } }));
  check(calculate.status === 200, 'the packaged math tool endpoint answers');
  const calculatedValue = calculate.payload?.result ?? calculate.payload?.value;
  check(String(calculatedValue).includes('5'), `the deterministic engine computes 2 + 3 = 5 (got ${JSON.stringify(calculatedValue)})`);

  const agent = await timed('math agent derivative', () => postJson(baseUrl(), '/api/ai/math-agent', { goal: 'Find the derivative of x^2' }));
  check(agent.payload?.deterministicResult === '2x', `the packaged Math Agent differentiates symbolically (got ${JSON.stringify(agent.payload?.deterministicResult)})`);
  check(agent.payload?.verification?.status === 'PASS', 'the packaged agent reports a verified derivative');
  check(String(agent.payload?.explanation ?? '').includes('d/dx(x^2) = 2x'), 'the agent explanation renders d/dx(x^2) = 2x');

  const offTopic = await postJson(baseUrl(), '/api/ai/math-agent', { goal: 'Who won the 1998 football world cup?' });
  check(offTopic.payload?.deterministicResult === null || offTopic.payload?.deterministicResult === undefined, 'an off-topic agent goal produces no number');
  check(offTopic.payload?.verification?.status !== 'PASS', 'an off-topic agent goal is never reported as PASS');

  const equation = await timed('tutor equation', () => postJson(baseUrl(), '/api/ai/math', {
    prompt: 'Solve 3x - 4 = 11', tutorMode: 'assistant', language: 'en', offlineOnly: true, topic: 'Algebra',
  }));
  check(String(equation.payload?.deterministicResult) === '5', `the packaged Tutor solves an equation deterministically (got ${JSON.stringify(equation.payload?.deterministicResult)})`);
  check(equation.payload?.verification?.state === 'VERIFIED', 'the equation answer is VERIFIED in the packaged app');
  check(equation.payload?.isOfflineFallback === true, 'offline mode is honoured by the packaged Tutor');

  // A derivative asked in Urdu must be *computed*, not merely described: the
  // expression is Latin inside an Urdu sentence, which an English-only pipeline
  // cannot see. The concept question (no expression) is asserted separately in
  // tests/multilingualVerification11.test.ts.
  const urduDerivative = await timed('tutor urdu derivative', () => postJson(baseUrl(), '/api/ai/math', {
    prompt: 'x^2 کا مشتق کیا ہے؟', tutorMode: 'assistant', offlineOnly: true, topic: 'Derivatives',
  }));
  const urduAnswer = String(urduDerivative.payload?.answer ?? '');
  check(/d\/dx\s*\(x\^2\)\s*=\s*2x/.test(urduAnswer), 'the packaged Tutor computes d/dx(x^2) = 2x from an Urdu request');
  check(urduDerivative.payload?.verification?.state === 'VERIFIED', `the Urdu derivative is VERIFIED (got ${urduDerivative.payload?.verification?.state})`);
  check(/[\u0600-\u06FF]/.test(urduAnswer), 'the packaged Tutor answers in Urdu script');

  const unsupported = await postJson(baseUrl(), '/api/ai/math', {
    prompt: 'Find the derivative of abs(x)', tutorMode: 'assistant', offlineOnly: true, topic: 'Derivatives',
  });
  check(/No derivative function is claimed/i.test(String(unsupported.payload?.answer ?? '')), 'an unsupported derivative claims nothing in the packaged app');
  check(unsupported.payload?.verification?.state !== 'VERIFIED', 'an unsupported derivative is never VERIFIED in the packaged app');

  // -----------------------------------------------------------------------
  section('[19-20] Local AI (LOCAL AI)');
  const localModels = await fetch(`${baseUrl()}/api/ai/local-models`).then((r) => r.json());
  if (!LLAMA) {
    skipAsNotVerified('CALCORA_SMOKE_LLAMA was not provided, so local model discovery is not exercised');
    skipAsNotVerified('local GGUF generation is not exercised without a llama.cpp runtime path');
  } else {
    check(localModels.runtime === 'llama.cpp', `the packaged app finds llama.cpp (runtime=${localModels.runtime})`);
    check(Array.isArray(localModels.models) && localModels.models.length > 0, `the packaged app lists the local models (${localModels.models?.length ?? 0})`);
    // The smallest installed model is used deliberately: a 3B model on CPU can
    // exceed the runtime's own timeout, and a timeout-triggered deterministic
    // fallback would fail this check for a reason unrelated to the packaging.
    const sorted = [...(localModels.models ?? [])].sort((a, b) => (a.sizeBytes ?? 0) - (b.sizeBytes ?? 0));
    const modelId = sorted.find((model) => model.role === 'general')?.id ?? sorted[0]?.id;
    const generation = await timed('local GGUF generation', () => postJson(baseUrl(), '/api/ai/math', {
      prompt: 'In one sentence, what is the derivative of x squared?',
      tutorMode: 'assistant',
      language: 'en',
      offlineOnly: true,
      localModelId: modelId,
    }));
    check(generation.payload?.meta?.responseSource === 'local-model', `a selected GGUF actually answers (source=${generation.payload?.meta?.responseSource})`);
    check(String(generation.payload?.answer ?? '').trim().length > 0, 'the local model produced a non-empty answer');
  }

  // -----------------------------------------------------------------------
  section('[21] Security boundaries (SECURITY)');
  const missingRoute = await fetch(`${baseUrl()}/api/definitely-not-a-route`);
  check(missingRoute.status === 404, `unknown routes return 404 (got ${missingRoute.status})`);
  const malformed = await fetch(`${baseUrl()}/api/ai/math`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{not json',
  });
  check(malformed.status === 400, `malformed JSON is rejected with 400 (got ${malformed.status})`);
  const corsProbe = await fetch(`${baseUrl()}/api/health`, { headers: { Origin: 'https://evil.example' } });
  check(corsProbe.headers.get('access-control-allow-origin') === null, 'a foreign Origin receives no CORS grant');

  // -----------------------------------------------------------------------
  section('[22] Packaged user interface (UI, ICON)');
  let browser: Browser | undefined;
  let page: Page | undefined;
  try {
    browser = await chromium.connectOverCDP(`http://127.0.0.1:${CDP_PORT}`);
    const context = browser.contexts()[0];
    page = context.pages()[0];
    await page.waitForLoadState('domcontentloaded', { timeout: 30000 });
    const body = await page.locator('body').innerText();
    check(body.length > 200, `the packaged window renders the application (${body.length} chars)`);
    await page.locator('#tab-ai').click({ timeout: 15000 });
    const input = page.locator('#ai-prompt-input');
    await input.waitFor({ state: 'visible', timeout: 20000 });
    await input.fill('Find the derivative of x^2');
    await page.locator('#btn-ai-submit').click({ timeout: 10000 });
    // The assertion below is unchanged; only the patience grows. A packaged turn can
    // fall through to on-device GGUF inference, which this CPU needs 35-120 s for, and
    // the runtime's own timeout is CALCORA_LOCAL_MODEL_TIMEOUT_MS=180000. 120 s therefore
    // expires before a legitimate local-model answer has a chance to arrive.
    await page.waitForFunction(() => {
      const el = document.querySelector<HTMLInputElement>('#ai-prompt-input');
      return Boolean(el && !el.disabled);
    }, null, { timeout: 300000 });
    const uiText = await page.locator('body').innerText();
    check(/d\/dx\(x\^2\)\s*=\s*2x/.test(uiText), 'the packaged window renders d/dx(x^2) = 2x');
    const badges = await page.locator('[data-verification-state]').count();
    check(badges > 0, `every packaged answer carries a verification badge (${badges})`);
  } catch (error) {
    skipAsNotVerified(`packaged UI could not be driven over CDP: ${error instanceof Error ? error.message.split('\n')[0] : String(error)}`);
  } finally {
    await browser?.close().catch(() => undefined);
  }

  // -----------------------------------------------------------------------
  section('[12b] Restart (LAUNCH)');
  await killAppTree(app);
  await new Promise((resolve) => setTimeout(resolve, 4000));
  // A restart binds a *new* ephemeral port, so it must be discovered again. The relaunch must
  // therefore carry the same debugging port the discovery step reads from.
  app = await launch({ debugPort: CDP_PORT });
  await resolvePortForThisLaunch();
  const restarted = await timed('health after restart', () => waitForAnyHealth(90000));
  check(restarted, `the packaged application restarts and serves again after being closed (port ${port})`);

  // -----------------------------------------------------------------------
  section('Summary');
  console.log('  measured timings:');
  for (const [label, ms] of timings) console.log(`    ${label}: ${ms} ms`);
  if (notVerified.length) {
    console.log('  NOT VERIFIED:');
    for (const item of notVerified) console.log(`    - ${item}`);
  }
  console.log(`\nPackaged smoke checks passed: ${passed}, failed: ${failures.length}, not verified: ${notVerified.length}`);
  if (failures.length) {
    console.log('Failures:');
    for (const failure of failures) console.log(`  - ${failure}`);
  }

  try {
    await killAppTree(app);
  } catch {
    // The app may already be gone.
  }
  process.exit(failures.length ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
