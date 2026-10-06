import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

async function main() {
  const envKeys = [
    'NODE_ENV',
    'CALCORA_MANUAL_START',
    'CALCORA_PORT',
    'CALCORA_HOST',
    'CALCORA_DESKTOP',
    'CALCORA_ALLOW_PUBLIC_GEMINI',
    'CALCORA_ENABLE_INTELLIGENCE_SYNC',
    'CALCORA_LLAMA_CLI_PATH',
    'CALCORA_MODELS_DIR',
  ] as const;
  const originalEnv = new Map(envKeys.map((key) => [key, process.env[key]]));
  for (const key of envKeys) delete process.env[key];
  process.env.NODE_ENV = 'production';
  process.env.CALCORA_MANUAL_START = '1';
  process.env.CALCORA_PORT = '0';
  process.env.CALCORA_HOST = '127.0.0.1';
  process.env.CALCORA_DESKTOP = '1';
  process.env.CALCORA_ALLOW_PUBLIC_GEMINI = 'false';
  process.env.CALCORA_ENABLE_INTELLIGENCE_SYNC = 'false';
  process.env.CALCORA_LLAMA_CLI_PATH = '';
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), 'calcora-model-api-test-'));
  const modelsDirectory = path.join(temporaryRoot, 'models');
  await mkdir(modelsDirectory);
  await writeFile(path.join(modelsDirectory, 'qwen2.5-1.5b-instruct-q4_k_m.gguf'), 'test-model-general');
  await writeFile(path.join(modelsDirectory, 'qwen2.5-coder-1.5b-instruct-q4_k_m.gguf'), 'test-model-coding');
  process.env.CALCORA_MODELS_DIR = modelsDirectory;

  let server: Server | undefined;
  try {
    const { startServer } = await import('../server');
    server = await startServer();
    const address = server.address();
    assert.ok(address && typeof address === 'object');
    const baseUrl = `http://127.0.0.1:${address.port}`;

    const statusResponse = await fetch(`${baseUrl}/api/ai/local-models`);
    assert.equal(statusResponse.status, 200);
    const status = await statusResponse.json() as {
      runtime: string;
      runtimeAvailable: boolean;
      models: Array<{ id: string; fileName: string; role: string }>;
      diagnostic?: string;
    };
    assert.equal(status.runtime, 'none', 'this workstation has no configured llama.cpp CLI');
    assert.equal(status.runtimeAvailable, false);
    assert.equal(status.models.length, 2, 'model discovery does not depend on an installed inference runtime');
    assert.ok(status.models.some((model) => model.role === 'coding'));
    assert.ok(status.models.some((model) => model.role === 'general'));
    assert.ok(!JSON.stringify(status).includes(process.cwd()), 'the status endpoint does not disclose server paths');
    assert.match(status.diagnostic ?? '', /llama\.cpp is not configured/i);

    const selected = status.models[0];
    const tutorResponse = await fetch(`${baseUrl}/api/ai/math`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'What is 2 + 3?',
        tutorMode: 'assistant',
        language: 'en',
        offlineOnly: true,
        localModelId: selected.id,
      }),
    });
    assert.equal(tutorResponse.status, 200);
    const tutor = await tutorResponse.json() as {
      deterministicResult: string | null;
      deterministicVerified: boolean;
      verification: { state: string };
      isOfflineFallback: boolean;
      answer: string;
      meta: { responseSource: string; providerMessage?: string; requiresCloudApiKey: boolean };
    };
    assert.equal(tutor.deterministicResult, '5');
    assert.equal(tutor.deterministicVerified, true);
    assert.equal(tutor.verification.state, 'VERIFIED');
    assert.equal(tutor.isOfflineFallback, true);
    assert.equal(tutor.meta.responseSource, 'deterministic-fallback');
    assert.equal(tutor.meta.requiresCloudApiKey, false);
    assert.match(tutor.meta.providerMessage ?? '', /llama\.cpp is not configured/i);
    assert.doesNotMatch(tutor.answer, /Gemini.*required|requires.*API key/i);

    const invalidModelResponse = await fetch(`${baseUrl}/api/ai/math`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'What is 3 + 4?',
        tutorMode: 'assistant',
        language: 'en',
        offlineOnly: true,
        localModelId: 'gguf-0000000000000000',
      }),
    });
    assert.equal(invalidModelResponse.status, 200);
    const invalidModel = await invalidModelResponse.json() as {
      deterministicResult: string | null;
      deterministicVerified: boolean;
      verification: { state: string };
      meta: { responseSource: string; requiresCloudApiKey: boolean };
    };
    assert.equal(invalidModel.deterministicResult, '7');
    assert.equal(invalidModel.deterministicVerified, true);
    assert.equal(invalidModel.verification.state, 'VERIFIED');
    assert.equal(invalidModel.meta.responseSource, 'deterministic-fallback');
    assert.equal(invalidModel.meta.requiresCloudApiKey, false);
    console.log('Local model API integration tests passed');
  } finally {
    if (server) {
      await new Promise<void>((resolve) => server!.close(() => resolve()));
      server.closeAllConnections();
    }
    await rm(temporaryRoot, { recursive: true, force: true });
    for (const key of envKeys) {
      const original = originalEnv.get(key);
      if (original === undefined) delete process.env[key];
      else process.env[key] = original;
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
