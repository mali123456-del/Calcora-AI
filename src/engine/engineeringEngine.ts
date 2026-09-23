/**
 * Engineering & Applied Physics Mathematical Engine
 * Accurate deterministic computations for:
 * - Electrical: Ohm's Law (V = IR), Electrical Power (P = VI = I²R = V²/R)
 * - Mechanics: Force (F = ma), Work (W = Fd), Kinetic Energy (Ek = 1/2 mv²), Potential Energy (Ep = mgh), Power (P = W/t)
 * - Physics / Fluids: Density (ρ = m/V), Pressure (P = F/A), Wave Speed (v = fλ), Ideal Gas Law (PV = nRT)
 */

import { sanitizeNumber } from './mathEngine';

// 1. Electrical: Ohm's Law
export function solveOhmsLaw(params: {
  voltage?: number;
  current?: number;
  resistance?: number;
}): {
  solvedVariable: 'voltage' | 'current' | 'resistance';
  value: number;
  formula: string;
  steps: string[];
  unit: string;
} {
  const { voltage: V, current: I, resistance: R } = params;

  if (V === undefined && I !== undefined && R !== undefined) {
    if (R < 0) throw new Error('Resistance cannot be negative');
    const val = sanitizeNumber(I * R);
    return {
      solvedVariable: 'voltage',
      value: val,
      formula: 'V = I × R',
      steps: [`V = ${I} A × ${R} Ω`, `V = ${val} V`],
      unit: 'V (Volts)',
    };
  }

  if (I === undefined && V !== undefined && R !== undefined) {
    if (R <= 0) throw new Error('Resistance must be strictly positive');
    const val = sanitizeNumber(V / R);
    return {
      solvedVariable: 'current',
      value: val,
      formula: 'I = V / R',
      steps: [`I = ${V} V / ${R} Ω`, `I = ${val} A`],
      unit: 'A (Amperes)',
    };
  }

  if (R === undefined && V !== undefined && I !== undefined) {
    if (I === 0) throw new Error('Current cannot be zero when solving for resistance');
    const val = sanitizeNumber(V / I);
    return {
      solvedVariable: 'resistance',
      value: val,
      formula: 'R = V / I',
      steps: [`R = ${V} V / ${I} A`, `R = ${val} Ω`],
      unit: 'Ω (Ohms)',
    };
  }

  throw new Error('Please provide exactly two parameters out of V, I, and R');
}

// 2. Electrical: Power (P = VI)
export function calculateElectricalPower(params: {
  voltage?: number;
  current?: number;
  resistance?: number;
}): {
  powerWatts: number;
  formula: string;
  steps: string[];
} {
  const { voltage: V, current: I, resistance: R } = params;

  if (V !== undefined && I !== undefined) {
    const P = sanitizeNumber(V * I);
    return {
      powerWatts: P,
      formula: 'P = V × I',
      steps: [`P = ${V} V × ${I} A`, `P = ${P} W`],
    };
  }

  if (I !== undefined && R !== undefined) {
    const P = sanitizeNumber(I * I * R);
    return {
      powerWatts: P,
      formula: 'P = I² × R',
      steps: [`P = (${I} A)² × ${R} Ω`, `P = ${P} W`],
    };
  }

  if (V !== undefined && R !== undefined) {
    if (R <= 0) throw new Error('Resistance must be strictly positive');
    const P = sanitizeNumber((V * V) / R);
    return {
      powerWatts: P,
      formula: 'P = V² / R',
      steps: [`P = (${V} V)² / ${R} Ω`, `P = ${P} W`],
    };
  }

  throw new Error('Please provide either (V, I), (I, R), or (V, R)');
}

// 3. Mechanics: Force (F = ma)
export function calculateForce(massKg: number, accelerationMs2: number): {
  forceNewtons: number;
  formula: string;
  steps: string[];
} {
  if (massKg < 0) throw new Error('Mass cannot be negative');
  const F = sanitizeNumber(massKg * accelerationMs2);
  return {
    forceNewtons: F,
    formula: 'F = m × a',
    steps: [`F = ${massKg} kg × ${accelerationMs2} m/s²`, `F = ${F} N`],
  };
}

// 4. Mechanics: Kinetic Energy (Ek = 0.5 * m * v^2)
export function calculateKineticEnergy(massKg: number, velocityMs: number): {
  energyJoules: number;
  formula: string;
  steps: string[];
} {
  if (massKg < 0) throw new Error('Mass cannot be negative');
  const Ek = sanitizeNumber(0.5 * massKg * velocityMs * velocityMs);
  return {
    energyJoules: Ek,
    formula: 'E_k = ½ × m × v²',
    steps: [`E_k = 0.5 × ${massKg} kg × (${velocityMs} m/s)²`, `E_k = ${Ek} J`],
  };
}

// 5. Mechanics: Potential Energy (Ep = mgh)
export function calculatePotentialEnergy(
  massKg: number,
  heightM: number,
  gravity = 9.80665
): {
  energyJoules: number;
  formula: string;
  steps: string[];
} {
  if (massKg < 0) throw new Error('Mass cannot be negative');
  const Ep = sanitizeNumber(massKg * gravity * heightM);
  return {
    energyJoules: Ep,
    formula: 'E_p = m × g × h',
    steps: [`E_p = ${massKg} kg × ${gravity} m/s² × ${heightM} m`, `E_p = ${Ep} J`],
  };
}

// 6. Physics: Density (ρ = m / V)
export function calculateDensity(massKg: number, volumeM3: number): {
  densityKgM3: number;
  formula: string;
  steps: string[];
} {
  if (massKg < 0) throw new Error('Mass cannot be negative');
  if (volumeM3 <= 0) throw new Error('Volume must be strictly positive');
  const rho = sanitizeNumber(massKg / volumeM3);
  return {
    densityKgM3: rho,
    formula: 'ρ = m / V',
    steps: [`ρ = ${massKg} kg / ${volumeM3} m³`, `ρ = ${rho} kg/m³`],
  };
}

// 7. Physics: Pressure (P = F / A)
export function calculatePressure(forceNewtons: number, areaM2: number): {
  pressurePascals: number;
  formula: string;
  steps: string[];
} {
  if (areaM2 <= 0) throw new Error('Area must be strictly positive');
  const P = sanitizeNumber(forceNewtons / areaM2);
  return {
    pressurePascals: P,
    formula: 'P = F / A',
    steps: [`P = ${forceNewtons} N / ${areaM2} m²`, `P = ${P} Pa`],
  };
}

// 8. Waves: Wave Speed (v = f * λ)
export function calculateWaveVelocity(frequencyHz: number, wavelengthM: number): {
  velocityMs: number;
  formula: string;
  steps: string[];
} {
  if (frequencyHz < 0 || wavelengthM < 0) {
    throw new Error('Frequency and wavelength must be non-negative');
  }
  const v = sanitizeNumber(frequencyHz * wavelengthM);
  return {
    velocityMs: v,
    formula: 'v = f × λ',
    steps: [`v = ${frequencyHz} Hz × ${wavelengthM} m`, `v = ${v} m/s`],
  };
}
