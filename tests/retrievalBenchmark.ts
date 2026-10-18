/**
 * Phase 12 micro-benchmark: knowledge retrieval hot path.
 *
 * Every Tutor and Math Agent request runs the retrieval scorer. The scorer
 * lower-cases each item's concept, definition, topic, subtopic and every
 * keyword/alias on *every* query, which allocates hundreds of strings per
 * request for a corpus that never changes at runtime. This measures that cost
 * before and after precomputing the lowercase view once.
 *
 * Usage: npx tsx tests/retrievalBenchmark.ts
 */
import { ALL_MATHEMATICS_KNOWLEDGE } from '../src/knowledge/mathematicsKnowledgeIndex';
import { searchKnowledgeBaseRanked } from '../src/knowledge/mathematicsKnowledgeIndex';

const queries = [
  'derivative of x squared',
  'pythagorean theorem',
  'quadratic formula',
  'mean and standard deviation of a dataset',
  'matrix determinant',
  'probability of independent events',
  'area of a circle',
  'sine of 90 degrees',
];

function measure(label: string, iterations: number): number {
  // Warm up so JIT compilation is not counted as retrieval cost.
  for (let i = 0; i < Math.min(iterations, 200); i += 1) {
    searchKnowledgeBaseRanked(queries[i % queries.length], 4);
  }
  const started = process.hrtime.bigint();
  for (let i = 0; i < iterations; i += 1) {
    searchKnowledgeBaseRanked(queries[i % queries.length], 4);
  }
  const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;
  console.log(`${label}: ${elapsedMs.toFixed(1)} ms for ${iterations} queries (${(elapsedMs / iterations * 1000).toFixed(1)} µs/query)`);
  return elapsedMs;
}

console.log(`corpus size: ${ALL_MATHEMATICS_KNOWLEDGE.length} items`);
const iterations = Number(process.argv[2] ?? 2000);
const first = measure('run 1', iterations);
const second = measure('run 2', iterations);
const best = Math.min(first, second);
console.log(`best: ${best.toFixed(1)} ms (${(best / iterations * 1000).toFixed(1)} µs/query)`);
