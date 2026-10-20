/* Calcora AI offline asset cache.
 * Bump CACHE_VERSION when changing the cache policy or shell requirements.
 * Only same-origin static assets are cached; API/model/document responses are not.
 */
const CACHE_VERSION = 'v1';
const STATIC_CACHE = `calcora-static-${CACHE_VERSION}`;
const SHELL_CACHE = `calcora-shell-${CACHE_VERSION}`;
const STATIC_EXTENSIONS = /\.(?:js|mjs|css|woff2?|ttf|otf|eot|svg|png|jpe?g|webp|avif|ico|wasm)$/i;

const scopeUrl = new URL(self.registration.scope);
const shellUrl = new URL('./', scopeUrl).href;

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    // Cache the app entry point so a previously visited installation can open offline.
    try {
      const response = await fetch(shellUrl, { cache: 'reload' });
      if (response.ok && response.type !== 'opaque') {
        await cache.put(shellUrl, response.clone());
      }
    } catch {
      // Installation should still complete if the network is temporarily unavailable.
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keep = new Set([STATIC_CACHE, SHELL_CACHE]);
    const names = await caches.keys();
    await Promise.all(names
      .filter((name) => name.startsWith('calcora-static-') || name.startsWith('calcora-shell-'))
      .filter((name) => !keep.has(name))
      .map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navigations use the network when possible and fall back to the cached app shell.
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok && response.type !== 'opaque') {
          const cache = await caches.open(SHELL_CACHE);
          await cache.put(shellUrl, response.clone());
        }
        return response;
      } catch {
        const cache = await caches.open(SHELL_CACHE);
        return (await cache.match(request)) ||
          (await cache.match(shellUrl)) ||
          Response.error();
      }
    })());
    return;
  }

  // Cache-first only for static files (including Vite's hashed JS chunks and math modules).
  // API endpoints, user documents, model files, and other dynamic responses are excluded.
  if (!STATIC_EXTENSIONS.test(url.pathname)) return;

  event.respondWith((async () => {
    const cache = await caches.open(STATIC_CACHE);
    const cached = await cache.match(request);
    if (cached) return cached;

    const response = await fetch(request);
    if (response.ok && response.type !== 'opaque') {
      await cache.put(request, response.clone());
    }
    return response;
  })());
});
