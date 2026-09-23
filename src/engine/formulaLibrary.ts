/**
 * Formula Library Engine & Catalog
 * Comprehensive reference for mathematics, physics, engineering, and finance formulas.
 */

import { FormulaItem } from '../types';

export const FORMULA_CATALOG: FormulaItem[] = [
  // 1. Algebra
  {
    id: 'quad-formula',
    name: 'Quadratic Formula',
    category: 'algebra',
    latex: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}',
    displayFormula: 'x = (-b ± √(b² - 4ac)) / (2a)',
    description: 'Finds the roots of any quadratic equation in standard form ax² + bx + c = 0.',
    variables: [
      { symbol: 'a', name: 'Quadratic coefficient (a ≠ 0)' },
      { symbol: 'b', name: 'Linear coefficient' },
      { symbol: 'c', name: 'Constant term' },
    ],
    exampleCalculation: 'For x² + 5x + 6 = 0: a=1, b=5, c=6 gives roots x = -2 and x = -3.',
    defaultExpression: '(-5 + sqrt(5^2 - 4*1*6))/(2*1)',
  },
  {
    id: 'diff-squares',
    name: 'Difference of Squares',
    category: 'algebra',
    latex: 'a^2 - b^2 = (a - b)(a + b)',
    displayFormula: 'a² - b² = (a - b)(a + b)',
    description: 'Factorization identity expressing the difference of two squared terms.',
    variables: [
      { symbol: 'a', name: 'First term' },
      { symbol: 'b', name: 'Second term' },
    ],
    exampleCalculation: '9x² - 16 = (3x - 4)(3x + 4)',
    defaultExpression: '25^2 - 15^2',
  },

  // 2. Geometry
  {
    id: 'pythagoras',
    name: 'Pythagorean Theorem',
    category: 'geometry',
    latex: 'a^2 + b^2 = c^2 \\implies c = \\sqrt{a^2 + b^2}',
    displayFormula: 'c = √(a² + b²)',
    description: 'Relates the lengths of the three sides of a Euclidean right-angled triangle.',
    variables: [
      { symbol: 'a', name: 'First perpendicular leg' },
      { symbol: 'b', name: 'Second perpendicular leg' },
      { symbol: 'c', name: 'Hypotenuse (longest side)' },
    ],
    exampleCalculation: 'If legs are 3 and 4: c = √(3² + 4²) = √(9 + 16) = 5.',
    defaultExpression: 'sqrt(3^2 + 4^2)',
  },
  {
    id: 'circle-area',
    name: 'Area of a Circle',
    category: 'geometry',
    latex: 'A = \\pi r^2',
    displayFormula: 'A = π · r²',
    description: 'Total two-dimensional area enclosed by a circle of radius r.',
    variables: [
      { symbol: 'r', name: 'Radius of circle', unit: 'm' },
      { symbol: 'π', name: 'Archimedes constant (3.14159...)' },
    ],
    exampleCalculation: 'For radius r = 5: A = π × 5² = 25π ≈ 78.5398.',
    defaultExpression: 'pi * 5^2',
  },
  {
    id: 'sphere-volume',
    name: 'Volume of a Sphere',
    category: 'geometry',
    latex: 'V = \\frac{4}{3}\\pi r^3',
    displayFormula: 'V = (4/3) · π · r³',
    description: 'Total three-dimensional volume enclosed by a sphere of radius r.',
    variables: [{ symbol: 'r', name: 'Radius of sphere', unit: 'm' }],
    exampleCalculation: 'For radius r = 3: V = (4/3)π(27) = 36π ≈ 113.097.',
    defaultExpression: '(4/3) * pi * 3^3',
  },

  // 3. Trigonometry
  {
    id: 'pythagorean-trig',
    name: 'Pythagorean Trig Identity',
    category: 'trigonometry',
    latex: '\\sin^2(\\theta) + \\cos^2(\\theta) = 1',
    displayFormula: 'sin²(θ) + cos²(θ) = 1',
    description: 'Fundamental trigonometric identity relating sine and cosine for any angle.',
    variables: [{ symbol: 'θ', name: 'Angle', unit: 'rad or deg' }],
    exampleCalculation: 'sin²(30°) + cos²(30°) = (0.5)² + (√3/2)² = 0.25 + 0.75 = 1.',
    defaultExpression: 'sin(30)^2 + cos(30)^2',
  },
  {
    id: 'law-of-cosines',
    name: 'Law of Cosines',
    category: 'trigonometry',
    latex: 'c^2 = a^2 + b^2 - 2ab\\cos(C)',
    displayFormula: 'c = √(a² + b² - 2ab·cos(C))',
    description: 'Calculates the third side of any triangle given two sides and the included angle.',
    variables: [
      { symbol: 'a, b', name: 'Known triangle sides' },
      { symbol: 'C', name: 'Angle opposite side c', unit: 'deg' },
    ],
    exampleCalculation: 'For a=5, b=7, C=60°: c = √(25 + 49 - 70·cos(60°)) = √(74 - 35) = √39 ≈ 6.245.',
    defaultExpression: 'sqrt(5^2 + 7^2 - 2*5*7*cos(60))',
  },

  // 4. Calculus
  {
    id: 'power-rule',
    name: 'Power Rule for Differentiation',
    category: 'calculus',
    latex: '\\frac{d}{dx}[x^n] = n x^{n-1}',
    displayFormula: 'd/dx (xⁿ) = n · xⁿ⁻¹',
    description: 'Derivative of any monomial term with constant exponent n.',
    variables: [{ symbol: 'n', name: 'Real power exponent' }],
    exampleCalculation: 'd/dx (x³) = 3x².',
    defaultExpression: '3 * 4^(3 - 1)',
  },

  // 5. Physics
  {
    id: 'newton-second',
    name: "Newton's Second Law",
    category: 'physics',
    latex: 'F = m a',
    displayFormula: 'F = m · a',
    description: 'Net force applied to a body equals its mass multiplied by its acceleration.',
    variables: [
      { symbol: 'm', name: 'Mass', unit: 'kg' },
      { symbol: 'a', name: 'Acceleration', unit: 'm/s²' },
      { symbol: 'F', name: 'Force', unit: 'N (Newtons)' },
    ],
    exampleCalculation: 'A 1200 kg car accelerating at 3.5 m/s² requires F = 1200 × 3.5 = 4200 N.',
    defaultExpression: '1200 * 3.5',
  },
  {
    id: 'kinetic-energy',
    name: 'Kinetic Energy',
    category: 'physics',
    latex: 'E_k = \\frac{1}{2} m v^2',
    displayFormula: 'Ek = (1/2) · m · v²',
    description: 'Work needed to accelerate a body of given mass from rest to stated velocity.',
    variables: [
      { symbol: 'm', name: 'Mass of object', unit: 'kg' },
      { symbol: 'v', name: 'Velocity', unit: 'm/s' },
      { symbol: 'Ek', name: 'Kinetic energy', unit: 'J (Joules)' },
    ],
    exampleCalculation: 'For m = 80 kg running at v = 6 m/s: Ek = 0.5 × 80 × 36 = 1440 Joules.',
    defaultExpression: '0.5 * 80 * 6^2',
  },

  // 6. Engineering
  {
    id: 'ohms-law',
    name: "Ohm's Law",
    category: 'engineering',
    latex: 'V = I R \\implies I = \\frac{V}{R}',
    displayFormula: 'V = I · R',
    description: 'Potential difference (voltage) equals current multiplied by electrical resistance.',
    variables: [
      { symbol: 'I', name: 'Current', unit: 'A (Amperes)' },
      { symbol: 'R', name: 'Resistance', unit: 'Ω (Ohms)' },
      { symbol: 'V', name: 'Voltage', unit: 'V (Volts)' },
    ],
    exampleCalculation: 'A 100 Ω resistor with 0.12 A current drops V = 0.12 × 100 = 12 Volts.',
    defaultExpression: '0.12 * 100',
  },
  {
    id: 'electrical-power',
    name: 'Electrical Power',
    category: 'engineering',
    latex: 'P = V I = I^2 R = \\frac{V^2}{R}',
    displayFormula: 'P = V · I',
    description: 'Rate per unit time at which electrical energy is transferred by an electric circuit.',
    variables: [
      { symbol: 'V', name: 'Voltage', unit: 'V' },
      { symbol: 'I', name: 'Current', unit: 'A' },
      { symbol: 'P', name: 'Power', unit: 'W (Watts)' },
    ],
    exampleCalculation: 'A 120 V appliance drawing 5 A consumes P = 120 × 5 = 600 Watts.',
    defaultExpression: '120 * 5',
  },

  // 7. Finance
  {
    id: 'compound-interest-formula',
    name: 'Compound Interest Formula',
    category: 'finance',
    latex: 'A = P\\left(1 + \\frac{r}{n}\\right)^{nt}',
    displayFormula: 'A = P · (1 + r/n)ⁿᵗ',
    description: 'Accrual of interest on principal plus previous accumulated interest.',
    variables: [
      { symbol: 'P', name: 'Initial principal deposit' },
      { symbol: 'r', name: 'Annual interest rate (decimal)' },
      { symbol: 'n', name: 'Compounding frequency per year' },
      { symbol: 't', name: 'Time in years' },
    ],
    exampleCalculation: '$1,000 at 5% compounded monthly for 10 years gives $1,647.01.',
    defaultExpression: '1000 * (1 + 0.05/12)^(12 * 10)',
  },
];
