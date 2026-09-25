/**
 * Calcora AI - Tutor Orchestration & Learning Engine Unit Tests
 *
 * Verifies:
 * 1. orchestrateTutor() execution flow & deterministic authority enforcement
 * 2. Knowledge grounding integration
 * 3. Supabase credential validation & stop-condition security
 * 4. Multi-dimensional evaluation scoring and provenance preservation
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  orchestrateTutor,
  TutorOrchestrationOptions,
  TutorOrchestrationResult,
} from '../../services/tutorOrchestrator';
import {
  checkSupabaseCredentials,
  getServiceSupabaseClient,
  scoreTutorEvaluation,
  MathTutorExample,
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
    assert.equal(result.deterministicAuthority.isVerified, true);
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

describe('Tutor Learning Engine & Supabase Security Compliance', () => {
  it('checkSupabaseCredentials correctly identifies missing environment variables', () => {
    const status = checkSupabaseCredentials();
    // In test environment, SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not present
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      assert.equal(status.configured, false);
      assert.ok(status.missingVariables.length > 0);
    } else {
      assert.equal(status.configured, true);
    }
  });

  it('getServiceSupabaseClient throws Stop Condition error when secrets are missing', () => {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      assert.throws(
        () => getServiceSupabaseClient(),
        /Missing required environment variable/i,
        'Must strictly throw and never fabricate or use public credentials as service credentials'
      );
    }
  });

  it('scoreTutorEvaluation evaluates correct deterministic match with high score', () => {
    const example: MathTutorExample = {
      id: 'ex-001',
      example_key: 'arithmetic_mult_1',
      topic: 'Arithmetic',
      expected_result: '120',
      expected_expression: '15 * 8',
    };

    const mockTutorResult: TutorOrchestrationResult = {
      success: true,
      answer: 'The answer is 120. Step-by-step derivation: 15 * 8 = 120.',
      expression: '15 * 8',
      steps: ['Step 1: Multiply 15 by 8', 'Step 2: Obtain 120'],
      formula: null,
      mode: 'explain',
      deterministicAuthority: {
        isAvailable: true,
        isVerified: true,
        authoritativeResult: '120',
        derivationSteps: ['15 * 8 = 120'],
        confidence: 1.0,
        method: 'Deterministic AST/RPN Evaluator',
      },
      pedagogy: {
        topic: 'Arithmetic',
        learningObjective: 'concept',
        difficulty: 'intermediate',
        hintLevel: 2,
        socraticActive: false,
      },
      groundingSources: ['Multiplication'],
      isOfflineFallback: true,
      discrepancyDetected: false,
      executionTimeMs: 15,
    };

    const scoring = scoreTutorEvaluation(example, mockTutorResult);
    assert.equal(scoring.isCorrect, true);
    assert.ok(scoring.score >= 0.85, 'High score for correct verified derivation');
    assert.equal(scoring.failureReason, undefined);
  });

  it('scoreTutorEvaluation flags deterministic discrepancy when expected result mismatches', () => {
    const example: MathTutorExample = {
      id: 'ex-002',
      example_key: 'algebra_linear_1',
      topic: 'Algebra',
      expected_result: '5',
    };

    const mockTutorResultWithDiscrepancy: TutorOrchestrationResult = {
      success: true,
      answer: 'The answer is 99.',
      expression: '2x + 5 = 15',
      steps: ['Step 1'],
      formula: null,
      mode: 'explain',
      deterministicAuthority: {
        isAvailable: true,
        isVerified: true,
        authoritativeResult: '99', // Discrepancy against expected 5
        derivationSteps: [],
        confidence: 1.0,
        method: 'Deterministic AST/RPN Evaluator',
      },
      pedagogy: {
        topic: 'Algebra',
        learningObjective: 'practice',
        difficulty: 'intermediate',
        hintLevel: 2,
        socraticActive: false,
      },
      groundingSources: [],
      isOfflineFallback: true,
      discrepancyDetected: false,
      executionTimeMs: 10,
    };

    const scoring = scoreTutorEvaluation(example, mockTutorResultWithDiscrepancy);
    assert.equal(scoring.isCorrect, false);
    assert.ok(scoring.failureReason?.includes('Deterministic discrepancy'));
  });

  it('scoreTutorEvaluation normalizes algebraic variable results (e.g. x = 5 vs 5)', () => {
    const example: MathTutorExample = {
      id: 'ex-003',
      example_key: 'algebra_linear_equiv',
      topic: 'Algebra',
      expected_result: '5',
    };

    const mockTutorResult: TutorOrchestrationResult = {
      success: true,
      answer: 'Solution is x = 5.',
      expression: '2x + 5 = 15',
      steps: ['Step 1: subtract 5', 'Step 2: divide by 2'],
      formula: null,
      mode: 'explain',
      deterministicAuthority: {
        isAvailable: true,
        isVerified: true,
        authoritativeResult: 'x = 5', // variable-prefixed format from equation solver
        derivationSteps: [],
        confidence: 1.0,
        method: 'Algebraic Equation Solver',
      },
      pedagogy: {
        topic: 'Algebra',
        learningObjective: 'solve',
        difficulty: 'intermediate',
        hintLevel: 1,
        socraticActive: false,
      },
      groundingSources: ['Linear Equations'],
      isOfflineFallback: true,
      discrepancyDetected: false,
      executionTimeMs: 12,
    };

    const scoring = scoreTutorEvaluation(example, mockTutorResult);
    assert.equal(scoring.isCorrect, true);
    assert.ok(scoring.score >= 0.85);
  });
});
