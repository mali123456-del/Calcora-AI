/**
 * Real browser verification using the installed system Chrome (playwright-core).
 *
 * Verifies the actual user flows that HTTP tests cannot cover:
 *   - the app boots and renders the Calculator
 *   - the Tutor answers "مجھے algebra سمجھاؤ" with a real explanation and no Gemini text
 *   - a real PDF can be selected, is parsed in-browser, and its text is shown
 *   - dark/light theme switching does not break rendering
 *   - no network request goes to a cloud LLM
 */
import { chromium } from 'playwright-core';
import { writeFileSync, mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { buildAlgebraWorksheetPdf, buildImageOnlyPdf } from './fixtures/pdfFixtures';

const BASE = process.env.CALCORA_BASE ?? 'http://localhost:3000';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

let passed = 0;
const failures: string[] = [];
function check(condition: boolean, message: string): void {
  if (condition) { passed += 1; console.log(`  PASS  ${message}`); }
  else { failures.push(message); console.log(`  FAIL  ${message}`); }
}

async function openTutor(page: any): Promise<void> {
  await page.locator('#tab-ai').click({ timeout: 15000 });
  await page.waitForTimeout(1200);
}

async function waitForTutorReady(page: any): Promise<void> {
  await page.waitForFunction(() => {
    const input = document.querySelector<HTMLInputElement>('#ai-prompt-input');
    return Boolean(input && !input.disabled);
  }, null, { timeout: 30000 });
}

async function openPdfReader(page: any): Promise<void> {
  await page.locator('#tab-home').click({ timeout: 10000 });
  await page.getByRole('button', { name: /Scan \/ Voice \/ Ink/ }).click({ timeout: 10000 });
  await page.getByRole('button', { name: /PDF \/ Data/ }).click({ timeout: 10000 });
  await page.locator('input[type=file][accept*="pdf" i]').waitFor({ state: 'attached', timeout: 10000 });
}

async function main() {
  const browser = await chromium.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  // Record every outbound request so a cloud LLM call cannot hide.
  const externalRequests: string[] = [];
  const failedRequests: string[] = [];
  const httpErrors: string[] = [];
  const tutorPayloads: Array<Record<string, unknown>> = [];
  const consoleErrors: string[] = [];

  const page = await context.newPage();
  page.on('request', (request: any) => {
    const url = request.url();
    if (!url.startsWith(BASE) && !url.startsWith('data:') && !url.startsWith('blob:')) {
      externalRequests.push(`${request.method()} ${url}`);
    }
    if (url.endsWith('/api/ai/math') && request.postData()) {
      try { tutorPayloads.push(request.postDataJSON()); } catch { /* payload is reported by the HTTP response */ }
    }
  });
  page.on('requestfailed', (request: any) => {
    const errorText = request.failure()?.errorText ?? 'unknown failure';
    // The Tutor intentionally aborts its bounded model-status request when the panel
    // unmounts (e.g. navigating to the calculator). This cancellation is expected.
    if (request.url().endsWith('/api/ai/local-models') && errorText === 'net::ERR_ABORTED') return;
    failedRequests.push(`${request.method()} ${request.url()} — ${errorText}`);
  });
  page.on('response', (response: any) => {
    if (response.status() >= 400) httpErrors.push(`${response.status()} ${response.url()}`);
  });
  page.on('console', (msg: any) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err: any) => consoleErrors.push(`pageerror: ${err.message}`));

  // ------------------------------------------------------------------
  console.log('\n[1] App boot');
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.locator('#tab-home').waitFor({ state: 'visible', timeout: 30000 });
  check(await page.title() !== '', `page title is "${await page.title()}"`);
  const bodyText = await page.locator('body').innerText();
  check(bodyText.length > 200, `app rendered visible text (${bodyText.length} chars)`);
  check(!/AI Math Assistant & Tutor is ready/i.test(bodyText), 'no stale Gemini placeholder on boot');
  check(await page.locator('#tab-home').count() === 1, 'Command Hub navigation is present');

  // ------------------------------------------------------------------
  console.log('\n[2] Tutor: Urdu algebra in default local-only mode');
  await openTutor(page);
  const localModelSelect = page.locator('#tutor-local-model-select');
  await localModelSelect.waitFor({ state: 'visible', timeout: 10000 });
  const discoveredModelOptions = await localModelSelect.locator('option').evaluateAll((options: HTMLOptionElement[]) =>
    options.map((option) => ({ value: option.value, label: option.textContent ?? '' })),
  );
  const selectedLocalModel = discoveredModelOptions.find((option) => option.value.startsWith('gguf-'));
  check(discoveredModelOptions.some((option) => option.label.includes('Deterministic Tutor')), 'deterministic Tutor is always an available model choice');
  check(Boolean(selectedLocalModel), 'at least one discovered local GGUF is selectable');
  check(await page.locator('#tutor-local-model-status').count() === 1, 'local runtime diagnostic is present and associated with the selector');
  if (selectedLocalModel) {
    await localModelSelect.selectOption(selectedLocalModel.value, { timeout: 5000 });
    check(await page.locator('#tutor-privacy-mode').inputValue() === 'offline', 'selecting a local GGUF explicitly switches Tutor privacy to Local only');
  }
  const tutorInput = page.locator('#ai-prompt-input');
  await tutorInput.waitFor({ state: 'visible', timeout: 15000 });
  await page.locator('#tutor-privacy-mode').waitFor({ state: 'visible', timeout: 5000 });
  check(await page.locator('#tutor-privacy-mode').inputValue() === 'offline', 'Tutor defaults to Local only');
  await page.locator('select[title="Choose Tutor response language"]').selectOption('ur', { timeout: 5000 });
  await tutorInput.fill('مجھے algebra سمجھاؤ');
  await page.locator('#btn-ai-submit').click({ timeout: 5000 });
  await waitForTutorReady(page);
  check(tutorPayloads[tutorPayloads.length - 1]?.offlineOnly === true, 'selected model request explicitly stays Local only');
  check(tutorPayloads[tutorPayloads.length - 1]?.localModelId === selectedLocalModel?.value, 'Tutor request forwards only the selected opaque model ID');

  const tutorText = await page.locator('body').innerText();
  const forbidden = [
    'AI Math Assistant & Tutor is ready',
    'To enable live Gemini responses',
    'GEMINI_API_KEY',
    'GEMINI_NOT_CONFIGURED',
    'Gemini not configured',
  ];
  for (const phrase of forbidden) {
    check(!tutorText.includes(phrase), `browser Tutor output free of "${phrase}"`);
  }
  check(
    /الجبرا|متغیر|مساوات/.test(tutorText),
    'browser Tutor produced a real Urdu algebra explanation',
  );
  const shotTutor = join(tmpdir(), 'calcora-tutor.png');
  await page.screenshot({ path: shotTutor, fullPage: false });
  console.log(`  screenshot: ${shotTutor}`);

  console.log('\n[2a] Cloud consent with missing Gemini key remains honest');
  await page.locator('#tutor-privacy-mode').selectOption('cloud', { timeout: 5000 });
  await page.locator('select[title="Choose Tutor response language"]').selectOption('en', { timeout: 5000 });
  await tutorInput.fill('Explain algebra in plain language');
  await page.locator('#btn-ai-submit').click({ timeout: 5000 });
  await page.waitForFunction(() => document.body.innerText.includes('Algebra is the branch') || document.body.innerText.includes('Algebra uses'), null, { timeout: 30000 });
  await waitForTutorReady(page);
  check((await page.locator('[data-response-source="local-deterministic"]').count()) > 0, 'missing Gemini key is disclosed as a local Tutor response');
  check(!/GEMINI_API_KEY|GEMINI_NOT_CONFIGURED|Gemini not configured/i.test(await page.locator('body').innerText()), 'missing-key response contains no stale placeholder');
  check(tutorPayloads[tutorPayloads.length - 1]?.offlineOnly === false, 'cloud consent is explicit in the request policy');
  await page.locator('#tutor-privacy-mode').selectOption('offline', { timeout: 5000 });

  console.log('\n[2b] Deterministic calculator remains available');
  await page.locator('#tab-calculator').click({ timeout: 10000 });
  await page.locator('#btn-clear-all').click({ timeout: 5000 });
  await page.locator('#btn-num-7').click({ timeout: 5000 });
  await page.locator('#btn-op-multiply').click({ timeout: 5000 });
  await page.locator('#btn-num-8').click({ timeout: 5000 });
  await page.locator('#btn-calculate').click({ timeout: 5000 });
  check(/56/.test(await page.getByRole('region', { name: 'Calculator Display' }).innerText()), 'deterministic calculator computes 7 × 8 = 56');
  await page.locator('#tab-ai').click({ timeout: 10000 });
  await page.locator('select[title="Choose Tutor response language"]').selectOption('en', { timeout: 5000 });

  // ------------------------------------------------------------------
  // [2c] Verification badge (GAP-04a / GAP-04b)
  //
  // Asserted against the real running application: the state shown must be the state
  // the deterministic engine and the independent verifier actually produced.
  //
  // Two constraints shape this section. First, `/api/ai/math` is rate limited to 8
  // requests per minute, and the earlier sections already consume most of that budget,
  // so this section deliberately adds only one Tutor call and asserts everything it can
  // from that call plus the responses already produced above. Second, a bare arithmetic
  // request is treated as "apply this to the calculator": the app switches tabs and
  // unmounts this panel, which is intended behaviour, so the in-UI VERIFIED badge is
  // demonstrated with an equation. The arithmetic verification path is covered by the
  // deterministic unit suites, which assert the same verifier the server runs.
  // ------------------------------------------------------------------
  console.log('\n[2c] Verification state is computed and shown in the real UI');

  // The conceptual Urdu answer from [2] already produced a badge.
  const conceptualBadge = page.locator('[data-verification-state]').last();
  const conceptualCount = await page.locator('[data-verification-state]').count();
  check(conceptualCount > 0, 'a verification badge is rendered on a real Tutor answer');
  const conceptualState = (await conceptualBadge.getAttribute('data-verification-state')) ?? '';
  const conceptualLabel = (await conceptualBadge.innerText()).trim();
  check(
    conceptualState === 'UNVERIFIED' || conceptualState === 'UNAVAILABLE',
    `a conceptual explanation is never falsely VERIFIED (got "${conceptualState}")`,
  );
  check(!/^verified$/i.test(conceptualLabel), `a conceptual explanation does not show the verified label ("${conceptualLabel.replace(/\n/g, ' ').slice(0, 40)}")`);

  // One new Tutor call: an equation, which stays in the Tutor panel.
  const badgesBefore = conceptualCount;
  await page.locator('#ai-prompt-input').fill('Solve 2x + 4 = 10');
  await page.locator('#btn-ai-submit').click({ timeout: 5000 });
  await page.waitForFunction(
    (n) => document.querySelectorAll('[data-verification-state]').length > n,
    badgesBefore,
    { timeout: 30000 },
  );
  await waitForTutorReady(page);

  const badge = page.locator('[data-verification-state]').last();
  const verifiedState = (await badge.getAttribute('data-verification-state')) ?? '';
  const verifiedLabel = (await badge.innerText()).trim();
  const verifiedAria = (await badge.getAttribute('aria-label')) ?? '';
  check(verifiedState === 'VERIFIED', `a verifiable equation reports VERIFIED (got "${verifiedState}")`);
  check(/verified/i.test(verifiedLabel), `the badge names the state in text ("${verifiedLabel.replace(/\n/g, ' ').slice(0, 40)}")`);
  check(verifiedAria.startsWith('Verification state:'), `the badge exposes an ARIA label naming the state ("${verifiedAria.slice(0, 50)}...")`);
  const badgeBox = await badge.boundingBox();
  check(Boolean(badgeBox && badgeBox.width > 0 && badgeBox.height > 0), 'the badge is visibly rendered on screen');
  const verifyMethod = (await badge.getAttribute('data-verification-method')) ?? '';
  check(verifyMethod === 'equation-residual', `the check used independent root substitution (got "${verifyMethod}")`);

  // Every assistant answer rendered in this run carries a state.
  const badgeTotal = await page.locator('[data-verification-state]').count();
  const footerTotal = await page.locator('[data-response-source]').count();
  check(badgeTotal >= footerTotal, `no assistant answer renders without a verification state (badges=${badgeTotal}, footers=${footerTotal})`);

  // ------------------------------------------------------------------
  console.log('\n[3] PDF upload -> local Tutor grounding');
  const workDir = mkdtempSync(join(tmpdir(), 'calcora-pdf-'));
  const pdfPath = join(workDir, 'algebra-worksheet.pdf');
  const scanPath = join(workDir, 'scan.pdf');
  writeFileSync(pdfPath, buildAlgebraWorksheetPdf());
  writeFileSync(scanPath, buildImageOnlyPdf(1));

  // Open the Multimodal Studio through the Command Hub's actual buttons.
  await page.locator('#tab-home').click({ timeout: 5000 });
  await page.getByText('Calcora Intelligence OS').waitFor({ state: 'visible', timeout: 15000 });
  check((await page.getByText('Calcora Intelligence OS').count()) > 0, 'Command Hub content rendered');
  await page.getByRole('button', { name: /Scan \/ Voice \/ Ink/ }).click({ timeout: 10000 });
  await page.getByRole('button', { name: /PDF \/ Data/ }).click({ timeout: 10000 });
  const onMultimodal = (await page.locator('input[type=file][accept*="pdf" i]').count()) > 0;
  check(onMultimodal, 'navigated through Command Hub to the PDF reader');

  const pdfInput = page.locator('input[type=file][accept*="pdf" i]').first();
  const hasPdfInput = (await pdfInput.count()) > 0;
  check(hasPdfInput, 'PDF file input is present');

  if (hasPdfInput) {
    await pdfInput.setInputFiles(pdfPath);
    // Wait for the extraction result panel.
    let extracted = false;
    for (let i = 0; i < 40; i += 1) {
      const text = await page.locator('body').innerText();
      if (/A variable is a symbol|characters|Extracted text/i.test(text)) { extracted = true; break; }
      await page.waitForTimeout(250);
    }
    check(extracted, 'PDF text extracted and rendered in the browser');

    const pdfText = await page.locator('body').innerText();
    check(
      pdfText.includes('A variable is a symbol'),
      'extracted page text is visible to the user',
    );
    check(/page 2|Dividing both sides by 2/i.test(pdfText), 'page-level text is shown');
    await page.getByRole('button', { name: 'p.2' }).click({ timeout: 5000 });
    check(/1 of 2 pages shared/i.test(await page.locator('body').innerText()), 'learner can select a subset of pages');
    check(await page.getByRole('button', { name: 'p.1' }).getAttribute('aria-pressed') === 'true' && await page.getByRole('button', { name: 'p.2' }).getAttribute('aria-pressed') === 'false', 'only page 1 remains selected after deselecting page 2');

    await page.getByRole('button', { name: /Ask the Tutor about this document/ }).click({ timeout: 10000 });
    await page.locator('#ai-prompt-input').waitFor({ state: 'visible', timeout: 10000 });
    await page.locator('#ai-prompt-input').fill('According to the document, what is a variable?');
    await page.locator('#btn-ai-submit').click({ timeout: 5000 });
    await waitForTutorReady(page);
    const groundedAnswer = await page.locator('body').innerText();
    const groundedSourceCount = await page.locator('[data-response-source="document-grounded"]').count();
    if (groundedSourceCount === 0) {
      console.log(`  diagnostic: Tutor payload without grounded provenance: ${JSON.stringify(tutorPayloads[tutorPayloads.length - 1])}`);
      console.log(`  diagnostic: Tutor response text: ${groundedAnswer.slice(-1800)}`);
    }
    check(/symbol that represents an unknown value/i.test(groundedAnswer), 'Tutor quotes the supporting PDF text');
    check(/page 1/i.test(groundedAnswer), 'Tutor grounds its answer in the selected PDF page');
    check(groundedSourceCount > 0, 'UI labels the answer as document-grounded');
    const groundedPayload = tutorPayloads[tutorPayloads.length - 1];
    const groundedDocument = groundedPayload?.document as { pages?: Array<{ pageNumber: number; text: string }> } | undefined;
    check(Boolean(groundedDocument?.pages?.some((page) => /A variable is a symbol/.test(page.text))), 'actual extracted PDF text was sent to the local Tutor route');
    check(groundedPayload?.offlineOnly === true, 'document question explicitly disables cloud AI');
    check(groundedDocument?.pages?.[0]?.pageNumber === 1, 'selected page numbers survive the local API boundary');

    await page.locator('#ai-prompt-input').fill('According to the document, what is the capital city of France?');
    const insufficientResponsePromise = page.waitForResponse(
      (response: any) => response.url().endsWith('/api/ai/math') && response.request().method() === 'POST',
      { timeout: 30000 },
    );
    await page.locator('#btn-ai-submit').click({ timeout: 5000 });
    const insufficientResponse = await insufficientResponsePromise;
    const insufficientPayload = await insufficientResponse.json();
    await waitForTutorReady(page);
    const unsupportedAnswer = await page.locator('body').innerText();
    if (insufficientPayload?.meta?.responseSource !== 'document-insufficient-evidence') {
      console.log(`  diagnostic: request payload: ${JSON.stringify(tutorPayloads[tutorPayloads.length - 1])}`);
      console.log(`  diagnostic: unsupported response payload: ${JSON.stringify(insufficientPayload)}`);
      console.log(`  diagnostic: Tutor response text: ${unsupportedAnswer.slice(-1800)}`);
    }
    check((await page.locator('[data-response-source="document-insufficient-evidence"]').count()) > 0, 'UI labels unsupported document answers honestly');
    check(!/Paris/i.test(unsupportedAnswer), 'unsupported PDF question does not invent an answer');
    check(/does not contain enough information/i.test(unsupportedAnswer), 'Tutor states when PDF evidence is insufficient');

    const shotPdf = join(tmpdir(), 'calcora-pdf.png');
    await page.screenshot({ path: shotPdf, fullPage: false });
    console.log(`  screenshot: ${shotPdf}`);

    // Scanned PDF must be reported honestly, not fabricated. Re-enter the PDF UI
    // because the Tutor navigation unmounts the Multimodal component.
    await openPdfReader(page);
    await page.locator('input[type=file][accept*="pdf" i]').first().setInputFiles(scanPath);
    await page.waitForTimeout(2500);
    const scanText = await page.locator('body').innerText();
    check(
      /no selectable text|scanned|OCR/i.test(scanText),
      'scanned PDF is reported as needing OCR',
    );
    check(
      !/A variable is a symbol/.test(scanText),
      'scanned PDF does not fabricate content',
    );

    check((await page.getByRole('button', { name: /Ask the Tutor about this document/ }).count()) === 0, 'scanned PDF cannot be attached as groundable text');
    await page.locator('#tab-ai').click({ timeout: 10000 });
    await page.locator('#ai-prompt-input').waitFor({ state: 'visible', timeout: 10000 });
    check(await page.locator('#tutor-privacy-mode').inputValue() === 'offline', 'Tutor privacy preference remains Local only');
    const status = await page.locator('#tutor-privacy-status').innerText();
    check(/Local only/.test(status), 'Tutor makes local-only handling visible');
  }

  // ------------------------------------------------------------------
  console.log('\n[3b] Currency uses its bundled baseline without automatic network access');
  await page.locator('#tab-currency').click({ timeout: 10000 });
  await page.getByRole('heading', { name: 'Currency Converter' }).waitFor({ state: 'visible', timeout: 10000 });
  check((await page.getByText('No rates are fabricated', { exact: false }).count()) > 0, 'currency explains the locally available rate policy');
  check(!externalRequests.some((entry) => /open\.er-api\.com/i.test(entry)), 'currency tab makes no automatic live-rate request');

  // ------------------------------------------------------------------
  console.log('\n[4] Theme switching');
  if (await page.locator('#theme-system').count()) {
    await page.locator('#theme-system').click();
    await page.waitForTimeout(300);
    const systemClasses = await page.evaluate(() => document.documentElement.className);
    check(/light|dark/.test(systemClasses), `system theme resolves to a supported theme (${systemClasses})`);
  }
  await page.locator('#theme-dark').click({ timeout: 5000 });
  await page.waitForTimeout(300);
  const initialBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const initialClasses = await page.evaluate(() => document.documentElement.className);
  await page.locator('#theme-light').click();
  await page.waitForTimeout(600);
  const lightBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const lightClasses = await page.evaluate(() => document.documentElement.className);
  await page.locator('#theme-dark').click();
  await page.waitForTimeout(600);
  const darkBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const darkClasses = await page.evaluate(() => document.documentElement.className);

  check(/light/.test(lightClasses), `light mode applied (html class: "${lightClasses}")`);
  check(/dark/.test(darkClasses), `dark mode applied (html class: "${darkClasses}")`);
  check(initialBg !== lightBg, `light mode changes background: ${initialBg} -> ${lightBg}`);
  check(lightBg !== darkBg, `dark mode changes background: ${lightBg} -> ${darkBg}`);

  // Content must remain visible and readable in BOTH themes.
  const themeTextColors: Record<string, string> = {};
  for (const [name, themeButton] of [['light', '#theme-light'], ['dark', '#theme-dark']] as const) {
    await page.locator(themeButton).click({ timeout: 5000 });
    await page.waitForTimeout(300);
    const readable = await page.evaluate((mode) => {
      const probe = document.createElement('div');
      probe.className = 'text-slate-900 dark:text-white';
      probe.textContent = 'probe';
      document.body.appendChild(probe);
      const color = getComputedStyle(probe).color;
      probe.remove();
      const bg = getComputedStyle(document.body).backgroundColor;
      return { color, bg, mode };
    }, name);
    themeTextColors[name] = readable.color;
    check(
      Boolean(readable.color && readable.color !== 'rgba(0, 0, 0, 0)'),
      `${name} mode renders non-transparent text (${readable.color} on ${readable.bg})`,
    );
  }
  check(themeTextColors.light !== themeTextColors.dark, 'light and dark themes apply different foreground text colors');

  const afterThemeText = await page.locator('body').innerText();
  check(afterThemeText.length > 100, 'content still visible after theme switch');
  const shotTheme = join(tmpdir(), `calcora-theme-${darkClasses.includes('dark') ? 'dark' : 'light'}.png`);
  await page.screenshot({ path: shotTheme, fullPage: false });
  console.log(`  screenshot: ${shotTheme}`);

  // ------------------------------------------------------------------
  console.log('\n[5] Network isolation');
  const cloudCalls = externalRequests.filter((entry) =>
    /generativelanguage|gemini|openai|api\.openai|anthropic|groq|openrouter|api\.inference|cloudfoundry/i.test(entry),
  );
  check(cloudCalls.length === 0, `no cloud LLM requests observed${cloudCalls.length ? `: ${cloudCalls.join(', ')}` : ''}`);
  check(externalRequests.length === 0, `no external network requests observed${externalRequests.length ? `: ${externalRequests.join(', ')}` : ''}`);
  console.log(`  external requests seen: ${externalRequests.length ? externalRequests.join(' | ') : 'none'}`);

  const fatalErrors = consoleErrors.filter((e) => !/favicon|Download the React DevTools|source map/i.test(e));
  check(fatalErrors.length === 0, `no fatal console errors${fatalErrors.length ? `: ${fatalErrors.slice(0, 3).join(' | ')}` : ''}`);
  check(httpErrors.length === 0, `no HTTP error responses${httpErrors.length ? `: ${httpErrors.join(' | ')}` : ''}`);
  check(failedRequests.length === 0, `no failed network requests${failedRequests.length ? `: ${failedRequests.slice(0, 3).join(' | ')}` : ''}`);

  await browser.close();

  console.log(`\nBrowser checks passed: ${passed}, failed: ${failures.length}`);
  if (failures.length) {
    console.log('Failures:');
    for (const f of failures) console.log(`  - ${f}`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
