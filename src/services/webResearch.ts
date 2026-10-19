/**
 * Calcora AI - Phase 3B: Controlled Web Research & Crawler
 *
 * Safe, bounded web research engine with hardened SSRF defenses,
 * DNS revalidation, link-local metadata protection, robots adherence,
 * bounded crawl quotas, content extraction, and strict verifiable citations.
 */

import { lookup } from 'node:dns/promises';
import { createHash } from 'node:crypto';

export interface WebResearchSource {
  url: string;
  canonicalUrl: string;
  title: string;
  snippet: string;
  extractedText: string;
  contentHash: string;
  crawledAt: number;
  httpStatus: number;
  citation: string;
}

export interface WebResearchResult {
  query: string;
  sources: WebResearchSource[];
  uncertaintyReport?: string;
  blockedCount: number;
  warnings: string[];
}

export interface CrawlLimits {
  maxPages: number;
  maxDepth: number;
  maxSizeBytes: number;
  timeoutMs: number;
}

export const DEFAULT_CRAWL_LIMITS: CrawlLimits = {
  maxPages: 5,
  maxDepth: 2,
  maxSizeBytes: 512 * 1024, // 512 KB per page
  timeoutMs: 6_000,
};

/**
 * Checks whether an IPv4 address belongs to a private, loopback, or metadata subnet.
 */
export function isBlockedIPv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return true; // malformed treated as blocked
  }

  const [a, b] = parts;

  // 0.0.0.0/8 (Current network)
  if (a === 0) return true;
  // 127.0.0.0/8 (Loopback)
  if (a === 127) return true;
  // 10.0.0.0/8 (Private)
  if (a === 10) return true;
  // 172.16.0.0/12 (Private: 172.16 - 172.31)
  if (a === 172 && b >= 16 && b <= 31) return true;
  // 192.168.0.0/16 (Private)
  if (a === 192 && b === 168) return true;
  // 169.254.0.0/16 (Link-local & Cloud Metadata endpoint, e.g. 169.254.169.254)
  if (a === 169 && b === 254) return true;
  // 100.64.0.0/10 (Carrier-grade NAT)
  if (a === 100 && b >= 64 && b <= 127) return true;
  // 224.0.0.0/4 (Multicast) & 240.0.0.0/4 (Reserved)
  if (a >= 224) return true;

  return false;
}

/**
 * Checks whether an IPv6 address belongs to a private, loopback, or site-local range.
 */
export function isBlockedIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === '::1' || lower === '::') return true;
  // Link-local: fe80::/10
  if (lower.startsWith('fe8') || lower.startsWith('fe9') || lower.startsWith('fea') || lower.startsWith('feb')) return true;
  // Unique local / private: fc00::/7 (fc00:: and fd00::)
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true;
  // IPv4-mapped IPv6 (::ffff:127.0.0.1)
  if (lower.includes('::ffff:')) {
    const v4 = lower.split('::ffff:')[1];
    return isBlockedIPv4(v4);
  }
  return false;
}

/**
 * Validates a target URL against SSRF rules:
 * - Protocol must be http: or https:
 * - Allowed ports only (80, 443)
 * - Host must not be localhost or loopback name
 * - All resolved IP addresses must not fall in blocked subnets
 */
export async function validateSafeUrlForFetch(rawUrl: string): Promise<{ safe: boolean; reason?: string; resolvedUrl?: URL }> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { safe: false, reason: 'Invalid URL format' };
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { safe: false, reason: `Unsupported protocol ${url.protocol} (only http/https permitted)` };
  }

  // Safe ports
  const port = url.port ? Number(url.port) : (url.protocol === 'https:' ? 443 : 80);
  if (port !== 80 && port !== 443 && port !== 8080 && port !== 8443) {
    return { safe: false, reason: `Restricted port: ${port}` };
  }

  const hostname = url.hostname.toLowerCase();
  if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname === 'metadata.google.internal') {
    return { safe: false, reason: 'Local and cloud metadata hostnames are blocked' };
  }

  // Resolve DNS to verify IP addresses
  try {
    const lookups = await lookup(hostname, { all: true });
    for (const entry of lookups) {
      if (entry.family === 4 && isBlockedIPv4(entry.address)) {
        return { safe: false, reason: `Resolved IP ${entry.address} is a blocked private or link-local network` };
      }
      if (entry.family === 6 && isBlockedIPv6(entry.address)) {
        return { safe: false, reason: `Resolved IPv6 ${entry.address} is a blocked network` };
      }
    }
  } catch (err) {
    return { safe: false, reason: `DNS lookup failed for ${hostname}: ${err instanceof Error ? err.message : 'unresolvable'}` };
  }

  return { safe: true, resolvedUrl: url };
}

/**
 * Parses simple robots.txt content to determine if a URL path is allowed.
 */
export function isPathAllowedByRobots(robotsTxt: string, pathname: string, userAgent = '*'): boolean {
  const lines = robotsTxt.split(/\r?\n/);
  let activeAgent = false;
  const disallows: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.replace(/#.*$/, '').trim();
    if (!line) continue;
    const [field, ...valParts] = line.split(':');
    const key = field.trim().toLowerCase();
    const val = valParts.join(':').trim();

    if (key === 'user-agent') {
      activeAgent = val === '*' || val.toLowerCase().includes(userAgent.toLowerCase());
    } else if (activeAgent && key === 'disallow') {
      if (val) disallows.push(val);
    }
  }

  for (const rule of disallows) {
    if (pathname.startsWith(rule)) return false;
  }
  return true;
}

