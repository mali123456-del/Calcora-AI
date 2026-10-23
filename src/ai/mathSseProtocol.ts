/**
 * SSE framing contract shared by the streaming AI math endpoint (server) and the
 * streaming client.
 *
 * Wire format (one frame per blank line):
 *   `event: delta\ndata: <json string>\n\n`   — a growing prefix of the answer text
 *   `event: result\ndata: <json object>\n\n` — the exact verified payload the
 *                                              non-streaming endpoint returns
 *   `event: error\ndata: <json object>\n\n`  — a classified failure; a result may
 *                                              still follow via local fallback
 *   `: ping\n\n`                             — heartbeat comment, ignored by parsers
 *
 * The cloud provider is asked for the same JSON document as the non-streaming
 * endpoint. While that document streams in, the answer text is extracted from the
 * accumulated JSON and forwarded as deltas; the final `result` frame always goes
 * through the exact same verification pipeline, so streamed text is provisional
 * and can never fabricate a deterministic result.
 */

export interface SseFrame {
  event: string;
  data: string;
}

export interface SseParseResult {
  frames: SseFrame[];
  /** The unconsumed remainder (a partial frame), to prepend to the next chunk. */
  rest: string;
}

/**
 * Incremental parser for the frames above. Feed each fetched chunk appended to
 * the previous `rest` (with CRLF normalised); use the returned `rest` next time
 * so a frame split across chunks is still parsed exactly once.
 */
export function parseSseFrames(buffer: string): SseParseResult {
  const frames: SseFrame[] = [];
  let rest = buffer;
  let boundary: number;
  while ((boundary = rest.indexOf('\n\n')) !== -1) {
    const rawEvent = rest.slice(0, boundary);
    rest = rest.slice(boundary + 2);
    let event = 'message';
    const dataLines: string[] = [];
    for (const line of rawEvent.split('\n')) {
      if (line.startsWith(':')) continue; // heartbeat/comment
      if (line.startsWith('event:')) event = line.slice('event:'.length).trim();
      else if (line.startsWith('data:')) dataLines.push(line.slice('data:'.length).replace(/^ /, ''));
      // Unknown fields per the SSE spec are ignored, never treated as errors.
    }
    if (dataLines.length) frames.push({ event, data: dataLines.join('\n') });
  }
  return { frames, rest };
}

/**
 * Extracts the still-growing value of the top-level `"answer"` string field from
 * an accumulated (possibly unterminated) JSON document, decoding standard JSON
 * escapes as they arrive. Returns null only while the field has not started yet;
 * returns the decoded text (possibly the empty string) from the first
 * `"answer"` occurrence until the closing quote or end of available input.
 *
 * Deltas are produced by diffing consecutive outputs at the call site, so this
 * function only guarantees a stable prefix per accumulation step.
 */
export function extractAnswerFromPartialJson(accumulated: string): string | null {
  const startMatch = accumulated.match(/"answer"\s*:\s*"/);
  if (!startMatch || startMatch.index === undefined) return null;
  let out = '';
  let i = startMatch.index + startMatch[0].length;
  while (i < accumulated.length) {
    const ch = accumulated[i];
    if (ch === '\\') {
      const escaped = accumulated[i + 1];
      if (escaped === undefined) return out; // escape cut off mid-buffer; wait
      switch (escaped) {
        case 'n': out += '\n'; break;
        case 't': out += '\t'; break;
        case 'r': out += '\r'; break;
        case 'b': out += '\b'; break;
        case 'f': out += '\f'; break;
        case 'u': {
          const hex = accumulated.slice(i + 2, i + 6);
          if (hex.length < 4) return out; // escape cut off mid-buffer; wait
          out += String.fromCharCode(parseInt(hex, 16));
          i += 6;
          continue;
        }
        default: out += escaped; break; // \" \\ \/
      }
      i += 2;
      continue;
    }
    if (ch === '"') return out; // closing quote: field complete
    out += ch;
    i += 1;
  }
  return out; // still streaming
}

/** Chunk-diffs an accumulated text into the suffix that has not been sent yet. */
export function deltaSince(previous: string, accumulated: string): string {
  if (accumulated.length <= previous.length) return '';
  return accumulated.slice(previous.length) ?? '';
}
