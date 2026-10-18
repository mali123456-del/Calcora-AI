import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { ChildProcessWithoutNullStreams, SpawnOptions } from 'node:child_process';
import { createLocalGgufRuntime, LocalGgufRuntimeError } from '../src/services/localGgufRuntime';
import { localExplanationMatchesDeterministicResult } from '../src/services/localExplanationGuard';

function fakeChildProcess() {
  const child = new EventEmitter() as EventEmitter & {
    stdin: PassThrough;
    stdout: PassThrough;
    stderr: PassThrough;
    kill: () => boolean;
  };
  child.stdin = new PassThrough();
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  child.kill = () => true;
  return child;
}

async function main() {
  const root = await mkdtemp(path.join(tmpdir(), 'calcora-gguf-test-'));
  try {
    const modelRoot = path.join(root, 'models');
    const executable = path.join(root, 'llama-cli.exe');
    const generalName = 'qwen2.5-1.5b-instruct-q4_k_m.gguf';
    const codingName = 'qwen2.5-coder-1.5b-instruct-q4_k_m.gguf';
    await mkdir(modelRoot);
    await writeFile(path.join(modelRoot, generalName), Buffer.from('GGUF-test-general'));
    await writeFile(path.join(modelRoot, codingName), Buffer.from('GGUF-test-coding'));
    await writeFile(executable, 'test executable placeholder', { mode: 0o755 });

    const runtime = createLocalGgufRuntime({
      modelsDirectory: modelRoot,
      llamaCliPath: executable,
      contextSize: 1,
      threads: 100,
      timeoutMs: 30_000,
      spawnProcess: () => {
        throw new Error('Default spawn must not be used in tests.');
      },
    });
    const status = await runtime.getStatus();
    assert.equal(status.runtimeAvailable, true);
    assert.equal(status.runtime, 'llama.cpp');
    assert.equal(status.modelsDirectoryAvailable, true);
    assert.equal(status.models.length, 2);
    assert.equal(status.models.find((model) => model.fileName === generalName)?.role, 'general');
    assert.equal(status.models.find((model) => model.fileName === codingName)?.role, 'coding');
    assert.ok(status.models.every((model) => /^gguf-[a-f0-9]{16}$/.test(model.id)));
    assert.ok(!JSON.stringify(status).includes(root), 'status must not reveal absolute filesystem paths');

    let capturedCommand = '';
    let capturedArgs: readonly string[] = [];
    let capturedOptions: SpawnOptions | undefined;
    let fakeChild = fakeChildProcess();
    let spawnCount = 0;
    const safeRuntime = createLocalGgufRuntime({
      modelsDirectory: modelRoot,
      llamaCliPath: executable,
      contextSize: 1,
      threads: 100,
      spawnProcess: (command, args, options) => {
        spawnCount += 1;
        capturedCommand = command;
        capturedArgs = args;
        capturedOptions = options;
        fakeChild = fakeChildProcess();
        return fakeChild as unknown as ChildProcessWithoutNullStreams;
      },
    });
    const chosen = status.models.find((model) => model.fileName === codingName)!;
    const generation = safeRuntime.generate({
      modelId: chosen.id,
      systemPrompt: 'Use the trusted deterministic result.',
      prompt: 'Explain 2 + 3.',
    });
    for (let attempt = 0; !capturedCommand && attempt < 100; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    assert.equal(capturedCommand, executable);
    assert.equal(capturedOptions?.shell, false, 'the process must not use a shell');
    assert.ok(capturedArgs.includes(path.join(modelRoot, codingName)), 'the model path comes from server discovery');
    assert.ok(capturedArgs.includes('512'), 'context size is clamped to its CPU-safe minimum');
    assert.ok(capturedArgs.includes('32'), 'thread count is clamped to the configured maximum');
    assert.ok(capturedArgs.includes('--simple-io'));
    assert.ok(capturedArgs.includes('--no-display-prompt'));
    assert.ok(capturedArgs.includes('320'), 'generation length is bounded');
    assert.ok(capturedArgs.includes('Explain 2 + 3.'), 'prompt is passed as a separate argv value');
    assert.ok(capturedArgs.includes('Use the trusted deterministic result.'), 'system instructions are passed as a separate argv value');
    fakeChild.stdout.write('Calcora deterministic answer: 5');
    fakeChild.emit('close', 0, null);
    assert.equal(await generation, 'Calcora deterministic answer: 5');

    // llama-completion.exe appends control markers that are not part of the answer.
    const markerGeneration = safeRuntime.generate({ modelId: chosen.id, systemPrompt: '', prompt: 'List three rules.' });
    while (spawnCount < 2) await new Promise((resolve) => setTimeout(resolve, 10));
    fakeChild.stdout.write('Rule one. Rule two. Rule three. [end of text]\r\n');
    fakeChild.emit('close', 0, null);
    assert.equal(await markerGeneration, 'Rule one. Rule two. Rule three.');

    // llama-cli.exe wraps the generation in an interactive console (banner,
    // prompt echo, perf line). Only the generated text may be returned.
    const consoleGeneration = safeRuntime.generate({ modelId: chosen.id, systemPrompt: '', prompt: 'Explain 2 + 3.' });
    while (spawnCount < 3) await new Promise((resolve) => setTimeout(resolve, 10));
    fakeChild.stdout.write([
      'Loading model...',
      'build      : b11500-097f5b533',
      'available commands:',
      '  /exit or Ctrl+C     stop or exit',
      '',
      '> Explain 2 + 3.',
      'The sum is 5.',
      '',
      '[ Prompt: 30.9 t/s | Generation: 10.3 t/s ]',
      'Exiting...',
      '',
    ].join('\r\n'));
    fakeChild.emit('close', 0, null);
    assert.equal(await consoleGeneration, 'The sum is 5.');

    await assert.rejects(
      safeRuntime.generate({ modelId: 'gguf-../../etc/passwd', systemPrompt: '', prompt: 'test' }),
      (error: unknown) => error instanceof LocalGgufRuntimeError && /no longer available/.test(error.message),
      'an unrecognized model ID must not resolve to a caller-selected path',
    );

    let killed = false;
    let timeoutChild = fakeChildProcess();
    const timeoutRuntime = createLocalGgufRuntime({
      modelsDirectory: modelRoot,
      llamaCliPath: executable,
      timeoutMs: 1,
      spawnProcess: (_command, _args, options) => {
        assert.equal(options.shell, false);
        timeoutChild = fakeChildProcess();
        timeoutChild.kill = () => { killed = true; return true; };
        return timeoutChild as unknown as ChildProcessWithoutNullStreams;
      },
    });
    await assert.rejects(
      timeoutRuntime.generate({ modelId: chosen.id, systemPrompt: '', prompt: 'wait' }),
      (error: unknown) => error instanceof LocalGgufRuntimeError && /timed out/.test(error.message),
    );
    assert.equal(killed, true, 'timeout must terminate the child process');

    assert.equal(localExplanationMatchesDeterministicResult('The answer is 5. 2 + 3 = 5.', '5'), true);
    assert.equal(localExplanationMatchesDeterministicResult('The answer is 6.', '5'), false);
    assert.equal(localExplanationMatchesDeterministicResult('x = -2, x = 3 are the roots.', '-2, 3'), true);
    assert.equal(localExplanationMatchesDeterministicResult('x = -2, x = 4 are the roots.', '-2, 3'), false);
    assert.equal(localExplanationMatchesDeterministicResult('A conceptual explanation has no number.', null), true);

    const absentRuntime = createLocalGgufRuntime({
      modelsDirectory: path.join(root, 'missing-models'),
      llamaCliPath: path.join(root, 'missing-llama-cli.exe'),
    });
    const absentStatus = await absentRuntime.getStatus();
    assert.equal(absentStatus.runtimeAvailable, false);
    assert.equal(absentStatus.modelsDirectoryAvailable, false);
    assert.match(absentStatus.diagnostic ?? '', /models directory is unavailable/i);
    console.log('Local GGUF runtime tests passed');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
