import assert from 'node:assert/strict';
import * as XLSX from '@e965/xlsx';
import { analyzeDataset } from '../src/services/dataAnalysis';
import {
  MAX_DATASET_BYTES,
  MAX_XLSX_EXPANDED_BYTES,
  parseDelimitedDataset,
  parseXlsxDataset,
} from '../src/services/dataImport';

const csv = parseDelimitedDataset('name,value,note\r\nAda,2,"contains, comma"\r\nBob,,"line 1\nline 2"\r\nCara,4,plain');
assert.deepEqual(csv.headers, ['name', 'value', 'note']);
assert.deepEqual(csv.rows[0], ['Ada', '2', 'contains, comma']);
assert.deepEqual(csv.rows[1], ['Bob', null, 'line 1\nline 2']);

const tsv = parseDelimitedDataset('x\ty\tlabel\n1\t2\tfirst\n3\t4', '\t');
assert.deepEqual(tsv.headers, ['x', 'y', 'label']);
assert.deepEqual(tsv.rows[1], ['3', '4', null]);
assert.ok(tsv.warnings.some((warning) => /irregular/i.test(warning)));

const mixed = parseDelimitedDataset('x,y,label\n1,2,first\n3,4,text');
const analyzed = analyzeDataset(mixed);
assert.equal(analyzed.points, 2);
assert.equal(analyzed.slope, 1);
assert.equal(analyzed.invalidCells, 0);
assert.throws(() => parseDelimitedDataset('a,b\n"unfinished,2'), /closing quote/i);
assert.throws(() => parseDelimitedDataset('123456', ',', 5), /size limit/i);

const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
  ['x', 'y', 'kind'],
  [1, 2, 'linear'],
  [2, 4, 'linear'],
]), 'Data');
const bytes = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as Uint8Array;
const xlsx = parseXlsxDataset(bytes);
assert.deepEqual(xlsx.headers, ['x', 'y', 'kind']);
assert.deepEqual(xlsx.rows[1], ['2', '4', 'linear']);
assert.throws(() => parseXlsxDataset(new Uint8Array()), /empty/i);
assert.throws(() => parseXlsxDataset(new Uint8Array(MAX_DATASET_BYTES + 1)), /size limit/i);
assert.throws(() => parseXlsxDataset(new TextEncoder().encode('not a zip archive')), /valid XLSX/i);
const archiveBomb = new Uint8Array(bytes);
const archiveView = new DataView(archiveBomb.buffer, archiveBomb.byteOffset, archiveBomb.byteLength);
let directoryEntry = -1;
for (let index = 0; index <= archiveBomb.byteLength - 4; index += 1) {
  if (archiveView.getUint32(index, true) === 0x02014b50) { directoryEntry = index; break; }
}
assert.notEqual(directoryEntry, -1, 'test workbook must contain a ZIP directory entry');
archiveView.setUint32(directoryEntry + 24, MAX_XLSX_EXPANDED_BYTES + 1, true);
assert.throws(() => parseXlsxDataset(archiveBomb), /expanded content/i);

console.log('Data import tests passed');
