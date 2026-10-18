/**
 * Deterministic symbolic differentiation.
 *
 * Why this module exists: the calculus toolkit previously computed the
 * NUMERICAL derivative at a point (f'(0)) and the Tutor presented that point
 * value as if it were the derivative function (f'(x)). That is mathematically
 * wrong and this module removes the failure mode: d/dx now returns f'(x) as a
 * symbolic expression, or an honest "unsupported" reason. It never guesses.
 *
 * Design notes:
 *   - Tokenization is REUSED from `mathEngine` so symbolic input shares the
 *     calculator's exact syntax (implicit multiplication, unicode operators,
 *     pi/e/phi constants, unary detection).
 *   - The parser mirrors `mathEngine`'s shunting-yard semantics deliberately,
 *     including its precedence quirk that unary minus binds tighter than ^,
 *     so that symbolic results and numerical evaluation agree.
 *   - Simplification is structural (constant folding, identities, sign
 *     extraction, factor ordering), not heuristic re-algebra, so output is
 *     deterministic and round-trips through the parser.
 *   - Anything outside the supported rule set throws
 *     `UnsupportedExpressionError`, which surfaces as `supported: false`
 *     instead of a fabricated result.
 *
 * Supported: constants, variables, powers, +, -, *, /, sin, cos, tan, sec,
 * csc, cot, exp, ln, log, log2, sqrt, cbrt, recip, the inverse and hyperbolic
 * functions, product rule, quotient rule, chain rule, a^(g(x)).
 * Unsupported (reported honestly): abs/floor/ceil/round/…, factorial,
 * modulo, u(x)^v(x) with both varying.
 */

import { calculateExpression, tokenize, type Token } from './mathEngine';

export class UnsupportedExpressionError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = 'UnsupportedExpressionError';
  }
}

export type SymNode =
  | { kind: 'num'; value: number }
  | { kind: 'var'; name: string }
  | { kind: 'neg'; arg: SymNode }
  | { kind: 'add'; left: SymNode; right: SymNode }
  | { kind: 'sub'; left: SymNode; right: SymNode }
  | { kind: 'mul'; left: SymNode; right: SymNode }
  | { kind: 'div'; left: SymNode; right: SymNode }
  | { kind: 'pow'; base: SymNode; exp: SymNode }
  | { kind: 'call'; name: string; arg: SymNode }
  | { kind: 'call2'; name: string; a: SymNode; b: SymNode };

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

/**
 * Grammar (mirrors mathEngine semantics):
 *
 *   expression      := additive
 *   additive        := multiplicative (('+' | '-') multiplicative)*
 *   multiplicative  := power (('*' | '/' | '%') power)*   -- LPAREN here is implicit *
 *   power           := unary ('^' unary)?                 -- right associative
 *   unary           := ('u-' | 'u+') unary | postfix      -- binds tighter than ^
 *   postfix         := primary ('!')*
 *   primary         := NUMBER | '(' additive ')' | FUNCTION '(' args ')' | identifier
 */
class Parser {
  private pos = 0;

  constructor(
    private readonly tokens: Token[],
    private readonly variable: string,
  ) {}

  private peek(offset = 0): Token | null {
    return this.tokens[this.pos + offset] ?? null;
  }

  private next(): Token {
    const token = this.tokens[this.pos];
    if (!token) throw new Error('Unexpected end of expression');
    this.pos += 1;
    return token;
  }

  parse(): SymNode {
    const node = this.additive();
    const leftover = this.peek();
    if (leftover) throw new Error(`Unexpected token "${leftover.value}"`);
    return node;
  }

  private additive(): SymNode {
    let left = this.multiplicative();
    for (;;) {
      const token = this.peek();
      if (token && token.type === 'OPERATOR' && (token.value === '+' || token.value === '-')) {
        this.next();
        const right = this.multiplicative();
        left = token.value === '+' ? { kind: 'add', left, right } : { kind: 'sub', left, right };
        continue;
      }
      return left;
    }
  }

