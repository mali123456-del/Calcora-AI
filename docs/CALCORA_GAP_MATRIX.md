# Calcora Gap Matrix — CURRENT vs COMPETITOR BEST vs TARGET

Decision layer for `docs/COMPETITIVE_RESEARCH_MATRIX_2026.md`. Date: 2026-10-02.

**CURRENT** is the *verified* state — 34 test suites green, 40 test files, 94 browser checks
passing, typecheck clean, `npm audit` 0 vulnerabilities, Windows EXE builds and launches. It is not
an aspiration. **COMPETITOR BEST** is the strongest public capability any researched product
claims. **TARGET** is the recommended Calcora state, each with an acceptance gate.

State legend: `●` present · `◐` partial · `○` absent.
Effort: `S` ≤ 1 day · `M` 1–5 days · `L` 1–3 weeks · `XL` > 3 weeks.

---

## 1. The five gaps that actually decide the product

Ranked by (competitive severity × defensibility × implementation risk). Everything in §4 onward is
secondary to these five.

### GAP-01 · Misconception-driven hint selection — **P0, Effort M, Risk Low**

| | |
| --- | --- |
| **CURRENT** | ◐ `studentModel.ts` supplies observable signals; `practiceGenerator` advances at ≥0.85 accuracy, steps down below 0.5. The 5-level hint ladder is **fixed** — level is chosen by position, not by observed error. |
| **COMPETITOR BEST** | ◐–● Khanmigo, MathGPT, Axiom, Mathos select help against an expectation/misconception model. AutoTutor EMT and PEARL make misconception detection the pedagogical centre of gravity. MathGPT ships "check for understanding" checks that surface student thinking, available for math at launch. |
| **TARGET** | Hint level and hint *content* selected from the specific misconception detected in the student's attempt, not from attempt count. `studentModel` gains a `MisconceptionState` per concept: observed error class, evidence trail, and the hint rung that resolved it historically. |
| **Acceptance gate** | A test submits a signed-minus error, a distribution-of-operations error, and a sign-tracking error on the same concept. Each produces a *different* hint, and the hint names the specific error. Regression: the fixed ladder no longer appears in `tutorOrchestrator`. |
| **Why first** | Highest ratio of educational value to implementation risk in the entire matrix. The data (`mistakeStore.ts`, `studentModel.ts`) already exists. The 6,997-student Hamilton County trial found the tutor *slowed practice but improved post-mistake recovery* — recovery is the product thesis, and misconception-driven hints are the mechanism. |

### GAP-02 · OCR / vision provider — **P0, Effort L, Risk High**

| | |
| --- | --- |
| **CURRENT** | ○ `recognitionProviders.ts` defines a provider seam; `recognition.ts` returns an honest `unavailable`. Three surfaces (Scan Problem, Digital Ink, scanned PDF) are visibly disabled. |
| **COMPETITOR BEST** | ● Photomath (best-in-class), Symbolab, Gauth, MathGPT, Microsoft Math Solver, Socratic, Gemini, ChatGPT. Eight products treat capture as table stakes. |
| **TARGET** | A real engine behind the existing seam. Two admissible routes, and they are not mutually exclusive: (a) on-device OCR so the offline promise survives; (b) an explicitly consented cloud vision provider that is **disabled by default and visibly labelled** when active, degrading to `unavailable` — not to a silent guess. Recognized math must be normalized into the existing expression grammar and then pass the existing verification pipeline. **An unrecognized or low-confidence read must surface as low confidence, never as a solved problem.** |
| **Acceptance gate** | 60-image fixture set (printed, handwritten, mixed, rotated, low-light, multi-problem page) with per-image expected normalized expression. Suite asserts: ≥95% exact-normalization on printed, ≥85% on handwritten, and **100% correct `low-confidence` labelling** on deliberately ambiguous crops. A regression asserts no image path can produce a `verified` answer without passing `verificationPipeline`. |
| **Risk note** | This is the highest-risk item in the matrix and the one most likely to damage the product's core claim if done carelessly. A photo pipeline that returns a confident wrong expression is worse than no photo pipeline. **The verification gate is not optional here — it is the feature.** |

### GAP-03 · Parametric / polar / implicit graphing — **P0, Effort S, Risk Low**

