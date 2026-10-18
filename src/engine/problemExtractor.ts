import { calculateExpression, tokenize } from './mathEngine';

export interface ExtractedMathProblem {
  kind: 'calculate' | 'integrate' | 'solveEquation' | 'unknown';
  expression?: string;
  fnExpr?: string;
  a?: number;
  b?: number;
  equation?: string;
}

/**
 * Prior turns of the conversation, oldest first. Optional: extraction without
 * context behaves exactly as before, so every existing caller is unaffected.
 */
export interface MathProblemContext {
  context?: string[];
}

const numberWord: Record<string,string> = {
  zero:'0', one:'1', two:'2', three:'3', four:'4', five:'5',
  six:'6', seven:'7', eight:'8', nine:'9', ten:'10', eleven:'11',
  twelve:'12', thirteen:'13', fourteen:'14', fifteen:'15', sixteen:'16',
  seventeen:'17', eighteen:'18', nineteen:'19', twenty:'20',
  thirty:'30', forty:'40', fifty:'50', sixty:'60', seventy:'70',
  eighty:'80', ninety:'90',
};

function normalize(text: string): string {
  let s = text.toLowerCase().replace(/×|✕/g,'*').replace(/÷/g,'/').replace(/−/g,'-');
  // Unicode superscripts must become operators before any matching: "x²" is a
  // differentiable expression, not prose. mathEngine.tokenize does the same.
  s = s.replace(/²/g, '^2').replace(/³/g, '^3');
  for (const [word, value] of Object.entries(numberWord)) s = s.replace(new RegExp('\\b'+word+'\\b','g'), value);
  s = s.replace(/\b(times|multiplied by)\b/g,'*')
    .replace(/\b(divided by|over)\b/g,'/')
    .replace(/\b(plus|added to)\b/g,'+')
    .replace(/\b(minus|subtract)\b/g,'-')
    .replace(/\b(power of)\b/g,'^')
    .replace(/\b(square root of)\b/g,'sqrt ');
  return s;
}

/**
 * Strips the conversational filler that sits between a solving verb and the
 * equation itself.
 *
 * Learners write "Solve the equation 2x + 5 = 15" and "Find the value of x in
 * 3x - 4 = 11" far more often than the bare "Solve 2x + 5 = 15". The capture
 * after the verb keeps that filler, and handing "the equation 2x + 5 = 15" to
 * the solver fails to parse, so the request silently fell through to a
 * conceptual answer instead of being solved.
 */
function normalizeEquationCandidate(capture: string): string {
  let candidate = capture.trim();
  // "please solve for x:", "solve for x in", "for x:"
  candidate = candidate.replace(/^(?:please\s+)?(?:solve\s+)?for\s+(?:the\s+)?(?:value\s+of\s+)?x\s*(?:in|for|is|equals?|:)?\s*/i, '');
  // "the equation", "this problem:", "the following "
  candidate = candidate.replace(/^(?:the|this|that|following)\s+(?:equation|problem|solution)?\s*/i, '');
  // "equation:", "problem -", or a colon left behind by the rule above
  candidate = candidate.replace(/^(?:equation|problem|solution)?\s*[:\-]\s*/i, '');
  // "the value of x in", "value of x ="
  candidate = candidate.replace(/^(?:the\s+)?value\s+of\s+x\s*(?:in|is|equals?|:)?\s*/i, '');
  return candidate.replace(/[.?!,]+$/, '').trim();
}

/**
 * Words that end an operand inside a derivative/integration capture.
 *
 * A misconception check puts the learner's claim in the same sentence as the
 * thing being differentiated, so the capture reads "x^2 is x. is that right".
 * The operand is everything up to the first word on this list.
 *
 * Deliberately narrow and deliberately NOT a general English stop-word list:
 * only claim, copula and confirmation vocabulary that can *follow* an operand
 * appears here. Mathematical function names (sin, cos, log, ln, sqrt, exp, abs,
 * max, min, tan, cbrt) and the variable letters themselves must never be on it,
 * or "differentiate sin(x)" would lose its argument.
 */
