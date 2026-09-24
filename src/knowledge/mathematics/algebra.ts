import { MathKnowledgeItem } from '../knowledgeTypes';

export const algebraKnowledge: MathKnowledgeItem[] = [
  {
    id: 'alg-linear-equations',
    topic: 'Algebra',
    subtopic: 'Linear Equations',
    level: 'beginner',
    concept: 'Linear Equations and Inverse Operations',
    definition:
      'A first-degree equation in one variable, having standard form ax + b = c (with a != 0). Solved by applying inverse operations equally to both sides of the equation to isolate the variable.',
    notation: 'ax + b = c \\quad (a \\neq 0)',
    formulas: ['x = \\frac{c - b}{a}'],
    assumptions: ['Coefficient a != 0.'],
    domainRestrictions: ['If a = 0 and b != c, no solution exists. If a = 0 and b = c, infinitely many solutions exist.'],
    examples: [
      {
        problem: 'Solve 2x + 5 = 17',
        solution: 'x = 6',
        steps: [
          'Subtract 5 from both sides: 2x = 17 - 5 = 12',
          'Divide both sides by 2: x = 12 / 2 = 6',
          'Check: 2(6) + 5 = 12 + 5 = 17 (verified)',
        ],
        latex: '2x + 5 = 17 \\implies 2x = 12 \\implies x = 6',
      },
    ],
    commonMistakes: [
      {
        mistake: 'Adding 5 instead of subtracting when moving across equality: 2x = 17 + 5 = 22.',
        correction: 'Subtract 5: 2x = 17 - 5 = 12.',
        why: 'The inverse operation of +5 is -5.',
        preventionTip: 'Whatever is added to the variable must be subtracted from both sides to preserve balance.',
      },
      {
        mistake: 'Dividing only part of the equation by the coefficient.',
        correction: 'Divide every term or both sides completely by the coefficient.',
        why: 'Equality is preserved only when the entire side is divided.',
        preventionTip: 'Ensure every term across the equality sign receives identical operations.',
      },
    ],
    solutionStrategies: [
      'Simplify both sides by clearing parentheses and combining like terms.',
      'Group variable terms on one side and constant terms on the other side using addition/subtraction.',
      'Isolate variable by multiplying or dividing by its leading coefficient.',
      'Substitute solution back into the original equation to verify.',
    ],
    relatedTopics: ['linear-inequalities', 'systems-of-equations', 'slope-intercept-form'],
    prerequisiteTopics: ['arithmetic-operations', 'order-of-operations'],
    keywords: ['linear equation', 'isolate variable', 'inverse operations', 'solve for x', 'balance equation'],
    aliases: ['first degree equation', 'single variable linear'],
    latexRepresentation: 'ax + b = c \\implies x = \\frac{c - b}{a}',
    sourceMetadata: {
      sourceName: 'Standard Algebra Curriculum & Axiomatic Equality Properties',
      sourceType: 'standard_mathematical_definition',
      licenseOrStatus: 'public_mathematical_knowledge',
      accessedAt: '2026-09-23',
    },
  },
  {
    id: 'alg-quadratic-formula',
    topic: 'Algebra',
    subtopic: 'Quadratic Equations',
    level: 'intermediate',
    concept: 'Quadratic Formula and the Discriminant',
    definition:
      'The general solution to a second-degree polynomial equation ax^2 + bx + c = 0 (where a != 0). Derived via completing the square. The discriminant Delta = b^2 - 4ac determines the number and nature of roots.',
    notation: 'ax^2 + bx + c = 0, \\quad a \\neq 0',
    formulas: [
      'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}',
      '\\Delta = b^2 - 4ac',
    ],
    assumptions: ['Leading coefficient a != 0.'],
    domainRestrictions: [
      '\\Delta > 0 \\implies \\text{two distinct real roots}',
      '\\Delta = 0 \\implies \\text{one real repeated root}',
      '\\Delta < 0 \\implies \\text{two complex conjugate roots}',
    ],
    theorems: ['Fundamental Theorem of Algebra: a degree 2 polynomial has exactly 2 roots counting multiplicity.'],
    examples: [
      {
        problem: 'Solve x^2 - 5x + 6 = 0',
        solution: 'x = 2, x = 3',
        steps: [
          'Identify a = 1, b = -5, c = 6',
          'Calculate discriminant: Delta = (-5)^2 - 4(1)(6) = 25 - 24 = 1',
          'Apply formula: x = (5 +- sqrt(1)) / 2 = (5 +- 1) / 2',
          'x_1 = (5 + 1)/2 = 3, x_2 = (5 - 1)/2 = 2',
        ],
        latex: 'x = \\frac{5 \\pm \\sqrt{25 - 24}}{2} = \\frac{5 \\pm 1}{2} \\implies x \\in \\{2, 3\\}',
      },
    ],
    counterexamples: ['x^2 = 9 gives x = +-3, omitting the negative root -3 is an incomplete solution.'],
    commonMistakes: [
      {
        mistake: 'Writing -b as negative unconditionally even when b is already negative (e.g. for b = -5 writing -5 instead of +5).',
        correction: '-(-5) = +5.',
        why: 'The formula specifies the negation of b; negating a negative number yields a positive.',
        preventionTip: 'Substitute negative coefficients inside parentheses: -(-5).',
      },
      {
        mistake: 'Dividing only the radical term by 2a instead of the entire numerator.',
        correction: 'Both -b and the square root must be divided by 2a.',
        why: 'Fraction bar groups the entire numerator: (-b +- sqrt(Delta)) / (2a).',
        preventionTip: 'Draw the fraction line under the entire expression -b +- sqrt(Delta).',
      },
    ],
    solutionStrategies: [
      'Rewrite equation into standard form ax^2 + bx + c = 0.',
      'Check if factoring or square roots is simpler first.',
      'Calculate discriminant Delta = b^2 - 4ac to determine nature of roots.',
      'Substitute carefully into the quadratic formula and simplify exact radicals.',
    ],
    alternativeMethods: ['factoring', 'completing the square', 'graphing x-intercepts'],
    relatedTopics: ['factoring-polynomials', 'complex-roots', 'parabolas'],
    prerequisiteTopics: ['linear-equations', 'radicals', 'polynomials'],
    keywords: ['quadratic formula', 'discriminant', 'parabola', 'roots', 'completing the square', 'zero product property'],
    aliases: ['quadratic equation', 'abc formula'],
    latexRepresentation: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}',
    sourceMetadata: {
      sourceName: 'Classical Algebraic Solution to Second Degree Equations',
      sourceType: 'classical_theorem',
      licenseOrStatus: 'public_mathematical_knowledge',
      accessedAt: '2026-09-23',
    },
  },
  {
    id: 'alg-systems-of-equations',
    topic: 'Algebra',
    subtopic: 'Systems of Equations',
    level: 'intermediate',
    concept: 'Systems of Linear Equations',
    definition:
      'A set of two or more equations with common variables. Solvable via substitution, elimination (linear combinations), or matrix methods. Represents finding point(s) of intersection of geometric hyperplanes.',
    notation: '\\begin{cases} a_1 x + b_1 y = c_1 \\\\ a_2 x + b_2 y = c_2 \\end{cases}',
    formulas: [
      'x = \\frac{c_1 b_2 - c_2 b_1}{a_1 b_2 - a_2 b_1} \\quad (\\text{Cramer\'s Rule})',
      'y = \\frac{a_1 c_2 - a_2 c_1}{a_1 b_2 - a_2 b_1}',
    ],
    assumptions: ['Lines are non-parallel for a unique solution.'],
    domainRestrictions: [
      'a_1 b_2 - a_2 b_1 \\neq 0 \\implies \\text{unique solution}',
      'a_1 b_2 - a_2 b_1 = 0 \\implies \\text{inconsistent (no solution) or dependent (infinite solutions)}',
    ],
    examples: [
      {
        problem: 'Solve x + y = 10 and x - y = 4',
        solution: 'x = 7, y = 3',
        steps: [
          'Add both equations: (x + y) + (x - y) = 10 + 4 => 2x = 14 => x = 7',
          'Substitute into first equation: 7 + y = 10 => y = 3',
          'Check: 7 - 3 = 4 (verified)',
        ],
        latex: '\\begin{cases} x + y = 10 \\\\ x - y = 4 \\end{cases} \\implies 2x = 14 \\implies x = 7, y = 3',
      },
    ],
    commonMistakes: [
      {
        mistake: 'Multiplying one side of an equation by a constant without multiplying the constant term on the other side.',
        correction: 'Multiply all terms on both sides of the equation by the scale factor.',
        why: 'Failing to multiply the right-hand side invalidates the equation.',
        preventionTip: 'Distribute the multiplier explicitly across both sides: k*(ax + by) = k*c.',
      },
    ],
    solutionStrategies: [
      'Examine coefficients: if one variable has coefficient 1 or -1, substitution is quick.',
      'If coefficients can easily be made opposites, use the elimination method.',
      'Always substitute both values back into the unused equation to confirm consistency.',
    ],
    alternativeMethods: ['elimination', 'substitution', 'Cramer\'s rule', 'matrix inverse', 'graphical intersection'],
    relatedTopics: ['matrices', 'gaussian-elimination', 'linear-transformations'],
    prerequisiteTopics: ['linear-equations'],
    keywords: ['system of equations', 'simultaneous equations', 'elimination', 'substitution', 'intersection'],
    aliases: ['simultaneous linear equations', '2x2 system'],
    latexRepresentation: '\\begin{cases} a_1 x + b_1 y = c_1 \\\\ a_2 x + b_2 y = c_2 \\end{cases}',
    sourceMetadata: {
      sourceName: 'Standard Linear Systems Algebra',
      sourceType: 'standard_mathematical_definition',
      licenseOrStatus: 'public_mathematical_knowledge',
      accessedAt: '2026-09-23',
    },
  },
  {
    id: 'alg-logarithms-exponentials',
    topic: 'Algebra',
    subtopic: 'Logarithms and Exponentials',
    level: 'intermediate',
    concept: 'Logarithmic Properties and Change of Base',
    definition:
      'The logarithm log_b(x) is the exponent to which the base b must be raised to yield x: y = log_b(x) <=> b^y = x. Properties convert products to sums, quotients to differences, and powers to coefficients.',
    notation: '\\log_b(x) = y \\iff b^y = x',
    formulas: [
      '\\log_b(xy) = \\log_b(x) + \\log_b(y)',
      '\\log_b\\left(\\frac{x}{y}\\right) = \\log_b(x) - \\log_b(y)',
      '\\log_b(x^k) = k \\log_b(x)',
      '\\log_b(x) = \\frac{\\ln(x)}{\\ln(b)} = \\frac{\\log_{10}(x)}{\\log_{10}(b)} \\quad (\\text{Change of Base})',
    ],
    assumptions: ['Base b > 0 and b != 1.', 'Argument x > 0 for real logarithms.'],
    domainRestrictions: ['x > 0 \\text{ strictly}', 'b > 0, b \\neq 1', '\\log(0) \\text{ and } \\log(\\text{negative}) \\text{ are undefined in } \\mathbb{R}'],
    examples: [
      {
        problem: 'Simplify log_10(1000)',
        solution: '3',
        steps: ['10^3 = 1000, so log_10(10^3) = 3 * log_10(10) = 3 * 1 = 3'],
        latex: '\\log_{10}(1000) = 3',
      },
    ],
    commonMistakes: [
      {
        mistake: 'Assuming log(x + y) = log(x) + log(y).',
        correction: 'log(x * y) = log(x) + log(y). The logarithm of a sum does NOT distribute.',
        why: 'Logarithms turn multiplication into addition, not addition into addition.',
        preventionTip: 'Remember: log of a PRODUCT is the SUM of logs. There is no simple identity for log(x + y).',
      },
      {
        mistake: 'Attempting to evaluate log of zero or a negative number in real calculations.',
        correction: 'Logarithm argument must be strictly positive (x > 0).',
        why: 'b^y > 0 for any real exponent y when b > 0.',
        preventionTip: 'Always verify domain conditions when solving logarithmic equations; discard extraneous roots.',
      },
    ],
    solutionStrategies: [
      'Condense logarithmic terms using sum/difference rules before solving.',
      'Convert logarithmic form to exponential form b^y = x.',
      'Check for extraneous solutions against the restriction argument > 0.',
    ],
    relatedTopics: ['exponents', 'natural-logarithm', 'exponential-growth'],
    prerequisiteTopics: ['exponents', 'functions'],
    keywords: ['logarithm', 'log', 'natural log', 'ln', 'change of base', 'exponential equations'],
    aliases: ['logs', 'log rules'],
    latexRepresentation: '\\log_b(xy) = \\log_b(x) + \\log_b(y), \\quad \\log_b(x) = \\frac{\\ln(x)}{\\ln(b)}',
    sourceMetadata: {
      sourceName: 'John Napier / Classical Exponential and Logarithmic Theory',
      sourceType: 'classical_theorem',
      licenseOrStatus: 'public_mathematical_knowledge',
      accessedAt: '2026-09-23',
    },
  },
];
