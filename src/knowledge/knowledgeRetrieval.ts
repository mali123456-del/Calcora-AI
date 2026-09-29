import {
  MathKnowledgeItem,
  KnowledgeRetrievalQuery,
  KnowledgeRetrievalResult,
  MathCommonMistake,
} from './knowledgeTypes';
import {
  ALL_MATHEMATICS_KNOWLEDGE,
  KNOWLEDGE_BY_ID,
  searchKnowledgeBase,
} from './mathematicsKnowledgeIndex';

/**
 * Retrieves the most relevant mathematical concepts and packages them into a grounding result
 */
export function retrieveMathematicsKnowledge(
  query: KnowledgeRetrievalQuery
): KnowledgeRetrievalResult {
  const queryText = `${query.query} ${query.calculatorExpression || ''}`.trim();
  const searchResults = searchKnowledgeBase(queryText, query.limit || 4);

  // If topic was explicitly specified and not matched well, include concepts from that topic
  if (query.topic && searchResults.length < 2) {
    const topicItems = ALL_MATHEMATICS_KNOWLEDGE.filter(
      (item) => item.topic.toLowerCase() === query.topic?.toLowerCase()
    );
    for (const item of topicItems) {
      if (!searchResults.some((s) => s.id === item.id)) {
        searchResults.push(item);
      }
      if (searchResults.length >= 4) break;
    }
  }

  const primaryConcept = searchResults[0];
  const relatedConcepts = searchResults.slice(1);

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
