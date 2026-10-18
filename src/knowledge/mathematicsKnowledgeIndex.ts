import { MathKnowledgeItem, MATHEMATICS_KNOWLEDGE_VERSION } from './knowledgeTypes';
import { auditKnowledgeCorpus } from './knowledgeVerification';
import { rankMultilingualConceptMatch } from './multilingualMathConcepts';
import { arithmeticKnowledge } from './mathematics/arithmetic';
import { algebraKnowledge } from './mathematics/algebra';
import { geometryKnowledge } from './mathematics/geometry';
import { trigonometryKnowledge } from './mathematics/trigonometry';
import { calculusKnowledge } from './mathematics/calculus';
import { linearAlgebraKnowledge } from './mathematics/linearAlgebra';
import { statisticsProbabilityKnowledge } from './mathematics/statisticsProbability';
import { advancedMathematicsKnowledge } from './mathematics/advancedTopics';
import { physicsEngineeringKnowledge } from './mathematics/physicsEngineeringMath';
import { precalculusDiscreteKnowledge } from './mathematics/precalculusDiscrete';

export { MATHEMATICS_KNOWLEDGE_VERSION };

/**
 * The authored corpus, before auditing.
 *
 * Kept unexported-by-accident in spirit: callers should use `ALL_MATHEMATICS_KNOWLEDGE`,
 * which carries the computed `verificationStatus`. Retaining the raw list makes the
 * audit reproducible and diffable rather than a one-time manual edit.
 */
const AUTHORED_MATHEMATICS_KNOWLEDGE: MathKnowledgeItem[] = [
  ...arithmeticKnowledge,
  ...algebraKnowledge,
  ...geometryKnowledge,
  ...trigonometryKnowledge,
  ...calculusKnowledge,
  ...linearAlgebraKnowledge,
  ...statisticsProbabilityKnowledge,
  ...advancedMathematicsKnowledge,
  ...physicsEngineeringKnowledge,
  ...precalculusDiscreteKnowledge,
];

/**
 * The corpus with an evidence-based `verificationStatus` on every item.
 *
 * The status is computed by re-deriving each item's worked examples with the
 * deterministic engine, so it reflects a real audit rather than an assertion.
 */
export const ALL_MATHEMATICS_KNOWLEDGE: MathKnowledgeItem[] = auditKnowledgeCorpus(
  AUTHORED_MATHEMATICS_KNOWLEDGE,
);

// Pre-indexed Maps for constant-time lookup
export const KNOWLEDGE_BY_ID = new Map<string, MathKnowledgeItem>(
  ALL_MATHEMATICS_KNOWLEDGE.map((item) => [item.id, item])
);

export const KNOWLEDGE_BY_TOPIC = new Map<string, MathKnowledgeItem[]>();
for (const item of ALL_MATHEMATICS_KNOWLEDGE) {
  const normTopic = item.topic.toLowerCase();
  const existing = KNOWLEDGE_BY_TOPIC.get(normTopic) || [];
  existing.push(item);
  KNOWLEDGE_BY_TOPIC.set(normTopic, existing);
}

/**
 * Searches the mathematical knowledge base for items matching query tokens
 */
export function searchKnowledgeBase(query: string, limit = 5): MathKnowledgeItem[] {
  return searchKnowledgeBaseRanked(query, limit).map(entry => entry.item);
}

/**
 * English function words that carry no topical meaning in a math query.
 *
 * Token scoring is additive, and "of"/"and" appear in nearly every definition
 * in the corpus, so keeping them meant a query the corpus cannot answer
 * ("limits and continuity") still accrued +40 from one statistics definition
 * and was presented as the retrieved concept. These are dropped from the
 * token stream only; exact-match scoring still sees the full query.
 */
const QUERY_STOPWORDS: ReadonlySet<string> = new Set([
  'of', 'and', 'or', 'the', 'a', 'an', 'in', 'on', 'to', 'for', 'is', 'are',
  'was', 'were', 'be', 'by', 'as', 'at', 'it', 'its', 'this', 'that', 'with',
  'from', 'into',
]);

/**
 * Lowercase projection of the corpus, built once.
 *
 * Scoring is a hot path: every Tutor and Math Agent request runs it, and the
 * original implementation lower-cased each item's concept, definition, topic,
 * subtopic and every keyword and alias on every query. The corpus is authored
 * data that never changes at runtime, so those strings are computed once here.
 * Measured with `tests/retrievalBenchmark.ts`.
 */
interface LowercasedKnowledgeItem {
  item: MathKnowledgeItem;
  concept: string;
  definition: string;
  topic: string;
  subtopic: string;
  keywords: readonly string[];
  aliases: readonly string[];
}

const LOWERCASED_CORPUS: readonly LowercasedKnowledgeItem[] = ALL_MATHEMATICS_KNOWLEDGE.map((item) => ({
  item,
  concept: item.concept.toLowerCase(),
  definition: item.definition.toLowerCase(),
  topic: item.topic.toLowerCase(),
  subtopic: item.subtopic.toLowerCase(),
  keywords: item.keywords.map((keyword) => keyword.toLowerCase()),
  aliases: item.aliases.map((alias) => alias.toLowerCase()),
}));

/**
 * The same ranking as `searchKnowledgeBase`, but carrying the scores.
 *
 * Callers that decide whether a match is *good enough* to ground an answer
 * (rather than merely the least-bad candidate) need the score: a query with no
 * relevant corpus item still produces a positive-scoring top hit through
 * incidental definition text, and treating that as "the retrieved concept"
 * would ground an answer in the wrong topic.
 */
export function searchKnowledgeBaseRanked(
  query: string,
  limit = 5,
): Array<{ item: MathKnowledgeItem; score: number }> {
  if (!query || !query.trim()) return [];
  const normalized = query.toLocaleLowerCase().trim();
  const tokens = normalized
    .split(/\s+/)
    .filter((t) => t.length > 1 && !QUERY_STOPWORDS.has(t));

  const scored = LOWERCASED_CORPUS.map((entry) => {
    const item = entry.item;
    let score = rankMultilingualConceptMatch(item, normalized);

    // Exact matches
    if (entry.concept.includes(normalized)) score += 100;
    if (entry.aliases.some((alias) => alias.includes(normalized))) score += 80;
    if (entry.keywords.some((keyword) => keyword.includes(normalized))) score += 60;
    if (entry.topic.includes(normalized) || entry.subtopic.includes(normalized)) score += 50;

    // Token matches
    for (const token of tokens) {
      if (entry.concept.includes(token)) score += 20;
      if (entry.keywords.some((keyword) => keyword.includes(token))) score += 15;
      if (entry.aliases.some((alias) => alias.includes(token))) score += 15;
      if (entry.definition.includes(token)) score += 5;
    }

    return { item, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Retrieves a concept by exact ID or alias
 */
export function getKnowledgeItemById(id: string): MathKnowledgeItem | undefined {
  return KNOWLEDGE_BY_ID.get(id);
}

/**
 * Retrieves all concepts in a specific mathematical topic
 */
export function getKnowledgeItemsByTopic(topic: string): MathKnowledgeItem[] {
  return KNOWLEDGE_BY_TOPIC.get(topic.toLowerCase()) || [];
}

export const searchKnowledgeIndex = searchKnowledgeBase;
