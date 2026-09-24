import { MathKnowledgeItem } from '../knowledgeTypes';

export const precalculusDiscreteKnowledge: MathKnowledgeItem[] = [
  {
    id: 'disc-set-theory-logic',
    topic: 'Discrete Mathematics',
    subtopic: 'Set Theory & Propositional Logic',
    level: 'intermediate',
    concept: 'Set Operations and Boolean Logic',
    definition:
      'Set theory formalizes collections of mathematical objects. Basic operations include union, intersection, complement, Cartesian product, and power set. Propositional logic governs truth values under AND, OR, NOT, implies, and iff with De Morgan\'s Laws.',
    notation: 'A \\cup B, \\quad A \\cap B, \\quad A^c, \\quad P \\implies Q, \\quad \\neg(P \\land Q) \\equiv \\neg P \\lor \\neg Q',
    formulas: [
      '|A \\cup B| = |A| + |B| - |A \\cap B|',
      '\\neg(P \\land Q) \\iff \\neg P \\lor \\neg Q',
      '\\neg(P \\lor Q) \\iff \\neg P \\land \\neg Q',
      'P \\implies Q \\iff \\neg P \\lor Q \\iff \\neg Q \\implies \\neg P',
      '|\\mathcal{P}(A)| = 2^{|A|}',
    ],
    assumptions: ['Sets A and B are well-defined.', 'Universe U is non-empty.'],
    domainRestrictions: ['Universal set U bounding complements.'],
    theorems: [
      'De Morgan\'s Laws for Sets: (A ∪ B)^c = A^c ∩ B^c, (A ∩ B)^c = A^c ∪ B^c.',
      'Inclusion-Exclusion Principle for finite sets.',
    ],
    examples: [
      {
        problem: 'If |A| = 14, |B| = 10, and |A ∩ B| = 4, find |A ∪ B|',
        solution: '20',
        steps: [
          'Apply the inclusion-exclusion principle: |A ∪ B| = |A| + |B| - |A ∩ B|',
          'Substitute given values: |A ∪ B| = 14 + 10 - 4',
          'Calculate: 24 - 4 = 20',
        ],
        latex: '|A \\cup B| = 14 + 10 - 4 = 20',
      },
    ],
    commonMistakes: [
      {
        mistake: 'Assuming |A ∪ B| = |A| + |B| without subtracting the intersection.',
        correction: 'Subtract |A ∩ B| to avoid double-counting elements in both sets.',
        why: 'Elements in A ∩ B belong to both A and B, so they are added twice in |A| + |B|.',
        preventionTip: 'Draw a Venn diagram or check if sets are mutually disjoint before adding.',
      },
    ],
    solutionStrategies: [
      'Use Venn diagrams for visualizing set relationships.',
      'Apply truth tables or logical equivalence rules for propositional logic.',
    ],
    relatedTopics: ['probability', 'boolean-algebra', 'combinatorics'],
    prerequisiteTopics: ['algebraic-logic'],
    keywords: ['set', 'union', 'intersection', 'subset', 'de morgan', 'logic', 'implication', 'venn diagram'],
    aliases: ['set theory', 'boolean logic'],
    latexRepresentation: '|A \\cup B| = |A| + |B| - |A \\cap B|',
    sourceMetadata: {
      sourceName: 'Cantor Set Theory & Boole Laws of Thought',
      sourceType: 'standard_mathematical_definition',
      licenseOrStatus: 'public_mathematical_knowledge',
      accessedAt: '2026-09-24',
    },
  },
  {
    id: 'diff-eq-first-order',
    topic: 'Differential Equations',
    subtopic: 'First-Order Ordinary Differential Equations',
    level: 'advanced',
    concept: 'Separable Differential Equations and Integrating Factor',
    definition:
      'A first-order ordinary differential equation relates a function y(x) and its first derivative dy/dx. Separable ODEs can be rewritten as g(y)dy = f(x)dx and integrated. Linear ODEs dy/dx + P(x)y = Q(x) are solved using an integrating factor μ(x) = e^{∫P(x)dx}.',
    notation: '\\frac{dy}{dx} + P(x)y = Q(x), \\quad \\mu(x) = e^{\\int P(x)dx}',
    formulas: [
      '\\int g(y)\\,dy = \\int f(x)\\,dx + C \\quad (\\text{Separable})',
      '\\mu(x) = e^{\\int P(x)\\,dx}',
      'y(x) = \\frac{1}{\\mu(x)} \\left( \\int \\mu(x)Q(x)\\,dx + C \\right)',
    ],
    assumptions: ['Functions P(x) and Q(x) are continuous on the domain interval.'],
    domainRestrictions: ['Intervals where P(x) or Q(x) do not have singularities or division by zero.'],
    theorems: [
      'Picard-Lindelöf Existence and Uniqueness Theorem: If f(x, y) and ∂f/∂y are continuous, unique solution exists through (x0, y0).',
    ],
    examples: [
      {
        problem: 'Solve dy/dx = 2xy',
        solution: 'y = C * e^{x^2}',
        steps: [
          'Separate variables: dy / y = 2x dx',
          'Integrate both sides: ∫ (1/y) dy = ∫ 2x dx',
          'ln|y| = x^2 + C_1',
          'Exponentiate: |y| = e^{x^2 + C_1} = e^{C_1} * e^{x^2}',
          'General solution: y = C e^{x^2} where C is an arbitrary constant.',
        ],
        latex: 'y(x) = C e^{x^2}',
      },
    ],
    commonMistakes: [
      {
        mistake: 'Forgetting the constant of integration C when integrating both sides.',
        correction: 'Always append + C immediately upon integration before exponentiating or applying initial conditions.',
        why: 'Without + C, family of solutions is lost and initial value problems yield incorrect values.',
        preventionTip: 'Write + C at the exact step where the integral sign is removed.',
      },
    ],
    solutionStrategies: [
      'Check if terms involving y and dy can be grouped completely on one side.',
      'For linear ODEs, write in standard form dy/dx + P(x)y = Q(x) to identify P(x).',
    ],
    relatedTopics: ['calculus-integrals', 'exponential-growth', 'physics-kinematics'],
    prerequisiteTopics: ['calculus-derivatives', 'calculus-integrals'],
    keywords: ['differential equation', 'ode', 'integrating factor', 'separable equation', 'calculus'],
    aliases: ['ode solving', 'integrating factor method'],
    latexRepresentation: '\\frac{dy}{dx} + P(x)y = Q(x) \\implies y = \\frac{1}{\\mu}\\int \\mu Q\\,dx',
    sourceMetadata: {
      sourceName: 'Ordinary Differential Equations Standard Formulation',
      sourceType: 'classical_theorem',
      licenseOrStatus: 'public_mathematical_knowledge',
      accessedAt: '2026-09-24',
    },
  },
  {
    id: 'complex-numbers-euler',
    topic: 'Complex Numbers',
    subtopic: 'Complex Arithmetic and Euler\'s Formula',
    level: 'intermediate',
    concept: 'Complex Numbers, Polar Coordinates, and Euler\'s Identity',
    definition:
      'Complex numbers z = a + bi (where i^2 = -1) extend real numbers to algebraically closed field. Represented in polar form as z = r(cos θ + i sin θ) = r e^{iθ} where r = |z| = √(a^2 + b^2) and θ = arg(z). Euler\'s formula relates complex exponentials and trigonometry.',
    notation: 'z = a + bi = r e^{i\\theta}, \\quad i^2 = -1, \\quad e^{i\\pi} + 1 = 0',
    formulas: [
      'e^{i\\theta} = \\cos\\theta + i\\sin\\theta',
      'e^{i\\pi} + 1 = 0 \\quad (\\text{Euler\'s Identity})',
      '|z| = \\sqrt{a^2 + b^2}, \\quad \\theta = \\text{atan2}(b, a)',
      'z_1 z_2 = r_1 r_2 e^{i(\\theta_1 + \\theta_2)}',
      'z^n = r^n e^{i n\\theta} = r^n (\\cos(n\\theta) + i\\sin(n\\theta)) \\quad (\\text{De Moivre\'s Theorem})',
    ],
    assumptions: ['Real numbers a, b in z = a + bi.', 'r >= 0.'],
    domainRestrictions: ['θ is uniquely determined in (-π, π] for principal argument Arg(z).', 'z != 0 for arg(z).'],
    theorems: [
      'Fundamental Theorem of Algebra: Every non-zero single-variable polynomial of degree n with complex coefficients has exactly n complex roots (counted with multiplicity).',
      'De Moivre\'s Theorem: [r(cos θ + i sin θ)]^n = r^n(cos(nθ) + i sin(nθ)).',
    ],
    examples: [
      {
        problem: 'Express (1 + i)^4 in standard form a + bi',
        solution: '-4',
        steps: [
          'Find modulus: r = √(1^2 + 1^2) = √2',
          'Find argument: θ = arctan(1/1) = π/4',
          'Polar form: 1 + i = √2 * e^{i π/4}',
          'Apply De Moivre: (1 + i)^4 = (√2)^4 * e^{i * 4 * π/4} = 4 * e^{i π}',
          'Evaluate: 4 * (cos π + i sin π) = 4 * (-1 + 0i) = -4',
        ],
        latex: '(1 + i)^4 = 4 e^{i\\pi} = -4',
      },
    ],
    commonMistakes: [
      {
        mistake: 'Writing √(a) * √(b) = √(ab) when both a and b are negative.',
        correction: '√(-1) * √(-1) = i * i = -1, whereas √((-1)*(-1)) = √1 = 1.',
        why: 'The product rule for radicals √(ab) = √a √b only holds when at least one radicand is non-negative.',
        preventionTip: 'Convert square roots of negative numbers into i terms before multiplying.',
      },
    ],
    solutionStrategies: [
      'Convert to polar form r e^{iθ} before taking high powers or nth roots.',
      'Multiply numerator and denominator by complex conjugate to divide complex numbers.',
    ],
    relatedTopics: ['trigonometry', 'polynomial-roots', 'fourier-transform'],
    prerequisiteTopics: ['algebra', 'trigonometry'],
    keywords: ['complex numbers', 'euler formula', 'imaginary unit', 'de moivre', 'polar form', 'roots of unity'],
    aliases: ['imaginary numbers', 'euler identity', 'polar complex form'],
    latexRepresentation: 'z = r e^{i\\theta} = r(\\cos\\theta + i\\sin\\theta)',
    sourceMetadata: {
      sourceName: 'Euler Introductio in analysin infinitorum & Gauss Fundamental Theorem of Algebra',
      sourceType: 'classical_theorem',
      licenseOrStatus: 'public_mathematical_knowledge',
      accessedAt: '2026-09-24',
    },
  },
  {
    id: 'fin-compound-interest',
    topic: 'Financial Mathematics',
    subtopic: 'Interest, Annuities, and Present Value',
    level: 'intermediate',
    concept: 'Compound Interest and Time Value of Money',
    definition:
      'Compound interest computes interest earned on both initial principal P and accumulated interest over n compounding periods per year at annual rate r. Continuous compounding uses Euler\'s constant e. Present value discounts future cash flows back to current time.',
    notation: 'A = P\\left(1 + \\frac{r}{n}\\right)^{nt}, \\quad A = P e^{rt}, \\quad PV = \\frac{FV}{(1 + r)^t}',
    formulas: [
      'A = P \\left(1 + \\frac{r}{n}\\right)^{nt}',
      'A = P e^{rt} \\quad (\\text{Continuous Compounding})',
      'PV = \\frac{FV}{(1 + r)^t}',
      '\\text{APY} = \\left(1 + \\frac{r}{n}\\right)^n - 1',
    ],
    assumptions: ['Principal P > 0.', 'Annual interest rate r expressed as a decimal (e.g. 5% = 0.05).', 'Compounding frequency n >= 1.'],
    domainRestrictions: ['t >= 0 time in years.', 'n > 0 integer periods.'],
    theorems: [
      'Rule of 72: Approximate doubling time t ≈ 72 / (100 * r).',
    ],
    examples: [
      {
        problem: 'Calculate future value of $1,000 at 5% annual interest compounded monthly for 3 years',
        solution: '$1,161.47',
        steps: [
          'Identify parameters: P = 1000, r = 0.05, n = 12, t = 3',
          'Formula: A = 1000 * (1 + 0.05/12)^{12 * 3}',
          'Calculate base: 1 + 0.05/12 = 1.0041667',
          'Calculate exponent: 12 * 3 = 36 periods',
          'Evaluate: 1000 * (1.0041667)^{36} ≈ $1,161.47',
        ],
        latex: 'A = 1000 \\left(1 + \\frac{0.05}{12}\\right)^{36} \\approx 1161.47',
      },
    ],
    commonMistakes: [
      {
        mistake: 'Entering percentage directly as whole number (e.g. 5 instead of 0.05).',
        correction: 'Divide percentage by 100: 5% = 0.05.',
        why: 'Failing to divide by 100 results in 500% interest rate.',
        preventionTip: 'Always convert r = rate_percent / 100 before computing.',
      },
    ],
    solutionStrategies: [
      'Identify whether compounding is annual (n=1), monthly (n=12), daily (n=365), or continuous (e^{rt}).',
      'Use natural logarithm ln to solve for unknown time t: t = ln(A/P) / (n * ln(1 + r/n)).',
    ],
    relatedTopics: ['exponential-growth', 'algebra-logarithms', 'series-geometric'],
    prerequisiteTopics: ['percentages', 'exponents-logarithms'],
    keywords: ['compound interest', 'financial math', 'principal', 'annual percentage rate', 'time value of money', 'annuity'],
    aliases: ['interest formula', 'investment compounding'],
    latexRepresentation: 'A = P \\left(1 + \\frac{r}{n}\\right)^{nt}',
    sourceMetadata: {
      sourceName: 'Standard Actuarial and Financial Mathematics Formulation',
      sourceType: 'standard_mathematical_definition',
      licenseOrStatus: 'public_mathematical_knowledge',
      accessedAt: '2026-09-24',
    },
  },
];