| | |
| --- | --- |
| **CURRENT** | ○ `graphEngine.ts` is 2D implicit-only. The UI honestly labels these "Not implemented". |
| **COMPETITOR BEST** | ● WolframAlpha, GeoGebra, Symbolab. ● is the industry norm, and it is a visible absence in Calcora's graphing surface. |
| **TARGET** | Parametric `(x(t), y(t))`, polar `(r, θ)` and implicit `F(x,y)=0` on the existing 2D plotter. All three reduce to point sampling against the same renderer, so the marginal cost is sampler logic, not a new view. |
| **Acceptance gate** | Fixture per family with known analytic properties: `x=cos t, y=sin t` → unit circle, bounding box `[-1,1]²`; `r=1+cos θ` → cardioid with cusp at origin; `x²+y²=4` → circle radius 2. Sampler is density-parameterized and reproducible (same seed, same point set). |
| **Why cheap** | Smallest effort-to-competitiveness ratio in the matrix. Same renderer, same axes, same interaction model. Only 3D needs a new renderer. |

### GAP-04 · Wire the verified agent into the product, then expose its state — **P0, Effort M, Risk Low**

| | |
| --- | --- |
| **CURRENT** | ● The capability exists and is tested, but **it is not reachable from the product.** Import-graph audit: `src/services/mathAgent.ts` (19 KB, the bounded 8-step agent with `PASS`/`FAIL`/`UNKNOWN` and independent re-derivation) has **zero importers**. `src/verification/verificationPipeline.ts` and `src/verification/provenance.ts` likewise have **zero external consumers** — `verificationPipeline` is imported by nothing but itself, and `provenance` only by `verificationPipeline`. The live UI path is `AIAssistantPanel.tsx` → `src/utils/aiTutor.ts` (41.7 KB), which does **not** call the agent or the verification pipeline. `services/tutorOrchestrator.ts` (66.6 KB) is imported only by its own tests. So the independent-reverification claim is currently true of the **test suite**, not of the **application**. |
| **COMPETITOR BEST** | ○ **No researched product exposes a verification state at all.** This is why Calcora's moat is currently unrealised: the strongest differentiator in the architecture is invisible in the product. |
| **TARGET** | Two steps, in order. **(a) Wire** `mathAgent.ts` into the live tutor/solver path behind an interface, keeping the deterministic engine authoritative and keeping the local fallback. **(b) Expose** a visible, immutable verification badge on every answer: `VERIFIED` (with the independent re-derivation shown), `UNVERIFIED` (conceptual — cannot be numerically checked, stated as such), `FAILED` (with actual vs expected values), `UNAVAILABLE` (no engine coverage, no guess). A user can always answer "how do you know?" from the screen without opening a test file. Retire or fold in the duplicate orchestrator layers so there is one live tutor path. |
| **Acceptance gate** | Browser suite asserts the badge is present and correct in all four states, that `FAILED` displays both sides of the discrepancy, and that **no code path can render an answer with no badge**. An import-graph test asserts `mathAgent` and `verificationPipeline` each have at least one non-test consumer, so the wiring cannot silently regress to orphaned. |
| **Why it matters** | This is the single most defensible differentiator in the matrix, and it is already built and tested. GAP-04 is a wiring-and-surfacing task, not an engineering task. Anthropic's own documentation concedes that general assistants cannot be authoritative for mathematics — Calcora is the counter-example, and this is where that becomes true for a user instead of only in a test file. |

### GAP-05 · Post-mistake recovery benchmark — **P0, Effort M, Risk Low**

| | |
| --- | --- |
| **CURRENT** | ● Recovery-relevant signals are captured (mistake store, student model, mastery store). ○ **Nothing measures recovery.** There is no Calcora-specific evidence that the architecture produces the outcome the trial literature predicts it should. |
| **COMPETITOR BEST** | ◐ MMTutorBench (ACL 2026, 770 problems) classifies follow-ups as **Progressive** (linear next step), **Exploratory** (lateral clarification), **Introspective** (deep conceptual). Calcora's tutor handles Progressive continuity only. LLAMA LIMA is a living meta-analysis, not a per-product benchmark. |
| **TARGET** | A Calcora-owned recovery benchmark: for a fixed set of misconception seeds, measure attempts-to-recovery, whether the same error recurs, and whether the tutor re-asks the same question (a known LLM failure mode). Extend the tutor's turn classification to cover Exploratory and Introspective follow-ups, not just Progressive. |
| **Acceptance gate** | ≥ 40 seeded misconception cases. Benchmark fails if mean attempts-to-recovery regresses, or if any case shows the tutor repeating an identical question after a wrong answer. Exploratory/Introspective turns are classified and asserted. |
| **Why it matters** | Without this, GAP-01's educational value is a hypothesis. With it, it is a measured claim, and it is the evidence a competitive moat actually needs. |

