import { MathKnowledgeItem, MATHEMATICS_KNOWLEDGE_VERSION } from './knowledgeTypes';
import { rankMultilingualConceptMatch, resolveMultilingualConceptIds } from './multilingualMathConcepts';
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

export const ALL_MATHEMATICS_KNOWLEDGE: MathKnowledgeItem[] = [
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
  if (!query || !query.trim()) return [];
  const normalized = query.toLocaleLowerCase().trim();
  const tokens = normalized.split(/\s+/).filter((t) => t.length > 1);
  const multilingualConceptIds = resolveMultilingualConceptIds(normalized);

  const scored = ALL_MATHEMATICS_KNOWLEDGE.map((item) => {
    let score = rankMultilingualConceptMatch(item, normalized);
    const conceptLower = item.concept.toLowerCase();
    const defLower = item.definition.toLowerCase();
    const topicLower = item.topic.toLowerCase();
    const subtopicLower = item.subtopic.toLowerCase();

    // Canonical multilingual concept matches receive the strongest signal.
    if (multilingualConceptIds.includes(item.id)) score += 100;

    // Exact matches
    if (conceptLower.includes(normalized)) score += 100;
    if (item.aliases.some((a) => a.toLowerCase().includes(normalized))) score += 80;
    if (item.keywords.some((k) => k.toLowerCase().includes(normalized))) score += 60;
    if (topicLower.includes(normalized) || subtopicLower.includes(normalized)) score += 50;

    // Token matches
    for (const token of tokens) {
      if (conceptLower.includes(token)) score += 20;
      if (item.keywords.some((k) => k.toLowerCase().includes(token))) score += 15;
      if (item.aliases.some((a) => a.toLowerCase().includes(token))) score += 15;
      if (defLower.includes(token)) score += 5;
    }

    return { item, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.item);
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
