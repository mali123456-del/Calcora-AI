import { MathematicalIntent, IntentClassificationResult } from './knowledgeTypes';

interface IntentPattern {
  intent: MathematicalIntent;
  keywords: string[];
  regex?: RegExp;
  weight: number;
}

const INTENT_PATTERNS: IntentPattern[] = [
  {
    intent: 'CHECK_STEP',
    keywords: ['check step', 'check my step', 'is this step correct', 'did i do this right', 'check work', 'verify step'],
    regex: /check\s+(my\s+)?(step|work|calculation)|is\s+(this|my)\s+(correct|right)/i,
    weight: 15,
  },
  {
    intent: 'FIND_ERROR',
    keywords: ['find error', 'check for errors', 'audit', 'mistake', 'why is this wrong', 'where did i go wrong'],
    regex: /where\s+did\s+i\s+go\s+wrong|find\s+(my\s+)?(error|mistake)|check\s+for\s+errors/i,
    weight: 14,
  },
  {
    intent: 'WHY_QUESTION',
    keywords: ['why', 'why does', 'why do we', 'why is', 'reason behind', 'intuition'],
    regex: /^why\b|\bwhy\s+(do|does|is|are|can|can't|cannot)\b/i,
    weight: 12,
  },
  {
    intent: 'HOW_QUESTION',
    keywords: ['how', 'how to', 'how do i', 'how does', 'what is the process'],
    regex: /^how\b|\bhow\s+(to|do|can|does)\b/i,
    weight: 11,
  },
  {
    intent: 'PROVE_STATEMENT',
    keywords: ['prove', 'proof', 'show that', 'demonstrate', 'proof by contradiction', 'induction'],
    regex: /\b(prove|show\s+that|proof\s+of|prove\s+by)\b/i,
    weight: 12,
  },
  {
    intent: 'EXPLAIN_FORMULA',
    keywords: ['formula for', 'explain formula', 'what does the formula mean', 'variables in formula', 'pythagorean formula'],
    regex: /explain\s+(the\s+)?formula|formula\s+for|what\s+does\s+.*\s+mean/i,
    weight: 11,
  },
  {
    intent: 'COMPARE_METHODS',
    keywords: ['another method', 'alternative method', 'other way', 'compare methods', 'different approach'],
    regex: /another\s+method|alternative\s+way|different\s+(method|approach)|other\s+way/i,
    weight: 13,
  },
  {
    intent: 'DIFFERENTIATE',
    keywords: ['derivative', 'differentiate', 'd/dx', 'dy/dx', 'rate of change', 'tangent slope'],
    regex: /\b(derivative|differentiate|d\/dx)\b/i,
    weight: 12,
  },
  {
    intent: 'INTEGRATE',
    keywords: ['integral', 'integrate', 'antiderivative', 'area under curve', 'definite integral'],
    regex: /\b(integral|integrate|antiderivative)\b/i,
    weight: 12,
  },
  {
    intent: 'FACTOR',
    keywords: ['factor', 'factorize', 'factoring', 'factor polynomial'],
    regex: /\b(factor|factorize|factoring)\b/i,
    weight: 11,
  },
  {
    intent: 'SIMPLIFY',
    keywords: ['simplify', 'reduce', 'canonical form', 'simplest form'],
    regex: /\b(simplify|reduce\s+to\s+lowest|simplest\s+form)\b/i,
    weight: 11,
  },
  {
    intent: 'GENERATE_PRACTICE',
    keywords: ['practice problem', 'quiz me', 'generate question', 'test me', 'give me a problem'],
    regex: /\b(practice|quiz\s+me|give\s+me\s+a\s+(question|problem)|test\s+me)\b/i,
    weight: 12,
  },
  {
    intent: 'GENERATE_EXAMPLE',
    keywords: ['example', 'give an example', 'show an example', 'sample problem'],
    regex: /\b(give|show)\s+(an?\s+)?example\b/i,
    weight: 11,
  },
  {
    intent: 'SOLVE_SYSTEM',
    keywords: ['system of equations', 'simultaneous equations', 'solve system'],
    regex: /system\s+of\s+equations|simultaneous\s+equations/i,
    weight: 12,
  },
  {
    intent: 'SOLVE_EQUATION',
    keywords: ['solve for x', 'solve equation', 'find roots', 'solve', 'find x'],
    regex: /\bsolve\b.*=|\bfind\s+[a-z]\b|\bsolve\s+for\b/i,
    weight: 10,
  },
  {
    intent: 'STATISTICS',
    keywords: ['mean', 'median', 'mode', 'standard deviation', 'variance', 'z-score', 'regression', 'quartile'],
    regex: /\b(mean|median|mode|standard\s+deviation|variance|z-score|regression)\b/i,
    weight: 9,
  },
  {
    intent: 'PROBABILITY',
    keywords: ['probability', 'bayes', 'permutation', 'combination', 'expected value', 'chance of'],
    regex: /\b(probability|bayes|permutation|combination|expected\s+value)\b/i,
    weight: 9,
  },
  {
    intent: 'ENGINEERING_MATH',
    keywords: ['ohm', 'ohms law', 'resistor', 'voltage', 'current', 'watts', 'fluid pressure', 'hydrostatic'],
    regex: /\b(ohm|voltage|resistor|fluid\s+pressure|hydrostatic)\b/i,
    weight: 10,
  },
  {
    intent: 'PHYSICS_MATH',
    keywords: ['newton', 'f=ma', 'kinetic energy', 'potential energy', 'velocity', 'force', 'gravity'],
    regex: /\b(kinetic\s+energy|potential\s+energy|f\s*=\s*ma|newton)\b/i,
    weight: 10,
  },
  {
    intent: 'DEFINITION',
    keywords: ['what is a', 'define', 'definition of', 'meaning of'],
    regex: /^what\s+is\s+(an?|the)\b|\bdefine\b/i,
    weight: 10,
  },
  {
    intent: 'EXAM_HELP',
    keywords: ['exam', 'test prep', 'study for test', 'exam mode', 'mock test'],
    regex: /\b(exam|test\s+prep|exam\s+mode)\b/i,
    weight: 9,
  },
  {
    intent: 'REVIEW_MISTAKE',
    keywords: ['review mistake', 'previous mistakes', 'saved mistakes', 'error history'],
    regex: /review\s+mistakes?|saved\s+mistakes?/i,
    weight: 12,
  },
  {
    intent: 'EXPLAIN_CONCEPT',
    keywords: ['explain', 'teach me', 'help me understand', 'overview of', 'concept'],
    regex: /\b(explain|teach\s+me|help\s+me\s+understand)\b/i,
    weight: 8,
  },
  {
    intent: 'SOLVE_PROBLEM',
    keywords: ['calculate', 'compute', 'evaluate', 'answer this', 'what is'],
    regex: /\b(calculate|compute|evaluate|what\s+is\s+\d+)\b/i,
    weight: 7,
  },
];

/**
 * Classifies user mathematical input into a structured intent
 */
export function classifyMathematicalIntent(
  query: string,
  contextHistory?: string[]
): IntentClassificationResult {
  const normalized = query.trim().toLowerCase();
  const extractedTerms: string[] = [];

  // Check for follow-up conversational markers
  const isFollowUp =
    /^(what\??|why\??|how\??|can you make it easier|show another method|what if|check my step|don't give me the answer)/i.test(
      normalized
    );

  let bestIntent: MathematicalIntent = 'EXPLAIN_CONCEPT';
  let highestScore = 0;

  for (const pattern of INTENT_PATTERNS) {
    let score = 0;

    if (pattern.regex && pattern.regex.test(normalized)) {
      score += pattern.weight * 2;
    }

    for (const kw of pattern.keywords) {
      if (normalized.includes(kw)) {
        score += pattern.weight;
        extractedTerms.push(kw);
      }
    }

    if (score > highestScore) {
      highestScore = score;
      bestIntent = pattern.intent;
    }
  }

  // If no high-confidence match, determine whether equation solving or general question
  if (highestScore === 0) {
    if (normalized.includes('=') || /[0-9]+\s*[\+\-\*\/]\s*[0-9]+/.test(normalized)) {
      bestIntent = 'SOLVE_PROBLEM';
      highestScore = 5;
    } else {
      bestIntent = 'EXPLAIN_CONCEPT';
      highestScore = 5;
    }
  }

  return {
    intent: bestIntent,
    confidence: Math.min(1.0, highestScore / 30),
    extractedTerms: Array.from(new Set(extractedTerms)),
    isFollowUp,
  };
}
