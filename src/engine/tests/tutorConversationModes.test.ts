/**
 * Tutor conversation service — state, problem context, adaptive level, modes.
 *
 * This suite previously exercised an obsolete session API (`getActiveSession`,
 * `persistLearningState`, `adaptLearningLevel(topic, correct)`). The service was
 * reworked into immutable, explicitly-passed state, so the suite was ported to
 * the current contract rather than left failing or deleted. The behaviours it
 * pins are the ones the live Tutor depends on: a session starts from a known
 * state, a problem context carries the authoritative result, the adaptive level
 * promotes and demotes on streaks, mode switching keeps the problem, the
 * transcript is bounded, follow-ups are recognised as follow-ups, and the
 * session export reflects real state.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createTutorConversationState,
  loadTutorConversationState,
  appendTutorMessage,
  updateTutorProblemContext,
  adaptTutorLearningLevel,
  setTutorMode,
  resetTutorSession,
  isTutorFollowUpPrompt,
  buildTutorFollowUpContext,
  formatTutorContinuityContext,
  exportTutorSessionMarkdown,
} from '../../services/tutorConversationService';

describe('Tutor conversation state', () => {
  it('starts from a known default state', () => {
    const state = createTutorConversationState('session-a', 'Calculus Derivatives Mastery');
    assert.equal(state.id, 'session-a');
    assert.equal(state.title, 'Calculus Derivatives Mastery');
    assert.equal(state.mode, 'tutor');
    assert.equal(state.messages.length, 1);
    assert.equal(state.messages[0].role, 'assistant');
    assert.equal(state.problemContext, null);
    assert.equal(state.learning.level, 'intermediate');
    assert.equal(state.learning.xp, 0);
    assert.ok(state.createdAt > 0);

    // Without a storage backend (Node), loading yields a fresh usable state
    // rather than throwing or returning a malformed object.
    const loaded = loadTutorConversationState();
    assert.ok(loaded.id);
    assert.ok(Array.isArray(loaded.messages));
    assert.ok(loaded.learning);
  });

  it('attaches an authoritative problem context', () => {
    let state = createTutorConversationState();
    state = updateTutorProblemContext(state, {
      rawProblem: '2x + 5 = 15',
      topic: 'Algebra',
      authoritativeResult: 'x = 5',
      derivationSteps: ['Subtract 5 from both sides', 'Divide both sides by 2'],
      currentSubstepIndex: 1,
    });
    assert.equal(state.problemContext?.rawProblem, '2x + 5 = 15');
    assert.equal(state.problemContext?.topic, 'Algebra');
    assert.equal(state.problemContext?.authoritativeResult, 'x = 5');
    assert.equal(state.problemContext?.derivationSteps?.length, 2);
    assert.equal(state.problemContext?.currentSubstepIndex, 1);

    // A later partial update must not erase what is already known.
    state = updateTutorProblemContext(state, { currentSubstepIndex: 2 });
    assert.equal(state.problemContext?.rawProblem, '2x + 5 = 15');
    assert.equal(state.problemContext?.currentSubstepIndex, 2);
  });

  it('appends messages in order and bounds the transcript', () => {
    let state = createTutorConversationState();
    state = appendTutorMessage(state, { role: 'user', content: 'Solve 2x + 5 = 15' });
    state = appendTutorMessage(state, { role: 'assistant', content: 'Subtract 5 from both sides.' });
    assert.equal(state.messages.length, 3);
    assert.equal(state.messages[1].role, 'user');
    assert.equal(state.messages[2].content, 'Subtract 5 from both sides.');

    for (let i = 0; i < 260; i += 1) {
      state = appendTutorMessage(state, { role: 'user', content: `follow-up ${i}` });
    }
    assert.ok(state.messages.length <= 200, `the transcript must stay bounded (got ${state.messages.length})`);
    assert.equal(state.messages[state.messages.length - 1].content, 'follow-up 259');
  });

  it('adapts the learning level from performance streaks', () => {
    let state = createTutorConversationState();
    state = updateTutorProblemContext(state, { rawProblem: '2x + 5 = 15', topic: 'Algebra' });

    state = adaptTutorLearningLevel(state, { correct: true });
    assert.equal(state.learning.xp, 25);
    assert.equal(state.learning.consecutiveCorrect, 1);
    assert.equal(state.learning.level, 'intermediate');

    state = adaptTutorLearningLevel(state, { correct: true });
    state = adaptTutorLearningLevel(state, { correct: true });
    // Three consecutive correct answers promote and reset the streak.
    assert.equal(state.learning.level, 'advanced');
    assert.equal(state.learning.consecutiveCorrect, 0);
    assert.equal(state.learning.xp, 75, 'three correct answers earn 3 x 25 XP');
    // Topic mastery moves with the same evidence and stays inside 0..100.
    assert.ok((state.learning.topicMastery.Algebra ?? 0) >= 10);

    state = adaptTutorLearningLevel(state, { correct: false });
    state = adaptTutorLearningLevel(state, { correct: false });
    // Two consecutive mistakes demote and reset the mistake streak.
    assert.equal(state.learning.level, 'intermediate');
    assert.equal(state.learning.consecutiveMistakes, 0);
    assert.equal(state.learning.consecutiveCorrect, 0);

    // Mastery never leaves its bounds, however long the session runs.
    for (let i = 0; i < 40; i += 1) {
      state = adaptTutorLearningLevel(state, { correct: false });
    }
    assert.equal(state.learning.level, 'beginner');
    assert.ok((state.learning.topicMastery.Algebra ?? 0) >= 0);
  });

  it('switches tutor mode while keeping the active problem', () => {
    let state = createTutorConversationState('session-mode');
    state = updateTutorProblemContext(state, { rawProblem: 'x^2 - 5x + 6 = 0', topic: 'Algebra' });
    state = appendTutorMessage(state, { role: 'user', content: 'Solve it' });

    const quiz = setTutorMode(state, 'quiz');
    assert.equal(quiz.mode, 'quiz');
    assert.equal(quiz.problemContext?.rawProblem, 'x^2 - 5x + 6 = 0', 'mode switching must not drop the active problem');

    const reset = resetTutorSession(quiz);
    assert.equal(reset.id, 'session-mode');
    assert.equal(reset.mode, 'tutor');
    assert.equal(reset.messages.length, 1, 'a reset session starts again from the welcome message');
    assert.equal(reset.problemContext, null);
    assert.equal(reset.learning.xp, 0);
  });

  it('recognises follow-up prompts and builds continuity context', () => {
    let state = createTutorConversationState();
    assert.equal(isTutorFollowUpPrompt('Solve 9 * 8'), false);
    assert.equal(isTutorFollowUpPrompt('What is the next step?'), true);
    assert.equal(isTutorFollowUpPrompt('Why did we subtract 5?'), true);

    // Without an active problem nothing is a follow-up, even for a follow-up-shaped prompt.
    assert.equal(buildTutorFollowUpContext(state, 'Why did we subtract 5?').isFollowUp, false);

    state = updateTutorProblemContext(state, { rawProblem: '2x + 5 = 15', topic: 'Algebra' });
    state = appendTutorMessage(state, { role: 'assistant', content: 'Subtract 5 from both sides.' });
    const context = buildTutorFollowUpContext(state, 'Why did we subtract 5?');
    assert.equal(context.isFollowUp, true);
    assert.equal(context.activeProblem?.rawProblem, '2x + 5 = 15');
    assert.equal(context.learningLevel, 'intermediate');
    assert.ok(context.recentTurns.length >= 1);

    const text = formatTutorContinuityContext(context);
    assert.ok(text.includes('2x + 5 = 15'), `continuity text must carry the active problem, got: ${text}`);
  });

  it('exports the session as markdown reflecting real state', () => {
    let state = createTutorConversationState('session-export', 'Trigonometry Practice');
    state = updateTutorProblemContext(state, { rawProblem: 'sin(30 degrees)', topic: 'Trigonometry' });
    state = adaptTutorLearningLevel(state, { correct: true });
    state = appendTutorMessage(state, { role: 'user', content: 'What is sin(30)?' });

    const markdown = exportTutorSessionMarkdown(state);
    assert.ok(markdown.includes('# Math Tutor Session'));
    assert.ok(markdown.includes('Trigonometry') || markdown.includes('sin(30 degrees)'));
    assert.ok(markdown.includes('What is sin(30)?'));
    assert.ok(markdown.includes('25'), 'the export reports the earned XP rather than a placeholder');
  });
});
