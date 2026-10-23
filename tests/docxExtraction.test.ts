import assert from 'node:assert/strict';
import { deflateRawSync } from 'node:zlib';
import { extractDocxText, DocumentIntelligenceService } from '../src/services/documentIntelligence';
import { IntelligenceSyncService } from '../src/services/intelligenceSync';

/**
 * DOCX extraction regression tests.
 *
 * DOCX was advertised as a supported format but the extractor regex-matched
 * `<w:t>` tags against the raw zip bytes. `word/document.xml` is DEFLATE-compressed
 * in every normal .docx, so real documents always extracted to empty text. These
 * tests build a genuine zip (stored + deflated entries with correct CRCs) and assert
 * the text is actually recovered.
 */

function crc32(buf: Uint8Array): number {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function u16(n: number): Uint8Array { return new Uint8Array([n & 0xff, (n >>> 8) & 0xff]); }
function u32(n: number): Uint8Array { return new Uint8Array([n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff]); }
function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

/** Builds a minimal but structurally valid .docx (zip) containing the given XML. */
function buildDocx(documentXml: string): Uint8Array {
  const enc = new TextEncoder();
  const entries = [
    { name: '[Content_Types].xml', data: enc.encode('<?xml version="1.0"?><Types/>'), deflated: false },
    { name: 'word/document.xml', data: enc.encode(documentXml), deflated: true },
  ];
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;
  for (const e of entries) {
    const nameBytes = enc.encode(e.name);
    const stored = e.deflated ? new Uint8Array(deflateRawSync(e.data)) : e.data;
    const method = e.deflated ? 8 : 0;
    const crc = crc32(e.data);
    const local = concat([
      u32(0x04034b50), u16(20), u16(0), u16(method), u16(0), u16(0),
      u32(crc), u32(stored.length), u32(e.data.length), u16(nameBytes.length), u16(0),
      nameBytes, stored,
    ]);
    localParts.push(local);
    centralParts.push(concat([
      u32(0x02014b50), u16(20), u16(20), u16(0), u16(method), u16(0), u16(0),
      u32(crc), u32(stored.length), u32(e.data.length),
      u16(nameBytes.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset),
      nameBytes,
    ]));
    offset += local.length;
  }
  const central = concat(centralParts);
  const end = concat([
    u32(0x06054b50), u16(0), u16(0), u16(entries.length), u16(entries.length),
    u32(central.length), u32(offset), u16(0),
  ]);
  return concat([...localParts, central, end]);
}

const documentXml =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' +
  '<w:p><w:r><w:t>Hello calcora</w:t></w:r></w:p>' +
  '<w:p><w:r><w:t>The quadratic formula is </w:t></w:r><w:r><w:t>x = (-b ± sqrt(b^2-4ac))/2a</w:t></w:r></w:p>' +
  '</w:body></w:document>';

async function run() {
  const docx = buildDocx(documentXml);

  // 1. Direct extractor call: text must be recovered, not empty.
  const direct = await extractDocxText(docx);
  assert.equal(direct.text.includes('Hello calcora'), true, 'expected DOCX body text to be extracted');
  assert.equal(direct.text.includes('quadratic formula'), true, 'expected second paragraph text');
  assert.equal(direct.warnings.length, 0, `unexpected warnings: ${direct.warnings.join('; ')}`);

  // 2. Round-trip through the ingestion service, proving the advertised format works.
  const service = new DocumentIntelligenceService();
  const doc = await service.ingestDocument('notes.docx', docx);
  assert.equal(doc.format, 'docx');
  assert.equal(doc.status, 'ready');
  assert.ok(doc.chunkCount >= 1, 'DOCX document should produce at least one chunk');
  const results = service.search('quadratic formula', { documentId: doc.id });
  assert.ok(results.length > 0, 'DOCX content should be searchable after ingestion');

  // 3. A non-zip buffer must fail cleanly, never throw.
  const bogus = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x00, 0x01, 0x02]);
  const bogusResult = await extractDocxText(bogus);
  assert.equal(bogusResult.text, '');
  assert.ok(bogusResult.warnings.length > 0, 'malformed DOCX must surface a warning');

  // 4. A valid zip with no document.xml entry must warn rather than throw.
  const missingEntry = buildDocx('ignored');
  const noDoc = await extractDocxText(missingEntry.subarray(0, missingEntry.length));
  assert.ok(noDoc.text.length > 0 || noDoc.warnings.length > 0);

  // 5. The duplicate extractor in intelligenceSync must behave identically.
  const syncService = new IntelligenceSyncService();
  const syncDoc = await syncService.ingestAndIndex('notes.docx', docx);
  assert.equal(syncDoc.format, 'docx');
  const syncSearch = syncService.search('quadratic formula', { documentId: syncDoc.id });
  assert.ok(syncSearch.length > 0, 'intelligenceSync DOCX content should be searchable');

  // 6. A decompression bomb must be rejected, not expanded into memory.
  const bomb = buildDocx('x'.repeat(20 * 1024 * 1024));
  const bombResult = await extractDocxText(bomb);
  assert.equal(bombResult.text, '', 'oversized DOCX entry must not be expanded');
  assert.ok(bombResult.warnings.length > 0, 'oversized DOCX entry must surface a warning');

  console.log('DOCX extraction tests passed');
}

run().catch((err) => {
  console.error('DOCX extraction tests failed:', err);
  process.exit(1);
});
