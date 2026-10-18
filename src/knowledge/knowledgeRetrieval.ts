import {
  MathKnowledgeItem,
  KnowledgeRetrievalQuery,
  KnowledgeRetrievalResult,
  MathCommonMistake,
} from './knowledgeTypes';
import {
  ALL_MATHEMATICS_KNOWLEDGE,
  KNOWLEDGE_BY_ID,
  searchKnowledgeBaseRanked,
} from './mathematicsKnowledgeIndex';
import { resolveMultilingualConceptIds } from './multilingualMathConcepts';

/**
 * Minimum search score for an item to be cited as grounding when the caller
 * did not vouch for its topic.
 *
 * Scores are additive: a concept-name hit is +20, keyword/alias hits +15,
 * definition-text hits +5, and multilingual alias hits +10000. Every query
 * therefore returns *some* positive-scoring item - "who won the 1998 football
 * world cup" matches incidental definition text. Treating the top hit as the
 * primary concept regardless of score would put a MATHEMATICAL KNOWLEDGE
 * GROUNDING block full of unrelated definitions in front of the learner.
 * Honest absence of grounding beats a wrong citation; a caller-stated topic
 * bypasses the floor because it vouches for the topic itself.
 */
const MIN_GROUNDING_SCORE = 20;

/**
 * Retrieves the most relevant mathematical concepts and packages them into a grounding result
 */
export function retrieveMathematicsKnowledge(
  query: KnowledgeRetrievalQuery
): KnowledgeRetrievalResult {
  const queryText = `${query.query} ${query.calculatorExpression || ''}`.trim();
  const ranked = searchKnowledgeBaseRanked(queryText, query.limit || 4);

  // Multilingual concept matches should override topic bias when available
  const multilingualMatches = resolveMultilingualConceptIds(queryText);

  let ordered = ranked;
  if (multilingualMatches.length > 0) {
    // Reorder to put multilingual matches first
    ordered = [
      ...ranked.filter((entry) => multilingualMatches.includes(entry.item.id)),
      ...ranked.filter((entry) => !multilingualMatches.includes(entry.item.id)),
    ];
  } else if (query.topic) {
    // When the caller states a topic, that topic is authoritative for the primary slot.
    // Token scoring alone is unreliable for non-Latin scripts: a bare Urdu "algebra" query
    // scored Linear Algebra vector items highest through incidental definition text, so the
    // Tutor explained algebra using a dot-product definition. Rank the requested topic
    // first and backfill from it when the text search surfaced too few of its concepts.
    const requestedTopic = query.topic.toLowerCase();
    const isRequestedTopic = (item: MathKnowledgeItem) =>
      item.topic.toLowerCase() === requestedTopic;

    const matched = ranked.filter((entry) => isRequestedTopic(entry.item)).map((entry) => entry.item);
    const remainder = ranked.filter((entry) => !isRequestedTopic(entry.item));

    if (matched.length < 2) {
      for (const item of ALL_MATHEMATICS_KNOWLEDGE) {
        if (matched.length >= 2) break;
        if (isRequestedTopic(item) && !matched.some((m) => m.id === item.id)) {
          matched.push(item);
        }
      }
    }

    ordered = [
      ...matched.map((item) => ({ item, score: MIN_GROUNDING_SCORE })),
      ...remainder,
    ];
  }

  // Keep only entries that are either topic-vouched or score past the floor:
  // anything weaker is not honest enough to cite as a source.
  const isGroundable = (entry: { item: MathKnowledgeItem; score: number }) =>
    entry.score >= MIN_GROUNDING_SCORE ||
    (!!query.topic && entry.item.topic.toLowerCase() === query.topic.toLowerCase());
  const grounded = ordered.filter(isGroundable);

  const primaryConcept = grounded[0]?.item;
  const relatedConcepts = grounded.slice(1).map((entry) => entry.item);
  const searchResults = grounded.map((entry) => entry.item);

  // Extract all formulas
  const allFormulas: string[] = [];
  const allDomainRestrictions: string[] = [];
  const allCommonMistakes: MathCommonMistake[] = [];
  const suggestedPrerequisites: string[] = [];
  const suggestedNextTopics: string[] = [];

  for (const item of searchResults) {
    allFormulas.push(...item.formulas);
    allDomainRestrictions.push(...item.domainRestrictions);
    allCommonMistakes.push(...item.commonMistakes);
    suggestedPrerequisites.push(...item.prerequisiteTopics);
    suggestedNextTopics.push(...item.relatedTopics);
  }

  // Build compact Grounding Context Text for the AI prompt or deterministic engine
  let groundingContextText = '';
  if (primaryConcept) {
    groundingContextText = `[MATHEMATICAL KNOWLEDGE GROUNDING]\n` +
      `Language: ${query.language || 'auto'}\n` +
      `Primary Concept: ${primaryConcept.concept} (${primaryConcept.topic} / ${primaryConcept.subtopic})\n` +
      `Definition: ${primaryConcept.definition}\n` +
      `Notation: ${primaryConcept.notation}\n` +
      `Formulas: ${primaryConcept.formulas.join('; ')}\n` +
      (primaryConcept.theorems?.length ? `Theorems: ${primaryConcept.theorems.join('; ')}\n` : '') +
      (primaryConcept.identities?.length ? `Identities: ${primaryConcept.identities.join('; ')}\n` : '') +
      (primaryConcept.examples.length ? `Verified Examples: ${primaryConcept.examples.map(example => `${example.problem} -> ${example.solution}`).join(' | ')}\n` : '') +
      `Domain Restrictions & Conditions: ${primaryConcept.domainRestrictions.join('; ')}\n` +
      (primaryConcept.assumptions.length > 0 ? `Assumptions: ${primaryConcept.assumptions.join('; ')}\n` : '') +
      (primaryConcept.commonMistakes.length > 0
        ? `Common Mistake to Watch For: ${primaryConcept.commonMistakes[0].mistake} (Correction: ${primaryConcept.commonMistakes[0].correction})\n`
        : '');
  }

  return {
    primaryConcept,
    relatedConcepts,
    allRetrieved: searchResults,
    formulas: Array.from(new Set(allFormulas)),
    domainRestrictions: Array.from(new Set(allDomainRestrictions)),
    commonMistakes: allCommonMistakes,
    suggestedPrerequisites: Array.from(new Set(suggestedPrerequisites)),
    suggestedNextTopics: Array.from(new Set(suggestedNextTopics)),
    groundingContextText,
  };
}