const OPERAND_STOP_WORDS = new Set([
  // copulas / auxiliaries — the claim attaches with one of these
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'am',
  // the learner asserting a result and asking to confirm it
  'right', 'correct', 'correctly', 'really', 'actually', 'truly', 'sure',
  'wrong', 'true', 'maybe', 'perhaps', 'probably', 'just', 'not', 'yes', 'no',
  // belief verbs that introduce the claim
  'think', 'believe', 'guess', 'suppose', 'mean', 'wonder', 'know', 'reckon',
  // determiners and pronouns that cannot begin a computable operand
  'the', 'this', 'that', 'these', 'those', 'a', 'an', 'my', 'your', 'our',
  'their', 'i', 'you', 'we', 'it', 'he', 'she', 'they',
  // sentence glue
  'and', 'or', 'then', 'than', 'so', 'but', 'if', 'when', 'where', 'what',
  'which', 'why', 'how',
]);

/**
 * The operand of a derivative/integration request: the longest leading run of
 * words that is still mathematics, stopping at the first prose word.
 *
 * Returns `null` when nothing computable leads the capture, so the caller falls
 * through to the conceptual path instead of evaluating prose. The tokenizer
 * remains the final authority — the walk only decides *where to stop*.
 */
function leadingOperand(capture: string): string | null {
  const words = capture.split(/\s+/).filter(Boolean);
  const accepted: string[] = [];
  for (const word of words) {
    const bare = word.replace(/^[^a-z0-9]+|[^a-z0-9]+$/gi, '').toLowerCase();
    if (OPERAND_STOP_WORDS.has(bare)) break;
    accepted.push(word);
  }
  const candidate = accepted.join(' ').replace(/\s+/g, ' ').trim();
  if (!candidate) return null;
  // Must still be mathematics: a digit or an operator/bracket. A stop-free run
  // of ordinary words ("integral calculus work") is prose, not an operand.
  if (!/[0-9]/.test(candidate) && !/[+\-*/^%()]/.test(candidate)) return null;
  try {
    tokenize(candidate);
    return candidate;
  } catch {
    return null;
  }
}

/**
 * A follow-up that names the operation but carries the operand in an earlier
 * turn: "And its derivative?".
 *
 * Deliberately strict — it must match the ENTIRE prompt, so only a bare
 * relative operation request can borrow an operand. Anything longer ("Explain
 * what a derivative is", "What is a derivative?", "Find the derivative of
 * x^2") never matches and keeps its original behaviour: a mention of a
 * derivative is a conceptual question, not an instruction to compute whatever
 * happens to be in the transcript.
 */
const RELATIVE_OPERAND_REQUEST =
  /^(?:and\s+|so\s+|now\s+)?(?:its|their|his|her|that|this|the\s+same|same)\s+(?:own\s+)?(?:derivative|differentiation|deriv|integral|antiderivative)\s*\??$/i;

/**
 * The most recent turn is searched first: a follow-up refers to what was just
 * discussed, and the newest mention wins.
 *
 * The candidate must contain BOTH a letter (a derivative is meaningless
 * without a variable) and a digit or operator, and it must tokenize. That
 * triple requirement is what keeps ordinary prose out: "monomial" has no digit,
 * "is" has no operator, and "2" has no variable.
 */
function referentFromContext(context?: string[]): string | null {
  if (!context || context.length === 0) return null;
  for (let i = context.length - 1; i >= 0; i -= 1) {
    const text = context[i];
    if (!text || !text.trim()) continue;
    for (const candidate of candidatesIn(text)) {
      const stripped = candidate.replace(/[.\s]+$/, '');
      // Stripped first: the tokenizer accepts a trailing "." ("3x^2 + 2."
      // tokenizes), so trying the raw form first would return the sentence's
      // full stop as part of the expression.
      for (const attempt of stripped === candidate ? [candidate] : [stripped, candidate]) {
        if (!/[a-z]/i.test(attempt)) continue;
        if (!/[0-9]/.test(attempt) && !/[+\-*/^%()]/.test(attempt)) continue;
        try {
          tokenize(attempt);
          return attempt;
        } catch {
          // not an expression — try the next attempt
        }
      }
    }
  }
  return null;
}

/**
 * Every maximal arithmetic span of `text`, longest first.
 *
 * A span is an atom followed by optional spaces and further atoms joined by an
 * operator or bracket, which is what lets "3x^2 + 2" survive as one candidate
 * instead of shattering at the spaces. Sorting longest-first means the whole
 * operand beats the variable inside it.
 */
