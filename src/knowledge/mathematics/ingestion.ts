import { calculateExpression } from '../../engine/mathEngine';
import { solveEquation } from '../../engine/equationSolver';
import { getIngestionCandidateDatasets, type MathDatasetSource } from './datasets';

export type MathIngestionStatus = 'verified' | 'unverified' | 'rejected';

export interface RawMathDatasetRecord {
  id?: string | number;
  question?: unknown;
  problem?: unknown;
  prompt?: unknown;
  instruction?: unknown;
  answer?: unknown;
  solution?: unknown;
  response?: unknown;
  rationale?: unknown;
  reasoning?: unknown;
  chain_of_thought?: unknown;
  analysis?: unknown;
  category?: unknown;
  subject?: unknown;
  topic?: unknown;
  [key: string]: unknown;
}

export interface NormalizedMathTrainingRecord {
  id: string;
  datasetId: string;
  question: string;
  finalAnswer?: string;
  topic: string;
  status: MathIngestionStatus;
  verificationNote: string;
  searchableText: string;
  source: MathDatasetSource;
  metadata: { importedAt: string; excludedFields: string[] };
}

export interface MathIngestionReport {
  datasetId: string;
  accepted: number;
  verified: number;
  unverified: number;
  rejected: number;
  records: NormalizedMathTrainingRecord[];
}

const EXCLUDED_REASONING_FIELDS = ['solution','response','rationale','reasoning','chain_of_thought','analysis'];

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function firstText(record: RawMathDatasetRecord, keys: string[]): string {
  for (const key of keys) {
    const value = text(record[key]);
    if (value) return value;
  }
  return '';
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
}

function answerCandidates(finalAnswer: string): string[] {
  return finalAnswer.split(/[,;]|\band\b/i).map((value) => value.trim()).filter(Boolean);
}

function denominatorExpressions(equation: string): string[] {
  const matches: string[] = [];
  const parenthesized = /\/\s*\(\s*([^()]+?)\s*\)/g;
  for (const match of equation.matchAll(parenthesized)) matches.push(match[1].trim());
  const simple = /\/\s*([a-zA-Z][a-zA-Z0-9]*\s*[+-]\s*\d+(?:\.\d+)?)/g;
  for (const match of equation.matchAll(simple)) matches.push(match[1].trim());
  return Array.from(new Set(matches));
}

function violatesDenominatorRestriction(question: string, finalAnswer: string): string | null {
  const candidates = answerCandidates(finalAnswer);
  for (const denominator of denominatorExpressions(question)) {
    const restriction = solveEquation(denominator + ' = 0');
    if (!restriction.isValid || restriction.solutions.length === 0) continue;
    const restrictedValues = restriction.solutions.map(String);
    if (candidates.some((candidate) => restrictedValues.includes(candidate))) {
      return `Answer contains a value excluded by the original denominator restriction: ${denominator} != 0.`;
    }
  }
  return null;
}

function verifyFinalAnswer(question: string, finalAnswer: string): { status: MathIngestionStatus; note: string } {
  if (!finalAnswer) return { status: 'unverified', note: 'No final answer field was supplied.' };

  const restrictionViolation = violatesDenominatorRestriction(question, finalAnswer);
  if (restrictionViolation) return { status: 'rejected', note: restrictionViolation };

  const direct = calculateExpression(question);
  if (!direct.error && String(direct.value) === finalAnswer) {
    return { status: 'verified', note: 'Final answer matched Calcora deterministic calculator.' };
  }

  if (question.includes('=')) {
    const equation = solveEquation(question);
    if (equation.isValid && equation.solutions.length > 0) {
      const expected = equation.solutions.join(', ');
      if (finalAnswer === expected || equation.solutions.every((value) => finalAnswer.includes(String(value)))) {
        return { status: 'verified', note: 'Final answer matched Calcora deterministic equation solver with domain checks.' };
      }
    }
  }

  return {
    status: 'unverified',
    note: 'Record was retained with provenance, but Calcora could not independently verify the supplied answer.',
  };
}

export function normalizeMathDatasetRecords(
  datasetId: string,
  records: RawMathDatasetRecord[],
  importedAt = new Date().toISOString(),
): MathIngestionReport {
  const source = getIngestionCandidateDatasets().find((dataset) => dataset.id === datasetId);
  if (!source) throw new Error(`Dataset "${datasetId}" is not approved as an ingestion candidate.`);

  const normalized: NormalizedMathTrainingRecord[] = [];
  const seen = new Set<string>();
  let rejected = 0;

  for (const record of records) {
    const question = firstText(record, ['question','problem','prompt','instruction']);
    if (!question) { rejected += 1; continue; }

    const finalAnswer = firstText(record, ['answer']);
    const topic = firstText(record, ['topic','subject','category']) || source.domains[0] || 'Mathematics';
    const key = `${datasetId}|${question.toLowerCase()}|${finalAnswer.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const verification = verifyFinalAnswer(question, finalAnswer);
    const idBase = text(record.id) || slug(question) || String(normalized.length + 1);

    normalized.push({
      id: `${datasetId}:${idBase}`,
      datasetId,
      question,
      ...(finalAnswer ? { finalAnswer } : {}),
      topic,
      status: verification.status,
      verificationNote: verification.note,
      searchableText: [question, finalAnswer, topic, source.domains.join(' ')].filter(Boolean).join(' '),
      source,
      metadata: {
        importedAt,
        excludedFields: EXCLUDED_REASONING_FIELDS.filter((field) => record[field] !== undefined),
      },
    });
  }

  return {
    datasetId,
    accepted: normalized.length,
    verified: normalized.filter((record) => record.status === 'verified').length,
    unverified: normalized.filter((record) => record.status === 'unverified').length,
    rejected: rejected + normalized.filter((record) => record.status === 'rejected').length,
    records: normalized,
  };
}

export function getMathIngestionPolicy() {
  return {
    approvedDatasetIds: getIngestionCandidateDatasets().map((dataset) => dataset.id),
    rejectedDatasetIds: ['openwebmath','huggingface-datasets-hub'],
    excludedReasoningFields: [...EXCLUDED_REASONING_FIELDS],
    storageModel: 'provenance-aware-normalized-records',
    verificationModel: 'deterministic-engine-first-with-domain-restrictions',
    fineTuningClaim: 'Not base-model fine-tuning; records are prepared for local retrieval/grounding.',
  } as const;
}
