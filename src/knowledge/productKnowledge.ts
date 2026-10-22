/**
 * Versioned, curated Calcora product knowledge for the Tutor (batch 6).
 *
 * These are claims about Calcora ITSELF, so the Tutor can honestly answer
 * "what can you do / how do my documents work / why is this badge verified".
 * Every entry carries `evidence` naming the real source that established the
 * fact, and tests/productKnowledge.test.ts re-derives the numbers from those
 * sources so the knowledge cannot silently drift from the implementation.
 *
 * The entries deliberately avoid unverifiable marketing ("100% accuracy") and
 * omit anything that would require unproved model claims. Nothing here grants
 * the Tutor new permissions; it is informational grounding text only.
 */

export const PRODUCT_KNOWLEDGE_VERSION = 2;

export interface ProductKnowledgeItem {
  id: string;
  concept: string;
  definition: string;
  keywords: string[];
  evidence: string;
}

export const PRODUCT_KNOWLEDGE_ITEMS: readonly ProductKnowledgeItem[] = [
  {
    id: 'product-verification',
    concept: 'Verification of mathematical answers',
    definition:
      "Calcora checks AI answers against its own deterministic mathematics engine, which independently re-derives results (exact rational arithmetic or residual substitution). Explanations are labeled Not verified when there is no computed value to check; a failing check is shown with the engine's independent value, not hidden.",
    keywords: ['verify', 'verified', 'verification', 'badge', 'check', 'independent', 'deterministic', 'wrong answer'],
    evidence: 'src/verification/verificationStates.ts + tests/verificationStates.test.ts',
  },
  {
    id: 'product-offline-first',
    concept: 'Offline operation',
    definition:
      'The scientific calculator, the deterministic engine, history, notebook and stored settings work without a network connection. AI Tutor works offline through the portable local path; cloud and document-rating features are only available when the server is reachable and require a network.',
    keywords: ['offline', 'no internet', 'network', 'connection', 'without internet', 'local'],
    evidence: 'tests/tutorFollowUpOffline.test.ts (offline tutor follow-up thread)',
  },
  {
    id: 'product-privacy',
    concept: 'Privacy modes',
    definition:
      'Calcora supports privacy modes for AI requests, including a local-only mode that never sends prompts or documents to cloud providers. Cloud requests require the explicit privacy setting your app is configured with; documents attached to the Tutor force the offline path.',
    keywords: ['privacy', 'privacy mode', 'local-only', 'cloud', 'consent', 'documents', 'sent'],
    evidence: 'tests/privateTutorRouting.test.ts, server[start] privacy policy route',
  },
  {
    id: 'product-languages',
    concept: 'Language support',
    definition:
      'The Tutor supports 115 registered answer languages, including right-to-left languages such as Arabic, Persian, Urdu, Hebrew and Kurdish. Mathematical notation is preserved in the Latin form regardless of the interface language.',
    keywords: ['language', 'arabic', 'urdu', 'persian', 'right-to-left', 'rtl', 'translate', 'french', 'spanish', 'hindi'],
    evidence: 'src/ai/tutorLanguages.ts + tests/languageCoverage.test.ts (115 registered)',
  },
  {
    id: 'product-calculator',
    concept: 'Calculator capabilities',
    definition:
      'Calcora includes scientific calculation with exact-fraction display and precision control, equation solving (linear and quadratic), calculus tools, matrix and vector operations, graphing, statistics, a programmer calculator with base conversion, engineering tools, unit and currency conversion, a formula library, and a practice quiz.',
    keywords: ['calculator', 'scientific', 'equations', 'quadratic', 'matrix', 'graph', 'statistics', 'programmer', 'unit', 'currency', 'formula', 'quiz', 'engineer'],
    evidence: 'src/App.tsx panel wiring + src/engine/tests/mathPipeline.test.ts',
  },
  {
    id: 'product-documents',
    concept: 'Documents and document intelligence',
    definition:
      'PDF and DOCX documents can be analyzed locally, with extracted text used to ground Tutor answers. Document contents are used only where the document is attached explicitly; citations reference the actual document, and document text is never sent to cloud providers without the required privacy consent.',
    keywords: ['pdf', 'docx', 'document', 'upload', 'paper', 'citation', 'summarize', 'notes'],
    evidence: 'tests/pdfTutorIntegration.test.ts, tests/docxExtraction.test.ts',
  },
  {
    id: 'product-tutor-workflow',
    concept: 'Tutor workflow',
    definition:
      'The Tutor walks through problems one step at a time, offers structured hints instead of immediately revealing answers, classifies mistakes into error classes to give targeted feedback, and supports practice quizzes plus progress tracking. Hints never state that a learner is bad at math: feedback addresses the error pattern, not the person.',
    keywords: ['tutor', 'hint', 'hints', 'step', 'steps', 'mistake', 'wrong', 'understand', 'learning', 'progress', 'quiz'],
    evidence: 'tests/misconception.test.ts (71 assertions), tests/adaptiveTutorIntegration.test.ts',
  },
  {
    id: 'product-limits',
    concept: 'Known limitations',
    definition:
      'Antiderivatives are computed by the deterministic engine but are marked not independently verified (no independent evaluator exists for them). Knowledge items beyond the curated corpus are sourced from the local knowledge index and carry their own verification status; what is not known is stated plainly rather than invented.',
    keywords: ['limitation', 'cannot', 'antiderivative', 'integral', 'unknown', 'unsupported', 'supported', 'know'],
    evidence: 'tests/liveTutorVerification.test.ts (antiderivative limitation block)',
  },
  {
    id: 'product-developer',
    concept: 'Developer tools',
    definition:
      'A Developer workspace exposes an API Playground for the six allowlisted public Calcora endpoints, provider/model registry status, bounded diagnostics with secret redaction, and developer settings. It never changes calculation results.',
    keywords: ['developer', 'api', 'playground', 'registry', 'diagnostics', 'logs'],
    evidence: 'src/services/developerEndpoints.ts + tests/developerEndpoints.test.ts',
  },
] as const;

/**
 * Bounded keyword retrieval over the product knowledge (no corpus, no model
 * call). Returns facts shaped like the mathematics knowledge items consumed by
 * buildTutorGroundingContext, so the Tutor gets product facts through the SAME
 * grounding channel as math facts.
 */
export function retrieveProductKnowledge(
  query: string,
  limit = 3,
): Array<{ id: string; concept: string; definition: string }> {
  const normalized = query.toLowerCase();
  if (!normalized.trim()) return [];
  const scored = PRODUCT_KNOWLEDGE_ITEMS.map((item) => {
    const hits = item.keywords.filter((keyword) => normalized.includes(keyword)).length;
    return { item, hits };
  })
    .filter((scored) => scored.hits > 0)
    .sort((a, b) => b.hits - a.hits)
    .slice(0, Math.max(0, limit));
  return scored.map(({ item }) => ({ id: item.id, concept: item.concept, definition: item.definition }));
}
