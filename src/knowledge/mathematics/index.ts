import { CORE_MATHEMATICS_KNOWLEDGE } from './core';
import { EXTENDED_MATHEMATICS_KNOWLEDGE } from './extended';
import { ADDITIONAL_MATHEMATICS_KNOWLEDGE } from './additional';
import { MATHEMATICS_KNOWLEDGE_VERSION, type MathematicsKnowledgeItem } from './types';
import { MATHEMATICS_SOURCE_CATALOG, MATHEMATICS_DATA_POLICY } from './sources';
import { MATH_TUTOR_TRAINING_CORPUS, type MathTutorTrainingExample } from './tutorCorpus';
import { MATH_DATASET_SOURCES, getIngestionCandidateDatasets, type MathDatasetSource } from './datasets';
import {
  normalizeMathDatasetRecords,
  getMathIngestionPolicy,
  type RawMathDatasetRecord,
  type NormalizedMathTrainingRecord,
  type MathIngestionReport,
} from './ingestion';
import {
  knowledgeToSupabaseRecord,
  tutorExampleToSupabaseRecord,
  buildQuestionRecord,
  type SupabaseKnowledgeRecord,
  type SupabaseTutorExampleRecord,
  type SupabaseQuestionRecord,
} from './supabaseSync';

export {
  CORE_MATHEMATICS_KNOWLEDGE,
  EXTENDED_MATHEMATICS_KNOWLEDGE,
  ADDITIONAL_MATHEMATICS_KNOWLEDGE,
  MATH_DATASET_SOURCES,
  getIngestionCandidateDatasets,
  MATHEMATICS_KNOWLEDGE_VERSION,
  MATHEMATICS_SOURCE_CATALOG,
  MATHEMATICS_DATA_POLICY,
  MATH_TUTOR_TRAINING_CORPUS,
  normalizeMathDatasetRecords,
  getMathIngestionPolicy,
  knowledgeToSupabaseRecord,
  tutorExampleToSupabaseRecord,
  buildQuestionRecord,
};
export type {
  MathTutorTrainingExample,
  MathDatasetSource,
  RawMathDatasetRecord,
  NormalizedMathTrainingRecord,
  MathIngestionReport,
  SupabaseKnowledgeRecord,
  SupabaseTutorExampleRecord,
  SupabaseQuestionRecord,
};
export type { MathematicsKnowledgeItem };

export const mathematicsKnowledgeIndex = new Map(
  [...CORE_MATHEMATICS_KNOWLEDGE, ...EXTENDED_MATHEMATICS_KNOWLEDGE, ...ADDITIONAL_MATHEMATICS_KNOWLEDGE].map((item) => [item.id, item] as const),
);

export function getKnowledgeItem(id: string): MathematicsKnowledgeItem | undefined {
  return mathematicsKnowledgeIndex.get(id);
}
