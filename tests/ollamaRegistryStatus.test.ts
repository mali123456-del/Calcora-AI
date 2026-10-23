/**
 * Ollama status-discovery tests (hybrid AI roadmap).
 *
 * The model manager must probe the configured Ollama endpoint for real,
 * report exactly what the /api/tags route says, and never synthesise
 * availability when the endpoint is unreachable.
 */
import { strict as assert } from 'node:assert';
import { UniversalModelManager } from '../src/services/universalModelManager';

const originalFetch = globalThis.fetch;

function withFetch(impl: typeof fetch): void {
  globalThis.fetch = impl as typeof fetch;
}

function pickOllamaRow(registry: Array<{ provider: string; models: Array<{ id: string; isAvailable: boolean; diagnostic?: string }> }>) {
  const row = registry.find((entry) => entry.provider === 'ollama');
  assert.ok(row, 'the registry carries an Ollama row');
  return row;
}

/* --- reachable endpoint: models come from the route itself --- */

try {
  withFetch((async () =>
    new Response(JSON.stringify({ models: [{ name: 'llama3.2:latest' }, { model: 'qwen2.5-math:1.5b' }, { name: 'llama3.2:latest' }] }), {
      status: 200,
    })) as unknown as typeof fetch);

  const manager = new UniversalModelManager();
  const registry = await manager.getProviderRegistryStatus();
  const ollamaRow = pickOllamaRow(registry);
  assert.equal(ollamaRow.models.length, 2, 'duplicate model names are de-duplicated');
  assert.equal(ollamaRow.models[0].id, 'ollama:llama3.2:latest');
  assert.equal(ollamaRow.models[0].isAvailable, true, 'discovered models are reported available (discovery only)');
  assert.ok(ollamaRow.models[0].diagnostic?.includes('/api/tags'), 'the claim is explicitly labeled as status discovery');
  assert.ok(registry.some((entry) => entry.provider === 'local-deterministic'), 'non-Ollama rows survive');
} finally {
  globalThis.fetch = originalFetch;
}

/* --- unreachable endpoint: honest unavailability --- */

try {
  withFetch((async () => {
    throw new Error('ECONNREFUSED');
  })) as unknown as typeof fetch;

  const manager = new UniversalModelManager();
  const registry = await manager.getProviderRegistryStatus();
  const ollamaRow = pickOllamaRow(registry);
  assert.equal(ollamaRow.models.length, 1);
  assert.equal(ollamaRow.models[0].isAvailable, false, 'unreachable Ollama is never reported available');
  assert.ok(ollamaRow.models[0].diagnostic?.includes('not reachable'), 'the diagnostic names the probe result');
  assert.ok(ollamaRow.models[0].diagnostic?.includes('http://127.0.0.1:11434'), 'the diagnostic names the configured endpoint');
} finally {
  globalThis.fetch = originalFetch;
}

/* --- HTTP failure status: surfaced as-is, never classified as available --- */

try {
  withFetch((async () => new Response('down', { status: 503 })) as unknown as typeof fetch);

  const manager = new UniversalModelManager();
  const registry = await manager.getProviderRegistryStatus();
  const ollamaRow = pickOllamaRow(registry);
  assert.equal(ollamaRow.models[0].isAvailable, false);
  assert.ok(ollamaRow.models[0].diagnostic?.includes('HTTP 503'));
} finally {
  globalThis.fetch = originalFetch;
}

console.log('Ollama status-discovery tests passed');
