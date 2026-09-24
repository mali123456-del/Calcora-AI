import { MathKnowledgeItem } from '../knowledgeTypes';

export const geometryKnowledge: MathKnowledgeItem[] = [
  {
    id: 'geom-pythagorean-theorem',
    topic: 'Geometry',
    subtopic: 'Right Triangles',
    level: 'beginner',
    concept: 'Pythagorean Theorem and Euclidean Distance',
    definition:
      'In a Euclidean right-angled triangle, the square of the length of the hypotenuse c is equal to the sum of the squares of the lengths of the legs a and b: a^2 + b^2 = c^2. Generalizes to the Euclidean distance formula between points in Cartesian coordinates.',
    notation: 'a^2 + b^2 = c^2 \\quad (\\text{hypotenuse } c)',
    formulas: [
      'c = \\sqrt{a^2 + b^2}',
      'a = \\sqrt{c^2 - b^2}',
      'd = \\sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2} \\quad (\\text{2D Distance})',
      'd = \\sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2 + (z_2 - z_1)^2} \\quad (\\text{3D Distance})',
    ],
    assumptions: ['Triangle must contain a right angle (90 degrees or pi/2 radians).', 'Space must be flat Euclidean space.'],
    domainRestrictions: ['Lengths a, b, c > 0 strictly.', 'Hypotenuse c must be strictly greater than either leg a or b.'],
    theorems: [
      'Pythagorean Theorem: In a right triangle with legs a, b and hypotenuse c, a^2 + b^2 = c^2.',
      'Converse of Pythagorean Theorem: If a^2 + b^2 = c^2, then the triangle is a right triangle.',
    ],
    examples: [
      {
        problem: 'A right triangle has legs 3 and 4. Find the hypotenuse.',
        solution: '5',
        steps: ['Compute squares: 3^2 = 9, 4^2 = 16', 'Sum squares: 9 + 16 = 25', 'Take square root: sqrt(25) = 5'],
        latex: 'c = \\sqrt{3^2 + 4^2} = \\sqrt{9 + 16} = \\sqrt{25} = 5',
      },
    ],
    commonMistakes: [
      {
        mistake: 'Applying a^2 + b^2 = c^2 where c is not the hypotenuse opposite the right angle.',
        correction: 'c must always designate the hypotenuse (the longest side opposite the 90 degree angle).',
        why: 'If finding a leg when hypotenuse is known, one must subtract: a^2 = c^2 - b^2.',
        preventionTip: 'Identify the right angle first; the side directly across from it is the hypotenuse c.',
      },
      {
        mistake: 'Writing sqrt(a^2 + b^2) = a + b.',
        correction: 'sqrt(a^2 + b^2) != a + b in general (e.g. sqrt(9 + 16) = 5 != 3 + 4 = 7).',
        why: 'The square root is non-linear and does not distribute over addition.',
        preventionTip: 'Calculate the sum of squares before taking the square root.',
      },
    ],
    solutionStrategies: [
      'Locate the 90-degree right angle and identify the hypotenuse opposite to it.',
      'If solving for hypotenuse: c = sqrt(a^2 + b^2).',
      'If solving for a leg: leg = sqrt(hypotenuse^2 - other_leg^2).',
    ],
    relatedTopics: ['trigonometry', 'distance-formula', 'vectors', 'coordinate-geometry'],
    prerequisiteTopics: ['arithmetic-roots', 'triangle-properties'],
    keywords: ['pythagorean theorem', 'hypotenuse', 'right triangle', 'distance formula', 'pythagorean triples'],
    aliases: ['pythagoras', 'pythagorean relation'],
    latexRepresentation: 'a^2 + b^2 = c^2 \\implies c = \\sqrt{a^2 + b^2}',
    sourceMetadata: {
      sourceName: 'Euclid Elements Book I Proposition 47',
      sourceType: 'classical_theorem',
      licenseOrStatus: 'public_mathematical_knowledge',
      accessedAt: '2026-09-23',
    },
  },
  {
    id: 'geom-circles-metrics',
    topic: 'Geometry',
    subtopic: 'Circles',
    level: 'beginner',
    concept: 'Circle Area, Circumference, and Sector Metrics',
    definition:
      'A circle is the locus of all coplanar points equidistant from a center point by radius r. Pi represents the constant ratio of circumference to diameter.',
    notation: 'r = \\text{radius}, \\quad d = 2r = \\text{diameter}',
    formulas: [
      'C = 2\\pi r = \\pi d',
      'A = \\pi r^2',
      's = r\\theta \\quad (\\text{Arc length with } \\theta \\text{ in radians})',
      'A_{\\text{sector}} = \\frac{1}{2} r^2 \\theta',
    ],
    assumptions: ['Radius r > 0.', 'Angle theta must be expressed in radians for s = r*theta and A = 0.5*r^2*theta.'],
    domainRestrictions: ['r > 0', '0 \\le \\theta \\le 2\\pi'],
    examples: [
      {
        problem: 'Find the area of a circle with radius 7 (use pi = 22/7 or exact pi)',
        solution: '49 pi =~ 153.94',
        steps: ['A = pi * r^2 = pi * 7^2 = 49 pi', 'Approximate: 49 * 3.14159... = 153.938...'],
        latex: 'A = \\pi (7)^2 = 49\\pi \\approx 153.94',
      },
    ],
    commonMistakes: [
      {
        mistake: 'Using diameter instead of radius in the area formula (e.g. pi * d^2).',
        correction: 'Divide diameter by 2 first: r = d/2, then A = pi * (d/2)^2 = (pi/4) * d^2.',
        why: 'Area formula is scaled by the square of radius.',
        preventionTip: 'Double check whether the given dimension is radius or diameter before squaring.',
      },
      {
        mistake: 'Using angle in degrees directly in s = r * theta without converting to radians.',
        correction: 'Multiply degrees by pi / 180 to convert to radians first.',
        why: 'The radian is the natural unit where arc length equals radius times angle.',
        preventionTip: 'Convert degrees to radians whenever applying arc length or sector area formulas.',
      },
    ],
    solutionStrategies: [
      'Determine radius r: if diameter is given, r = d/2.',
      'For circumference: C = 2*pi*r.',
      'For area: A = pi*r^2.',
      'Always distinguish exact representation (containing pi) from approximate decimal.',
    ],
    relatedTopics: ['trigonometric-radians', 'volume-of-cylinder', 'spheres'],
    prerequisiteTopics: ['powers', 'pi-constant'],
    keywords: ['circle', 'radius', 'diameter', 'circumference', 'sector', 'arc length', 'pi'],
    aliases: ['circle formulas', 'circular geometry'],
    latexRepresentation: 'A = \\pi r^2, \\quad C = 2\\pi r, \\quad s = r\\theta',
    sourceMetadata: {
      sourceName: 'Classical Euclidean Geometry & Archimedes On the Measurement of a Circle',
      sourceType: 'classical_theorem',
      licenseOrStatus: 'public_mathematical_knowledge',
      accessedAt: '2026-09-23',
    },
  },
];
