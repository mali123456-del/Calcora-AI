export interface TutorConversationContext {
  currentProblem?: string;
  topic?: string;
  subtopic?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  learningObjective?: string;
  currentStep?: string;
  hintLevel?: 1 | 2 | 3 | 4 | 5;
  userAttempts: string[];
  detectedMistakes: string[];
  preferredExplanationStyle?: 'simple' | 'standard' | 'rigorous';
  solvedStatus?: 'unsolved' | 'in-progress' | 'solved';
}

export const createTutorConversationContext = (): TutorConversationContext => ({
  userAttempts: [],
  detectedMistakes: [],
  solvedStatus: 'unsolved',
});

export function updateTutorConversationContext(
  context: TutorConversationContext,
  patch: Partial<TutorConversationContext>,
): TutorConversationContext {
  return {
    ...context,
    ...patch,
    userAttempts: patch.userAttempts ? [...patch.userAttempts] : [...context.userAttempts],
    detectedMistakes: patch.detectedMistakes ? [...patch.detectedMistakes] : [...context.detectedMistakes],
  };
}

export function buildTutorGroundingContext(
  context: TutorConversationContext,
  knowledge: Array<{ id: string; concept: string; definition: string; formulas?: string[]; domainRestrictions?: string[] }>,
): string {
  const lines = [
    'CALCORA MATHEMATICS GROUNDING CONTEXT',
    context.currentProblem ? `Current problem: ${context.currentProblem}` : '',
    context.topic ? `Topic: ${context.topic}` : '',
    context.subtopic ? `Subtopic: ${context.subtopic}` : '',
    context.currentStep ? `Current step: ${context.currentStep}` : '',
    context.hintLevel ? `Hint level: ${context.hintLevel}` : '',
    ...knowledge.map((item) => [
      `Concept: ${item.concept}`,
      `Definition: ${item.definition}`,
      item.formulas?.length ? `Formulas: ${item.formulas.join('; ')}` : '',
      item.domainRestrictions?.length ? `Restrictions: ${item.domainRestrictions.join('; ')}` : '',
    ].filter(Boolean).join('\n')),
  ].filter(Boolean);
  return lines.join('\n');
}
