# Calcora UI Redesign & Accessibility Audit

**Scope:** Phase 2 (UI redesign) and the accessibility half of Phase 12.
**Method:** every claim below is either a measured DOM/CSS result from a live
session against `http://localhost:3000`, or a stated static finding. Nothing is
inferred from intent.

**Status legend:** `PASS` · `PARTIAL` · `FAIL` · `NOT VERIFIED`

---

## 1. What was changed

| # | Change | Status | Evidence |
|---|--------|--------|----------|
| 1 | Design-token layer added to `src/index.css` (`--cc-*` colour, radius, elevation, type, rhythm) | PASS | `src/index.css`; components consume tokens instead of ad-hoc values |
| 2 | `Header.tsx` rebuilt as a two-tier shell: identity + global toolbar, then a grouped module rail (`Hub · Compute · Analyze · Learn · Convert · Lab`) | PASS | live DOM: 19 tabs, each exactly once, none hidden |
| 3 | `AdvancedMathDashboard.tsx` rewritten — single restrained accent wash, unified icon tiles | PASS | live DOM: 22 `.cc-card-hover` controls, 4 honest `Not implemented` tiles retained |
| 4 | Typography floor raised to 11px across 14 component files | PASS | live scan: **0** text nodes below 11px anywhere in the app |
| 5 | Non-semantic accent colours (`indigo` / `purple` / `violet`) collapsed into the single brand accent across 19 files | PASS | `Select-String` count after change: **0** remaining (excl. one historical comment) |
| 6 | Filled buttons moved `cyan-600` → `cyan-700`, hover `cyan-700` → `cyan-800` | PASS | white on `cyan-600` = 3.68:1 (fails AA); white on `cyan-700` = 5.44:1 (passes) |
| 7 | `hover:bg-cyan-500` corrected on the 10 buttons that pair it with `text-white` | PASS | white on `cyan-500` = 2.28:1 |
| 8 | Design tokens re-shaded one step where measurement demanded it | PASS | see §2 |
| 9 | **`@custom-variant light` registered** — see §3 | PASS | this was the single largest defect found |

---

## 2. Token changes driven by measurement

Every value below was chosen against a measured ratio, not by taste.

| Token | Was | Now | Measured reason |
|-------|-----|-----|-----------------|
| `--cc-accent` (light) | `#0891b2` | `#0e7490` | cyan-600 is 3.68:1 on white and carries 11–12px chip/nav/segmented text. cyan-700 is 5.44:1 |
| `--cc-accent-hover` (light) | `#0e7490` | `#155e75` | keeps one clear step below the new accent |
| `--cc-accent-soft` (light) | `rgba(…,0.10)` | `rgba(…,0.07)` | the tint sits *behind* accent text; lightening it lifts `.cc-chip-accent` from 4.47:1 to ~4.7:1 |
| `--cc-text-faint` (light) | `#64748b` | `#5b6b80` | `#64748b` is 4.34:1 on `--cc-surface-2` (needs 4.5). `#5b6b80` is 4.86:1 |
| `--cc-text-faint` (dark) | `#64748b` | `#8795ac` | 4.24:1 on `--cc-surface` and 4.19:1 on `--cc-surface-2`, both below AA. `#8795ac` is 4.82:1 |
| `--cc-success` (light) | `#059669` | `#047857` | emerald-600 on its own tint = 3.26:1. emerald-700 = 4.75:1 |
| `--cc-warning` (light) | `#b45309` | `#92400e` | amber-700 on its own tint = 4.26:1. amber-800 = 6.41:1 |
| `--cc-info` (both) | `#4f46e5` / `#a5b4fc` | `#0369a1` / `#7dd3fc` | last remaining indigo; re-pointed to sky so the app has exactly one brand accent |

---

## 3. The `light:` variant defect — largest single find

`src/hooks/useTheme.ts` has always written the theme to the document root:

```ts
root.classList.remove('dark');
root.classList.add('light');
```

