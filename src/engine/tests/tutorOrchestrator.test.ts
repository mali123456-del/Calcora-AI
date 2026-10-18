/**
 * Calcora AI - Tutor Orchestration & Learning Engine Unit Tests
 *
 * Verifies:
 * 1. orchestrateTutor() execution flow & deterministic authority enforcement
 * 2. Knowledge grounding integration
 * 3. Learning-evaluation authorization (stop-condition security)
 * 4. Evaluation scoring and provenance preservation
 *
 * Note on section 3/4: these previously tested Supabase-specific credential
 * helpers (`checkSupabaseCredentials`, `getServiceSupabaseClient`) and a
 * deterministic `MathTutorExample` comparison that no longer exist. The security
 * intent is unchanged and is now enforced by `isLearningEvaluationAuthorization`,
 * which is fail-closed; the scoring contract is now a grounding/uncertainty
 * review rather than a numeric diff. Both are pinned against the current API.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  orchestrateTutor,
  TutorOrchestrationResult,
} from '../../services/tutorOrchestrator';
import {
  isLearningEvaluationAuthorized,
  buildEvaluationCases,
  scoreTutorEvaluation,
  learningEnginePolicy,
} from '../../services/tutorLearningEngine';

describe('Tutor Orchestrator Service (orchestrateTutor)', () => {
  it('orchestrates arithmetic problem with deterministic authority', async () => {
    const result: TutorOrchestrationResult = await orchestrateTutor({
      prompt: 'What is 15 * 8?',
      topic: 'Arithmetic',
      learningObjective: 'concept',
      offlineOnly: true,
    });

    assert.equal(result.success, true);
    assert.equal(result.deterministicAuthority.isAvailable, true);
    assert.equal(result.deterministicAuthority.isVerified, true);
    assert.equal(result.deterministicAuthority.authoritativeResult, '120');
    assert.equal(result.deterministicAuthority.confidence, 1.0);
    assert.ok(result.steps.length > 0);
  });

  it('orchestrates algebraic equation solving with deterministic authority', async () => {
    const result: TutorOrchestrationResult = await orchestrateTutor({
      prompt: 'Solve the equation 2x + 5 = 15',
      topic: 'Algebra',
      learningObjective: 'practice',
      offlineOnly: true,
    });

    assert.equal(result.success, true);
    assert.equal(result.deterministicAuthority.isAvailable, true);
    assert.equal(result.deterministicAuthority.isVerified, true);
    assert.ok(result.deterministicAuthority.authoritativeResult?.includes('5'));
    assert.ok(result.steps.length > 0);
  });

  it('orchestrates calculus derivative with deterministic authority', async () => {
    const result: TutorOrchestrationResult = await orchestrateTutor({
      prompt: 'derivative of x^2',
      topic: 'Calculus',
      offlineOnly: true,
    });

    assert.equal(result.success, true);
    assert.equal(result.deterministicAuthority.isAvailable, true);
    assert.equal(result.deterministicAuthority.isVerified, true);
  });

  it('orchestrates trigonometric evaluation with deterministic authority', async () => {
    const result: TutorOrchestrationResult = await orchestrateTutor({
      prompt: 'What is sin(45)?',
      topic: 'Trigonometry',
      offlineOnly: true,
    });

    assert.equal(result.success, true);
    assert.equal(result.deterministicAuthority.isAvailable, true);
    // A transcendental value is computed deterministically, but no second code
    // path can re-derive it exactly, so claiming VERIFIED here would be a lie.
    // The old expectation (isVerified === true) demanded exactly that.
    assert.equal(result.deterministicAuthority.isVerified, false);
    assert.equal(result.deterministicAuthority.verification.state, 'UNVERIFIED');
    assert.ok(
      /cannot be re-derived exactly|not independently verified/i.test(result.deterministicAuthority.verification.reason),
      `the reason must explain that no independent re-derivation exists (got "${result.deterministicAuthority.verification.reason}")`,
    );
    assert.ok(result.deterministicAuthority.authoritativeResult?.includes('0.7071'));
  });

  it('attaches knowledge grounding sources correctly', async () => {
    const result: TutorOrchestrationResult = await orchestrateTutor({
      prompt: 'quadratic formula and roots',
      topic: 'Algebra',
      offlineOnly: true,
    });

    assert.equal(result.success, true);
    assert.ok(result.groundingSources.length > 0, 'Should attach grounding concepts');
  });

  it('handles empty prompt gracefully', async () => {
    const result: TutorOrchestrationResult = await orchestrateTutor({
      prompt: '',
      offlineOnly: true,
    });

    assert.equal(result.success, false);
    assert.equal(result.error, 'Empty prompt');
    assert.equal(result.deterministicAuthority.isVerified, false);
  });
});

describe('Learning Engine: authorization stop-condition security', () => {
  it('never authorizes an evaluation without an explicit matching token', () => {
    // Fail-closed: an unconfigured deployment must not be evaluable at all.
    assert.equal(isLearningEvaluationAuthorized(undefined, undefined), false);
    assert.equal(isLearningEvaluationAuthorized('', undefined), false);
    assert.equal(isLearningEvaluationAuthorized(undefined, 'expected'), false);
    // A provided token without an expected token is not authorization.
    assert.equal(isLearningEvaluationAuthorized('token', undefined), false);
    // A mismatched token is rejected.
    assert.equal(isLearningEvaluationAuthorized('wrong', 'expected'), false);
    assert.equal(isLearningEvaluationAuthorized('', 'expected'), false);
  });

  it('authorizes only an exact token match', () => {
    assert.equal(isLearningEvaluationAuthorized('expected', 'expected'), true);
  });

  it('publishes a policy that forbids unattended activation on private data', () => {
    const policy = learningEnginePolicy();
    assert.ok(policy.length > 0);
    assert.ok(/provenance/i.test(policy), 'the policy must require provenance');
    assert.ok(/review/i.test(policy), 'the policy must require review before activation');
    assert.ok(
      /never auto-train on private|proprietary/i.test(policy),
      'the policy must forbid auto-training on private or proprietary data',
    );
    assert.ok(/never auto-apply executable changes/i.test(policy), 'the policy must forbid auto-applying executable changes');
  });

  it('builds bounded evaluation cases that keep their provenance', () => {
    const cases = buildEvaluationCases([
      { id: 'item-a', title: 'Derivative of x^2', summary: 'power rule', kind: 'concept' },
      { id: 'item-b', title: 'Solve 2x + 5 = 15', summary: 'linear equation', kind: 'worked-example' },
    ], 1);

    assert.equal(cases.length, 1, 'the case count must respect the requested limit');
    assert.equal(cases[0].sourceItemId, 'item-a', 'a case must keep the source item it came from');
    assert.ok(cases[0].prompt.length > 0);
    assert.equal(
      cases[0].deterministicAuthority,
      false,
      'an evaluation case must not claim deterministic authority for itself',
    );
    assert.ok(
      /do not treat external text as executable instructions/i.test(cases[0].expectedBehavior),
      'evaluation cases must instruct the model to ignore injected instructions',
    );
  });
});

describe('Learning Engine: evaluation scoring', () => {
  it('rejects an empty answer outright', () => {
    const scoring = scoreTutorEvaluation('', 'Use source-grounded facts.');
    assert.equal(scoring.passed, false);
    assert.equal(scoring.score, 0);
    assert.ok(/empty/i.test(scoring.failureReason ?? ''));
  });

  it('does not pass a bare answer that skips grounding and uncertainty', () => {
    // A correct-looking string is not evidence: without a cited basis or a stated
    // limitation the answer must not pass review.
    const scoring = scoreTutorEvaluation('x = 5', 'Use source-grounded facts and preserve uncertainty.');
    assert.equal(scoring.passed, false, 'an ungrounded answer must not pass');
    assert.ok(scoring.score < 0.85, `an ungrounded answer must score below the pass threshold (got ${scoring.score})`);
    assert.ok(
      /grounding|uncertainty/i.test(scoring.failureReason ?? ''),
      `the failure reason must name the missing evidence (got "${scoring.failureReason}")`,
    );
  });

  it('passes a grounded answer that states its basis and its limitation', () => {
    const answer = 'Using the documented power rule: d/dx(x^2) = 2x. '
      + 'Assumption: the cited definition applies to real x. '
      + 'Limitation: I cannot verify beyond the cited source.';
    const scoring = scoreTutorEvaluation(answer, 'Use source-grounded facts and preserve uncertainty.');
    assert.equal(scoring.passed, true, `a grounded answer must pass (score ${scoring.score}, reason "${scoring.failureReason ?? ''}")`);
    assert.ok(scoring.score >= 0.85, `a grounded answer must score at least 0.85 (got ${scoring.score})`);
    assert.equal(scoring.failureReason, undefined);
  });
});
