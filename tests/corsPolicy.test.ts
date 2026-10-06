/**
 * Cross-origin policy regression tests.
 *
 * A browser on any third-party site can issue a "simple" POST to Calcora's API and
 * make the server do work (deterministic solves, and — where Gemini is configured —
 * billable cloud calls). Without an explicit origin decision the request is still
 * *sent* even though the response cannot be read, so rate limiting and quota
 * protection alone are not a defence.
 *
 * These tests pin the policy that Calcora actually enforces:
 *   - same-origin and loopback callers are allowed
 *   - unknown cross-origin callers are rejected before any handler runs
 *   - configured origins are the only other allowed callers
 *   - desktop/loopback serving never depends on an origin allowlist
 */
import assert from 'node:assert/strict';
import {
  createOriginPolicy,
  isAllowedOrigin,
  parseAllowedOrigins,
  createCorsMiddleware,
} from '../src/services/corsPolicy';

function check(condition: boolean, message: string): void {
  if (!condition) throw new Error(`CORS policy regression failed: ${message}`);
}

// ---------------------------------------------------------------------------
// 1. Loopback origins are always allowed (desktop app and local development).
// ---------------------------------------------------------------------------
const policy = createOriginPolicy({ allowlist: [], serveDesktop: false });

check(isAllowedOrigin(policy, undefined), 'a request with no Origin header (same-origin navigation) is allowed');
check(isAllowedOrigin(policy, 'http://127.0.0.1:3000'), 'loopback IPv4 is allowed');
check(isAllowedOrigin(policy, 'http://127.0.0.1:4173'), 'loopback IPv4 on any port is allowed');
check(isAllowedOrigin(policy, 'http://localhost:5173'), 'localhost is allowed');
check(!isAllowedOrigin(policy, 'https://app.example.com'), 'an arbitrary https origin is NOT allowed by default');

// ---------------------------------------------------------------------------
// 2. Known hostile / third-party origins are rejected.
// ---------------------------------------------------------------------------
for (const hostile of [
  'https://evil.example.com',
  'https://calcora.attacker.io',
  'http://127.0.0.1.evil.com',          // loopback-looking hostname
  'https://127.0.0.1.evil.com',
  'http://127.0.0.1@evil.com',          // userinfo trick
  'null',
  '',
  'file:///etc/passwd',
  'https://localhost.evil.com',
]) {
  check(!isAllowedOrigin(policy, hostile), `origin must be rejected: ${JSON.stringify(hostile)}`);
}

// ---------------------------------------------------------------------------
// 3. Non-http(s) schemes and malformed values never pass.
// ---------------------------------------------------------------------------
check(!isAllowedOrigin(policy, 'javascript:alert(1)'), 'javascript: origin is rejected');
check(!isAllowedOrigin(policy, 'ws://127.0.0.1:3000'), 'ws: scheme is rejected');

// ---------------------------------------------------------------------------
// 4. An explicit allowlist is honoured, and only exact origins match.
// ---------------------------------------------------------------------------
const configured = createOriginPolicy({
  allowlist: ['https://calcora.app', 'https://app.calcora.app'],
  serveDesktop: false,
});
check(isAllowedOrigin(configured, 'https://calcora.app'), 'a configured origin is allowed');
check(isAllowedOrigin(configured, 'https://app.calcora.app'), 'every configured origin is allowed');
check(!isAllowedOrigin(configured, 'https://calcora.app.evil.com'), 'a lookalike host is not allowed');
check(!isAllowedOrigin(configured, 'https://calcora.app:8443'), 'a different port is not the same origin');
check(!isAllowedOrigin(configured, 'http://calcora.app'), 'a different scheme is not the same origin');

// ---------------------------------------------------------------------------
// 5. Desktop serving is loopback-only, so cross-origin callers stay blocked
//    even when an allowlist happens to be configured.
// ---------------------------------------------------------------------------
const desktop = createOriginPolicy({ allowlist: ['https://calcora.app'], serveDesktop: true });
check(isAllowedOrigin(desktop, 'http://127.0.0.1:3000'), 'desktop still serves its own loopback renderer');
check(!isAllowedOrigin(desktop, 'https://calcora.app'), 'desktop does not open a cross-origin hole for an allowlist');

