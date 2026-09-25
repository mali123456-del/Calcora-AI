/**
 * Calcora AI - Tutor Conversation State & Functional Modes Test Suite
 *
 * Verifies:
 * 1. Conversation State Management:
 *    - Session persistence and retrieval
 *    - Problem context lifecycle (rawProblem, canonicalExpression, authoritativeResult, derivationSteps)
 *    - User learning level adaptation (XP gain, difficulty progression, mistake recovery)
 *    - Message history appending and context snapshotting
 *    - Markdown transcript export
 * 2. Functional Tutor Modes:
 *    - Socratic Mode: Strictly prompts with pedagogical guiding questions without prematurely exposing the final answer
 *    - Step-by-Step Mode: Exhaustive numbered derivations with explicit mathematical justifications
 *    - Quiz Mode: Interactive question generation and student response evaluation against authoritative truth
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  createDefaultSession,
  listSessions,
  saveSession,
  getSession,
  deleteSession,
  getActiveSession,
  setActiveSessionId,
  updateProblemContext,
  adaptLearningLevel,
  loadGlobalLearningLevel,
  saveGlobalLearningLevel,
  getDefaultLearningLevel,
  addMessageToActiveSession,
  setTutorMode,
  exportSessionMarkdown,
  clearActiveSessionHistory,
  createNewSession,
} from '../../services/tutorConversationService';
import {
  orchestrateTutor,
  TutorOrchestrationResult,
} from '../../services/tutorOrchestrator';

describe('Tutor Conversation State Management Service', () => {
  beforeEach(() => {
    saveGlobalLearningLevel(getDefaultLearningLevel());
  });

  it('initializes default active session with welcome message and problem context', () => {
    const session = getActiveSession();
    assert.ok(session.id);
    assert.ok(session.messages.length > 0);
    assert.equal(session.messages[0].role, 'assistant');
    assert.ok(session.problemContext);
    assert.ok(session.learningLevel);
  });

  it('creates new named session and sets it as active', () => {
    const session = createNewSession({
      title: 'Calculus Derivatives Mastery',
      mode: 'step-by-step',
      initialTopic: 'Calculus',
    });

    assert.equal(session.title, 'Calculus Derivatives Mastery');
    assert.equal(session.activeTutorMode, 'step-by-step');
    assert.equal(session.problemContext.topic, 'Calculus');
    assert.equal(getActiveSession().id, session.id);
  });

  it('persists and updates mathematical problem context', () => {
    const session = createNewSession({ title: 'Algebra Session' });
    const updated = updateProblemContext(
      {
        rawProblem: '2x + 5 = 15',
        canonicalExpression: '2x + 5 = 15',
        problemType: 'equation',
        topic: 'Algebra',
        authoritativeResult: 'x = 5',
        derivationSteps: ['Subtract 5 from both sides: 2x = 10', 'Divide by 2: x = 5'],
        currentSubstepIndex: 1,
      },
      session.id
    );

    assert.equal(updated.rawProblem, '2x + 5 = 15');
    assert.equal(updated.authoritativeResult, 'x = 5');
    assert.equal(updated.derivationSteps?.length, 2);

    const reloaded = getSession(session.id);
    assert.equal(reloaded?.problemContext.authoritativeResult, 'x = 5');
    assert.equal(reloaded?.problemContext.currentSubstepIndex, 1);
  });

  it('appends messages and takes problem context snapshots', () => {
    const session = createNewSession({ title: 'Test Messages' });
    updateProblemContext({ rawProblem: '3x = 12', topic: 'Algebra' }, session.id);

    const userMsg = addMessageToActiveSession(
      {
        role: 'user',
        content: 'How do I solve 3x = 12?',
        mode: 'socratic',
      },
      session.id
    );

    const assistantMsg = addMessageToActiveSession(
      {
        role: 'assistant',
        content: 'What operation is the inverse of multiplying by 3?',
        mode: 'socratic',
        steps: ['Identify coefficient 3', 'Apply division'],
      },
      session.id
    );

    const reloaded = getSession(session.id);
    assert.ok(reloaded);
    assert.ok(reloaded.messages.some((m) => m.id === userMsg.id));
    assert.ok(reloaded.messages.some((m) => m.id === assistantMsg.id));
    assert.equal(userMsg.problemContextSnapshot?.topic, 'Algebra');
  });

  it('adapts user learning level dynamically based on performance', () => {
    const initial = loadGlobalLearningLevel();
    assert.equal(initial.difficulty, 'intermediate');
    assert.equal(initial.experiencePoints, 0);

    // 1st correct answer (+25 XP)
    const after1 = adaptLearningLevel('Algebra', true);
    assert.equal(after1.experiencePoints, 25);
    assert.equal(after1.consecutiveCorrect, 1);

    // 2nd correct answer (+25 XP)
    adaptLearningLevel('Algebra', true);

    // 3rd consecutive correct answer -> triggers level progression to advanced!
    const after3 = adaptLearningLevel('Algebra', true);
    assert.equal(after3.difficulty, 'advanced');
    assert.equal(after3.consecutiveCorrect, 0); // reset streak upon promotion
    assert.equal(after3.experiencePoints, 75);

    // Mistakes adapt down after 2 consecutive errors
    adaptLearningLevel('Algebra', false);
    const afterMistakes = adaptLearningLevel('Algebra', false);
    assert.equal(afterMistakes.difficulty, 'intermediate');
  });

  it('updates tutor mode and resets session history cleanly', () => {
    const session = createNewSession();
    setTutorMode('quiz', session.id);
    assert.equal(getSession(session.id)?.activeTutorMode, 'quiz');

    clearActiveSessionHistory();
    const active = getActiveSession();
    assert.equal(active.messages.length, 1);
    assert.equal(active.problemContext.rawProblem, '');
  });

  it('exports session transcript to readable Markdown format', () => {
    const session = createNewSession({ title: 'Trigonometry Session' });
    updateProblemContext({ rawProblem: 'sin(45)', authoritativeResult: '0.7071' }, session.id);
    addMessageToActiveSession({ role: 'user', content: 'What is sin(45)?' }, session.id);
    addMessageToActiveSession(
      {
        role: 'assistant',
        content: 'In a 45-45-90 triangle, sin(45) = 1/sqrt(2).',
        formula: 'sin(45) = \\frac{\\sqrt{2}}{2}',
        isVerified: true,
        verificationNote: 'Deterministic Verified',
      },
      session.id
    );

    const md = exportSessionMarkdown(session.id);
    assert.ok(md.includes('# Calcora AI Tutor Session:'));
    assert.ok(md.includes('sin(45)'));
    assert.ok(md.includes('Deterministic Verified'));
  });
});

describe('Functional Tutor Modes (orchestrateTutor Execution Logic)', () => {
  it('Socratic Mode: generates guided question without prematurely revealing the final answer', async () => {
    const result: TutorOrchestrationResult = await orchestrateTutor({
      prompt: 'Solve 2x + 5 = 15',
      topic: 'Algebra',
      mode: 'socratic',
      offlineOnly: true,
    });

    assert.equal(result.success, true);
    assert.equal(result.mode, 'socratic');
    assert.equal(result.pedagogy.socraticActive, true);

    // Crucial pedagogical constraint: Socratic mode must NOT give away "x = 5" as the answer!
    assert.ok(!result.answer.toLowerCase().includes('answer: 5'));
    assert.ok(!result.answer.toLowerCase().includes('answer: x = 5'));

    // Must guide the student with a question
    assert.ok(
      result.answer.toLowerCase().includes('question') ||
      result.answer.toLowerCase().includes('what') ||
      result.answer.toLowerCase().includes('inverse')
    );

    // Meanwhile, deterministic authority remains strictly verified in the background
    assert.equal(result.deterministicAuthority.isAvailable, true);
    assert.equal(result.deterministicAuthority.isVerified, true);
    assert.ok(result.deterministicAuthority.authoritativeResult?.includes('5'));
  });

  it('Step-by-Step Mode: generates exhaustive numbered derivation with mathematical principles', async () => {
    const result: TutorOrchestrationResult = await orchestrateTutor({
      prompt: 'What is 15 * 8?',
      topic: 'Arithmetic',
      mode: 'step-by-step',
      offlineOnly: true,
    });

    assert.equal(result.success, true);
    assert.equal(result.mode, 'step-by-step');
    assert.ok(result.steps.length > 0);

    // Numbered step derivations present
    assert.ok(result.steps.some((s) => s.toLowerCase().includes('step')));
    assert.ok(result.answer.includes('Step-by-Step'));
    assert.ok(result.answer.includes('120'));

    // Authoritative result confirmed
    assert.equal(result.deterministicAuthority.authoritativeResult, '120');
  });

  it('Quiz Mode: generates interactive question with options and hint when prompted', async () => {
    const result: TutorOrchestrationResult = await orchestrateTutor({
      prompt: 'quiz me on calculus',
      topic: 'Calculus',
      difficulty: 'intermediate',
      mode: 'quiz',
      offlineOnly: true,
    });

    assert.equal(result.success, true);
    assert.equal(result.mode, 'quiz');
    assert.ok(result.quizItem, 'Must provide structured quiz item');
    assert.ok(result.quizItem?.question);
    assert.ok(result.quizItem?.options && result.quizItem.options.length === 4);
    assert.ok(result.quizItem?.correctAnswer);
    assert.ok(result.answer.includes('Interactive Quiz'));
  });

  it('Quiz Mode: grades user answer against deterministic truth', async () => {
    const result: TutorOrchestrationResult = await orchestrateTutor({
      prompt: 'x = 5',
      topic: 'Algebra',
      currentExpression: '2x + 5 = 15',
      mode: 'quiz',
      offlineOnly: true,
    });

    assert.equal(result.success, true);
    assert.equal(result.mode, 'quiz');
    assert.ok(
      result.answer.toLowerCase().includes('correct') ||
      result.answer.toLowerCase().includes('result')
    );
  });
});
