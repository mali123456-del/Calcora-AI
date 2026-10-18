/**
 * Content Security Policy for the local Calcora server.
 *
 * The packaged renderer and the API share a single loopback origin, and several
 * untrusted strings are rendered into that page: tutor answers, PDF text, OCR
 * transcripts and model-generated markdown. A strict CSP is what turns "content
 * we did not author" from a potential script injection into inert text.
 *
 * Development is excluded on purpose: the Vite middleware serves an inline HMR
 * client and opens a hot-reload websocket, neither of which a strict
 * `script-src 'self'` allows. Production is the mode that ships.
 */

const DIRECTIVES: readonly string[] = [
  "default-src 'self'",
  // No inline scripts and no eval: both are common XSS amplifiers.
  "script-src 'self'",
  // React inline styles and KaTeX both set element styles at runtime.
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  // The renderer only ever talks to its own local API.
  "connect-src 'self'",
  // pdf.js runs its parser in a worker created from a blob URL.
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'none'",
  "frame-ancestors 'none'",
];

/** The policy served by the packaged/production server. */
export function buildContentSecurityPolicy(): string {
  return DIRECTIVES.join('; ');
}

/**
 * True only for a production run. `NODE_ENV` is the switch the server already
 * uses to decide whether to attach the Vite middleware, so the two stay
 * consistent by construction.
 */
export function shouldSendContentSecurityPolicy(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.NODE_ENV === 'production';
}
