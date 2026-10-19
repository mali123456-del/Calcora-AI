/**
 * Calcora AI - Phase 3D: Evidence-Aware Orchestration
 *
 * Unifies:
 *   - Document Intelligence (PDF, DOCX, CSV/XLSX, Markdown, Code)
 *   - Controlled Web Research (SSRF-protected, robots-compliant)
 *   - Universal Model Manager (local vs cloud privacy boundaries)
 *   - Deterministic Math Engine (exact calculation verification)
 *   - Untrusted Data Sanitization & Prompt Injection Hardening
 */

import { globalDocumentIntelligence, type RetrievalResult } from './documentIntelligence';
import { globalWebResearcher, type WebResearchResult } from './webResearch';
import { globalModelManager, type PrivacyMode } from './universalModelManager';
import { calculateExpression } from '../engine/mathEngine';
import { solveEquation } from '../engine/equationSolver';
import { sanitizeQueryText } from '../utils/sanitizer';

export interface EvidenceRequest {
  prompt: string;
  privacyMode: PrivacyMode;
  allowWebResearch?: boolean;
  documentId?: string;
  seedWebUrls?: string[];
}

export interface GroundedEvidence {
  sourceType: 'document' | 'web' | 'mathematical-axiom';
  citation: string;
  excerpt: string;
  confidence: number;
}

export interface EvidenceOrchestrationResult {
  answer: string;
  evidence: GroundedEvidence[];
  deterministicResult?: string;
  isDeterministic: boolean;
  citations: string[];
  uncertaintyNotes?: string;
  privacyNotice?: string;
  warnings: string[];
}

/**
 * Sanitizes untrusted user or document inputs to neutralize prompt injection vectors.
 */
export function sanitizeUntrustedContext(raw: string): string {
  // Disarm common prompt injection sequences
  return raw
    .replace(/```(?:system|admin|override|prompt)/gi, '```text')
    .replace(/\[\s*SYSTEM\s*:\s*OVERRIDE[^\]]*\]/gi, '[untrusted:disarmed]')
    .replace(/(?:ignore previous instructions|disregard earlier instructions)/gi, '[disarmed directive]')
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .trim();
}

/**
 * Orchestrates grounded, verified answering using local and authorized external evidence.
 */
export async function orchestrateEvidence(request: EvidenceRequest): Promise<EvidenceOrchestrationResult> {
  const warnings: string[] = [];
  const citations: string[] = [];
  const evidenceList: GroundedEvidence[] = [];

  const sanitizedPrompt = sanitizeQueryText(request.prompt.trim());

  // 1. Check for direct deterministic mathematical expressions
  const equationMatch = sanitizedPrompt.match(/^(?:solve\s+)?([a-z0-9^*/+.\s-]+=[\s*a-z0-9^*/+.-]+)$/i);
  if (equationMatch) {
    const eq = equationMatch[1].trim();
    const solved = solveEquation(eq);
    if (solved.isValid && solved.solutions.length > 0) {
      const solutionStr = solved.solutions.join(', ');
      const formatted = `Equation **${eq}** solved deterministically:\n\n${solved.steps.join('\n')}\n\nSolutions: **${solutionStr}**`;
      return {
        answer: formatted,
        evidence: [{
          sourceType: 'mathematical-axiom',
          citation: '[Calcora Symbolic Equation Engine]',
          excerpt: `Solutions for ${eq}`,
          confidence: 1.0,
        }],
        deterministicResult: solutionStr,
        isDeterministic: true,
        citations: ['[Calcora Symbolic Equation Engine]'],
        warnings,
      };
    }
  }

  const directCalc = calculateExpression(sanitizedPrompt, 'DEG');
  if (!directCalc.error && Number.isFinite(directCalc.value) && !/[a-wy-z]/i.test(sanitizedPrompt)) {
    return {
      answer: `Result: **${directCalc.display}**\n\nComputed with exact decimal arithmetic.`,
      evidence: [{
        sourceType: 'mathematical-axiom',
        citation: '[Calcora Exact Math Engine]',
        excerpt: `${sanitizedPrompt} = ${directCalc.display}`,
        confidence: 1.0,
      }],
      deterministicResult: directCalc.display,
      isDeterministic: true,
      citations: ['[Calcora Exact Math Engine]'],
      warnings,
    };
  }

  // 2. Retrieve local document evidence if documents exist
  const docResults: RetrievalResult[] = globalDocumentIntelligence.search(sanitizedPrompt, {
    documentId: request.documentId,
    topK: 3,
  });

  for (const res of docResults) {
    const cleanExcerpt = sanitizeUntrustedContext(res.chunk.text.slice(0, 300));
    evidenceList.push({
      sourceType: 'document',
      citation: res.citation,
      excerpt: cleanExcerpt,
      confidence: Math.min(1.0, res.score / 5),
    });
    citations.push(res.citation);
  }

  // 3. Web Research (only if allowed and privacy policy is NOT local-only)
  if (request.allowWebResearch && request.privacyMode !== 'local-only' && (request.seedWebUrls?.length || 0) > 0) {
    const webResult: WebResearchResult = await globalWebResearcher.research(
      sanitizedPrompt,
      request.seedWebUrls,
      { maxPages: 2 },
    );

    for (const source of webResult.sources) {
      const cleanWeb = sanitizeUntrustedContext(source.snippet);
      evidenceList.push({
        sourceType: 'web',
        citation: source.citation,
        excerpt: cleanWeb,
        confidence: 0.85,
      });
      citations.push(source.citation);
    }
    if (webResult.warnings.length > 0) warnings.push(...webResult.warnings);
  } else if (request.allowWebResearch && request.privacyMode === 'local-only') {
    warnings.push('Web research was requested but suppressed because privacy mode is set to "local-only".');
  }

  // 4. Construct response grounded in evidence
  let answer: string;
  let uncertaintyNotes: string | undefined;

  if (evidenceList.length > 0) {
    const evidenceBlock = evidenceList
      .map((ev, idx) => `[Source ${idx + 1}] ${ev.citation}\n"${ev.excerpt}"`)
      .join('\n\n');

    answer = `Based on the verified evidence:\n\n${evidenceBlock}\n\n`;
    if (evidenceList.every((e) => e.confidence < 0.4)) {
      uncertaintyNotes = 'Retrieval confidence is low. Verify against primary source documents.';
    }
  } else {
    answer = `No matching evidence found in active documents for: "${sanitizedPrompt}".`;
    uncertaintyNotes = 'No documents matched the query terms.';
  }

  return {
    answer,
    evidence: evidenceList,
    isDeterministic: false,
    citations,
    uncertaintyNotes,
    privacyNotice: request.privacyMode === 'local-only' ? 'Processed entirely within local environment.' : undefined,
    warnings,
  };
}
