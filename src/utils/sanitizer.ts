/**
 * Input sanitization utility for user queries and speech recognition.
 * Prevents prompt injection formatting hazards, script/tag injections,
 * normalizes spoken mathematical vocabulary, and cleans redundant whitespace.
 */

function stripHtmlAndScripts(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Strip script tags and content
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')   // Strip style tags and content
    .replace(/<[^>]*>?/gm, '')                                         // Strip all other HTML tags
    .replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200D\uFEFF]/g, ''); // Control & zero-width chars
}

/**
 * Sanitizes voice-dictated mathematical queries by stripping dangerous characters,
 * converting spoken arithmetic terms into mathematical notation, and bounding length.
 */
export function sanitizeSpokenMath(rawText: string): string {
  if (!rawText) return '';

  // 1. Remove dangerous markup, scripts, and control characters
  let text = stripHtmlAndScripts(rawText);

  // 2. Normalization of common spoken math phrases
  const speechReplacements: [RegExp, string][] = [
    [/\bmultiplied by\b/gi, '*'],
    [/\bdivided by\b/gi, '/'],
    [/\bplus or minus\b/gi, '±'],
    [/\s*\bsquared\b/gi, '²'],
    [/\s*\bcubed\b/gi, '³'],
    [/\bto the power of\b/gi, '^'],
    [/\braised to the power of\b/gi, '^'],
    [/\braised to\b/gi, '^'],
    [/\bsquare root of\b/gi, 'sqrt('],
    [/\bcube root of\b/gi, 'cbrt('],
    [/\bopen parenthesis\b/gi, '('],
    [/\bclose parenthesis\b/gi, ')'],
    [/\bleft parenthesis\b/gi, '('],
    [/\bright parenthesis\b/gi, ')'],
    [/\bequals\b/gi, '='],
    [/\bequal to\b/gi, '='],
    [/\bis equal to\b/gi, '='],
  ];

  for (const [pattern, replacement] of speechReplacements) {
    text = text.replace(pattern, replacement);
  }

  // 3. Normalize single word arithmetic operators between arguments
  text = text
    .replace(/(\S+)\s+plus\s+(\S+)/gi, '$1 + $2')
    .replace(/(\S+)\s+minus\s+(\S+)/gi, '$1 - $2')
    .replace(/(\S+)\s+times\s+(\S+)/gi, '$1 * $2')
    .replace(/(\S+)\s+over\s+(\S+)/gi, '$1 / $2');

  // 4. Normalize multiple whitespaces and trim
  text = text.replace(/\s+/g, ' ').trim();

  // 5. Enforce reasonable length bounds (max 1000 characters)
  if (text.length > 1000) {
    text = text.slice(0, 1000).trim();
  }

  return text;
}

/**
 * General text sanitizer for prompt input to ensure safety and clean whitespace.
 */
export function sanitizeQueryText(rawText: string): string {
  if (!rawText) return '';
  return stripHtmlAndScripts(rawText)
    .replace(/\s+/g, ' ')
    .slice(0, 1000)
    .trim();
}
