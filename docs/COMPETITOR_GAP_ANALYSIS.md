# CALCORA AI — COMPETITOR GAP ANALYSIS

Researched 2026-10-02 from public vendor documentation and published sources. No proprietary
UI was copied and no product was ranked. Competitor capabilities are reported only where a
public source stated them.

## Sources consulted

| Product | Source basis |
| --- | --- |
| WolframAlpha | `reference.wolfram.com`, `wolframalpha.com/pro/step-by-step-math-solver` |
| GeoGebra | `geogebra.org` 2026 tools reference |
| Symbolab | `symbolab.com` product page, SourceForge comparison |
| MathGPT.ai | `mathgpt.ai/product/ai-tutor` (published 2026-03-10) |
| Mathos AI / Skill Builder | `mathgptpro.com`, `aimathtutor.in` |
| Axiom AI | `axiommathematics.com` |
| Socratic | `socraticapp.com` |
| Academic baselines | MMTutorBench (ACL 2026, 770 problems); PEARL (pedagogically aligned Socratic RL); AutoTutor EMT |

## Capability comparison

Legend: ● present · ◐ partial · ○ absent

| Capability | Calcora | WA | GeoGebra | Symbolab | MathGPT | Mathos | Axiom |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Symbolic/numeric authority | ● deterministic | ● | ● | ● | ◐ LLM | ◐ LLM | ◐ LLM |
| **Independently re-verified answer** | ● | ○ | ○ | ○ | ○ | ○ | ○ |
| Verification can report FAIL | ● | ○ | ○ | ○ | ○ | ○ | ○ |
| Step-by-step | ● | ● paywalled | ◐ | ● | ● | ● | ● |
| Multiple solution methods | ◐ | ● "Choose a Method" | ◐ | ◐ | ◐ | ◐ | ◐ |
| Progressive hints | ● 5 levels | ● | ○ | ◐ | ● | ● | ● |
| Socratic withholding | ● | ◐ | ○ | ◐ | ● dedicated mode | ● | ● core method |
| Check-work / mistake detection | ● | ◐ | ○ | ◐ | ● | ● | ● |
| Knowledge grounding | ● 28-item corpus | ● | ◐ | ◐ | ◐ | ◐ | ◐ curriculum |
| Adaptive difficulty | ● observed-only | ○ | ◐ | ● | ◐ | ● thresholds | ● |
| Practice generation | ● corpus-grounded | ◐ | ◐ | ● | ◐ | ● | ● |
| Quiz generation | ● | ○ | ◐ | ● | ◐ | ● | ◐ |
| Persistent student model | ● | ○ | ◐ classroom | ● analytics | ◐ | ◐ | ● |
| Notebook / workspace | ● | ◐ | ◐ | ○ | ◐ | ◐ | ◐ textbook |
| Agent / bounded orchestration | ● | ○ | ○ | ○ | ○ | ◐ | ○ |
| PDF grounding | ● | ○ | ○ | ○ | ◐ | ○ | ◐ |
| OCR / image scan | ○ provider seam only | ○ | ○ | ● | ● | ● | ● |
| Voice input | ● dictation | ○ | ○ | ○ | ● | ● real-time | ◐ |
| 2D graphing | ● | ● | ● | ● | ◐ | ◐ | ◐ |
| Parametric / implicit / polar | ○ | ● | ● | ● | ○ | ○ | ◐ |
| 3D visualization | ○ | ● | ● strong | ◐ | ○ | ○ | ○ |
| Dynamic geometry construction | ○ | ◐ | ● core strength | ◐ | ○ | ○ | ○ |
| Statistics / data | ● | ● | ● | ◐ | ○ | ○ | ○ |
| Offline / private mode | ● full | ○ | ◐ desktop | ○ | ○ | ○ | ○ |
| Honest unavailability | ● by design | ○ | ○ | ○ | ◐ | ◐ | ◐ |
| Windows desktop | ● | ◐ | ◐ | ○ | ○ | ○ | ○ |
| Steps behind no paywall | ● | ✗ Pro $5/mo | ● | ◐ | ◐ | ◐ | ● |

## Where Calcora is genuinely ahead

1. **Independent re-verification of every computed answer.** This is the strongest and most
   defensible differentiator. The Agent re-derives its own result through a *different* code
   path — root substitution with a residual check for equations, recomputation for
   calculations — and `FAIL` is a genuine outcome. A test injects a wrong root (`x = 7` for
   `2x + 4 = 10`) and confirms the verifier reports `FAIL` with the actual substituted values
   `18 ≠ 10`. No compared product publicly claims an answer that is independently re-checked
   by a second computational path.
