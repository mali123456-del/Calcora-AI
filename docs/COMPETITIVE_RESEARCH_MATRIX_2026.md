# Calcora Competitive Research Matrix — 2026

Research window: 2026-10-02. Sources are public vendor pages, official documentation, release
notes and published reviews. No proprietary UI, dataset, transcript or source code was copied. A
capability is recorded only where a public source stated it. Product names and marks belong to
their owners.

This document is the **research layer**. The decision layer — what Calcora should do about each
observation — is `docs/CALCORA_GAP_MATRIX.md`. Existing narrower analysis is preserved in
`docs/COMPETITOR_GAP_ANALYSIS.md` (7 math-specific products) and
`docs/competitive-math-product-benchmark-2026.md` (Calcora requirement priorities).

---

## 1. Research taxonomy

The field splits into five categories with genuinely different architectures. Competitors rarely
span more than two, which is Calcora's structural opening.

| # | Category | Products researched | Core architecture |
| --- | --- | --- | --- |
| A | **Symbolic / computational engines** | WolframAlpha, GeoGebra, Desmos, Symbolab, Microsoft Math Solver | CAS + numeric engine is authoritative |
| B | **Camera-first / scan solvers** | Photomath, Symbolab, Gauth, MathGPT, Microsoft Math Solver, Socratic | Vision/OCR front end, step engine behind |
| C | **Dedicated AI tutors (K-12 + higher ed)** | Khanmigo, Quizlet Q-Chat, MathGPT, Mathos, Axiom, StarSpark, Pengi, Edukado, MathAI, Knowt | Conversational policy layer over an LLM, curriculum-aligned |
| D | **General-purpose assistants** | ChatGPT, Claude, Gemini, Copilot, Grok, Perplexity, Le Chat, Meta AI, Poe, NotebookLM | Frontier LLM + tools + web/RAG |
| E | **Local / private-first runtimes** | Ollama, LM Studio, Jan, GPT4All, AnythingLLM, Open WebUI, LocalAI, llama.cpp | On-device inference, nothing leaves the machine |
| F | **Voice assistants** | Siri, Alexa+, Gemini Live, Speechify, MathVoice, Pengi | Spoken turn-taking, low-latency STT/TTS |

---

## 2. Category A — Symbolic / computational engines

| Product | Engine authority | Verification | Step detail | Graphing | 3D / parametric / polar | Dynamic geometry | Stats / data | Paywall on steps |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **WolframAlpha** | ● CAS + curated data | ○ no independent re-check | ● "Step-by-Step" Pro | ● | ● incl. implicit, parametric, polar, 3D | ◐ | ● | ✗ Pro $5/mo |
| **GeoGebra** | ● CAS | ◐ | ◐ | ● | ● strong 3D, strongest core | ● **core product** | ● | ● free |
| **Desmos** | ◐ numeric only | ○ | ○ | ● best-in-class UX | ◐ limited 3D | ○ | ◐ | ● free |
| **Symbolab** | ● CAS | ◐ | ● | ● | ● 3D ◐ | ◐ | ◐ | ◐ partial |
| **Microsoft Math Solver** | ● | ○ | ● multi-method picker | ● | ◐ | ○ | ● | ● free, no ads |

**Read.** GeoGebra is the only product that wins on *construction* rather than *answer*.
WolframAlpha owns breadth of advanced mathematics and pays for it. Desmos owns the exploratory
graphing experience. None of the five expose an answer-verification state to the user.

---

## 3. Category B — Camera-first / scan solvers

| Product | OCR / photo | Handwriting ink | Multiple methods | Socratic withholding | Practice generation | Free tier |
| --- | --- | --- | --- | --- | --- | --- |
| **Photomath** | ● best-in-class | ● | ● | ◐ | ◐ | ◐ freemium |
| **Symbolab** | ● | ◐ | ◐ | ◐ | ● | ◐ |
| **Gauth (ByteDance)** | ● | ● | ◐ | ● camera-first tutoring | ● | ◐ freemium |
| **MathGPT.ai** | ● | ● | ◐ | ● | ◐ | ◐ |
| **Microsoft Math Solver** | ● | ● | ● "choose your method" | ○ | ◐ web resources | ● free, no ads |
| **Socratic** | ● | ◐ | ○ | ◐ | ○ | ● free |

