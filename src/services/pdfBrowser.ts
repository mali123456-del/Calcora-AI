/**
 * Browser-side pdf.js wiring.
 *
 * Kept separate from `pdfExtraction` so the parsing logic stays environment-agnostic
 * and testable under Node. Vite resolves the `?url` import to a served asset, so the
 * worker is loaded from Calcora's own origin and the document bytes never leave the
 * user's machine.
 */
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { PdfDocumentLoader } from './pdfExtraction';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export const getBrowserPdfDocument = pdfjsLib.getDocument as unknown as PdfDocumentLoader;