  private multiplicative(): SymNode {
    let left = this.power();
    for (;;) {
      const token = this.peek();
      if (token && token.type === 'OPERATOR' && (token.value === '*' || token.value === '/')) {
        this.next();
        const right = this.power();
        left = token.value === '*' ? { kind: 'mul', left, right } : { kind: 'div', left, right };
        continue;
      }
      if (token && token.type === 'OPERATOR' && (token.value === '%' || token.value === 'mod')) {
        throw new UnsupportedExpressionError('the modulo operator has no symbolic derivative');
      }
      // Implicit multiplication: an operand followed by '(' means a product,
      // matching mathEngine's behaviour once a variable is substituted
      // (e.g. "x(x + 1)" is x * (x + 1), not a call).
      if (token && token.type === 'LPAREN') {
        const right = this.power();
        left = { kind: 'mul', left, right };
        continue;
      }
      return left;
    }
  }

  private power(): SymNode {
    const base = this.unary();
    const token = this.peek();
    if (token && token.type === 'OPERATOR' && token.value === '^') {
      this.next();
      const exp = this.unary();
      return { kind: 'pow', base, exp };
    }
    return base;
  }

  private unary(): SymNode {
    const token = this.peek();
    if (token && token.type === 'OPERATOR' && (token.value === 'u-' || token.value === 'u+')) {
      this.next();
      const arg = this.unary();
      return token.value === 'u-' ? { kind: 'neg', arg } : arg;
    }
    return this.postfix();
  }

  private postfix(): SymNode {
    const primary = this.primary();
    const token = this.peek();
    if (token && token.type === 'POSTFIX' && token.value === '!') {
      throw new UnsupportedExpressionError('the factorial operator "!" has no symbolic derivative');
    }
    return primary;
  }

  private primary(): SymNode {
    const token = this.next();
    if (token.type === 'NUMBER') {
      const value = Number(token.value);
      if (!Number.isFinite(value)) throw new Error(`Invalid numeric literal: ${token.value}`);
      return { kind: 'num', value };
    }
    if (token.type === 'LPAREN') {
      const inner = this.additive();
      const close = this.peek();
      if (!close || close.type !== 'RPAREN') throw new Error('Mismatched parentheses');
      this.next();
      return inner;
    }
    if (token.type === 'FUNCTION') {
      // The variable itself is never a call, so "x(x + 1)" multiplies.
      const after = this.peek();
      if (token.value === this.variable && (!after || after.type !== 'LPAREN')) {
        return { kind: 'var', name: token.value };
      }
      if (after && after.type === 'LPAREN') {
        this.next(); // consume '('
        const first = this.additive();
        const separator = this.peek();
        if (separator && separator.type === 'COMMA') {
          this.next();
          const second = this.additive();
          const close = this.peek();
          if (!close || close.type !== 'RPAREN') throw new Error('Mismatched parentheses in call arguments');
          this.next();
          return { kind: 'call2', name: token.value, a: first, b: second };
        }
        const close = this.peek();
        if (!close || close.type !== 'RPAREN') throw new Error('Mismatched parentheses in call arguments');
        this.next();
        return { kind: 'call', name: token.value, arg: first };
      }
      // Identifier without parentheses: treat as a variable (any name the
      // tokenizer emitted that is not applied to arguments).
      return { kind: 'var', name: token.value };
    }
    throw new Error(`Unexpected token "${token.value}" in expression`);
  }
}

export function parseExpression(input: string, variable = 'x'): SymNode {
  const tokens = tokenize(input);
  if (tokens.length === 0) throw new Error('Empty expression');
  return new Parser(tokens, variable).parse();
}

// ---------------------------------------------------------------------------
// Differentiation
// ---------------------------------------------------------------------------

function children(node: SymNode): SymNode[] {
  switch (node.kind) {
    case 'neg': return [node.arg];
    case 'add': case 'sub': case 'mul': case 'div': return [node.left, node.right];
    case 'pow': return [node.base, node.exp];
    case 'call': return [node.arg];
    case 'call2': return [node.a, node.b];
    default: return [];
  }
}

