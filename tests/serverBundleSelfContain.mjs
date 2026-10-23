/**
 * Packaging regression (batch 6): the production server bundle must be
 * self-contained.
 *
 * The Windows desktop package no longer ships node_modules (the electron-
 * builder dependency walk cannot resolve the junction-mounted node_modules
 * and previously shipped an incomplete copy, surfacing as the recovery
 * dialog "Calcora AI could not start" with a logged "Cannot find module
 * 'body-parser'"). This test copies dist/server.cjs into a directory with
 * NO node_modules on the require path and verifies the server still starts
 * and answers /api/health.
 *
 * Runs under plain node (not tsx): tsx's parent process interferes with the
 * spawned child (SIGTERM before startup completes).
 */
import { strict as assert } from 'node:assert';
import { spawn } from 'node:child_process';
import { copyFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const distServer = resolve(dirname(fileURLToPath(import.meta.url)), '../dist/server.cjs');
const workDir = mkdtempSync(join(tmpdir(), 'calcora-server-bundle-'));
const isolatedServer = join(workDir, 'server.cjs');
copyFileSync(distServer, isolatedServer);

const port = 39000 + Math.floor(Math.random() * 999);
const child = spawn(process.execPath, [isolatedServer], {
  cwd: workDir, // require() from server.cjs resolves against workDir: no node_modules there
  env: { ...process.env, CALCORA_PORT: String(port), NODE_ENV: 'production' },
  stdio: ['ignore', 'pipe', 'pipe'],
});

const stderrChunks = [];
const stdoutChunks = [];
child.stderr?.on('data', (d) => stderrChunks.push(String(d)));
child.stdout?.on('data', (d) => stdoutChunks.push(String(d)));

const healthUrl = `http://127.0.0.1:${port}/api/health`;
const deadline = Date.now() + 12_000;
let lastError = '';
let healthy = false;

child.on('error', (error) => { lastError = String(error); });
child.on('exit', (code, signal) => {
  if (!healthy) {
    lastError = `server exited early (code ${code}${signal ? `, signal ${signal}` : ''})\nstdout: ${stdoutChunks.join('').slice(0, 2000)}\nstderr: ${stderrChunks.join('').slice(0, 2000)}`;
  }
});

let rendered = '';
while (Date.now() < deadline) {
  try {
    const response = await fetch(healthUrl, { signal: AbortSignal.timeout(1500) });
    if (response.ok) {
      const body = await response.json();
      if (body.status === 'ok') { healthy = true; break; }
    }
  } catch (error) {
    rendered = String(error?.message ?? error);
  }
  await new Promise((r) => setTimeout(r, 400));
}

try { child.kill(); } catch { /* already gone */ }

// Give Windows a beat to release file locks, then clean best-effort: a
// leftover temp directory is never a test-failure condition.
await new Promise((r) => setTimeout(r, 400));
try {
  rmSync(workDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
} catch { /* best-effort */ }

if (!healthy) {
  if (rendered && !lastError) lastError = rendered;
}
assert.ok(healthy, `the isolated server bundle must serve /api/health. Last error: ${lastError}`);
console.log('Server self-containment packaging regression passed (no node_modules on the require path)');