function candidatesIn(text: string): string[] {
  const spans =
    text.match(
      /[0-9a-z][0-9a-z+\-*/^().]*(?:\s*[+\-*/^().]\s*[0-9a-z][0-9a-z+\-*/^().]*)*/gi,
    ) ?? [];
  return [...new Set(spans)].sort((a, b) => b.length - a.length);
}

export function extractMathProblem(input: string, options?: MathProblemContext): ExtractedMathProblem {
  const raw = input.trim();
  if (!raw || raw.length > 1000) return { kind:'unknown' };
  const s = normalize(raw);

  // Follow-up request: the operation is named here but the operand lives in an
  // earlier turn ("And its derivative?" after "What is x^2?").
  //
  // Gated on the ENTIRE prompt being a bare relative operation request. A
  // mention such as "Explain what a derivative is" never matches, so it can
  // never borrow a stale expression from the transcript and compute it as an
  // answer to a conceptual question. With no usable referent we fall through
  // to the normal path rather than invent an operand.
  if (RELATIVE_OPERAND_REQUEST.test(s)) {
    const referent = referentFromContext(options?.context);
    if (referent) return { kind: 'calculate', expression: referent };
  }

  const integrate = s.match(/integrat(?:e|ion)\s+(?:the\s+)?(?:function\s+)?(.+?)\s+from\s+(-?\d+(?:\.\d+)?)\s+(?:to|until)\s+(-?\d+(?:\.\d+)?)/i);
  if (integrate) return { kind:'integrate', fnExpr: integrate[1].trim(), a:Number(integrate[2]), b:Number(integrate[3]) };

  // Extract derivative requests: "derivative of x^2", "differentiate x^2", "d/dx of x^2"
  //
  // Call form first: "d/dx(x^3 + 2x)" applies the operator directly to a
  // parenthesized expression, so there is no whitespace for the spaced pattern
  // below to match. Without this the canonical calculus syntax fell through to
  // kind 'unknown' and the Tutor claimed nothing could be computed.
  const derivativeCall = s.match(/\b(?:d\/dx|dy\/dx|differentiate)\s*\((.+)\)/i);
  if (derivativeCall) {
    const cleanedExpr = derivativeCall[1].trim().replace(/\s+(and|with|where|why|how|explain|teach).*/i, '').trim();
    const looksComputable = /[0-9]/.test(cleanedExpr) || /[+\-*/^%()]/.test(cleanedExpr);
    if (cleanedExpr && looksComputable && /^[a-z0-9+\-*/^().\s]+$/i.test(cleanedExpr)) {
      return { kind:'calculate', expression: cleanedExpr };
    }
  }
  const derivative = s.match(/(?:derivative|differentiat(?:e|ion)|d\/dx)\s+(?:of\s+)?(.+?)(?:\?|$)/i);
  if (derivative) {
    const expr = derivative[1].trim();
    // Remove trailing "and explain why" or similar explanatory phrases
    const cleanedExpr = expr.replace(/\s+(and|with|where|why|how|explain|teach).*/i, '').trim();
    // "derivative of ..." can end on a sentence word: "Explain what a derivative is"
    // captures "is". A capture is only a computation when it carries a digit or an
    // operator; otherwise it is prose, and the caller must fall through to the
    // conceptual path instead of evaluating a word as a function.
    const looksComputable = /[0-9]/.test(cleanedExpr) || /[+\-*/^%()]/.test(cleanedExpr);
    if (cleanedExpr && looksComputable) {
      // A misconception check states the learner's own claim in the same
      // sentence, so the capture is the operand *fused with prose*:
      // "I think the derivative of x^2 is x. Is that right?" captures
      // "x^2 is x. is that right", and "I guess the derivative of x^3 + 2x is
      // 3x^2 + 2, correct?" captures the claim too. That prose satisfies a
      // loose letter/digit/dot character class — punctuation such as "," and
      // "?" is what a naive guard trips on — but it is not mathematics, and
      // handing it to the engine made the request fail open into a conceptual
      // answer instead of correcting the claim.
      //
      // The operand is what sits *before* the first prose word. This must be a
      // stop-at-prose walk rather than "longest prefix the tokenizer accepts",
      // because the tokenizer treats any identifier as a variable: it accepts
      // "x^2 is x" as x²·is·x. Only a lexical stop can separate the operand
      // from the claim, and the tokenizer then decides whether what remains is
      // mathematics at all. Math function names (sin, log, sqrt, ...) are not
      // prose and never stop the walk.
      const operand = leadingOperand(cleanedExpr);
      if (operand) return { kind: 'calculate', expression: operand };
    }
  }

  const equation = raw.match(/(?:solve|find x for|find (?:the )?(?:value of )?x (?:in|from)|find the roots? of)\s+(.+?)(?:\?|$)/i);
  if (equation && /=/.test(equation[1])) {
    const candidate = normalizeEquationCandidate(equation[1]);
    if (candidate && /=/.test(candidate)) return { kind:'solveEquation', equation:candidate };
  }

  const arithmetic = s.match(/(?:what is|calculate|compute|evaluate|equals?)\s+(.+?)(?:\?|$)/i);
  const candidate = arithmetic?.[1]?.trim() ?? (/[+*/^%]/.test(s) && /\d/.test(s) ? s.replace(/\?$/,'').trim() : '');
  if (candidate && /^[0-9+*/%().^\s-]+$/.test(candidate)) {
    try {
      const checked = calculateExpression(candidate, 'DEG');
      if (!checked.error) return { kind:'calculate', expression:candidate };
    } catch { /* fall through */ }
  }

  // A learner writing in Urdu or Arabic still writes the mathematics in Latin
  // characters ("x^2 کا مشتق کیا ہے؟"), but it is surrounded by words that the
  // Latin-only patterns above cannot see. Without this, such a request silently
  // degraded to a conceptual answer instead of being computed.
  //
  // This path is deliberately limited to sentences that actually contain
  // non-Latin script. Applying it to Latin-script prose would invent expressions
  // out of ordinary English text (the knowledge audit caught exactly that:
  // "Simplify log_10(1000)" and "|A| = 14, |B| = 10" were mis-read).
  //
  // Roman Urdu is Latin-script, so it needs its own, equally narrow gate. Requiring
  // actual Roman-Urdu function words -- rather than merely "the text is Latin" -- is what
  // keeps ordinary English prose out, so the two guards above still hold. "x^2 ka
  // derivative kya hai?" qualifies; "Simplify log_10(1000)" does not.
  if (NON_LATIN_SCRIPT.test(raw) || ROMAN_URDU_PROSE.test(raw)) {
    const embedded = extractEmbeddedExpression(s);
    if (embedded) {
      // Validated with the tokenizer rather than `calculateExpression`: a symbolic
      // expression such as "x^2" is legitimate input for the derivative tool but
      // is not a numeric evaluation, so the numeric engine would reject it. The
      // tokenizer accepts variable expressions and throws on prose.
      try {
        tokenize(embedded);
        return { kind:'calculate', expression:embedded };
      } catch { /* fall through */ }
    }
  }

  return { kind:'unknown' };
}

