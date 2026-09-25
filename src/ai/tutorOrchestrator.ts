import { executeMathTool } from '../engine/toolLayer';
import { extractMathProblem, type ExtractedMathProblem } from '../engine/problemExtractor';
import type { MathToolResult } from '../types';
import type { TutorMode, DifficultyLevel, LearningObjective, MathTopic } from '../utils/aiTutor';

export interface TutorOrchestrationOptions {
  mode?: TutorMode;
  difficulty?: DifficultyLevel;
  learningObjective?: LearningObjective;
  topic?: MathTopic;
  userAnswer?: string;
  hintLevel?: number;
}

export interface TutorOrchestrationResult {
  success: boolean;
  deterministic: MathToolResult | null;
  intent: ExtractedMathProblem['kind'];
  authoritative: boolean;
  answer: string;
  steps: string[];
  expression: string | null;
  formula: string | null;
  mode: TutorMode;
  fallbackReason?: string;
}

async function executeExtracted(problem: ExtractedMathProblem): Promise<MathToolResult | null> {
  switch (problem.kind) {
    case 'calculate': return executeMathTool('calculate', { expression: problem.expression });
    case 'solveEquation': return executeMathTool('solveEquation', { equation: problem.equation });
    case 'integrate': return executeMathTool('integrate', { fnExpr: problem.fnExpr, a: problem.a, b: problem.b });
    default: return null;
  }
}

function quizOptions(result: string): string[] {
  return [result, 'A nearby value', 'An opposite-sign value', 'Cannot be determined'];
}

function pedagogicalResponse(prompt: string, deterministic: MathToolResult | null, options: TutorOrchestrationOptions): Pick<TutorOrchestrationResult, 'answer'|'steps'> {
  const mode = options.mode ?? 'tutor';
  const result = deterministic?.result ?? '';
  const steps = deterministic?.derivationSteps ?? [];
  switch (mode) {
    case 'socratic':
      return {
        answer: deterministic?.success
          ? `Let's solve this together. What mathematical operation would undo the first operation in “${prompt}”? Explain why before calculating.`
          : 'What do you already know about this problem, and which rule would you try first?',
        steps: [],
      };
    case 'hint':
      return {
        answer: steps[Math.min(Math.max((options.hintLevel ?? 1) - 1, 0), Math.max(steps.length - 1, 0))] || 'Identify the governing formula or operation first, then apply it carefully.',
        steps: [],
      };
    case 'quiz':
      return {
        answer: deterministic?.success
          ? `Quiz: What is the correct result for “${prompt}”?\n\nA) ${quizOptions(result)[0]}\nB) ${quizOptions(result)[1]}\nC) ${quizOptions(result)[2]}\nD) ${quizOptions(result)[3]}\n\nReply with A, B, C, or D.`
          : `Quiz: Choose the rule or method you would use first for “${prompt}”.`,
        steps: [],
      };
    case 'challenge':
      return { answer: `Challenge: solve “${prompt}” without looking at a worked solution. Then send your answer and I’ll check it against the deterministic engine.`, steps: [] };
    case 'exam':
      return { answer: `Exam mode: solve “${prompt}” independently. Show your working; hints are withheld unless requested.`, steps: [] };
    case 'check-work':
      return { answer: options.userAnswer ? `I’ll audit your submitted work against the deterministic result and identify the first incorrect transformation.\n\nSubmitted: ${options.userAnswer}` : 'Paste your working and I’ll check it step by step.', steps: [] };
    case 'review':
    case 'solver-review':
      return { answer: deterministic?.success ? `Review the solution for “${prompt}”. The deterministic engine produced the verified result; now inspect signs, domain restrictions, assumptions, and each transformation.` : 'Review mode: identify assumptions, domain restrictions, and the first step that needs verification.', steps };
    case 'step-by-step':
      return { answer: deterministic?.success ? result : 'No deterministic solution is available for this prompt.', steps };
    case 'assistant':
    case 'tutor':
    default:
      return { answer: deterministic?.success ? result : '', steps };
  }
}

export async function orchestrateTutor(prompt: string, options: TutorOrchestrationOptions = {}): Promise<TutorOrchestrationResult> {
  const extracted = extractMathProblem(prompt);
  const deterministic = await executeExtracted(extracted);
  const mode = options.mode ?? 'tutor';
  const pedagogical = pedagogicalResponse(prompt, deterministic, options);
  return {
    success: true,
    deterministic,
    intent: extracted.kind,
    authoritative: Boolean(deterministic?.success && deterministic.verificationBadge.isVerified),
    answer: pedagogical.answer,
    steps: pedagogical.steps,
    expression: deterministic?.success ? (deterministic.expression || null) : null,
    formula: deterministic?.success ? (deterministic.formula ?? null) : null,
    mode,
    fallbackReason: deterministic?.success ? undefined : deterministic?.error ?? 'No deterministic tool was applicable.',
  };
}

export function isAuthoritativeToolResult(value: unknown): value is MathToolResult {
  if (!value || typeof value !== 'object') return false;
  const r = value as Partial<MathToolResult>;
  return r.success === true && r.verificationBadge?.isVerified === true && typeof r.result === 'string';
}
