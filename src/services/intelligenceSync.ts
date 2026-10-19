/**
 * Calcora AI - Phase 3A: Intelligence Sync Service
 *
 * File validation, extraction, chunking, indexing, and storage for:
 *   - PDF documents (.pdf)
 *   - Word documents (.docx)
 *   - Spreadsheets (.xlsx, .xls) and delimited tables (.csv, .tsv)
 *   - Markdown (.md), Plain text (.txt), HTML (.html, .htm)
 *   - Structured JSON (.json) and Source code (.ts, .py, .java, etc.)
 *
 * Enforces:
 *   - Size constraints (max 25 MB)
 *   - Magic-byte file validation (PDF header, Zip PK signature)
 *   - Ephemeral in-memory storage with explicit purge/invalidation
 *   - Location-preserving citations: [File | Page] or [File | Line] or [File | Sheet | Row]
 */

import { createHash } from 'node:crypto';
import * as XLSX from '@e965/xlsx';
import { parseDelimitedDataset, type ParsedDataset } from './delimitedData';
import { extractPdfText, type PdfDocumentLoader } from './pdfExtraction';

export const MAX_SYNC_DOCUMENT_BYTES = 25 * 1024 * 1024; // 25 MB
export const MAX_SYNC_CHUNKS = 2000;
export const SYNC_CHUNK_TARGET_CHARS = 800;

export type SupportedFormat =
  | 'pdf'
  | 'docx'
  | 'spreadsheet'
  | 'csv'
  | 'tsv'
  | 'markdown'
  | 'html'
  | 'json'
  | 'code'
  | 'text'
  | 'unknown';

export interface FileValidationResult {
  valid: boolean;
  format: SupportedFormat;
  contentHash: string;
  error?: string;
  warnings: string[];
}

export interface SyncSourceLocation {
  pageNumber?: number;
  lineNumberStart?: number;
  lineNumberEnd?: number;
  sheetName?: string;
  rowNumber?: number;
  sectionHeader?: string;
}

export interface SyncChunk {
  chunkId: string;
  documentId: string;
  fileName: string;
  location: SyncSourceLocation;
  text: string;
  charCount: number;
  citation: string;
}

export interface SyncDocumentMetadata {
  id: string;
  fileName: string;
  format: SupportedFormat;
  sizeBytes: number;
  contentHash: string;
  chunkCount: number;
  pageCount?: number;
  rowCount?: number;
  createdAt: number;
  status: 'indexing' | 'ready' | 'warning' | 'error';
  warnings: string[];
}

export interface SyncSearchResult {
  chunk: SyncChunk;
  score: number;
  matchedTerms: string[];
  citation: string;
}

export interface SyncTabularSummary {
  rowCount: number;
  columns: string[];
  numericColumns: string[];
  stats: Record<string, { min: number; max: number; sum: number; mean: number; count: number }>;
}

