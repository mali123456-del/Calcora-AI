import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

/**
 * Text-encoding integrity guard.
 *
 * A prior recovery repaired cp437 mojibake (`ΓÇ…`-style sequences) across several
 * source files. A separate, unrelated corruption was also found in
 * `vite.config.ts`: the UTF-8 bytes of an em dash (e2 80 94) had been decoded as
 * Latin-1, leaving `modifyâ<U+0080><U+0094>file`. Both classes are invisible in a
 * normal diff review, so this test scans every tracked text file and fails on the
 * unambiguous double-encoding signatures.
 *
 * It does not attempt any encoding rewrite; it only reports corruption so a human
 * can repair the specific file.
 */

// Signatures that cannot occur in legitimate project text.
//  - Latin-1 double-encoding: a lead byte (â=U+00E2, Ã=U+00C3, ð=U+00F0, Å=U+00C5)
//    immediately followed by a C1 control character (U+0080..U+009F) or a
//    CP437 glyph block (U+00A0..U+00BF).
//  - cp437 "gamma" run: Γ (U+0393) followed by a box-drawing/graphic glyph.
//  - The Unicode replacement character U+FFFD.
const C1_LEADS = [0x00e2, 0x00c3, 0x00f0, 0x00c5];

function findMojibake(text: string): string[] {
  const hits = new Set<string>();
  const points = Array.from(text, (ch) => ch.codePointAt(0)!);
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    if (C1_LEADS.includes(a) && ((b >= 0x0080 && b <= 0x009f) || (b >= 0x00a0 && b <= 0x00bf))) {
      hits.add(`U+${a.toString(16).toUpperCase()}+U+${b.toString(16).toUpperCase()}`);
    }
    if (a === 0x0393 && b >= 0x00c0 && b <= 0x00ff) {
      hits.add(`cp437 U+${a.toString(16).toUpperCase()}+U+${b.toString(16).toUpperCase()}`);
    }
  }
  if (points.includes(0xfffd)) hits.add('U+FFFD');
  return [...hits];
}

const TEXT_FILE = /\.(ts|tsx|js|jsx|mjs|cjs|json|md|css|html|yml|yaml|sql|txt|example|svg)$/i;

let gitAvailable = true;
let tracked: string[] = [];
try {
  const raw = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  tracked = raw.split('\u0000').filter(Boolean);
} catch {
  gitAvailable = false;
}

if (!gitAvailable) {
  console.log('Text encoding integrity tests skipped (git not available)');
} else {
  // Generated/bundled third-party text is not project source and is excluded.
  const excluded = /^(node_modules|dist|dist-electron|release|release-verify|win-unpacked|tools\/llama\.cpp)\//;
  const offenders: string[] = [];
  for (const file of tracked) {
    if (excluded.test(file)) continue;
    if (!TEXT_FILE.test(file)) continue;
    let text: string;
    try {
      text = readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    const hits = findMojibake(text);
    if (hits.length > 0) offenders.push(`${file} [${hits.join(', ')}]`);
  }

  assert.deepEqual(
    offenders,
    [],
    `tracked source contains mojibake and must be repaired individually:\n${offenders.join('\n')}`,
  );

  console.log(`Text encoding integrity tests passed (${tracked.length} tracked files scanned)`);
}
