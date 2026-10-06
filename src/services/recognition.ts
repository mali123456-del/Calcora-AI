/**
 * Calcora AI — Browser recognition facade.
 *
 * Keeps the provider registry out of the components: the UI asks for a recognition
 * result and receives the same honest `unavailable` / `error` / `ok` contract that the
 * registry defines. When no provider is registered, recognition genuinely does not
 * happen, and the UI is told so rather than showing a fabricated transcript.
 */
import {
  createRecognitionRegistry,
  recognizeMathImage,
  recognizeInkStrokes,
  type RecognitionKind,
  type RecognitionProvider,
  type RecognitionResult,
} from './recognitionProviders';

/** Size ceiling for recognition input, mirroring the PDF import budget. */
const MAX_RECOGNITION_BYTES = 12 * 1024 * 1024;

let registry = createRecognitionRegistry([]);

/** Registers a real OCR/vision engine. Passing an empty array returns to unavailable. */
export function registerRecognitionProviders(providers: readonly RecognitionProvider[]): void {
  registry = createRecognitionRegistry(providers);
}

export function getRecognitionProviderCount(): number {
  return registry.providers.length;
}

async function readInput(file: File): Promise<Uint8Array> {
  return new Uint8Array(await file.arrayBuffer());
}

async function recognize(
  kind: RecognitionKind,
  file: File,
): Promise<RecognitionResult> {
  if (file.size === 0) {
    return {
      status: 'error',
      text: '',
      message: 'The selected file is empty.',
      deterministic: { attempted: false, success: false, verified: false, expression: null, result: null, steps: [] },
    };
  }
  if (file.size > MAX_RECOGNITION_BYTES) {
    return {
      status: 'error',
      text: '',
      message: `This image is ${(file.size / (1024 * 1024)).toFixed(1)} MB. The recognition limit is ${MAX_RECOGNITION_BYTES / (1024 * 1024)} MB.`,
      deterministic: { attempted: false, success: false, verified: false, expression: null, result: null, steps: [] },
    };
  }

  const request = {
    fileName: file.name || (kind === 'ink' ? 'handwriting.png' : 'capture.png'),
    mediaType: file.type || 'image/png',
    bytes: await readInput(file),
  };

  return kind === 'ink' ? recognizeInkStrokes(registry, request) : recognizeMathImage(registry, request);
}

export function recognizeImage(file: File): Promise<RecognitionResult> {
  return recognize('image', file);
}

export function recognizeInk(file: File): Promise<RecognitionResult> {
  return recognize('ink', file);
}

export type { RecognitionResult, RecognitionProvider };
