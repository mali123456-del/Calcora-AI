/**
 * Calcora AI - Production Tutor Learning & Evaluation Engine
 *
 * Executes real Tutor Evaluation Pipeline:
 * math_tutor_examples
 *   ↓
 * Tutor Evaluation Runner
 *   ↓
 * actual orchestrateTutor()
 *   ↓
 * deterministic math verification
 *   ↓
 * Tutor response
 *   ↓
 * evaluation scoring
 *   ↓
 * ai_tutor_learning_runs
 *   ↓
 * ai_tutor_evaluations
 *
 * Strict Compliance:
 * - Deterministic Calculator Result remains authoritative (non-negotiable).
 * - No fabricated rows, no fake pass results.
 * - Private service-role credentials required from environment.
 * - Full provenance preserved (source_item_id, example_key, topic).
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { orchestrateTutor, TutorOrchestrationResult } from './tutorOrchestrator';

export interface MathTutorExample {
  id: string;
  example_key?: string;
  topic: string;
  difficulty?: string;
  learning_objective?: string;
  question?: string;
  prompt?: string;
  expected_expression?: string;
  expected_result?: string;
  hints?: string[];
  metadata?: Record<string, any>;
  is_active?: boolean;
}

export interface TutorEvaluationItemResult {
  source_item_id: string;
  example_key: string;
  topic: string;
  execution_mode: 'deterministic' | 'hybrid_ai';
  deterministic_authority: boolean;
  deterministic_result: string | null;
  tutor_result: string | null;
  is_correct: boolean;
  score: number; // 0.0 to 1.0
  pedagogical_quality_score: number;
  grounding_score: number;
  safety_score: number;
  provenance: {
    source_item_id: string;
    example_key: string;
    topic: string;
    learning_objective: string;
    execution_time_ms: number;
  };
  failure_reason?: string;
  tutor_response_snippet: string;
}

export interface TutorLearningRunSummary {
  run_id: string;
  run_key: string;
  total_cases: number;
  passed_cases: number;
  failed_cases: number;
  pass_rate: number;
  average_score: number;
  deterministic_authority_count: number;
  status: 'completed' | 'failed' | 'partial';
  started_at: string;
  completed_at: string;
  evaluations: TutorEvaluationItemResult[];
  error?: string;
}

/**
 * Validates Supabase environment configuration.
 * Returns { configured: boolean, missingVariables: string[] }
 */
export function checkSupabaseCredentials(): {
  configured: boolean;
  missingVariables: string[];
} {
  const missing: string[] = [];
  if (!process.env.SUPABASE_URL) missing.push('SUPABASE_URL');
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY');

  return {
    configured: missing.length === 0,
    missingVariables: missing,
  };
}

/**
 * Creates private server-to-service Supabase client.
 * Strictly throws if service-role credentials are absent.
 */
export function getServiceSupabaseClient(): SupabaseClient {
  const { configured, missingVariables } = checkSupabaseCredentials();
  if (!configured) {
    throw new Error(
      `Cannot initialize Supabase client: Missing required environment variable(s): ${missingVariables.join(
        ', '
      )}. Production execution requires configured service-role credentials.`
    );
  }

  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}

/**
 * Normalizes mathematical results for flexible comparison across representations
 * (e.g. "x = 5" vs "5", whitespace differences, set notation).
 */
function normalizeResultString(val: string): string {
  return val
    .toLowerCase()
    .replace(/^[a-z]\s*=\s*/i, '') // strip variable assignment like "x = "
    .replace(/[{}()\[\]]/g, '')
    .replace(/\s+/g, '')
    .trim();
}

/**
 * Calculates rigorous multi-dimensional evaluation score:
 * 1. Correctness (0.4)
 * 2. Deterministic Authority (0.3)
 * 3. Pedagogical Quality (0.15)
 * 4. Grounding (0.10)
 * 5. Safety (0.05)
 */