---

## 2. Gap register — full

Ordered by the ten prioritization dimensions. **Sev** = severity, **Def** = defensibility (can a
competitor replicate it), **Risk** = implementation risk. Priority = `Sev × Def ÷ Risk`.

| # | Gap | Sev | Def | Risk | Priority | Effort |
| --- | --- | --- | --- | --- | --- | --- |
| 01 | Misconception-driven hint selection | HIGH | HIGH | LOW | **P0** | M |
| 02 | OCR / vision provider | HIGH | LOW | HIGH | **P0** | L |
| 03 | Parametric / polar / implicit graphing | HIGH | LOW | LOW | **P0** | S |
| 04 | Verified agent wired in + verification state surfaced in UI | HIGH | **HIGH** | LOW | **P0** | M |
| 05 | Post-mistake recovery benchmark | HIGH | **HIGH** | LOW | **P0** | M |
| 06 | MMTutorBench-style key-step eval suite | MED | MED | LOW | P1 | M |
| 07 | Method switcher ("choose your method") | MED | MED | LOW | P1 | M |
| 08 | Curriculum / standards alignment | MED | MED | MED | P1 | L |
| 09 | Accessibility / WCAG conformance verified | MED | MED | LOW | P1 | M |
| 10 | 3D visualization | MED | LOW | HIGH | P2 | XL |
| 11 | Real-time spoken tutor | MED | LOW | MED | P2 | L |
| 12 | Geometry construction workspace | MED | LOW | MED | P2 | L |
| 13 | Knowledge corpus depth (28 → target) | HIGH | **HIGH** | LOW | **P0** | M |
| 14 | Data Lab chart breadth | MED | LOW | LOW | P2 | M |
| 15 | Web search / citations | LOW | LOW | MED | P3 | L |
| 16 | Flashcards + spaced repetition | LOW | LOW | LOW | P3 | M |
| 17 | Academic-integrity lockdown tooling | LOW | LOW | MED | P3 | L |
| 18 | Generative 3D / simulation authoring | LOW | LOW | HIGH | P4 | XL |
| 19 | Classroom / instructor view | LOW | LOW | LOW | OUT | L |
| 20 | Automated video generation | LOW | LOW | HIGH | OUT | XL |

**Deliberately out of scope** (19, 20): both are enterprise/instructor or content-production
products, not single-learner desktop features. Recording them as `OUT` prevents them resurfacing
as unexamined requests later.

### GAP-13 detail — knowledge corpus depth · **P0**

This is listed at P0 despite not appearing in the earlier 7-product analysis, because expanding
research from 7 to 26 products changed the picture.

| | |
| --- | --- |
| **CURRENT** | `ALL_MATHEMATICS_KNOWLEDGE` = **28 items across 16 topics** (Arithmetic, Algebra, Geometry, Trigonometry, Calculus, Linear Algebra, Statistics, Probability, Number Theory, Mathematical Proofs, Complex Numbers, Differential Equations, Physics, Engineering, Discrete Mathematics, Financial Mathematics). Plus `ADDITIONAL_MATHEMATICS_KNOWLEDGE` (19) and `MATH_TUTOR_TRAINING_CORPUS` (19, **English only**). `tutorLanguages.ts` declares 116 languages (24 tier-A, 14 tier-B, 78 tier-C) but **only English has tutor training data**, so the declared breadth is not yet backed by grounded content. `MathKnowledgeItem` has **no `verificationStatus` field**. `MATH_DATASET_SOURCES` registers 8 external sources with usage typing. |
| **COMPETITOR BEST** | ● Quizlet: community-contributed sets, effectively unbounded. ● NotebookLM: arbitrary user documents. ● MathGPT: pre-loaded OER library + instructor uploads. ● Khanmigo: full Khan Academy curriculum. |
| **TARGET** | ≥ 120 original items across the existing 16 topics, each with definition, aliases, keywords, worked example, `alternativeMethods`, `solutionStrategies`, common misconceptions, and transfer links. Every item must gain a `verificationStatus` field — `MathKnowledgeItem` has no such field today, which is why corpus-grounded tutor answers cannot yet claim per-item verification. Tutor corpus to ≥ 60 examples covering all 24 tier-A languages, not English only, so declared language breadth is backed by grounded content rather than by UI affordance alone. |
| **Acceptance gate** | Per-item `verificationStatus` is present and non-null on 100% of items. Retrieval regression: for 100 probe queries, a relevant item ranks in the top 5 and an irrelevant one does not. No externally sourced text appears in any item — content is original. Every tier-A language has ≥ 1 tutor corpus example. |

