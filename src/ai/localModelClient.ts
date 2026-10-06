import type { LocalModelOption, LocalModelStatus } from './localModels';

const STATUS_ENDPOINT = '/api/ai/local-models';
const STATUS_TIMEOUT_MS = 2500;

function isLocalModelOption(value: unknown): value is LocalModelOption {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<LocalModelOption>;
  return typeof item.id === 'string'
    && /^gguf-[a-f0-9]{16}$/.test(item.id)
    && typeof item.fileName === 'string'
    && item.fileName.toLowerCase().endsWith('.gguf')
    && Number.isSafeInteger(item.sizeBytes)
    && Number(item.sizeBytes) > 0
    && (item.role === 'general' || item.role === 'coding');
}

function parseLocalModelStatus(value: unknown): LocalModelStatus {
  if (!value || typeof value !== 'object') throw new Error('Calcora returned an invalid local-model status.');
  const payload = value as Partial<LocalModelStatus>;
  if (
    typeof payload.runtimeAvailable !== 'boolean'
    || typeof payload.modelsDirectoryAvailable !== 'boolean'
    || (payload.runtime !== 'llama.cpp' && payload.runtime !== 'none')
    || !Array.isArray(payload.models)
    || !payload.models.every(isLocalModelOption)
    || payload.runtimeAvailable !== (payload.runtime === 'llama.cpp')
  ) {
    throw new Error('Calcora returned an invalid local-model status.');
  }

  return {
    runtime: payload.runtime,
    runtimeAvailable: payload.runtimeAvailable,
    modelsDirectoryAvailable: payload.modelsDirectoryAvailable,
    models: payload.models,
    diagnostic: typeof payload.diagnostic === 'string' ? payload.diagnostic.slice(0, 300) : undefined,
  };
}

export async function fetchLocalModelStatus(signal?: AbortSignal): Promise<LocalModelStatus> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), STATUS_TIMEOUT_MS);
  const abortFromCaller = () => controller.abort();
  signal?.addEventListener('abort', abortFromCaller, { once: true });

  try {
    const response = await fetch(STATUS_ENDPOINT, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Local model status returned HTTP ${response.status}.`);
    return parseLocalModelStatus(await response.json());
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abortFromCaller);
  }
}
