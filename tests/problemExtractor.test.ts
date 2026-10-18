/**
 * Problem extraction for derivative requests — RED test for the d/dx(...) call form.
 *
 * The extractor previously matched only "derivative of X" / "d/dx of X" (with
 * whitespace), so the canonical call form "d/dx(x^3 + 2x)" fell through to
 * kind 'unknown' and the Tutor answered "nothing could be computed" for a
 * perfectly supported request. It must also never extract a sentence word
 * ("is") as an expression from a conceptual question.
 */
import assert from 'node:assert/strict';
import { extractMathProblem } from '../src/engine/problemExtractor';
import { tokenize } from '../src/engine/mathEngine';

let passed = 0;
function check(condition: boolean, message: string): void {
  if (!condition) throw new Error(`problemExtractor failed: ${message}`);
  passed += 1;
}

function expressionOf(prompt: string): { kind: string; expression: string | null } {
  const extracted = extractMathProblem(prompt);
  return {
    kind: extracted?.kind ?? 'unknown',
    expression: extracted?.expression ?? null,
  };
}

function equationOf(prompt: string): { kind: string; equation: string | null } {
  const extracted = extractMathProblem(prompt);
  return {
    kind: extracted?.kind ?? 'unknown',
    equation: extracted?.equation ?? null,
  };
}

function checkDerivativeExtraction(prompt: string, expectedExpression: string): void {
  const { kind, expression } = expressionOf(prompt);
  check(
    kind === 'calculate' && expression === expectedExpression,
    `"${prompt}" must extract expression "${expectedExpression}" as calculate, got kind=${kind} expression=${JSON.stringify(expression)}`,
  );
}

function checkNoBogusExpression(prompt: string, forbidden: string): void {
  const { expression } = expressionOf(prompt);
  check(
    expression !== forbidden,
    `"${prompt}" must not extract "${forbidden}" as an expression, got ${JSON.stringify(expression)}`,
  );
}

