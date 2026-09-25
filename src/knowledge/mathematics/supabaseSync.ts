import type { MathematicsKnowledgeItem } from './types';
import type { MathTutorTrainingExample } from './tutorCorpus';
import type { MathDatasetSource } from './datasets';

export interface SupabaseKnowledgeRecord {
  knowledge_id: string; topic: string; subtopic: string; level: MathematicsKnowledgeItem['level']; concept: string; definition: string;
  notation: string[]; formulas: string[]; assumptions: string[]; domain_restrictions: string[]; theorems: string[]; identities: string[];
  examples: string[]; counterexamples: string[]; common_mistakes: string[]; solution_strategies: string[]; related_concepts: string[];
  prerequisites: string[]; alternative_methods: string[]; keywords: string[]; aliases: string[]; latex: string[];
  source: MathematicsKnowledgeItem['source']; searchable_text: string; knowledge_version: string;
  content_hash?: string;
}

export interface SupabaseTutorExampleRecord {
  example_key: string; topic: string; user_variants: string[]; ideal_behavior: string; answer_strategy: string; searchable_text: string;
  source: { sourceName: string; sourceType: 'original-summary'; licenseOrStatus: string }; content_hash?: string;
}

export interface SupabaseQuestionRecord {
  dataset_id: string; external_record_id: string; question: string; final_answer?: string; topic?: string;
  status: 'verified' | 'unverified' | 'rejected'; verification_note?: string; searchable_text: string;
  source: MathDatasetSource['source']; metadata: Record<string, unknown>; content_hash?: string;
}

function compact(values: string[] | undefined): string[] {
  return Array.from(new Set((values ?? []).map((value) => value.trim()).filter(Boolean)));
}

export function knowledgeToSupabaseRecord(item: MathematicsKnowledgeItem, version: string): SupabaseKnowledgeRecord {
  const searchable = [item.topic,item.subtopic,item.concept,item.definition,...(item.formulas ?? []),...(item.examples ?? []),...(item.keywords ?? []),...(item.aliases ?? []),...(item.commonMistakes ?? [])].join('\n');
  return { knowledge_id:item.id, topic:item.topic, subtopic:item.subtopic, level:item.level, concept:item.concept, definition:item.definition,
    notation:compact(item.notation), formulas:compact(item.formulas), assumptions:compact(item.assumptions), domain_restrictions:compact(item.domainRestrictions),
    theorems:compact(item.theorems), identities:compact(item.identities), examples:compact(item.examples), counterexamples:compact(item.counterexamples),
    common_mistakes:compact(item.commonMistakes), solution_strategies:compact(item.solutionStrategies), related_concepts:compact(item.relatedConcepts),
    prerequisites:compact(item.prerequisites), alternative_methods:compact(item.alternativeMethods), keywords:compact(item.keywords), aliases:compact(item.aliases),
    latex:compact(item.latex), source:item.source, searchable_text:searchable.slice(0,20000), knowledge_version:version };
}

export function tutorExampleToSupabaseRecord(example: MathTutorTrainingExample): SupabaseTutorExampleRecord {
  return { example_key:example.id, topic:example.topic, user_variants:compact(example.userVariants), ideal_behavior:example.idealBehavior, answer_strategy:example.answerStrategy.join('\n'),
    searchable_text:[example.topic,...example.userVariants,example.idealBehavior,...example.answerStrategy].join('\n').slice(0,20000),
    source:{sourceName:'Calcora AI original tutor corpus',sourceType:'original-summary',licenseOrStatus:'Original Calcora-authored training example; no external transcript copied.'} };
}

export function buildQuestionRecord(dataset: MathDatasetSource, record: { id?: string; question: string; answer?: string; topic?: string; metadata?: Record<string, unknown> }, verification: { status: SupabaseQuestionRecord['status']; note?: string }): SupabaseQuestionRecord {
  return { dataset_id:dataset.id, external_record_id:record.id ?? dataset.id + ':' + record.question.slice(0,120), question:record.question.trim(), final_answer:record.answer?.trim(), topic:record.topic,
    status:verification.status, verification_note:verification.note, searchable_text:[record.topic,record.question,record.answer].filter(Boolean).join('\n').slice(0,20000), source:dataset.source, metadata:record.metadata ?? {} };
}
