/**
 * Calcora AI Mathematics Knowledge Architecture
 * Knowledge Types & Schema Definition
 * Version: 2.0.0
 */

export const MATHEMATICS_KNOWLEDGE_VERSION = '2.0.0';

/**
 * Evidence-based reliability statement for a knowledge item.
 * See `src/knowledge/knowledgeVerification.ts` for how each value is derived.
 */
export type KnowledgeVerificationStatus = 'VERIFIED' | 'UNVERIFIED' | 'REVIEW_REQUIRED';

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
  /**
   * Evidence-based reliability statement for this item, computed by
   * `auditKnowledgeCorpus` from the repository's own worked examples. It is never
   * hand-asserted and it is never uniformly VERIFIED.
   *
   * This is a statement about the *prose*, not about the mathematics: no knowledge
   * item is ever the authority for a numerical result, whatever its status.
   */
  verificationStatus?: KnowledgeVerificationStatus;
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
