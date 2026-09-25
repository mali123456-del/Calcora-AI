import { mathematicsKnowledgeIndex, MATH_TUTOR_TRAINING_CORPUS } from './index';
import type { MathematicsKnowledgeItem } from './types';

export interface KnowledgeRetrievalQuery {
  text: string;
  topic?: string;
  subtopic?: string;
  limit?: number;
}

export interface KnowledgeRetrievalResult {
  item: MathematicsKnowledgeItem;
  score: number;
  matchedTerms: string[];
  matchedTrainingExamples?: string[];
}

const normalize = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[²³]/g, (char) => (char === '²' ? '2' : '3'))
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/[^a-z0-9*+\-/.%√π]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const tokenize = (value: string): string[] =>
  normalize(value)
    .split(/\s+/)
    .filter((term) => term.length > 1);

const topicAliases: Record<string, string[]> = {
  algebra: ['algebra', 'equation', 'equations', 'roots', 'polynomial'],
  arithmetic: ['arithmetic', 'calculate', 'calculation', 'numbers', 'percentage', 'percent'],
  geometry: ['geometry', 'triangle', 'circle', 'area', 'volume', 'distance'],
  trigonometry: ['trigonometry', 'trig', 'sine', 'cosine', 'tangent', 'sin', 'cos', 'tan'],
  calculus: ['calculus', 'derivative', 'differentiate', 'integral', 'integrate', 'limit'],
  statistics: ['statistics', 'stat', 'mean', 'median', 'variance', 'standard deviation', 'correlation'],
  probability: ['probability', 'chance', 'conditional', 'bayes', 'binomial'],
  'linear algebra': ['linear algebra', 'matrix', 'matrices', 'vector', 'determinant', 'eigenvalue'],
  'number theory': ['number theory', 'gcd', 'hcf', 'prime', 'modulo', 'congruence'],
  'discrete mathematics': ['discrete', 'induction', 'graph', 'combinatorics', 'logic'],
  'complex numbers': ['complex', 'imaginary', 'euler', 'polar'],
  physics: ['physics', 'force', 'energy', 'momentum', 'wave'],
  engineering: ['engineering', 'ohm', 'voltage', 'current', 'resistance'],
};

const relatedCorpusMatches = (queryText: string, item: MathematicsKnowledgeItem): string[] => {
  const query = normalize(queryText);
  return MATH_TUTOR_TRAINING_CORPUS
    .filter((example) => {
      if (example.topic !== item.topic && !(item.topic === 'General Mathematics' && example.topic === 'General Mathematics')) {
        return false;
      }
      return example.userVariants.some((variant) => {
        const variantTerms = tokenize(variant);
        const overlap = variantTerms.filter((term) => query.includes(term)).length;
        return overlap >= Math.min(2, Math.max(1, variantTerms.length));
      });
    })
    .map((example) => example.id)
    .slice(0, 3);
};

export function retrieveMathematicsKnowledge(
  query: KnowledgeRetrievalQuery,
): KnowledgeRetrievalResult[] {
  const normalizedQuery = normalize(query.text);
  const terms = tokenize(query.text);
  const limit = Math.max(1, Math.min(query.limit ?? 5, 10));

  return Array.from(mathematicsKnowledgeIndex.values())
    .map((item) => {
      const haystack = normalize([
        item.topic,
        item.subtopic,
        item.concept,
        item.definition,
        ...(item.keywords ?? []),
        ...(item.aliases ?? []),
        ...(item.relatedConcepts ?? []),
        ...(item.prerequisites ?? []),
      ].join(' '));

      const matchedTerms = terms.filter((term) => haystack.includes(term));
      let score = matchedTerms.length / Math.max(terms.length, 1);

      const normalizedTopic = item.topic.toLowerCase();
      const topicHint = query.topic ? query.topic.toLowerCase() : '';
      if (topicHint && (normalizedTopic === topicHint || topicAliases[normalizedTopic]?.some((alias) => topicHint.includes(alias)))) {
        score += 0.35;
      }

      if (query.subtopic && item.subtopic.toLowerCase() === query.subtopic.toLowerCase()) score += 0.2;

      const normalizedKeywords = (item.keywords ?? []).map(normalize).filter(Boolean);
      if (normalizedKeywords.some((keyword) => normalizedQuery.includes(keyword))) score += 0.25;

      const matchedTrainingExamples = relatedCorpusMatches(query.text, item);
      if (matchedTrainingExamples.length) score += Math.min(0.3, matchedTrainingExamples.length * 0.1);

      return { item, score, matchedTerms, matchedTrainingExamples };
    })
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score || a.item.id.localeCompare(b.item.id))
    .slice(0, limit);
}
