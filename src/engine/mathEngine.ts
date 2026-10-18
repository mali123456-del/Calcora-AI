/**
 * Deterministic Mathematical Engine - Upgraded
 * Safe tokenizer, Shunting-yard algorithm & AST/RPN Evaluator
 * Strict adherence to operator precedence. No eval() or Function().
 * Exact Fraction representation, precision formatting, and SI/Engineering notation.
 */

import { AngleMode, Fraction, PrecisionMode } from '../types';

export const CONSTANTS = {
  PI: Math.PI,
  E: Math.E,
  PHI: (1 + Math.sqrt(5)) / 2, // 1.618033988749895
};

export type TokenType =
  | 'NUMBER'
  | 'OPERATOR'
  | 'FUNCTION'
  | 'POSTFIX'
  | 'LPAREN'
  | 'RPAREN'
  | 'COMMA';

export interface Token {
  type: TokenType;
  value: string;
}

// Convert angle to radians based on active mode
export function toRadians(angle: number, mode: AngleMode): number {
  if (mode === 'DEG') {
    return (angle * Math.PI) / 180;
  }
  if (mode === 'GRAD') {
    return (angle * Math.PI) / 200;
  }
  return angle; // RAD
}

// Convert radians to angle based on active mode
export function fromRadians(rad: number, mode: AngleMode): number {
  if (mode === 'DEG') {
    return (rad * 180) / Math.PI;
  }
  if (mode === 'GRAD') {
    return (rad * 200) / Math.PI;
  }
  return rad; // RAD
}

// Factorial calculation with safety checks
export function factorial(n: number): number {
  if (!Number.isInteger(n) || n < 0) {
    throw new Error('Factorial requires a non-negative integer');
  }
  if (n > 170) {
    throw new Error('Factorial overflow (result exceeds infinity)');
  }
  let res = 1;
  for (let i = 2; i <= n; i++) {
    res *= i;
  }
  return res;
}

// Permutations: nPr = n! / (n - r)!
export function permutations(n: number, r: number): number {
  if (!Number.isInteger(n) || !Number.isInteger(r) || n < 0 || r < 0 || r > n) {
    throw new Error('Permutations require non-negative integers with n >= r');
  }
  return factorial(n) / factorial(n - r);
}

// Combinations: nCr = n! / (r! * (n - r)!)
export function combinations(n: number, r: number): number {
  if (!Number.isInteger(n) || !Number.isInteger(r) || n < 0 || r < 0 || r > n) {
    throw new Error('Combinations require non-negative integers with n >= r');
  }
  return factorial(n) / (factorial(r) * factorial(n - r));
}

