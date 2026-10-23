import assert from 'node:assert/strict';
import { adminApiTokenStatus, createAdminApiAuthorizationMiddleware, requiresAdminApiToken } from '../src/services/adminApiPolicy';

assert.equal(requiresAdminApiToken(true, '192.168.1.10'), false, 'desktop server is restricted to loopback by runtime policy');
assert.equal(requiresAdminApiToken(false, '127.0.0.1'), false, 'local development remains usable');
assert.equal(requiresAdminApiToken(false, '127.200.1.10'), false, 'the entire IPv4 loopback range is local');
assert.equal(requiresAdminApiToken(false, '::1'), false, 'IPv6 loopback is local');
assert.equal(requiresAdminApiToken(false, '::ffff:127.0.0.1'), false, 'IPv4-mapped loopback is local');
assert.equal(requiresAdminApiToken(false, '192.168.1.10'), true, 'LAN peers require operator authorization');
assert.equal(requiresAdminApiToken(false, undefined), true, 'unknown peers fail closed');
assert.equal(requiresAdminApiToken(false, '127.0.0.1', true), true, 'production requires authorization even behind a loopback proxy');

const secret = 'calcora-admin-token-with-at-least-32-characters';
assert.equal(adminApiTokenStatus(undefined, secret), 'unauthorized');
assert.equal(adminApiTokenStatus(secret, secret), 'authorized');
assert.equal(adminApiTokenStatus('wrong-token', secret), 'unauthorized');
assert.equal(adminApiTokenStatus(secret, 'short'), 'unconfigured');
assert.equal(adminApiTokenStatus(secret, undefined), 'unconfigured');

function invokeMiddleware(remoteAddress: string | undefined, providedToken: string | undefined, options: { isDesktop: boolean; token?: string }) {
  let statusCode = 200;
  let body: unknown;
  let continued = false;
  const request = {
    socket: { remoteAddress },
    get: (name: string) => name.toLowerCase() === 'x-calcora-admin-token' ? providedToken : undefined,
  };
  const response = {
    status(code: number) { statusCode = code; return this; },
    json(value: unknown) { body = value; return this; },
  };
  createAdminApiAuthorizationMiddleware(options)(request as never, response as never, () => { continued = true; });
  return { statusCode, body, continued };
}

assert.deepEqual(invokeMiddleware('192.168.1.10', undefined, { isDesktop: false, token: secret }), {
  statusCode: 401,
  body: { success: false, error: 'Unauthorized admin API request.' },
  continued: false,
});
assert.equal(invokeMiddleware('192.168.1.10', secret, { isDesktop: false, token: secret }).continued, true);
assert.equal(invokeMiddleware('192.168.1.10', secret, { isDesktop: false, token: 'short' }).statusCode, 503);
assert.equal(invokeMiddleware('127.0.0.1', undefined, { isDesktop: false }).continued, true);
assert.equal(invokeMiddleware('127.0.0.1', undefined, { isDesktop: false, isProduction: true }).statusCode, 503);
assert.equal(invokeMiddleware('192.168.1.10', undefined, { isDesktop: true }).continued, true);

console.log('Admin API policy tests passed');
