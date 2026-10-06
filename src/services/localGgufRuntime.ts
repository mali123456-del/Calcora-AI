import { createHash } from 'node:crypto';
import { spawn as spawnChild, type ChildProcessWithoutNullStreams, type SpawnOptions } from 'node:child_process';
import { lstat, realpath, readdir } from 'node:fs/promises';
import { availableParallelism } from 'node:os';
import path from 'node:path';
import type { LocalModelGenerationRequest, LocalModelOption, LocalModelRole, LocalModelStatus } from '../ai/localModels';

const DEFAULT_CONTEXT_SIZE = 2048;
const MIN_CONTEXT_SIZE = 512;
const MAX_CONTEXT_SIZE = 8192;
const MAX_THREADS = 32;
const MAX_PROMPT_CHARS = 20_000;
const MAX_SYSTEM_PROMPT_CHARS = 6_000;
const MAX_OUTPUT_BYTES = 32 * 1024;
const MAX_OUTPUT_CHARS = 12_000;
const MAX_GENERATION_TOKENS = 320;
const DEFAULT_TIMEOUT_MS = 120_000;
const MIN_TIMEOUT_MS = 1_000;
const MAX_TIMEOUT_MS = 180_000;

export class LocalGgufRuntimeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LocalGgufRuntimeError';
  }
}

export interface LocalGgufRuntimeOptions {
  modelsDirectory?: string;
  llamaCliPath?: string;
  contextSize?: number;
  threads?: number;
  timeoutMs?: number;
  spawnProcess?: (command: string, args: readonly string[], options: SpawnOptions) => ChildProcessWithoutNullStreams;
}

