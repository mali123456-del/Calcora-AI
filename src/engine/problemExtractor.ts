import { calculateExpression } from './mathEngine';

export interface ExtractedMathProblem {
  kind: 'calculate' | 'integrate' | 'solveEquation' | 'unknown';
  expression?: string;
  fnExpr?: string;
  a?: number;
  b?: number;
  equation?: string;
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
  for (const [word, value] of Object.entries(numberWord)) s = s.replace(new RegExp('\\b'+word+'\\b','g'), value);
  s = s.replace(/\b(times|multiplied by)\b/g,'*')
    .replace(/\b(divided by|over)\b/g,'/')
    .replace(/\b(plus|added to)\b/g,'+')
    .replace(/\b(minus|subtract)\b/g,'-')
    .replace(/\b(power of)\b/g,'^')
    .replace(/\b(square root of)\b/g,'sqrt ');
  return s;
}

export function extractMathProblem(input: string): ExtractedMathProblem {
  const raw = input.trim();
  if (!raw || raw.length > 1000) return { kind:'unknown' };
  const s = normalize(raw);

  const integrate = s.match(/integrat(?:e|ion)\s+(?:the\s+)?(?:function\s+)?(.+?)\s+from\s+(-?\d+(?:\.\d+)?)\s+(?:to|until)\s+(-?\d+(?:\.\d+)?)/i);
  if (integrate) return { kind:'integrate', fnExpr: integrate[1].trim(), a:Number(integrate[2]), b:Number(integrate[3]) };

  const equation = raw.match(/(?:solve|find x for|find the roots? of)\s+(.+?)(?:\?|$)/i);
  if (equation && /=/.test(equation[1])) return { kind:'solveEquation', equation:equation[1].trim() };

  const arithmetic = s.match(/(?:what is|calculate|compute|evaluate|equals?)\s+(.+?)(?:\?|$)/i);
  const candidate = arithmetic?.[1]?.trim() ?? (/[+*/^%]/.test(s) && /\d/.test(s) ? s.replace(/\?$/,'').trim() : '');
  if (candidate && /^[0-9+*/%().^\s-]+$/.test(candidate)) {
    try {
      const checked = calculateExpression(candidate, 'DEG');
      if (!checked.error) return { kind:'calculate', expression:candidate };
    } catch { /* fall through */ }
  }
  return { kind:'unknown' };
}

export const extractMathematicalProblem = extractMathProblem;
