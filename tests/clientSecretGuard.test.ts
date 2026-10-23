import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Client secret-exposure guard.
 *
 * Vite bundles everything reachable from `src/main.tsx` into the browser. In a
 * browser, `process.env.X` is not substituted by Vite (only `import.meta.env.VITE_X`
 * is), so a secret read there evaluates to `undefined` rather than leaking today.
 * That is luck, not a guarantee: if a secret read sits in client-reachable code and
 * the build configuration ever changes (e.g. a `define` shim), it becomes a leak.
 *
 * This test walks the real static-import graph from `src/main.tsx` and asserts that
 * no reachable module reads a non-`VITE_` environment variable that looks like a
 * secret (service-role keys, provider API keys, tokens, passwords). Server-only
 * modules (imported from server.ts / electron / tests) are intentionally allowed to
 * read secrets.
 */

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..');
const entry = resolve(repoRoot, 'src/main.tsx');

// A secret-looking env name: not VITE_-prefixed (i.e. not intentionally public) and
// matching common secret vocabulary.
const SECRET_ENV = /process\.env\.([A-Z0-9_]*(?:SERVICE_ROLE|API_KEY|SECRET|TOKEN|PASSWORD|PASSWD|PRIVATE_KEY|CREDENTIAL)[A-Z0-9_]*)/g;

function resolveSpecifier(fromFile: string, spec: string): string | null {
  if (!spec.startsWith('.')) return null; // only relative imports stay in src/
  const base = resolve(dirname(fromFile), spec);
  const candidates = [
    base, // specifier already includes an extension (e.g. './App.tsx')
    `${base}.ts`,
    `${base}.tsx`,
    resolve(base, 'index.ts'),
    resolve(base, 'index.tsx'),
  ];
  for (const candidate of candidates) {
    try {
      readFileSync(candidate);
      return candidate;
    } catch {
      /* try next */
    }
  }
  return null;
}

const visited = new Set<string>();
const secretReads: Array<{ file: string; names: string[] }> = [];

function visit(file: string) {
  if (visited.has(file)) return;
  visited.add(file);
  let source: string;
  try {
    source = readFileSync(file, 'utf8');
  } catch {
    return;
  }

  const names = new Set<string>();
  for (const match of source.matchAll(SECRET_ENV)) {
    // Ignore env names that are actually VITE_-prefixed (matched only if the regex
    // crosses a boundary); Vite-injected public values are not secrets.
    if (!match[1].startsWith('VITE_')) names.add(match[1]);
  }
  if (names.size > 0) secretReads.push({ file: file.replace(repoRoot, '').replace(/\\/g, '/'), names: [...names] });

  // Follow static relative imports (both `import x from './y'` and `export ... from './y'`).
  const importRe = /(?:import|export)[\s\S]*?from\s+['"]([^'"]+)['"]/g;
  for (const match of source.matchAll(importRe)) {
    const next = resolveSpecifier(file, match[1]);
    if (next) visit(next);
  }
  // Also follow dynamic `import('./x')` reachable in the client bundle.
  const dynRe = /import\(\s*['"]([^'"]+)['"]\s*\)/g;
  for (const match of source.matchAll(dynRe)) {
    const next = resolveSpecifier(file, match[1]);
    if (next) visit(next);
  }
}

visit(entry);

assert.ok(visited.size > 0, 'expected to reach at least one module from src/main.tsx');
assert.deepEqual(
  secretReads,
  [],
  `client-reachable modules must not read secret env vars:\n${secretReads
    .map((r) => `${r.file} -> ${r.names.join(', ')}`)
    .join('\n')}`,
);

console.log(`Client secret-exposure guard passed (${visited.size} client-reachable modules scanned)`);
