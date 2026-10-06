export const MAX_DATASET_BYTES = 10 * 1024 * 1024;
export const MAX_DATASET_ROWS = 50_000;
export const MAX_DATASET_COLUMNS = 100;

export type DatasetCell = string | null;

export interface ParsedDataset {
  headers: string[];
  rows: DatasetCell[][];
  warnings: string[];
  sourceFormat: 'csv' | 'tsv' | 'xlsx';
}

function assertByteLimit(text: string, maxBytes = MAX_DATASET_BYTES): void {
  if (new TextEncoder().encode(text).byteLength > maxBytes) {
    throw new Error(`Dataset exceeds the ${Math.floor(maxBytes / (1024 * 1024))} MB size limit.`);
  }
}

/** Parse RFC-4180-style CSV or TSV, preserving quoted separators and newlines. */
export function parseDelimitedDataset(
  source: string,
  delimiter = source.includes('\t') && !source.includes(',') ? '\t' : ',',
  maxBytes = MAX_DATASET_BYTES,
  sourceFormat: 'csv' | 'tsv' | 'xlsx' = delimiter === '\t' ? 'tsv' : 'csv',
): ParsedDataset {
  assertByteLimit(source, maxBytes);
  if (!source.trim()) throw new Error('Dataset is empty.');
  if (delimiter.length !== 1 || delimiter === '"' || delimiter === '\n' || delimiter === '\r') {
    throw new Error('Dataset delimiter is invalid.');
  }

  const text = source.replace(/^\uFEFF/, '');
  const records: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  let quoteClosed = false;

  const finishCell = () => {
    row.push(cell.trim());
    cell = '';
    quoteClosed = false;
    if (row.length > MAX_DATASET_COLUMNS) throw new Error(`Dataset exceeds ${MAX_DATASET_COLUMNS} columns.`);
  };
  const finishRow = () => {
    finishCell();
    if (row.some((value) => value !== '')) records.push(row);
    row = [];
    if (records.length > MAX_DATASET_ROWS + 1) throw new Error(`Dataset exceeds ${MAX_DATASET_ROWS} data rows.`);
  };

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (quoted) {
      if (character === '"') {
        if (text[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          quoted = false;
          quoteClosed = true;
        }
      } else {
        cell += character;
      }
      continue;
    }

    if (quoteClosed && character !== delimiter && character !== '\n' && character !== '\r' && !/[ \t]/.test(character)) {
      throw new Error('Unexpected character after a closing quote.');
    }
    if (character === '"') {
      if (cell.trim()) throw new Error('A quoted field must begin with a quote.');
      cell = '';
      quoted = true;
    } else if (character === delimiter) {
      finishCell();
    } else if (character === '\n' || character === '\r') {
      finishRow();
      if (character === '\r' && text[index + 1] === '\n') index += 1;
    } else if (!quoteClosed || !/[ \t]/.test(character)) {
      cell += character;
    }
  }

  if (quoted) throw new Error('Dataset contains a quoted field without a closing quote.');
  if (cell.length || row.length) finishRow();
  if (!records.length) throw new Error('Dataset contains no rows.');

  const first = records[0];
  const next = records[1] ?? [];
  const hasHeader = first.some((value, column) =>
    value !== '' && !Number.isFinite(Number(value)) && Number.isFinite(Number(next[column] ?? '')),
  ) || (records.length > 1 && first.some((value) => /^[\p{L}_][\p{L}\p{N}_ -]*$/u.test(value)) && next.some((value) => value !== ''));
  const width = Math.max(...records.map((record) => record.length));
  const suppliedHeaders = hasHeader ? first : [];
  const headers = Array.from({ length: width }, (_, column) =>
    suppliedHeaders[column]?.trim() || `Column ${column + 1}`,
  );
  const values = hasHeader ? records.slice(1) : records;
  const warnings: string[] = [];
  if (records.some((record) => record.length !== width)) {
    warnings.push('Irregular rows were padded with empty values to preserve their columns.');
  }
  const rows = values.map((record) => Array.from({ length: width }, (_, column) => record[column] || null));

  return { headers, rows, warnings, sourceFormat };
}
