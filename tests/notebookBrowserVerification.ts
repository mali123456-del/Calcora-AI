/**
 * Real-browser QA for the Notebook workspace and the adaptive/agent API surface.
 *
 * The notebook is a new user-facing surface, and its central honesty guarantee is that an
 * unverified entry is never presented as verified. That claim is only worth something if
 * the rendered DOM says so, so this drives the actual UI rather than asserting on the
 * service alone.
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

  // ------------------------------------------------------------------
  console.log('\n[1] Notebook navigation and empty state');
  await page.locator('#tab-notebook').click({ timeout: 15000 });
  await page.waitForSelector('[data-testid="notebook-panel"]', { timeout: 15000 });
  check(true, 'Notebook is reachable from the primary navigation');
  const emptyState = await page.locator('[data-testid="notebook-panel"]').innerText();
  check(/No notebooks yet/i.test(emptyState), 'an empty notebook shows an honest empty state');

  // ------------------------------------------------------------------
  console.log('\n[2] Create a notebook and add a verified calculation');
  await page.locator('#notebook-title').fill('Quadratics revision');
  await page.getByRole('button', { name: /Create notebook/ }).click();
  await page.waitForTimeout(500);
  const afterCreate = await page.locator('[data-testid="notebook-panel"]').innerText();
  check(/Quadratics revision/.test(afterCreate), 'the created notebook is listed');
  check(/This notebook is empty/i.test(afterCreate), 'a new notebook reports itself empty');

  await page.locator('#notebook-entry-text').fill('2x + 4 = 10');
  await page.getByRole('button', { name: /Add to notebook/ }).click();
  await page.waitForTimeout(600);
  const afterEntry = await page.locator('[data-testid="notebook-panel"]').innerText();
  check(/2x \+ 4 = 10/.test(afterEntry), 'the calculation is stored and shown');
  check(/\bVerified\b/.test(afterEntry), 'a deterministically solved equation is labelled Verified');

  // ------------------------------------------------------------------
  console.log('\n[3] An unverified entry is never presented as verified');
  await page.locator('#notebook-entry-type').selectOption('note');
  await page.locator('#notebook-entry-text').fill('I think the discriminant always tells you the roots are irrational');
  await page.getByRole('button', { name: /Add to notebook/ }).click();
  await page.waitForTimeout(600);
  const withNote = await page.locator('[data-testid="notebook-panel"]').innerText();
  check(/Not verified/i.test(withNote), 'a non-computational note is labelled Not verified');

  // Scope to the entry cards so the summary statistics labels are not counted as badges.
  const entryTexts = await page.locator('[data-testid="notebook-panel"] article').allInnerTexts();
  const verifiedEntries = entryTexts.filter((t: string) => /\bVerified\b/.test(t) && !/Not verified/.test(t));
  const unverifiedEntries = entryTexts.filter((t: string) => /Not verified/.test(t));
  check(entryTexts.length === 2, `two entry cards are rendered, found ${entryTexts.length}`);
  check(verifiedEntries.length === 1, `exactly one entry is Verified, found ${verifiedEntries.length}`);
  check(unverifiedEntries.length === 1, `exactly one entry is Not verified, found ${unverifiedEntries.length}`);

  // ------------------------------------------------------------------
  console.log('\n[4] Notebook state persists across a reload');
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('#tab-notebook').click({ timeout: 15000 });
  await page.waitForSelector('[data-testid="notebook-panel"]', { timeout: 15000 });
  await page.waitForTimeout(600);
  const afterReload = await page.locator('[data-testid="notebook-panel"]').innerText();
  check(/Quadratics revision/.test(afterReload), 'the notebook persists across a reload');
  check(/2x \+ 4 = 10/.test(afterReload), 'entries persist across a reload');

  // ------------------------------------------------------------------
  console.log('\n[5] Notebook state does not disturb the calculator');
  await page.locator('#tab-calculator').click({ timeout: 15000 });
  await page.waitForTimeout(500);
  const display = page.locator('[data-testid="display-expression"], #display-expression, input#expression, .font-mono-math').first();
  const calcVisible = await page.locator('#tab-calculator').isVisible();
  check(calcVisible, 'the calculator still renders after notebook use');
  check(await display.count() > 0, 'the calculator display is still present');

  // ------------------------------------------------------------------
  console.log('\n[6] Adaptive Tutor + Agent endpoints over HTTP');
  const agent = await page.evaluate(async () => {
    const response = await fetch('/api/ai/math-agent', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ goal: 'Solve 3x - 4 = 11' }),
    });
    return { status: response.status, body: await response.json() };
  });
  check(agent.status === 200, `agent endpoint responds, got ${agent.status}`);
  check(agent.body.deterministicResult === '5', `agent solves 3x-4=11, got ${agent.body.deterministicResult}`);
  check(agent.body.verification?.status === 'PASS', `agent verifies by ${agent.body.verification?.method}`);
  check(agent.body.agent?.bounded === true, 'the agent reports itself as bounded');

  const plan = await page.evaluate(async () => {
    const response = await fetch('/api/ai/learning/plan', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        events: [
          { id: 'q1', conceptId: 'alg-quadratic-formula', topic: 'Algebra', difficulty: 'beginner', outcome: 'incorrect', hintLevelUsed: 0, mode: 'practice', timestamp: 1 },
          { id: 'q2', conceptId: 'alg-quadratic-formula', topic: 'Algebra', difficulty: 'beginner', outcome: 'incorrect', hintLevelUsed: 1, mode: 'practice', timestamp: 2 },
        ],
        count: 3,
      }),
    });
    return { status: response.status, body: await response.json() };
  });
  check(plan.status === 200, `learning plan responds, got ${plan.status}`);
  check(
    plan.body.analysis?.weakConcepts?.includes('alg-quadratic-formula'),
    `the weak concept is identified in the browser, got ${JSON.stringify(plan.body.analysis?.weakConcepts)}`,
  );
  check(plan.body.practice?.items?.length > 0, 'targeted practice is returned');
  check(
    plan.body.practice.items.some((item: any) => item.conceptId === 'alg-quadratic-formula'),
    'practice targets the weak concept over HTTP',
  );

  // ------------------------------------------------------------------
  console.log('\n[7] Empty-state honesty over HTTP');
  const emptyPlan = await page.evaluate(async () => {
    const response = await fetch('/api/ai/learning/plan', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ events: [] }),
    });
    return response.json();
  });
  check(emptyPlan.analysis?.overallAccuracy === null, 'an empty history reports null accuracy, not 0');
  check(Array.isArray(emptyPlan.analysis?.weakConcepts) && emptyPlan.analysis.weakConcepts.length === 0,
    'an empty history invents no weak concepts');

  const fatal = consoleErrors.filter((e) => !/favicon|DevTools|source map/i.test(e));
  check(fatal.length === 0, `no fatal console errors${fatal.length ? `: ${fatal.slice(0, 2).join(' | ')}` : ''}`);
  check(httpErrors.length === 0, `no HTTP error responses${httpErrors.length ? `: ${httpErrors.join(' | ')}` : ''}`);

  await browser.close();
  console.log(`\nNotebook + adaptive browser checks passed: ${passed}, failed: ${failures.length}`);
  if (failures.length) {
    for (const f of failures) console.log(`  - ${f}`);
    process.exit(1);
  }
}

main().catch((error) => { console.error(error); process.exit(1); });
