/**
 * Programmer Calculator Engine
 * Base conversions: BIN, DEC, HEX, OCT
 * Bitwise operations: AND, OR, XOR, NOT, NAND, NOR, XNOR, SHL, SHR, ROL, ROR
 * Selectable bit widths: 8-bit, 16-bit, 32-bit, 64-bit
 */

import { BitWidth, NumberBase } from '../types';
export type { BitWidth, NumberBase };

export function getBitMask(width: BitWidth): bigint {
  switch (width) {
    case 8:
      return 0xffn;
    case 16:
      return 0xffffn;
    case 32:
      return 0xffffffffn;
    case 64:
      return 0xffffffffffffffffn;
  }
}

export function maskToBitWidth(val: bigint, width: BitWidth): bigint {
  const mask = getBitMask(width);
  return val & mask;
}

export function toSigned(val: bigint, width: BitWidth): bigint {
  const masked = maskToBitWidth(val, width);
  const signBit = 1n << BigInt(width - 1);
  if ((masked & signBit) !== 0n) {
    // Negative in 2's complement
    return masked - (1n << BigInt(width));
  }
  return masked;
}

export function formatInBase(val: bigint, base: NumberBase, width: BitWidth, unsigned = false): string {
  const masked = maskToBitWidth(val, width);

  switch (base) {
    case 'HEX': {
      const hex = masked.toString(16).toUpperCase();
      const expectedChars = width / 4;
      return hex.padStart(expectedChars, '0');
    }
    case 'DEC': {
      if (unsigned) {
        return masked.toString(10);
      }
      return toSigned(val, width).toString(10);
    }
    case 'OCT': {
      return masked.toString(8);
    }
    case 'BIN': {
      const bin = masked.toString(2).padStart(width, '0');
      // Format with spaces every 4 bits
      return bin.replace(/(.{4})/g, '$1 ').trim();
    }
  }
}

export function formatNumberInBases(val: bigint, width: BitWidth) {
  return {
    hex: formatInBase(val, 'HEX', width),
    dec: formatInBase(val, 'DEC', width),
    oct: formatInBase(val, 'OCT', width),
    bin: formatInBase(val, 'BIN', width),
  };
}

export function parseFromBase(input: string, base: NumberBase, width: BitWidth): bigint {
  const cleaned = input.replace(/\s+/g, '').trim();
  if (!cleaned) return 0n;

  try {
    let parsed: bigint;
    switch (base) {
      case 'HEX':
        parsed = BigInt(`0x${cleaned}`);
        break;
      case 'DEC':
        parsed = BigInt(cleaned);
        break;
      case 'OCT':
        parsed = BigInt(`0o${cleaned}`);
        break;
      case 'BIN':
        parsed = BigInt(`0b${cleaned}`);
        break;
    }
    return maskToBitWidth(parsed, width);
  } catch {
    throw new Error(`Invalid ${base} literal: "${input}"`);
  }
}

export const parseNumberInBase = parseFromBase;

// Bitwise Operations
export function bitwiseAnd(a: bigint, b: bigint, width: BitWidth): bigint {
  return maskToBitWidth(a & b, width);
}

export function bitwiseOr(a: bigint, b: bigint, width: BitWidth): bigint {
  return maskToBitWidth(a | b, width);
}

export function bitwiseXor(a: bigint, b: bigint, width: BitWidth): bigint {
  return maskToBitWidth(a ^ b, width);
}

export function bitwiseNot(a: bigint, width: BitWidth): bigint {
  return maskToBitWidth(~a, width);
}

export function bitwiseShiftLeft(a: bigint, shift: number, width: BitWidth): bigint {
  const s = BigInt(Math.max(0, shift));
  return maskToBitWidth(a << s, width);
}

export function bitwiseShiftRight(a: bigint, shift: number, width: BitWidth): bigint {
  const s = BigInt(Math.max(0, shift));
  const masked = maskToBitWidth(a, width);
  return maskToBitWidth(masked >> s, width);
}

export function bitwiseRotateLeft(a: bigint, shift: number, width: BitWidth): bigint {
  const s = BigInt(shift % width);
  const masked = maskToBitWidth(a, width);
  const left = masked << s;
  const right = masked >> (BigInt(width) - s);
  return maskToBitWidth(left | right, width);
}

export function bitwiseRotateRight(a: bigint, shift: number, width: BitWidth): bigint {
  const s = BigInt(shift % width);
  const masked = maskToBitWidth(a, width);
  const right = masked >> s;
  const left = masked << (BigInt(width) - s);
  return maskToBitWidth(left | right, width);
}

export function performBitwiseOp(
  a: bigint,
  b: bigint,
  op: 'AND' | 'OR' | 'XOR' | 'NOT' | 'NAND' | 'NOR' | 'XNOR',
  width: BitWidth
): bigint {
  switch (op) {
    case 'NOT':
      return bitwiseNot(a, width);
    case 'AND':
      return bitwiseAnd(a, b, width);
    case 'OR':
      return bitwiseOr(a, b, width);
    case 'XOR':
      return bitwiseXor(a, b, width);
    case 'NAND':
      return maskToBitWidth(~(a & b), width);
    case 'NOR':
      return maskToBitWidth(~(a | b), width);
    case 'XNOR':
      return maskToBitWidth(~(a ^ b), width);
  }
}

export function performBitShift(
  a: bigint,
  op: 'SHL' | 'SHR' | 'ROL' | 'ROR',
  shift: number,
  width: BitWidth
): bigint {
  switch (op) {
    case 'SHL':
      return bitwiseShiftLeft(a, shift, width);
    case 'SHR':
      return bitwiseShiftRight(a, shift, width);
    case 'ROL':
      return bitwiseRotateLeft(a, shift, width);
    case 'ROR':
      return bitwiseRotateRight(a, shift, width);
  }
}
