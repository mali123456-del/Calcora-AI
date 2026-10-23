import type { RequestHandler } from 'express';
import { isAuthorizationTokenValid } from './requestSecurity';

function isLoopbackPeer(address: string | undefined): boolean {
  if (!address) return false;
  const normalized = address.toLowerCase().replace(/^::ffff:/, '');
  if (normalized === '::1') return true;
  const octets = normalized.split('.');
  return octets.length === 4
    && octets.every((octet) => /^\d{1,3}$/.test(octet) && Number(octet) <= 255)
    && Number(octets[0]) === 127;
}

/** Desktop binds only to loopback; local development remains usable without a client secret. */
export function requiresAdminApiToken(
  isDesktop: boolean,
  remoteAddress: string | undefined,
  isProduction: boolean = false,
): boolean {
  return !isDesktop && (isProduction || !isLoopbackPeer(remoteAddress));
}

export function adminApiTokenStatus(providedToken: string | undefined, configuredToken: string | undefined): 'authorized' | 'unauthorized' | 'unconfigured' {
  if (!configuredToken || configuredToken.length < 32) return 'unconfigured';
  return isAuthorizationTokenValid(providedToken, configuredToken) ? 'authorized' : 'unauthorized';
}

export function createAdminApiAuthorizationMiddleware(options: {
  isDesktop: boolean;
  isProduction?: boolean;
  token?: string;
}): RequestHandler {
  return (req, res, next) => {
    if (!requiresAdminApiToken(options.isDesktop, req.socket.remoteAddress, options.isProduction)) {
      next();
      return;
    }

    const status = adminApiTokenStatus(req.get('x-calcora-admin-token'), options.token);
    if (status !== 'authorized') {
      res.status(status === 'unconfigured' ? 503 : 401).json({
        success: false,
        error: status === 'unconfigured' ? 'Admin API access is not configured.' : 'Unauthorized admin API request.',
      });
      return;
    }
    next();
  };
}
