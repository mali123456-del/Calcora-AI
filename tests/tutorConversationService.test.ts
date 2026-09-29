import { strict as assert } from 'node:assert';
import {
  createTutorConversationState,
  appendTutorMessage,
  updateTutorProblemContext,
  adaptTutorLearningLevel,
  setTutorMode,
  resetTutorSession,
  exportTutorSessionMarkdown,
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
