import { calculateExpression } from '../engine/mathEngine';

export interface AutomaticMathAction {
  expression: string;
  result: string;
  reason: 'direct-expression' | 'percentage';
}

const stripMathLead = (input: string): string =>
  input
    .trim()
    .replace(/^(calculate|compute|evaluate|what is|what's|find|solve|kitna hai|calculate karo|hisab karo)\s+/i, '')
    .replace(/[?]+$/, '')
    .trim();

const NUMBER_WORDS: Record<string, string> = {
  zero: '0', one: '1', two: '2', three: '3', four: '4', five: '5',
  six: '6', seven: '7', eight: '8', nine: '9', ten: '10',
  eleven: '11', twelve: '12', thirteen: '13', fourteen: '14', fifteen: '15',
  sixteen: '16', seventeen: '17', eighteen: '18', nineteen: '19', twenty: '20',
  ek: '1', aik: '1', do: '2', teen: '3', chaar: '4', char: '4',
  paanch: '5', chhe: '6', che: '6', saat: '7', aath: '8', nau: '9', das: '10',
};

const NUMBER_WORD_PATTERN = Object.keys(NUMBER_WORDS).join('|');

const normalizeNaturalExpression = (input: string): string =>
  input
    .replace(/\b(square root of|sqrt of)\s+([0-9.]+)\b/gi, '√$2')
    .replace(/\b([0-9.]+|[a-z]+)\s+squared\b/gi, '$1^2')
    .replace(/\b([0-9.]+|[a-z]+)\s+cubed\b/gi, '$1^3')
    .replace(/\b(divided by|divide by|taqseem by|taqseem)\b/gi, '/')
    .replace(/\b(multiplied by|multiply by|times|guna|zarb)\b/gi, '*')
    .replace(/\b(plus|add|jama)\b/gi, '+')
    .replace(/\b(minus|subtract|manfi)\b/gi, '-')
    .replace(/\b(and)\b/gi, '+')
    .replace(new RegExp('\\b(' + NUMBER_WORD_PATTERN + ')\\b', 'gi'), (word) => NUMBER_WORDS[word.toLowerCase()] ?? word)
    .replace(/\s+/g, ' ')
    .trim();

export function detectAutomaticCalculation(input: string): AutomaticMathAction | null {
  const raw = input.trim();
  if (!raw) return null;

  const percentage = raw.match(
    /^(?:calculate\s+|compute\s+|what(?:\s+is|'s)\s+)?(\d+(?:\.\d+)?)\s*%\s*(?:of\s+)?(\d+(?:\.\d+)?)\s*$/i,
  );
  if (percentage) {
    const expression = `${percentage[1]} * ${percentage[2]} / 100`;
    const calc = calculateExpression(expression);
    if (!calc.error && Number.isFinite(calc.value)) {
      return { expression, result: calc.display, reason: 'percentage' };
    }
  }

  const expression = normalizeNaturalExpression(stripMathLead(raw))
    .replace(/×/g, '*')
    .replace(/÷/g, '/');

  if (
    !/[0-9]/.test(expression) ||
    /[a-zA-Z]{2,}/.test(expression) ||
    /\b(solve|explain|derive|prove|why|how|teach|check|show|simplify|factor|differentiate|integrate)\b/i.test(raw)
  ) {
    return null;
  }

  if (!/^[0-9+\-*/().,%^√π\s]+$/.test(expression)) return null;

  const normalized = expression.replace(/%/g, '/100');
  const calc = calculateExpression(normalized);
  if (calc.error || !Number.isFinite(calc.value)) return null;

  return { expression: normalized, result: calc.display, reason: 'direct-expression' };
}
