/**
 * Decides whether an AI Tutor answer should also be pushed into the calculator.
 *
 * This exists as a standalone, dependency-free policy because it is a behavioural rule
 * with real consequences, not a rendering detail: a wrong `true` navigates the user out of
 * the Tutor and destroys the conversation view they were reading.
 *
 * The original inline heuristic was `/\b(calculate|compute|evaluate|what is|what's|find)\b/i`,
 * which matched the bare word "find". Asking "Find the derivative of x^2" therefore ran
 * `onAutoCalculate` and switched the application to the calculator, unmounting the Tutor
 * panel mid-answer.
 */

/** Explicit request to compute a value. */
const CALCULATION_INTENT =
  /\b(calculate|compute|evaluate|work out|solve for)\b|\bwhat(?:'s| is)\b|\bfind\b/i;

/**
 * Calculus and explanation intents. These outrank any calculation wording: "Compute the
 * derivative of x^5" is still a derivative question, not a request to evaluate something.
 */
const NON_CALCULATION_INTENT =
  /\b(derivatives?|differentiate[ds]?|differential|integrals?|integrate[ds]?|antiderivative|limits?|gradients?|tangents?|slope|partials?)\b/i;

/** An expression that is itself differential notation must never be auto-evaluated. */
const DIFFERENTIAL_EXPRESSION = /d\s*\/\s*d\s*[a-z]/i;

/**
 * @param prompt The user's normalised request text.
 * @param expression The expression the AI reported as calculator-ready, if any.
 * @returns true only when the user plainly asked for a computation AND the AI produced a
 *          usable expression AND the request is not a calculus or explanation question.
 */
export function shouldAutoCalculateFromPrompt(
  prompt: string,
  expression?: string | null,
): boolean {
  const text = typeof prompt === 'string' ? prompt.trim() : '';
  const target = typeof expression === 'string' ? expression.trim() : '';
  if (!text || !target) return false;
  if (NON_CALCULATION_INTENT.test(text)) return false;
  if (DIFFERENTIAL_EXPRESSION.test(target)) return false;
  return CALCULATION_INTENT.test(text);
}