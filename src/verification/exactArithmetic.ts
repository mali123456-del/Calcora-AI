/**
 * Calcora AI — exact rational arithmetic evaluator.
 *
 * Purpose
 * -------
 * `mathEngine` evaluates using IEEE-754 doubles via shunting-yard / RPN. That is
 * correct for everyday use, but it is a *floating point* method, so it can be
 * wrong in ways that are invisible to a second run of itself: a precedence fault
 * or a precision fault reproduces identically when recomputed.
 *
 * This module is a deliberately separate implementation used only for
 * verification. It uses exact rational arithmetic (reduced integer numerator and
 * denominator, arbitrary precision via BigInt) and a recursive-descent parser
 * rather than shunting-yard. Agreement between the two is therefore evidence, not
 * a tautology.
 *
 * Scope is intentionally narrow. Anything it cannot represent exactly — `sin`,
 * `pi`, `log`, variables — is reported as unsupported so the caller can fall back
 * honestly rather than receive a fabricated observation.
 *
 * Nothing here is used to produce an answer for the learner. It only ever checks one.
 */

export interface ExactRational {
  readonly n: bigint;
  readonly d: bigint;
}

function gcd(a: bigint, b: bigint): bigint {
  let x = a < 0n ? -a : a;
  let y = b < 0n ? -b : b;
  while (y) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x;
}

export function makeRational(n: bigint, d: bigint = 1n): ExactRational {
  if (d === 0n) throw new Error('division by zero');
  let nn = n;
  let dd = d;
  if (dd < 0n) {
    nn = -nn;
    dd = -dd;
  }
  const g = gcd(nn, dd) || 1n;
  return { n: nn / g, d: dd / g };
}

function add(a: ExactRational, b: ExactRational): ExactRational {
  return makeRational(a.n * b.d + b.n * a.d, a.d * b.d);
}

function sub(a: ExactRational, b: ExactRational): ExactRational {
  return makeRational(a.n * b.d - b.n * a.d, a.d * b.d);
}

function mul(a: ExactRational, b: ExactRational): ExactRational {
  return makeRational(a.n * b.n, a.d * b.d);
}

function div(a: ExactRational, b: ExactRational): ExactRational {
  if (b.n === 0n) throw new Error('division by zero');
  return makeRational(a.n * b.d, a.d * b.n);
}

function negate(a: ExactRational): ExactRational {
  return makeRational(-a.n, a.d);
}

function powInt(a: ExactRational, e: number): ExactRational {
  if (!Number.isInteger(e)) throw new Error('non-integer exponent');
  if (e === 0) return makeRational(1n);
  const negative = e < 0;
  const k = negative ? -e : e;
  // Guard against an adversarial exponent such as 10^1000000.
  if (k > 4096) throw new Error('exponent too large');
  let base = a;
  let acc = makeRational(1n);
  for (let i = 0; i < k; i += 1) {
    acc = mul(acc, base);
  }
  return negative ? div(makeRational(1n), acc) : acc;
}

// Exported for the differential regression suite, which asserts these invariants
// directly. They are exact rational primitives and are safe to call from tests.
export { add, sub, mul, div, negate, powInt };

export function rationalToDecimalString(value: ExactRational, maxDigits = 12): string {
  const negative = value.n < 0n;
  const abs = value.n < 0n ? -value.n : value.n;
  const whole = abs / value.d;
  const remainder = abs % value.d;
  if (remainder === 0n) return `${negative ? '-' : ''}${whole}`;
  // Long division to a bounded number of digits, then trim trailing zeros.
  let digits = '';
  let r = remainder;
  for (let i = 0; i < maxDigits; i += 1) {
    r *= 10n;
    const digit = r / value.d;
    r %= value.d;
    digits += digit.toString();
    if (r === 0n) break;
  }
  if (r !== 0n) {
    // Terminating check: the remaining remainder is periodic. Report a rounded
    // value rather than pretending the expansion terminated exactly.
    const rounded = roundRepeating(digits);
    return `${negative ? '-' : ''}${whole}.${rounded}`;
  }
  const trimmed = digits.replace(/0+$/, '');
  return trimmed ? `${negative ? '-' : ''}${whole}.${trimmed}` : `${negative ? '-' : ''}${whole}`;
}

function roundRepeating(digits: string): string {
  if (digits.length < 1) return '0';
  const first = digits[0];
  const next = digits.length > 1 ? digits[1] : '0';
  const rounded = Number(first) + (Number(next) >= 5 ? 1 : 0);
  return String(Math.min(rounded, 9));
}

export function rationalToNumber(value: ExactRational): number {
  return Number(value.n) / Number(value.d);
}

export function rationalsEqual(a: ExactRational, b: ExactRational): boolean {
  return a.n === b.n && a.d === b.d;
}

// ---------------------------------------------------------------------------
// Tokenizer
// ---------------------------------------------------------------------------

type Token =
  | { kind: 'num'; value: ExactRational }
  | { kind: 'op'; value: '+' | '-' | '*' | '/' | '^' }
  | { kind: 'lparen' }
  | { kind: 'rparen' };

/** Functions and constants that exact rational arithmetic cannot represent. */
const UNSUPPORTED_NAMES = /^(sin|cos|tan|asin|acos|atan|sinh|cosh|tanh|log|ln|exp|sqrt|cbrt|log2|log10|pi|e|tau|phi)$/i;

/**
 * Parse a decimal literal exactly, so 0.1 becomes 1/10 rather than a binary float.
 */
