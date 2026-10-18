import assert from 'node:assert/strict';
import { createFixedWindowRateLimiter, isAuthorizationTokenValid } from '../src/services/requestSecurity';
import { buildContentSecurityPolicy, shouldSendContentSecurityPolicy } from '../src/services/contentSecurityPolicy';

const limiter = createFixedWindowRateLimiter({ limit: 2, windowMs: 1000 });
assert.equal(limiter.check('client-a', 100).allowed, true);
assert.equal(limiter.check('client-a', 200).allowed, true);
const blocked = limiter.check('client-a', 300);
assert.equal(blocked.allowed, false);
assert.equal(blocked.retryAfterSeconds, 1);
assert.equal(limiter.check('client-b', 300).allowed, true, 'limits are isolated by key');
assert.equal(limiter.check('client-a', 1100).allowed, true, 'a new window resets its counter');
assert.equal(isAuthorizationTokenValid(undefined, 'configured-secret'), false);
assert.equal(isAuthorizationTokenValid('configured-secret', undefined), false);
assert.equal(isAuthorizationTokenValid('wrong-secret', 'configured-secret'), false);
assert.equal(isAuthorizationTokenValid('configured-secret', 'configured-secret'), true);

// ---------------------------------------------------------------------------
// Content Security Policy
// ---------------------------------------------------------------------------
// The packaged renderer and the API share one local origin, and tutor answers,
// PDF text and OCR transcripts are all rendered into that page. A strict CSP is
// what keeps injected content from becoming script execution.
const csp = buildContentSecurityPolicy();
for (const directive of [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'none'",
  "frame-ancestors 'none'",
]) {
  assert.ok(csp.includes(directive), `CSP must contain "${directive}" (got: ${csp})`);
}
assert.ok(!csp.includes('unsafe-eval'), 'CSP must not allow unsafe-eval');
assert.ok(!/script-src[^;]*unsafe-inline/.test(csp), 'inline scripts must stay blocked');
assert.ok(!/connect-src[^;]*\*/.test(csp), 'the policy must not connect to arbitrary origins');

// Dev mode serves the app through the Vite middleware (inline HMR client, hot
// module reload over a websocket), so the policy is production-only by design.
assert.equal(shouldSendContentSecurityPolicy({ NODE_ENV: 'production' }), true);
assert.equal(shouldSendContentSecurityPolicy({ NODE_ENV: 'development' }), false);
assert.equal(shouldSendContentSecurityPolicy({}), false);

console.log('Request security tests passed');
