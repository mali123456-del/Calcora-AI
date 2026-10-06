/**
 * Node-side pdf.js loader for the test suites.
 *
 * `src/services/pdfExtraction.ts` deliberately does not import pdf.js itself: the browser
 * build and the Node build differ in how the worker is configured (the browser needs a
 * worker URL, Node does not), and importing the wrong one fails at runtime rather than at
 * compile time. The extraction service therefore accepts an injected, ready-to-use
 * `getDocument`, and this helper produces that for Node.
 *
 * Restored after an accidental deletion during the Wave 1 cleanup. The contract is fixed by
 * its three call sites (`pdfExtraction.test.ts`, `pdfTutorIntegration.test.ts`,
 * `liveVerification.ts`), which all do:
 *
 *     const getDocument = await loadNodePdfJs();
 *     await extractPdfText(bytes, { getDocument });
 */

import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

type PdfDocumentHandle = unknown;

export type NodeGetDocument = (params: unknown) => unknown;

/**
 * Absolute path to pdf.js's bundled standard fonts.
 *
 * Without this, pdf.js logs an "Ensure that the `standardFontDataUrl` API parameter is
 * provided" exception for every page. It does not fail extraction, but it floods the test
 * output and can mask real warnings.
 */
function standardFontDataUrl(): string {
  const require = createRequire(import.meta.url);
  const pkgJson = require.resolve('pdfjs-dist/package.json');
  return join(dirname(pkgJson), 'standard_fonts') + '/';
}

/**
 * Load pdf.js configured for Node and return its `getDocument`.
 *
 * The legacy/Node build is imported directly. In pdf.js 4+ that entry point is exposed at
 * `pdfjs-dist/legacy/build/pdf.mjs`, which works without a DOM and without a worker file.
 * `disableWorker` is requested so pdf.js does not try to spawn a worker that does not exist
 * in this environment.
 */
export async function loadNodePdfJs(): Promise<NodeGetDocument> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const getDocument = (pdfjs as { getDocument?: unknown }).getDocument;
  if (typeof getDocument !== 'function') {
    throw new Error('pdfjs-dist did not expose a getDocument function for Node');
  }

  // `isEvalSupported: false` avoids pdf.js's use of `Function`/eval, which some hardened
  // Node configurations reject. The test fixtures are simple text PDFs, so nothing here
  // depends on font metrics from evaluated code.
  const configured = getDocument as (params: Record<string, unknown>) => PdfDocumentHandle;
  return (params: unknown) =>
    configured({
      ...(params as Record<string, unknown>),
      disableWorker: true,
      isEvalSupported: false,
      useSystemFonts: false,
      standardFontDataUrl: standardFontDataUrl(),
    });
}
