import { MathKnowledgeItem } from '../knowledgeTypes';

export const trigonometryKnowledge: MathKnowledgeItem[] = [
  {
    id: 'trig-unit-circle-identities',
    topic: 'Trigonometry',
    subtopic: 'Unit Circle and Identities',
    level: 'intermediate',
    concept: 'Trigonometric Functions and Fundamental Identities',
    definition:
      'On a unit circle x^2 + y^2 = 1, for an angle theta measured counter-clockwise from the positive x-axis, coordinates are (cos theta, sin theta). Tangent is defined as sin theta / cos theta. The Pythagorean trigonometric identity states sin^2(theta) + cos^2(theta) = 1.',
    notation: '(\\cos\\theta, \\sin\\theta), \\quad \\tan\\theta = \\frac{\\sin\\theta}{\\cos\\theta}',
    formulas: [
      '\\sin^2\\theta + \\cos^2\\theta = 1',
      '1 + \\tan^2\\theta = \\sec^2\\theta',
      '1 + \\cot^2\\theta = \\csc^2\\theta',
      '\\sin(2\\theta) = 2\\sin\\theta\\cos\\theta',
      '\\cos(2\\theta) = \\cos^2\\theta - \\sin^2\\theta = 2\\cos^2\\theta - 1 = 1 - 2\\sin^2\\theta',
      '\\tan(2\\theta) = \\frac{2\\tan\\theta}{1 - \\tan^2\\theta}',
    ],
    assumptions: ['Angle measured from standard position.', 'In radians or degrees consistently.'],
    domainRestrictions: [
      '\\tan\\theta \\text{ and } \\sec\\theta \\text{ undefined when } \\theta = \\frac{\\pi}{2} + k\\pi \\quad (k \\in \\mathbb{Z})',
      '\\cot\\theta \\text{ and } \\csc\\theta \\text{ undefined when } \\theta = k\\pi \\quad (k \\in \\mathbb{Z})',
      '-1 \\le \\sin\\theta \\le 1 \\quad \\text{and} \\quad -1 \\le \\cos\\theta \\le 1',
    ],
    examples: [
      {
        problem: 'Simplify (1 - cos^2(theta)) / sin(theta)',
        solution: 'sin(theta)',
        steps: ['Use Pythagorean identity: 1 - cos^2(theta) = sin^2(theta)', 'Simplify: sin^2(theta) / sin(theta) = sin(theta) (for sin theta != 0)'],
        latex: '\\frac{1 - \\cos^2\\theta}{\\sin\\theta} = \\frac{\\sin^2\\theta}{\\sin\\theta} = \\sin\\theta',
      },
    ],
    commonMistakes: [
      {
        mistake: 'Assuming sin(A + B) = sin(A) + sin(B).',
        correction: 'sin(A + B) = sin(A)cos(B) + cos(A)sin(B). Trigonometric functions do not distribute linearly over addition.',
        why: 'Sine is a non-linear circular mapping.',
        preventionTip: 'Always apply angle addition formulas rather than distributing function names.',
      },
      {
        mistake: 'Evaluating tan(90 degrees) or tan(pi/2) without noting it is undefined.',
        correction: 'tan(pi/2) is undefined because cos(pi/2) = 0.',
        why: 'Division by zero occurs in the ratio sin/cos.',
        preventionTip: 'Remember the vertical asymptotes of the tangent function at odd multiples of pi/2.',
      },
    ],
    solutionStrategies: [
      'Convert all expressions into terms of sin and cos when proving identities.',
      'Apply Pythagorean identity sin^2 + cos^2 = 1 to substitute or eliminate terms.',
      'Check for values where denominators evaluate to zero.',
    ],
    relatedTopics: ['unit-circle', 'law-of-cosines', 'complex-euler-formula', 'calculus-derivatives'],
    prerequisiteTopics: ['right-triangles', 'pythagorean-theorem', 'angles-radians'],
    keywords: ['trigonometry', 'sine', 'cosine', 'tangent', 'pythagorean identity', 'unit circle', 'double angle'],
    aliases: ['trig identities', 'circular functions'],
    latexRepresentation: '\\sin^2\\theta + \\cos^2\\theta = 1, \\quad \\tan\\theta = \\frac{\\sin\\theta}{\\cos\\theta}',
    sourceMetadata: {
      sourceName: 'Classical Trigonometry & Ptolemy Almagest',
      sourceType: 'classical_theorem',
      licenseOrStatus: 'public_mathematical_knowledge',
      accessedAt: '2026-09-23',
    },
  },
  {
    id: 'trig-law-of-cosines-sines',
    topic: 'Trigonometry',
    subtopic: 'Triangle Solving',
    level: 'intermediate',
    concept: 'Law of Sines and Law of Cosines',
    definition:
      'The Law of Sines relates the ratio of side lengths to sines of opposite angles in any plane triangle: a/sin(A) = b/sin(B) = c/sin(C) = 2R. The Law of Cosines generalizes the Pythagorean theorem to any oblique triangle: c^2 = a^2 + b^2 - 2ab cos(C).',
    notation: '\\frac{a}{\\sin A} = \\frac{b}{\\sin B} = \\frac{c}{\\sin C}, \\quad c^2 = a^2 + b^2 - 2ab\\cos C',
    formulas: [
      'c^2 = a^2 + b^2 - 2ab\\cos C',
      '\\cos C = \\frac{a^2 + b^2 - c^2}{2ab}',
      '\\frac{a}{\\sin A} = \\frac{b}{\\sin B} = \\frac{c}{\\sin C}',
      '\\text{Area} = \\frac{1}{2}ab\\sin C',
    ],
    assumptions: ['A, B, C are interior angles of a non-degenerate plane triangle, with A + B + C = 180 degrees (pi radians).'],
    domainRestrictions: ['Lengths a, b, c > 0.', 'Triangle inequality must hold: a + b > c, a + c > b, b + c > a.', '-1 <= cos(C) <= 1.'],
    examples: [
      {
        problem: 'In a triangle, a = 5, b = 7, and angle C = 60 degrees. Find side c.',
        solution: 'sqrt(39) =~ 6.245',
        steps: [
          'Apply Law of Cosines: c^2 = 5^2 + 7^2 - 2(5)(7) cos(60 deg)',
          'cos(60 deg) = 0.5',
          'c^2 = 25 + 49 - 70(0.5) = 74 - 35 = 39',
          'c = sqrt(39) approx 6.245',
        ],
        latex: 'c^2 = 5^2 + 7^2 - 2(5)(7)\\cos(60^\\circ) = 25 + 49 - 35 = 39 \\implies c = \\sqrt{39}',
      },
    ],
    commonMistakes: [
      {
        mistake: 'Using the Law of Sines in the SSA case without considering the ambiguous two-triangle case.',
        correction: 'When SSA is given, check whether sin(B) > 1 (no triangle), sin(B) = 1 (one right triangle), or sin(B) < 1 with two possible angles (acute and obtuse).',
        why: 'Sine has identical values in quadrants I and II (sin(theta) = sin(180 - theta)).',
        preventionTip: 'Whenever finding an angle with the Law of Sines, test both theta and 180 - theta against angle sum constraints.',
      },
    ],
    solutionStrategies: [
      'Use Law of Cosines when given SAS (two sides and included angle) or SSS (three sides).',
      'Use Law of Sines when given AAS, ASA, or SSA.',
      'Verify that all angles sum to 180 degrees.',
    ],
    relatedTopics: ['pythagorean-theorem', 'vectors-dot-product', 'oblique-triangles'],
    prerequisiteTopics: ['right-triangle-trig', 'angles'],
    keywords: ['law of cosines', 'law of sines', 'oblique triangle', 'sas', 'sss', 'ambiguous case'],
    aliases: ['cosine rule', 'sine rule'],
    latexRepresentation: 'c^2 = a^2 + b^2 - 2ab\\cos C, \\quad \\frac{a}{\\sin A} = \\frac{b}{\\sin B} = \\frac{c}{\\sin C}',
    sourceMetadata: {
      sourceName: 'Al-Kashi / Classical Plane Trigonometry',
      sourceType: 'classical_theorem',
      licenseOrStatus: 'public_mathematical_knowledge',
      accessedAt: '2026-09-23',
    },
  },
];
