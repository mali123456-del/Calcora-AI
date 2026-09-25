export type KnowledgeLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export interface MathematicsKnowledgeItem {
  id: string;
  topic: string;
  subtopic: string;
  level: KnowledgeLevel;
  concept: string;
  definition: string;
  notation?: string[];
  formulas?: string[];
  assumptions?: string[];
  domainRestrictions?: string[];
  theorems?: string[];
  identities?: string[];
  examples?: string[];
  counterexamples?: string[];
  commonMistakes?: string[];
  solutionStrategies?: string[];
  relatedConcepts?: string[];
  prerequisites?: string[];
  alternativeMethods?: string[];
  keywords: string[];
  aliases?: string[];
  latex?: string[];
  source?: KnowledgeSourceMetadata;
}

export interface KnowledgeSourceMetadata {
  sourceName: string;
  sourceType: 'open-textbook' | 'university' | 'public-domain' | 'original-summary' | 'external-dataset' | 'reference-only';
  url?: string;
  licenseOrStatus: string;
  accessedAt?: string;
}

export const MATHEMATICS_KNOWLEDGE_VERSION = '1.3.0';
