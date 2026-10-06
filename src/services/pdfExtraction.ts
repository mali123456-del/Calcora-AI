/**
 * Calcora AI - Local PDF Text Extraction
 *
 * Parses PDF bytes with pdf.js and returns page-aware text. Extraction happens
 * entirely on the user's machine: no document content is uploaded anywhere.
 *
 * This module deliberately does not import pdf.js directly. The browser build and
 * the Node build of pdf.js are configured differently (the browser needs a worker
 * URL, Node does not), so the caller injects a ready-to-use `getDocument`.
 */

/** Hard ceiling on accepted document size, to protect the browser from a huge upload. */
export const MAX_PDF_BYTES = 25 * 1024 * 1024;

/** Hard ceiling on parsed pages; beyond this the document is rejected, not silently cut. */
export const MAX_PDF_PAGES = 200;

/** Below this many characters per page a document is treated as image-only. */
const OCR_CHARS_PER_PAGE_THRESHOLD = 20;

export type PdfErrorCode =
  | 'EMPTY_FILE'
  | 'TOO_LARGE'
  | 'TOO_MANY_PAGES'
  | 'ENCRYPTED'
  | 'MALFORMED'
  | 'UNSUPPORTED';

export interface PdfPageText {
  pageNumber: number;
  text: string;
  charCount: number;
}

export interface PdfExtractionResult {
  success: boolean;
  pages: PdfPageText[];
  pageCount: number;
  fullText: string;
  totalChars: number;
  /** True when pages parsed but carried no recoverable text (scanned pages). */
  needsOcr: boolean;
  /** Human-readable notes: page caps, sparse text, partial failures. */
  warnings: string[];
  error?: string;
  errorCode?: PdfErrorCode;
}

export interface PdfDocumentHandle {
  numPages: number;
  getPage: (pageNumber: number) => Promise<{
    getTextContent: () => Promise<{ items: Array<{ str?: string; hasEOL?: boolean }> }>;
  }>;
  destroy?: () => Promise<void> | void;
  cleanup?: () => Promise<void> | void;
}

export type PdfDocumentLoader = (params: unknown) => Promise<PdfDocumentHandle> | PdfLoadingTask;

export interface PdfLoadingTask {
  promise: Promise<PdfDocumentHandle>;
  destroy?: () => Promise<void> | void;
}

/**
 * pdf.js returns a loading task from `getDocument`. Depending on the version it is
 * either thenable or exposes `.promise`; normalise both into a document handle.
 */
async function resolveDocument(
  loaded: PdfDocumentHandle | PdfLoadingTask,
): Promise<PdfDocumentHandle> {
  const candidate = loaded as unknown as PdfDocumentHandle & PdfLoadingTask;
  if (candidate && typeof candidate.getPage !== 'function' && candidate.promise) {
    return candidate.promise;
  }
  return loaded as PdfDocumentHandle;
}

export interface ExtractPdfOptions {
  /** pdf.js `getDocument`, supplied by the environment-specific caller. */
  getDocument: PdfDocumentLoader;
  maxBytes?: number;
  maxPages?: number;
  /** Receives 0-100 while pages are parsed. */
  onProgress?: (percent: number, pageNumber: number, totalPages: number) => void;
}

function toBytes(data: ArrayBuffer | Uint8Array | ArrayBufferView): Uint8Array {
  if (data instanceof Uint8Array) return data;
  if (ArrayBuffer.isView(data)) {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  }
  return new Uint8Array(data);
}

function classifyError(error: unknown): { code: PdfErrorCode; message: string } {
  const name = (error as { name?: string })?.name ?? '';
  const raw = error instanceof Error ? error.message : String(error);

  if (name === 'PasswordException' || /password/i.test(raw)) {
    return { code: 'ENCRYPTED', message: 'This PDF is password-protected. Remove the password and try again.' };
  }
  if (name === 'InvalidPDFException' || /invalid pdf|structure/i.test(raw)) {
    return { code: 'MALFORMED', message: 'This file could not be read as a valid PDF.' };
  }
  if (name === 'MissingPDFException') {
    return { code: 'MALFORMED', message: 'This file is not a PDF.' };
  }
  if (name === 'UnexpectedResponseException') {
    return { code: 'UNSUPPORTED', message: 'This PDF uses a format Calcora cannot open.' };
  }
  return { code: 'MALFORMED', message: 'This PDF could not be read. It may be corrupt or incomplete.' };
}

