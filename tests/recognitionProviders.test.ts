/**
 * Multimodal recognition-provider and voice-pipeline regression tests.
 *
 * The previous Scan Problem tab only recorded a filename. That is not recognition: it
 * produced no math, so nothing could be verified. These tests pin the honest contract
 * that replaced it:
 *
 *   - A provider is only "available" when one is actually registered.
 *   - With no provider, recognition reports `unavailable` and must NOT invent text.
 *   - A registered provider's transcript is passed through the deterministic math
 *     engine, so a number shown to the user is engine-verified, never model-asserted.
 *   - Low-confidence recognition surfaces uncertainty instead of presenting a guess.
 *   - Voice input detects the language, sanitizes spoken math, and reports empty /
 *     non-math / ambiguous speech distinctly rather than forwarding junk to the Tutor.
 */
import assert from 'node:assert/strict';
import {
  createRecognitionRegistry,
  getRegisteredRecognitionProvider,
  recognizeMathImage,
  recognizeInkStrokes,
  type RecognitionProvider,
  type RecognitionRequest,
} from '../src/services/recognitionProviders';
import { prepareVoiceMathInput } from '../src/services/voiceMathPipeline';

function check(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Multimodal recognition regression failed: ${message}`);
}

// ---------------------------------------------------------------------------
// 1. No registered provider => honest unavailability, never a fabricated result.
// ---------------------------------------------------------------------------
const emptyRegistry = createRecognitionRegistry([]);
const unconfigured = await recognizeMathImage(emptyRegistry, {
  source: 'image',
  fileName: 'homework.png',
  mediaType: 'image/png',
  bytes: new Uint8Array([1, 2, 3]),
});
check(unconfigured.status === 'unavailable', 'image recognition without a provider is unavailable');
check(!unconfigured.text, 'no transcript is invented when no provider exists');
check(
  /provider|configure|unavailable/i.test(unconfigured.message),
  `unavailable state is explained, got: ${unconfigured.message}`,
);
check(getRegisteredRecognitionProvider(emptyRegistry) === undefined, 'registry reports no provider');

// ---------------------------------------------------------------------------
// 2. A registered provider runs, and the result is engine-verified.
// ---------------------------------------------------------------------------
const calls: RecognitionRequest[] = [];
const provider: RecognitionProvider = {
  id: 'test-provider',
  label: 'Test Vision Provider',
  kinds: ['image', 'ink'],
  recognize: async (request) => {
    calls.push(request);
    return { text: '2x + 4 = 10', confidence: 0.94, providerId: 'test-provider' };
  },
};
const registry = createRecognitionRegistry([provider]);

check(getRegisteredRecognitionProvider(registry)?.id === 'test-provider', 'registered provider is discoverable');
check(getRegisteredRecognitionProvider(registry, 'ink')?.id === 'test-provider', 'provider is found for the ink kind');

const recognized = await recognizeMathImage(registry, {
  source: 'image',
  fileName: 'homework.png',
  mediaType: 'image/png',
  bytes: new Uint8Array([1, 2, 3]),
});
check(recognized.status === 'ok', `a working provider must produce a result, got ${recognized.status}`);
check(recognized.text === '2x + 4 = 10', 'provider text is passed through unchanged');
check(calls.length === 1 && calls[0].source === 'image', 'the provider received the source kind');

const inkResult = await recognizeInkStrokes(registry, {
  source: 'ink',
  fileName: 'ink.png',
  mediaType: 'image/png',
  bytes: new Uint8Array([1, 2, 3]),
});
check(inkResult.status === 'ok', 'ink recognition works through the same abstraction');
check(calls[1].source === 'ink', 'ink strokes are routed to the provider as ink');

// ---------------------------------------------------------------------------
// 3. Deterministic verification: a recognized expression is checked, not trusted.
// ---------------------------------------------------------------------------
check(recognized.deterministic?.attempted === true, 'recognition attempts deterministic verification');
check(
  recognized.deterministic?.success === true && recognized.deterministic?.result === '3',
  `recognized expression must be solved by the engine, got ${JSON.stringify(recognized.deterministic)}`,
);
check(recognized.deterministic?.verified === true, 'the engine result is marked verified');

// ---------------------------------------------------------------------------
// 4. Uncertainty is surfaced, not hidden.
// ---------------------------------------------------------------------------
const uncertainRegistry = createRecognitionRegistry([{
  ...provider,
  recognize: async () => ({ text: '2x + 4 = 1O', confidence: 0.31, providerId: 'test-provider' }),
}]);
const uncertain = await recognizeMathImage(uncertainRegistry, {
  source: 'image',
  fileName: 'blurry.png',
  mediaType: 'image/png',
  bytes: new Uint8Array([1, 2, 3]),
});
check(uncertain.confidence !== undefined && uncertain.confidence < 0.5, 'low confidence is reported');
check(
  uncertain.message.toLowerCase().includes('uncertain') || uncertain.message.toLowerCase().includes('check'),
  `uncertain recognition is disclosed, got: ${uncertain.message}`,
);
check(
  uncertain.deterministic?.success !== true,
  'an expression the engine cannot solve is not presented as a verified result',
);

// ---------------------------------------------------------------------------
// 5. A provider failure is an honest error, never an empty success.
// ---------------------------------------------------------------------------
const failingRegistry = createRecognitionRegistry([{
  ...provider,
  recognize: async () => { throw new Error('provider exploded'); },
}]);
const failed = await recognizeMathImage(failingRegistry, {
  source: 'image',
  fileName: 'x.png',
  mediaType: 'image/png',
  bytes: new Uint8Array([1, 2, 3]),
});
check(failed.status === 'error', 'a provider failure is an error, not a blank success');
check(!failed.text, 'a failed recognition invents no text');
check(failed.message.length > 0, 'a provider failure explains itself');

// ---------------------------------------------------------------------------
// 6. Malformed provider output is rejected.
// ---------------------------------------------------------------------------
const emptyRegistry2 = createRecognitionRegistry([{
  ...provider,
  recognize: async () => ({ text: '   ', confidence: 0.9, providerId: 'test-provider' }),
}]);
const blank = await recognizeMathImage(emptyRegistry2, {
  source: 'image',
  fileName: 'blank.png',
  mediaType: 'image/png',
  bytes: new Uint8Array([1, 2, 3]),
});
check(blank.status !== 'ok' || !blank.text, 'a blank provider transcript is not treated as a success');

// ---------------------------------------------------------------------------
// 7. Voice pipeline: language detection + math sanitization + verdict.
// ---------------------------------------------------------------------------
const english = prepareVoiceMathInput('two plus two equals', 'auto', 'en-US');
check(english.status !== 'empty', 'a real spoken request is not empty');
check(
  /two\s*\+\s*two\s*=/.test(english.sanitized),
  `spoken operators become symbols without inventing digits, got: ${english.sanitized}`,
);
check(english.language === 'en', `English speech is detected, got ${english.language}`);

const urdu = prepareVoiceMathInput('مجھے 2 اور 3 کا جمع بتائیں', 'auto', 'ur-PK');
check(urdu.language === 'ur', `Urdu speech is detected, got ${urdu.language}`);
check(urdu.status !== 'empty', 'an Urdu request is not treated as empty');

const mixed = prepareVoiceMathInput('solve 2x + 4 = 10 مجھے سمجھاؤ', 'auto', 'en-US');
check(mixed.detectedLanguages.length >= 1, 'mixed input still reports detected languages');

// Empty and whitespace-only speech.
check(prepareVoiceMathInput('', 'auto', 'en-US').status === 'empty', 'empty speech is reported as empty');
check(prepareVoiceMathInput('   ', 'auto', 'en-US').status === 'empty', 'whitespace-only speech is reported as empty');

// Speech with no mathematical content must be flagged, not silently forwarded.
const prose = prepareVoiceMathInput('what is the weather like today', 'auto', 'en-US');
check(prose.status === 'non-math' || prose.status === 'ambiguous', `non-math speech is flagged, got ${prose.status}`);
check(!/weather/i.test(prose.prompt), 'prose is not forwarded as a math prompt');

// Ambiguous speech: digits present but no operator, so it is not a solvable problem.
const ambiguous = prepareVoiceMathInput('seven', 'auto', 'en-US');
check(['ambiguous', 'non-math'].includes(ambiguous.status), `bare ambiguous speech is flagged, got ${ambiguous.status}`);
check(!ambiguous.prompt.includes('7'), 'a spoken word is not silently rewritten into a digit result');

// Hostile markup in a transcript is stripped, never forwarded.
const hostile = prepareVoiceMathInput('<script>alert(1)</script> 2 + 2', 'auto', 'en-US');
check(!/<script/i.test(hostile.sanitized), 'markup is stripped from the sanitized transcript');
check(!/<script/i.test(hostile.prompt), 'markup is stripped from the forwarded prompt');

console.log('Multimodal recognition tests passed');