/** Arabic, Hebrew, Devanagari, CJK and friends - scripts that carry no Latin words. */
const NON_LATIN_SCRIPT = /[\u0600-\u06FF\u0700-\u074F\u0900-\u097F\u0980-\u0DFF\u0E00-\u0E7F\u3040-\u30FF\u3400-\u9FFF\uFB50-\uFDFF\uFE70-\uFEFF]/;

/**
 * Roman-Urdu prose markers, used only to widen the embedded-expression gate to
 * Latin-script Urdu. Deliberately excludes bare English words so that ordinary English prose
 * never reaches the expression miner. Reuses the project's own detection vocabulary rather than
 * inventing a second, divergent list.
 */
const ROMAN_URDU_PROSE =
  /(?<![\p{L}\p{M}])(kya|hai|ka|ki|ke|hal|batao|bataiye|samjhao|samjho|kyun|kaise|nahi|nahin|hain|hoga|karo|karna|mujhe|acha|matlab|kyunki)(?![\p{L}\p{M}])/iu;

/**
 * Finds a self-contained Latin-script expression embedded in a sentence written
 * in another script (Urdu, Arabic, Persian, and any other non-Latin language).
 *
 * Only sequences that already look like mathematics are accepted: Latin letters,
 * digits, operators and parentheses, containing at least one digit or operator.
 * Prose is never captured, so an Urdu sentence with no math in it still returns
 * `unknown` and the Tutor answers conceptually.
 */
