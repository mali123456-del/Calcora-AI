import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

/**
 * Repository hygiene guard.
 *
 * Calcora produces large generated output (Electron installers, unpacked app
 * bundles, native llama.cpp runtime DLLs). None of it belongs in source control.
 * A previous state had ~295 MB of installers and a `llama.cpp/` native runtime
 * sitting untracked-but-not-ignored at the repository root, one `git add -A`
 * away from being committed. This test fails loudly if that regresses.
 *
 * It is skipped automatically when git is unavailable so it never blocks a
 * source-only environment, but in CI and local development it always runs.
 */

function git(args: string[]): string {
  return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
}

let gitAvailable = true;
try {
  git(['rev-parse', '--is-inside-work-tree']);
} catch {
  gitAvailable = false;
}

if (!gitAvailable) {
  console.log('Repository hygiene tests skipped (git not available)');
} else {
  // 1. Paths that must never be tracked, expressed as gitignore patterns.
  const forbiddenPatterns = [
    'Calcora-AI-1.0.0-x64-setup.exe',
    'Calcora-AI-1.0.0-x64-portable.exe',
    'Calcora-AI-1.0.0-x64-setup.exe.blockmap',
    'latest.yml',
    'builder-debug.yml',
    'win-unpacked/Calcora AI.exe',
    'llama.cpp/ggml-base.dll',
    'release/Calcora-AI-1.0.0-x64-setup.exe',
  ];

  for (const pattern of forbiddenPatterns) {
    // `git check-ignore` exits 0 when the path IS ignored (good), non-zero otherwise.
    let ignored = false;
    try {
      git(['check-ignore', '--no-index', pattern]);
      ignored = true;
    } catch {
      ignored = false;
    }
    assert.equal(ignored, true, `expected build artifact to be git-ignored: ${pattern}`);
  }

  // 2. No tracked file may live under a generated-output directory.
  const tracked = git(['ls-files', '-z']).split('\u0000').filter(Boolean);
  const forbiddenTrackedRoots = [
    /^dist\//,
    /^dist-electron\//,
    /^release\//,
    /^release-verify\//,
    /^win-unpacked\//,
    /^llama\.cpp\//,
    /^node_modules\//,
  ];
  const offenders = tracked.filter((file) => forbiddenTrackedRoots.some((re) => re.test(file)));
  assert.deepEqual(
    offenders,
    [],
    `generated output must not be tracked (found ${offenders.length} file(s), e.g. ${offenders.slice(0, 3).join(', ')})`,
  );

  // 3. No tracked file may be a generated installer or a stray build artifact.
  //    A curated, license-documented native runtime bundle under `tools/llama.cpp/`
  //    is intentionally tracked and excluded from this rule.
  const curatedBundle = /^tools\/llama\.cpp\//;
  const binaryArtifacts = tracked.filter(
    (file) => !curatedBundle.test(file) && /\.(exe|blockmap|msi|dmg|AppImage|deb)$/i.test(file),
  );
  assert.deepEqual(
    binaryArtifacts,
    [],
    `installers must not be tracked (found ${binaryArtifacts.length}, e.g. ${binaryArtifacts.slice(0, 3).join(', ')})`,
  );

  // 4. Committed .env files must be examples only.
  const envFiles = tracked.filter((file) => /(^|\/)\.env/.test(file));
  const nonExampleEnv = envFiles.filter((file) => !file.endsWith('.env.example'));
  assert.deepEqual(
    nonExampleEnv,
    [],
    `only .env.example may be committed (found ${nonExampleEnv.join(', ')})`,
  );

  console.log('Repository hygiene tests passed');
}