/** Joins pdf.js text items into lines, honouring the end-of-line markers it emits. */
function itemsToText(items: Array<{ str?: string; hasEOL?: boolean }>): string {
  let out = '';
  for (const item of items) {
    const value = item?.str ?? '';
    out += value;
    if (item?.hasEOL) out += '\n';
  }
  // Collapse runs of blank lines and trailing whitespace, keep reading order.
  return out
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line, index, all) => line.length > 0 || (index > 0 && all[index - 1].length > 0))
    .join('\n')
    .trim();
}

/**
 * Extracts page-aware text from PDF bytes.
 *
 * Never throws: every failure mode is reported through the returned result so the
 * UI can show an honest state instead of inventing content.
 */
export async function extractPdfText(
  data: ArrayBuffer | Uint8Array | ArrayBufferView,
  options: ExtractPdfOptions,
): Promise<PdfExtractionResult> {
  const maxBytes = options.maxBytes ?? MAX_PDF_BYTES;
  const maxPages = options.maxPages ?? MAX_PDF_PAGES;
  const warnings: string[] = [];

  const failure = (code: PdfErrorCode, error: string): PdfExtractionResult => ({
    success: false,
    pages: [],
    pageCount: 0,
    fullText: '',
    totalChars: 0,
    needsOcr: false,
    warnings,
    error,
    errorCode: code,
  });

  let bytes: Uint8Array;
  try {
    bytes = toBytes(data);
  } catch {
    return failure('UNSUPPORTED', 'The selected file could not be read.');
  }

  if (bytes.byteLength === 0) {
    return failure('EMPTY_FILE', 'This file is empty.');
  }
  if (bytes.byteLength > maxBytes) {
    return failure(
      'TOO_LARGE',
      `This PDF is ${(bytes.byteLength / (1024 * 1024)).toFixed(1)} MB. The limit is ${(maxBytes / (1024 * 1024)).toFixed(0)} MB.`,
    );
  }

  let document: PdfDocumentHandle | null = null;
  try {
    const loaded = await options.getDocument({ data: bytes, isEvalSupported: false, useSystemFonts: true });
    document = await resolveDocument(loaded);
  } catch (error) {
    const { code, message } = classifyError(error);
    return failure(code, message);
  }

  try {
    const numPages = document?.numPages ?? 0;
    if (!numPages) {
      return failure('MALFORMED', 'This PDF contains no pages.');
    }
    if (numPages > maxPages) {
      return failure('TOO_MANY_PAGES', `This PDF has ${numPages} pages. The limit is ${maxPages} pages.`);
    }

    const pages: PdfPageText[] = [];

    for (let pageNumber = 1; pageNumber <= numPages; pageNumber += 1) {
      let text = '';
      try {
        const page = await document.getPage(pageNumber);
        const content = await page.getTextContent();
        text = itemsToText(content?.items ?? []);
      } catch (error) {
        // One unreadable page must not discard the rest of the document.
        warnings.push(`Page ${pageNumber} could not be read and was skipped.`);
        text = '';
      }
      pages.push({ pageNumber, text, charCount: text.length });
      options.onProgress?.(Math.round((pageNumber / numPages) * 100), pageNumber, numPages);
    }

    const totalChars = pages.reduce((sum, page) => sum + page.charCount, 0);
    const averageCharsPerPage = totalChars / Math.max(1, numPages);
    const needsOcr = totalChars === 0 || averageCharsPerPage < OCR_CHARS_PER_PAGE_THRESHOLD;

    if (needsOcr) {
      warnings.push(
        totalChars === 0
          ? 'No selectable text was found. This looks like a scanned document and needs OCR, which Calcora does not run.'
          : 'Very little text was found on these pages. This document may be scanned and would need OCR for a reliable explanation.',
      );
    }

    const fullText = pages
      .map((page) => (page.text ? `[Page ${page.pageNumber}]\n${page.text}` : `[Page ${page.pageNumber}]\n(no text)`))
      .join('\n\n');

    return {
      success: true,
      pages,
      pageCount: numPages,
      fullText,
      totalChars,
      needsOcr,
      warnings,
    };
  } catch (error) {
    const { code, message } = classifyError(error);
    return failure(code, message);
  } finally {
    try {
      await document?.destroy?.();
    } catch {
      // Releasing the parser is best-effort; never mask the real result.
    }
  }
}
