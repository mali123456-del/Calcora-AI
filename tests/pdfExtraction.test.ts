/**
 * PDF extraction regression tests.
 *
 * Every case runs the real pdf.js parser against real PDF bytes produced by
 * tests/fixtures/pdfFixtures.ts. No cloud service and no private document is used.
 */
import assert from 'assert';
import {
  extractPdfText,
  MAX_PDF_BYTES,
  MAX_PDF_PAGES,
  type PdfExtractionResult,
} from '../src/services/pdfExtraction';
import { loadNodePdfJs } from './helpers/pdfNodeLoader';
import {
  buildAlgebraWorksheetPdf,
  buildImageOnlyPdf,
  buildMalformedPdf,
  buildEmptyPdf,
} from './fixtures/pdfFixtures';

let passed = 0;

function check(condition: boolean, message: string): void {
  if (!condition) throw new Error(`PDF regression failed: ${message}`);
  passed += 1;
}

async function main() {
  const getDocument = await loadNodePdfJs();

  // ---------------------------------------------------------------------
  // 1. A real text PDF yields its actual text, page by page.
  // ---------------------------------------------------------------------
  const worksheet: PdfExtractionResult = await extractPdfText(buildAlgebraWorksheetPdf(), { getDocument });
  check(worksheet.success, `text PDF should extract, got ${worksheet.errorCode ?? worksheet.error}`);
  check(worksheet.pageCount === 2, `expected 2 pages, got ${worksheet.pageCount}`);
  check(
    worksheet.pages[0].text.includes('A variable is a symbol'),
    `page 1 text missing, got: ${worksheet.pages[0].text.slice(0, 120)}`,
  );
  check(
    worksheet.pages[1].text.includes('Dividing both sides by 2 gives x = 4'),
    `page 2 text missing, got: ${worksheet.pages[1].text.slice(0, 120)}`,
  );
  check(!worksheet.needsOcr, 'a real text PDF must not be flagged as needing OCR');
  check(worksheet.totalChars > 100, `expected substantial text, got ${worksheet.totalChars} chars`);

  // ---------------------------------------------------------------------
  // 2. Page numbers are preserved and ordered.
  // ---------------------------------------------------------------------
  check(worksheet.pages[0].pageNumber === 1, 'first page must be numbered 1');
  check(worksheet.pages[1].pageNumber === 2, 'second page must be numbered 2');
  const pageOrder = worksheet.pages.map((p) => p.pageNumber);
  check(
    pageOrder.every((n, i) => n === i + 1),
    `pages must be in reading order, got ${pageOrder.join(',')}`,
  );

  // ---------------------------------------------------------------------
  // 3. A page that has no text is reported as scanned/OCR-needing, not faked.
  // ---------------------------------------------------------------------
  const scanned: PdfExtractionResult = await extractPdfText(buildImageOnlyPdf(2), { getDocument });
  check(scanned.success, 'a valid image-only PDF should parse structurally');
  check(scanned.pageCount === 2, `expected 2 pages, got ${scanned.pageCount}`);
  check(scanned.needsOcr, 'image-only PDF must be flagged as needing OCR');
  check(scanned.totalChars === 0, `image-only PDF must yield 0 chars, got ${scanned.totalChars}`);

  // ---------------------------------------------------------------------
  // 4. Malformed / empty / oversized inputs fail gracefully, never throw.
  // ---------------------------------------------------------------------
  const malformed = await extractPdfText(buildMalformedPdf(), { getDocument });
  check(!malformed.success, 'malformed PDF must not report success');
  check(
    malformed.errorCode === 'MALFORMED' || malformed.errorCode === 'UNSUPPORTED',
    `malformed PDF should classify as MALFORMED/UNSUPPORTED, got ${malformed.errorCode}`,
  );
  check(typeof malformed.error === 'string' && malformed.error.length > 0, 'malformed PDF needs an error message');
  check(malformed.pages.length === 0, 'malformed PDF must not return pages');

  const empty = await extractPdfText(buildEmptyPdf(), { getDocument });
  check(!empty.success, 'empty payload must not report success');
  check(empty.errorCode === 'EMPTY_FILE', `empty payload should be EMPTY_FILE, got ${empty.errorCode}`);

  const oversized = new Uint8Array(MAX_PDF_BYTES + 1024);
  const tooBig = await extractPdfText(oversized, { getDocument });
  check(!tooBig.success, 'oversized PDF must be rejected');
  check(tooBig.errorCode === 'TOO_LARGE', `oversized should be TOO_LARGE, got ${tooBig.errorCode}`);

  // ---------------------------------------------------------------------
  // 5. Progress reporting covers every page and finishes at 100%.
  // ---------------------------------------------------------------------
  const seen: number[] = [];
  await extractPdfText(buildAlgebraWorksheetPdf(), {
    getDocument,
    onProgress: (percent) => seen.push(percent),
  });
  check(seen.length >= 2, `expected progress callbacks, got ${seen.length}`);
  check(seen[seen.length - 1] === 100, `final progress must be 100, got ${seen[seen.length - 1]}`);
  check(
    seen.every((p, i) => i === 0 || p >= seen[i - 1]),
    'progress must be monotonic',
  );

  // ---------------------------------------------------------------------
  // 6. Page limit is enforced and reported rather than silently truncating.
  // ---------------------------------------------------------------------
  const manyPages = new Uint8Array(buildImageOnlyPdf(1)); // 1 page, within limits
  const withinLimit = await extractPdfText(manyPages, { getDocument, maxPages: MAX_PDF_PAGES });
  check(withinLimit.success, 'a document within the page limit should succeed');
  check(withinLimit.pageCount <= MAX_PDF_PAGES, 'page count must respect the limit');

  console.log(`PDF extraction tests passed: ${passed}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