// ---------------------------------------------------------------------------
// 6. Allowlist parsing is strict and ignores junk.
// ---------------------------------------------------------------------------
assert.deepEqual(parseAllowedOrigins('https://a.example, https://b.example'), ['https://a.example', 'https://b.example']);
assert.deepEqual(parseAllowedOrigins('  '), []);
assert.deepEqual(parseAllowedOrigins(undefined), []);
assert.deepEqual(parseAllowedOrigins('*'), []);
assert.deepEqual(parseAllowedOrigins('not-a-url,ftp://x'), []);
assert.deepEqual(parseAllowedOrigins('https://a.example,https://a.example'), ['https://a.example']);

// ---------------------------------------------------------------------------
// 7. Middleware: a rejected cross-origin request never reaches the handler,
//    and a rejected preflight is answered without invoking CORS headers.
// ---------------------------------------------------------------------------
{
  const middleware = createCorsMiddleware(policy);
  const configuredMiddleware = createCorsMiddleware(configured);
  let reached = 0;
  const run = (origin: string | undefined, method = 'POST', handler = middleware) =>
    new Promise<{ status: number; headers: Record<string, string>; next: boolean }>((resolve) => {
      const headers: Record<string, string> = {};
      const res = {
        headersSent: false,
        setHeader(name: string, value: string) { headers[name.toLowerCase()] = value; },
        getHeader(name: string) { return headers[name.toLowerCase()]; },
        removeHeader(name: string) { delete headers[name.toLowerCase()]; },
        status(code: number) { this.statusCode = code; return this; },
        json(body: unknown) { resolve({ status: (this as { statusCode?: number }).statusCode ?? 200, headers, next: false }); return this; },
        end() { resolve({ status: (this as { statusCode?: number }).statusCode ?? 200, headers, next: false }); return this; },
        statusCode: 200,
      };
      const req = { method, headers: { origin } } as never;
      const next = () => { reached += 1; resolve({ status: 200, headers, next: true }); };
      handler(req, res as never, next);
    });

  // Rejected cross-origin POST: 403, handler not reached.
  const blocked = await run('https://evil.example.com');
  check(blocked.status === 403, `cross-origin POST must be refused, got ${blocked.status}`);
  check(!blocked.next, 'a refused request must not continue to the route handler');
  check(!blocked.headers['access-control-allow-origin'], 'no CORS grant on a refused response');
  check(reached === 0, 'route handler must not execute for a refused cross-origin request');

  // Allowed same-origin POST: continues.
  const allowed = await run(undefined);
  check(allowed.next, 'a request without an Origin header continues to the handler');
  check(reached === 1, 'the handler ran exactly once for the allowed request');

  // Allowed explicit origin echoes back exactly that origin.
  const echoed = await run('https://calcora.app', 'OPTIONS', configuredMiddleware);
  check(echoed.status === 204, `preflight must answer 204, got ${echoed.status}`);
  check(echoed.headers['access-control-allow-origin'] === 'https://calcora.app', 'preflight grants the exact configured origin');
  check(/POST/.test(echoed.headers['access-control-allow-methods'] ?? ''), 'preflight advertises POST');
  check(/content-type/i.test(echoed.headers['access-control-allow-headers'] ?? ''), 'preflight advertises content-type');
  check(!echoed.next, 'a completed preflight does not continue to the handler');

  // Rejected preflight is refused too.
  const beforeRefuse = reached;
  const refusedPreflight = await run('https://evil.example.com', 'OPTIONS');
  check(refusedPreflight.status === 403, `cross-origin preflight must be refused, got ${refusedPreflight.status}`);
  check(reached === beforeRefuse, 'refused preflight does not reach the handler');
}

console.log('CORS policy tests passed');
