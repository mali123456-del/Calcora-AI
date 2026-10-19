/**
 * Calcora AI - Phase 3A: Document Intelligence Engine
 *
 * Universal bounded document parsing, location-preserving chunking,
 * lexical/semantic indexing, deterministic tabular queries, and lifecycle management.
 *
 * Supported formats:
 *   - PDF (.pdf) via existing pdfExtraction pipeline
 *   - Spreadsheets (.xlsx, .xls, .csv, .tsv) via delimitedData and @e965/xlsx
 *   - Structured text (.json, .html, .htm, .xml)
 *   - Markdown & Plain Text (.md, .txt, .rst)
 *   - Source code (.ts, .js, .py, .java, .c, .cpp, .cs, .go, .rs, .sql, .sh)
 *   - Word document text (.docx) via standard XML text stream extraction
 */

import { createHash } from 'node:crypto';
import * as XLSX from '@e965/xlsx';
import { parseDelimitedDataset, type ParsedDataset } from './delimitedData';
import { extractPdfText, type PdfDocumentLoader } from './pdfExtraction';

async function getNodePdfDocumentLoader(): Promise<PdfDocumentLoader | undefined> {
  try {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const getDoc = (pdfjs as { getDocument?: unknown }).getDocument;
    if (typeof getDoc === 'function') {
      return ((params: unknown) =>
        (getDoc as Function)({
          ...(params as Record<string, unknown>),
          disableWorker: true,
          isEvalSupported: false,
          useSystemFonts: false,
        })) as PdfDocumentLoader;
    }
  } catch {
    // Non-fatal fallback
  }
  return undefined;
}

export const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024; // 25 MB safety limit
export const MAX_CHUNKS_PER_DOCUMENT = 2000;
export const DEFAULT_CHUNK_SIZE_CHARS = 800;
export const DEFAULT_CHUNK_OVERLAP_CHARS = 100;

export type DocumentFormat =
  | 'pdf'
  | 'spreadsheet'
  | 'csv'
  | 'tsv'
  | 'json'
  | 'markdown'
  | 'html'
  | 'code'
  | 'docx'
  | 'text'
  | 'unknown';

export interface SourceLocation {
  pageNumber?: number;
  lineNumberStart?: number;
  lineNumberEnd?: number;
  sheetName?: string;
  rowNumber?: number;
  columnName?: string;
  sectionHeader?: string;
}

export interface DocumentChunk {
  chunkId: string;
  documentId: string;
  fileName: string;
  location: SourceLocation;
  text: string;
  tokenCountEstimate: number;
  charCount: number;
}

export interface DocumentMetadata {
  id: string;
  fileName: string;
  format: DocumentFormat;
  sizeBytes: number;
  contentHash: string;
  createdAt: number;
  pageCount?: number;
  sheetCount?: number;
  rowCount?: number;
  chunkCount: number;
  status: 'indexing' | 'ready' | 'warning' | 'error';
  warnings: string[];
}

export interface RetrievalResult {
  chunk: DocumentChunk;
  score: number;
  matchedTerms: string[];
  citation: string;
}

export interface TabularSummary {
  rowCount: number;
  columns: string[];
  numericColumns: string[];
  stats: Record<string, { min: number; max: number; sum: number; mean: number; count: number }>;
}

const STOPWORDS = new Set([
  'the', 'a', 'an', 'of', 'and', 'or', 'to', 'in', 'is', 'are', 'was', 'were', 'be',
  'for', 'on', 'with', 'as', 'at', 'by', 'it', 'this', 'that', 'these', 'those', 'from',
  'what', 'which', 'who', 'how', 'why', 'when', 'where', 'does', 'do', 'did', 'can',
  'you', 'me', 'my', 'i', 'we', 'us', 'about', 'tell', 'show', 'calculate', 'find',
]);

/**
 * Detects the document format from the file name extension and MIME type.
 */
export function detectDocumentFormat(fileName: string, mimeType?: string): DocumentFormat {
  const ext = fileName.toLowerCase().split('.').pop() || '';
  if (ext === 'pdf' || mimeType === 'application/pdf') return 'pdf';
  if (['xlsx', 'xls', 'ods'].includes(ext)) return 'spreadsheet';
  if (ext === 'csv') return 'csv';
  if (ext === 'tsv') return 'tsv';
  if (ext === 'json') return 'json';
  if (['md', 'markdown'].includes(ext)) return 'markdown';
  if (['html', 'htm'].includes(ext) || mimeType === 'text/html') return 'html';
  if (['docx'].includes(ext)) return 'docx';
  if (['ts', 'tsx', 'js', 'jsx', 'py', 'java', 'c', 'cpp', 'h', 'hpp', 'cs', 'go', 'rs', 'sql', 'sh', 'rb'].includes(ext)) {
    return 'code';
  }
  if (['txt', 'log', 'tex', 'asc'].includes(ext)) return 'text';
  return 'unknown';
}

