# Phase 3A: Document Intelligence Architecture & Specifications

## 1. Overview and Scope

Calcora AI Document Intelligence provides a bounded, multi-format, deterministic ingestion and retrieval pipeline. It enables mathematical reasoning, formula extraction, and evidence grounding across user-supplied files without sending private documents to cloud endpoints.

## 2. Supported Formats and Parser Engine

| Format | Extensions | Parser Engine | Extracted Information |
|---|---|---|---|
| **Portable Document Format** | `.pdf` | `pdfjs-dist` (local) | Page-indexed text, formula tokens, scanned document warning / OCR flags |
| **Workbooks & Spreadsheets** | `.xlsx`, `.xls`, `.ods` | `@e965/xlsx` | Sheet names, columns, rows, cell values, and deterministic statistical aggregations |
| **Delimited Data** | `.csv`, `.tsv` | `delimitedData.ts` (RFC-4180) | Table headers, column types, row records, min/max/mean/sum stats |
| **Structured Data** | `.json` | Native JSON parser | Key-value pairs, nested properties, schema fields |
| **Markup & Text** | `.md`, `.markdown`, `.txt` | Plain-text line reader | Section headers (`#`, `##`), line-numbered blocks |
| **Web Documents** | `.html`, `.htm` | Clean text extractor | Page title, heading hierarchies, sanitized body content |
| **Source Code** | `.ts`, `.py`, `.java`, `.cpp`, `.rs`, `.sql`, etc. | Syntax-aware line reader | Functions, interfaces, classes, line numbers |
| **Word Processing** | `.docx` | Zip central-directory reader; `word/document.xml` inflated with `DecompressionStream('deflate-raw')` then converted from WordprocessingML to text (paragraph/line breaks preserved) | Document paragraphs, headings |

## 3. Security Limits and Safety Bounds

- **Maximum Document Size:** 25 MB (`MAX_DOCUMENT_BYTES = 25 * 1024 * 1024`)
- **Maximum Chunks per Document:** 2,000 (`MAX_CHUNKS_PER_DOCUMENT = 2000`)
- **Target Chunk Size:** 800 characters with 100-character line boundary overlaps
- **Zip-Bomb Defenses:** Expanded size validation and entry count limits (for `.xlsx` and `.docx`). DOCX extraction additionally caps a single decompressed entry at 16 MB (`MAX_DOCX_ENTRY_BYTES`), rejecting the archive rather than expanding it.
- **Untrusted Context Guard:** Document text is treated as unprivileged data. System instructions or formatting overrides embedded in document text are stripped and disarmed before reaching inference.

## 4. Citation and Provenance Contract

Every extracted excerpt maintains precise provenance metadata:
- **Text Documents:** `[filename.ext | Line N-M]` or `[filename.ext | § Section Header]`
- **Paginated Documents (PDF):** `[filename.pdf | Page P]`
- **Tabular Datasets:** `[filename.csv | Sheet: S | Row R]`

## 5. Tabular Query Engine

In addition to text search, structured datasets support deterministic statistical operations:
- `sum(column)`: Exact summation of finite numerical entries
- `mean(column)`: Arithmetic average
- `min(column)` / `max(column)`: Extreme values
- `count(column)`: Non-null cell count
These operations are executed deterministically in TypeScript, avoiding floating-point or hallucination errors.

## 6. Lifecycle Management & Invalidation

Documents are stored ephemerally in-memory. Calling `DELETE /api/documents/:id` or `POST /api/privacy/purge` immediately invalidates:
1. Document metadata records
2. Text chunk arrays
3. Tabular summary caches
4. In-memory inverted search indexes
No document text persists on disk across session restarts.
