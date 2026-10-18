/**
 * Full regression sweep.
 *
 * Runs every *.test.ts in tests/ and src/engine/tests/ (excluding scratch
 * probes) sequentially and prints a single pass/fail summary. Sequential on
 * purpose: several suites bind real ports and the local-model suites spawn
 * processes, so a parallel run would produce port collisions that look like
 * product failures.
 *
 * Usage: node scripts/run-test-sweep.mjs [name-filter]
 */
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const filter = process.argv[2] ?? '';

function collect(directory) {
  const absolute = path.join(projectRoot, directory);
  let entries = [];
  try {
    entries = readdirSync(absolute);
  } catch {
    return [];
  }
  return entries
    .filter((name) => name.endsWith('.test.ts'))
    .filter((name) => !name.startsWith('scratch'))
    .filter((name) => (filter ? name.includes(filter) : true))
    .map((name) => path.join(directory, name).replace(/\\/g, '/'));
}

const suites = [...collect('tests'), ...collect('src/engine/tests')];
console.log(`Regression sweep: ${suites.length} suites${filter ? ` matching "${filter}"` : ''}\n`);

const results = [];
const startedAll = Date.now();
for (const suite of suites) {
  const started = Date.now();
  // Resolve tsx's JavaScript entry directly: node_modules/.bin/tsx is a shell
  // script on POSIX and a .cmd wrapper on Windows, neither of which `node` can
  // execute.
  const tsxCli = path.join(projectRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs');
  const run = spawnSync(process.execPath, [tsxCli, suite], {
    cwd: projectRoot,
    encoding: 'utf8',
    env: process.env,
    maxBuffer: 32 * 1024 * 1024,
  });
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  const output = `${run.stdout ?? ''}${run.stderr ?? ''}`.trim();
  const passed = run.status === 0;
  results.push({ suite, passed, seconds, output });
  console.log(`${passed ? 'PASS' : 'FAIL'}  ${suite.padEnd(58)} ${seconds}s`);
  if (!passed) {
    const tail = output.split('\n').slice(-12).join('\n');
    console.log(tail.split('\n').map((line) => `      ${line}`).join('\n'));
  }
}

const failures = results.filter((result) => !result.passed);
console.log(`\nSweep complete in ${((Date.now() - startedAll) / 1000).toFixed(1)}s`);
console.log(`suites: ${results.length}, passed: ${results.length - failures.length}, failed: ${failures.length}`);
if (failures.length) {
  console.log('failed suites:');
  for (const failure of failures) console.log(`  - ${failure.suite}`);
  process.exit(1);
}
