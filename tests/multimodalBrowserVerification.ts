/**
 * Focused real-browser check for the multimodal recognition surface.
 *
 * `browserVerification.ts` covers the PDF path but not Scan Problem or Digital Ink.
 * This verifies the two tabs that previously only recorded a filename now perform a
 * real recognition pipeline and report an honest state:
 *
 *   - no provider configured -> visible "unavailable" explanation, no fabricated math
 *   - the deterministic engine is what verifies any transcript, not the provider
 *   - voice input reports a non-math verdict for non-math speech
 */
import { chromium } from 'playwright-core';

const BASE = process.env.CALCORA_BASE ?? 'http://localhost:3000';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

let passed = 0;
const failures: string[] = [];
function check(condition: boolean, message: string): void {
  if (condition) { passed += 1; console.log(`  PASS  ${message}`); }
  else { failures.push(message); console.log(`  FAIL  ${message}`); }
}

async function openStudio(page: any): Promise<void> {
  await page.locator('#tab-home').click({ timeout: 15000 });
  await page.getByRole('button', { name: /Scan \/ Voice \/ Ink/ }).click({ timeout: 15000 });
  await page.waitForTimeout(800);
}

async function main() {
  const browser = await chromium.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const consoleErrors: string[] = [];
  const httpErrors: string[] = [];
  page.on('console', (m: any) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', (e: any) => consoleErrors.push(`pageerror: ${e.message}`));
  page.on('response', (r: any) => { if (r.status() >= 400) httpErrors.push(`${r.status()} ${r.url()}`); });

  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 60000 });
  await openStudio(page);

  // ------------------------------------------------------------------
  console.log('\n[1] Scan Problem tab');
  check(await page.getByRole('heading', { name: /Camera \/ Image Scanner/ }).count() > 0, 'Scan Problem tab renders');
  const imageInput = page.locator('input[type=file][accept*="image" i]').first();
  check(await imageInput.count() > 0, 'image file input is present');

  if (await imageInput.count() > 0) {
    // A 1x1 PNG: real bytes, so the pipeline actually runs rather than short-circuiting.
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    );
    await imageInput.setInputFiles({ name: 'homework.png', mimeType: 'image/png', buffer: png });
    await page.waitForTimeout(1500);
    const text = await page.locator('body').innerText();
    check(/no OCR or vision provider is configured|unavailable/i.test(text),
      'image selection reports the honest unavailable state');
    check(!/\bx\s*=\s*\d/.test(text), 'no math is fabricated from an unreadable image');
    check(!/verified by/i.test(text), 'no result is claimed as verified without a provider');
  }

  // ------------------------------------------------------------------
  console.log('\n[2] Digital Ink tab');
  await page.getByRole('button', { name: /Digital Ink/ }).click({ timeout: 10000 });
  await page.waitForTimeout(500);
  check(await page.locator('canvas[aria-label="Math handwriting canvas"]').count() > 0, 'ink canvas renders');
  const recognize = page.getByRole('button', { name: /Recognize/ });
  check(await recognize.count() > 0, 'a Recognize action exists for handwriting');

  if (await recognize.count() > 0) {
    // Drawing is disabled until a stroke is started, so the button must start disabled.
    check(await recognize.isDisabled(), 'Recognize is disabled before any ink is drawn');
  }

  // ------------------------------------------------------------------
  console.log('\n[3] Voice Math verdict for non-math speech');
  await page.getByRole('button', { name: /Voice Math/ }).click({ timeout: 10000 });
  await page.waitForTimeout(500);
  const transcript = page.locator('textarea[aria-label="Math voice transcript"]');
  check(await transcript.count() > 0, 'voice transcript box renders');

  if (await transcript.count() > 0) {
    const send = page.locator('button', { hasText: 'Send transcript to Tutor' }).first();
    check(await send.isDisabled(), 'Send is disabled with no transcript');
    await transcript.fill('what is the weather like today');
    await page.waitForTimeout(600);
    const verdict = await page.locator('body').innerText();
    check(/No mathematical expression was detected/i.test(verdict),
      'non-math speech is reported instead of forwarded');
    check(await send.isDisabled(), 'Send stays disabled for non-math speech');
    await transcript.fill('2x + 4 = 10');
    await page.waitForTimeout(600);
    check(!(await send.isDisabled()), 'Send enables for a genuine math expression');
  }

  const fatal = consoleErrors.filter((e) => !/favicon|DevTools|source map/i.test(e));
  check(fatal.length === 0, `no fatal console errors${fatal.length ? `: ${fatal.slice(0, 2).join(' | ')}` : ''}`);
  check(httpErrors.length === 0, `no HTTP error responses${httpErrors.length ? `: ${httpErrors.join(' | ')}` : ''}`);

  await browser.close();
  console.log(`\nMultimodal browser checks passed: ${passed}, failed: ${failures.length}`);
  if (failures.length) {
    for (const f of failures) console.log(`  - ${f}`);
    process.exit(1);
  }
}

main().catch((error) => { console.error(error); process.exit(1); });
