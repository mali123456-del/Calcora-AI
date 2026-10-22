import { strict as assert } from 'node:assert';
import {
  createTutorConversationState,
  appendTutorMessage,
  truncateLastTutorExchange,
  updateTutorProblemContext,
  adaptTutorLearningLevel,
  setTutorMode,
  resetTutorSession,
  exportTutorSessionMarkdown,
  isTutorFollowUpPrompt,
  buildTutorFollowUpContext,
  formatTutorContinuityContext,
} from '../src/services/tutorConversationService';

let state = createTutorConversationState('session-1');
assert.equal(state.mode, 'tutor');
assert.equal(state.messages.length, 1);

state = updateTutorProblemContext(state, {
  rawProblem: '2x + 5 = 17',
  canonicalExpression: '2x + 5 = 17',
  topic: 'Algebra',
  difficulty: 'beginner',
});
state = appendTutorMessage(state, { role: 'user', content: 'I subtract 5 first.' });
assert.equal(state.problemContext?.rawProblem, '2x + 5 = 17');
assert.equal(state.messages.length, 2);
assert.equal(state.problemContext?.messageCount, 2);

let adaptive = adaptTutorLearningLevel(state, { correct: true });
adaptive = adaptTutorLearningLevel(adaptive, { correct: true });
adaptive = adaptTutorLearningLevel(adaptive, { correct: true });
assert.equal(adaptive.learning.level, 'intermediate');

adaptive = adaptTutorLearningLevel(adaptive, { correct: false });
adaptive = adaptTutorLearningLevel(adaptive, { correct: false });
assert.equal(adaptive.learning.level, 'beginner');

assert.equal(isTutorFollowUpPrompt('What is the next step?'), true);
assert.equal(isTutorFollowUpPrompt('Why did we subtract 5?'), true);
assert.equal(isTutorFollowUpPrompt('Solve 9 * 8'), false);

const continuity = buildTutorFollowUpContext(state, 'What do I do next?');
assert.equal(continuity.isFollowUp, true);
assert.equal(continuity.reason, 'continuation');
assert.equal(continuity.activeProblem?.rawProblem, '2x + 5 = 17');
assert.equal(continuity.learningLevel, 'beginner');

const continuityText = formatTutorContinuityContext(continuity);
assert.ok(continuityText.includes('Active problem: 2x + 5 = 17'));
assert.ok(continuityText.includes('Follow-up detected: yes'));
assert.ok(continuityText.includes('Follow-up reason: continuation'));

state = setTutorMode(adaptive, 'socratic');
assert.equal(state.mode, 'socratic');
assert.equal(state.messages.length, 1);
const exported = exportTutorSessionMarkdown(state);
assert.ok(exported.includes('# Math Tutor Session'));
const reset = resetTutorSession(state);
assert.equal(reset.messages.length, 1);

// Regenerate persistence: the trailing exchange (last user question + answer)
// must be truncated from the persisted conversation before a re-send, so the
// regenerated exchange replaces instead of duplicates.
let fresh = createTutorConversationState('session-regen');
const unchangedFresh = truncateLastTutorExchange(fresh);
assert.equal(unchangedFresh.messages.length, 1, 'no user question: nothing to truncate');

fresh = appendTutorMessage(fresh, { role: 'user', content: 'What is 2 + 3?' });
const questionUnanswered = truncateLastTutorExchange(fresh);
assert.equal(questionUnanswered.messages.length, 2, 'a question awaiting its answer is not truncated');

fresh = appendTutorMessage(fresh, { role: 'assistant', content: 'It is 5.' });
const answered = truncateLastTutorExchange(fresh);
assert.equal(answered.messages.length, 1, 'the answered exchange collapses back to the base state');
assert.equal(answered.messages[0].role, 'assistant', 'the welcome message survives');
let regrown = appendTutorMessage(answered, { role: 'user', content: 'What is 2 + 3?' });
regrown = appendTutorMessage(regrown, { role: 'assistant', content: 'Regenerated answer.' });
assert.equal(regrown.messages.length, 3, 'regenerated exchange replaces the previous one (no duplication)');
const textAfterRegen = exportTutorSessionMarkdown(regrown);
assert.equal((textAfterRegen.match(/It is 5\./g) ?? []).length, 0, 'the old answer is gone after regeneration');
assert.ok(textAfterRegen.includes('Regenerated answer.'));
void state;
console.log('Tutor conversation state + continuity tests passed');
