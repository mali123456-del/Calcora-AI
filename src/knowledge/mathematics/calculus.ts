import { MathKnowledgeItem } from '../knowledgeTypes';

export const calculusKnowledge: MathKnowledgeItem[] = [
  {
    id: 'calc-derivatives-rules',
    topic: 'Calculus',
    subtopic: 'Differentiation',
    level: 'intermediate',
    concept: 'Derivatives and Operational Differentiation Rules',
    definition:
      'The derivative f\'(x) represents the instantaneous rate of change of a function f with respect to x, formally defined as lim_{h -> 0} (f(x+h) - f(x)) / h. Fundamental rules include the Power Rule, Product Rule, Quotient Rule, and Chain Rule.',
    notation: 'f\'(x) = \\frac{df}{dx} = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}',
    formulas: [
      '\\frac{d}{dx}[x^n] = n x^{n-1} \\quad (\\text{Power Rule})',
      '\\frac{d}{dx}[u \\cdot v] = u\'v + uv\' \\quad (\\text{Product Rule})',
      '\\frac{d}{dx}\\left[\\frac{u}{v}\\right] = \\frac{u\'v - uv\'}{v^2} \\quad (\\text{Quotient Rule})',
      '\\frac{d}{dx}[f(g(x))] = f\'(g(x)) \\cdot g\'(x) \\quad (\\text{Chain Rule})',
      '\\frac{d}{dx}[e^x] = e^x, \\quad \\frac{d}{dx}[\\ln(x)] = \\frac{1}{x} \\quad (x > 0)',
      '\\frac{d}{dx}[\\sin x] = \\cos x, \\quad \\frac{d}{dx}[\\cos x] = -\\sin x',
    ],
    assumptions: ['Functions u(x), v(x), and g(x) are differentiable at point x.'],
    domainRestrictions: ['Denominator v(x) != 0 in quotient rule.', 'ln(x) requires x > 0.'],
    theorems: [
      'Mean Value Theorem: If f is continuous on [a,b] and differentiable on (a,b), then exists c in (a,b) with f\'(c) = (f(b)-f(a))/(b-a).',
    ],
    examples: [
      {
        problem: 'Find the derivative of f(x) = x^3 + 4x^2 - 5x + 7',
        solution: '3x^2 + 8x - 5',
        steps: [
          'd/dx[x^3] = 3x^2',
          'd/dx[4x^2] = 4 * 2x = 8x',
          'd/dx[-5x] = -5',
          'd/dx[7] = 0',
          'Sum results: 3x^2 + 8x - 5',
        ],
        latex: 'f\'(x) = \\frac{d}{dx}(x^3 + 4x^2 - 5x + 7) = 3x^2 + 8x - 5',
      },
      {
        problem: 'Differentiate f(x) = sin(x^2)',
        solution: '2x cos(x^2)',
        steps: [
          'Outer function: f(u) = sin(u) -> f\'(u) = cos(u)',
          'Inner function: u = x^2 -> u\' = 2x',
          'Apply Chain Rule: f\'(x) = cos(x^2) * 2x = 2x cos(x^2)',
        ],
        latex: '\\frac{d}{dx}[\\sin(x^2)] = \\cos(x^2) \\cdot 2x = 2x\\cos(x^2)',
      },
    ],
    commonMistakes: [
      {
        mistake: 'Differentiating a product by multiplying individual derivatives: (uv)\' = u\' * v\'.',
        correction: '(uv)\' = u\'v + uv\'. Always use the Product Rule.',
        why: 'Rate of change of an area rect(u,v) expands in two directions: u dv + v du.',
        preventionTip: 'Never multiply derivatives directly; apply u\'v + uv\'.',
      },
      {
        mistake: 'Forgetting the inner derivative in the Chain Rule: d/dx[sin(2x)] = cos(2x).',
        correction: 'd/dx[sin(2x)] = 2 cos(2x). The inner derivative of 2x is 2.',
        why: 'Chain Rule requires multiplying by the derivative of the interior argument.',
        preventionTip: 'Always identify the inner function and multiply by its derivative at the end.',
      },
    ],
    solutionStrategies: [
      'Deconstruct the function into elementary components and nested compositions.',
      'Apply linearity (derivative of sum is sum of derivatives).',
      'For compositions, work from the outermost function inward using the Chain Rule.',
      'Simplify algebraic coefficients after differentiation.',
    ],
    alternativeMethods: ['logarithmic differentiation', 'implicit differentiation', 'limit definition'],
    relatedTopics: ['integrals', 'tangent-lines', 'optimization', 'critical-points'],
    prerequisiteTopics: ['limits', 'algebraic-functions', 'slopes'],
    keywords: ['derivative', 'differentiation', 'power rule', 'product rule', 'quotient rule', 'chain rule', 'rate of change'],
    aliases: ['differential calculus', 'derivatives'],
    latexRepresentation: 'f\'(x) = \\lim_{h \\to 0} \\frac{f(x+h)-f(x)}{h}, \\quad \\frac{d}{dx}[f(g(x))] = f\'(g(x))g\'(x)',
    sourceMetadata: {
      sourceName: 'Newton & Leibniz Classical Differential Calculus',
      sourceType: 'classical_theorem',
      licenseOrStatus: 'public_mathematical_knowledge',
      accessedAt: '2026-09-23',
    },
  },
  {
    id: 'calc-fundamental-theorem-integrals',
    topic: 'Calculus',
    subtopic: 'Integration',
    level: 'intermediate',
    concept: 'Definite Integrals and the Fundamental Theorem of Calculus',
    definition:
      'Integration computes accumulated quantities and areas under curves. The Fundamental Theorem of Calculus (FTC) establishes that differentiation and integration are inverse processes: if F\'(x) = f(x), then the definite integral of f from a to b equals F(b) - F(a).',
    notation: '\\int_a^b f(x) \\, dx = F(b) - F(a) = \\left[ F(x) \\right]_a^b',
    formulas: [
      '\\int x^n \\, dx = \\frac{x^{n+1}}{n+1} + C \\quad (n \\neq -1)',
      '\\int \\frac{1}{x} \\, dx = \\ln|x| + C',
      '\\int e^x \\, dx = e^x + C',
      '\\int \\sin x \\, dx = -\\cos x + C, \\quad \\int \\cos x \\, dx = \\sin x + C',
      '\\int u \\, dv = uv - \\int v \\, du \\quad (\\text{Integration by Parts})',
      '\\int_a^b f(g(x)) g\'(x) \\, dx = \\int_{g(a)}^{g(b)} f(u) \\, du \\quad (\\text{Substitution})',
    ],
    assumptions: ['f is continuous on [a,b] for the definite integral to exist.'],
    domainRestrictions: ['For power rule integral, exponent n != -1 (when n = -1, integral yields ln|x|).', 'Domain must be free of infinite discontinuities in [a,b].'],
    theorems: [
      'Fundamental Theorem of Calculus Part 1: d/dx [integral_a^x f(t) dt] = f(x).',
      'Fundamental Theorem of Calculus Part 2: integral_a^b f(x) dx = F(b) - F(a), where F\' = f.',
    ],
    examples: [
      {
        problem: 'Evaluate integral_0^2 (3x^2 + 1) dx',
        solution: '10',
        steps: [
          'Find antiderivative: F(x) = x^3 + x',
          'Evaluate at upper limit b = 2: F(2) = 2^3 + 2 = 8 + 2 = 10',
          'Evaluate at lower limit a = 0: F(0) = 0^3 + 0 = 0',
          'Subtract: F(2) - F(0) = 10 - 0 = 10',
        ],
        latex: '\\int_0^2 (3x^2 + 1)\\,dx = \\left[ x^3 + x \\right]_0^2 = (8 + 2) - 0 = 10',
      },
    ],
    commonMistakes: [
      {
        mistake: 'Applying power rule to 1/x to get x^0 / 0.',
        correction: 'Integral of 1/x is ln|x| + C.',
        why: 'Division by zero is undefined; the antiderivative of 1/x is the natural logarithm.',
        preventionTip: 'Recognize 1/x as a special logarithmic case, not standard power rule.',
      },
      {
        mistake: 'Forgetting the arbitrary constant + C on indefinite integrals.',
        correction: 'Always append + C to indefinite integrals.',
        why: 'Any constant drops to 0 under differentiation, yielding infinitely many antiderivatives.',
        preventionTip: 'Check every indefinite integral for the presence of + C.',
      },
    ],
    solutionStrategies: [
      'Check for standard basic antiderivatives first.',
      'Look for an inner function whose derivative is present as a factor (use u-substitution).',
      'If the integrand is a product of dissimilar functions (polynomial * trig or polynomial * exp), use integration by parts (LIATE rule).',
    ],
    alternativeMethods: ['Riemann sums', 'substitution', 'integration by parts', 'partial fractions', 'numerical Simpson rule'],
    relatedTopics: ['derivatives', 'area-between-curves', 'differential-equations'],
    prerequisiteTopics: ['differentiation-rules', 'polynomials', 'riemann-sums'],
    keywords: ['integral', 'antiderivative', 'fundamental theorem of calculus', 'integration by parts', 'u substitution', 'definite integral'],
    aliases: ['integral calculus', 'integration'],
    latexRepresentation: '\\int_a^b f(x)\\,dx = F(b) - F(a), \\quad \\int u\\,dv = uv - \\int v\\,du',
    sourceMetadata: {
      sourceName: 'Fundamental Theorem of Calculus / Leibniz & Newton',
      sourceType: 'classical_theorem',
      licenseOrStatus: 'public_mathematical_knowledge',
      accessedAt: '2026-09-23',
    },
  },
];
