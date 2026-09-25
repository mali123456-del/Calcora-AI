import type { TutorOrchestrationResult } from '../ai/tutorOrchestrator';

export interface TutorResponseGuardResult {
  safe: boolean;
  issues: string[];
  score: number;
}

const FINAL_ANSWER_MODES = new Set(['socratic', 'hint', 'quiz', 'challenge', 'exam']);

export function guardTutorResponse(
  response: Pick<TutorOrchestrationResult, 'answer'|'mode'|'deterministic'|'authoritative'>,
): TutorResponseGuardResult {
  const issues: string[] = [];
  let score = 1;

  if (!response.answer.trim()) {
    issues.push('empty-response');
    score -= 0.6;
  }

  if (FINAL_ANSWER_MODES.has(response.mode) && response.authoritative && response.mode !== 'quiz') {
    const verified = response.deterministic?.result?.trim();
    if (verified && response.answer.includes(verified)) {
      issues.push('premature-final-answer');
      score -= 0.8;
    }
  }

  if (response.authoritative && !response.deterministic) {
    issues.push('authority-without-deterministic-result');
    score -= 1;
  }

  return { safe: issues.length === 0, issues, score: Math.max(0, score) };
}
