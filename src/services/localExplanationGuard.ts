function parseNumericCandidate(value: string): number | null {
  const normalized = value.replace(/\s+/g, '');
  if (!normalized) return null;
  const fraction = normalized.match(/^([+-]?\d+)\/(\d+)$/);
  if (fraction) {
    const denominator = Number(fraction[2]);
    if (denominator === 0) return null;
    return Number(fraction[1]) / denominator;
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function closeEnough(left: number, right: number): boolean {
  return Math.abs(left - right) <= 1e-9 * Math.max(1, Math.abs(left), Math.abs(right));
}

/**
 * Conservatively reject a local explanation that explicitly states a numeric answer
 * which differs from Calcora's deterministic result. This is not a proof that prose is
 * correct; accepted text remains labelled unverified.
 */
export function localExplanationMatchesDeterministicResult(
  explanation: string,
  deterministicResult: string | null | undefined,
): boolean {
  if (!deterministicResult?.trim()) return true;

  const expected = deterministicResult
    .match(/[+-]?\d+(?:\.\d+)?\s*\/\s*\d+|[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/gi)
    ?.map(parseNumericCandidate)
    .filter((value): value is number => value !== null) ?? [];
  if (!expected.length) return true;

  const claims = new Set<string>();
  const explicitClaim = /\b(?:answer|result|therefore|thus|equals?|is)\s*(?:[:=]\s*)?([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:\s*\/\s*\d+)?)/gi;
  const equationClaim = /(?:^|[\s$])(?:[A-Za-z]\s*)?=\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:\s*\/\s*\d+)?)/g;

  for (const match of explanation.matchAll(explicitClaim)) claims.add(match[1]);
  for (const match of explanation.matchAll(equationClaim)) claims.add(match[1]);

  return [...claims].every((claim) => {
    const value = parseNumericCandidate(claim);
    return value !== null && expected.some((allowed) => closeEnough(value, allowed));
  });
}