/**
 * Generates formatted, precise source citations.
 */
export function formatCitation(fileName: string, location: SourceLocation): string {
  const parts: string[] = [fileName];
  if (location.sheetName) {
    if (location.rowNumber) parts.push(`Sheet: ${location.sheetName}, Row ${location.rowNumber}`);
    else parts.push(`Sheet: ${location.sheetName}`);
  } else if (location.pageNumber) {
    parts.push(`Page ${location.pageNumber}`);
  }
  if (location.sectionHeader) {
    parts.push(`§ ${location.sectionHeader}`);
  } else if (location.lineNumberStart) {
    if (location.lineNumberEnd && location.lineNumberEnd !== location.lineNumberStart) {
      parts.push(`Lines ${location.lineNumberStart}-${location.lineNumberEnd}`);
    } else {
      parts.push(`Line ${location.lineNumberStart}`);
    }
  }
  return `[${parts.join(' | ')}]`;
}

/**
 * Extracts plain text from DOCX files by reading document.xml from the zip container.
 */
export function extractDocxText(buffer: Uint8Array): { text: string; warnings: string[] } {
  const warnings: string[] = [];
  try {
    // DOCX is a zip archive with word/document.xml
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    // If XLSX reader can parse anything, try sheet text; otherwise fallback to XML parsing
    if (workbook && workbook.SheetNames.length > 0) {
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const text = XLSX.utils.sheet_to_txt(sheet);
      if (text.trim()) return { text, warnings };
    }
  } catch {
    // Expected if not spreadsheet
  }

  // Raw extraction of XML tags from zip buffer
  try {
    const raw = Buffer.from(buffer).toString('latin1');
    const matches = raw.match(/<w:t[^>]*>([^<]+)<\/w:t>/g);
    if (matches && matches.length > 0) {
      const text = matches
        .map((m) => m.replace(/<[^>]+>/g, ''))
        .join(' ')
        .replace(/\s+/g, ' ');
      return { text, warnings };
    }
  } catch (err) {
    warnings.push(`DOCX text extraction warning: ${err instanceof Error ? err.message : 'corrupted structure'}`);
  }

  return { text: '', warnings: ['Could not extract readable text from DOCX document.'] };
}

/**
 * Chunks text while preserving line numbers and heading context.
 */
export function chunkTextWithLines(
  documentId: string,
  fileName: string,
  fullText: string,
  options: { chunkSizeChars?: number; chunkOverlapChars?: number; pageNumber?: number } = {},
): DocumentChunk[] {
  const chunkSize = options.chunkSizeChars || DEFAULT_CHUNK_SIZE_CHARS;
  const lines = fullText.split(/\r?\n/);
  const chunks: DocumentChunk[] = [];

  let currentLines: string[] = [];
  let currentStartLine = 1;
  let currentChars = 0;
  let currentHeader: string | undefined = undefined;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Detect markdown or code headers
    const headerMatch = line.match(/^#{1,4}\s+(.+)$/) || line.match(/^(?:function|class|def|interface|type)\s+([A-Za-z0-9_]+)/);
    if (headerMatch) {
      currentHeader = headerMatch[1].trim();
    }

    currentLines.push(line);
    currentChars += line.length + 1;

    if (currentChars >= chunkSize || i === lines.length - 1) {
      const chunkText = currentLines.join('\n').trim();
      if (chunkText.length > 0) {
        const chunkIndex = chunks.length + 1;
        const location: SourceLocation = {
          lineNumberStart: currentStartLine,
          lineNumberEnd: lineNum,
          pageNumber: options.pageNumber,
          sectionHeader: currentHeader,
        };
        chunks.push({
          chunkId: `${documentId}-chunk-${chunkIndex}`,
          documentId,
          fileName,
          location,
          text: chunkText,
          charCount: chunkText.length,
          tokenCountEstimate: Math.ceil(chunkText.length / 4),
        });
      }

      currentLines = [];
      currentChars = 0;
      currentStartLine = lineNum + 1;
    }
  }

  return chunks;
}