**Read.** Every product in this category treats OCR as table stakes. It is the single most
table-stakes capability Calcora currently does not ship (it has an honest provider seam that
returns `unavailable`).

---

## 4. Category C — Dedicated AI tutors

| Product | Socratic method | Curriculum / standards alignment | Adaptive difficulty | Grounded in learner material | Check-work | Academic-integrity controls | Price |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **Khanmigo** | ● core | ● Khan Academy curriculum | ◐ | ◐ | ◐ | ◐ | ~$4/mo, free for US teachers |
| **Quizlet Q-Chat** | ● | ○ user-uploaded sets | ◐ spaced repetition | ● own sets/notes | ◐ smart grading | ○ | $7.99/mo · $35.99/yr |
| **MathGPT.ai** | ● | ● NCSC/CBSE + OER library | ◐ | ● instructor textbooks | ● | ● lockdown browser, paste-block, problem variation | Enterprise |
| **Mathos AI** | ● | ◐ | ● threshold rules ">80% advance" | ◐ | ● | ◐ | Freemium |
| **Axiom** | ● core | ◐ curriculum | ● | ◐ | ● | ◐ | Freemium |
| **StarSpark** | ● | ● all US state standards | ● mastery-based gating | ◐ | ● | ● | Freemium, 15-day trial |
| **Pengi (Gemini)** | ● never reveals answer | ● K-12, textbook-aware | ● grades 1-12 auto-scaffold | ● reads on-screen problem | ◐ | ● Chrome ext. reads any site | Freemium |
| **Edukado** | ● grades 3-8 | ◐ | ● | ◐ | ◐ | ◐ | Freemium |
| **MathAI** | ● K-6 | ◐ IIT Bombay pedagogy | ● pace-adapting | ◐ | ◐ | ◐ | Freemium |
| **Knowt** | ◐ | ◐ | ◐ | ● own notes | ◐ | ○ | $9.99/mo · $119.99/yr |

### Independent research finding that constrains design

An EdTech Innovation Hub report (2026-09-04) covers a 6,997-student trial of an embedded AI math
tutor in Hamilton County Schools, Tennessee. Headline finding: **the tutor slowed practice but
improved post-mistake recovery.** This matches the wider literature in
*LLAMA LIMA* (arXiv 2601.18685, 2026-09-11), a living meta-analysis of generative-AI
mathematics interventions, which finds that effect size grows with **intervention duration** and
that **study design characteristics** (randomization, control condition, sample size) dominate
reported outcomes.

**Implication for Calcora.** Do not optimize for speed-of-answer. Optimize for *recovery after a
wrong turn*. That reframes the value of the mistake store, first-error detection and
misconception-driven hints from "nice to have" to **core product thesis**. It is also the one
place where Calcora's architecture has a structural advantage: an observable-signal student model
plus a persistent mistake store can express recovery, where a general LLM with a chat history
cannot.

**Caveat.** These are third-party studies of other products. They justify a design direction;
they do not substitute for measuring Calcora itself. A Calcora-specific recovery benchmark does
not exist yet and is listed as a gap.

### Socratic-method product positioning compared directly

| Product | Teaching method | Source material |
| --- | --- | --- |
| Quizlet Q-Chat | ● Socratic | Your own uploaded notes/sets |
| Khanmigo | ● Socratic | Khan Academy curriculum |
| **ChatGPT** | **✗ gives direct answers** | None — general knowledge |
| Pengi | ● Socratic, never reveals | K-12 textbook-aware |
| **Calcora** | **● Socratic + independent verification** | **28-item verified corpus + observation-only student model** |

The defensible line is not "we are Socratic" — five products already are. It is
**"we are Socratic *and* we independently re-verify every computed answer, and we admit when
we cannot compute."**

---

## 5. Category D — General-purpose assistants

