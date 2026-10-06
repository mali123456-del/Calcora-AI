/**
 * Seeded misconception fixtures for the post-mistake recovery benchmark.
 *
 * Each case is a real learner error: a problem, the answer the deterministic engine
 * gives, and the wrong answer a learner actually submitted. `expectedClass` records the
 * observable pattern the classifier is expected to detect.
 *
 * These are authored fixtures describing *error patterns*, not real students. No
 * personal, psychological or sensitive attribute appears anywhere in this file, and
 * none is inferred from any of it.
 */

export interface MisconceptionFixture {
  id: string;
  concept: string;
  problem: string;
  /** The value the deterministic engine produces. */
  expected: string;
  /** The learner's wrong submission. */
  learnerAnswer: string;
  /** The observable error class the classifier should report. */
  expectedClass: string;
  /** A note describing the observable pattern, used in benchmark output only. */
  note: string;
}

export const MISCONCEPTION_FIXTURES: MisconceptionFixture[] = [
  // --- sign errors -----------------------------------------------------------
  { id: 'mc-sign-01', concept: 'Linear equations', problem: 'Solve 2x + 4 = 10', expected: '3', learnerAnswer: '-3', expectedClass: 'sign_error', note: 'Correct magnitude, inverted sign.' },
  { id: 'mc-sign-02', concept: 'Linear equations', problem: 'Solve 5x - 10 = 15', expected: '5', learnerAnswer: '-5', expectedClass: 'sign_error', note: 'Correct magnitude, inverted sign.' },
  { id: 'mc-sign-03', concept: 'Linear equations', problem: 'Solve -3x + 6 = 0', expected: '2', learnerAnswer: '-2', expectedClass: 'sign_error', note: 'Leading negative mishandled.' },
  { id: 'mc-sign-04', concept: 'Integers', problem: 'Calculate -7 - 9', expected: '-16', learnerAnswer: '16', expectedClass: 'sign_error', note: 'Subtracting a negative treated as addition of a positive.' },
  { id: 'mc-sign-05', concept: 'Quadratics', problem: 'Solve x^2 - 5x + 6 = 0', expected: '3', learnerAnswer: '-3', expectedClass: 'sign_error', note: 'One root reported with inverted sign.' },
  { id: 'mc-sign-06', concept: 'Fractions', problem: 'Calculate -3/4 + 1/2', expected: '-0.25', learnerAnswer: '0.25', expectedClass: 'sign_error', note: 'Fraction sign lost.' },
  { id: 'mc-sign-07', concept: 'Linear equations', problem: 'Solve 3x - 12 = 6', expected: '6', learnerAnswer: '-6', expectedClass: 'sign_error', note: 'Constant moved with sign error.' },
  { id: 'mc-sign-08', concept: 'Powers', problem: 'Calculate (-2)^3', expected: '-8', learnerAnswer: '8', expectedClass: 'sign_error', note: 'Odd power of a negative treated as positive.' },

  // --- order of operations ---------------------------------------------------
  { id: 'mc-oop-01', concept: 'Order of operations', problem: 'Calculate 2 + 3 * 4', expected: '14', learnerAnswer: '20', expectedClass: 'order_of_operations_error', note: 'Evaluated strictly left to right.' },
  { id: 'mc-oop-02', concept: 'Order of operations', problem: 'Calculate 5 + 2 * 3', expected: '11', learnerAnswer: '21', expectedClass: 'order_of_operations_error', note: 'Evaluated strictly left to right.' },
  { id: 'mc-oop-03', concept: 'Order of operations', problem: 'Calculate 10 - 2 * 3', expected: '4', learnerAnswer: '24', expectedClass: 'order_of_operations_error', note: 'Evaluated strictly left to right: 10-2=8, then 8*3=24.' },
  { id: 'mc-oop-04', concept: 'Order of operations', problem: 'Calculate 2 * 3 + 4 * 5', expected: '26', learnerAnswer: '50', expectedClass: 'order_of_operations_error', note: 'Evaluated strictly left to right: 6+4=10, then 10*5=50.' },
  { id: 'mc-oop-05', concept: 'Brackets', problem: 'Calculate 18 - 3 * 2', expected: '12', learnerAnswer: '30', expectedClass: 'order_of_operations_error', note: 'Multiplication done before the subtraction: 18-3=15, then 15*2=30.' },
  { id: 'mc-oop-06', concept: 'Brackets', problem: 'Calculate 12 - 6 / 2', expected: '9', learnerAnswer: '3', expectedClass: 'order_of_operations_error', note: 'Division done before the subtraction: 12-6=6, then 6/2=3.' },

  // --- distribution / partial operation -------------------------------------
  { id: 'mc-op-01', concept: 'Distributive law', problem: 'Calculate 2 * (3 + 4)', expected: '14', learnerAnswer: '10', expectedClass: 'operation_error', note: 'Outside factor applied to the first term only.' },
  { id: 'mc-op-02', concept: 'Distributive law', problem: 'Calculate 3 * (2 + 5)', expected: '21', learnerAnswer: '11', expectedClass: 'operation_error', note: 'Outside factor applied to the first term only.' },
  { id: 'mc-op-03', concept: 'Distributive law', problem: 'Calculate 4 * (1 + 6)', expected: '28', learnerAnswer: '10', expectedClass: 'operation_error', note: 'Outside factor applied to the first term only.' },
  { id: 'mc-op-04', concept: 'Distributive law', problem: 'Calculate 5 * (2 + 3)', expected: '25', learnerAnswer: '13', expectedClass: 'operation_error', note: 'Outside factor applied to the first term only.' },

  // --- variable isolation ---------------------------------------------------
  { id: 'mc-iso-01', concept: 'Linear equations', problem: 'Solve 2x + 5 = 17', expected: '6', learnerAnswer: '2x = 5 - 17', expectedClass: 'variable_isolation_error', note: 'Constant moved to one side only, so the two sides no longer match.' },
  { id: 'mc-iso-02', concept: 'Linear equations', problem: 'Solve 3x + 4 = 19', expected: '5', learnerAnswer: '3x = 4 - 19', expectedClass: 'variable_isolation_error', note: 'Constant moved to one side only.' },
  { id: 'mc-iso-03', concept: 'Linear equations', problem: 'Solve 4x - 6 = 14', expected: '5', learnerAnswer: '4x = 6 - 14', expectedClass: 'variable_isolation_error', note: 'Constant moved to one side only.' },
  { id: 'mc-iso-04', concept: 'Linear equations', problem: 'Solve 5x + 3 = 23', expected: '4', learnerAnswer: '5x = 3 - 23', expectedClass: 'variable_isolation_error', note: 'Constant moved to one side only.' },

  // --- arithmetic slips -----------------------------------------------------
  { id: 'mc-ari-01', concept: 'Arithmetic', problem: 'Calculate 17 * 23', expected: '391', learnerAnswer: '381', expectedClass: 'arithmetic_mistake', note: 'Close value from a digit slip.' },
  { id: 'mc-ari-02', concept: 'Arithmetic', problem: 'Calculate 45 + 37', expected: '82', learnerAnswer: '72', expectedClass: 'arithmetic_mistake', note: 'Close value from a carry slip.' },
  { id: 'mc-ari-03', concept: 'Arithmetic', problem: 'Calculate 96 - 38', expected: '58', learnerAnswer: '68', expectedClass: 'arithmetic_mistake', note: 'Close value from a borrow slip.' },
  { id: 'mc-ari-04', concept: 'Percentages', problem: 'Calculate 15 * 850 / 100', expected: '127.5', learnerAnswer: '117.5', expectedClass: 'arithmetic_mistake', note: 'Close value from a digit slip.' },
  { id: 'mc-ari-05', concept: 'Arithmetic', problem: 'Calculate 144 / 12', expected: '12', learnerAnswer: '14', expectedClass: 'arithmetic_mistake', note: 'Close value from a digit slip.' },
  { id: 'mc-ari-06', concept: 'Arithmetic', problem: 'Calculate 25 * 16', expected: '400', learnerAnswer: '410', expectedClass: 'arithmetic_mistake', note: 'Close value from a carry slip.' },

  // --- domain / unit --------------------------------------------------------
  { id: 'mc-dom-01', concept: 'Domain restrictions', problem: 'Calculate 5 / 0', expected: 'undefined', learnerAnswer: '0', expectedClass: 'domain_restriction', note: 'Division by zero treated as zero.' },
  { id: 'mc-dom-02', concept: 'Domain restrictions', problem: 'Calculate 1 / (4 - 4)', expected: 'undefined', learnerAnswer: '1', expectedClass: 'domain_restriction', note: 'Vanishing denominator not detected.' },
  { id: 'mc-unit-01', concept: 'Units', problem: 'Calculate 12 * 12', expected: '144', learnerAnswer: '144 cm', expectedClass: 'unit_error', note: 'Unit attached where none was requested.' },
  { id: 'mc-unit-02', concept: 'Units', problem: 'Calculate 9 * 9', expected: '81', learnerAnswer: '81 kg', expectedClass: 'unit_error', note: 'Unit attached where none was requested.' },

  // --- formula selection / unsolved form ------------------------------------
  { id: 'mc-for-01', concept: 'Formula application', problem: 'Solve 2x + 6 = 14', expected: '4', learnerAnswer: 'x = 4', expectedClass: 'formula_selection_error', note: 'Left in unsolved symbolic form.' },
  { id: 'mc-for-02', concept: 'Formula application', problem: 'Solve 3x + 9 = 18', expected: '3', learnerAnswer: 'x = 3', expectedClass: 'formula_selection_error', note: 'Left in unsolved symbolic form.' },
  { id: 'mc-for-03', concept: 'Formula application', problem: 'Solve 5x + 5 = 20', expected: '3', learnerAnswer: 'x = 3', expectedClass: 'formula_selection_error', note: 'Left in unsolved symbolic form.' },

  // --- divergent method -----------------------------------------------------
  { id: 'mc-div-01', concept: 'Linear equations', problem: 'Solve 7x + 2 = 23', expected: '3', learnerAnswer: '4', expectedClass: 'algebraic_manipulation_error', note: 'Diverges without a single identifiable pattern.' },
  { id: 'mc-div-02', concept: 'Arithmetic', problem: 'Calculate 12 * 12', expected: '144', learnerAnswer: '24', expectedClass: 'algebraic_manipulation_error', note: 'Diverges without a single identifiable pattern.' },
  { id: 'mc-div-03', concept: 'Linear equations', problem: 'Solve 9x - 4 = 14', expected: '2', learnerAnswer: '5', expectedClass: 'algebraic_manipulation_error', note: 'Diverges without a single identifiable pattern.' },
  { id: 'mc-div-04', concept: 'Percentages', problem: 'Calculate 20 * 250 / 100', expected: '50', learnerAnswer: '70', expectedClass: 'algebraic_manipulation_error', note: 'Diverges without a single identifiable pattern.' },
  { id: 'mc-div-05', concept: 'Arithmetic', problem: 'Calculate 55 * 4', expected: '220', learnerAnswer: '300', expectedClass: 'algebraic_manipulation_error', note: 'Diverges by more than a plausible slip.' },
];
