import { MathKnowledgeItem } from '../knowledgeTypes';

export const advancedMathematicsKnowledge: MathKnowledgeItem[] = [
  {
    id: 'numth-euclidean-modular',
    topic: 'Number Theory',
    subtopic: 'Modular Arithmetic and GCD',
    level: 'intermediate',
    concept: 'Euclidean Algorithm and Modular Arithmetic',
    definition:
      'The Euclidean algorithm efficiently computes the greatest common divisor gcd(a, b) via repeated division: gcd(a, b) = gcd(b, a mod b). Modular arithmetic studies integers under equivalence modulo m: a = b (mod m) if m divides a - b.',
    notation: 'a \\equiv b \\pmod{m} \\iff m \\mid (a - b), \\quad \\gcd(a, b)',
    formulas: [
      '\\gcd(a, b) = \\gcd(b, a \\pmod b)',
      '\\text{lcm}(a, b) = \\frac{|a \\cdot b|}{\\gcd(a, b)}',
      'a \\equiv b \\pmod m \\implies a + c \\equiv b + c \\pmod m',
      'a \\equiv b \\pmod m \\implies ac \\equiv bc \\pmod m',
      'a^{p-1} \\equiv 1 \\pmod p \\quad (p \\text{ is prime}, \\gcd(a, p) = 1) \\quad (\\text{Fermat\'s Little Theorem})',
    ],
    assumptions: ['Modulus m is an integer >= 1.'],
    domainRestrictions: ['m > 0 for standard modular arithmetic.', 'Division modulo m requires finding a modular multiplicative inverse: gcd(a, m) = 1.'],
    theorems: [
      'Bézout\'s Identity: For any integers a, b exists integers x, y such that ax + by = gcd(a, b).',
      'Fermat\'s Little Theorem: If p is prime and gcd(a, p) = 1, then a^(p-1) = 1 (mod p).',
    ],
    examples: [
      {
        problem: 'Compute gcd(252, 105) using the Euclidean algorithm',
        solution: '21',
        steps: [
          '252 = 2 * 105 + 42 -> remainder 42',
          '105 = 2 * 42 + 21 -> remainder 21',
          '42 = 2 * 21 + 0 -> remainder 0',
          'The last non-zero remainder is 21: gcd(252, 105) = 21',
        ],
        latex: '\\gcd(252, 105) = \\gcd(105, 42) = \\gcd(42, 21) = 21',
      },
    ],
    commonMistakes: [
      {
        mistake: 'Dividing both sides of a modular congruence without checking if the divisor is coprime to the modulus.',
        correction: 'If ac = bc (mod m), then a = b (mod m / gcd(c, m)).',
        why: 'Zero divisors exist in Z_m when m is composite.',
        preventionTip: 'Multiply by the modular inverse of c rather than dividing directly.',
      },
    ],
    solutionStrategies: [
      'Apply Euclidean division step by step until the remainder reaches zero.',
      'Multiply two numbers and divide by their gcd to compute lcm(a, b).',
    ],
    relatedTopics: ['prime-factorization', 'rsa-cryptography', 'diophantine-equations'],
    prerequisiteTopics: ['integers', 'division-algorithm'],
    keywords: ['gcd', 'lcm', 'euclidean algorithm', 'modular arithmetic', 'modulo', 'fermat little theorem', 'congruence'],
    aliases: ['gcd algorithm', 'clock arithmetic'],
    latexRepresentation: 'a \\equiv b \\pmod m, \\quad \\gcd(a, b) = \\gcd(b, a \\bmod b)',
    sourceMetadata: {
      sourceName: 'Euclid Elements Book VII & Gauss Disquisitiones Arithmeticae',
      sourceType: 'classical_theorem',
      licenseOrStatus: 'public_mathematical_knowledge',
      accessedAt: '2026-09-23',
    },
  },
  {
    id: 'proof-methods-logic',
    topic: 'Mathematical Proofs',
    subtopic: 'Proof Techniques',
    level: 'intermediate',
    concept: 'Direct Proof, Contradiction, Contrapositive, and Mathematical Induction',
    definition:
      'A mathematical proof is a rigorous deductive argument demonstrating truth from axioms and previously established theorems. Standard methods include Direct Proof (P implies Q), Contrapositive (not Q implies not P), Contradiction (assume not P and derive absurdity), and Mathematical Induction (base case P(0) and inductive step P(k) implies P(k+1)).',
    notation: 'P \\implies Q, \\quad \\neg Q \\implies \\neg P, \\quad P \\land \\neg Q \\implies \\bot',
    formulas: [
      'P \\implies Q \\iff \\neg Q \\implies \\neg P \\quad (\\text{Contrapositive Law})',
      'P(n_0) \\land (\\forall k \\ge n_0, P(k) \\implies P(k+1)) \\implies \\forall n \\ge n_0, P(n) \\quad (\\text{Induction Principle})',
    ],
    assumptions: ['Classical two-valued logic (law of excluded middle: a proposition is either true or false).'],
    domainRestrictions: ['Induction applies to discrete well-ordered sets like natural numbers N.'],
    theorems: [
      'Principle of Mathematical Induction: Proves a statement holds for all natural numbers.',
      'Law of Contraposition: A conditional statement is logically equivalent to its contrapositive.',
    ],
    examples: [
      {
        problem: 'Prove by contradiction that sqrt(2) is irrational.',
        solution: 'sqrt(2) cannot be written as a/b with integers a, b.',
        steps: [
          'Assume sqrt(2) is rational: sqrt(2) = a / b with coprime integers a, b (gcd(a,b) = 1).',
          'Square both sides: 2 = a^2 / b^2 => a^2 = 2b^2.',
          'Therefore a^2 is even, which implies a is even: a = 2k.',
          'Substitute: (2k)^2 = 4k^2 = 2b^2 => b^2 = 2k^2.',
          'Therefore b^2 is even, which implies b is even.',
          'Both a and b are even, contradicting that gcd(a,b) = 1. Hence sqrt(2) is irrational.',
        ],
        latex: '\\sqrt{2} = \\frac{a}{b} \\implies a^2 = 2b^2 \\implies a, b \\text{ both even, contradiction to } \\gcd(a,b)=1',
      },
    ],
    commonMistakes: [
      {
        mistake: 'Assuming the converse (Q implies P) is equivalent to the original statement (P implies Q).',
        correction: 'Converse is NOT logically equivalent. The contrapositive (not Q implies not P) is equivalent.',
        why: 'E.g., "If it is raining, the ground is wet" does not mean "If the ground is wet, it is raining".',
        preventionTip: 'Negate both hypothesis and conclusion AND swap their order to form the true contrapositive.',
      },
      {
        mistake: 'Forgetting to verify the base case in mathematical induction.',
        correction: 'Always prove the initial base case (e.g. n = 1 or n = 0) before the inductive step.',
        why: 'An induction step without a base case is a chain of dominos without the first one pushed.',
        preventionTip: 'Structure induction explicitly into Step 1: Base Case, Step 2: Inductive Hypothesis, Step 3: Inductive Step.',
      },
    ],
    solutionStrategies: [
      'Examine the claim: if proving a universal equality for all integers n, try induction.',
      'If proving non-existence or irrationality, assume the contrary and seek a contradiction.',
      'If a statement involves "if not" or negative conditions, try the contrapositive.',
    ],
    relatedTopics: ['discrete-mathematics', 'set-theory', 'logic'],
    prerequisiteTopics: ['algebraic-reasoning', 'integers'],
    keywords: ['proof', 'contradiction', 'contrapositive', 'induction', 'direct proof', 'logic', 'counterexample'],
    aliases: ['proof techniques', 'methods of proof'],
    latexRepresentation: 'P \\implies Q \\iff \\neg Q \\implies \\neg P',
    sourceMetadata: {
      sourceName: 'Classical Mathematical Logic & Euclid Elements Book X (Irrationality of sqrt(2))',
      sourceType: 'classical_theorem',
      licenseOrStatus: 'public_mathematical_knowledge',
      accessedAt: '2026-09-23',
    },
  },
  {
    id: 'complex-numbers-euler',
    topic: 'Complex Numbers',
    subtopic: 'Complex Arithmetic and Polar Form',
    level: 'intermediate',
    concept: 'Complex Numbers, Euler\'s Formula, and De Moivre\'s Theorem',
    definition:
      'Complex numbers extend the real numbers with the imaginary unit i defined by i^2 = -1: z = a + bi with real part a = Re(z) and imaginary part b = Im(z). Representable in polar form as z = r(cos theta + i sin theta) = r e^(i theta). Euler\'s formula links exponentials with trigonometry.',
    notation: 'z = a + bi, \\quad i^2 = -1, \\quad z = r e^{i\\theta}',
    formulas: [
      'i^2 = -1, \\quad i^3 = -i, \\quad i^4 = 1',
      '|z| = r = \\sqrt{a^2 + b^2}, \\quad \\theta = \\text{atan2}(b, a)',
      '\\bar{z} = a - bi \\quad (\\text{Complex Conjugate})',
      'z \\bar{z} = |z|^2 = a^2 + b^2',
      'e^{i\\theta} = \\cos\\theta + i\\sin\\theta \\quad (\\text{Euler\'s Formula})',
      '[r(\\cos\\theta + i\\sin\\theta)]^n = r^n (\\cos(n\\theta) + i\\sin(n\\theta)) = r^n e^{i n \\theta} \\quad (\\text{De Moivre\'s Theorem})',
    ],
    assumptions: ['a, b are real numbers.'],
    domainRestrictions: ['Modulus r >= 0.', 'Argument theta defined modulo 2pi (principal argument in (-pi, pi]).'],
    theorems: [
      'Fundamental Theorem of Algebra: Every non-zero single-variable polynomial of degree n over C has exactly n complex roots.',
      'De Moivre\'s Theorem: Raises complex numbers to arbitrary integer or rational powers in polar form.',
    ],
    examples: [
      {
        problem: 'Evaluate (1 + i)^4 using De Moivre\'s Theorem',
        solution: '-4',
        steps: [
          'Modulus r = sqrt(1^2 + 1^2) = sqrt(2)',
          'Argument theta = pi/4 (since a = 1 > 0, b = 1 > 0)',
          'Apply De Moivre: (sqrt(2))^4 * [cos(4 * pi/4) + i sin(4 * pi/4)]',
          '= 4 * [cos(pi) + i sin(pi)] = 4 * [-1 + 0] = -4',
        ],
        latex: '(1 + i)^4 = (\\sqrt{2} e^{i\\pi/4})^4 = 4 e^{i\\pi} = -4',
      },
    ],
    commonMistakes: [
      {
        mistake: 'Computing (a + bi)(c + di) and writing the i^2 term as positive.',
        correction: 'i^2 = -1, so (a + bi)(c + di) = (ac - bd) + (ad + bc)i.',
        why: 'By definition, i is the square root of -1.',
        preventionTip: 'Always replace i^2 with -1 immediately upon multiplying imaginary terms.',
      },
    ],
    solutionStrategies: [
      'For addition/subtraction: combine real parts and imaginary parts separately.',
      'For division: multiply numerator and denominator by the conjugate of the denominator.',
      'For high powers or roots: convert to polar form r e^(i theta) and apply De Moivre\'s theorem.',
    ],
    relatedTopics: ['quadratic-formula-complex-roots', 'trigonometry-euler', 'differential-equations'],
    prerequisiteTopics: ['quadratic-formula', 'trigonometric-polar-coordinates'],
    keywords: ['complex numbers', 'imaginary unit', 'euler formula', 'de moivre theorem', 'modulus', 'argument', 'conjugate'],
    aliases: ['imaginary numbers', 'polar complex form'],
    latexRepresentation: 'z = a + bi = r e^{i\\theta}, \\quad e^{i\\theta} = \\cos\\theta + i\\sin\\theta',
    sourceMetadata: {
      sourceName: 'Leonhard Euler Introductio in analysin infinitorum (1748)',
      sourceType: 'classical_theorem',
      licenseOrStatus: 'public_mathematical_knowledge',
      accessedAt: '2026-09-23',
    },
  },
  {
    id: 'diffeq-first-second-order',
    topic: 'Differential Equations',
    subtopic: 'First and Second Order Equations',
    level: 'advanced',
    concept: 'First-Order Separable Equations and Second-Order Linear Equations',
    definition:
      'Differential equations relate unknown functions to their derivatives. A separable first-order equation has form dy/dx = g(x)h(y), solvable by integrating dy/h(y) = g(x)dx. A second-order homogeneous linear equation with constant coefficients ay\'\' + by\' + cy = 0 is solved via its characteristic algebraic equation ar^2 + br + c = 0.',
    notation: '\\frac{dy}{dx} = g(x)h(y), \\quad a y\'\' + b y\' + c y = 0',
    formulas: [
      '\\int \\frac{1}{h(y)} \\, dy = \\int g(x) \\, dx \\quad (\\text{Separation of Variables})',
      'I(x) = e^{\\int P(x)\\,dx} \\implies y(x) = \\frac{1}{I(x)}\\left(\\int I(x)Q(x)\\,dx + C\\right) \\quad (\\text{Integrating Factor for } y\' + P(x)y = Q(x))',
      'a r^2 + b r + c = 0 \\quad (\\text{Characteristic Equation for } a y\'\' + b y\' + c y = 0)',
      'y(x) = c_1 e^{r_1 x} + c_2 e^{r_2 x} \\quad (\\text{Distinct real roots } r_1 \\neq r_2)',
      'y(x) = (c_1 + c_2 x) e^{r x} \\quad (\\text{Repeated root } r)',
      'y(x) = e^{\\alpha x}(c_1 \\cos(\\beta x) + c_2 \\sin(\\beta x)) \\quad (\\text{Complex roots } \\alpha \\pm i\\beta)',
    ],
    assumptions: ['Coefficients a, b, c are real constants with a != 0.'],
    domainRestrictions: ['Division by h(y) requires h(y) != 0; roots of h(y) = 0 represent constant equilibrium solutions.'],
    theorems: [
      'Existence and Uniqueness Theorem (Picard-Lindelöf): Guarantees unique solution to initial value problems given continuity and Lipschitz conditions.',
    ],
    examples: [
      {
        problem: 'Solve y\'\' - 5y\' + 6y = 0',
        solution: 'y(x) = c_1 e^(2x) + c_2 e^(3x)',
        steps: [
          'Characteristic equation: r^2 - 5r + 6 = 0',
          'Factor: (r - 2)(r - 3) = 0 => r_1 = 2, r_2 = 3',
          'General solution: y(x) = c_1 e^(2x) + c_2 e^(3x)',
        ],
        latex: 'r^2 - 5r + 6 = 0 \\implies r \\in \\{2, 3\\} \\implies y(x) = c_1 e^{2x} + c_2 e^{3x}',
      },
    ],
    commonMistakes: [
      {
        mistake: 'Missing constant equilibrium solutions when separating variables (e.g. dividing by y - 2 without checking y = 2).',
        correction: 'Always check if values making the denominator zero (h(y) = 0) are valid solutions.',
        why: 'Division by zero is invalid; y = constant may be a singular or equilibrium solution.',
        preventionTip: 'Solve h(y) = 0 first to record any constant solutions.',
      },
    ],
    solutionStrategies: [
      'Check if the equation can be rewritten with y terms on one side and x terms on the other (separable).',
      'For first-order linear y\' + P(x)y = Q(x), compute the integrating factor I(x) = exp(integral P(x) dx).',
      'For second-order with constant coefficients, write the characteristic quadratic equation and solve for r.',
    ],
    relatedTopics: ['calculus-integrals', 'exponential-growth', 'physics-harmonic-oscillator'],
    prerequisiteTopics: ['derivatives', 'integrals', 'quadratic-formula'],
    keywords: ['differential equations', 'separation of variables', 'integrating factor', 'characteristic equation', 'harmonic oscillator'],
    aliases: ['diff eq', 'ode'],
    latexRepresentation: 'a y\'\' + b y\' + c y = 0 \\implies a r^2 + b r + c = 0',
    sourceMetadata: {
      sourceName: 'Euler & D\'Alembert Linear Differential Equations Theory',
      sourceType: 'classical_theorem',
      licenseOrStatus: 'public_mathematical_knowledge',
      accessedAt: '2026-09-23',
    },
  },
];