/**
 * Parses and indexes a tabular dataset (CSV, TSV, XLSX) into structured chunks and numerical statistics.
 */
export function indexTabularDocument(
  documentId: string,
  fileName: string,
  buffer: Uint8Array,
  format: DocumentFormat,
): { chunks: DocumentChunk[]; summary: TabularSummary; warnings: string[] } {
  const warnings: string[] = [];
  const chunks: DocumentChunk[] = [];
  let dataset: ParsedDataset;

  if (format === 'csv' || format === 'tsv') {
    const text = new TextDecoder('utf-8').decode(buffer);
    dataset = parseDelimitedDataset(text, format === 'tsv' ? '\t' : ',');
  } else {
    // Excel workbook
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      return { chunks: [], summary: { rowCount: 0, columns: [], numericColumns: [], stats: {} }, warnings: ['Empty workbook'] };
    }
    const sheet = workbook.Sheets[firstSheetName];
    const csvContent = XLSX.utils.sheet_to_csv(sheet);
    dataset = parseDelimitedDataset(csvContent, ',');
  }

  const headers = dataset.headers;
  const rows = dataset.rows;

  // Calculate column stats
  const stats: TabularSummary['stats'] = {};
  const numericColumns: string[] = [];

  for (let c = 0; c < headers.length; c += 1) {
    const colName = headers[c];
    const nums: number[] = [];
    for (const row of rows) {
      const cellVal = row[c];
      const parsed = cellVal !== null && cellVal !== undefined ? Number(cellVal) : NaN;
      if (Number.isFinite(parsed)) {
        nums.push(parsed);
      }
    }
    if (nums.length > 0) {
      numericColumns.push(colName);
      const min = Math.min(...nums);
      const max = Math.max(...nums);
      const sum = nums.reduce((a, b) => a + b, 0);
      stats[colName] = {
        min,
        max,
        sum,
        mean: sum / nums.length,
        count: nums.length,
      };
    }
  }

  const summary: TabularSummary = {
    rowCount: rows.length,
    columns: headers,
    numericColumns,
    stats,
  };

  // Group rows into chunks of ~15 rows
  const ROWS_PER_CHUNK = 15;
  for (let r = 0; r < rows.length; r += ROWS_PER_CHUNK) {
    const rowSlice = rows.slice(r, r + ROWS_PER_CHUNK);
    const chunkText = [
      `Table columns: ${headers.join(' | ')}`,
      ...rowSlice.map((row, idx) => `Row ${r + idx + 1}: ${headers.map((col, c) => `${col}=${row[c] ?? ''}`).join(', ')}`),
    ].join('\n');

    chunks.push({
      chunkId: `${documentId}-row-${r + 1}-${r + rowSlice.length}`,
      documentId,
      fileName,
      location: {
        sheetName: 'Sheet1',
        rowNumber: r + 1,
      },
      text: chunkText,
      charCount: chunkText.length,
      tokenCountEstimate: Math.ceil(chunkText.length / 4),
    });
  }

  return { chunks, summary, warnings };
}

/**
 * Universal Document Collection and Indexer Store
 */
export class DocumentIntelligenceService {
  private documents = new Map<string, DocumentMetadata>();
  private chunks = new Map<string, DocumentChunk[]>();
  private summaries = new Map<string, TabularSummary>();

