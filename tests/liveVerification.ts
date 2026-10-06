/**
 * End-to-end HTTP verification: real PDF bytes -> extraction -> live Tutor API.
 * Uses the same fixtures as the unit tests so the text is known verbatim.
 */
import { extractPdfText } from '../src/services/pdfExtraction';
import { createDocumentContext, toPagePayload } from '../src/services/documentContext';
import { loadNodePdfJs } from './helpers/pdfNodeLoader';
import { buildAlgebraWorksheetPdf } from './fixtures/pdfFixtures';

const BASE = process.env.CALCORA_BASE ?? 'http://localhost:3000';

interface ApiResponse {
  success: boolean;
  answer: string;
  deterministicResult?: string | null;
  deterministicVerified?: boolean;
  meta?: {
    responseSource?: string;
    documentProvenance?: string | null;
    documentPagesUsed?: number[];
    requiresCloudApiKey?: boolean;
    tutorEngine?: string;
  };
}

async function ask(prompt: string, extra: Record<string, unknown> = {}): Promise<ApiResponse> {
  const body = {
    prompt,
    tutorMode: 'tutor',
    language: 'auto',
    topic: 'Algebra',
    ...extra,
  };
  const res = await fetch(`${BASE}/api/ai/math`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return (await res.json()) as ApiResponse;
}

async function main() {
  const getDocument = await loadNodePdfJs();
  const extraction = await extractPdfText(buildAlgebraWorksheetPdf(), { getDocument });
  if (!extraction.success) throw new Error(`extraction failed: ${extraction.error}`);
  const document = createDocumentContext({
    fileName: 'algebra-worksheet.pdf',
    pages: extraction.pages,
  });

  console.log('=== fixture characteristics ===');
  console.log(`pages=${document.pageCount} chars=${document.totalChars} chunks=${document.chunks.length} needsOcr=${document.needsOcr}`);

  const docPayload = { document: { fileName: document.fileName, pages: toPagePayload(document) } };

  console.log('\n=== Q1: answer present in the PDF ===');
  const q1 = await ask('According to the document, what does dividing both sides by 2 give?', docPayload);
  console.log(q1.answer);
  console.log(`source=${q1.meta?.responseSource} pages=${JSON.stringify(q1.meta?.documentPagesUsed)}`);
  console.log(`provenance=${q1.meta?.documentProvenance}`);

  console.log('\n=== Q2: answer NOT in the PDF (must be honest) ===');
  const q2 = await ask('According to the document, what is the capital of France?', docPayload);
  console.log(q2.answer);
  console.log(`source=${q2.meta?.responseSource}`);

  console.log('\n=== Q3: PDF context + calculation stays deterministic ===');
  const q3 = await ask('Solve 2x + 3 = 11', docPayload);
  console.log(`deterministicResult=${q3.deterministicResult} verified=${q3.deterministicVerified}`);

  console.log('\n=== Q4: no document -> normal tutor ===');
  const q4 = await ask('مجھے algebra سمجھاؤ');
  console.log(q4.answer.slice(0, 200));
  console.log(`source=${q4.meta?.responseSource}`);

  console.log('\n=== Q5: hint with no active problem (must ask, not placeholder) ===');
  const q5 = await ask('مجھے hint دو', { tutorMode: 'hint' });
  console.log(q5.answer);

  console.log('\n=== Q6: check-work with wrong answer ===');
  const q6 = await ask('x = 7', {
    tutorMode: 'check-work',
    userStep: 'x = 7',
    document: null,
  });
  console.log(q6.answer);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