function dependsOn(node: SymNode, variable: string): boolean {
  if (node.kind === 'num') return false;
  if (node.kind === 'var') return node.name === variable;
  return children(node).some((child) => dependsOn(child, variable));
}

/**
 * Derivative of the OUTER function for `sin(u)`-style nodes, before the
 * chain-rule factor `u'` is applied. Throws for unsupported functions so a
 * missing rule can never fall through to a wrong one.
 */
function outerDerivativeFactor(node: Extract<SymNode, { kind: 'call' }>): SymNode {
  const u = node.arg;
  const call = (name: string, arg: SymNode): SymNode => ({ kind: 'call', name, arg });
  const mul = (a: SymNode, b: SymNode): SymNode => ({ kind: 'mul', left: a, right: b });
  const div = (a: SymNode, b: SymNode): SymNode => ({ kind: 'div', left: a, right: b });
  const pow = (a: SymNode, b: SymNode): SymNode => ({ kind: 'pow', base: a, exp: b });
  const neg = (a: SymNode): SymNode => ({ kind: 'neg', arg: a });
  const add = (a: SymNode, b: SymNode): SymNode => ({ kind: 'add', left: a, right: b });
  const sub = (a: SymNode, b: SymNode): SymNode => ({ kind: 'sub', left: a, right: b });
  const n = (value: number): SymNode => ({ kind: 'num', value });
  const inv = (a: SymNode): SymNode => div(n(1), a);

  switch (node.name) {
    case 'sin': return call('cos', u);
    case 'cos': return neg(call('sin', u));
    case 'tan': return pow(call('sec', u), n(2));
    case 'sec': return mul(call('sec', u), call('tan', u));
    case 'csc': return neg(mul(call('csc', u), call('cot', u)));
    case 'cot': return neg(pow(call('csc', u), n(2)));
    case 'asin': return inv(call('sqrt', sub(n(1), pow(u, n(2)))));
    case 'acos': return neg(inv(call('sqrt', sub(n(1), pow(u, n(2))))));
    case 'atan': return inv(add(n(1), pow(u, n(2))));
    case 'sinh': return call('cosh', u);
    case 'cosh': return call('sinh', u);
    case 'tanh': return inv(pow(call('cosh', u), n(2)));
    case 'asinh': return inv(call('sqrt', add(pow(u, n(2)), n(1))));
    case 'acosh': return inv(call('sqrt', sub(pow(u, n(2)), n(1))));
    case 'atanh': return inv(sub(n(1), pow(u, n(2))));
    case 'exp': return call('exp', u);
    case 'ln': return inv(u);
    case 'log': case 'log10': return div(n(1), mul(u, call('ln', n(10))));
    case 'log2': return div(n(1), mul(u, call('ln', n(2))));
    case 'sqrt': return div(n(1), mul(n(2), call('sqrt', u)));
    case 'cbrt': return div(n(1), mul(n(3), pow(call('cbrt', u), n(2))));
    case 'recip': return neg(div(n(1), pow(u, n(2))));
    default:
      throw new UnsupportedExpressionError(
        `the function "${node.name}" has no supported symbolic derivative (it is non-differentiable or outside the rule set)`,
      );
  }
}