async function main() {
  // Existing spaced forms must keep working.
  checkDerivativeExtraction('derivative of x^2', 'x^2');
  checkDerivativeExtraction('differentiate sin(x)', 'sin(x)');
  checkDerivativeExtraction('d/dx of x^2', 'x^2');

  // Canonical call form — the gap this test was written for.
  checkDerivativeExtraction('d/dx(x^3 + 2x)', 'x^3 + 2x');
  checkDerivativeExtraction('d/dx(x^2)', 'x^2');
  checkDerivativeExtraction('find d/dx(sin(x))', 'sin(x)');
  checkDerivativeExtraction('d/dx(cos(2x))', 'cos(2x)');

  // Conceptual questions must never leak a sentence word as the expression.
  checkNoBogusExpression('What is a derivative?', 'is');
  checkNoBogusExpression('Explain what a derivative is', 'is');

  // Baseline arithmetic and equation extraction stay intact. Equations need a
  // solving verb at the extractor level; a bare "2x + 5 = 15" is recovered by
  // the orchestrator's equation-candidate fallback, which has its own tests.
  const arithmetic = expressionOf('2 + 3');
  check(arithmetic.kind === 'calculate' && arithmetic.expression === '2 + 3', `arithmetic extraction broke: ${JSON.stringify(arithmetic)}`);
  const equation = expressionOf('solve 2x + 5 = 15');
  check(equation.kind === 'solveEquation', `equation extraction broke: ${JSON.stringify(equation)}`);

  // Everyday phrasing puts filler between the verb and the equation. Without
  // stripping it, "Solve the equation 2x + 5 = 15" was handed to the solver as
  // "the equation 2x + 5 = 15", failed, and the Tutor fell through to a
  // conceptual answer instead of solving the learner's equation.
  const fillerCases: Array<[string, string]> = [
    ['Solve the equation 2x + 5 = 15', '2x + 5 = 15'],
    ['solve this equation: x^2 - 5x + 6 = 0', 'x^2 - 5x + 6 = 0'],
    ['Find the value of x in 3x - 4 = 11', '3x - 4 = 11'],
    ['Please solve for x: 4x = 36', '4x = 36'],
  ];
  for (const [prompt, expectedEquation] of fillerCases) {
    const extracted = equationOf(prompt);
    check(
      extracted.kind === 'solveEquation' && extracted.equation === expectedEquation,
      `"${prompt}" must extract as the equation "${expectedEquation}", got ${JSON.stringify(extracted)}`,
    );
  }

  // A learner writing in Urdu or Arabic still writes the *expression* in Latin
  // characters ("x^2"), but it is surrounded by words the Latin-only patterns
  // could not see, so the request silently degraded to a conceptual answer.
  // Extraction must find the math inside a non-Latin sentence.
  const embeddedExpressionCases: Array<[string, string]> = [
    ['x^2 کا مشتق کیا ہے؟', 'x^2'],
    ['مشتق کیا ہے؟ x^2', 'x^2'],
    ['ما مشتق x^2؟', 'x^2'],
    ['3x + 5 کا مجموعہ کیا ہے؟', '3x + 5'],
  ];
  for (const [prompt, expectedExpression] of embeddedExpressionCases) {
    const embedded = expressionOf(prompt);
    check(
      embedded.kind === 'calculate' && embedded.expression === expectedExpression,
      `"${prompt}" must extract the embedded expression "${expectedExpression}", got ${JSON.stringify(embedded)}`,
    );
  }

  // The derivative operator is a request marker, never the function itself.
  // Left unchecked it produced the nonsense claim d/dx(d/dx) = 0.
  const operatorTokenCases = ['x^2 کا d/dx کیا ہے؟', 'x^3 d/dx please', '3x + 5 d/dx'];
  for (const prompt of operatorTokenCases) {
    const extracted = expressionOf(prompt);
    check(
      !/^d\/?dx$/i.test(String(extracted.expression ?? '')),
      `"${prompt}" must never extract the operator "d/dx" as the expression, got ${JSON.stringify(extracted)}`,
    );
  }

  // Prose must never be mistaken for an expression.
  const proseCases = ['مشتق کیا ہے؟', 'اشتقاق کیسے کرتے ہیں', 'شرح'];
  for (const prompt of proseCases) {
    check(
      expressionOf(prompt).kind === 'unknown',
      `"${prompt}" is prose and must not extract an expression, got ${JSON.stringify(expressionOf(prompt))}`,
    );
  }

  // The embedded-expression path is scoped to non-Latin sentences. Applied to
  // Latin prose it invented expressions and made knowledge examples disagree with
  // the engine ("Simplify log_10(1000)" and "|A| = 14, |B| = 10" were mis-read).
  const latinProseCases = [
    'Simplify log_10(1000)',
    'If |A| = 14, |B| = 10, and |A n B| = 4, find the union',
    'The value of A and B in probability',
  ];
  for (const prompt of latinProseCases) {
    check(
      expressionOf(prompt).kind !== 'calculate' || /log|sin|cos|tan|sqrt/i.test(String(expressionOf(prompt).expression ?? '')),
      `Latin prose "${prompt}" must not be mined for an expression, got ${JSON.stringify(expressionOf(prompt))}`,
    );
  }

  // RED: a misconception check states a claim before asking for confirmation.
  // The derivative capture therefore swallows the whole sentence ("x^2 is x.
  // is that right"), which passes the loose character class but is not an
  // expression — so the extractor handed prose to the engine, the engine threw,
  // and the benchmark case `misconception-1` fell through to a conceptual
  // answer instead of correcting the claim with the real derivative 2x.
  //
  // The tokenizer is the authority: the longest leading word-prefix that
  // tokenizes is the operand the learner named, and the trailing prose is
  // discarded rather than evaluated.
  const misconceptionCases: Array<[string, string]> = [
    ['I think the derivative of x^2 is x. Is that right?', 'x^2'],
    ['Is the derivative of 3x^2 really 3x?', '3x^2'],
    ['I believe the derivative of sin(x) is cos(x). Am I right?', 'sin(x)'],
    ['I guess the derivative of x^3 + 2x is 3x^2 + 2, correct?', 'x^3 + 2x'],
  ];
  for (const [prompt, expectedExpression] of misconceptionCases) {
    const extracted = expressionOf(prompt);
    check(
      extracted.kind === 'calculate' && extracted.expression === expectedExpression,
      `"${prompt}" must extract the operand "${expectedExpression}", got ${JSON.stringify(extracted)}`,
    );
  }

  // The operand must never degrade into prose, and a conceptual question must
  // still never leak a sentence word as the expression.
  const mustNotBeProse = [
    'I think the derivative of x^2 is x. Is that right?',
    'Is the derivative of 3x^2 really 3x?',
  ];
  for (const prompt of mustNotBeProse) {
    const expression = expressionOf(prompt).expression ?? '';
    check(
      !/\s/.test(expression.trim()) || /^[a-z0-9+\-*/^().]+$/i.test(expression),
      `"${prompt}" must not extract prose as an expression, got ${JSON.stringify(expression)}`,
    );
    check(
      /^[0-9a-z+\-*/^().\s]+$/i.test(expression) && tokenizeOk(expression),
      `"${prompt}" must extract a tokenizable expression, got ${JSON.stringify(expression)}`,
    );
  }
  checkNoBogusExpression('I wonder what a derivative is', 'is');

  // RED: a follow-up names the operation but carries the operand in an earlier
  // turn. "And its derivative?" has no operand inside the prompt at all, so
  // extraction returned 'unknown' and the benchmark case `followup-1` could
  // never reach the deterministic engine — the conversation that *does* hold
  // "x^2" was never handed to extraction.
  //
  // The referent path must be tightly gated: only a prompt that is nothing but
  // a relative operation request may borrow an operand from context. A mention
  // such as "Explain what a derivative is" must still fall through to the
  // conceptual path instead of silently computing somebody else's expression.
  const relativeFollowUps: Array<[string, string[], string]> = [
    ['And its derivative?', ['What is x^2?', 'x^2 is a monomial.'], 'x^2'],
    ['its derivative', ['Differentiate 3x^2 + 2.'], '3x^2 + 2'],
    ['Its derivative?', ['Find d/dx of sin(x)'], 'sin(x)'],
  ];
  for (const [prompt, context, expected] of relativeFollowUps) {
    const extracted = extractMathProblem(prompt, { context });
    check(
      extracted?.kind === 'calculate' && extracted.expression === expected,
      `relative follow-up ${JSON.stringify(prompt)} with context must yield ${JSON.stringify(expected)}, got ${JSON.stringify(extracted)}`,
    );
  }

  // Context must never be consulted when the prompt is a complete request or
  // an expository question — otherwise a stale expression gets computed.
  check(
    extractMathProblem('Find the derivative of x^2', { context: ['What is 3x?'] })?.expression === 'x^2',
    'a self-contained request must keep its own operand, not borrow one',
  );
  const expository = extractMathProblem('Explain what a derivative is', { context: ['What is x^2?', 'x^2 is a monomial.'] });
  check(
    expository?.kind === 'unknown',
    `an expository mention must not compute a referent, got ${JSON.stringify(expository)}`,
  );
  check(
    extractMathProblem('And its derivative?', { context: [] })?.kind === 'unknown',
    'a relative follow-up with no usable context must fall through, not invent an operand',
  );

  console.log(`problemExtractor tests passed: ${passed}`);
}

/** The tokenizer is the project's authority on "is this mathematics or prose". */
function tokenizeOk(candidate: string): boolean {
  try {
    tokenize(candidate);
    return true;
  } catch {
    return false;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
