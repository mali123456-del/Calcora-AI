/**
 * Mathematical Problem & Expression Extractor
 * Safely parses natural language and mathematical queries across multiple languages,
 * normalizing them into canonical expressions suitable for deterministic engines.
 */

export interface ExtractedProblem {
  type: 'arithmetic' | 'equation' | 'system' | 'calculus_derivative' | 'calculus_integral' | 'statistics' | 'matrix' | 'unit' | 'concept' | 'error_check' | 'word_problem';
  canonicalExpression: string;
  variable?: string;
  parameters?: Record<string, any>;
  confidence: number;
}

/**
 * Normalizes multilingual words and math symbols into canonical math tokens
 */
export function normalizeMathQuery(query: string): string {
  let q = query.trim();

  // Replace common multiplication words / unicode
  q = q.replace(/[×✕✖·]/g, '*');
  q = q.replace(/[÷]/g, '/');
  q = q.replace(/[−–—]/g, '-');
  q = q.replace(/[√]/g, 'sqrt');

  // English words
  q = q.replace(/\btimes\b/gi, '*');
  q = q.replace(/\bmultiplied\s+by\b/gi, '*');
  q = q.replace(/\bdivided\s+by\b/gi, '/');
  q = q.replace(/\bplus\b/gi, '+');
  q = q.replace(/\bminus\b/gi, '-');
  q = q.replace(/\bsquared\b/gi, '^2');
  q = q.replace(/\bcubed\b/gi, '^3');
  q = q.replace(/\bto\s+the\s+power\s+of\b/gi, '^');
  q = q.replace(/\bto\s+the\s+power\b/gi, '^');
  q = q.replace(/\bpower\b/gi, '^');
  q = q.replace(/\bsquare\s+root\s+of\b/gi, 'sqrt');

  // Spanish
  q = q.replace(/\bpor\b/gi, '*');
  q = q.replace(/\bdividido\s+por\b/gi, '/');
  q = q.replace(/\bdividido\s+entre\b/gi, '/');
  q = q.replace(/\bmás\b/gi, '+');
  q = q.replace(/\bmenos\b/gi, '-');

  // French
  q = q.replace(/\bfois\b/gi, '*');
  q = q.replace(/\bdivisé\s+par\b/gi, '/');

  // German
  q = q.replace(/\bmal\b/gi, '*');
  q = q.replace(/\bgeteilt\s+durch\b/gi, '/');

  // Urdu / Hindi / Arabic words
  q = q.replace(/ضرب/g, '*');
  q = q.replace(/تقسیم/g, '/');
  q = q.replace(/جمع/g, '+');
  q = q.replace(/منفی/g, '-');
  q = q.replace(/गुना/g, '*');
  q = q.replace(/गुणा/g, '*');
  q = q.replace(/भाग/g, '/');
  q = q.replace(/जोड़/g, '+');
  q = q.replace(/घटाव/g, '-');

  // Chinese
  q = q.replace(/乘以/g, '*');
  q = q.replace(/乘/g, '*');
  q = q.replace(/除以/g, '/');
  q = q.replace(/加/g, '+');
  q = q.replace(/减/g, '-');

  return q;
}

/**
 * Extracts structured problem information and canonical math expression from a prompt
 */
