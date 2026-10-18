/**
 * controlAccessibility.ts — accessibility gate for every interactive control on
 * all 19 module tabs.
 *
 * Rule under test (WCAG 2.1 SC 4.1.2 Name, Role, Value): every user interface
 * component exposed to assistive technology must have an accessible name. The
 * accessible-name computation here follows the spec order:
 *   1. aria-labelledby  2. aria-label  3. associated <label> (element.labels)
 *   4. wrapping <label>  5. own text content  6. title / placeholder / alt.
 * Controls hidden from AT (display:none / visibility:hidden / aria-hidden /
 * type=hidden) are exempt, because they are not exposed to name in the first
 * place — exempting them is what keeps this from reporting false positives on
 * collapsed panels and file inputs that a visible button drives.
 *
 * It also census-es disabled and zero-size controls. Those are reported for
 * information but are NOT failures: disabled-until-prerequisites (memory empty,
 * composer empty, no answer chosen) is correct behaviour, and collapsed-panel
 * controls legitimately have no box.
 *
 * Excluded from scripts/run-test-sweep.mjs by design: that sweep collects only
 * `*.test.ts` and this needs a running dev server plus Chrome, so it is run on
 * its own — exactly like browserVerification.ts and exeSmokeTest.ts.
 *
 * Usage:  node node_modules/tsx/dist/cli.mjs tests/controlAccessibility.ts
 * Env:    CALCORA_BASE (default http://localhost:3000)
 * Exit:   0 all controls named  |  1 unnamed control found  |  2 harness error
 */
import { chromium } from 'playwright-core';
import { writeFileSync } from 'node:fs';

const BASE = process.env.CALCORA_BASE ?? 'http://localhost:3000';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const TABS = [
  'home', 'calculator', 'equations', 'calculus', 'matrix', 'graph', 'statistics',
  'datalab', 'programmer', 'engineering', 'ai', 'practice', 'notebook', 'multimodal',
  'units', 'finance', 'currency', 'formulas', 'developer',
] as const;

type TabRow = {
  tab: string;
  controls: number;
  named: number;
  unnamedCount: number;
  unnamed: string[];
  hiddenUnnamed: number;
  disabled: number;
  disabledLabels: string[];
  zeroSize: number;
  zeroSizeVisible: number;
  errorOverlay: boolean;
  ariaCurrent: string;
  bodyChars: number;
};

/** Runs in the page; must stay free of named function bindings (esbuild keepNames
 *  serialises them into the page where `__name` does not exist). */
const CENSUS = () => {
  const nameOf = (el: Element): string => {
    const al = el.getAttribute('aria-label');
    if (al && al.trim()) return al.trim();
    const lb = el.getAttribute('aria-labelledby');
    if (lb) {
      const txt = lb.split(/\s+/).map((i) => {
        const n = document.getElementById(i);
        return n ? (n.textContent || '') : '';
      }).join(' ').trim();
      if (txt) return txt;
    }
    const labelled = (el as HTMLInputElement).labels;
    if (labelled && labelled.length) {
      const txt = Array.from(labelled).map((l) => (l.textContent || '').trim()).join(' ').trim();
      if (txt) return txt.replace(/\s+/g, ' ').slice(0, 60);
    }
    const wrap = el.closest('label');
    if (wrap) {
      const txt = (wrap.textContent || '').trim();
      if (txt) return txt.replace(/\s+/g, ' ').slice(0, 60);
    }
    const tx = (el.textContent || '').trim();
    if (tx) return tx.replace(/\s+/g, ' ').slice(0, 60);
    for (const k of ['title', 'placeholder', 'alt']) {
      const v = (el.getAttribute(k) || '').trim();
      if (v) return v.slice(0, 60);
    }
    return '';
  };

  // Hidden from assistive technology => exempt from the naming requirement.
  const hiddenFromAT = (el: Element): boolean => {
    const input = el as HTMLInputElement;
    if (input.type === 'hidden') return true;
    if (el.closest('[aria-hidden="true"]')) return true;
    let n: Element | null = el;
    while (n) {
      const cs = getComputedStyle(n);
      if (cs.display === 'none' || cs.visibility === 'hidden') return true;
      n = n.parentElement;
    }
    return false;
  };

  // Zero box but not hidden by CSS = layout defect; zero box while hidden = fine.
  const hiddenByCss = (el: Element): boolean => {
    let n: Element | null = el;
    while (n) {
      const cs = getComputedStyle(n);
      if (cs.display === 'none' || cs.visibility === 'hidden') return true;
      n = n.parentElement;
    }
    return false;
  };

  const sel = 'button, a[href], input, select, textarea, [role="button"], [role="tab"], [onclick]';
  const els = Array.from(document.querySelectorAll(sel));

  const unnamed: string[] = [];
  let hiddenUnnamed = 0;
  const disabled: string[] = [];
  let zeroSize = 0;
  let zeroSizeVisible = 0;
  let named = 0;

  for (const el of els) {
    const nm = nameOf(el);
    const head = el.outerHTML.replace(/\s+/g, ' ').slice(0, 130);
    if (nm) {
      named += 1;
    } else if (hiddenFromAT(el)) {
      hiddenUnnamed += 1;
    } else {
      let anc = el.parentElement;
      let ctx = '';
      for (let up = 0; anc && up < 6; up++, anc = anc.parentElement) {
        const t = (anc.textContent || '').replace(/\s+/g, ' ').trim();
        if (t) { ctx = t.slice(0, 60); break; }
      }
      unnamed.push([ctx ? `@${ctx}` : '', head].filter(Boolean).join(' :: '));
    }

    const html = el as HTMLInputElement;
    if (html.disabled === true) disabled.push(nm || '(unnamed)');

    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) {
      zeroSize += 1;
      if (!hiddenByCss(el)) zeroSizeVisible += 1;
    }
  }

  return {
    total: els.length,
    named,
    unnamed,
    hiddenUnnamed,
    disabled,
    zeroSize,
    zeroSizeVisible,
    overlay: Boolean(document.querySelector('vite-error-overlay')),
    current: (document.querySelector('nav button[aria-current="page"]') || { id: '' }).id,
    body: document.body.innerText.length,
  };
};

