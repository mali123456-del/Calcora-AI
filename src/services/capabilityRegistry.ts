/**
 * Phase 23 — capability registry.
 *
 * A single source of truth for "what can this application actually do", so the UI never
 * advertises a capability the runtime does not implement. Every entry cites concrete evidence
 * -- an orchestrator branch, a deterministic tool, a retrieval corpus, a packaged-artifact
 * check -- because a mode name on its own proves nothing.
 *
 * The directive is explicit that modes must not be labels producing identical behaviour. Entries
 * therefore declare `behaviour`: what actually changes when the capability is selected. A
 * capability without differentiating behaviour cannot be marked available.
 *
 * `requiresModel` marks every capability that depends on the local GGUF weights. This is what
 * makes model retirement auditable: deleting the weights breaks exactly these entries and no
 * others. Deterministic mathematics is deliberately `requiresModel: false` and this module is
 * written to keep it that way.
 */

export type CapabilityStatus = 'available' | 'planned';

export interface CapabilityEvidence {
  kind: 'orchestrator-branch' | 'deterministic-tool' | 'knowledge-corpus' | 'packaged-check' | 'ui-branch';
  reference: string;
}

export interface Capability {
  id: string;
  label: string;
  description: string;
  status: CapabilityStatus;
  /** What actually changes when this capability is used. 'label-only' means nothing does. */
  behaviour: string;
  requiresModel: boolean;
  evidence: CapabilityEvidence[];
  /** Required when status is 'planned', so the UI can explain the gap rather than hide it. */
  unavailableReason?: string;
}

const branch = (reference: string): CapabilityEvidence => ({ kind: 'orchestrator-branch', reference });
const tool = (reference: string): CapabilityEvidence => ({ kind: 'deterministic-tool', reference });
const ui = (reference: string): CapabilityEvidence => ({ kind: 'ui-branch', reference });
const corpus = (reference: string): CapabilityEvidence => ({ kind: 'knowledge-corpus', reference });
const packaged = (reference: string): CapabilityEvidence => ({ kind: 'packaged-check', reference });