export function extractMathematicalProblem(rawPrompt: string): ExtractedProblem | null {
  if (!rawPrompt || !rawPrompt.trim()) return null;

  const normalized = normalizeMathQuery(rawPrompt);

  // 1. Error check: e.g. "where is the error in 2(x+3)=2x+3" or "check 2x+3=10"
  if (/error|mistake|check\s+(my\s+)?(step|work)/i.test(rawPrompt)) {
    const exprMatch = rawPrompt.match(/([a-zA-Z0-9\(\)\+\-\*\/\^\=]+(?:\s*[=\-\+]\s*[a-zA-Z0-9\(\)\+\-\*\/\^]+)+)/);
    return {
      type: 'error_check',
      canonicalExpression: exprMatch ? exprMatch[1].trim() : rawPrompt.trim(),
      confidence: 0.85,
    };
  }

  // 2. Calculus: Derivative e.g. "d/dx(x^2)", "derivative of x^2", "differentiate 3x^3"
  const derivMatch = normalized.match(/(?:d\/dx|derivative\s+of|differentiate)\s*[\(]?([a-zA-Z0-9\^\+\-\*\/\s]+)[\)]?/i);
  if (derivMatch) {
    return {
      type: 'calculus_derivative',
      canonicalExpression: derivMatch[1].trim(),
      variable: 'x',
      confidence: 0.95,
    };
  }

  // 3. Calculus: Integral e.g. "integrate x^2 from 0 to 3", "integral of 2x dx", "∫2x dx"
  const defIntegMatch = normalized.match(/(?:integrate|integral\s+of|[∫])\s*([a-zA-Z0-9\^\+\-\*\/\s]+?)(?:\s*dx)?\s+from\s+([0-9\.\-]+)\s+to\s+([0-9\.\-]+)/i);
  if (defIntegMatch) {
    return {
      type: 'calculus_integral',
      canonicalExpression: defIntegMatch[1].trim(),
      parameters: { a: parseFloat(defIntegMatch[2]), b: parseFloat(defIntegMatch[3]) },
      variable: 'x',
      confidence: 0.98,
    };
  }

  const integMatch = normalized.match(/(?:integrate|integral\s+of|[∫])\s*([a-zA-Z0-9\^\+\-\*\/\s]+?)(?:\s*dx)?$/i);
  if (integMatch) {
    return {
      type: 'calculus_integral',
      canonicalExpression: integMatch[1].trim(),
      parameters: { a: 0, b: 1 },
      variable: 'x',
      confidence: 0.95,
    };
  }

  // 4. Statistics: e.g. "mean of [1,2,3,4,5]", "average of 10, 20, 30", "median of 1, 2, 3"
  const statsMatch = normalized.match(/(?:mean|average|median|mode|variance|standard\s+deviation)\s+(?:of\s+)?(?:\[)?([0-9\s,\.\-]+)(?:\])?/i);
  if (statsMatch) {
    const rawNumbers = statsMatch[1].split(/[\s,]+/).filter(Boolean).map(Number).filter(n => Number.isFinite(n));
    if (rawNumbers.length > 0) {
      return {
        type: 'statistics',
        canonicalExpression: rawNumbers.join(', '),
        parameters: { data: rawNumbers },
        confidence: 0.9,
      };
    }
  }

  // 5. Algebraic Equation solving: e.g. "solve 2x + 4 = 10", "x^2 - 5x + 6 = 0", "3x = 12"
  const eqMatch = normalized.match(/(?:solve\s+)?([a-zA-Z0-9\^\+\-\*\/\(\)\s]+\s*=\s*[a-zA-Z0-9\^\+\-\*\/\(\)\s]+)/i);
  if (eqMatch && /[a-zA-Z]/.test(eqMatch[1])) {
    return {
      type: 'equation',
      canonicalExpression: eqMatch[1].trim(),
      confidence: 0.95,
    };
  }

  // 6. Simple Arithmetic: e.g. "What is 7 times 8?", "17 * 24", "144 / 12", "15 - 7", "2 + 2", "sqrt(144)", "2^10"
  // Check for sqrt explicitly
  const sqrtMatch = normalized.match(/(?:sqrt\s*\(?\s*([0-9\.]+)\s*\)?|square\s+root\s+of\s+([0-9\.]+))/i);
  if (sqrtMatch) {
    const num = sqrtMatch[1] || sqrtMatch[2];
    return {
      type: 'arithmetic',
      canonicalExpression: `sqrt(${num})`,
      confidence: 0.98,
    };
  }

  // Direct arithmetic expression match within the prompt (e.g. "7 * 8", "15 - 7", "100 / 4", "12 * 12", "2 ^ 10")
  const arithPattern = /(?:what\s+is\s+|calculate\s+|compute\s+|evaluate\s+)?([0-9\.]+(?:\s*[\+\-\*\/\^%]\s*[0-9\.]+)+)/i;
  const arithMatch = normalized.match(arithPattern);
  if (arithMatch) {
    const cleanExpr = arithMatch[1].replace(/\s+/g, ' ').trim();
    return {
      type: 'arithmetic',
      canonicalExpression: cleanExpr,
      confidence: 0.95,
    };
  }

  // Single number operations e.g. "5!", "100%"
  const singleOpMatch = normalized.match(/([0-9\.]+\s*(?:!|%))/);
  if (singleOpMatch) {
    return {
      type: 'arithmetic',
      canonicalExpression: singleOpMatch[1].trim(),
      confidence: 0.9,
    };
  }

  return null;
}
