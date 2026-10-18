export type MathematicalIntent =
  | 'EXPLAIN_CONCEPT' | 'SOLVE_PROBLEM' | 'CHECK_STEP' | 'EXPLAIN_FORMULA'
  | 'PROVE_STATEMENT' | 'FIND_ERROR' | 'GENERATE_EXAMPLE' | 'GENERATE_PRACTICE'
  | 'COMPARE_METHODS' | 'SIMPLIFY' | 'FACTOR' | 'DIFFERENTIATE' | 'INTEGRATE'
  | 'SOLVE_EQUATION' | 'SOLVE_SYSTEM' | 'STATISTICS' | 'PROBABILITY'
  | 'PHYSICS_MATH' | 'ENGINEERING_MATH' | 'DEFINITION' | 'WHY_QUESTION'
  | 'HOW_QUESTION' | 'EXAM_HELP' | 'REVIEW_MISTAKE' | 'GREETING' | 'PRODUCT_CAPABILITIES';

export function classifyMathematicalIntent(text: string): MathematicalIntent {
  const input = text.trim().toLowerCase();
  if (!input) return 'EXPLAIN_CONCEPT';
  if (/^(?:hi|hello|hey|hiya|good morning|good afternoon|good evening)\b[!.?,\s]*$/i.test(input)) return 'GREETING';
  if (/^(?:what can|what does)\s+(?:calcora(?:\s+ai)?|you|this app)\s+(?:do|help with)\b/i.test(input)) return 'PRODUCT_CAPABILITIES';
  if (/\b(check my (step|answer|work)|is this (correct|right)|verify)\b/.test(input)) return 'CHECK_STEP';
  if (/\b(why|how come)\b/.test(input)) return 'WHY_QUESTION';
  if (/\b(explain|teach me|what is|what are|define|meaning of)\b/.test(input)) {
    if (/\b(formula|equation|rule|identity|theorem|law)\b/.test(input)) return 'EXPLAIN_FORMULA';
    return 'EXPLAIN_CONCEPT';
  }
  if (/\b(prove|proof|show that)\b/.test(input)) return 'PROVE_STATEMENT';
  if (/\b(similar|another)\b.*\b(example|question|problem|method)\b/.test(input)) return 'GENERATE_EXAMPLE';
  if (/\b(give|generate|create|make)\b.*\b(practice|quiz|question)\b/.test(input)) return 'GENERATE_PRACTICE';
  if (/\b(another|different|alternative)\b.*\b(method|way|approach)\b/.test(input)) return 'COMPARE_METHODS';
  if (/\b(mistake|wrong|error)\b/.test(input)) return 'FIND_ERROR';
  if (/\b(differentiate|derivative|deriv)\b/.test(input)) return 'DIFFERENTIATE';
  if (/\b(integrate|integral|antiderivative)\b/.test(input)) return 'INTEGRATE';
  if (/\b(factor|factorise|factorize)\b/.test(input)) return 'FACTOR';
  if (/\b(simplify|simplification)\b/.test(input)) return 'SIMPLIFY';
  if (/\b(system of equations|simultaneous equations|elimination|substitution)\b/.test(input)) return 'SOLVE_SYSTEM';
  if (/\b(solve|find x|find y|calculate|evaluate|compute)\b/.test(input)) return input.includes('=') ? 'SOLVE_EQUATION' : 'SOLVE_PROBLEM';
  if (/\b(probability|bayes|binomial|permutation|combination)\b/.test(input)) return 'PROBABILITY';
  if (/\b(statistics|mean|median|variance|standard deviation|regression)\b/.test(input)) return 'STATISTICS';
  if (/\b(force|velocity|acceleration|kinetic energy|momentum|newton)\b/.test(input)) return 'PHYSICS_MATH';
  if (/\b(ohm|voltage|current|resistance|impedance|circuit)\b/.test(input)) return 'ENGINEERING_MATH';
  if (/\b(how do i|how to)\b/.test(input)) return 'HOW_QUESTION';
  if (/\b(exam|test)\b/.test(input)) return 'EXAM_HELP';
  if (/\b(review|review my mistake|mistake review)\b/.test(input)) return 'REVIEW_MISTAKE';
  return 'EXPLAIN_CONCEPT';
}
