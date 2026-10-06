/**
 * Calcora AI — Recognition provider abstraction for Scan Problem and Digital Ink.
 *
 * Why this module exists
 * ----------------------
 * The Scan Problem tab previously stored the chosen filename and stopped there. That is
 * not recognition: no math was produced, so nothing could be checked, and a filename is
 * not evidence. Rather than fake a transcript, this module defines a real provider seam
 * and an honest contract around it:
 *
 *   - No registered provider  -> `unavailable`, with no text. Nothing is invented.
 *   - Provider returns text   -> the text is *engine-verified* through the deterministic
 *                                math engine before any number is shown.
 *   - Provider returns noise  -> rejected, not displayed as a problem.
 *   - Provider throws         -> `error`, with no text.
 *
 * Any real OCR/vision engine can be registered by the caller. Calcora ships with none
 * configured, so the default user experience is the honest "unavailable" state.
 */
import { solveEquation } from '../engine/equationSolver';
import { calculateExpression } from '../engine/mathEngine';

export type RecognitionKind = 'image' | 'ink';

export interface RecognitionRequest {
  source: RecognitionKind;
  fileName: string;
  mediaType: string;
  bytes: Uint8Array;
}

export interface RecognitionProviderOutput {
  /** Raw transcript exactly as the provider returned it. */
  text: string;
  /** 0..1 provider confidence. */
  confidence: number;
  providerId: string;
}

export interface RecognitionProvider {
  id: string;
  label: string;
  kinds: readonly RecognitionKind[];
  recognize: (request: RecognitionRequest) => Promise<RecognitionProviderOutput>;
}

export interface RecognitionDeterministic {
  attempted: boolean;
  success: boolean;
  verified: boolean;
  expression: string | null;
  result: string | null;
  steps: string[];
  error?: string;
}

export interface RecognitionResult {
  status: 'ok' | 'unavailable' | 'error';
  /** Present only when a real provider produced a usable transcript. */
  text: string;
  confidence?: number;
  providerId?: string;
  message: string;
  deterministic: RecognitionDeterministic;
}

const NOT_ATTEMPTED: RecognitionDeterministic = {
  attempted: false,
  success: false,
  verified: false,
  expression: null,
  result: null,
  steps: [],
};

export function createRecognitionRegistry(providers: readonly RecognitionProvider[]) {
  return { providers: [...providers] };
}

export type RecognitionRegistry = ReturnType<typeof createRecognitionRegistry>;

/** Returns the first provider able to handle `kind`, or undefined when none is registered. */
export function getRegisteredRecognitionProvider(
  registry: RecognitionRegistry,
  kind?: RecognitionKind,
): RecognitionProvider | undefined {
  return registry.providers.find((provider) => !kind || provider.kinds.includes(kind));
}

/**
 * Runs the recognized text through the deterministic engine.
 *
 * This is what makes recognition trustworthy: the provider proposes an expression, the
 * engine decides whether it is a real problem and what the answer is. A provider's own
 * claimed answer is never trusted, and a string the engine cannot parse yields
 * `success: false` rather than a plausible-looking number.
 */
export function verifyRecognizedMath(
  text: string,
): RecognitionDeterministic {
  const candidate = text.trim();
  if (!candidate) {
    return { ...NOT_ATTEMPTED, attempted: true, error: 'The recognition produced no readable text.' };
  }

  // Only single-line, bounded text is treated as a problem statement.
  const singleLine = candidate.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (singleLine.length !== 1) {
    return {
      attempted: true,
      success: false,
      verified: false,
      expression: null,
      result: null,
      steps: [],
      error: 'More than one line was recognized. Calcora needs a single mathematical expression.',
    };
  }

  const expression = singleLine[0];
  if (expression.length > 500) {
    return {
      attempted: true,
      success: false,
      verified: false,
      expression: null,
      result: null,
      steps: [],
      error: 'The recognized expression is too long to check.',
    };
  }

  if (expression.includes('=') && /[a-z]/i.test(expression)) {
    const solved = solveEquation(expression);
    if (solved.isValid && !solved.error && solved.solutions.length) {
      return {
        attempted: true,
        success: true,
        verified: true,
        expression,
        result: solved.solutions.join(', '),
        steps: solved.steps ?? [],
      };
    }
    return {
      attempted: true,
      success: false,
      verified: false,
      expression,
      result: null,
      steps: [],
      error: 'The recognized equation could not be solved by Calcora\'s deterministic engine.',
    };
  }

  const calculated = calculateExpression(expression);
  if (!calculated.error && Number.isFinite(calculated.value)) {
    return {
      attempted: true,
      success: true,
      verified: true,
      expression,
      result: String(calculated.value),
      steps: [`${expression} = ${calculated.value}`],
    };
  }

  return {
    attempted: true,
    success: false,
    verified: false,
    expression,
    result: null,
    steps: [],
    error: 'The recognized text is not a mathematical expression Calcora can verify.',
  };
}

async function runRecognition(
  registry: RecognitionRegistry,
  request: RecognitionRequest,
): Promise<RecognitionResult> {
  const provider = getRegisteredRecognitionProvider(registry, request.source);
  if (!provider) {
    return {
      status: 'unavailable',
      text: '',
      message: 'Image and handwriting recognition are unavailable: no OCR or vision provider is configured. '
        + 'Calcora has not generated a transcript and has not uploaded the image.',
      deterministic: { ...NOT_ATTEMPTED },
    };
  }

  let output: RecognitionProviderOutput;
  try {
    output = await provider.recognize(request);
  } catch (error) {
    return {
      status: 'error',
      text: '',
      providerId: provider.id,
      message: `Recognition failed: ${error instanceof Error ? error.message : 'the provider returned an unusable result.'}`,
      deterministic: { ...NOT_ATTEMPTED },
    };
  }

  const text = typeof output?.text === 'string' ? output.text : '';
  if (!text.trim()) {
    return {
      status: 'error',
      text: '',
      confidence: typeof output?.confidence === 'number' ? output.confidence : undefined,
      providerId: provider.id,
      message: 'The recognition provider returned no readable text.',
      deterministic: { ...NOT_ATTEMPTED },
    };
  }

  const confidence = typeof output.confidence === 'number' && Number.isFinite(output.confidence)
    ? Math.min(Math.max(output.confidence, 0), 1)
    : undefined;
  const deterministic = verifyRecognizedMath(text);

  // Low confidence is disclosed: the user is told to check the transcription, and no
  // number is presented as authoritative just because a weak provider produced it.
  const uncertain = confidence !== undefined && confidence < 0.5;

  return {
    status: 'ok',
    text: text.trim(),
    confidence,
    providerId: provider.id,
    message: uncertain
      ? `Recognition is uncertain (${Math.round((confidence ?? 0) * 100)}% confidence). Check the transcription before trusting it.`
      : deterministic.verified
        ? `Verified by Calcora's deterministic engine: ${deterministic.result}`
        : `Transcribed by ${provider.label}, but Calcora's deterministic engine could not verify it. ${deterministic.error ?? ''}`.trim(),
    deterministic,
  };
}

export function recognizeMathImage(
  registry: RecognitionRegistry,
  request: Omit<RecognitionRequest, 'source'>,
): Promise<RecognitionResult> {
  return runRecognition(registry, { ...request, source: 'image' });
}

export function recognizeInkStrokes(
  registry: RecognitionRegistry,
  request: Omit<RecognitionRequest, 'source'>,
): Promise<RecognitionResult> {
  return runRecognition(registry, { ...request, source: 'ink' });
}
