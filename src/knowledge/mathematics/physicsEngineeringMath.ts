import { MathKnowledgeItem } from '../knowledgeTypes';

export const physicsEngineeringKnowledge: MathKnowledgeItem[] = [
  {
    id: 'phys-newton-force-energy',
    topic: 'Physics',
    subtopic: 'Mechanics and Energy',
    level: 'intermediate',
    concept: 'Newton\'s Second Law, Kinetic and Gravitational Potential Energy',
    definition:
      'Newton\'s Second Law states that net force on an object equals mass times acceleration: F = ma. Kinetic energy KE is the energy of motion KE = (1/2)mv^2. Gravitational potential energy PE is stored energy due to elevation in a gravitational field: PE = mgh.',
    notation: 'F = ma, \\quad KE = \\frac{1}{2}mv^2, \\quad PE = mgh',
    formulas: [
      'F = m \\cdot a \\quad (\\text{Force in Newtons, N})',
      'KE = \\frac{1}{2} m v^2 \\quad (\\text{Kinetic Energy in Joules, J})',
      'PE = m g h \\quad (\\text{Gravitational Potential Energy, J})',
      'W = \\Delta KE = F \\cdot d \\cos\\theta \\quad (\\text{Work-Energy Theorem})',
      'g \\approx 9.80665 \\, \\text{m/s}^2 \\quad (\\text{Standard Earth Gravity})',
    ],
    assumptions: ['Constant mass (non-relativistic velocities v << c).', 'Uniform gravitational field near Earth surface.'],
    domainRestrictions: ['Mass m > 0 strictly.', 'Kinetic energy KE >= 0 always.'],
    examples: [
      {
        problem: 'Calculate the kinetic energy of a 1200 kg car travelling at 20 m/s',
        solution: '240,000 J (240 kJ)',
        steps: ['Square velocity: 20^2 = 400', 'Multiply by mass: 1200 * 400 = 480,000', 'Multiply by 0.5: 0.5 * 480,000 = 240,000 Joules'],
        latex: 'KE = \\frac{1}{2}(1200)(20^2) = \\frac{1}{2}(1200)(400) = 240{,}000\\text{ J} = 240\\text{ kJ}',
      },
    ],
    commonMistakes: [
      {
        mistake: 'Multiplying m and v before squaring: (1/2)(mv)^2 instead of (1/2)m(v^2).',
        correction: 'Only velocity is squared: KE = (1/2) * m * (v^2).',
        why: 'Order of operations requires evaluating exponentiation v^2 before multiplication.',
        preventionTip: 'Square the velocity first, then multiply by half the mass.',
      },
    ],
    solutionStrategies: [
      'Confirm all measurements use SI units (kg, meters, seconds).',
      'Identify unknown variable and rearrange formula algebraically.',
      'Check that energy units evaluate dimensionally to kg*m^2/s^2 = Joules.',
    ],
    relatedTopics: ['conservation-of-energy', 'kinematics', 'work-power'],
    prerequisiteTopics: ['algebraic-manipulation', 'powers-and-roots'],
    keywords: ['newton second law', 'force', 'mass', 'acceleration', 'kinetic energy', 'potential energy', 'gravity'],
    aliases: ['newton force', 'mechanical energy'],
    latexRepresentation: 'F = ma, \\quad KE = \\frac{1}{2}mv^2, \\quad PE = mgh',
    sourceMetadata: {
      sourceName: 'Isaac Newton Philosophiæ Naturalis Principia Mathematica (1687)',
      sourceType: 'classical_theorem',
      licenseOrStatus: 'public_mathematical_knowledge',
      accessedAt: '2026-09-23',
    },
  },
  {
    id: 'eng-ohms-law-power',
    topic: 'Engineering',
    subtopic: 'Electrical Engineering',
    level: 'intermediate',
    concept: 'Ohm\'s Law, Electrical Power, and Wave Propagation',
    definition:
      'Ohm\'s Law relates potential difference V across a conductor to current I and electrical resistance R: V = IR. Electrical power P represents energy converted per unit time: P = VI = I^2 R = V^2 / R. Wave velocity v is the product of frequency f and wavelength lambda: v = f * lambda.',
    notation: 'V = IR, \\quad P = VI, \\quad v = f\\lambda',
    formulas: [
      'V = I \\cdot R \\quad (\\text{Voltage in Volts, V})',
      'I = \\frac{V}{R} \\quad (\\text{Current in Amperes, A})',
      'R = \\frac{V}{I} \\quad (\\text{Resistance in Ohms, } \\Omega)',
      'P = V \\cdot I = I^2 R = \\frac{V^2}{R} \\quad (\\text{Power in Watts, W})',
      'P_{\\text{fluid}} = \\rho g h \\quad (\\text{Fluid Hydrostatic Pressure in Pascals, Pa})',
      'v = f \\lambda \\quad (\\text{Wave Velocity in m/s})',
    ],
    assumptions: ['Ohmic conductors with constant resistance R at steady temperature.', 'Ideal linear components.'],
    domainRestrictions: ['Resistance R > 0.', 'Frequency f > 0, Wavelength lambda > 0.'],
    examples: [
      {
        problem: 'A 240 Ohm resistor is connected across a 12V voltage source. Find current and power.',
        solution: 'I = 0.05 A (50 mA), P = 0.6 W',
        steps: [
          'Calculate current: I = V / R = 12 / 240 = 0.05 Amperes',
          'Calculate power: P = V * I = 12 * 0.05 = 0.6 Watts',
          'Check via P = V^2 / R: 12^2 / 240 = 144 / 240 = 0.6 Watts (verified)',
        ],
        latex: 'I = \\frac{12\\text{ V}}{240\\,\\Omega} = 0.05\\text{ A}, \\quad P = (12)(0.05) = 0.6\\text{ W}',
      },
    ],
    commonMistakes: [
      {
        mistake: 'Using P = I * R instead of P = I^2 * R or P = V * I.',
        correction: 'Power is P = V * I = I^2 * R = V^2 / R.',
        why: 'I * R yields Voltage (V = IR), not Power.',
        preventionTip: 'Remember power has units of Volts * Amps = Watts.',
      },
    ],
    solutionStrategies: [
      'Identify two known electrical parameters among V, I, R, P to solve for remaining two.',
      'Use P = V^2 / R if voltage and resistance are known directly.',
      'Use P = I^2 R for power dissipation across known resistance.',
    ],
    relatedTopics: ['circuits', 'kirchhoff-laws', 'fluid-mechanics', 'wave-optics'],
    prerequisiteTopics: ['linear-equations', 'ratios'],
    keywords: ['ohms law', 'voltage', 'current', 'resistance', 'electrical power', 'fluid pressure', 'wave speed'],
    aliases: ['electrical equations', 'circuit laws'],
    latexRepresentation: 'V = IR, \\quad P = VI = I^2 R = \\frac{V^2}{R}, \\quad v = f\\lambda',
    sourceMetadata: {
      sourceName: 'Georg Ohm Die galvanische Kette, mathematisch bearbeitet (1827)',
      sourceType: 'classical_theorem',
      licenseOrStatus: 'public_mathematical_knowledge',
      accessedAt: '2026-09-23',
    },
  },
];