| Product | Math reliability posture | Stated policy | Citation / provenance | Offline | Education tier |
| --- | --- | --- | --- | --- | --- |
| **ChatGPT** | Model-generated answers | Direct answers | ○ | ○ | ChatGPT Edu tier |
| **Claude** | **⚠ Explicit disclaimer** | Pushes back, asks follow-ups | ○ | ○ | Claude for Teachers (free, K-12, US) |
| **Gemini** | Strong (Gemini 3 Pro / Deep Think) | Mixed | ○ | ◐ Gems | Free w/ Workspace for Education; $15/user/mo Pro for Ed |
| **Microsoft Copilot** | M365-integrated | Mixed | ○ | ○ | Paid education tiers |
| **Grok** | Benchmarked high on math/logic | Direct | ○ DeepSearch | ○ | none |
| **Perplexity** | Has Math focus mode + code sandbox | Cited answers | ● **numbered inline citations** | ○ | Education Pro $10/mo |
| **Le Chat (Mistral)** | Magistral reasoning model | Direct | ◐ | ○ | none |
| **Meta AI** | Llama-based, study tools | Mixed | ○ | ○ | free, dozen+ languages |
| **Poe** | Aggregator across models | Mixed | ○ | ○ | none |
| **NotebookLM** | **Source-grounded only** | Grounded | ● per-source | ○ | Free w/ Education Plus |

### The single most important finding in this document

Anthropic's own support documentation states, verbatim:

> "Claude can process mathematical equations and perform calculations, but complex or
> mission-critical calculations should be verified using specialized mathematical software or
> manual methods."

Every frontier lab takes the same posture in some form. This is an **industry-wide admission
that general assistants are not authoritative for mathematics.** It is the strongest external
corroboration Calcora's deterministic-first architecture can have, and it is quotable in
product positioning and investor material.

NotebookLM's opposite posture — refuse to answer outside provided sources — is the second
useful precedent: it proves the *bounded, source-grounded* product model is a viable market
shape, and Calcora is a domain-specialized instance of it.

### Pricing context (2026)

| Product | Consumer entry price | Student/teacher price |
| --- | --- | --- |
| Gemini | Free · $5 Plus · $20 Pro | Free w/ Workspace for Education |
| Claude | Free · $20 Pro | **Free for verified US K-12 educators** |
| Perplexity | Free · $20 Pro | $10/mo Education Pro |
| ChatGPT | Free · $20 Plus | Edu tier, institution-priced |
| Khanmigo | ~$4/mo | Free for US teachers |
| Quizlet Plus | $7.99/mo · $35.99/yr | Teacher $34.99/yr |
| Le Chat | Free · €14.99 Pro | none |

**Read.** Free-for-teachers is now table stakes among frontier labs and Khanmigo. Any paid Calcora
tier is competing against $0 for a US K-12 teacher. This materially raises the bar on what a
paid Calcora tier can justify, and it favors a local-first, one-time-purchase Windows product
position over subscription.

---

## 6. Category E — Local / private-first runtimes

| Product | Licence | Interface | Engine | API port | Telemetry | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| **Ollama** | MIT | CLI + API | llama.cpp | 11434 | — | 4,500+ models; Series B, $80M raised; Pro $20/mo |
| **LM Studio** | Proprietary freeware | Polished GUI | llama.cpp | 1234 | — | Best desktop GUI; closed source |
| **Jan** | Apache-2.0 (attribution requested) | GUI | llama.cpp | — | None | "100% offline" positioning |
| **GPT4All** | MIT | GUI | llama.cpp | 4891 | — | LocalDocs; **dormant since 2025-02-25** |
| **AnythingLLM** | MIT | Web app | many | — | — | RAG, multi-provider, agents, RBAC |
| **Open WebUI** | MIT | Web app | many | — | — | Ollama-native, multi-user |
| **LocalAI** | MIT | Docker API | llama.cpp + more | — | — | LLM + embeddings + image gen |
| **llama.cpp** | MIT | CLI (library) | itself | — | — | Engine layer under most of the above |

