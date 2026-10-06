/**
 * Minimal, dependency-free PDF fixtures for Calcora regression tests.
 *
 * Builds spec-compliant PDF 1.4 byte streams so tests exercise the real pdf.js
 * parser against real PDF bytes. No private or third-party documents are used.
 */

const encoder = new TextEncoder();

function escapePdfText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

interface PdfPageSpec {
  /** Lines drawn on the page, in reading order. */
  lines: string[];
}

/**
 * Assembles a valid PDF with a correct cross-reference table.
 * Object layout: 1=Catalog, 2=Pages, then (Page, Contents) pairs, then one Font.
 */
export function buildPdf(pages: PdfPageSpec[]): Uint8Array {
  const pageCount = pages.length;
  const fontObjId = 3 + pageCount * 2;

  const kids: string[] = [];
  for (let i = 0; i < pageCount; i += 1) {
    kids.push(`${3 + i * 2} 0 R`);
  }

  const objects: string[] = [];
  objects.push('<< /Type /Catalog /Pages 2 0 R >>');

  const pageObjectIds = pages.map((_, i) => 3 + i * 2);
  objects.push(
    `<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${pageCount} >>`,
  );

  pages.forEach((page, i) => {
    const pageId = pageObjectIds[i];
    const contentId = pageId + 1;
    const body = [
      'BT',
      '/F1 14 Tf',
      '72 760 Td',
      '16 TL',
      ...page.lines.map((line) => `(${escapePdfText(line)}) Tj T*`),
      'ET',
    ].join('\n');
    const stream = `${body}\n`;

    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] ` +
        `/Resources << /Font << /F1 ${fontObjId} 0 R >> >> /Contents ${contentId} 0 R >>`,
    );
    objects.push(`<< /Length ${encoder.encode(stream).length} >>\nstream\n${stream}endstream`);
  });

  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];

  objects.forEach((body, index) => {
    offsets.push(encoder.encode(pdf).length);
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });

  const xrefOffset = encoder.encode(pdf).length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (const offset of offsets) {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return encoder.encode(pdf);
}

/** A two-page document whose text is known verbatim to the assertions. */
export function buildAlgebraWorksheetPdf(): Uint8Array {
  return buildPdf([
    {
      lines: [
        'Calcora Algebra Worksheet',
        'A variable is a symbol that represents an unknown value.',
        'In the equation 2x + 3 = 11 the variable is x.',
      ],
    },
    {
      lines: [
        'Subtracting 3 from both sides gives 2x = 8.',
        'Dividing both sides by 2 gives x = 4.',
        'The coefficient of x in 2x is the number 2.',
      ],
    },
  ]);
}

/** A structurally valid PDF whose pages carry no text operators (scanned-like). */
export function buildImageOnlyPdf(pageCount = 1): Uint8Array {
  const objects: string[] = [];
  objects.push('<< /Type /Catalog /Pages 2 0 R >>');
  const kids = Array.from({ length: pageCount }, (_, i) => `${3 + i * 2} 0 R`);
  objects.push(`<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${pageCount} >>`);

  const fontObjId = 3 + pageCount * 2;
  for (let i = 0; i < pageCount; i += 1) {
    const pageId = 3 + i * 2;
    const contentId = pageId + 1;
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] ` +
        `/Resources << /Font << /F1 ${fontObjId} 0 R >> >> /Contents ${contentId} 0 R >>`,
    );
    // A page that only paints a filled rectangle: no text can be recovered.
    const stream = '0.9 0.9 0.9 rg\n72 72 400 600 re f\n';
    objects.push(`<< /Length ${encoder.encode(stream).length} >>\nstream\n${stream}endstream`);
  }
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((body, index) => {
    offsets.push(encoder.encode(pdf).length);
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefOffset = encoder.encode(pdf).length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return encoder.encode(pdf);
}

/** Bytes that are not a PDF at all. */
export function buildMalformedPdf(): Uint8Array {
  return encoder.encode('this is definitely not a pdf file, just plain text bytes');
}

/** Zero-length payload. */
export function buildEmptyPdf(): Uint8Array {
  return new Uint8Array(0);
}
