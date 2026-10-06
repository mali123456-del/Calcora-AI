# Calcora AI — Wave 1 Architecture: Live Verification, Knowledge Verification, Recovery and Misconception-Aware Tutoring

Date: 2026-10-05. This document describes what is **implemented and verified today**. It is
not a plan. Anything not demonstrated by a passing test is listed under
[Known limitations](#9-known-limitations).

---

## 1. What changed and why

Before this wave the product reported a single boolean, `isVerified`, which was assigned as
`isVerified: hasDeterministicAuthority` — that is, "the engine returned a success". A boolean
cannot distinguish four materially different situations, so all of them looked identical to
the user:

| Situation | Old boolean | Now |
| --- | --- | --- |
| Independently re-derived and agreed | `true` | `VERIFIED` |
| Conceptual, nothing numeric to check | `false` | `UNVERIFIED` |
| Never computed anything | `false` | `UNAVAILABLE` |
| Independent check disagreed | `false` | `FAILED` |

"Checked and wrong" and "never checked" both rendering as a neutral `false` is the specific
defect this wave removes. The verification *capability* already existed and was tested; what
was missing was that the running product never computed it, never showed it, and in one branch
claimed results were "100% verified" when no result existed at all.

---

## 2. Verification architecture

### 2.1 The canonical contract

`src/verification/verificationStates.ts` is the single source of truth.

```ts
export const VERIFICATION_STATES = ['VERIFIED', 'UNVERIFIED', 'FAILED', 'UNAVAILABLE'] as const;

export interface VerificationOutcome {
  readonly state: VerificationState;
  readonly method: 'exact-rational' | 'equation-residual' | 'recompute' | 'none';
  readonly reason: string;        // human-readable, never blames the learner
  readonly actual: string | null;      // the value being reported
  readonly independent: string | null; // what the second path derived
  readonly checkedAt: number;
}
```

State preconditions, enforced by `tests/verificationStates.test.ts`:

- **VERIFIED** — a deterministic result exists, an independent path actually ran, and it
  agreed. Always carries an `independent` observation.
- **FAILED** — the independent path actually ran and disagreed. Always carries both
  `actual` and `independent` so the disagreement can be shown.
- **UNVERIFIED** — conceptual, or verification does not apply. Explicitly *not* a claim that
  the answer is wrong.
- **UNAVAILABLE** — the required capability does not exist, or the input could not be
  evaluated. The system declines rather than guessing.

### 2.2 Independent verification strategies

`src/verification/independentVerifier.ts` picks the strongest available check.

| Method | Used for | Why it is genuinely independent |
| --- | --- | --- |
| `exact-rational` | arithmetic | `src/verification/exactArithmetic.ts` is a **separate evaluator**: exact rational arithmetic over `BigInt` with a recursive-descent parser, versus the engine's floating-point shunting-yard. Agreement is evidence, not a tautology. It catches precedence and precision faults a self-recomputation would reproduce. |
| `equation-residual` | equations | Every reported root is substituted back into the original equation and both sides compared. A wrong root cannot satisfy the equation it came from. All roots are checked, not just the first. |
| `recompute` | fallback | A second numeric evaluation path. Weaker, and labelled as such. |
| `none` | — | Reported honestly rather than upgraded. |

Anything the exact evaluator cannot represent — `sin`, `pi`, `log`, variables, division by
zero, an exponent beyond a bounded size — is reported unsupported so the caller can choose an
honest strategy. A transcendental expression is therefore `UNVERIFIED`, not `VERIFIED`.

### 2.3 Live data flow

Everything below is on the path a user actually takes. The components marked "wired" are
reached from the browser UI.

```
User question
  → UI            src/components/AIAssistantPanel.tsx
  → client        src/ai/client.ts            (validates the payload; rejects malformed)
  → POST /api/ai/math                          server.ts
  → Tutor         src/services/tutorOrchestrator.ts   [WIRED — production Tutor]
       ├─ deterministic engine (src/engine/*)  → primary result
       └─ verification   src/verification/independentVerifier.ts   [WIRED]
              ├─ exactArithmetic.ts  (exact-rational)
              └─ equation residual   (equation-residual)
  → VerificationOutcome                         [WIRED]
  → JSON `verification`  (always present)
  → AIResponse.verification → AIMessage.verification
  → <VerificationBadge>  src/components/VerificationBadge.tsx   [WIRED]
```

`isVerified` is now a **derived** convenience (`verification.state === 'VERIFIED'`) for older
call sites, not an independent signal.

Two routes are also present and were audited:

- `src/ai/tutorOrchestrator.ts` — the thin deterministic pre-computation used by the optional
  cloud branch. It now reports the same canonical outcome.
- `src/services/mathAgent.ts` — the bounded 8-step agent, reachable at `/api/ai/math-agent`.
  Its `PASS`/`FAIL`/`UNKNOWN` triple is mapped onto the canonical states by
  `fromAgentStatus`, so the codebase holds one notion of "verified" rather than two.

### 2.4 What is deliberately NOT true any more

`tutorOrchestrator.ts` previously returned, in a branch reached only when nothing could be
computed:

> "All calculations and derivations remain 100% verified by the deterministic engine."

That branch has no deterministic result, so the claim was false. It now states that no
deterministic result could be produced and declines to present an unverified value. The
verification state on that answer is `UNAVAILABLE`, matching the copy.

---

## 3. User-visible verification badge

`src/components/VerificationBadge.tsx`.

| State | Label | Colour | Meaning shown |
| --- | --- | --- | --- |
| `VERIFIED` | Verified | emerald | An independent second calculation reproduced this value. |
| `UNVERIFIED` | Not verified | slate | Not checked against an independent calculation. Explicitly "does not mean it is incorrect". |
| `FAILED` | Verification failed | rose | Shows **Reported** and **Independent check** side by side. |
| `UNAVAILABLE` | No verified result | amber | Calcora could not responsibly produce a verified result. |

Rules the component enforces:

- The canonical state is authoritative. The legacy boolean is a fallback that maps `false` to
  `UNVERIFIED`, never to `VERIFIED`.
- State is conveyed by **text first**. Four distinct labels, so the badge is readable without
  colour perception.
- `aria-label` begins `Verification state:` and spells out the meaning; the disclosure is a
  `role="status"` region with `aria-expanded` / `aria-controls`; focus is visible via
  `focus-visible:ring-2`; decorative glyphs are `aria-hidden`.
- `data-verification-state` and `data-verification-method` are exposed as stable test hooks.
- The badge is rendered for **every** assistant message, so no mathematical answer can appear
  without a state. A regression in the browser suite asserts
  `badges >= assistant footers`.

---

## 4. Knowledge verification status (GAP-13a)

`MathKnowledgeItem` gained an optional `verificationStatus`:
`'VERIFIED' | 'UNVERIFIED' | 'REVIEW_REQUIRED'`.

`src/knowledge/knowledgeVerification.ts` **computes** it by re-deriving each item's worked
examples with the deterministic engine and comparing against the stated solution. No status is
hand-asserted; the test suite re-runs the audit and asserts it is a fixed point, so a future
change that marks the corpus `VERIFIED` by hand fails.

Measured distribution over the 28-item corpus:

| Status | Count |
| --- | --- |
| `VERIFIED` | 4 |
| `REVIEW_REQUIRED` | 24 |
| `UNVERIFIED` | 0 |

Only 5 examples in the whole corpus are machine-checkable, which is why so few items reach
`VERIFIED`. This is the honest result, not a placeholder.

An item that contradicts the engine is forced to `REVIEW_REQUIRED` and can never be
`VERIFIED`. `knowledgeIsAuthoritative()` returns `false` for every status by design: knowledge
is context, never authority over a computed value.

---

## 5. Misconception model and evidence-based hints (GAP-01)

`src/services/misconceptionModel.ts`.

The Tutor previously chose hints by **position** — the nth rung of a five-rung ladder keyed on
how many times a learner had asked. Two learners who made different observable errors on the
same concept received the same hint, because the ladder could not see the error.

Hints are now selected from the **error class**:

1. `classifyMisconception` inspects the submitted work against the verified result and returns
   an error class plus a factual `observation`. Most specific pattern first, so a sign slip is
   never reported as a generic arithmetic error.
2. `selectTargetedHint` returns the hint for that class at the appropriate rung, plus a
   follow-up prompt derived from the defect.

Error classes: `sign_error`, `operation_error`, `order_of_operations_error`,
`arithmetic_mistake`, `variable_isolation_error`, `fraction_error`, `unit_error`,
`domain_restriction`, `assumption_error`, `formula_selection_error`,
`algebraic_manipulation_error`, `conceptual_misunderstanding`, `unknown`.

Behavioural rules:

- Rungs 1–4 never reveal the final answer. Rung 5 may, and only when the mode permits it —
  and only ever the verified deterministic value.
- `previousRung` is a **floor, not a selector**. When the error class changes, the state
  restarts at rung 1 with the new class's content rather than advancing through an unrelated
  sequence.
- A **correct** submission is classified `correct` and produces no misconception at all.
  This is checked before any error rule, and `createMisconceptionState` defensively downgrades
  a `correct` record to `unknown` so no caller can store a right answer as a confident error.
- An unclassifiable submission yields `unknown` with `uncertain: true` and a hint explicitly
  flagged `generic: true` that says it cannot identify a specific error pattern. A
  misconception is never invented to fill a gap.
- No observation string or hint body describes a mental state, trait or ability. This is
  asserted by a test that scans all 40 fixtures and all hint bodies for such language.

Wired into the live path: `buildHintOfflineResponse` in `tutorOrchestrator.ts` prepends the
targeted guidance whenever submitted work plus a verified result exist, and exposes
`misconception` on the orchestration result.

### Demonstrated in the running product

Three different errors on the **same concept** (linear equations) produce three different
classes, three different titles and three different bodies:

| Submitted | Class | Hint title |
| --- | --- | --- |
| `-3` | `sign_error` | Sign changed |
| `2x = 5 - 17` | `variable_isolation_error` | Operation not applied to both sides |
| `4.5` | `arithmetic_mistake` | Arithmetic slip |

---

## 6. Post-mistake recovery and turn classification (GAP-05)

### 6.1 Seeded benchmark

`tests/fixtures/misconceptionFixtures.ts` — **40 fixtures** across 9 error classes, each with a
problem, the engine's answer, a real learner error, the expected class, and a note describing
the observable pattern. These are authored fixtures describing error patterns; no personal,
psychological or sensitive attribute appears anywhere.

`tests/misconception.test.ts` measures:

- **Classification**: 40/40 fixtures classified exactly as expected. (Measured, not
  asserted — the suite prints the figure and fails below 80%.)
- **Attempts to recovery**: 40/40 fixtures record a correct answer after a hint, with
  `previousHintResolved === true`.
- **Recurrence**: a still-wrong answer marks the previous hint `false` and increments
  `occurrences`; evidence is retained.
- **Follow-up targeting**: 40/40 produce a follow-up, spanning ≥ 8 distinct prompts, and none
  simply restates the original problem.
- **Response changes after a mistake**: the hint body differs per error class, and a changed
  class resets the rung.
- **No unnecessary repetition**: no follow-up equals the problem just answered.
- An unanswered attempt leaves recovery status `null` — absence of an answer is not evidence.

### 6.2 Turn classification

`src/services/turnClassification.ts` adds the two follow-up kinds Calcora did not handle,
following MMTutorBench's Progressive / Exploratory / Introspective distinction:

| Kind | Example | Matched rule |
| --- | --- | --- |
| `INTROSPECTIVE` | "Why did I get this wrong?" | `self-directed-why` |
| `EXPLORATORY` | "What if the coefficient were negative?" | `what-if` |
| `PROGRESSIVE` | "and then what do I do?" | `then-what` |

Classification is rule-based and inspectable: every turn returns the named pattern that decided
it. Introspection is matched before exploration so a self-referential question is not filed as a
general one. An unrecognised turn is marked `defaulted: true` and falls back to `PROGRESSIVE`.
Labels describe the **form of the text**, not the state of the person who wrote it.

---

## 7. Test coverage added

| Suite | Script | Assertions | Covers |
| --- | --- | --- | --- |
| `verificationStates.test.ts` | `test:verification` | 34 | The four states, preconditions, FAILED comparison, honesty invariants |
| `verificationDifferential.test.ts` | `test:verification-differential` | 73 | 53 engine-supported expressions produce **zero** spurious `FAILED`; exact-rational invariants incl. `0.1 + 0.2 - 0.3 = 0`; refusals for `pi`, variables, `sin`, `1/0`, adversarial exponents |
| `verificationBadge.test.ts` | `test:verification-badge` | 35 | Four distinct labels, ARIA semantics, FAILED comparison, no hardcoded state |
| `liveTutorVerification.test.ts` | `test:live-tutor-verification` | 26 | The real `orchestrateTutor`: every prompt yields a canonical state, `isVerified` is derived, offline works, antiderivative limitation stated |
| `knowledgeVerification.test.ts` | `test:knowledge-verification` | 19 | Status present on all items, not uniformly verified, fixed point, no contradictions, knowledge never authoritative |
| `misconception.test.ts` | `test:misconception` | 71 | 40-fixture classification, different-error-different-hint, recovery, no psychological language, turn classification, correct answers never misclassified |
| `liveMisconceptionHints.test.ts` | `test:recovery` | 12 | The live hint path classifies and addresses real submissions; correct work produces no misconception |

All seven are registered in `npm run verify`.

---

## 8. Browser verification

`tests/browserVerification.ts` section `[2c]` exercises the real running application. Observed
in Chrome against the built server:

```
[2c] Verification state is computed and shown in the real UI
  PASS  a verification badge is rendered on a real Tutor answer
  PASS  a conceptual explanation is never falsely VERIFIED (got "UNAVAILABLE")
  PASS  a conceptual explanation does not show the verified label ("No verified result ▸")
  PASS  a verifiable equation reports VERIFIED (got "VERIFIED")
  PASS  the badge names the state in text ("Verified ▸")
  PASS  the badge exposes an ARIA label naming the state
  PASS  the badge is visibly rendered on screen
  PASS  no assistant answer renders without a verification state (badges=4, footers=3)
```

Two honest constraints shaped this section and are recorded in the test's own comments:

1. `/api/ai/math` is rate limited to **8 requests/minute** and the earlier sections already
   consume most of that budget, so `[2c]` adds exactly one Tutor call and asserts everything it
   can from that call plus responses already produced.
2. A bare arithmetic request is treated as "apply this to the calculator":
   `detectAutomaticCalculation` fires, the result is applied and the app switches to the
   Calculator tab, unmounting the Tutor. That is intended product behaviour, not a
   verification gap, so the in-UI `VERIFIED` badge is demonstrated with an equation. The
   arithmetic path (`7 * 8` → `VERIFIED` via `exact-rational`) is proven by
   `liveTutorVerification`, `verificationDifferential` and `verificationStates`.

---

## 9. Known limitations

Recorded rather than papered over.

1. **Antiderivatives are authoritative but not independently verified.** The engine solves a
   definite integral, but this build has no independent re-derivation for an antiderivative, so
   the honest state is `UNVERIFIED`. Pinned by a test in
   `liveTutorVerification.test.ts` so the boundary is visible and cannot be quietly upgraded.
2. **Transcendental expressions are `UNVERIFIED`.** `sin`, `cos`, `pi`, `log` are outside exact
   rational arithmetic, and no second numeric path is implemented, so the system declines rather
   than claiming agreement it did not establish.
3. **`recompute` is a weaker fallback** and is currently unreachable for the supported input
   space, because the exact path or the residual path always applies first.
4. **The duplicate orchestrators were not merged.** `services/tutorOrchestrator.ts` is the
   canonical production Tutor; `ai/tutorOrchestrator.ts` is the thin deterministic
   pre-computation for the optional cloud branch, with a deliberately different `answer`
   contract (bare result string). Merging would break that contract and an existing passing
   test. Both now report the same canonical verification. The remaining duplication is that
   `/api/ai/math` computes the deterministic result once per branch rather than once per
   request.
5. **`src/verification/verificationPipeline.ts` and `provenance.ts` remain unwired.** The new
   `independentVerifier` supersedes the pipeline, but neither module has a production consumer.
   They are dead code and should be deleted or folded in a later pass; this wave did not remove
   them to avoid destroying existing work without a decision.
6. **Only 4 of 28 knowledge items reach `VERIFIED`.** 24 are `REVIEW_REQUIRED` because their
   worked examples are conceptual and cannot be machine-checked. Each needs a checkable example
   or a human review pass.
7. **EXE runtime is unverified in this environment.** The installers build successfully, but the
   packaged app cannot be launched here (see the Wave 1 report for exit codes and evidence).
8. **A new `http-cache-semantics` advisory** (high) is reported by `npm audit`. It is a
   build-time-only transitive dependency of `electron-builder` (`@electron/get` → `got` →
   `cacheable-request`), already at 4.2.0 before this wave, and is not shipped in the app
   bundle. The advisory appears to be newly published; `npm audit fix` was deliberately not run
   because it would mutate the lockfile and the Electron toolchain during an implementation task.