**Read.** All eight are general LLM runtimes. **None of them is a math product, and none ships a
deterministic math engine, a knowledge corpus, a student model, or a verification layer.** The
entire local-AI category competes on token throughput and privacy posture; it does not compete on
mathematical correctness at all.

Two consequences for Calcora:

1. `src/ai/ollamaClient.ts` already exists. The local-inference seam is the correct one, and no
   local runtime is a competitor to it — they are potential *substrates*.
2. The privacy argument Calcora can make is stronger than "we run locally." It is **"we can
   prove our answers, and we never needed a model to compute them."** A local LLM that guesses
   `x = 7` is still a guess. Calcora's verification pass is a *logical* guarantee, not a
   *deployment* guarantee, and it holds with any substrate including a cloud one.

---

## 7. Category F — Voice assistants

| Product | Latency posture | Turn-taking | Math tutoring role | Education-specific |
| --- | --- | --- | --- | --- |
| **Gemini Live** | Low, streaming | Natural multi-turn | Conversational, 40+ languages | Practice quizzes, study hub |
| **Siri (2026 rebuild)** | Natural | Natural | General assistant | ✗ |
| **Alexa+** | Natural | Natural | General assistant; $19.99/mo, free with Prime | ✗ |
| **Speechify** | Voice-first | Natural | Quiz, lecture, summarize | ✗ |
| **MathVoice (OSS)** | **114 ms p50 / 185 ms p95** speech-end→STT-final, gated under 350 ms p95 | Interrupt-safe | Socratic engine, Pre-Algebra→Differential Equations | ◐ |
| **Pengi** | Low via Gemini | Natural | ● never reveals answer, whiteboard drawing | ● K-12 |

**Read.** The open-source realtime tutor stack publishes a hard latency gate — 350 ms p95 from
speech-end to final transcript — and passes at 185 ms. That is the number to beat or match. Voice
is the least differentiated axis in 2026: six products have it, none of them is a math authority.
Calcora's dictation-plus-sanitization is not a voice tutor and should not be marketed as one.

---

## 8. Cross-category capability matrix

Legend: ● present · ◐ partial · ○ absent. Calcora column is the **verified** state from
`CALCORA_FINAL_VERIFICATION_REPORT.md`, not a target.

