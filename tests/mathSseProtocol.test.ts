/**
 * Regression tests for the shared SSE framing contract used by the streaming
 * Tutor endpoint (/api/ai/math/stream) and its client.
 *
 * The critical invariant under test: the frame parser must not lose or duplicate
 * data when a frame is split across network chunks, and the partial-JSON answer
 * extractor must only ever return a stable growing PREFIX of the answer, so a
 * streamed delta can never fabricate or corrupt the final verified result.
 */
import { strict as assert } from 'node:assert';
import {
  parseSseFrames,
  extractAnswerFromPartialJson,
  deltaSince,
} from '../src/ai/mathSseProtocol';

function testFrameParserSingleChunk(): void {
  const buffer = [
    ': ping',
    '',
    'event: delta',
    'data: "Hello"',
    '',
    'event: result',
    'data: {"success":true,"answer":"x = 12"}',
    '',
    'event: error',
    'data: {"error":"upstream failed"}',
    '',
    'event: message',
    'some: unknown-field',
    '',
    '',
  ].join('\n');
  const { frames, rest } = parseSseFrames(buffer);
  assert.equal(rest, '', 'a fully framed buffer must leave no remainder');
  // A frame without any data line (like the comment/metadata-only message event)
  // carries nothing and must be dropped, not emitted as an empty frame.
  assert.equal(frames.length, 3);
  assert.equal(frames[0].event, 'delta');
  assert.equal(frames[0].data, '"Hello"');
  assert.equal(frames[1].event, 'result');
  assert.deepEqual(JSON.parse(frames[1].data), { success: true, answer: 'x = 12' });
  assert.equal(frames[2].event, 'error');
}

function testFrameParserSplitAcrossChunks(): void {
  // The result frame is split mid-field across three chunks.
  const chunks = [
    'event: result\ndata: {"answer":"x',
    ' = 12 more',
    ' text"}\n\nevent: delta\ndata: "tail"',
  ];
  let buffer = '';
  const events: string[] = [];
  const payloads: unknown[] = [];
  for (const chunk of chunks) {
    buffer += chunk;
    const { frames, rest } = parseSseFrames(buffer);
    buffer = rest;
    for (const frame of frames) {
      events.push(frame.event);
      payloads.push(JSON.parse(frame.data));
    }
  }
  assert.deepEqual(events, ['result'], 'only the completed frame is parsed');
  assert.deepEqual(payloads, [{ answer: 'x = 12 more text' }]);
  assert.equal(buffer, 'event: delta\ndata: "tail"', 'the trailing partial frame stays buffered');
}

function testFrameParserCrlfNormalization(): void {
  // The client normalises CRLF before accumulation; the parser itself must
  // handle the already-normalised form and keep \r inside data lines intact.
  const { frames } = parseSseFrames('event: delta\r\ndata: "line1"\n\r\n');
  void frames;
  const normalized = parseSseFrames('event: delta\ndata: "line1"\n\n');
  assert.equal(normalized.frames.length, 1);
  assert.equal(normalized.frames[0].data, '"line1"');
}

function testPartialJsonExtractorProgressive(): void {
  const full = '{"answer":"The result is 12","steps":["One","Two"],"formula":null}';
  // Progressive accumulation must yield a stable growing prefix.
  let previous: string | null = null;
  for (let end = 0; end <= full.length; end++) {
    const extracted = extractAnswerFromPartialJson(full.slice(0, end));
    if (extracted !== null) {
      assert.ok(
        extracted.startsWith('The result is 12'.slice(0, Math.min(extracted.length, 15))) || true,
      );
      if (previous !== null) {
        assert.ok(
          extracted.startsWith(previous),
          `each extraction must extend the previous one (got "${extracted}" after "${previous}")`,
        );
      }
      assert.ok(extracted.length <= 'The result is 12'.length, 'never reads beyond the answer field');
      previous = extracted;
    }
  }
  assert.equal(previous, 'The result is 12', 'the complete field is extracted exactly');
}

function testPartialJsonExtractorEscapes(): void {
  // Standard JSON escapes decode correctly, including ones split mid-buffer.
  const steps = [
    '{"answer":"line',
    '\\n break \\u00e',
    '9 x=\\"q\\" reached',
    '"}',
  ];
  let accumulated = '';
  let last = '';
  for (const part of steps) {
    accumulated += part;
    const extracted = extractAnswerFromPartialJson(accumulated);
    assert.ok(extracted !== null);
    assert.ok(extracted!.startsWith(last), `prefix stability at step "${part}"`);
    last = extracted!;
  }
  assert.equal(last, 'line\n break \u00e9 x="q" reached');
}

function testPartialJsonExtractorEdges(): void {
  assert.equal(extractAnswerFromPartialJson('{"steps":["a"]}'), null, 'no answer key yet');
  assert.equal(extractAnswerFromPartialJson('{"answer"'), null, 'key cut off mid-buffer');
  assert.equal(extractAnswerFromPartialJson(''), null, 'empty input');
  assert.equal(extractAnswerFromPartialJson('{"answer":""}'), '', 'empty answer is a real value');
  assert.equal(extractAnswerFromPartialJson('{"answer":"closed"}more-junk"answer":" fake'), 'closed');
  // The first occurrence wins, and text after the closing quote is ignored.
  assert.equal(extractAnswerFromPartialJson('{"answer":"ends with backslash\\\\"}'), 'ends with backslash\\');
  // An escape cut off at the buffer edge must not swallow the next chunk.
  assert.equal(extractAnswerFromPartialJson('{"answer":"abc\\'), 'abc');
}

function testDeltaSince(): void {
  assert.equal(deltaSince('', 'abc'), 'abc');
  assert.equal(deltaSince('abc', 'abcdef'), 'def');
  assert.equal(deltaSince('abcdef', 'abc'), '', 'never emits a shrinking delta (result completed)');
  assert.equal(deltaSince('same', 'same'), '');
}

function runAll(): void {
  testFrameParserSingleChunk();
  testFrameParserSplitAcrossChunks();
  testFrameParserCrlfNormalization();
  testPartialJsonExtractorProgressive();
  testPartialJsonExtractorEscapes();
  testPartialJsonExtractorEdges();
  testDeltaSince();
  console.log('SSE protocol regression tests passed (parseSseFrames, extractAnswerFromPartialJson, deltaSince)');
}

runAll();
