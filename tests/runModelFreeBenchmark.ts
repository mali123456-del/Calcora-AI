/**
 * Phase 27 — run the benchmark against the REAL orchestrator in model-free mode.
 *
 * This is the decisive measurement for model retirement: with `offlineOnly: true` no language
 * model may be consulted, so the score measures exactly what Calcora delivers without its GGUF
 * weights. Thresholds were fixed before this run; they are not adjusted to the result.
 *
 * A failing group is not a test bug to be relaxed. It is the list of capabilities that genuinely
 * need a model, which is the input Phase 28 requires.
 */

import {
  BENCHMARK_TASKS,
  ACCEPTANCE_THRESHOLDS,
  buildReport,
  gradeOutcome,
  type BenchmarkGroup,
} from '../src/evaluation/tutorBenchmark';
import { orchestrateTutor } from '../src/services/tutorOrchestrator';

const run = async () => {
  const outcomes = [];

  for (const task of BENCHMARK_TASKS) {
    let observation: Parameters<typeof gradeOutcome>[1];
    try {
      const result = await orchestrateTutor({
        prompt: task.prompt,
        offlineOnly: true, // model-free: the whole point of this measurement
        ...(task.conversation ? { conversation: task.conversation } : {}),
        ...(task.expect?.language ? { language: task.expect.language } : {}),
      });
      // Field paths verified against the real result shape. There is no top-level
      // `verification`; the authoritative verdict lives under `deterministicAuthority`,
      // and retrieved knowledge is `groundingSources`.
      observation = {
        answer: result.answer ?? '',
        authoritativeResult: result.deterministicAuthority?.authoritativeResult ?? null,
        verificationState: result.deterministicAuthority?.verification?.state ?? null,
        retrievedCount: result.groundingSources?.length ?? 0,
        language: null,
      };
    } catch (error) {
      observation = {
        answer: '',
        authoritativeResult: null,
        verificationState: null,
        retrievedCount: 0,
        language: null,
      };
      void error;
    }
    outcomes.push(gradeOutcome(task, observation));
  }

  const report = buildReport('model-free', outcomes);

  console.log(`\n=== MODEL-FREE BENCHMARK (offlineOnly, no GGUF consulted) ===`);
  console.log(`overall score: ${(report.overallScore * 100).toFixed(1)}%  (${outcomes.filter((o) => o.passed).length}/${outcomes.length} tasks)\n`);

  const width = Math.max(...report.perGroup.map((g) => g.group.length));
  for (const group of report.perGroup) {
    const status = group.passed ? 'PASS' : 'BELOW THRESHOLD';
    console.log(
      `  ${group.group.padEnd(width)}  ${(group.score * 100).toFixed(0).padStart(3)}%  ` +
      `threshold ${(group.threshold * 100).toFixed(0).padStart(3)}%  ${status}`,
    );
  }

  const failures = outcomes.filter((o) => !o.passed);
  if (failures.length > 0) {
    console.log('\n--- tasks below threshold (these are the real model dependencies) ---');
    for (const failure of failures) {
      console.log(`  ${failure.taskId.padEnd(22)} [${failure.group}] ${failure.detail}`);
    }
  }

  console.log('\n--- thresholds were fixed BEFORE this run and are not tuned to it ---');
  console.log(JSON.stringify(ACCEPTANCE_THRESHOLDS, null, 0));
  console.log(`\ngroups below threshold: ${report.blockingDependencies.length}`);

  // Emit a machine-readable artifact so the report can be compared across runs later.
  const fs = await import('node:fs');
  fs.writeFileSync(
    'benchmark-results-model-free.json',
    JSON.stringify({ generatedAt: new Date().toISOString(), report, outcomes }, null, 2),
    'utf8',
  );
  console.log('wrote benchmark-results-model-free.json');
};

run().catch((error) => {
  console.error('BENCHMARK_FAILED', error);
  process.exitCode = 1;
});