/** Competitive tutor quick actions inspired by public math-tool capabilities. */
import { AIMessage } from '../types';
export type QuickPromptType = 'explain-step' | 'check-errors' | 'simplify' | 'solve-step-by-step' | 'alternative' | 'quick-answer' | 'definition' | 'word-problem' | 'worksheet' | 'lesson-plan' | 'business-analysis' | 'security-math';
export interface QuickPromptContext { inputPrompt?: string; currentExpression?: string; currentResult?: string; targetStep?: string; lastAssistantMessage?: AIMessage; }
export interface QuickPromptItem { id: QuickPromptType; label: string; description: string; badge?: string; }
export const QUICK_PROMPT_ITEMS: QuickPromptItem[] = [
  { id: 'explain-step', label: 'Explain this step', description: 'Deconstruct the mathematical derivation and principles behind a step', badge: 'Tutor' },
  { id: 'check-errors', label: 'Check for errors', description: 'Audit calculations for sign mistakes, domain errors, and arithmetic slips', badge: 'Audit' },
  { id: 'simplify', label: 'Simplify expression', description: 'Combine like terms, factor, and reduce to simplest canonical form', badge: 'Algebra' },
  { id: 'solve-step-by-step', label: 'Solve step-by-step', description: 'Step-by-step breakdown from start to finish with proof', badge: 'Solve' },
  { id: 'alternative', label: 'Alternative method', description: 'Explore a different mathematical method to verify or solve', badge: 'Insight' },
  { id: 'quick-answer', label: 'Quick answer', description: 'Verified result first, then a compact method', badge: 'Fast' },
  { id: 'definition', label: 'Define concept', description: 'Definition, notation, intuition and a minimal example', badge: 'Learn' },
  { id: 'word-problem', label: 'Word problem', description: 'Translate a real-world problem into variables and equations', badge: 'Model' },
  { id: 'worksheet', label: 'Mini worksheet', description: 'Generate a short topic-focused practice set with answers', badge: 'Practice' },
  { id: 'lesson-plan', label: 'Lesson plan', description: 'Create a level-aware math lesson with objectives, examples, checks, and exit ticket', badge: 'Teacher' },
  { id: 'business-analysis', label: 'Business analysis', description: 'Turn quantitative business data into transparent calculations, scenarios, and decision-ready insights', badge: 'Business' },
  { id: 'security-math', label: 'Security math', description: 'Explore defensive cryptography, modular arithmetic, risk math, and protocol reasoning safely', badge: 'Security' },
];
export function buildQuickPrompt(type: QuickPromptType, context: QuickPromptContext = {}): string {
  const { inputPrompt, currentExpression, currentResult, targetStep, lastAssistantMessage } = context;
  const userTyped = inputPrompt?.trim();
  const profile = type === 'quick-answer' ? 'quick' : 'deep';
  const prefix = `[CALCORA_RESPONSE_PROFILE:${profile}]`;
  switch (type) {
    case 'explain-step': return `${prefix} Explain this step in detail and name the exact mathematical rule used: ${targetStep || userTyped || currentExpression || lastAssistantMessage?.content || 'the current step'}`;
    case 'check-errors': return `${prefix} Audit this calculation for errors, sign mistakes, domain restrictions, false assumptions, and rounding issues: ${userTyped || currentExpression || lastAssistantMessage?.content || 'the current derivation'}`;
    case 'simplify': return `${prefix} Simplify this expression step-by-step to canonical form: ${userTyped || currentExpression || 'the current mathematical expression'}`;
    case 'solve-step-by-step': return `${prefix} Solve this problem step-by-step with clear derivations and justifications: ${userTyped || currentExpression || 'the current problem'}`;
    case 'alternative': return `${prefix} Demonstrate a genuinely different valid method and explain when it is useful: ${userTyped || currentExpression || 'the current problem'}`;
    case 'quick-answer': return `${prefix} Give the verified mathematical answer first, then a compact method in 1-3 lines. Do not omit domain restrictions.\n${userTyped || currentExpression || 'the current problem'}`;
    case 'definition': return `${prefix} Give a precise definition, notation, intuition, one minimal example, and one common misconception for: ${userTyped || currentExpression || 'the current mathematical concept'}`;
    case 'word-problem': return `${prefix} Solve this as a mathematical word problem: extract givens, define variables with units, formulate equations, solve, then sanity-check the result against the story: ${userTyped || currentExpression || 'the current word problem'}`;
    case 'worksheet': return `${prefix} Generate a mini worksheet of 5 original problems on ${userTyped || currentExpression || 'the current topic'}, mixing difficulty, with progressive hints and a separate answer key. Do not copy proprietary questions.`;
    case 'lesson-plan': return `${prefix} Create a math lesson plan for ${userTyped || currentExpression || 'the current topic'} with learning objectives, prerequisite check, teacher explanation, worked examples, differentiated practice, misconceptions, formative checks, and an exit ticket.`;
    case 'business-analysis': return `${prefix} Analyze ${userTyped || currentExpression || 'the current quantitative business problem'} using explicit formulas, units, assumptions, scenario/sensitivity analysis, and decision-ready interpretation. Never invent missing business data.`;
    case 'security-math': return `${prefix} Explain the defensive mathematical foundations of ${userTyped || currentExpression || 'the current security topic'}, focusing on cryptography, modular arithmetic, probability, risk, and protocol reasoning. Keep the discussion safe and educational; do not provide unauthorized-access, credential-theft, malware, evasion, or destructive instructions.`;
    default: return userTyped || 'Help me solve this mathematical problem.';
  }
}
