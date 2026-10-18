/**
 * RED-first regression for a view-hijacking auto-calculation heuristic.
 *
 * Defect: the AI panel auto-ran the extracted expression whenever the prompt matched
 * /\b(calculate|compute|evaluate|what is|what's|find)\b/i. "Find the derivative of x^2"
 * matches "find", so onAutoCalculate fired and the application navigated away from the AI
 * tab to the calculator, unmounting `#ai-prompt-input`. Observed in the packaged app: the
 * input element was destroyed 2 s after submit, so any wait for it to re-enable timed out
 * regardless of duration -- which is why raising the timeout from 30 s to 300 s changed
 * nothing.
 *
 * The policy is extracted here so it can be asserted directly rather than inferred from a
 * React handler.
 */
import assert from 'node:assert/strict';
import { shouldAutoCalculateFromPrompt } from '../src/services/autoCalculateIntent';

function main() {
  // A calculus request must never hijack the view, however it is phrased.
  for (const prompt of [
    'Find the derivative of x^2',
    'find the derivative of x^2',
    'What is the derivative of sin(x)?',
    'differentiate x^3',
    'Compute the derivative of x^5',
    'Evaluate the integral of 2x',
    'Find the second derivative of x^4',
    'What is the limit of sin(x)/x as x approaches 0?',
    'Explain the derivative of x^2',
  ]) {
    assert.equal(
      shouldAutoCalculateFromPrompt(prompt, 'x^2'),
      false,
      `a calculus/explanation request must not auto-calculate: ${JSON.stringify(prompt)}`,
    );
  }

  // Differential notation in the extracted expression is itself disqualifying.
  assert.equal(
    shouldAutoCalculateFromPrompt('What is this?', 'd/dx(x^2)'),
    false,
    'a differential expression must never be auto-evaluated',
  );

  // Genuine arithmetic and algebra requests must keep working -- the heuristic exists to
  // be useful, so this is not a case of deleting the feature to get green.
  for (const [prompt, expression] of [
    ['Calculate 2 + 3', '2 + 3'],
    ['what is 12 * 12', '12 * 12'],
    ['Compute 45 / 9', '45 / 9'],
    ['Find the value of 7 * 6', '7 * 6'],
    ['Evaluate x^2 when x = 5', '5^2'],
  ] as const) {
    assert.equal(
      shouldAutoCalculateFromPrompt(prompt, expression),
      true,
      `an explicit calculation request must still auto-calculate: ${JSON.stringify(prompt)}`,
    );
  }

  // No usable expression means there is nothing to auto-calculate.
  assert.equal(shouldAutoCalculateFromPrompt('Calculate 2 + 3', undefined), false, 'no expression means no auto-calculation');
  assert.equal(shouldAutoCalculateFromPrompt('Calculate 2 + 3', null), false, 'a null expression means no auto-calculation');
  assert.equal(shouldAutoCalculateFromPrompt('Calculate 2 + 3', '   '), false, 'a blank expression means no auto-calculation');
  assert.equal(shouldAutoCalculateFromPrompt('', '2 + 3'), false, 'an empty prompt cannot express calculation intent');

  console.log('PASS  calculus and explanation requests never auto-calculate');
  console.log('PASS  differential expressions are never auto-evaluated');
  console.log('PASS  explicit arithmetic requests still auto-calculate');
  console.log('PASS  a missing or blank expression suppresses auto-calculation');
}

main();