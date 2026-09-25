import { strict as assert } from 'node:assert';
import {
  createTutorConversationState,
  appendTutorMessage,
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

state = setTutorMode(adaptive, 'socratic');
assert.equal(state.mode, 'socratic');
assert.equal(state.messages.length, 1);
const exported = exportTutorSessionMarkdown(state);
assert.ok(exported.includes('# Math Tutor Session'));
const reset = resetTutorSession(state);
assert.equal(reset.messages.length, 1);
console.log('Tutor conversation state tests passed');


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
