/**
 * Local runtime platform policy (llama.cpp resolution).
 *
 * The model runtime abstraction is shared: Calcora speaks GGUF + a CLI
 * contract, not a platform. What genuinely differs is *where* the llama.cpp
 * binary lives and what it is called:
 *
 *   Windows  llama-completion.exe / llama-cli.exe, DLL-backed shims
 *   macOS    llama-completion / llama-cli, Gatekeeper may block downloads
 *   Linux    llama-completion / llama-cli, must carry the executable bit
 *
 * Those differences live here as pure, injectable functions so they can be
 * tested for all three platforms from one machine.
 */
import { access, lstat } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import path from 'node:path';

export interface ResolvedLocalRuntimeBinary {
  /** Absolute path to the CLI executable. */
  path: string;
  /** Whether the caller configured it explicitly or it was discovered. */
  source: 'configured' | 'well-known';
}

/** llama.cpp CLI names per platform, most preferred first. */
export function preferredLlamaBinaryNames(platform: string): string[] {
  return platform === 'win32'
    ? ['llama-completion.exe', 'llama-cli.exe']
    : ['llama-completion', 'llama-cli'];
}

/**
 * Directories that may contain a user-installed llama.cpp build, in priority
 * order. `CALCORA_LLAMA_DIR` always wins when set.
 */
export function wellKnownLlamaDirectories(
  platform: string,
  env: Record<string, string | undefined>,
  homeDirectory: string,
): string[] {
  const candidates: string[] = [];
  const explicitDirectory = env.CALCORA_LLAMA_DIR?.trim();
  if (explicitDirectory) candidates.push(explicitDirectory);
  candidates.push(path.join(homeDirectory, 'calcora-tools', 'llama.cpp'));
  if (platform === 'win32') {
    const localAppData = env.LOCALAPPDATA?.trim();
    if (localAppData) candidates.push(path.join(localAppData, 'calcora-tools', 'llama.cpp'));
    const programFiles = env.ProgramFiles?.trim();
    if (programFiles) candidates.push(path.join(programFiles, 'llama.cpp', 'bin'));
  } else if (platform === 'darwin') {
    candidates.push('/opt/homebrew/bin', '/usr/local/bin', path.join(homeDirectory, '.local', 'bin'));
  } else {
    candidates.push('/usr/local/bin', '/usr/bin', path.join(homeDirectory, '.local', 'bin'));
  }
  candidates.push(path.join(homeDirectory, 'llama.cpp', 'build', 'bin'));
  return [...new Set(candidates.map((entry) => path.normalize(entry)))];
}

async function isRegularFile(filePath: string): Promise<boolean> {
  try {
    const info = await lstat(filePath);
    return info.isFile() && !info.isSymbolicLink();
  } catch {
    return false;
  }
}

/**
 * True when the file exists and, on POSIX, is executable. On Windows there is no
 * executable bit, so existence is the whole test.
 */
export async function isExecutableRuntimeFile(
  filePath: string,
  platform: string,
  hasExecutableBit: (filePath: string) => Promise<boolean> = async (candidate) => {
    try {
      await access(candidate, fsConstants.X_OK);
      return true;
    } catch {
      return false;
    }
  },
): Promise<boolean> {
  if (!(await isRegularFile(filePath))) return false;
  if (platform === 'win32') return true;
  return hasExecutableBit(filePath);
}

/**
 * Resolves the llama.cpp CLI: an explicit configured path first, then the
 * per-platform well-known locations. Returns null rather than guessing, so the
 * caller can report an honest, platform-specific setup message.
 */
export async function resolveLocalRuntimeBinary(options: {
  platform: string;
  configuredPath?: string | undefined;
  homeDirectory: string;
  env: Record<string, string | undefined>;
  hasExecutableBit?: (filePath: string) => Promise<boolean>;
}): Promise<ResolvedLocalRuntimeBinary | null> {
  const { platform, configuredPath, homeDirectory, env } = options;
  const check = options.hasExecutableBit ?? (async (candidate: string) => {
    try {
      await access(candidate, fsConstants.X_OK);
      return true;
    } catch {
      return false;
    }
  });

  const configured = configuredPath?.trim();
  if (configured) {
    // A configured path is used as given; it is validated rather than searched.
    const absolute = path.isAbsolute(configured) ? path.normalize(configured) : path.resolve(homeDirectory, configured);
    if (await isExecutableRuntimeFile(absolute, platform, check)) {
      return { path: absolute, source: 'configured' };
    }
    return null;
  }

  for (const directory of wellKnownLlamaDirectories(platform, env, homeDirectory)) {
    for (const fileName of preferredLlamaBinaryNames(platform)) {
      const candidate = path.join(directory, fileName);
      if (await isExecutableRuntimeFile(candidate, platform, check)) {
        return { path: candidate, source: 'well-known' };
      }
    }
  }
  return null;
}

/** Honest, platform-specific instructions for enabling the local runtime. */
export function describeLocalRuntimeSetup(platform: string): string {
  if (platform === 'win32') {
    return 'llama.cpp is not configured. Install a llama.cpp Windows CPU build, then either '
      + 'place llama-completion.exe in <user profile>\\calcora-tools\\llama.cpp or set '
      + 'CALCORA_LLAMA_CLI_PATH to its absolute path (llama-cli.exe is also supported).';
  }
  if (platform === 'darwin') {
    return 'llama.cpp is not configured. Install it (for example `brew install llama.cpp`), then either '
      + 'place llama-completion in /usr/local/bin or /opt/homebrew/bin or set CALCORA_LLAMA_CLI_PATH to its '
      + 'absolute path. macOS Gatekeeper blocks downloaded binaries until approved, for example '
      + '`xattr -d com.apple.quarantine <path to llama-completion>`.';
  }
  return 'llama.cpp is not configured. Install it (distribution package or build), make sure the CLI is '
    + 'executable (`chmod +x <path to llama-completion>`), then either place it in /usr/local/bin or set '
    + 'CALCORA_LLAMA_CLI_PATH to its absolute path.';
}
