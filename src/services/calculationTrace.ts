/**
 * Developer-facing calculation and verification trace (Phase 8).
 *
 * A trace is EVIDENCE, not authority. It records what the deterministic engine did and how
 * it was verified, so a result can be replayed, diffed and attached to a bug report. Two
 * rules are load-bearing:
 *
 *  1. The identifier is derived only from mathematical content (expression, steps,
 *     verification outcome, engine identity) and never from wall-clock time, so the same
 *     problem always reproduces the same id -- which is what makes a trace replayable.
 *  2. A trace can never upgrade a verification state. UNVERIFIED or UNAVAILABLE is
 *     reproduced verbatim; recording a trace must never manufacture confidence.
 *
 * Only engine-produced step labels/results are carried. No private reasoning, token
 * stream, or chain-of-thought is captured anywhere in this module.
 */

/** Mirrors VERIFICATION_STATES so a trace can never soften a real outcome. */
export type TraceVerificationState = 'VERIFIED' | 'UNVERIFIED' | 'FAILED' | 'UNAVAILABLE';

export interface TraceStep {
  label: string;
  detail?: string;
  operation?: string;
  result?: string;
}

export interface TraceVerification {
  state: TraceVerificationState;
  reason?: string;
  method?: string;
}

export interface TraceTimings {
  [phase: string]: number;
}

export interface TraceInput {
  engine: string;
  expression?: string;
  steps: TraceStep[];
  verification: TraceVerification;
  timings?: TraceTimings;
  provenance?: {
    source?: string;
    knowledgeIds?: string[];
  };
}

export interface CalculationTrace {
  id: string;
  engine: string;
  expression?: string;
  steps: TraceStep[];
  verification: TraceVerification;
  timings: TraceTimings;
  provenance: { source?: string; knowledgeIds: string[] };
  createdAt: string;
}

/** Canonical field order so the digest depends on content, never on key ordering. */
function canonicalize(input: TraceInput): string {
  return JSON.stringify({
    engine: input.engine,
    expression: input.expression ?? null,
    steps: input.steps.map((step) => [step.label, step.detail ?? null, step.operation ?? null, step.result ?? null]),
    verification: [input.verification.state, input.verification.reason ?? null, input.verification.method ?? null],
  });
}

/**
 * FNV-1a (64-bit, two 32-bit halves). Chosen because it is tiny, dependency-free and
 * deterministic across platforms and Node versions -- which a reproducible id requires.
 * This is an identifier, not a security primitive.
 */
function fnv1a64(text: string): string {
  const PRIME_LOW = 0x01000193;
  let hashLow = 0x811c9dc5;
  let hashHigh = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    hashLow ^= code & 0xff;
    hashHigh ^= (code >>> 8) & 0xff;
    // 32-bit FNV prime multiply, split so intermediate values stay exact.
    hashLow = Math.imul(hashLow, PRIME_LOW) >>> 0;
    hashHigh = Math.imul(hashHigh, PRIME_LOW) >>> 0;
  }
  return (hashHigh >>> 0).toString(16).padStart(8, '0') + (hashLow >>> 0).toString(16).padStart(8, '0');
}

/** Stable identifier for a problem. Time-independent by construction. */
export function calculationTraceId(input: TraceInput): string {
  return `calc-${fnv1a64(canonicalize(input)).slice(0, 16)}`;
}

/** Recompute an id from a persisted trace, for verifying a report was not edited. */
export function recomputeCalculationTraceId(trace: Pick<CalculationTrace, 'engine' | 'expression' | 'steps' | 'verification'>): string {
  return calculationTraceId({
    engine: trace.engine,
    expression: trace.expression,
    steps: trace.steps,
    verification: trace.verification,
  });
}

export function buildCalculationTrace(input: TraceInput): CalculationTrace {
  return {
    id: calculationTraceId(input),
    engine: input.engine,
    ...(input.expression === undefined ? {} : { expression: input.expression }),
    steps: input.steps.map((step) => ({ ...step })),
    verification: { ...input.verification },
    timings: { ...(input.timings ?? {}) },
    provenance: {
      ...(input.provenance?.source === undefined ? {} : { source: input.provenance.source }),
      knowledgeIds: [...(input.provenance?.knowledgeIds ?? [])],
    },
    createdAt: new Date().toISOString(),
  };
}