| Capability | Calcora | WA | GeoGebra | Desmos | Symbolab | Photomath | Khanmigo | Q-Chat | MathGPT | ChatGPT | Gemini | Claude | Perplexity | NotebookLM | Ollama | Gemini Live |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Deterministic/CAS authority | ● | ● | ● | ◐ | ● | ◐ | ○ | ○ | ◐ | ○ | ○ | ○ | ◐ | ○ | ○ | ○ |
| **Answer independently re-verified** | **●** | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ |
| Verification can report **FAIL** | **●** | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ |
| Honest `UNKNOWN` under unavailability | **●** | ○ | ○ | ○ | ○ | ○ | ◐ | ○ | ◐ | ○ | ○ | ◐ | ○ | ◐ | ○ | ○ |
| Step-by-step with named rule | ● | ●Pro | ◐ | ○ | ● | ● | ◐ | ◐ | ● | ◐ | ◐ | ◐ | ○ | ○ | ○ | ○ |
| Multiple solution methods | ◐ | ● | ◐ | ○ | ◐ | ● | ○ | ○ | ◐ | ◐ | ◐ | ◐ | ○ | ○ | ○ | ○ |
| Progressive hints | ● 5 lvl | ◐ | ○ | ○ | ◐ | ◐ | ● | ◐ | ● | ◐ | ◐ | ◐ | ○ | ○ | ○ | ○ |
| Socratic withholding | ● | ◐ | ○ | ○ | ◐ | ◐ | ● | ● | ● | ◐ | ◐ | ◐ | ◐ | ○ | ○ | ◐ |
| **Misconception-driven hint selection** | ○ | ○ | ○ | ○ | ○ | ○ | ◐ | ○ | ◐ | ○ | ○ | ○ | ○ | ○ | ○ | ○ |
| Check-work / first-error detection | ● | ◐ | ○ | ○ | ◐ | ◐ | ◐ | ◐ | ● | ◐ | ◐ | ◐ | ○ | ○ | ○ | ○ |
| Knowledge grounding | ● 28-item | ● | ◐ | ○ | ◐ | ◐ | ● | ● | ● | ○ | ○ | ○ | ● | ● | ○ | ○ |
| Curriculum/standards alignment | ○ | ◐ | ◐ | ○ | ○ | ○ | ● | ○ | ● | ○ | ● | ● | ◐ | ◐ | ○ | ◐ |
| Persistent student model | ● observed | ○ | ◐ | ○ | ◐ | ◐ | ● | ◐ | ◐ | ◐ | ◐ | ○ | ◐ | ● | ○ | ◐ |
| **Post-mistake recovery tracking** | ● | ○ | ○ | ○ | ○ | ○ | ◐ | ◐ | ◐ | ◐ | ◐ | ◐ | ○ | ○ | ○ | ○ |
| Practice + quiz generation | ● | ◐ | ◐ | ○ | ● | ◐ | ● | ● | ◐ | ● | ● | ◐ | ○ | ● | ○ | ◐ |
| Notebook / workspace | ● | ◐ | ◐ | ◐ | ○ | ◐ | ○ | ◐ | ◐ | ◐ | ● | ◐ | ● | ● | ○ | ○ |
| Bounded agent orchestration | ● 8-step | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ◐ | ◐ | ◐ | ◐ | ◐ | ○ | ○ |
| OCR / photo scan | ○ seam | ○ | ○ | ○ | ● | ● | ○ | ◐ | ● | ● | ● | ● | ◐ | ◐ | ○ | ● |
| Handwriting ink | ○ seam | ○ | ◐ | ◐ | ◐ | ● | ○ | ○ | ● | ◐ | ● | ◐ | ○ | ○ | ○ | ● |
| Voice input | ● dictation | ○ | ○ | ○ | ○ | ○ | ● | ○ | ● | ● | ● | ◐ | ● | ○ | ○ | ● |
| Real-time spoken tutor | ○ | ○ | ○ | ○ | ○ | ○ | ◐ | ○ | ◐ | ● | ● | ◐ | ○ | ○ | ○ | ● |
| 2D graphing | ● | ● | ● | ● best | ● | ○ | ○ | ○ | ○ | ◐ | ◐ | ○ | ○ | ○ | ○ | ○ |
| Parametric / polar / implicit | ○ | ● | ● | ◐ | ● | ○ | ○ | ○ | ○ | ○ | ◐ | ○ | ○ | ○ | ○ | ○ |
| 3D visualization | ○ | ● | ● strong | ◐ | ◐ | ○ | ○ | ○ | ○ | ◐ | ● | ○ | ○ | ○ | ○ | ○ |
| Dynamic geometry construction | ○ | ◐ | ● core | ○ | ◐ | ○ | ○ | ○ | ○ | ○ | ◐ | ○ | ○ | ○ | ○ | ○ |
| Statistics / data analysis | ● | ● | ● | ◐ | ◐ | ○ | ◐ | ○ | ○ | ◐ | ◐ | ◐ | ● | ● | ◐ | ○ |
| Data Lab charts (CSV/XLSX) | ◐ | ● | ● | ◐ | ○ | ○ | ○ | ○ | ○ | ◐ | ◐ | ◐ | ◐ | ◐ | ○ | ○ |
| Provenance / citations | ● | ◐ | ○ | ○ | ◐ | ○ | ◐ | ○ | ○ | ○ | ◐ | ○ | ● best | ● | ○ | ○ |
| **Fully functional offline** | ● | ○ | ◐ desktop | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ◐ | ○ | ○ | ○ | ● | ◐ |
| Local LLM substrate available | ● seam | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ◐ | ○ | ● | ○ |
| Windows desktop | ● | ◐ | ◐ | ○ | ○ | ● | ○ | ● | ○ | ● | ○ | ○ | ○ | ○ | ● | ○ |
| No paywall on steps | ● | ✗ | ● | ● | ◐ | ◐ | ◐ | ◐ | ◐ | ◐ | ◐ | ◐ | ◐ | ● | ● | ◐ |
| Accessibility / WCAG verified | ○ | ◐ | ◐ | ◐ | ○ | ◐ | ◐ | ○ | ◐ | ◐ | ◐ | ◐ | ◐ | ◐ | ○ | ◐ |