---

## 3. Prioritization rationale across the ten dimensions

| Dimension | Reading |
| --- | --- |
| **Mathematical reliability** | Already the strongest asset. GAP-04 exposes it; GAP-05 proves it. Neither requires new math. |
| **Educational value** | GAP-01 and GAP-05 are the whole thesis. The trial evidence points at *recovery*, not speed, and Calcora is the only researched product with a persistent observable mistake store. |
| **Tutor intelligence** | Progressive-turn handling exists. Exploratory/Introspective classification is the concrete missing piece (GAP-05, GAP-06). |
| **Knowledge quality** | GAP-13. 28 items is a demo corpus. Per-item verification status is the structural fix, not raw item count. |
| **Usability** | GAP-03 is the visible absence. GAP-04 is the visible differentiator. Both are small. |
| **Privacy** | Already ● (zero outbound requests verified). No work needed. The *argument* needs sharpening: verification is a logical guarantee independent of deployment, so it holds with a cloud substrate too. |
| **Performance** | Math agent 8-step / 5s budget is verified and adequate. No gap. |
| **Accessibility** | GAP-09. Unverified WCAG is an unquantified risk, not a known failure. Cheap to resolve, and it is a procurement blocker for the school/instructor segment that competitors already serve. |
| **Product differentiation** | GAP-01 + GAP-04 + GAP-05 together form a position no researched product occupies: *Socratic, independently verified, recovery-measured, honest under unavailability, fully offline.* That is the pitch. |
| **Implementation risk** | GAP-02 is the only HIGH-risk item. Sequence it last among P0 work and ship it behind the existing provider seam with a hard confidence gate, so a bad read degrades to `unavailable` rather than to a confident error. |

---

## 4. Recommended execution order

**Wave 1 — verification moat (low risk, high defensibility).** GAP-04 comes first because two of
the other three items here are only *measurable* or *defensible* once the verified agent is on the
live path. Surfacing a verification state that the running app never computes would be theatre.

1. GAP-04a — wire `mathAgent` + `verificationPipeline` into the live tutor path; collapse duplicate orchestrator layers · M
2. GAP-04b — verification badge with the four states · S
3. GAP-13a — per-item `verificationStatus` across the corpus · M
4. GAP-05 — recovery benchmark + Exploratory/Introspective turn classification · M
5. GAP-01 — misconception-driven hint selection · M

**Wave 2 — closing visible absences.**

5. GAP-03 — parametric / polar / implicit graphing · S
6. GAP-09 — WCAG audit and remediation · M
7. GAP-13b — corpus expansion to ≥ 120 items, tutor corpus to ≥ 60 across 24 tier-A languages · M
8. GAP-07 — method switcher over existing `alternativeMethods` / `solutionStrategies` · M

**Wave 3 — evaluator and the multimodal bet.**

9. GAP-06 — key-step tutoring eval suite · M
10. GAP-02 — OCR/vision engine behind the seam, hard confidence gate · L

**Wave 4 — large surfaces.** GAP-08, GAP-10, GAP-11, GAP-12, GAP-14. Re-evaluate priority after
Wave 3, because GAP-02's measured accuracy will change the case for GAP-10 and GAP-11.

**Gate before every wave:** 34 suites green · typecheck clean · `npm audit` 0 · browser
verification 94/94 · Windows EXE builds and launches. No wave merges on a red suite, and no wave
ships without a new test that fails without the change.

---

## 5. What is explicitly not changing

To keep the moat intact while closing gaps:

- **The deterministic engine stays authoritative.** No gap in this matrix justifies routing
  computation through a model. GAP-02's recognized expression enters the same engine and the same
  verification pipeline as typed input.
- **`UNKNOWN` and `UNAVAILABLE` stay first-class outcomes.** No gap justifies a fallback guess.
- **The student model stays observation-only.** No gap justifies inferring psychological state.
  All 19 tutor-corpus examples and all 28 knowledge items remain original content.
- **Offline mode stays fully functional.** A cloud vision provider is opt-in, labelled, and
  disabled by default; with it disabled, the offline guarantee is unchanged.
- **No competitor content, dataset, or UI is copied.** `datasets.ts` usage typing is respected.
