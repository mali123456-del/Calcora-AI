import * as XLSX from '@e965/xlsx';
import {
  MAX_DATASET_BYTES,
  MAX_DATASET_COLUMNS,
  MAX_DATASET_ROWS,
  parseDelimitedDataset,
  type DatasetCell,
  type ParsedDataset,
} from './delimitedData';

export {
  MAX_DATASET_BYTES,
  MAX_DATASET_COLUMNS,
  MAX_DATASET_ROWS,
  parseDelimitedDataset,
};
export type { DatasetCell, ParsedDataset };
export const MAX_XLSX_SHEETS = 20;
export const MAX_XLSX_EXPANDED_BYTES = 50 * 1024 * 1024;
const MAX_XLSX_ARCHIVE_ENTRIES = 2048;

function assertXlsxArchiveLimits(bytes: Uint8Array): void {
  const buffer = bytes.buffer instanceof ArrayBuffer ? bytes.buffer : new Uint8Array(bytes).buffer;
  const view = new DataView(buffer, bytes.byteOffset, bytes.byteLength);
  const minimumEndRecordLength = 22;
  const searchFrom = Math.max(0, bytes.byteLength - minimumEndRecordLength - 65_535);
  let endRecord = -1;
  for (let offset = bytes.byteLength - minimumEndRecordLength; offset >= searchFrom; offset -= 1) {
    if (view.getUint32(offset, true) === 0x06054b50) { endRecord = offset; break; }
  }
  if (endRecord < 0) throw new Error('This file is not a valid XLSX zip archive.');

  const entryCount = view.getUint16(endRecord + 10, true);
  const centralDirectorySize = view.getUint32(endRecord + 12, true);
  let cursor = view.getUint32(endRecord + 16, true);
  if (entryCount > MAX_XLSX_ARCHIVE_ENTRIES || cursor + centralDirectorySize > endRecord) {
    throw new Error('XLSX archive structure exceeds safe import limits.');
  }

  let expandedBytes = 0;
  for (let entry = 0; entry < entryCount; entry += 1) {
    if (cursor + 46 > endRecord || view.getUint32(cursor, true) !== 0x02014b50) {
      throw new Error('XLSX archive contains an invalid directory record.');
    }
    const compressedBytes = view.getUint32(cursor + 20, true);
    const uncompressedBytes = view.getUint32(cursor + 24, true);
    const nameBytes = view.getUint16(cursor + 28, true);
    const extraBytes = view.getUint16(cursor + 30, true);
    const commentBytes = view.getUint16(cursor + 32, true);
    if (compressedBytes === 0xffffffff || uncompressedBytes === 0xffffffff) {
      throw new Error('ZIP64 XLSX archives are not supported by the bounded importer.');
    }
    expandedBytes += uncompressedBytes;
    if (expandedBytes > MAX_XLSX_EXPANDED_BYTES) {
      throw new Error(`XLSX expanded content exceeds the ${MAX_XLSX_EXPANDED_BYTES / (1024 * 1024)} MB safety limit.`);
    }
    cursor += 46 + nameBytes + extraBytes + commentBytes;
  }
}

export function parseXlsxDataset(
  bytes: Uint8Array,
  maxBytes = MAX_DATASET_BYTES,
): ParsedDataset {
  if (bytes.byteLength === 0) throw new Error('XLSX file is empty.');
  if (bytes.byteLength > maxBytes) {
    throw new Error(`Dataset exceeds the ${Math.floor(maxBytes / (1024 * 1024))} MB size limit.`);
  }
  assertXlsxArchiveLimits(bytes);

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(bytes, { type: 'array', cellFormula: false, cellHTML: false });
  } catch {
    throw new Error('This file is not a readable XLSX workbook.');
  }

  if (!workbook.SheetNames.length) throw new Error('XLSX workbook contains no worksheets.');
  if (workbook.SheetNames.length > MAX_XLSX_SHEETS) {
    throw new Error(`XLSX workbook exceeds ${MAX_XLSX_SHEETS} worksheets.`);
  }

  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  if (!sheet || !sheet['!ref']) throw new Error('The first XLSX worksheet is empty.');

  let range: XLSX.Range;
  try {
    range = XLSX.utils.decode_range(sheet['!ref']);
  } catch {
    throw new Error('The XLSX worksheet has an invalid used range.');
  }
  const rowCount = range.e.r - range.s.r + 1;
  const columnCount = range.e.c - range.s.c + 1;
  if (rowCount > MAX_DATASET_ROWS + 1 || columnCount > MAX_DATASET_COLUMNS) {
    throw new Error(`XLSX worksheet exceeds ${MAX_DATASET_ROWS} rows or ${MAX_DATASET_COLUMNS} columns.`);
  }

  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: false,
    blankrows: false,
    defval: '',
  });
  const source = serializeRows(rows.map((record) => record.map((value) => String(value ?? ''))));
  const parsed = parseDelimitedDataset(source, ',', maxBytes, 'xlsx');
  const warnings = [...parsed.warnings];
  if (workbook.SheetNames.length > 1) {
    warnings.push(`Imported first worksheet “${firstSheetName}”; ${workbook.SheetNames.length - 1} additional worksheet(s) were not imported.`);
  }
  return { ...parsed, warnings, sourceFormat: 'xlsx' };
}

function serializeRows(rows: string[][]): string {
  return rows.map((row) => row.map((value) => {
    const cell = value.replace(/"/g, '""');
    return /[",\r\n]/.test(cell) ? `"${cell}"` : cell;
  }).join(',')).join('\n');
}

export function serializeDataset(dataset: Pick<ParsedDataset, 'headers' | 'rows'>, delimiter = ','): string {
  const rows = [dataset.headers, ...dataset.rows.map((row) => row.map((cell) => cell ?? ''))];
  return rows.map((row) => row.map((value) => {
    const cell = String(value).replace(/"/g, '""');
    return cell.includes(delimiter) || /["\r\n]/.test(cell) ? `"${cell}"` : cell;
  }).join(delimiter)).join('\n');
}

export function parseDatasetFileName(fileName: string): 'csv' | 'tsv' | 'xlsx' | null {
  const extension = fileName.toLowerCase().split('.').pop();
  return extension === 'csv' || extension === 'tsv' || extension === 'xlsx' ? extension : null;
}