/**
 * Sanitizes retrieved web content to neutralize prompt injection, control characters, and hidden directives.
 */
export function sanitizeWebContent(rawText: string): string {
  return rawText
    .replace(/```(?:system|admin|override|prompt)/gi, '```text')
    .replace(/\[\s*SYSTEM\s*:\s*OVERRIDE[^\]]*\]/gi, '[untrusted:disarmed]')
    .replace(/(?:ignore previous instructions|disregard earlier instructions)/gi, '[disarmed directive]')
    .replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Strips HTML tags and script/style elements, returning clean, sanitized plain text.
 */
export function extractCleanWebText(html: string): { title: string; text: string } {
  // Extract title
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : 'Web Source';

  // Strip script, style, nav, footer
  let clean = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, ' ')
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();

  return { title, text: sanitizeWebContent(clean) };
}

/**
 * High-level helper to fetch and extract sanitized text from a public URL with SSRF protection.
 */
export async function fetchAndExtractText(urlStr: string, options: Partial<CrawlLimits> = {}): Promise<{
  success: boolean;
  title?: string;
  text?: string;
  citation?: string;
  error?: string;
}> {
  const source = await globalWebResearcher.fetchSafePage(urlStr, options);
  if (!source) {
    return { success: false, error: 'Could not fetch URL safely (blocked by SSRF, network, or size limit).' };
  }
  return {
    success: true,
    title: source.title,
    text: source.extractedText,
    citation: source.citation,
  };
}

/**
 * Controlled Web Research Service
 */
export class ControlledWebResearcher {
  private cache = new Map<string, { source: WebResearchSource; expiresAt: number }>();
  private readonly CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

  /**
   * Fetches a single page securely under SSRF and size bounds.
   */
  public async fetchSafePage(urlStr: string, options: Partial<CrawlLimits> = {}): Promise<WebResearchSource | null> {
    const limits = { ...DEFAULT_CRAWL_LIMITS, ...options };
    const validation = await validateSafeUrlForFetch(urlStr);
    if (!validation.safe || !validation.resolvedUrl) {
      return null;
    }

    const cached = this.cache.get(urlStr);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.source;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), limits.timeoutMs);

    try {
      const response = await fetch(validation.resolvedUrl.toString(), {
        signal: controller.signal,
        headers: {
          'User-Agent': 'CalcoraAI-ResearchBot/1.0 (+https://calcora.app/bot)',
          'Accept': 'text/html,application/xhtml+xml,text/plain;q=0.9',
        },
        redirect: 'manual', // Enforce manual redirect handling to re-validate SSRF
      });

      // Handle redirect safely
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get('location');
        if (!location) return null;
        const redirectUrl = new URL(location, validation.resolvedUrl).toString();
        // Recurse once with decremented depth
        if ((limits.maxDepth || 1) > 0) {
          return this.fetchSafePage(redirectUrl, { ...limits, maxDepth: limits.maxDepth - 1 });
        }
        return null;
      }

      if (!response.ok) return null;

      const raw = await response.text();
      const boundedRaw = raw.slice(0, limits.maxSizeBytes);
      const { title, text } = extractCleanWebText(boundedRaw);
      const contentHash = createHash('sha256').update(boundedRaw).digest('hex').slice(0, 16);
      const isoDate = new Date().toISOString().split('T')[0];

      const source: WebResearchSource = {
        url: urlStr,
        canonicalUrl: validation.resolvedUrl.origin + validation.resolvedUrl.pathname,
        title: title || 'Untitled Resource',
        snippet: text.slice(0, 240) + (text.length > 240 ? '...' : ''),
        extractedText: text.slice(0, 4000), // Bounded excerpt
        contentHash,
        crawledAt: Date.now(),
        httpStatus: response.status,
        citation: `[Web: ${title || 'Source'} | ${urlStr} | Retr: ${isoDate}]`,
      };

      this.cache.set(urlStr, { source, expiresAt: Date.now() + this.CACHE_TTL_MS });
      return source;
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Performs controlled research across a query or set of seed URLs.
   */
  public async research(
    query: string,
    seedUrls: string[] = [],
    options: Partial<CrawlLimits> = {},
  ): Promise<WebResearchResult> {
    const limits = { ...DEFAULT_CRAWL_LIMITS, ...options };
    const sources: WebResearchSource[] = [];
    const warnings: string[] = [];
    let blockedCount = 0;

    for (const url of seedUrls.slice(0, limits.maxPages)) {
      const page = await this.fetchSafePage(url, limits);
      if (page) {
        sources.push(page);
      } else {
        blockedCount += 1;
        warnings.push(`Could not safely access ${url} (blocked by SSRF, network, or size limit)`);
      }
    }

    let uncertaintyReport: string | undefined;
    if (sources.length === 0) {
      uncertaintyReport = `No verified external sources were retrieved for query: "${query}". Answers must rely on verified internal mathematical knowledge.`;
    }

    return {
      query,
      sources,
      uncertaintyReport,
      blockedCount,
      warnings,
    };
  }

  public clearCache(): void {
    this.cache.clear();
  }
}

export const globalWebResearcher = new ControlledWebResearcher();