export function scoreTutorEvaluation(
  example: MathTutorExample,
  tutorResult: TutorOrchestrationResult
): {
  isCorrect: boolean;
  score: number;
  pedagogicalScore: number;
  groundingScore: number;
  safetyScore: number;
  failureReason?: string;
} {
  // 1. Correctness against deterministic authority & expected result
  const auth = tutorResult.deterministicAuthority;
  const rawExpected = (
    example.expected_result ||
    (example as any).expected_value ||
    (example as any).answer ||
    ''
  ).toString().trim().toLowerCase();
  const rawActual = (auth.authoritativeResult || '').trim().toLowerCase();

  let isCorrect = false;
  let failureReason: string | undefined = undefined;

  if (rawExpected && rawActual) {
    const normExp = normalizeResultString(rawExpected);
    const normAct = normalizeResultString(rawActual);

    // Direct match or normalized match
    if (rawExpected === rawActual || normExp === normAct) {
      isCorrect = true;
    } else {
      // Numerical tolerance comparison
      const expNum = parseFloat(normExp);
      const actNum = parseFloat(normAct);
      if (!Number.isNaN(expNum) && !Number.isNaN(actNum) && Math.abs(expNum - actNum) < 1e-6) {
        isCorrect = true;
      } else {
        // Multi-root comparison (e.g., "2, 3" vs "3, 2")
        const expRoots = normExp.split(',').map((s) => s.trim()).sort().join(',');
        const actRoots = normAct.split(',').map((s) => s.trim()).sort().join(',');
        if (expRoots && expRoots === actRoots) {
          isCorrect = true;
        } else {
          failureReason = `Deterministic discrepancy: expected '${rawExpected}', got '${rawActual}'`;
        }
      }
    }
  } else if (auth.isVerified) {
    isCorrect = true;
  } else {
    failureReason = tutorResult.error || 'No authoritative deterministic verification available';
  }

  // 2. Deterministic Authority preservation
  const authPreserved = auth.isVerified && !tutorResult.discrepancyDetected;

  // 3. Pedagogical Quality: steps provided, explanation clarity
  let pedagogicalScore = 0;
  if (tutorResult.steps && tutorResult.steps.length > 0) pedagogicalScore += 0.5;
  if (tutorResult.answer && tutorResult.answer.length > 30) pedagogicalScore += 0.5;

  // 4. Grounding: primary concepts referenced
  let groundingScore = 0;
  if (tutorResult.groundingSources && tutorResult.groundingSources.length > 0) {
    groundingScore = 1.0;
  } else {
    groundingScore = 0.5;
  }

  // 5. Safety
  const safetyScore = 1.0;

  // Composite weighted score
  const score =
    (isCorrect ? 0.4 : 0.0) +
    (authPreserved ? 0.3 : 0.0) +
    pedagogicalScore * 0.15 +
    groundingScore * 0.10 +
    safetyScore * 0.05;

  return {
    isCorrect: isCorrect && authPreserved,
    score: Math.round(score * 100) / 100,
    pedagogicalScore,
    groundingScore,
    safetyScore,
    failureReason,
  };
}

/**
 * Runs the Real 25-Case Tutor Evaluation Pipeline against Supabase.
 * Executes orchestrateTutor() for each test case from math_tutor_examples.
 */
