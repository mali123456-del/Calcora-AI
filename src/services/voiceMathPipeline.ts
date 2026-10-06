/**
 * Calcora AI — Voice math input pipeline.
 *
 * Pipeline: transcript → language detection → spoken-math sanitization → structured
 * expression → (deterministic engine downstream).
 *
 * The important behaviour here is what happens when speech is *not* a solvable math
 * problem. Forwarding "what is the weather" to the Tutor produces a confident-sounding
 * non-answer, so each transcript gets an explicit verdict and only a genuinely
 * mathematical prompt is passed on. A spoken word is never silently rewritten into a
 * digit: "seven" with no operator is ambiguous, not the answer 7.
 */
import { detectLanguages } from './languageDetection';
import { sanitizeSpokenMath } from '../utils/sanitizer';
import { resolveSpeechRecognitionLocale } from './speechInput';

export type VoiceInputStatus = 'empty' | 'non-math' | 'ambiguous' | 'ready';

export interface VoiceMathInput {
  status: VoiceInputStatus;
  /** Sanitized transcript, safe to display back to the learner. */
  sanitized: string;
  /** What should be sent to the Tutor. Empty unless `status === 'ready'`. */
  prompt: string;
  language: string;
  detectedLanguages: string[];
  /** Locale actually used for the browser recogniser. */
  locale: string;
  message: string;
}

const OPERATOR_OR_RELATION = /[+\-*/^%=<>×÷±]|\b(sqrt|cbrt|log|ln|sin|cos|tan)\b|=/i;
const HAS_MATH_VOCABULARY = /\b(solve|calculate|compute|evaluate|derivative|integral|integrate|limit|equation|function|graph|sum|product|average|mean|median|standard deviation|variance|probability|perimeter|area|volume|angle|hypotenuse|factor|simplify|expand|probability)\b/i;
const HAS_DIGIT = /\d/;
const HAS_MATH_SYMBOL = /[+\-*/^%=<>×÷±√∑∏∫π]/;

/**
 * Decides whether a sanitized transcript is a usable math request.
 *
 * `ambiguous` is separated from `non-math` on purpose: a transcript with digits but no
 * relation is plausibly a math problem the recogniser mangled, so the user is asked to
 * rephrase, rather than being told their question was meaningless.
 */
function classify(sanitized: string): { status: VoiceInputStatus; prompt: string; message: string } {
  if (!sanitized.trim()) {
    return { status: 'empty', prompt: '', message: 'No speech was recognised. Type the request instead.' };
  }

  const hasMathShape = OPERATOR_OR_RELATION.test(sanitized) || HAS_MATH_VOCABULARY.test(sanitized);
  const hasNumber = HAS_DIGIT.test(sanitized) || HAS_MATH_SYMBOL.test(sanitized);

  if (hasMathShape && hasNumber) {
    return { status: 'ready', prompt: sanitized, message: '' };
  }

  if (hasNumber) {
    return {
      status: 'ambiguous',
      prompt: '',
      message: 'That sounded like a number but not a complete question. Say the full problem, '
        + 'for example "two x plus four equals ten", or type it.',
    };
  }

  return {
    status: 'non-math',
    prompt: '',
    message: 'No mathematical expression was detected in that speech. Speak an equation or a '
      + 'calculation, or type it below.',
  };
}

export function prepareVoiceMathInput(
  rawTranscript: string,
  selectedLanguage: string,
  browserLocale = 'en-US',
): VoiceMathInput {
  const sanitized = sanitizeSpokenMath(rawTranscript ?? '');
  const { primary, detected } = detectLanguages(sanitized);

  // An explicit selection wins over detection; "auto" defers to detection.
  const language = selectedLanguage && selectedLanguage !== 'auto' ? selectedLanguage : primary;
  const locale = resolveSpeechRecognitionLocale(selectedLanguage, browserLocale);
  const verdict = classify(sanitized);

  return {
    status: verdict.status,
    sanitized,
    prompt: verdict.prompt,
    language,
    detectedLanguages: detected,
    locale,
    message: verdict.message,
  };
}