function extractEmbeddedExpression(normalized: string): string | null {
  // A maximal run of mathematics inside the sentence. Spaces are included so a
  // spaced expression such as "3x + 5" survives as one candidate, and the run
  // naturally stops at the first non-Latin character.
  const runs = normalized.match(/[a-zA-Z0-9_()[\]^+\-*/%.]+(?:\s+[a-zA-Z0-9_()[\]^+\-*/%.]+)*/g);
  if (!runs) return null;
  const candidates = runs
    .map((run) => run.trim().replace(/[+\-*/%.]+$/g, '').trim())
    // A Latin-script expression embedded in Roman Urdu fuses with the surrounding words
    // into one run ("x^2 ka derivative"), which the prose guard below then discards.
    // Removing Roman-Urdu function words first isolates the mathematics: "x^2 ka
    // derivative kya hai" reduces to "x^2". This is deliberately narrow -- it removes only
    // listed Urdu function words, so ordinary English prose is untouched and the
    // "Simplify log_10(1000)" guard still holds.
    .map((run) =>
      run
        .split(/\s+/)
        .filter((word) => word.length > 0 && !ROMAN_URDU_PROSE.test(word))
        .join(' ')
        .trim(),
    )
    // The request noun itself ("... derivative", "... hal") trails the mathematics in
    // Roman Urdu phrasing. Stripping it leaves the bare expression "x^2" rather than
    // "x^2 derivative". Only a known set of mathematical request nouns is removed.
    .map((run) => run.replace(/\s+(derivative|differential|integral|limit|matrix|vector|hal|answer|result)$/iu, '').trim())
    .filter((run) => run.length > 1 && run.length <= 40)
    // Must look like mathematics: a digit AND an operator or parentheses.
    // Letter-only runs are set-notation or prose, never a computable expression.
    .filter((run) => /[0-9]/.test(run))
    .filter((run) => /[+\-*/^]/.test(run) || /[([]/.test(run))
    // The derivative operator itself is a request marker, never the function to
    // differentiate. Without this, "x^2 کا d/dx کیا ہے؟" differentiated "d/dx"
    // and answered the nonsense d/dx(d/dx) = 0.
    .filter((run) => !/^d\/?d[a-z]$/i.test(run.replace(/\s+/g, '')))
    // Three or more consecutive plain words is prose, not an expression.
    .filter((run) => !/[a-zA-Z]{3,}\s+[a-zA-Z]{3,}\s+[a-zA-Z]{3,}/.test(run))
    // Latin script only.
    .filter((run) => /^[a-zA-Z0-9_()[\]^+\-*/%. ]+$/.test(run));
  if (candidates.length === 0) return null;
  // A run can fuse mathematics with trailing prose ("x^2 is x. is that right"). Offer the
  // word-by-word prefixes as well, SHORTEST FIRST, so the tokenizer -- not a regex heuristic --
  // decides which is a valid expression. A prose tail therefore cannot survive, and an
  // expression that only appears as a prefix ("x^2") is still found.
  const prefixes = candidates.flatMap((run) => {
    const words = run.split(/\s+/).filter(Boolean);
    const offers: string[] = [];
    for (let take = 1; take <= words.length; take += 1) {
      const candidateRun = words.slice(0, take).join(' ');
      offers.push(candidateRun);
    }
    return offers;
  });
  // Prefer an expression that actually contains a number (x^2, 3x + 5) over a
  // Prefer an expression containing a digit, then the LONGEST run that still tokenizes.
  // The tokenizer is the authority: a fused run containing prose is rejected, and the
  // longest surviving prefix is the real expression.
  const ordered = prefixes.sort((a, b) => {
    const digitDelta = Number(/[0-9]/.test(b)) - Number(/[0-9]/.test(a));
    if (digitDelta !== 0) return digitDelta;
    return b.length - a.length;
  });
  for (const offer of ordered) {
    try {
      tokenize(offer);
      return offer;
    } catch { /* try the next-shortest offer */ }
  }
  return ordered[0];
}

export const extractMathematicalProblem = extractMathProblem;