function parseDecimalLiteral(raw: string): ExactRational {
  const m = /^(\d*)(?:\.(\d*))?$/.exec(raw);
  if (!m) throw new Error(`unsupported numeric literal: ${raw}`);
  const whole = m[1] ?? '';
  const frac = m[2] ?? '';
  const digits = `${whole || '0'}${frac}`;
  const numerator = BigInt(digits === '' ? '0' : digits);
  const denominator = 10n ** BigInt(frac.length);
  return makeRational(numerator, denominator);
}

export function tokenizeExact(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const s = input;

  while (i < s.length) {
    const ch = s[i];
    if (ch === ' ' || ch === '\t' || ch === '\n') {
      i += 1;
      continue;
    }
    if (/[0-9]/.test(ch)) {
      let j = i;
      while (j < s.length && /[0-9.]/.test(s[j])) j += 1;
      const raw = s.slice(i, j);
      // A '.' that is not part of a number (e.g. "2 . 3") is rejected by the regex.
      tokens.push({ kind: 'num', value: parseDecimalLiteral(raw) });
      i = j;
      continue;
    }
    if (ch === '(') {
      tokens.push({ kind: 'lparen' });
      i += 1;
      continue;
    }
    if (ch === ')') {
      tokens.push({ kind: 'rparen' });
      i += 1;
      continue;
    }
    if (ch === '+' || ch === '-' || ch === '*' || ch === '/' || ch === '^') {
      tokens.push({ kind: 'op', value: ch });
      i += 1;
      continue;
    }
    if (/[a-zA-Z]/.test(ch)) {
      let j = i;
      while (j < s.length && /[a-zA-Z0-9]/.test(s[j])) j += 1;
      const name = s.slice(i, j);
      if (UNSUPPORTED_NAMES.test(name)) {
        throw new Error(`unsupported name: ${name}`);
      }
      // Any other bare identifier is a variable; exact rational arithmetic cannot
      // resolve it, so refuse rather than assume a value.
      throw new Error(`unsupported identifier: ${name}`);
    }
    throw new Error(`unsupported character: ${ch}`);
  }
  return tokens;
}

// ---------------------------------------------------------------------------
// Recursive-descent parser
// ---------------------------------------------------------------------------

class ExactParser {
  private pos = 0;
  constructor(private readonly tokens: Token[]) {}

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  parse(): ExactRational {
    const value = this.parseSum();
    if (this.pos !== this.tokens.length) {
      throw new Error('trailing input');
    }
    return value;
  }

  private parseSum(): ExactRational {
    let left = this.parseProduct();
    for (;;) {
      const token = this.peek();
      if (!token || token.kind !== 'op' || (token.value !== '+' && token.value !== '-')) return left;
      this.pos += 1;
      const right = this.parseProduct();
      left = token.value === '+' ? add(left, right) : sub(left, right);
    }
  }

  private parseProduct(): ExactRational {
    let left = this.parseUnary();
    for (;;) {
      const token = this.peek();
      if (!token || token.kind !== 'op' || (token.value !== '*' && token.value !== '/')) return left;
      this.pos += 1;
      const right = this.parseUnary();
      left = token.value === '*' ? mul(left, right) : div(left, right);
    }
  }

  private parseUnary(): ExactRational {
    const token = this.peek();
    if (token && token.kind === 'op' && (token.value === '+' || token.value === '-')) {
      this.pos += 1;
      const operand = this.parseUnary();
      return token.value === '-' ? negate(operand) : operand;
    }
    return this.parsePower();
  }

  private parsePower(): ExactRational {
    const base = this.parsePrimary();
    const token = this.peek();
    if (token && token.kind === 'op' && token.value === '^') {
      this.pos += 1;
      // Right-associative, and an exponent may itself be signed.
      const exponent = this.parseUnary();
      const asNumber = rationalToNumber(exponent);
      if (!Number.isInteger(asNumber)) throw new Error('non-integer exponent');
      return powInt(base, asNumber);
    }
    return base;
  }

  private parsePrimary(): ExactRational {
    const token = this.peek();
    if (!token) throw new Error('unexpected end of expression');
    if (token.kind === 'num') {
      this.pos += 1;
      return token.value;
    }
    if (token.kind === 'lparen') {
      this.pos += 1;
      const value = this.parseSum();
      const closing = this.peek();
      if (!closing || closing.kind !== 'rparen') throw new Error('unbalanced parentheses');
      this.pos += 1;
      return value;
    }
    throw new Error('expected a number');
  }
}

export type ExactEvaluation =
  | { supported: true; value: ExactRational }
  | { supported: false; reason: string };

/**
 * Evaluate an arithmetic expression exactly.
 *
 * Returns `{ supported: false }` when the expression contains anything outside the
 * exactly-representable subset. The caller must then choose a different honest
 * strategy rather than treating this as agreement.
 */
export function evaluateExact(expression: string): ExactEvaluation {
  const trimmed = (expression ?? '').trim();
  if (!trimmed) return { supported: false, reason: 'No expression was provided.' };
  try {
    const tokens = tokenizeExact(trimmed);
    if (!tokens.length) return { supported: false, reason: 'No arithmetic tokens were found.' };
    const value = new ExactParser(tokens).parse();
    return { supported: true, value };
  } catch (error) {
    return { supported: false, reason: error instanceof Error ? error.message : 'Unsupported expression.' };
  }
}
