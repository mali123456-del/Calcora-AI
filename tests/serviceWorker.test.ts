import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const source = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8');
const listeners = new Map<string, (event: any) => void>();
const cacheNames = new Set<string>();
const cached = new Map<string, Response>();
const cache = {
  async match(request: Request | string) {
    return cached.get(typeof request === 'string' ? request : request.url);
  },
  async put(request: Request | string, response: Response) {
    cached.set(typeof request === 'string' ? request : request.url, response);
  },
};
const cachesMock = {
  async open(name: string) {
    cacheNames.add(name);
    return cache;
  },
  async keys() {
    return [...cacheNames];
  },
  async delete(name: string) {
    return cacheNames.delete(name);
  },
};
const selfMock = {
  registration: { scope: 'https://calcora.example/app/' },
  location: { origin: 'https://calcora.example' },
  clients: { claim: async () => undefined },
  addEventListener(name: string, listener: (event: any) => void) {
    listeners.set(name, listener);
  },
  skipWaiting: async () => undefined,
};
const fetchMock = async (request: Request | string) => {
  const url = typeof request === 'string' ? request : request.url;
  const isHtml = url.endsWith('/app/');
  const isPrivateResponse = url.includes('private-response');
  return new Response(isHtml ? '<!doctype html><div id="root"></div>' : 'static asset', {
    status: 200,
    headers: {
      'content-type': isHtml ? 'text/html' : 'application/javascript',
      ...(isPrivateResponse ? { 'cache-control': 'private, no-store' } : {}),
    },
  });
};

runInNewContext(source, {
  self: selfMock,
  caches: cachesMock,
  fetch: fetchMock,
  URL,
  Response,
  Set,
  Promise,
});

const runLifecycle = async (name: 'install' | 'activate') => {
  let pending: Promise<unknown> = Promise.resolve();
  listeners.get(name)?.({ waitUntil(value: Promise<unknown>) { pending = value; } });
  await pending;
};

await runLifecycle('install');
assert.ok(cached.has('https://calcora.example/app/'), 'install caches the scoped app shell');
cacheNames.add('calcora-static-v1');
cacheNames.add('unrelated-app-cache');
await runLifecycle('activate');
assert.equal(cacheNames.has('calcora-static-v1'), false, 'activation removes stale Calcora caches');
assert.equal(cacheNames.has('unrelated-app-cache'), true, 'activation leaves unrelated application caches untouched');

const dispatchFetch = async (request: Request) => {
  let responsePromise: Promise<Response> | undefined;
  listeners.get('fetch')?.({
    request,
    respondWith(value: Promise<Response>) { responsePromise = value; },
  });
  if (responsePromise) await responsePromise;
  return responsePromise;
};

const staticRequest = new Request('https://calcora.example/app/assets/main.js');
assert.ok(await dispatchFetch(staticRequest), 'same-origin Vite assets are intercepted');
assert.ok(cached.has(staticRequest.url), 'eligible JS is cached after a successful fetch');

const cachedBeforePrivateRequests = cached.size;
for (const path of [
  '/app/api/models/model.js',
  '/app/api/documents/private.pdf',
  '/app/auth/session.js',
  '/app/models/weights.js',
  '/app/private/document.js',
]) {
  assert.equal(await dispatchFetch(new Request(`https://calcora.example${path}`)), undefined, `${path} bypasses caches`);
}
assert.equal(cached.size, cachedBeforePrivateRequests, 'private and API paths never enter a cache');
assert.equal(await dispatchFetch(new Request('https://cdn.example/assets/main.js')), undefined, 'cross-origin assets bypass the worker cache');
assert.equal(await dispatchFetch(new Request('https://calcora.example/app/assets/private.js', {
  headers: { authorization: 'Bearer test-secret' },
})), undefined, 'authorized requests bypass the worker cache');
assert.equal(await dispatchFetch(new Request('https://calcora.example/app/assets/main.js', { method: 'POST' })), undefined, 'non-GET requests bypass the worker cache');

const privateResponseUrl = 'https://calcora.example/app/assets/private-response.js';
const cacheBeforeNoStoreResponse = cached.size;
assert.ok(await dispatchFetch(new Request(privateResponseUrl)), 'non-cacheable responses are still returned');
assert.equal(cached.size, cacheBeforeNoStoreResponse, 'private no-store responses are not cached');

console.log('Service-worker cache policy tests passed');