// Greatest Common Divisor
export function gcd(a: number, b: number): number {
  let x = Math.abs(Math.round(a));
  let y = Math.abs(Math.round(b));
  while (y) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

// Simplify Fraction
export function simplifyFraction(num: number, den: number): Fraction {
  if (den === 0) throw new Error('Division by zero in fraction');
  const divisor = gcd(num, den);
  const sign = den < 0 ? -1 : 1;
  return {
    numerator: (num / divisor) * sign,
    denominator: (den / divisor) * sign,
  };
}

// Convert floating point decimal to exact Fraction representation using continued fractions
export function decimalToFraction(val: number, maxDenominator = 1000000): Fraction | null {
  if (!Number.isFinite(val) || Number.isNaN(val)) return null;
  if (Number.isInteger(val)) return { numerator: val, denominator: 1 };

  const sign = val < 0 ? -1 : 1;
  const absVal = Math.abs(val);

  let h1 = 1, h2 = 0;
  let k1 = 0, k2 = 1;
  let b = absVal;

  for (let i = 0; i < 50; i++) {
    const a = Math.floor(b);
    let aux = h1;
    h1 = a * h1 + h2;
    h2 = aux;

    aux = k1;
    k1 = a * k1 + k2;
    k2 = aux;

    if (k1 > maxDenominator) break;

    const diff = Math.abs(absVal - h1 / k1);
    if (diff < 1e-9) {
      return { numerator: sign * h1, denominator: k1 };
    }

    if (Math.abs(b - a) < 1e-12) break;
    b = 1 / (b - a);
  }

  if (k1 <= maxDenominator && Math.abs(absVal - h1 / k1) < 1e-7) {
    return { numerator: sign * h1, denominator: k1 };
  }

  return null;
}

// Format Fraction as string (e.g. "5/6" or mixed "1 2/3")
export function formatFraction(f: Fraction, mixed = false): string {
  if (f.denominator === 1) return String(f.numerator);
  if (mixed && Math.abs(f.numerator) > f.denominator) {
    const whole = Math.trunc(f.numerator / f.denominator);
    const rem = Math.abs(f.numerator % f.denominator);
    if (rem === 0) return String(whole);
    return `${whole} ${rem}/${f.denominator}`;
  }
  return `${f.numerator}/${f.denominator}`;
}

// Clean floating point precision inaccuracies (e.g., 0.1 + 0.2 -> 0.3, sin(pi) -> 0)
export function sanitizeNumber(num: number): number {
  if (Number.isNaN(num)) return NaN;
  if (!Number.isFinite(num)) return num;

  // Very close to 0
  if (Math.abs(num) < 1e-15) return 0;

  // Clean rounding
  const precision = 12;
  const rounded = parseFloat(num.toPrecision(precision));
  return rounded;
}

// Precedence table
const PRECEDENCE: Record<string, number> = {
  '+': 1,
  '-': 1,
  '*': 2,
  '/': 2,
  '%': 2,
  'mod': 2,
  '^': 3, // Right-associative power
  'u-': 4, // Unary minus
  'u+': 4, // Unary plus
};

const RIGHT_ASSOCIATIVE = new Set(['^', 'u-', 'u+']);

// Tokenize mathematical expression
export function tokenize(rawExpr: string): Token[] {
  let expr = rawExpr
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-')
    .replace(/π/g, 'pi')
    .replace(/φ/g, 'phi')
    .replace(/²/g, '^2')
    .replace(/³/g, '^3')
    .trim();

  const tokens: Token[] = [];
  let i = 0;

  while (i < expr.length) {
    const char = expr[i];

    // Skip whitespace
    if (/\s/.test(char)) {
      i++;
      continue;
    }

    // Number (including decimals and scientific notation like 1e5 or 2.5e-3)
    if (/[0-9.]/.test(char)) {
      let numStr = '';
      while (i < expr.length && /[0-9.]/.test(expr[i])) {
        numStr += expr[i];
        i++;
      }
      // Check for scientific notation 'e' followed by digit or sign
      if (
        i < expr.length &&
        (expr[i] === 'e' || expr[i] === 'E') &&
        i + 1 < expr.length &&
        /[0-9+-]/.test(expr[i + 1])
      ) {
        numStr += expr[i];
        i++;
        if (expr[i] === '+' || expr[i] === '-') {
          numStr += expr[i];
          i++;
        }
        while (i < expr.length && /[0-9]/.test(expr[i])) {
          numStr += expr[i];
          i++;
        }
      }

      if (numStr === '.' || (numStr.match(/\./g) || []).length > 1) {
        throw new Error(`Invalid numeric literal: ${numStr}`);
      }
      if (!/^((\d+(\.\d*)?)|(\.\d+))([eE][+-]?\d+)?$/.test(numStr)) {
        throw new Error(`Invalid numeric literal: ${numStr}`);
      }

      tokens.push({ type: 'NUMBER', value: numStr });
      continue;
    }

    // Identifiers: functions, constants, mod, npr, ncr
    if (/[a-zA-Z_]/.test(char)) {
      let ident = '';
      while (i < expr.length && /[a-zA-Z0-9_]/.test(expr[i])) {
        ident += expr[i];
        i++;
      }
      const lower = ident.toLowerCase();

      if (lower === 'pi') {
        tokens.push({ type: 'NUMBER', value: String(CONSTANTS.PI) });
      } else if (lower === 'e') {
        tokens.push({ type: 'NUMBER', value: String(CONSTANTS.E) });
      } else if (lower === 'phi') {
        tokens.push({ type: 'NUMBER', value: String(CONSTANTS.PHI) });
      } else if (lower === 'mod') {
        tokens.push({ type: 'OPERATOR', value: 'mod' });
      } else {
        // Mathematical function name
        tokens.push({ type: 'FUNCTION', value: lower });
      }
      continue;
    }

    // Operators and delimiters
    if (char === '(') {
      tokens.push({ type: 'LPAREN', value: '(' });
      i++;
      continue;
    }

    if (char === ')') {
      tokens.push({ type: 'RPAREN', value: ')' });
      i++;
      continue;
    }

    if (char === ',') {
      tokens.push({ type: 'COMMA', value: ',' });
      i++;
      continue;
    }

    if (char === '!') {
      tokens.push({ type: 'POSTFIX', value: '!' });
      i++;
      continue;
    }

    if (['+', '-', '*', '/', '^', '%'].includes(char)) {
      tokens.push({ type: 'OPERATOR', value: char });
      i++;
      continue;
    }

    throw new Error(`Unrecognized symbol in expression: '${char}'`);
  }

  // Handle implicit multiplication & unary operators
  const processed: Token[] = [];
  for (let j = 0; j < tokens.length; j++) {
    const curr = tokens[j];
    const prev = j > 0 ? tokens[j - 1] : null;

    // Check for unary minus / plus:
    // Occurs at the start of expression or after operator or after LPAREN or COMMA
    if (curr.type === 'OPERATOR' && (curr.value === '-' || curr.value === '+')) {
      const isUnary =
        !prev ||
        prev.type === 'OPERATOR' ||
        prev.type === 'LPAREN' ||
        prev.type === 'COMMA';

      if (isUnary) {
        processed.push({
          type: 'OPERATOR',
          value: curr.value === '-' ? 'u-' : 'u+',
        });
        continue;
      }
    }

    // Implicit multiplication cases:
    // 1. NUMBER followed by LPAREN (e.g. 2(3) -> 2 * (3))
    // 2. NUMBER followed by FUNCTION (e.g. 3sin(30) -> 3 * sin(30))
    // 3. RPAREN followed by LPAREN (e.g. (2)(3) -> (2) * (3))
    // 4. RPAREN followed by NUMBER or FUNCTION
    // 5. POSTFIX followed by NUMBER, FUNCTION, or LPAREN (e.g. 3! 2 -> 3! * 2)
    if (prev) {
      const prevCanMultiply =
        prev.type === 'NUMBER' || prev.type === 'RPAREN' || prev.type === 'POSTFIX';
      const currCanBeMultiplied =
        curr.type === 'FUNCTION' || curr.type === 'LPAREN' || (curr.type === 'NUMBER' && prev.type === 'RPAREN');

      if (prevCanMultiply && currCanBeMultiplied) {
        processed.push({ type: 'OPERATOR', value: '*' });
      }
    }

    processed.push(curr);
  }

  return processed;
}

// Convert Infix tokens to Reverse Polish Notation (RPN) via Shunting-Yard
export function toRPN(tokens: Token[]): Token[] {
  const output: Token[] = [];
  const operatorStack: Token[] = [];

  for (const token of tokens) {
    switch (token.type) {
      case 'NUMBER':
        output.push(token);
        break;

      case 'FUNCTION':
        operatorStack.push(token);
        break;

      case 'POSTFIX':
        output.push(token);
        break;

      case 'COMMA':
        while (
          operatorStack.length > 0 &&
          operatorStack[operatorStack.length - 1].type !== 'LPAREN'
        ) {
          output.push(operatorStack.pop()!);
        }
        if (
          operatorStack.length === 0 ||
          operatorStack[operatorStack.length - 1].type !== 'LPAREN'
        ) {
          throw new Error('Misplaced comma or mismatched parentheses');
        }
        break;

      case 'OPERATOR': {
        const o1 = token.value;
        const p1 = PRECEDENCE[o1] || 0;
        const isRightAssoc = RIGHT_ASSOCIATIVE.has(o1);

        while (operatorStack.length > 0) {
          const top = operatorStack[operatorStack.length - 1];
          if (top.type === 'LPAREN') break;

          const p2 = PRECEDENCE[top.value] || 0;
          if (top.type === 'FUNCTION' || p2 > p1 || (p2 === p1 && !isRightAssoc)) {
            output.push(operatorStack.pop()!);
          } else {
            break;
          }
        }
        operatorStack.push(token);
        break;
      }

      case 'LPAREN':
        operatorStack.push(token);
        break;

      case 'RPAREN':
        while (
          operatorStack.length > 0 &&
          operatorStack[operatorStack.length - 1].type !== 'LPAREN'
        ) {
          output.push(operatorStack.pop()!);
        }
        if (operatorStack.length === 0) {
          throw new Error('Mismatched parentheses: unexpected closing parenthesis');
        }
        operatorStack.pop(); // Discard '('

        // If top of stack is a function, pop it to output
        if (
          operatorStack.length > 0 &&
          operatorStack[operatorStack.length - 1].type === 'FUNCTION'
        ) {
          output.push(operatorStack.pop()!);
        }
        break;
    }
  }

  while (operatorStack.length > 0) {
    const top = operatorStack.pop()!;
    if (top.type === 'LPAREN' || top.type === 'RPAREN') {
      throw new Error('Mismatched parentheses: unclosed parenthesis');
    }
    output.push(top);
  }

  return output;
}

class FiniteResultStack extends Array<number> {
  override push(...values: number[]): number {
    if (values.some((value) => !Number.isFinite(value))) {
      throw new Error('Mathematical result is outside the finite number range');
    }
    return super.push(...values);
  }
}

// Evaluate RPN expression
export function evaluateRPN(rpn: Token[], angleMode: AngleMode = 'DEG'): number {
  const stack = new FiniteResultStack();

  for (const token of rpn) {
    if (token.type === 'NUMBER') {
      const val = parseFloat(token.value);
      if (Number.isNaN(val)) {
        throw new Error(`Invalid numeric token: ${token.value}`);
      }
      stack.push(val);
      continue;
    }

    if (token.type === 'POSTFIX' && token.value === '!') {
      if (stack.length < 1) throw new Error('Operator ! requires an operand');
      const a = stack.pop()!;
      stack.push(factorial(a));
      continue;
    }

    if (token.type === 'OPERATOR') {
      if (token.value === 'u-') {
        if (stack.length < 1) throw new Error('Unary minus requires an operand');
        stack.push(-stack.pop()!);
        continue;
      }
      if (token.value === 'u+') {
        continue;
      }

      if (stack.length < 2) {
        throw new Error(`Binary operator ${token.value} requires two operands`);
      }
      const b = stack.pop()!;
      const a = stack.pop()!;

      switch (token.value) {
        case '+':
          stack.push(a + b);
          break;
        case '-':
          stack.push(a - b);
          break;
        case '*':
          stack.push(a * b);
          break;
        case '/':
          if (b === 0) {
            throw new Error('Division by zero is undefined');
          }
          stack.push(a / b);
          break;
        case '%':
        case 'mod':
          if (b === 0) {
            throw new Error('Modulo by zero is undefined');
          }
          stack.push(a % b);
          break;
        case '^':
          if (a < 0 && !Number.isInteger(b)) {
            throw new Error('Complex numbers not supported for fractional power of negative base');
          }
          stack.push(Math.pow(a, b));
          break;
        default:
          throw new Error(`Unknown operator: ${token.value}`);
      }
      continue;
    }

    if (token.type === 'FUNCTION') {
      const fn = token.value;

      // Single-argument functions
      if (
        [
          'sin',
          'cos',
          'tan',
          'cot',
          'sec',
          'csc',
          'asin',
          'acos',
          'atan',
          'sinh',
          'cosh',
          'tanh',
          'asinh',
          'acosh',
          'atanh',
          'ln',
          'log',
          'log10',
          'log2',
          'sqrt',
          'cbrt',
          'abs',
          'floor',
          'ceil',
          'round',
          'exp',
          'recip',
          'factorial',
          'fact',
        ].includes(fn)
      ) {
        if (stack.length < 1) {
          throw new Error(`Function ${fn} requires an argument`);
        }
        const x = stack.pop()!;

        switch (fn) {
          case 'sin': {
            const rad = toRadians(x, angleMode);
            stack.push(sanitizeNumber(Math.sin(rad)));
            break;
          }
          case 'cos': {
            const rad = toRadians(x, angleMode);
            stack.push(sanitizeNumber(Math.cos(rad)));
            break;
          }
          case 'tan': {
            const rad = toRadians(x, angleMode);
            const cosVal = Math.cos(rad);
            if (Math.abs(cosVal) < 1e-15) {
              throw new Error(`tan is undefined at this angle (${x})`);
            }
            stack.push(sanitizeNumber(Math.tan(rad)));
            break;
          }
          case 'cot': {
            const rad = toRadians(x, angleMode);
            const sinVal = Math.sin(rad);
            if (Math.abs(sinVal) < 1e-15) throw new Error('cot is undefined when sin is 0');
            stack.push(sanitizeNumber(1 / Math.tan(rad)));
            break;
          }
          case 'sec': {
            const rad = toRadians(x, angleMode);
            const cosVal = Math.cos(rad);
            if (Math.abs(cosVal) < 1e-15) throw new Error('sec is undefined when cos is 0');
            stack.push(sanitizeNumber(1 / cosVal));
            break;
          }
          case 'csc': {
            const rad = toRadians(x, angleMode);
            const sinVal = Math.sin(rad);
            if (Math.abs(sinVal) < 1e-15) throw new Error('csc is undefined when sin is 0');
            stack.push(sanitizeNumber(1 / sinVal));
            break;
          }
          case 'asin': {
            if (x < -1 || x > 1) {
              throw new Error('asin argument must be in [-1, 1]');
            }
            const rad = Math.asin(x);
            stack.push(sanitizeNumber(fromRadians(rad, angleMode)));
            break;
          }
          case 'acos': {
            if (x < -1 || x > 1) {
              throw new Error('acos argument must be in [-1, 1]');
            }
            const rad = Math.acos(x);
            stack.push(sanitizeNumber(fromRadians(rad, angleMode)));
            break;
          }
          case 'atan': {
            const rad = Math.atan(x);
            stack.push(sanitizeNumber(fromRadians(rad, angleMode)));
            break;
          }
          case 'sinh':
            stack.push(Math.sinh(x));
            break;
          case 'cosh':
            stack.push(Math.cosh(x));
            break;
          case 'tanh':
            stack.push(Math.tanh(x));
            break;
          case 'asinh':
            stack.push(Math.asinh(x));
            break;
          case 'acosh':
            if (x < 1) throw new Error('acosh requires x >= 1');
            stack.push(Math.acosh(x));
            break;
          case 'atanh':
            if (Math.abs(x) >= 1) throw new Error('atanh requires |x| < 1');
            stack.push(Math.atanh(x));
            break;
          case 'ln':
            if (x <= 0) throw new Error('ln requires a positive number');
            stack.push(Math.log(x));
            break;
          case 'log':
          case 'log10':
            if (x <= 0) throw new Error('log10 requires a positive number');
            stack.push(Math.log10(x));
            break;
          case 'log2':
            if (x <= 0) throw new Error('log2 requires a positive number');
            stack.push(Math.log2(x));
            break;
          case 'sqrt':
            if (x < 0) throw new Error('Cannot take square root of negative number');
            stack.push(Math.sqrt(x));
            break;
          case 'cbrt':
            stack.push(Math.cbrt(x));
            break;
          case 'abs':
            stack.push(Math.abs(x));
            break;
          case 'floor':
            stack.push(Math.floor(x));
            break;
          case 'ceil':
            stack.push(Math.ceil(x));
            break;
          case 'round':
            stack.push(Math.round(x));
            break;
          case 'exp':
            stack.push(Math.exp(x));
            break;
          case 'recip':
            if (x === 0) throw new Error('Division by zero: 1/0 is undefined');
            stack.push(1 / x);
            break;
          case 'factorial':
          case 'fact':
            stack.push(factorial(x));
            break;
          default:
            throw new Error(`Unsupported function: ${fn}`);
        }
        continue;
      }

      // Two-argument functions: root(x, n), logbase(x, base), npr(n, r), ncr(n, r)
      if (fn === 'root' || fn === 'nthroot') {
        if (stack.length < 2) throw new Error('root(x, n) requires two arguments');
        const n = stack.pop()!;
        const x = stack.pop()!;
        if (n === 0) throw new Error('0th root is undefined');
        if (x < 0 && n % 2 === 0) {
          throw new Error('Even root of negative number is complex');
        }
        if (x < 0) {
          stack.push(-Math.pow(-x, 1 / n));
        } else {
          stack.push(Math.pow(x, 1 / n));
        }
        continue;
      }

      if (fn === 'npr' || fn === 'permutations') {
        if (stack.length < 2) throw new Error('nPr(n, r) requires two arguments');
        const r = stack.pop()!;
        const n = stack.pop()!;
        stack.push(permutations(n, r));
        continue;
      }

      if (fn === 'ncr' || fn === 'combinations') {
        if (stack.length < 2) throw new Error('nCr(n, r) requires two arguments');
        const r = stack.pop()!;
        const n = stack.pop()!;
        stack.push(combinations(n, r));
        continue;
      }

      if (fn === 'logbase') {
        if (stack.length < 2) throw new Error('logbase(x, base) requires two arguments');
        const base = stack.pop()!;
        const x = stack.pop()!;
        if (x <= 0 || base <= 0 || base === 1) {
          throw new Error('Invalid arguments for logbase');
        }
        stack.push(Math.log(x) / Math.log(base));
        continue;
      }

      throw new Error(`Unrecognized function: ${fn}`);
    }
  }

  if (stack.length !== 1) {
    throw new Error('Malformed expression: check operator placements');
  }

  return sanitizeNumber(stack[0]);
}

/**
 * Main Deterministic Calculation Function
 */
export function calculateExpression(
  expr: string,
  angleMode: AngleMode = 'DEG',
  precision?: PrecisionMode
): { value: number; display: string; exactFraction?: string; error?: string } {
  if (!expr || !expr.trim()) {
    return { value: 0, display: '0' };
  }

  try {
    const tokens = tokenize(expr);
    const rpn = toRPN(tokens);
    const value = evaluateRPN(rpn, angleMode);

    const display = formatResultWithPrecision(value, precision);
    const frac = decimalToFraction(value);
    const exactFraction = frac && frac.denominator > 1 ? formatFraction(frac) : undefined;

    return { value, display, exactFraction };
  } catch (err: any) {
    return {
      value: NaN,
      display: 'Error',
      error: err.message || 'Mathematical evaluation error',
    };
  }
}

/**
 * Format result with scientific notation or specified precision
 */
export function formatResult(value: number): string {
  return formatResultWithPrecision(value, 'auto');
}

export function formatResultWithPrecision(
  value: number,
  precision: PrecisionMode = 'auto',
  thousandsSeparator = false
): string {
  if (Number.isNaN(value)) return 'Error';
  if (!Number.isFinite(value)) return value > 0 ? 'Infinity' : '-Infinity';

  if (value === 0) return '0';

  const abs = Math.abs(value);
  if (abs >= 1e15 || (abs < 1e-7 && abs > 0)) {
    return value.toExponential(8).replace(/\.?0+e/, 'e');
  }

  let formatted: string;
  if (precision === 'auto') {
    // Format up to 10 decimals, stripping trailing zeroes
    formatted = parseFloat(value.toFixed(10)).toString();
  } else {
    formatted = value.toFixed(precision);
  }

  if (thousandsSeparator) {
    const parts = formatted.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  }

  return formatted;
}

/**
 * Engineering notation formatter (exponent multiple of 3 with SI prefix)
 */
export const SI_PREFIXES: Record<number, string> = {
  24: 'Y',
  21: 'Z',
  18: 'E',
  15: 'P',
  12: 'T',
  9: 'G',
  6: 'M',
  3: 'k',
  0: '',
  '-3': 'm',
  '-6': 'µ',
  '-9': 'n',
  '-12': 'p',
  '-15': 'f',
  '-18': 'a',
  '-21': 'z',
  '-24': 'y',
};

export function formatEngineeringNotation(value: number): {
  display: string;
  mantissa: string;
  exponent: number;
  prefix: string;
} {
  if (value === 0) {
    return { display: '0', mantissa: '0', exponent: 0, prefix: '' };
  }
  if (!Number.isFinite(value)) {
    const display = value > 0 ? 'Infinity' : '-Infinity';
    return { display, mantissa: display, exponent: 0, prefix: '' };
  }

  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);
  const exp = Math.floor(Math.log10(abs));
  const engExp = Math.floor(exp / 3) * 3;

  const mantissaVal = abs / Math.pow(10, engExp);
  const mantissaStr = mantissaVal.toFixed(4).replace(/\.?0+$/, '');
  const prefix = SI_PREFIXES[engExp] || `×10^${engExp}`;

  return {
    display: `${sign}${mantissaStr} ${prefix}`.trim(),
    mantissa: `${sign}${mantissaStr}`,
    exponent: engExp,
    prefix,
  };
}