`src/index.css` declared `@custom-variant dark (&:where(.dark, .dark *))` but
**never declared a `light` variant**. Tailwind therefore never generated a single
`light:*` rule, so **all 91 `light:` classes in the codebase were dead**. Light
mode silently fell back to dark-mode styling in every one of those places.

This is not cosmetic. Measured directly in light mode before the fix:

```
element : keypad digit button ("7")
color   : rgb(255, 255, 255)          ← white
bg      : oklab(0.279 … / 0.4)        ← bg-slate-800/40 over a white page
contrast: ~2.3:1                      ← white digits on a grey chip
```

The `light:bg-*` / `light:text-*` overrides that would have prevented this
existed in the JSX and simply never applied.

**Fix:** one line —
`@custom-variant light (&:where(.light, .light *));`

**Verified at two independent levels:**

1. **Artefact level** — the *shipped* production bundle `dist/assets/index-*.css` now contains
   **24 `.light` rules alongside 129 `.dark` rules**. Before the fix the `.light` count was **0**.
2. **Runtime level** — both themes resolve to internally consistent values
   (read directly from `getComputedStyle`):

| | `<html>` class | body bg | `--cc-accent` | `--cc-text-muted` | `.cc-seg-btn` |
|---|---|---|---|---|---|
| dark | `dark` | `rgb(2, 6, 23)` | `#22d3ee` | `#94a3b8` | `rgb(34,211,238)` on `rgb(15,23,42)` ✓ |
| light | `light` | `rgb(247, 249, 251)` | `#0e7490` | `#475569` | `rgb(14,116,144)` on `rgb(255,255,255)` ✓ |

---

## 4. Structural verification (live DOM)

| Check | Result |
|-------|--------|
| Tabs present, exactly once, none hidden | **19/19** |
| Group distribution | Hub 1 · Compute 5 · Analyze 4 · Learn 4 · Convert 4 · Lab 1 |
| Landmarks `banner` / `nav` / `main` | 1 each |
| Single `h1` | yes |
| Buttons without an accessible name | **0** on the shell surface first pass — but the exhaustive 19-tab audit (§4b) later found **34** unnamed controls, since fixed |
| Anchor elements without `href` | **0** |
| Text below 11px | **0** |
| Horizontal overflow | none |
| Console errors | none |
| All `#theme-*`, `#angle-mode-*`, `#btn-open-*` controls present and visible | yes |
| Navigation targets wired | all 19 resolve |

---

## 4b. Phase 9 — runtime control audit (all 19 tabs)

The shell-level check above was **not** sufficient evidence for "every control is
usable", so a dedicated gate was added: `tests/controlAccessibility.ts`. It walks
all 19 tabs, enumerates every `button, a[href], input, select, textarea,
[role=button], [role=tab], [onclick]`, and computes the accessible name **in spec
order** (aria-labelledby → aria-label → associated `<label>` → wrapping `<label>`
→ own text → title/placeholder/alt), exempting controls hidden from assistive
technology (`display:none`, `visibility:hidden`, `aria-hidden`, `type=hidden`).

Like `browserVerification.ts` and `exeSmokeTest.ts` it needs a live dev server and
Chrome, so it is deliberately **not** a `*.test.ts` and is therefore not collected
by `scripts/run-test-sweep.mjs`.

**Measured, RED-first.** The first run failed with exit 1:

| Metric | RED (before) | GREEN (after) |
|---|---|---|
| Tabs audited | 19 | 19 |
| Controls enumerated | 916 | 916 |
| With an accessible name | 882 | **916** |
| **Unnamed (failing)** | **34** | **0** |
| Console errors | 0 | 0 |
| Gate exit code | **1** | **0** |

Distribution of the 34, traced to their components:

| Tab | Count | Root cause |
|---|---|---|
| formulas | 13 | icon-only favourite `<Star>` buttons with no `aria-label` |
| matrix | 9 | matrix cell `<input>`s with no label |
| programmer | 8 | 4 icon-only copy buttons + 4 base-value inputs |
| engineering | 2 | `pwrV`/`pwrI` — visible `<label>` sibling never associated via `htmlFor` |
| finance | 2 | `pctA`/`pctB` — same unassociated-`<label>` pattern |

