/**
 * Calcora AI Mathematics Knowledge Architecture
 * Knowledge Types & Schema Definition
 * Version: 2.0.0
 */

export const MATHEMATICS_KNOWLEDGE_VERSION = '2.0.0';

export type MathKnowledgeLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export interface MathExample {
  problem: string;
  solution: string;
  steps?: string[];
  latex?: string;
}

export interface MathCommonMistake {
  mistake: string;
  correction: string;
  why: string;
  preventionTip?: string;
}

export interface MathSourceMetadata {
  sourceName: string;
  sourceType:
    | 'standard_mathematical_definition'
    | 'open_educational_reference'
    | 'classical_theorem'
    | 'curriculum_standard';
  licenseOrStatus: 'public_mathematical_knowledge' | 'open_license';
  accessedAt: string;
}

export interface MathKnowledgeItem {
  id: string;
  topic: string;
  subtopic: string;
  level: MathKnowledgeLevel;
  concept: string;
  definition: string;
  notation: string;
  formulas: string[];
  assumptions: string[];
  domainRestrictions: string[];
  theorems?: string[];
  identities?: string[];
  examples: MathExample[];
  counterexamples?: string[];
  commonMistakes: MathCommonMistake[];
  solutionStrategies: string[];
  relatedTopics: string[];
  prerequisiteTopics: string[];
  alternativeMethods?: string[];
  keywords: string[];
  aliases: string[];
  latexRepresentation: string;
  sourceMetadata: MathSourceMetadata;
}

export type MathematicalIntent =
  | 'EXPLAIN_CONCEPT'
  | 'SOLVE_PROBLEM'
  | 'CHECK_STEP'
  | 'EXPLAIN_FORMULA'
  | 'PROVE_STATEMENT'
  | 'FIND_ERROR'
  | 'GENERATE_EXAMPLE'
  | 'GENERATE_PRACTICE'
  | 'COMPARE_METHODS'
  | 'SIMPLIFY'
  | 'FACTOR'
  | 'DIFFERENTIATE'
  | 'INTEGRATE'
  | 'SOLVE_EQUATION'
  | 'SOLVE_SYSTEM'
  | 'STATISTICS'
  | 'PROBABILITY'
  | 'PHYSICS_MATH'
  | 'ENGINEERING_MATH'
  | 'DEFINITION'
  | 'WHY_QUESTION'
  | 'HOW_QUESTION'
  | 'EXAM_HELP'
  | 'REVIEW_MISTAKE';

export interface IntentClassificationResult {
  intent: MathematicalIntent;
  confidence: number;
  extractedTerms: string[];
  detectedTopic?: string;
  detectedFormula?: string;
  isFollowUp?: boolean;
}

export interface KnowledgeRetrievalQuery {
  query: string;
  language?: string;
  topic?: string;
  subtopic?: string;
  intent?: MathematicalIntent;
  difficulty?: MathKnowledgeLevel;
  calculatorExpression?: string;
  limit?: number;
}

export interface KnowledgeRetrievalResult {
  primaryConcept?: MathKnowledgeItem;
  relatedConcepts: MathKnowledgeItem[];
  allRetrieved: MathKnowledgeItem[];
  formulas: string[];
  domainRestrictions: string[];
  commonMistakes: MathCommonMistake[];
  suggestedPrerequisites: string[];
  suggestedNextTopics: string[];
  groundingContextText: string;
}