async function getNodePdfLoader(): Promise<PdfDocumentLoader | undefined> {
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

/**
 * Validates document buffer size, extension, MIME, and magic byte headers.
 */
export function validateDocumentFile(
  fileName: string,
  buffer: Uint8Array,
  mimeType?: string,
): FileValidationResult {
  const warnings: string[] = [];
  const contentHash = createHash('sha256').update(buffer).digest('hex');

  if (!buffer || buffer.byteLength === 0) {
    return { valid: false, format: 'unknown', contentHash, error: 'Document file is empty.', warnings };
  }

  if (buffer.byteLength > MAX_SYNC_DOCUMENT_BYTES) {
    return {
      valid: false,
      format: 'unknown',
      contentHash,
      error: `File size ${(buffer.byteLength / (1024 * 1024)).toFixed(1)} MB exceeds the ${MAX_SYNC_DOCUMENT_BYTES / (1024 * 1024)} MB limit.`,
      warnings,
    };
  }

  const ext = fileName.toLowerCase().split('.').pop() || '';
  let format: SupportedFormat = 'unknown';

  if (ext === 'pdf' || mimeType === 'application/pdf') format = 'pdf';
  else if (['docx'].includes(ext)) format = 'docx';
  else if (['xlsx', 'xls', 'ods'].includes(ext)) format = 'spreadsheet';
  else if (ext === 'csv') format = 'csv';
  else if (ext === 'tsv') format = 'tsv';
  else if (['md', 'markdown'].includes(ext)) format = 'markdown';
  else if (['html', 'htm'].includes(ext) || mimeType === 'text/html') format = 'html';
  else if (ext === 'json') format = 'json';
  else if (['ts', 'tsx', 'js', 'jsx', 'py', 'java', 'c', 'cpp', 'rs', 'go', 'sql', 'sh'].includes(ext)) format = 'code';
  else if (['txt', 'log', 'tex'].includes(ext)) format = 'text';

  // Magic bytes inspection
  if (format === 'pdf') {
    // %PDF- (0x25, 0x50, 0x44, 0x46, 0x2D)
    if (buffer[0] !== 0x25 || buffer[1] !== 0x50 || buffer[2] !== 0x44 || buffer[3] !== 0x46) {
      return { valid: false, format: 'pdf', contentHash, error: 'File header does not match a valid PDF (%PDF- signature missing).', warnings };
    }
  } else if (format === 'docx' || format === 'spreadsheet') {
    // PK\x03\x04 (0x50, 0x4B, 0x03, 0x04)
    if (buffer[0] !== 0x50 || buffer[1] !== 0x4B || buffer[2] !== 0x03 || buffer[3] !== 0x04) {
      if (format === 'docx') {
        return { valid: false, format: 'docx', contentHash, error: 'File header does not match a valid DOCX package (Zip signature missing).', warnings };
      }
    }
  }

  return { valid: true, format, contentHash, warnings };
}

/**
 * Generates verified source citation labels.
 */
export function formatSyncCitation(fileName: string, location: SyncSourceLocation): string {
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
 * Extracts plain text from DOCX files by reading document XML tags from the zip container.
 */
export function extractDocxTextSync(buffer: Uint8Array): { text: string; warnings: string[] } {
  const warnings: string[] = [];
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
    warnings.push(`DOCX extraction warning: ${err instanceof Error ? err.message : 'corrupted'}`);
  }
  return { text: '', warnings: ['Could not extract readable text from DOCX container.'] };
}

/**
 * Chunks text while preserving line numbers and section headers.
 */
export function chunkTextWithMetadata(
  documentId: string,
  fileName: string,
  text: string,
  options: { pageNumber?: number; targetChars?: number } = {},
): SyncChunk[] {
  const targetChars = options.targetChars || SYNC_CHUNK_TARGET_CHARS;
  const lines = text.split(/\r?\n/);
  const chunks: SyncChunk[] = [];

  let currentLines: string[] = [];
  let currentStart = 1;
  let currentChars = 0;
  let currentHeader: string | undefined;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    const headerMatch = line.match(/^#{1,4}\s+(.+)$/) || line.match(/^(?:function|class|def|interface)\s+([A-Za-z0-9_]+)/);
    if (headerMatch) {
      currentHeader = headerMatch[1].trim();
    }

    currentLines.push(line);
    currentChars += line.length + 1;

    if (currentChars >= targetChars || i === lines.length - 1) {
      const chunkText = currentLines.join('\n').trim();
      if (chunkText.length > 0) {
        const location: SyncSourceLocation = {
          pageNumber: options.pageNumber,
          lineNumberStart: currentStart,
          lineNumberEnd: lineNum,
          sectionHeader: currentHeader,
        };
        chunks.push({
          chunkId: `${documentId}-chunk-${chunks.length + 1}`,
          documentId,
          fileName,
          location,
          text: chunkText,
          charCount: chunkText.length,
          citation: formatSyncCitation(fileName, location),
        });
      }
      currentLines = [];
      currentChars = 0;
      currentStart = lineNum + 1;
    }
  }

  return chunks;
}

/**
 * Intelligence Sync Service: Manages document ingestion, chunk indexing, and storage.
 */
export class IntelligenceSyncService {
  private documents = new Map<string, SyncDocumentMetadata>();
  private chunks = new Map<string, SyncChunk[]>();
  private summaries = new Map<string, SyncTabularSummary>();

  public async ingestAndIndex(
    fileName: string,
    buffer: Uint8Array,
    options: { mimeType?: string; getDocument?: PdfDocumentLoader } = {},
  ): Promise<SyncDocumentMetadata> {
    const validation = validateDocumentFile(fileName, buffer, options.mimeType);
    if (!validation.valid) {
      throw new Error(validation.error || `File ${fileName} failed validation.`);
    }

    const { format, contentHash, warnings } = validation;
    const documentId = `sync-${contentHash.slice(0, 16)}`;
    const docChunks: SyncChunk[] = [];
    let pageCount: number | undefined;
    let rowCount: number | undefined;

    if (format === 'pdf') {
      const getDocument = options.getDocument || (await getNodePdfLoader());
      if (getDocument) {
        const pdfResult = await extractPdfText(buffer, { getDocument });
        pageCount = pdfResult.pageCount;
        if (pdfResult.warnings.length > 0) warnings.push(...pdfResult.warnings);

        for (const page of pdfResult.pages) {
          if (!page.text.trim()) continue;
          const pageChunks = chunkTextWithMetadata(documentId, fileName, page.text, { pageNumber: page.pageNumber });
          docChunks.push(...pageChunks);
        }
      } else {
        warnings.push('PDF parsing skipped: loader unavailable.');
      }
    } else if (format === 'docx') {
      const { text, warnings: docxWarnings } = extractDocxTextSync(buffer);
      warnings.push(...docxWarnings);
      docChunks.push(...chunkTextWithMetadata(documentId, fileName, text));
    } else if (format === 'csv' || format === 'tsv' || format === 'spreadsheet') {
      let dataset: ParsedDataset;
      if (format === 'csv' || format === 'tsv') {
        const text = new TextDecoder('utf-8').decode(buffer);
        dataset = parseDelimitedDataset(text, format === 'tsv' ? '\t' : ',');
      } else {
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = sheetName ? workbook.Sheets[sheetName] : undefined;
        const csvContent = sheet ? XLSX.utils.sheet_to_csv(sheet) : '';
        dataset = parseDelimitedDataset(csvContent, ',');
      }

      rowCount = dataset.rows.length;
      const headers = dataset.headers;
      const stats: SyncTabularSummary['stats'] = {};
      const numericColumns: string[] = [];

      for (let c = 0; c < headers.length; c += 1) {
        const col = headers[c];
        const nums: number[] = [];
        for (const row of dataset.rows) {
          const val = row[c];
          const num = val !== null && val !== undefined ? Number(val) : NaN;
          if (Number.isFinite(num)) nums.push(num);
        }
        if (nums.length > 0) {
          numericColumns.push(col);
          const min = Math.min(...nums);
          const max = Math.max(...nums);
          const sum = nums.reduce((a, b) => a + b, 0);
          stats[col] = { min, max, sum, mean: sum / nums.length, count: nums.length };
        }
      }

      this.summaries.set(documentId, {
        rowCount,
        columns: headers,
        numericColumns,
        stats,
      });

      // Group rows into chunks
      const ROWS_PER_CHUNK = 15;
      for (let r = 0; r < dataset.rows.length; r += ROWS_PER_CHUNK) {
        const rowSlice = dataset.rows.slice(r, r + ROWS_PER_CHUNK);
        const chunkText = [
          `Table headers: ${headers.join(' | ')}`,
          ...rowSlice.map((row, idx) => `Row ${r + idx + 1}: ${headers.map((h, c) => `${h}=${row[c] ?? ''}`).join(', ')}`),
        ].join('\n');

        const location: SyncSourceLocation = { sheetName: 'Sheet1', rowNumber: r + 1 };
        docChunks.push({
          chunkId: `${documentId}-row-${r + 1}-${r + rowSlice.length}`,
          documentId,
          fileName,
          location,
          text: chunkText,
          charCount: chunkText.length,
          citation: formatSyncCitation(fileName, location),
        });
      }
    } else {
      // Text, Markdown, HTML, JSON, Code
      const text = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
      docChunks.push(...chunkTextWithMetadata(documentId, fileName, text));
    }

    const metadata: SyncDocumentMetadata = {
      id: documentId,
      fileName,
      format,
      sizeBytes: buffer.byteLength,
      contentHash,
      chunkCount: docChunks.length,
      pageCount,
      rowCount,
      createdAt: Date.now(),
      status: warnings.length > 0 ? 'warning' : 'ready',
      warnings,
    };

    this.documents.set(documentId, metadata);
    this.chunks.set(documentId, docChunks);
    return metadata;
  }

  public search(query: string, options: { documentId?: string; topK?: number } = {}): SyncSearchResult[] {
    const topK = options.topK || 5;
    const terms = query
      .toLowerCase()
      .split(/[^a-z0-9_.\-]+/)
      .filter((t) => t.length > 1);

    if (terms.length === 0) return [];

    const candidates: SyncChunk[] = [];
    if (options.documentId) {
      candidates.push(...(this.chunks.get(options.documentId) || []));
    } else {
      for (const list of this.chunks.values()) {
        candidates.push(...list);
      }
    }

    const results: SyncSearchResult[] = [];
    for (const chunk of candidates) {
      const lower = chunk.text.toLowerCase();
      let score = 0;
      const matchedTerms: string[] = [];

      for (const term of terms) {
        if (lower.includes(term)) {
          matchedTerms.push(term);
          const count = lower.split(term).length - 1;
          score += 1 + Math.min(count, 4) * 0.5;
        }
      }

      if (score > 0) {
        results.push({
          chunk,
          score,
          matchedTerms,
          citation: chunk.citation,
        });
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topK);
  }

  public queryTabular(documentId: string, column: string, op: 'sum' | 'mean' | 'min' | 'max' | 'count'): number | null {
    const summary = this.summaries.get(documentId);
    if (!summary || !summary.stats[column]) return null;
    return summary.stats[column][op] ?? null;
  }

  public getDocument(id: string): SyncDocumentMetadata | undefined {
    return this.documents.get(id);
  }

  public getChunks(id: string): SyncChunk[] {
    return this.chunks.get(id) || [];
  }

  public listDocuments(): SyncDocumentMetadata[] {
    return Array.from(this.documents.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  public removeDocument(id: string): boolean {
    const had = this.documents.delete(id);
    this.chunks.delete(id);
    this.summaries.delete(id);
    return had;
  }

  public clearAll(): void {
    this.documents.clear();
    this.chunks.clear();
    this.summaries.clear();
  }
}

export const globalIntelligenceSync = new IntelligenceSyncService();