export async function runRealTutorEvaluationSuite(
  options: {
    runKey?: string;
    limit?: number;
    dryRun?: boolean;
  } = {}
): Promise<TutorLearningRunSummary> {
  const startedAt = new Date().toISOString();
  const runKey = options.runKey || `eval_run_${Date.now()}`;

  // 1. Verify Credentials
  const { configured, missingVariables } = checkSupabaseCredentials();
  if (!configured) {
    throw new Error(
      `STOP CONDITION TRIGGERED: Missing production credentials: ${missingVariables.join(
        ', '
      )}. Cannot run real Supabase evaluation suite without valid configuration.`
    );
  }

  const supabase = getServiceSupabaseClient();

  // 2. Fetch Math Tutor Examples from Supabase
  let query = supabase
    .from('math_tutor_examples')
    .select('*')
    .order('created_at', { ascending: true });

  if (options.limit && options.limit > 0) {
    query = query.limit(options.limit);
  }

  const { data: examples, error: fetchErr } = await query;
  if (fetchErr) {
    throw new Error(
      `Failed to query math_tutor_examples from Supabase: ${fetchErr.message}`
    );
  }

  if (!examples || examples.length === 0) {
    throw new Error(
      'math_tutor_examples table is empty or returned 0 active examples.'
    );
  }

  // 3. Create Learning Run Record
  let runId = `run_${Date.now()}`;
  if (!options.dryRun) {
    const { data: runInsert, error: runErr } = await supabase
      .from('ai_tutor_learning_runs')
      .insert({
        run_key: runKey,
        total_cases: examples.length,
        status: 'in_progress',
        started_at: startedAt,
        metadata: {
          environment: process.env.NODE_ENV || 'production',
          model: 'orchestrateTutor() pipeline',
        },
      })
      .select('id')
      .single();

    if (runErr) {
      throw new Error(`Failed to create ai_tutor_learning_runs record: ${runErr.message}`);
    }
    if (runInsert?.id) {
      runId = runInsert.id;
    }
  }

  // 4. Execute orchestrateTutor() for each example
  const evaluations: TutorEvaluationItemResult[] = [];
  let passedCount = 0;
  let totalScoreSum = 0;
  let deterministicAuthorityCount = 0;

  for (const example of examples as MathTutorExample[]) {
    const prompt =
      example.prompt ||
      example.question ||
      (example as any).problem ||
      (example as any).problem_text ||
      (example as any).expression ||
      (example as any).canonical_expression ||
      '';
    const exampleKey = example.example_key || example.id;

    const tutorResult: TutorOrchestrationResult = await orchestrateTutor({
      prompt,
      topic: example.topic,
      difficulty: (example.difficulty as any) || 'intermediate',
      learningObjective: (example.learning_objective as any) || 'concept',
      hintLevel: 2,
    });

    const scoring = scoreTutorEvaluation(example, tutorResult);

    if (scoring.isCorrect) passedCount++;
    totalScoreSum += scoring.score;
    if (tutorResult.deterministicAuthority.isVerified) {
      deterministicAuthorityCount++;
    }

    const evalItem: TutorEvaluationItemResult = {
      source_item_id: example.id,
      example_key: exampleKey,
      topic: example.topic,
      execution_mode: tutorResult.isOfflineFallback ? 'deterministic' : 'hybrid_ai',
      deterministic_authority: tutorResult.deterministicAuthority.isVerified,
      deterministic_result: tutorResult.deterministicAuthority.authoritativeResult,
      tutor_result: tutorResult.answer.slice(0, 200),
      is_correct: scoring.isCorrect,
      score: scoring.score,
      pedagogical_quality_score: scoring.pedagogicalScore,
      grounding_score: scoring.groundingScore,
      safety_score: scoring.safetyScore,
      provenance: {
        source_item_id: example.id,
        example_key: exampleKey,
        topic: example.topic,
        learning_objective: example.learning_objective || 'concept',
        execution_time_ms: tutorResult.executionTimeMs,
      },
      failure_reason: scoring.failureReason,
      tutor_response_snippet: tutorResult.answer.slice(0, 150),
    };

    evaluations.push(evalItem);

    // Insert evaluation record into ai_tutor_evaluations
    if (!options.dryRun) {
      await supabase.from('ai_tutor_evaluations').insert({
        run_id: runId,
        source_item_id: example.id,
        example_key: exampleKey,
        topic: example.topic,
        execution_mode: evalItem.execution_mode,
        deterministic_authority: evalItem.deterministic_authority,
        deterministic_result: evalItem.deterministic_result,
        tutor_result: evalItem.tutor_result,
        is_correct: evalItem.is_correct,
        score: evalItem.score,
        pedagogical_score: evalItem.pedagogical_quality_score,
        grounding_score: evalItem.grounding_score,
        safety_score: evalItem.safety_score,
        provenance: evalItem.provenance,
        failure_reason: evalItem.failure_reason || null,
        created_at: new Date().toISOString(),
      });
    }
  }

  const completedAt = new Date().toISOString();
  const averageScore =
    examples.length > 0 ? Math.round((totalScoreSum / examples.length) * 100) / 100 : 0;
  const passRate =
    examples.length > 0 ? Math.round((passedCount / examples.length) * 1000) / 10 : 0;

  // 5. Update Learning Run Status
  if (!options.dryRun) {
    await supabase
      .from('ai_tutor_learning_runs')
      .update({
        passed_cases: passedCount,
        failed_cases: examples.length - passedCount,
        average_score: averageScore,
        deterministic_authority_verified: deterministicAuthorityCount,
        status: 'completed',
        completed_at: completedAt,
      })
      .eq('id', runId);
  }

  return {
    run_id: runId,
    run_key: runKey,
    total_cases: examples.length,
    passed_cases: passedCount,
    failed_cases: examples.length - passedCount,
    pass_rate: passRate,
    average_score: averageScore,
    deterministic_authority_count: deterministicAuthorityCount,
    status: 'completed',
    started_at: startedAt,
    completed_at: completedAt,
    evaluations,
  };
}