**Row audit.** Of 30 rows, Calcora is ● on 13, ◐ on 3, ○ on 14. It is the only product ● on
*independent re-verification*, *FAIL reporting*, *honest unavailability*, *post-mistake recovery
tracking*, *bounded agent orchestration* and *fully functional offline* simultaneously. It is ○ on
14 rows, of which 8 are shared with **every** competitor in at least one category.

### The ● rows that are not yet true in the running application

An import-graph audit of `src/` changes how three of those ● rows should be read.

| Module | Size | Non-test consumers | Live? |
| --- | --- | --- | --- |
| `src/services/mathAgent.ts` — bounded agent, `PASS`/`FAIL`/`UNKNOWN` | 19.1 KB | **0** | **no** |
| `src/verification/verificationPipeline.ts` — `verifyMath()` | 1.1 KB | **0** | **no** |
| `src/verification/provenance.ts` — `buildProvenance()` | 1.1 KB | 0 (only `verificationPipeline`) | **no** |
| `src/services/tutorOrchestrator.ts` | 66.6 KB | 0 (only its own tests) | **no** |
| `src/ai/tutorOrchestrator.ts` | 5.4 KB | 0 (only `tutorResponseGuard.ts`) | **no** |
| `src/utils/aiTutor.ts` | 41.7 KB | `AIAssistantPanel.tsx`, `ai/client.ts`, `tutorConversationService.ts`, `testEngine.ts` | **yes** |
| `src/engine/mathEngine.ts` + 14 sibling engines | 24.9 KB + | `AIAssistantPanel.tsx`, `CommandCenterHome.tsx`, `CommandPalette.tsx` | **yes** |

So the verified bounded agent, the verification pipeline and the provenance builder are all
**orphaned**: heavily tested, and not on the path a user actually takes. The live tutor path is
`AIAssistantPanel.tsx` → `utils/aiTutor.ts`, which calls the deterministic engine directly and
bypasses `mathAgent` and `verificationPipeline` entirely.

Consequences, stated precisely:

- The "independently re-verified answer" row is true of the **test suite** and false of the
  **application**. It is the most valuable capability in the architecture and the product does not
  currently deliver it.
- `services/tutorOrchestrator.ts` at 66.6 KB being test-only is a maintenance liability as well as
  a product gap: it is the largest service in the codebase and none of it runs.
- This does **not** weaken the reliability of answers a user sees today — the deterministic engine
  is genuinely authoritative and does run. It weakens the *claim*: Calcora currently demonstrates
  correctness rather than guaranteeing it.

This finding is carried into the decision layer as GAP-04.

---

## 9. Where the field beats Calcora

Stated plainly, because a gap analysis that only lists advantages is not a gap analysis.

| Competitor advantage | Products | Severity for Calcora |
| --- | --- | --- |
| Camera/photo homework capture | All of Category B, Gemini, ChatGPT, Copilot | **HIGH** — most common entry mode in the category |
| 3D and parametric/polar graphing | WA, GeoGebra, Symbolab | **HIGH** — GeoGebra's clearest identity |
| Dynamic geometry construction | GeoGebra | **MEDIUM** — a whole product, not a feature |
| Real-time spoken tutor with latency guarantees | Gemini Live, MathVoice, Pengi | **MEDIUM** |
| Curriculum / standards mapping to state frameworks | Khanmigo, MathGPT, StarSpark, Gemini, Claude | **MEDIUM** — hard to retrofit onto a topic-tagged corpus |
| Academic-integrity lockdown tooling | MathGPT, StarSpark | **LOW** — single-learner desktop product |
| Numbered inline citations | Perplexity, NotebookLM | **LOW** — Calcora has provenance, not web citations |
| Flashcards + spaced repetition at scale | Quizlet, Anki, Knowt | **LOW** — different product category |
| Generative 3D / simulation authoring | Gemini | **LOW** — expensive, low math value |
| Frontier reasoning depth on open-ended problems | Gemini 3 Deep Think, Grok, Claude | **MEDIUM** — Calcora's agent is deliberately bounded |