function diff(node: SymNode, variable: string, rules: string[]): SymNode {
  const num = (value: number): SymNode => ({ kind: 'num', value });
  const binary = (kind: 'add' | 'sub' | 'mul' | 'div', left: SymNode, right: SymNode): SymNode =>
    kind === 'add' ? { kind: 'add', left, right }
      : kind === 'sub' ? { kind: 'sub', left, right }
      : kind === 'mul' ? { kind: 'mul', left, right }
      : { kind: 'div', left, right };

  switch (node.kind) {
    case 'num':
      return num(0);
    case 'var':
      return num(node.name === variable ? 1 : 0);
    case 'neg':
      rules.push('constant-multiple rule (sign)');
      return { kind: 'neg', arg: diff(node.arg, variable, rules) };
    case 'add':
      rules.push('sum rule');
      return binary('add', diff(node.left, variable, rules), diff(node.right, variable, rules));
    case 'sub':
      rules.push('difference rule');
      return binary('sub', diff(node.left, variable, rules), diff(node.right, variable, rules));
    case 'mul':
      rules.push('product rule');
      return binary(
        'add',
        binary('mul', diff(node.left, variable, rules), node.right),
        binary('mul', node.left, diff(node.right, variable, rules)),
      );
    case 'div':
      rules.push('quotient rule');
      return binary(
        'div',
        binary(
          'sub',
          binary('mul', diff(node.left, variable, rules), node.right),
          binary('mul', node.left, diff(node.right, variable, rules)),
        ),
        { kind: 'pow', base: node.right, exp: num(2) },
      );
    case 'pow': {
      const baseDepends = dependsOn(node.base, variable);
      const expDepends = dependsOn(node.exp, variable);
      if (!baseDepends && !expDepends) return num(0);
      if (baseDepends && expDepends) {
        throw new UnsupportedExpressionError(
          'u(x)^v(x) with both the base and the exponent varying is outside the rule set',
        );
      }
      if (expDepends && !baseDepends) {
        rules.push('exponential rule (a^g)');
        if (node.base.kind === 'num') {
          if (node.base.value <= 0) {
            throw new UnsupportedExpressionError(
              `exponential base ${node.base.value} is not positive, so ln(base) is undefined`,
            );
          }
          if (node.base.value === 1) return num(0);
          return binary(
            'mul',
            binary('mul', node, num(Math.log(node.base.value))),
            diff(node.exp, variable, rules),
          );
        }
        return binary(
          'mul',
          binary('mul', node, { kind: 'call', name: 'ln', arg: node.base }),
          diff(node.exp, variable, rules),
        );
      }
      if (node.exp.kind !== 'num') {
        throw new UnsupportedExpressionError('a non-numeric exponent on a varying base is outside the rule set');
      }
      rules.push('power rule (with chain rule on the base)');
      const newExponent = num(node.exp.value - 1);
      return binary(
        'mul',
        binary('mul', node.exp, { kind: 'pow', base: node.base, exp: newExponent }),
        diff(node.base, variable, rules),
      );
    }
    case 'call': {
      rules.push(`chain rule with the derivative of ${node.name}`);
      const outer = outerDerivativeFactor(node);
      return binary('mul', outer, diff(node.arg, variable, rules));
    }
    case 'call2':
      throw new UnsupportedExpressionError(
        `the two-argument function "${node.name}" has no supported symbolic derivative`,
      );
  }
}

// ---------------------------------------------------------------------------
// Simplification (structural, deterministic)
// ---------------------------------------------------------------------------

function isNum(node: SymNode, value: number): boolean {
  return node.kind === 'num' && Math.abs(node.value - value) < Number.EPSILON;
}

function structuralEqual(a: SymNode, b: SymNode): boolean {
  if (a.kind !== b.kind) return false;
  switch (a.kind) {
    case 'num': return a.value === (b as typeof a).value;
    case 'var': return a.name === (b as typeof a).name;
    case 'call': return a.name === (b as typeof a).name && structuralEqual(a.arg, (b as typeof a).arg);
    case 'call2':
      return a.name === (b as typeof a).name
        && structuralEqual(a.a, (b as typeof a).a)
        && structuralEqual(a.b, (b as typeof a).b);
    case 'neg': return structuralEqual(a.arg, (b as typeof a).arg);
    case 'pow':
      return structuralEqual(a.base, (b as typeof a).base) && structuralEqual(a.exp, (b as typeof a).exp);
    default:
      return structuralEqual(a.left, (b as typeof a).left) && structuralEqual(a.right, (b as typeof a).right);
  }
}

function factorRank(node: SymNode): number {
  switch (node.kind) {
    case 'num': return 0;
    case 'var': return 1;
    case 'pow': return 2;
    case 'call': return 3;
    case 'call2': return 4;
    case 'div': return 5;
    case 'neg': return 6;
    case 'add': case 'sub': return 7;
    default: return 8;
  }
}

