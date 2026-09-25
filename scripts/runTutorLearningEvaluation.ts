import 'dotenv/config';
import { runTutorLearningEvaluation } from '../src/services/tutorLearningEngine';

const limit = Number(process.argv[2] || 25);
if (!Number.isFinite(limit) || limit < 1) {
  throw new Error('Evaluation limit must be a positive number');
}

const result = await runTutorLearningEvaluation(Math.min(Math.floor(limit), 50));
console.log(JSON.stringify(result, null, 2));
if (!result.success) process.exitCode = 1;