2. **Verification honesty under unavailability.** `UNKNOWN` is a first-class outcome for
   conceptual questions. Competitors either answer confidently or stay silent; Calcora
   distinguishes "computed and confirmed" from "explained but not numerically checkable".
3. **Derived-from-observation-only adaptivity.** The student model infers nothing
   psychological. With an empty history it reports `null` accuracy and empty weak-concept
   lists rather than a fabricated profile, and mastery requires four consistent correct
   attempts because mastery is damped by sample size.
4. **Fully functional offline/private mode.** No network path, no paywall on steps, no
   telemetry requirement. Browser verification confirms **zero outbound requests**.
5. **Bounded agent execution.** A closed two-tool allowlist, an eight-step ceiling, a wall
   clock budget and no recursion path. Adversarial input (400 nested parens, a 50,000-char
   goal) provably cannot exceed the ceiling.

## Capability gaps against the field

| Gap | Affected competitors | Severity | Notes |
| --- | --- | --- | --- |
| **OCR / photo scan** | Symbolab, MathGPT, Mathos, Socratic | **HIGH** | The clearest adoption blocker for a "photo a homework sheet" workflow. Calcora has an honest provider seam and reports `unavailable`; it needs a real engine (on-device OCR or an explicitly consented cloud vision provider) to compete here. |
| **3D / parametric / implicit / polar graphing** | WA, GeoGebra, Symbolab | **HIGH** | Currently labelled "Not implemented" in the UI, which is honest. Parametric and polar are cheap wins on top of the existing 2D plotter; 3D needs a renderer. |
| **Dynamic geometry construction** | GeoGebra (its core product), WA | **MEDIUM** | Calcora has geometry *knowledge* but no construction workspace with constraints and construction history. |
| **Real-time conversational voice tutor** | Mathos, MathGPT | **MEDIUM** | Calcora has dictation with math sanitization, not a turn-taking spoken tutor. |
| **Multiple solution methods ("choose your method")** | WolframAlpha Pro | **MEDIUM** | The knowledge corpus already stores `alternativeMethods` and `solutionStrategies`; surfacing a method chooser is largely a retrieval/UI task. |
| **Curriculum alignment** | MathGPT (NCERT/CBSE), Axiom | **MEDIUM** | The corpus has topic/subtopic/level but no standards mapping. |
| **Classroom / instructor view** | GeoGebra Classroom, MathGPT | **LOW** | Out of scope for a single-learner desktop product. |
| **Automated video generation** | Mathos | **LOW** | Deliberately not pursued. |

## Academic standards worth adopting

**MMTutorBench** (ACL 2026) defines tutoring quality around *pedagogically significant
key-steps* and classifies learner follow-ups into three levels — **Progressive** (linear
next step), **Exploratory** (lateral clarification), **Introspective** (deep conceptual).
Calcora's conversational Tutor handles Progressive continuity today. Exploratory and
Introspective turns are not classified, and there is no key-step-targeted benchmark suite.
This is the most valuable next step for tutor quality and it is measurable.

**AutoTutor EMT** and **PEARL** both make misconception detection the pedagogical centre of
gravity — hints are selected against an expectation/misconception model rather than a fixed
ladder. Calcora's five hint levels are a fixed ladder; `studentModel` supplies observable
signals but does not yet *select* the hint level from them.

## External validation of one design decision

Mathos AI publicly documents adaptive thresholds of ">80% advance, 50–80% mixed practice,
<50% retry". Calcora's `selectNextDifficulty` advances at ≥0.85 accuracy and steps down below
0.5. The thresholds were derived independently from the requirement to avoid over-advancing
on thin evidence; they now have independent external corroboration.

## Recommended priority order

1. **Real OCR/vision provider** for Scan Problem, Digital Ink and scanned PDFs — closes the
   highest-severity gap and unlocks three currently-honest-unavailable surfaces.
2. **Hint-level selection from student-model signals** (EMT-style), so hints respond to the
   observed misconception rather than a fixed ladder.
3. **Parametric and polar graphing** — small effort on the existing plotter.
4. **MMTutorBench-style key-step tutoring evaluation** to make tutor quality measurable.
5. **Geometry construction workspace.**