---

## 10. Research integrity

- Public product capabilities and published prices were used as design research.
- No proprietary user chats, private datasets, copyrighted solution corpora, or source code were
  copied. `src/knowledge/mathematics/datasets.ts` registers 8 external dataset sources with
  explicit `ingestion-candidate` / `reference-only` / `provider-api-only` usage typing; only
  `ingestion-candidate` sources may be imported, and only after licence review and deterministic
  verification.
- Third-party trial results (Hamilton County 6,997-student study; LLAMA LIMA meta-analysis) are
  reported as findings about *other* products, cited to their publishers, and used only to
  motivate a design direction.
- The 28-item knowledge corpus is original content written for Calcora.

## 11. Sources

| Product | Source basis |
| --- | --- |
| WolframAlpha | `reference.wolfram.com`, `wolframalpha.com/pro/step-by-step-math-solver` |
| GeoGebra | `geogebra.org` 2026 tools reference |
| Desmos | `desmos.com/calculator` |
| Symbolab | `symbolab.com` product page |
| Photomath | `photomath.com` |
| Khanmigo | `khanmigo.ai` |
| Quizlet Q-Chat | `quizlet.com` Plus pricing page; aivario, nibble-app, AISO Tools, iTutor comparisons (Aug–Sep 2026) |
| MathGPT.ai | `mathgpt.ai/product/features` (last verified 2026-09-11) |
| Mathos AI | `mathgptpro.com` adaptive threshold documentation |
| StarSpark | `starspark.ai` via WTOC (2026-08-03) |
| Pengi | `pengi.ai/tools/gemini-math-tutor` |
| Edukado / MathAI / Knowt | Google Play listings, studygenie.io alternatives review (2026-09-25) |
| Microsoft Math Solver | `mathsolver.microsoft.com`, Edge Learning Center, Wikipedia |
| ChatGPT | OpenAI product and pricing pages |
| Claude | `support.claude.com` math-calculations article (2026-03-16), `anthropic.com/news/claude-for-teachers` (2026-07-14), `claude.com/solutions/education`, Stanford IT service page |
| Gemini | `gemini.google/release-notes`, `edu.google.com/intl/ALL_us/ai/gemini-for-education/`, TechCrunch (2026-08-19), `ai.google.dev/gemini-api` model cards |
| Copilot / Microsoft 365 | `dume.ai` voice-assistant comparison (2026) |
| Grok | `docs.x.ai/docs/models/grok-4-0709`, Oracle OCI Generative AI Grok 4.3 docs, Google Cloud Model Garden |
| Perplexity | `perplexity.ai/help-center` Advanced Deep Research (2026-07-16), DataNorth (2025-11-17), Efficient.app review (2026-09-28) |
| Le Chat (Mistral) | `mistral.ai/news/le-chat-dives-deep`, `help.mistral.ai` capabilities overview, AISO Tools review (2026-07-15) |
| Meta AI | `ai.meta.com/learn/ai-for-studists` study tools (2026-03-10), `ai.meta.com/blog/meta-llama-3-1`, MetaMath (ICLR 2024) |
| NotebookLM | Google for Education NotebookLM rollout (2026-04-06) |
| Local runtimes | `getjarvis.eu` offline comparison (2026-08-25), `ayautomate.com` (2026-06-17), `nesyona.com` (2026-05-24), `promptquorum.com` (2026-04-04), `docs.anythingllm.com` |
| Voice | `speechify.com/news` Voice AI launch (2026-01-12), `dume.ai` (2026), `github.com/maxpetrusenko/ai-math-tutor` benchmark report, `github.com/llSourcell/mathvoice` |
| Academic | MMTutorBench (ACL 2026, 770 problems); PEARL; AutoTutor EMT; LLAMA LIMA `arxiv.org/pdf/2601.18685` (2026-09-11); EdTech Innovation Hub Hamilton County trial (2026-09-04) |