/** Flatten, fold, pull signs, and canonically order the factors of a product. */
function normalizeMul(factors: SymNode[]): SymNode {
  const flattened: SymNode[] = [];
  const queue = [...factors];
  while (queue.length > 0) {
    const item = queue.shift()!;
    if (item.kind === 'mul') {
      queue.unshift(item.right, item.left);
    } else {
      flattened.push(item);
    }
  }

  let coefficient = 1;
  let sign = 1;
  const others: SymNode[] = [];
  for (const factor of flattened) {
    if (factor.kind === 'num') {
      coefficient *= factor.value;
    } else if (factor.kind === 'neg') {
      sign *= -1;
      others.push(factor.arg);
    } else {
      others.push(factor);
    }
  }

  if (coefficient === 0) return { kind: 'num', value: 0 };
  const total = coefficient * sign;

  // Sort by structural rank only; stable sort keeps equal-rank order.
  others.sort((a, b) => factorRank(a) - factorRank(b));

  let assembled: SymNode;
  if (others.length === 0) {
    assembled = { kind: 'num', value: total };
  } else if (total === 1) {
    assembled = others.reduce((left, right): SymNode => ({ kind: 'mul', left, right }));
  } else if (total === -1) {
    assembled = { kind: 'neg', arg: others.reduce((left, right): SymNode => ({ kind: 'mul', left, right })) };
  } else {
    assembled = others.reduce<SymNode>(
      (left, right) => ({ kind: 'mul', left, right }),
      { kind: 'num', value: total },
    );
  }
  return assembled;
}

function simplify(node: SymNode): SymNode {
  switch (node.kind) {
    case 'num':
      return node;
    case 'var':
      return node;
    case 'neg': {
      const arg = simplify(node.arg);
      if (arg.kind === 'num') return { kind: 'num', value: -arg.value };
      if (arg.kind === 'neg') return arg.arg;
      return { kind: 'neg', arg };
    }
    case 'add': {
      const left = simplify(node.left);
      const right = simplify(node.right);
      if (left.kind === 'num' && right.kind === 'num') return { kind: 'num', value: left.value + right.value };
      if (isNum(left, 0)) return right;
      if (isNum(right, 0)) return left;
      return { kind: 'add', left, right };
    }
    case 'sub': {
      const left = simplify(node.left);
      const right = simplify(node.right);
      if (left.kind === 'num' && right.kind === 'num') return { kind: 'num', value: left.value - right.value };
      if (isNum(right, 0)) return left;
      if (isNum(left, 0)) return { kind: 'neg', arg: right };
      if (structuralEqual(left, right)) return { kind: 'num', value: 0 };
      return { kind: 'sub', left, right };
    }
    case 'mul':
      return normalizeMul([simplify(node.left), simplify(node.right)]);
    case 'div': {
      const left = simplify(node.left);
      const right = simplify(node.right);
      if (isNum(left, 0)) return { kind: 'num', value: 0 };
      if (isNum(right, 1)) return left;
      if (left.kind === 'num' && right.kind === 'num' && right.value !== 0) {
        const value = left.value / right.value;
        if (Number.isFinite(value)) return { kind: 'num', value };
      }
      if (structuralEqual(left, right)) return { kind: 'num', value: 1 };
      if (left.kind === 'neg') return { kind: 'neg', arg: { kind: 'div', left: left.arg, right } };
      if (right.kind === 'neg') return { kind: 'neg', arg: { kind: 'div', left, right: right.arg } };
      return { kind: 'div', left, right };
    }
    case 'pow': {
      const base = simplify(node.base);
      const exp = simplify(node.exp);
      if (exp.kind === 'num' && exp.value === 0) return { kind: 'num', value: 1 };
      if (exp.kind === 'num' && exp.value === 1) return base;
      if (base.kind === 'num' && base.value === 1) return { kind: 'num', value: 1 };
      if (base.kind === 'num' && exp.kind === 'num') {
        const valid = base.value > 0 || Number.isInteger(exp.value);
        if (valid) {
          const value = Math.pow(base.value, exp.value);
          if (Number.isFinite(value)) return { kind: 'num', value };
        }
      }
      if (exp.kind === 'num' && exp.value < 0) {
        // Negative exponents print far more legibly as a quotient, and they
        // evaluate unambiguously in both the symbolic printer and the engine.
        return simplify({
          kind: 'div',
          left: { kind: 'num', value: 1 },
          right: { kind: 'pow', base, exp: { kind: 'num', value: -exp.value } },
        });
      }
      if (base.kind === 'neg' && exp.kind === 'num' && Number.isInteger(exp.value)) {
        return exp.value % 2 === 0
          ? simplify({ kind: 'pow', base: base.arg, exp })
          : { kind: 'neg', arg: simplify({ kind: 'pow', base: base.arg, exp }) };
      }
      return { kind: 'pow', base, exp };
    }
    case 'call':
      return { kind: 'call', name: node.name, arg: simplify(node.arg) };
    case 'call2':
      return { kind: 'call2', name: node.name, a: simplify(node.a), b: simplify(node.b) };
  }
}