/**
 * Returns prerequisites for a specific mathematical concept
 */
export function getPrerequisitesForConcept(conceptId: string): MathKnowledgeItem[] {
  const item = KNOWLEDGE_BY_ID.get(conceptId);
  if (!item) return [];

  const prereqItems: MathKnowledgeItem[] = [];
  for (const prereqTag of item.prerequisiteTopics) {
    const found = ALL_MATHEMATICS_KNOWLEDGE.find(
      (k) =>
        k.id === prereqTag ||
        k.subtopic.toLowerCase().replace(/\s+/g, '-') === prereqTag.toLowerCase() ||
        k.concept.toLowerCase().includes(prereqTag.toLowerCase())
    );
    if (found && !prereqItems.some((p) => p.id === found.id)) {
      prereqItems.push(found);
    }
  }
  return prereqItems;
}

/**
 * Returns related concepts for a specific mathematical concept
 */
export function getRelatedConceptsForConcept(conceptId: string): MathKnowledgeItem[] {
  const item = KNOWLEDGE_BY_ID.get(conceptId);
  if (!item) return [];

  const relatedItems: MathKnowledgeItem[] = [];
  for (const relTag of item.relatedTopics) {
    const found = ALL_MATHEMATICS_KNOWLEDGE.find(
      (k) =>
        k.id === relTag ||
        k.subtopic.toLowerCase().replace(/\s+/g, '-') === relTag.toLowerCase() ||
        k.concept.toLowerCase().includes(relTag.toLowerCase())
    );
    if (found && !relatedItems.some((r) => r.id === found.id)) {
      relatedItems.push(found);
    }
  }
  return relatedItems;
}

/**
 * Generates an adaptive personalized learning path based on topic and completed concepts
 */
export function getRecommendedLearningPath(
  currentTopic: string,
  completedConceptIds: string[] = []
): {
  prerequisitesToReview: MathKnowledgeItem[];
  currentConcept?: MathKnowledgeItem;
  nextConcepts: MathKnowledgeItem[];
} {
  const topicItems = ALL_MATHEMATICS_KNOWLEDGE.filter(
    (item) => item.topic.toLowerCase() === currentTopic.toLowerCase()
  );

  const uncompleted = topicItems.filter((item) => !completedConceptIds.includes(item.id));
  const currentConcept = uncompleted[0] || topicItems[0];

  const prerequisitesToReview = currentConcept
    ? getPrerequisitesForConcept(currentConcept.id)
    : [];
  const nextConcepts = currentConcept
    ? getRelatedConceptsForConcept(currentConcept.id)
    : [];

  return {
    prerequisitesToReview,
    currentConcept,
    nextConcepts,
  };
}