export const CAPABILITY_REGISTRY: readonly Capability[] = [
  {
    id: 'deterministic-math',
    label: 'Deterministic mathematics',
    description: 'Arithmetic, algebra, equations, calculus, matrices, statistics and finance computed by Calcora\'s own engine.',
    status: 'available',
    behaviour: 'Computes and verifies every checkable mathematical result. Never delegates to a language model, and never reports a model answer as mathematics.',
    requiresModel: false,
    evidence: [tool('src/engine/*'), tool('src/verification/independentVerifier.ts'), packaged('exeSmokeTest: 2+3=5, d/dx(x^2)=2x')],
  },
  {
    id: 'socratic-tutor',
    label: 'Socratic Tutor',
    description: 'Guides the learner with questions instead of presenting the answer.',
    status: 'available',
    behaviour: 'Orchestrator withholds the final answer and asks targeted questions; hint level and step-checking are engaged.',
    requiresModel: false,
    evidence: [branch('src/services/tutorOrchestrator.ts:71 case \'socratic\''), ui('src/components/AIAssistantPanel.tsx:1150')],
  },
  {
    id: 'progressive-hints',
    label: 'Progressive hints',
    description: 'Hints revealed in escalating stages rather than all at once.',
    status: 'available',
    behaviour: 'Hint level gates output; each stage withholds the next until requested.',
    requiresModel: false,
    evidence: [branch('src/services/tutorOrchestrator.ts:78 case \'hint\'')],
  },
  {
    id: 'quiz-practice',
    label: 'Quiz & practice',
    description: 'Generates practice questions and evaluates answers.',
    status: 'available',
    behaviour: 'Switches the Tutor into question-generation and answer-checking behaviour.',
    requiresModel: false,
    evidence: [branch('src/services/tutorOrchestrator.ts:83 case \'quiz\''), branch('src/services/tutorOrchestrator.ts:90 case \'challenge\'')],
  },
  {
    id: 'exam-mode',
    label: 'Exam mode',
    description: 'Assessment framing that withholds intermediate scaffolding.',
    status: 'available',
    behaviour: 'Suppresses hints and step scaffolding for independent assessment.',
    requiresModel: false,
    evidence: [branch('src/services/tutorOrchestrator.ts:92 case \'exam\'')],
  },
  {
    id: 'check-my-work',
    label: 'Check my work',
    description: 'Inspects a submitted solution step by step.',
    status: 'available',
    behaviour: 'Routes to the step checker and reports per-step correctness with feedback.',
    requiresModel: false,
    evidence: [branch('src/services/tutorOrchestrator.ts:94 case \'check-work\'')],
  },
  {
    id: 'solver-review',
    label: 'Solver review',
    description: 'Reviews a complete worked solution rather than solving from scratch.',
    status: 'available',
    behaviour: 'Evaluates the supplied derivation against the deterministic result and flags divergences.',
    requiresModel: false,
    evidence: [branch('src/services/tutorOrchestrator.ts:97 case \'solver-review\''), ui('src/components/AIAssistantPanel.tsx:1152')],
  },
  {
    id: 'step-by-step',
    label: 'Step-by-step solver',
    description: 'Works a problem through explicit intermediate steps.',
    status: 'available',
    behaviour: 'Produces ordered derivation steps from the deterministic engine.',
    requiresModel: false,
    evidence: [branch('src/services/tutorOrchestrator.ts:99 case \'step-by-step\'')],
  },
  {
    id: 'assistant-mode',
    label: 'Assistant',
    description: 'Direct question answering.',
    status: 'available',
    behaviour: 'Default answering mode without tutoring scaffolding.',
    requiresModel: false,
    evidence: [branch('src/services/tutorOrchestrator.ts:101 case \'assistant\'')],
  },
  {
    id: 'tutor-mode',
    label: 'Tutor',
    description: 'Teaching-oriented answering with misconception handling.',
    status: 'available',
    behaviour: 'Adds misconception detection and corrective hints on top of the answer.',
    requiresModel: false,
    evidence: [branch('src/services/tutorOrchestrator.ts:102 case \'tutor\''), ui('src/components/AIAssistantPanel.tsx:1636')],
  },
  {
    id: 'knowledge-rag',
    label: 'Grounded knowledge retrieval',
    description: 'Retrieves attributable mathematical knowledge with provenance and grounding thresholds.',
    status: 'available',
    behaviour: 'Retrieves, ranks, deduplicates and grounds answers; refuses to answer below the grounding threshold and says so.',
    requiresModel: false,
    evidence: [corpus('src/knowledge/mathematicsKnowledgeIndex.ts'), corpus('src/knowledge/knowledgeRetrieval.ts')],
  },
  {
    id: 'multilingual-tutor',
    label: 'Multilingual Tutor',
    description: 'Language detection, localized answer templates and per-language grammar knowledge.',
    status: 'available',
    behaviour: 'Detects the input language and composes the answer surface in it. Capability depth differs per language: 2 languages have full local answer templates, 44 have grammar profiles.',
    requiresModel: false,
    evidence: [corpus('src/services/multilingualTutorKnowledge.ts'), ui('src/ai/tutorLanguages.ts getTutorSupportLevel')],
  },
  {
    id: 'local-model-generation',
    label: 'On-device language generation',
    description: 'Free-form prose from a local GGUF model via llama.cpp, used for explanations and multilingual phrasing.',
    status: 'available',
    behaviour: 'Generates narrative text when the deterministic engine cannot produce the answer. Degrades to the deterministic fallback when unavailable.',
    requiresModel: true,
    evidence: [tool('src/services/localGgufRuntime.ts'), packaged('exeSmokeTest: local GGUF answers, 8.3-12.8 s/turn')],
  },
  {
    id: 'developer-trace',
    label: 'Developer trace',
    description: 'Reproducible calculation and verification trace with structured JSON.',
    status: 'available',
    behaviour: 'Emits a time-independent trace id derived from mathematical content, regenerable from the trace itself.',
    requiresModel: false,
    evidence: [tool('src/services/calculationTrace.ts'), packaged('CDP: trace calc-57a85855178d8a7b VERIFIED reproducible')],
  },
  {
    id: 'coding-assistant',
    label: 'Coding assistant',
    description: 'Programming help, debugging guidance and code review.',
    status: 'planned',
    behaviour: 'label-only',
    requiresModel: true,
    evidence: [tool('models/qwen2.5-coder-3b-instruct-q4_k_m.gguf is present but no coding orchestrator branch exists')],
    unavailableReason:
      'A coding-specialised GGUF model is present and reachable through the generic generation path, but no dedicated coding mode, repository analysis, or code-tool routing has been implemented or evaluated. The model alone is not an implemented capability.',
  },
  {
    id: 'code-reviewer',
    label: 'Code reviewer',
    description: 'Structured review of code changes with actionable findings.',
    status: 'planned',
    behaviour: 'label-only',
    requiresModel: true,
    evidence: [tool('no review pipeline or diff ingestion exists in src/')],
    unavailableReason:
      'Requires diff ingestion, a review rubric, and an evaluation set. None exist yet, and a general model response is not a code review.',
  },
  {
    id: 'research-assistant',
    label: 'Research assistant',
    description: 'Multi-source comparison and research workflow with citations.',
    status: 'planned',
    behaviour: 'label-only',
    requiresModel: false,
    evidence: [corpus('retrieval is local-only; no external source fetching exists')],
    unavailableReason:
      'Calcora retrieves only its own local corpus. Multi-source research would require outbound network access and a citation-verification layer, neither of which is implemented.',
  },
  {
    id: 'document-explainer',
    label: 'Document explainer',
    description: 'Explains an attached document with page-aware grounding.',
    status: 'planned',
    behaviour: 'label-only',
    requiresModel: false,
    evidence: [corpus('src/services/activeDocument.ts restricts document tutoring to the local origin')],
    unavailableReason:
      'Document extraction and page selection exist, but document tutoring is deliberately blocked on non-loopback origins and has not been evaluated end to end as a standalone capability.',
  },
  {
    id: 'tool-calling-agent',
    label: 'Verified tool-calling agent',
    description: 'Agentic planning with tracked tool calls and human approval gates.',
    status: 'planned',
    behaviour: 'label-only',
    requiresModel: false,
    evidence: [
      branch('src/services/mathAgent.ts bounded plan → tool → verify → explain pipeline, served at /api/ai/math-agent (server.ts) and covered by tests/mathAgent.test.ts'),
      tool('src/engine/toolLayer.ts exposes exactly one verified deterministic tool, and mathAgent executes it directly with no approval gate in front of it'),
    ],
    unavailableReason:
      'A bounded planning loop does exist and is served, but it runs without any human approval gate before tool execution and it can orchestrate no second tool. "Agentic planning with tracked tool calls and human approval gates" is therefore not implemented, and claiming it would misrepresent the application.',
  },
];

export function isCapabilityAvailable(id: string): boolean {
  return CAPABILITY_REGISTRY.some((c) => c.id === id && c.status === 'available');
}

export function listAvailableCapabilities(): readonly Capability[] {
  return CAPABILITY_REGISTRY.filter((c) => c.status === 'available');
}

export function listPlannedCapabilities(): readonly Capability[] {
  return CAPABILITY_REGISTRY.filter((c) => c.status !== 'available');
}

export function capabilityReport(): {
  total: number;
  available: readonly Capability[];
  planned: readonly Capability[];
  modelDependent: readonly string[];
} {
  return {
    total: CAPABILITY_REGISTRY.length,
    available: listAvailableCapabilities(),
    planned: listPlannedCapabilities(),
    modelDependent: CAPABILITY_REGISTRY.filter((c) => c.requiresModel).map((c) => c.id),
  };
}