// ---------------------------------------------------------------------------
// Printing (precedence-aware, round-trips through the parser)
// ---------------------------------------------------------------------------

const PRECEDENCE: Record<SymNode['kind'], number> = {
  add: 1, sub: 1, mul: 2, div: 2, pow: 3, neg: 4, num: 5, var: 5, call: 5, call2: 5,
};

function precedenceOf(node: SymNode): number {
  return PRECEDENCE[node.kind];
}

function formatNumber(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return String(value);
}

function parenWrap(text: string, needsParens: boolean): string {
  return needsParens ? `(${text})` : text;
}

export function printExpression(node: SymNode): string {
  switch (node.kind) {
    case 'num':
      return formatNumber(node.value);
    case 'var':
      return node.name;
    case 'call':
      return `${node.name}(${printExpression(node.arg)})`;
    case 'call2':
      return `${node.name}(${printExpression(node.a)}, ${printExpression(node.b)})`;
    case 'neg': {
      // ^ must be parenthesized: the engine parses -x^2 as (-x)^2, so a
      // negated power would silently change meaning without the parentheses.
      const needsParens = node.arg.kind === 'add' || node.arg.kind === 'sub' || node.arg.kind === 'pow';
      return `-${parenWrap(printExpression(node.arg), needsParens)}`;
    }
    case 'add':
      return `${printExpression(node.left)} + ${parenWrap(printExpression(node.right), node.right.kind === 'sub')}`;
    case 'sub': {
      const left = parenWrap(printExpression(node.left), precedenceOf(node.left) < 1);
      const needsParens = precedenceOf(node.right) <= 1;
      return `${left} - ${parenWrap(printExpression(node.right), needsParens)}`;
    }
    case 'mul': {
      const leftNode = node.left;
      const rightNode = node.right;
      const left = parenWrap(printExpression(leftNode), precedenceOf(leftNode) < 2);
      const rightParens = precedenceOf(rightNode) < 2 || rightNode.kind === 'div';
      const right = printExpression(rightNode);
      // Implicit multiplication only where the result parses back the same way
      // (number followed by variable, call, or power).
      if (leftNode.kind === 'num' && (rightNode.kind === 'var' || rightNode.kind === 'call' || rightNode.kind === 'pow')) {
        return `${left}${right}`;
      }
      return `${left}*${parenWrap(right, rightParens)}`;
    }
    case 'div': {
      const left = parenWrap(printExpression(node.left), precedenceOf(node.left) < 2);
      const right = parenWrap(printExpression(node.right), precedenceOf(node.right) <= 2);
      return `${left}/${right}`;
    }
    case 'pow': {
      const baseParens = precedenceOf(node.base) < 3 || node.base.kind === 'pow';
      const exp = parenWrap(printExpression(node.exp), precedenceOf(node.exp) < 3);
      return `${parenWrap(printExpression(node.base), baseParens)}^${exp}`;
    }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface SymbolicDerivativeOutcome {
  supported: boolean;
  input: string;
  variable: string;
  /** The derivative function f'(x), normalized. Only set when supported. */
  derivative?: string;
  /** Rule names applied, outermost first. */
  rules: string[];
  /** Why the expression is not supported. Only set when unsupported. */
  reason?: string;
}

/**
 * Differentiate `input` with respect to `variable`. Never throws for
 * unsupported or unparseable input: it reports `supported: false` with a
 * reason, so callers cannot accidentally present a guess as a result.
 */
export function differentiate(input: string, variable = 'x'): SymbolicDerivativeOutcome {
  try {
    const tree = parseExpression(input, variable);
    const rules: string[] = [];
    const derivative = printExpression(simplify(diff(tree, variable, rules)));
    return { supported: true, input, variable, derivative, rules: dedupe(rules) };
  } catch (error) {
    if (error instanceof UnsupportedExpressionError) {
      return { supported: false, input, variable, rules: [], reason: error.message };
    }
    if (error instanceof Error) {
      return { supported: false, input, variable, rules: [], reason: error.message };
    }
    throw error;
  }
}

function dedupe(rules: string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const rule of rules) {
    if (!seen.has(rule)) {
      seen.add(rule);
      unique.push(rule);
    }
  }
  return unique;
}

/**
 * Evaluate an expression at a point by substitution, using the deterministic
 * calculator (radians). Used for numerical spot-checks of symbolic results.
 */
export function evaluateAt(expression: string, variable: string, value: number): number {
  const escaped = variable.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Mirror calculusEngine.evaluateFunctionAt: only letters block a match, so
  // "2x" substitutes to "2(0.7)" while the "x" inside "exp" does not.
  const pattern = new RegExp(`(?<![a-zA-Z])${escaped}(?![a-zA-Z])`, 'g');
  const substituted = expression.replace(pattern, `(${value})`);
  const calc = calculateExpression(substituted, 'RAD');
  if (calc.error || !Number.isFinite(calc.value)) {
    throw new Error(calc.error ?? `Could not evaluate "${expression}" at ${variable} = ${value}`);
  }
  return calc.value;
}

export interface SpotCheckResult {
  checked: number;
  matched: number;
  passed: boolean;
  summary: string;
}

/**
 * Numerical spot-check: the symbolic derivative is evaluated at sample points
 * and compared against a central difference of the ORIGINAL expression. This
 * is a different algorithm from symbolic differentiation, so agreement is
 * meaningful evidence rather than a tautology.
 */
export function spotCheckDerivative(
  sourceExpression: string,
  derivativeExpression: string,
  variable = 'x',
  points: readonly number[] = [0.7, 1.3, -1.1, 2.5],
): SpotCheckResult {
  const h = 1e-4;
  let checked = 0;
  let matched = 0;
  const disagreements: string[] = [];
  for (const point of points) {
    try {
      const symbolic = evaluateAt(derivativeExpression, variable, point);
      const plus = evaluateAt(sourceExpression, variable, point + h);
      const minus = evaluateAt(sourceExpression, variable, point - h);
      const approx = (plus - minus) / (2 * h);
      if (!Number.isFinite(symbolic) || !Number.isFinite(approx)) continue;
      const tolerance = 1e-4 * Math.max(1, Math.abs(symbolic), Math.abs(approx));
      checked += 1;
      if (Math.abs(symbolic - approx) <= tolerance) {
        matched += 1;
      } else {
        disagreements.push(`${variable}=${point}: symbolic ${symbolic} vs numerical ${approx}`);
      }
    } catch {
      // Points outside the domain of the expression are skipped, not failed.
      continue;
    }
  }
  const passed = checked > 0 && matched === checked;
  const summary = checked === 0
    ? `Numerical spot-check could not run (no evaluable sample points) for ${variable} in [${points.join(', ')}].`
    : passed
      ? `Numerical spot-check: symbolic derivative matches central difference at ${matched}/${checked} sample points.`
      : `Numerical spot-check DISAGREED at ${checked - matched}/${checked} sample points: ${disagreements.join('; ')}.`;
  return { checked, matched, passed, summary };
}