  /**
   * Safe document ingestion and parsing with size bounds and sanitization.
   */
  public async ingestDocument(
    fileName: string,
    buffer: Uint8Array,
    options: { mimeType?: string; getDocument?: PdfDocumentLoader } = {},
  ): Promise<DocumentMetadata> {
    if (buffer.byteLength > MAX_DOCUMENT_BYTES) {
      throw new Error(`File "${fileName}" exceeds max size of ${MAX_DOCUMENT_BYTES / (1024 * 1024)} MB.`);
    }

    const contentHash = createHash('sha256').update(buffer).digest('hex');
    const id = `doc-${contentHash.slice(0, 16)}`;
    const format = detectDocumentFormat(fileName, options.mimeType);
    const warnings: string[] = [];
    let docChunks: DocumentChunk[] = [];
    let pageCount: number | undefined;
    let rowCount: number | undefined;

    if (format === 'pdf') {
      const getDocument = options.getDocument || (await getNodePdfDocumentLoader());
      if (getDocument) {
        const pdfResult = await extractPdfText(buffer, { getDocument });
        pageCount = pdfResult.pageCount;
        if (pdfResult.warnings.length > 0) warnings.push(...pdfResult.warnings);

        for (const page of pdfResult.pages) {
          if (!page.text.trim()) continue;
          const pageChunks = chunkTextWithLines(id, fileName, page.text, { pageNumber: page.pageNumber });
          docChunks.push(...pageChunks);
        }
      } else {
        warnings.push('PDF document parsing was skipped (loader unavailable in current context).');
      }
    } else if (format === 'spreadsheet' || format === 'csv' || format === 'tsv') {
      const tabResult = indexTabularDocument(id, fileName, buffer, format);
      docChunks = tabResult.chunks;
      this.summaries.set(id, tabResult.summary);
      rowCount = tabResult.summary.rowCount;
      if (tabResult.warnings.length > 0) warnings.push(...tabResult.warnings);
    } else if (format === 'docx') {
      const { text, warnings: docxWarnings } = extractDocxText(buffer);
      warnings.push(...docxWarnings);
      docChunks = chunkTextWithLines(id, fileName, text);
    } else {
      // Text, Markdown, HTML, JSON, Code
      const text = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
      docChunks = chunkTextWithLines(id, fileName, text);
    }

    const meta: DocumentMetadata = {
      id,
      fileName,
      format,
      sizeBytes: buffer.byteLength,
      contentHash,
      createdAt: Date.now(),
      pageCount,
      rowCount,
      chunkCount: docChunks.length,
      status: warnings.length > 0 ? 'warning' : 'ready',
      warnings,
    };

    this.documents.set(id, meta);
    this.chunks.set(id, docChunks);
    return meta;
  }

  /**
   * Search within a specific document or across all ingested documents.
   */
  public search(
    query: string,
    options: { documentId?: string; topK?: number } = {},
  ): RetrievalResult[] {
    const topK = options.topK || 5;
    const terms = query
      .toLowerCase()
      .split(/[^a-z0-9_.\-]+/)
      .filter((t) => t.length > 1 && !STOPWORDS.has(t));

    if (terms.length === 0) return [];

    const candidates: DocumentChunk[] = [];
    if (options.documentId) {
      candidates.push(...(this.chunks.get(options.documentId) || []));
    } else {
      for (const list of this.chunks.values()) {
        candidates.push(...list);
      }
    }

    const results: RetrievalResult[] = [];

    for (const chunk of candidates) {
      const lower = chunk.text.toLowerCase();
      let score = 0;
      const matchedTerms: string[] = [];

      for (const term of terms) {
        if (lower.includes(term)) {
          matchedTerms.push(term);
          // Frequency weighting
          const count = lower.split(term).length - 1;
          score += 1 + Math.min(count, 5) * 0.5;
        }
      }

      // Bonus for math expressions or numbers
      if (/\b\d+(\.\d+)?\b/.test(query) && /\b\d+(\.\d+)?\b/.test(lower)) {
        score += 1.0;
      }

      if (score > 0) {
        results.push({
          chunk,
          score,
          matchedTerms,
          citation: formatCitation(chunk.fileName, chunk.location),
        });
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topK);
  }

  /**
   * Executes deterministic queries on structured tabular datasets.
   */
  public queryTabular(documentId: string, column: string, operation: 'sum' | 'mean' | 'min' | 'max' | 'count'): number | null {
    const summary = this.summaries.get(documentId);
    if (!summary || !summary.stats[column]) return null;
    const colStat = summary.stats[column];
    return colStat[operation] ?? null;
  }

  public getSummary(documentId: string): TabularSummary | undefined {
    return this.summaries.get(documentId);
  }

  public getDocument(documentId: string): DocumentMetadata | undefined {
    return this.documents.get(documentId);
  }

  public listDocuments(): DocumentMetadata[] {
    return Array.from(this.documents.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Reliable deletion of document, associated chunks, tabular index, and cached summaries.
   */
  public deleteDocument(documentId: string): boolean {
    const had = this.documents.delete(documentId);
    this.chunks.delete(documentId);
    this.summaries.delete(documentId);
    return had;
  }

  public clearAll(): void {
    this.documents.clear( );
    this.chunks.clear();
    this.summaries.clear();
  }
}

export const globalDocumentIntelligence = new DocumentIntelligenceService();