async function main(): Promise<void> {
  const browser = await chromium.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const page = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    .then((c) => c.newPage());

  const consoleErrors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200)); });
  page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message.slice(0, 200)));

  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.locator('#tab-home').waitFor({ state: 'visible', timeout: 30000 });
  // tsx/esbuild keepNames wraps named function bindings inside evaluate bodies in
  // `__name(...)`, which does not exist in the page. Inject it as a raw string so
  // esbuild cannot transform it, and every later evaluate is safe.
  await page.evaluate('window.__name = function () { return arguments[0]; }; true;');

  const rows: TabRow[] = [];
  const failures: string[] = [];

  console.log('controlAccessibility — accessible-name gate over 19 tabs\n');

  for (const t of TABS) {
    const clicked = await page.evaluate((tab: string) => {
      const el = document.querySelector('#tab-' + tab) as HTMLElement | null;
      if (el) el.click();
      return Boolean(el);
    }, t);
    if (!clicked) failures.push(`tab-${t}: navigation control missing from DOM`);
    await page.waitForTimeout(700);

    const r = await page.evaluate(CENSUS);

    const row: TabRow = {
      tab: t,
      controls: r.total,
      named: r.named,
      unnamedCount: r.unnamed.length,
      unnamed: r.unnamed,
      hiddenUnnamed: r.hiddenUnnamed,
      disabled: r.disabled.length,
      disabledLabels: r.disabled.slice(0, 8),
      zeroSize: r.zeroSize,
      zeroSizeVisible: r.zeroSizeVisible,
      errorOverlay: r.overlay,
      ariaCurrent: r.current,
      bodyChars: r.body,
    };
    rows.push(row);

    if (row.ariaCurrent !== `tab-${t}`) {
      failures.push(`${t}: aria-current is "${row.ariaCurrent || '(none)'}" after clicking #tab-${t}`);
    }
    if (row.errorOverlay) failures.push(`${t}: Vite error overlay present`);
    if (row.bodyChars < 400) failures.push(`${t}: body only ${row.bodyChars} chars (panel looks empty)`);
    for (const u of row.unnamed) failures.push(`${t}: no accessible name -> ${u}`);

    const flags = [
      row.unnamedCount ? `UNNAMED=${row.unnamedCount}` : null,
      row.hiddenUnnamed ? `hidden-unnamed=${row.hiddenUnnamed}` : null,
      row.disabled ? `disabled=${row.disabled}` : null,
      row.zeroSize ? `zero=${row.zeroSize}${row.zeroSizeVisible ? `(visible:${row.zeroSizeVisible})` : ''}` : null,
    ].filter(Boolean).join('  ');

    console.log(
      `  ${t.padEnd(12)} controls=${String(row.controls).padStart(3)} named=${String(row.named).padStart(3)}  ${flags || 'clean'}`,
    );
    for (const u of row.unnamed) console.log(`      ! ${u}`);
  }

  const totals = rows.reduce(
    (a, r) => ({
      controls: a.controls + r.controls,
      named: a.named + r.named,
      unnamed: a.unnamed + r.unnamedCount,
      hiddenUnnamed: a.hiddenUnnamed + r.hiddenUnnamed,
      disabled: a.disabled + r.disabled,
      zeroSize: a.zeroSize + r.zeroSize,
      zeroSizeVisible: a.zeroSizeVisible + r.zeroSizeVisible,
    }),
    { controls: 0, named: 0, unnamed: 0, hiddenUnnamed: 0, disabled: 0, zeroSize: 0, zeroSizeVisible: 0 },
  );

  const report = {
    timestamp: new Date().toISOString(),
    base: BASE,
    tabsAudited: rows.length,
    ...totals,
    consoleErrors: consoleErrors.length,
    failures,
    perTab: rows,
  };
  writeFileSync('control-accessibility-report.json', JSON.stringify(report, null, 2), 'utf8');

  console.log('\n--- summary ---');
  console.log(`  tabs audited          : ${report.tabsAudited}`);
  console.log(`  controls enumerated   : ${totals.controls}`);
  console.log(`  with accessible name  : ${totals.named}`);
  console.log(`  UNNAMED (failing)     : ${totals.unnamed}`);
  console.log(`  unnamed but hidden=AT : ${totals.hiddenUnnamed} (exempt)`);
  console.log(`  disabled (information): ${totals.disabled}`);
  console.log(`  zero-size (information): ${totals.zeroSize} (${totals.zeroSizeVisible} not hidden by CSS)`);
  console.log(`  console errors        : ${consoleErrors.length}`);
  if (consoleErrors.length) console.log('    ' + consoleErrors.slice(0, 5).join('\n    '));
  console.log(`  FAILURES              : ${failures.length}`);
  for (const f of failures.slice(0, 40)) console.log('    ! ' + f);
  console.log('  wrote control-accessibility-report.json');

  await browser.close();
  process.exit(failures.length ? 1 : 0);
}

main().catch((e) => {
  console.error('controlAccessibility harness error:', e?.message ?? e);
  process.exit(2);
});