An intermediate correction removed **1 false positive**: the multimodal file input
*is* wrapped in a `<label>`, and my first pass had not implemented implicit-label
lookup. The other 34 held up.

**Fixes** — `aria-label` + `aria-pressed` on the star buttons, `aria-label` on
matrix cells and base-value inputs, and genuine `htmlFor`/`id` association (not a
patched `aria-label`) where a real label already existed.

**Also measured, but explicitly *not* failures:**

- **5 disabled controls** (calculator `MC`/`MR`, AI `Check Step`/`Ask`, practice
  `Submit Answer`) were verified as *gated*, not stuck: `Ask` flips
  `disabled=true → false` when the composer gains text; `MC`/`MR` start disabled,
  enable on `M+`, and re-disable on `MC`. My first attempt to report `MC`/`MR` as
  broken was **my own test's fault** — it pressed `M+` with an empty display, and
  storing nothing is correct.
- **4 zero-size controls**, all with `zeroSizeVisible = 0` — i.e. every one sits
  inside a `display:none`/`visibility:hidden` ancestor (collapsed calculator panel,
  hidden history drawer). No layout defect.

Evidence: `control-accessibility-report.json` (repo root), 916/916 named.

---

## 5. PARTIAL — measured contrast backlog

An automated WCAG audit was run over **19 tabs × 2 themes**, compositing alpha and
converting Tailwind v4's `oklch()`/`oklab()` values to sRGB.

> **Result: 397 failing text nodes across 134 distinct root causes.**

These are **overwhelmingly pre-existing** — they are Tailwind's own palette steps
(`slate-400`, `cyan-500`, `cyan-400`) used as "muted" text, which are legible on
the dark palette and fail on white. They are *not* regressions from this
redesign; the redesign's own surfaces (header, dashboard, tokens) measure clean.

### Largest clusters

| Cluster | Ratio | Needs | Rendered nodes |
|---|---|---|---|
| `text-slate-400` on white (light) | **2.61** | 4.5 | ~90 |
| `text-cyan-500` on white (light) | **2.33** | 4.5 | ~45 |
| `text-cyan-400` / `text-cyan-300` on light surfaces | **1.6–1.8** | 4.5 | ~12 |
| `.cc-chip-accent` before the token fix | 4.47 | 4.5 | 19 — **fixed** |
| dark-mode `--cc-text-faint` | 4.19–4.24 | 4.5 | ~20 — **fixed** |

### Why a central override was rejected

Every one-shot CSS override was modelled before being discarded, because it
trades failures rather than removing them. For example:

```css
.light .text-slate-500 { color: #475569; }   /* 4.35 -> 7.0 on white  */
```

but `text-slate-500` is *also* used on dark tiles inside light mode
(`multimodal: "Speak naturally"`, measured at 3.69 on `rgb(1.8,26.5,45.8)`), where
`#475569` drops it to ~2.4:1. The same conflict applies to `slate-400` on the
mid-tone tiles in the AI panel.

So the correct fix is per-component: give each muted label an explicit
`light:` / `dark:` pairing. That is ~40 files and is recorded here as prioritised
work rather than attempted unsafely at the end of a run.

**Status: PARTIAL.** The defects are measured, ranked, and reproducible; they are
not fixed.

### Reproduction

Re-run the audit by loading the app, iterating `#tab-*` in both themes with the
body colour transition disabled (`document.body.style.transitionDuration='0ms'`),
and computing WCAG relative luminance per text node against its composited
background stack, converting `oklch(L C H)` → OKLab → linear sRGB → sRGB.

---

## 6. Regression state

| Gate | Result |
|------|--------|
| `npx tsc --noEmit` | **0 issues** |
| `node scripts/run-test-sweep.mjs` | **68/68 PASS**, exit 0 |
| Model-free tutor benchmark | **16/16, 100%**, all 10 groups at or above threshold |

No test asserts on colour classes or type sizes, so none of the above weakened a
gate.
