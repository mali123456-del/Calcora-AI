# Calcora AI — Multilingual Mathematics Extraction

Date: 2026-10-08
Phase: 6 (Tutor UX) follow-up, found by the packaged-EXE smoke test.

## The defect

An Urdu learner asking for a derivative got a paragraph of prose instead of a
calculation:

```
x^2 کا مشتق کیا ہے؟          ("what is the derivative of x^2?")
  before -> "Derivatives and Operational Differentiation Rules …"   (concept only)
  after  -> d/dx(x^2) = 2x                                            VERIFIED
```

Two independent Latin-only assumptions caused it:

1. **Expression extraction.** The extractor only produced an expression when an
   *English* verb introduced it (`what is`, `calculate`, …) or when the whole
   string was already bare mathematics. Here the mathematics is written in Latin
   characters inside an Urdu sentence, so nothing matched and the request
   degraded to a conceptual answer.
2. **Derivative routing.** The orchestrator decided "is this a derivative
   request?" with `/derivative|differentiat|d\/dx/i`. Urdu and Arabic both write
   the word `مشتق`, so the route was never taken.

The result was a *silent* downgrade: the learner got a confident, correct-sounding
explanation that never computed anything.

## The fix, and the boundary it had to respect

`problemExtractor` gained `extractEmbeddedExpression`, which finds a
self-contained Latin-script mathematical run inside a non-Latin sentence, plus a
derivative-keyword set that includes `مشتق` / `مشتقة` / `اشتقاق`.

The dangerous part is that "find some math-looking text in a sentence" is exactly
the kind of heuristic that invents answers. The first implementation shipped into
the regression sweep and **immediately broke the knowledge audit**: two worked
examples started "contradicting" the engine.

```
Simplify log_10(1000)                 -> mis-read as 10(1000)   => 10000, not 3
If |A| = 14, |B| = 10, find |A ∪ B|   -> mis-read as a letter run
```

Three constraints fixed it, and each is now pinned by a test:

| Constraint | Why |
|---|---|
| The embedded path runs **only when the prompt contains non-Latin script** | The feature exists for non-Latin sentences. Applying it to Latin prose is what broke the audit. |
| A candidate must contain a **digit and** an operator or parenthesis | Letter-only runs are set notation (`A`, `B`) or prose, never a computable expression. |
| The token `d/dx` is **rejected as an expression** | The operator is a request marker, not the function. Without this, `x^2 کا d/dx کیا ہے؟` differentiated `d/dx` and answered the nonsense `d/dx(d/dx) = 0`. |

Embedded candidates are validated with `tokenize()` rather than
`calculateExpression()`: `x^2` is legitimate input for the derivative tool but is
not a numeric evaluation, so the numeric engine would reject it, while the
tokenizer accepts variable expressions and throws on prose.

## Honesty boundary preserved

A *conceptual* Urdu question — `مشتق کیا ہے؟` ("what is a derivative?"), which
contains no expression — still produces the conceptual explanation and claims
nothing. The extraction must never turn "explain" into "here is the answer".

## Verification

```
tests/problemExtractor.test.ts         25 assertions (4 embedded, 3 operator-token, 3 prose, 3 Latin-prose)
tests/multilingualVerification11.test.ts  ur + ar derivatives computed and VERIFIED; concept question unchanged
tests/knowledgeVerification.test.ts      19 assertions, 0 failed (no item contradicts the engine)
tests/knowledgeRetrievalQuality.test.ts passed
tests/mathAgent.test.ts                passed
full sweep                             60 suites
```
