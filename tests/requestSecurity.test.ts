import assert from 'node:assert/strict';
import { createFixedWindowRateLimiter, isAuthorizationTokenValid } from '../src/services/requestSecurity';

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
console.log('Request security tests passed');