function boundedInteger(value: string | number | undefined, fallback: number, min: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function configuredModelsDirectory(options: LocalGgufRuntimeOptions): string {
  const configured = options.modelsDirectory ?? process.env.CALCORA_MODELS_DIR;
  const appRoot = process.env.CALCORA_APP_ROOT?.trim() || process.cwd();
  return path.resolve(configured?.trim() || path.join(appRoot, 'models'));
}

function configuredLlamaCliPath(options: LocalGgufRuntimeOptions): string | null {
  const configured = options.llamaCliPath ?? process.env.CALCORA_LLAMA_CLI_PATH;
  if (!configured?.trim()) return null;
  const candidate = configured.trim();
  return path.isAbsolute(candidate) ? path.normalize(candidate) : null;
}

function configuredThreads(options: LocalGgufRuntimeOptions): number {
  const coreCount = availableParallelism();
  const safeDefault = Math.max(1, Math.min(4, coreCount - 1 || 1));
  return boundedInteger(options.threads ?? process.env.CALCORA_LLAMA_THREADS, safeDefault, 1, MAX_THREADS);
}

function configuredContextSize(options: LocalGgufRuntimeOptions): number {
  return boundedInteger(options.contextSize ?? process.env.CALCORA_LLAMA_CONTEXT_SIZE, DEFAULT_CONTEXT_SIZE, MIN_CONTEXT_SIZE, MAX_CONTEXT_SIZE);
}

function configuredTimeout(options: LocalGgufRuntimeOptions): number {
  return boundedInteger(options.timeoutMs ?? process.env.CALCORA_LOCAL_MODEL_TIMEOUT_MS, DEFAULT_TIMEOUT_MS, MIN_TIMEOUT_MS, MAX_TIMEOUT_MS);
}

function identifyRole(fileName: string): LocalModelRole {
  return /(?:^|[-_.])coder(?:[-_.]|$)/i.test(fileName) ? 'coding' : 'general';
}

function identifyModel(fileName: string, sizeBytes: number): LocalModelOption {
  const digest = createHash('sha256').update(`${fileName.toLowerCase()}\0${sizeBytes}`).digest('hex').slice(0, 16);
  return { id: `gguf-${digest}`, fileName, sizeBytes, role: identifyRole(fileName) };
}

async function isRegularFile(filePath: string): Promise<boolean> {
  try {
    const info = await lstat(filePath);
    return info.isFile() && !info.isSymbolicLink();
  } catch {
    return false;
  }
}

export function createLocalGgufRuntime(options: LocalGgufRuntimeOptions = {}) {
  const modelsDirectory = configuredModelsDirectory(options);
  const llamaCliPath = configuredLlamaCliPath(options);
  const contextSize = configuredContextSize(options);
  const threads = configuredThreads(options);
  const timeoutMs = configuredTimeout(options);
  const spawnProcess = options.spawnProcess ?? ((command, args, spawnOptions) =>
    spawnChild(command, [...args], spawnOptions) as ChildProcessWithoutNullStreams);
  let isGenerating = false;

  async function discoverModels(): Promise<{ available: boolean; models: LocalModelOption[] }> {
    try {
      const entries = await readdir(modelsDirectory, { withFileTypes: true });
      const models = await Promise.all(entries
        .filter((entry) => entry.isFile() && !entry.isSymbolicLink() && entry.name.toLowerCase().endsWith('.gguf'))
        .map(async (entry) => {
          try {
            const filePath = path.join(modelsDirectory, entry.name);
            const info = await lstat(filePath);
            if (!info.isFile() || info.isSymbolicLink() || !Number.isSafeInteger(info.size) || info.size <= 0) return null;
            return identifyModel(entry.name, info.size);
          } catch {
            return null;
          }
        }));
      return {
        available: true,
        models: models.filter((model): model is LocalModelOption => model !== null)
          .sort((a, b) => a.fileName.localeCompare(b.fileName)),
      };
    } catch {
      return { available: false, models: [] };
    }
  }

  async function getStatus(): Promise<LocalModelStatus> {
    const [modelResult, runtimeAvailable] = await Promise.all([
      discoverModels(),
      llamaCliPath ? isRegularFile(llamaCliPath) : Promise.resolve(false),
    ]);
    const diagnostic = !modelResult.available
      ? 'The models directory is unavailable. Set CALCORA_MODELS_DIR to a folder containing GGUF files.'
      : !llamaCliPath
        ? 'llama.cpp is not configured. Install it separately, then set CALCORA_LLAMA_CLI_PATH to the absolute path of llama-cli.'
        : !runtimeAvailable
          ? 'The configured llama.cpp CLI is unavailable. Check CALCORA_LLAMA_CLI_PATH.'
          : modelResult.models.length === 0
            ? 'No GGUF models were found in the configured models directory.'
            : undefined;

    return {
      runtime: runtimeAvailable ? 'llama.cpp' : 'none',
      runtimeAvailable,
      modelsDirectoryAvailable: modelResult.available,
      models: modelResult.models,
      diagnostic,
    };
  }

  async function generate(request: LocalModelGenerationRequest, signal?: AbortSignal): Promise<string> {
    if (signal?.aborted) throw new LocalGgufRuntimeError('Local model request was cancelled.');
    const status = await getStatus();
    if (!status.runtimeAvailable || !llamaCliPath) {
      throw new LocalGgufRuntimeError(status.diagnostic || 'The llama.cpp runtime is unavailable.');
    }
    const selectedModel = status.models.find((model) => model.id === request.modelId);
    if (!selectedModel) throw new LocalGgufRuntimeError('The selected local model is no longer available.');

    // Model IDs are resolved only against the current, flat directory manifest.
    // Symlinks and path-bearing names are rejected before the executable is started.
    if (path.basename(selectedModel.fileName) !== selectedModel.fileName) {
      throw new LocalGgufRuntimeError('The selected model entry is invalid.');
    }
    const modelPath = path.join(modelsDirectory, selectedModel.fileName);
    if (!(await isRegularFile(modelPath))) throw new LocalGgufRuntimeError('The selected GGUF file is unavailable.');
    try {
      const [rootRealPath, modelRealPath] = await Promise.all([realpath(modelsDirectory), realpath(modelPath)]);
      if (path.dirname(modelRealPath) !== rootRealPath) throw new LocalGgufRuntimeError('The selected GGUF file is outside the configured models directory.');
    } catch (error) {
      if (error instanceof LocalGgufRuntimeError) throw error;
      throw new LocalGgufRuntimeError('The selected GGUF file could not be resolved safely.');
    }

    const systemPrompt = typeof request.systemPrompt === 'string' ? request.systemPrompt.slice(0, MAX_SYSTEM_PROMPT_CHARS) : '';
    const prompt = typeof request.prompt === 'string' ? request.prompt.slice(0, MAX_PROMPT_CHARS) : '';
    if (!prompt.trim()) throw new LocalGgufRuntimeError('A non-empty prompt is required for local inference.');

    // llama.cpp reads the GGUF's embedded chat template by default. Arguments are
    // supplied as argv with shell=false; user and model text can never become a command.
    if (isGenerating) throw new LocalGgufRuntimeError('Another local model request is already running.');
    isGenerating = true;

    const args = [
      '-m', modelPath,
      '--simple-io',
      '-sys', systemPrompt,
      '-p', prompt,
      '-st',
      '-n', String(MAX_GENERATION_TOKENS),
      '-c', String(contextSize),
      '-t', String(threads),
      '--no-display-prompt',
    ];

    return new Promise<string>((resolve, reject) => {
      let settled = false;
      let stdoutBytes = 0;
      const stdout: string[] = [];
      let child: ChildProcessWithoutNullStreams;
      let timer: ReturnType<typeof setTimeout> | undefined;

      const cleanup = () => {
        if (timer) clearTimeout(timer);
        signal?.removeEventListener('abort', onAbort);
      };
      const finish = (error?: Error, value?: string) => {
        if (settled) return;
        settled = true;
        isGenerating = false;
        cleanup();
        if (error) reject(error);
        else resolve(value ?? '');
      };
      const terminate = () => {
        try { child.kill(); } catch { /* the process may already have exited */ }
      };
      const onAbort = () => {
        terminate();
        finish(new LocalGgufRuntimeError('Local model request was cancelled.'));
      };

      try {
        child = spawnProcess(llamaCliPath, args, {
          shell: false,
          windowsHide: true,
          stdio: ['ignore', 'pipe', 'pipe'],
        });
      } catch {
        finish(new LocalGgufRuntimeError('The llama.cpp CLI could not be started.'));
        return;
      }

      child.stdout.setEncoding('utf8');
      child.stderr.setEncoding('utf8');
      child.stderr.on('data', () => undefined);
      child.stdout.on('data', (chunk: string | Buffer) => {
        const text = String(chunk);
        stdoutBytes += Buffer.byteLength(text);
        if (stdoutBytes > MAX_OUTPUT_BYTES) {
          terminate();
          finish(new LocalGgufRuntimeError('The local model response exceeded the output limit.'));
          return;
        }
        stdout.push(text);
      });
      child.once('error', () => finish(new LocalGgufRuntimeError('The llama.cpp CLI could not be started.')));
      child.once('close', (code) => {
        if (code !== 0) {
          // Do not return stderr; runtimes sometimes echo user-provided prompt fragments.
          finish(new LocalGgufRuntimeError(`llama.cpp exited with code ${String(code ?? 'unknown')}.`));
          return;
        }
        const answer = stdout.join('').replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, '').trim().slice(0, MAX_OUTPUT_CHARS);
        if (!answer) {
          finish(new LocalGgufRuntimeError('llama.cpp returned an empty response.'));
          return;
        }
        finish(undefined, answer);
      });

      timer = setTimeout(() => {
        terminate();
        finish(new LocalGgufRuntimeError('Local model inference timed out; the deterministic Tutor remains available.'));
      }, timeoutMs);
      if (signal) {
        if (signal.aborted) onAbort();
        else signal.addEventListener('abort', onAbort, { once: true });
      }
    });
  }

  return { getStatus, generate };
}

export const localGgufRuntime = createLocalGgufRuntime();
