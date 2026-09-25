# Calcora Competitive Math Product Benchmark — 2026

## Purpose

Maintain a living product/UX capability benchmark for Calcora. This document stores public capability observations and translates them into Calcora requirements. It is not a copy of proprietary datasets, private conversations, or source code.

## Products reviewed

- Wolfram|Alpha — computational/symbolic-first workflows, step-by-step computation, broad advanced mathematics.
- Photomath — camera/photo problem capture, recognition, step-by-step learning workflows, multiple methods.
- Symbolab — step-by-step symbolic solving, topic-specific calculators, practice/learning workflows, conversational help.
- Mathway — broad subject coverage and fast problem solving.
- GeoGebra — CAS, graphing, geometry, 3D visualization, probability/statistics and linked mathematical views.
- Desmos — interactive graphing and exploratory function visualization.
- Microsoft Math / Math Assistant ecosystem — typed/handwritten/photo equation workflows and step-oriented solving patterns.
- Khanmigo / tutor-style products — guided/Socratic teaching rather than answer-only behavior.
- Gauth / similar camera-first AI tutors — multimodal homework capture and conversational follow-up patterns.
- Julius-style data workflows — natural-language data analysis and computational notebooks.

## Capability matrix

| Capability | Calcora requirement | Priority |
|---|---|---|
| Exact computation | Deterministic engine before LLM | P0 |
| Verification | Domain, symbolic/numeric and independent checks | P0 |
| Step-by-step | Named rule/theorem + intermediate states | P0 |
| Quick answer | Verified result-first response profile | P0 |
| Deep tutor | Derivation, assumptions, intuition, verification | P0 |
| First-error detection | Locate earliest invalid transformation | P0 |
| Alternative methods | Generate genuinely distinct valid approaches | P0 |
| Progressive hints | Hint ladder without premature final answer | P0 |
| RAG knowledge | Supabase vector retrieval from original corpus | P0 |
| Provenance | Source/license/hash for every imported item | P0 |
| Photo input | Image -> normalized math representation | P0 |
| Handwriting | Ink -> equation representation | P0 |
| Voice | Speech -> math request | P1 |
| PDF homework | Document extraction + problem segmentation | P1 |
| Graphing | 2D interactive graph workspace | P0 |
| 3D | 3D functions/surfaces/parametric visualization | P1 |
| CAS | Symbolic algebra/calculus manipulation | P0 |
| Geometry | Construction/measurement/proof-oriented workspace | P1 |
| Statistics | Descriptive statistics + regression + distributions | P0 |
| Data Lab | CSV/TSV/XLSX intake + analysis + charts | P0 |
| Python/data notebook | Sandboxed computation where available | P1 |
| Practice | Similar and targeted generated questions | P0 |
| Quiz | Timed/untimed assessment workflows | P1 |
| Mistake review | Persistent misconception/error history | P1 |
| Learning analytics | Concept mastery and progress | P1 |
| Formula library | Formula, variables, assumptions, restrictions, examples | P0 |
| Projects/history | Persistent workspaces and saved problems | P1 |
| Offline/private | Deterministic + local model path with cloud fail-closed | P1 |

## UX patterns to adopt

1. One primary input surface supporting typed math, image, ink, voice and files.
2. Answer-first presentation with expandable derivation.
3. Step cards that identify the rule/theorem used and expose verification state.
4. Method switcher for alternative valid solution paths.
5. Tutor actions: Explain, Why, Hint, Check My Work, Try Another Way, Practice This.
6. Solver-to-graph handoff without losing the original problem context.
7. Concept/context drawer showing formulas, definitions, restrictions and related concepts.
8. Practice generated from the current concept and observed mistakes.
9. Clear deterministic/RAG/AI provenance indicators; never imply model training when only retrieval/grounding is used.
10. Responsive workbench layout: navigation + central workspace + contextual side panel.

## Calcora design direction

Calcora should combine these useful patterns into an original mathematics workbench rather than imitate any one product. The visual system should remain cohesive across Dashboard, Solver, Tutor, Graph, Data Lab, Practice, Knowledge and Projects.

## Research integrity

Public product capabilities may be used as design/feature research. Proprietary user chats, private datasets, copyrighted solution corpora, source code, or private training data must not be copied into Calcora. External mathematical questions should enter the corpus only when their license/usage rights are established and deterministic verification accepts them.

## 2026-09-23 research notes

Current external research indicates a recurring split between: (a) symbolic/computational engines optimized for exact computation, (b) camera/step solvers optimized for school problems, (c) tutor products optimized for guided learning, and (d) graphing/data tools optimized for exploration. Calcora's architecture should deliberately bridge these modes while keeping deterministic computation authoritative.

### Next implementation gates

- Finish P0 feature coverage and wire every primary dashboard action to real functionality.
- Expand original mathematical knowledge and tutor corpus by domain, not by copying competitor content.
- Complete embedding generation and live vector retrieval regression tests.
- Add provenance and verification UI to imported/grounded answers.
- Build feature-level regression suite for solver, tutor, graph, Data Lab and multimodal intake.
- Run production build and Windows installer/portable EXE only after tests are green.
