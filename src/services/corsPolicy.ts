/**
 * Calcora AI — API cross-origin policy.
 *
 * Why this exists
 * ---------------
 * A browser on any third-party page can send a "simple" cross-origin request to
 * `/api/ai/math` or `/api/math/tool`. The response is unreadable by that page, but the
 * request has already been *sent*: the server performs the work, burns rate-limit
 * budget, and — when Gemini is configured — spends billable cloud quota on behalf of a
 * site the user never granted access to. Rate limiting bounds the damage but does not
 * prevent it, so the origin must be decided before any handler runs.
 *
 * Policy
 * ------
 *  - No `Origin` header: same-origin navigation / non-browser client. Allowed. The
 *    endpoints are not cookie-authenticated, so there is nothing for a cross-site
 *    request to ride on.
 *  - Loopback origins (`localhost`, `127.0.0.0/8`, `[::1]`): allowed. This covers the
 *    desktop app and local development.
 *  - Configured allowlist (`CALCORA_ALLOWED_ORIGINS`): the only other allowed callers.
 *  - Everything else: refused with 403 and no CORS grant.
 *  - Desktop/loopback serving never widens the policy, even if an allowlist is set,
 *    because a locally bound server has no legitimate third-party caller.
 */
import type { RequestHandler } from 'express';

export interface OriginPolicy {
  /** Exact origins (`scheme://host[:port]`) that may call the API. */
  allowlist: ReadonlySet<string>;
  /** True when Calcora is serving its own desktop renderer on loopback. */
  serveDesktop: boolean;
}

const ALLOWED_METHODS = 'GET, POST, OPTIONS';
const ALLOWED_HEADERS = 'Content-Type, X-Calcora-Admin-Token, X-Calcora-Learning-Token, X-Calcora-Intelligence-Token';

/**
 * Parses a comma-separated origin allowlist.
 *
 * Only fully-qualified http(s) origins are accepted. `*` is deliberately rejected:
 * a wildcard would restore the exact exposure this policy removes, and it is a much
 * more dangerous thing to type into an env var than to omit.
 */
export function parseAllowedOrigins(raw: string | undefined | null): string[] {
  if (typeof raw !== 'string') return [];
  const seen = new Set<string>();
  for (const entry of raw.split(',')) {
    const candidate = entry.trim();
    if (!candidate || candidate === '*') continue;
    let url: URL;
    try {
      url = new URL(candidate);
    } catch {
      continue;
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') continue;
    if (!url.hostname) continue;
    if (url.username || url.password) continue;
    if (url.pathname !== '/' || url.search || url.hash) continue;
    // URL normalises the default port away, so "https://a" and "https://a:443" collapse.
    seen.add(url.origin);
  }
  return [...seen];
}

/** True for `localhost`, any 127.x.x.x address, and the IPv6 loopback literal. */
export function isLoopbackHostname(hostname: string): boolean {
  const host = hostname.trim().toLowerCase().replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.localhost') || host === '::1') return true;
  const octets = host.split('.');
  if (octets.length !== 4) return false;
  return octets.every((octet) => /^\d{1,3}$/.test(octet) && Number(octet) <= 255) && Number(octets[0]) === 127;
}

export function createOriginPolicy(options: {
  allowlist?: readonly string[] | string;
  serveDesktop?: boolean;
} = {}): OriginPolicy {
  const raw = Array.isArray(options.allowlist)
    ? options.allowlist
    : parseAllowedOrigins(options.allowlist as string | undefined);
  const allowlist = new Set<string>();
  for (const entry of raw) {
    const candidate = entry.trim();
    if (!candidate) continue;
    try {
      const url = new URL(candidate);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') continue;
      if (!url.hostname || url.username || url.password) continue;
      allowlist.add(url.origin);
    } catch {
      // An unparseable allowlist entry is ignored rather than widening access.
    }
  }
  return { allowlist, serveDesktop: options.serveDesktop === true };
}

export function isAllowedOrigin(policy: OriginPolicy, origin: string | undefined | null): boolean {
  // Non-browser clients (curl, tests, Electron's own fetch) send no Origin header at
  // all. Only a genuinely *absent* header is trusted: a present-but-empty value is
  // malformed, and `Origin: null` (a sandboxed iframe or file:// document) parses as a
  // real but opaque origin, so both fall through to the parser and are refused.
  if (origin === undefined || origin === null) return true;

  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
  if (url.username || url.password) return false;
  if (isLoopbackHostname(url.hostname)) return true;
  if (policy.serveDesktop) return false;
  return policy.allowlist.has(url.origin);
}

/**
 * Express middleware enforcing the policy.
 *
 * A refused request is answered immediately with 403 and never reaches a route
 * handler, so no prompt is parsed, no deterministic work is done, and no cloud
 * provider is contacted for a caller we do not recognise.
 */
export function createCorsMiddleware(policy: OriginPolicy): RequestHandler {
  return (req, res, next) => {
    const origin = req.headers.origin;
    const isPreflight = req.method === 'OPTIONS';

    if (!isAllowedOrigin(policy, typeof origin === 'string' ? origin : undefined)) {
      res.status(403).json({
        success: false,
        error: 'This origin is not permitted to call the Calcora API.',
      });
      return;
    }

    if (typeof origin === 'string' && origin) {
      // Echo the exact origin rather than "*" so credentialed browsers stay usable.
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', ALLOWED_METHODS);
      res.setHeader('Access-Control-Allow-Headers', ALLOWED_HEADERS);
      res.setHeader('Access-Control-Max-Age', '600');
      res.setHeader('Vary', 'Origin');
    } else if (!res.getHeader('Vary')) {
      res.setHeader('Vary', 'Origin');
    }

    if (isPreflight) {
      res.status(204).end();
      return;
    }

    next();
  };
}
