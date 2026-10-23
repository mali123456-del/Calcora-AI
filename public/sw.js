/* Calcora AI offline app shell and static asset cache.
 * Bump CACHE_VERSION whenever the cache policy or shell requirements change.
 * API, authentication, document and model requests are always network-only.
 */
const CACHE_VERSION = 'v2';
const STATIC_CACHE = `calcora-static-${CACHE_VERSION}`;
const SHELL_CACHE = `calcora-shell-${CACHE_VERSION}`;
const STATIC_EXTENSIONS = /\.(?:js|mjs|css|woff2?|ttf|otf|eot|svg|png|jpe?g|webp|avif|ico)$/i;
const PRIVATE_PATH = /^(?:api|auth|oauth|account|accounts|documents|models|downloads|private)(?:\/|$)/i;

const scopeUrl = new URL(self.registration.scope);
const scopePath = scopeUrl.pathname.endsWith('/') ? scopeUrl.pathname : `${scopeUrl.pathname}/`;
const shellUrl = new URL('./', scopeUrl).href;

function isSensitiveRequest(request, url) {
  if (request.method !== 'GET' || url.origin !== self.location.origin) return true;
  if (request.headers?.has('authorization')) return true;
  const relativePath = url.pathname.startsWith(scopePath)
    ? url.pathname.slice(scopePath.length)
    : url.pathname.replace(/^\/+/, '');
  return PRIVATE_PATH.test(relativePath);
}

function isCacheableResponse(response) {
  if (!response.ok || response.type === 'opaque') return false;
  const cacheControl = response.headers.get('cache-control') || '';
  return !/(?:^|,)\s*(?:private|no-store|no-cache)\b/i.test(cacheControl)
    && response.headers.get('vary') !== '*';
}

function isStaticAsset(url) {
  if (!url.pathname.startsWith(scopePath)) return false;
  const relativePath = url.pathname.slice(scopePath.length);
  return (relativePath.startsWith('assets/') || relativePath === 'favicon.ico')
    && relativePath !== 'sw.js'
    && STATIC_EXTENSIONS.test(relativePath);
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    try {
      const response = await fetch(shellUrl, { cache: 'reload' });
      if (isCacheableResponse(response)) await cache.put(shellUrl, response.clone());
    } catch {
      // A previous worker/cache can remain available when installation is offline.
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
  const url = new URL(request.url);
  if (isSensitiveRequest(request, url)) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (isCacheableResponse(response) && response.headers.get('content-type')?.includes('text/html')) {
          const cache = await caches.open(SHELL_CACHE);
          await cache.put(shellUrl, response.clone());
        }
        return response;
      } catch {
        const cache = await caches.open(SHELL_CACHE);
        return (await cache.match(request)) || (await cache.match(shellUrl)) || Response.error();
      }
    })());
    return;
  }

  if (!isStaticAsset(url)) return;

  event.respondWith((async () => {
    const cache = await caches.open(STATIC_CACHE);
    const cached = await cache.match(request);
    if (cached) return cached;

    const response = await fetch(request);
    if (isCacheableResponse(response)) await cache.put(request, response.clone());
    return response;
  })());
});
