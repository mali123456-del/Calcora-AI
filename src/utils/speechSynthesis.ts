/**
 * Text-to-Speech (TTS) synthesis utility with mathematical text-to-speech converter.
 * Converts LaTeX formulas, symbols, and mathematical notations into smooth,
 * natural-sounding English speech before reading out step-by-step explanations.
 */

export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
}

/**
 * Converts mathematical markdown and LaTeX formatting into clear spoken language.
 */
export function convertMathToSpokenText(markdown: string): string {
  if (!markdown) return '';

  let text = markdown;

  // 1. Remove markdown bold, italic, code ticks, headers, links
  text = text
    .replace(/```[\s\S]*?```/g, ' code block omitted ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  // 2. Convert common LaTeX fractions: \frac{a}{b} -> "a over b"
  text = text.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '$1 over $2');

  // 3. Convert square roots: \sqrt{x} -> "square root of x", \sqrt[n]{x} -> "root n of x"
  text = text.replace(/\\sqrt\[([^{}]+)\]\{([^{}]+)\}/g, '$1 root of $2');
  text = text.replace(/\\sqrt\{([^{}]+)\}/g, 'square root of $1');

  // 4. Convert powers: x^{2} or x^2 -> "x squared", x^{3} or x^3 -> "x cubed", x^{n} -> "x to the power of n"
  text = text.replace(/(\w+)\^\{?2\}?/g, '$1 squared');
  text = text.replace(/(\w+)\^\{?3\}?/g, '$1 cubed');
  text = text.replace(/(\w+)\^\{([^}]+)\}/g, '$1 to the power of $2');
  text = text.replace(/(\w+)\^([a-zA-Z0-9]+)/g, '$1 to the power of $2');

  // 5. Convert common LaTeX mathematical symbols
  const latexSymbols: [RegExp, string][] = [
    [/\\pm\b/g, ' plus or minus '],
    [/\\mp\b/g, ' minus or plus '],
    [/\\times\b/g, ' times '],
    [/\\cdot\b/g, ' times '],
    [/\\div\b/g, ' divided by '],
    [/\\leq?\b/g, ' is less than or equal to '],
    [/\\geq?\b/g, ' is greater than or equal to '],
    [/\\neq\b/g, ' is not equal to '],
    [/\\approx\b/g, ' is approximately '],
    [/\\infty\b/g, ' infinity '],
    [/\\pi\b/g, ' pi '],
    [/\\theta\b/g, ' theta '],
    [/\\alpha\b/g, ' alpha '],
    [/\\beta\b/g, ' beta '],
    [/\\gamma\b/g, ' gamma '],
    [/\\delta\b/g, ' delta '],
    [/\\lambda\b/g, ' lambda '],
    [/\\mu\b/g, ' mu '],
    [/\\sigma\b/g, ' sigma '],
    [/\\sin\b/g, ' sine '],
    [/\\cos\b/g, ' cosine '],
    [/\\tan\b/g, ' tangent '],
    [/\\ln\b/g, ' natural log of '],
    [/\\log\b/g, ' log of '],
    [/\\left[([{|.]/g, ' '],
    [/\\right[)\]}|.]/g, ' '],
  ];

  for (const [pattern, replacement] of latexSymbols) {
    text = text.replace(pattern, replacement);
  }

  // 6. Strip math delimiters $ and $$
  text = text.replace(/\$\$([\s\S]*?)\$\$/g, '$1');
  text = text.replace(/\$([^\$]+)\$/g, '$1');

  // 7. Strip leftover backslashes and LaTeX commands
  text = text.replace(/\\[a-zA-Z]+/g, ' ');

  // 8. Normalize mathematical operators
  text = text
    .replace(/≠/g, ' is not equal to ')
    .replace(/≤/g, ' is less than or equal to ')
    .replace(/≥/g, ' is greater than or equal to ')
    .replace(/≈/g, ' is approximately ')
    .replace(/±/g, ' plus or minus ')
    .replace(/²/g, ' squared ')
    .replace(/³/g, ' cubed ')
    .replace(/\+/g, ' plus ')
    .replace(/=/g, ' equals ')
    .replace(/\*/g, ' times ');

  // 9. Clean up multiple spaces and punctuation
  text = text.replace(/\s+/g, ' ').trim();

  return text;
}

export interface SpeakOptions {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: any) => void;
  rate?: number;
  pitch?: number;
}

let activeUtterance: SpeechSynthesisUtterance | null = null;

export function stopSpeaking(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
      activeUtterance = null;
    } catch {
      // ignore
    }
  }
}

export function pauseSpeaking(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.pause();
    } catch {
      // ignore
    }
  }
}

export function resumeSpeaking(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.resume();
    } catch {
      // ignore
    }
  }
}

export function speakText(
  text: string,
  options: SpeakOptions = {}
): SpeechSynthesisUtterance | null {
  if (!isSpeechSynthesisSupported()) {
    options.onError?.(new Error('Speech synthesis not supported in this browser.'));
    return null;
  }

  stopSpeaking();

  const spokenCleanText = convertMathToSpokenText(text);
  if (!spokenCleanText.trim()) {
    options.onEnd?.();
    return null;
  }

  try {
    const utterance = new SpeechSynthesisUtterance(spokenCleanText);
    utterance.rate = options.rate ?? 1.0;
    utterance.pitch = options.pitch ?? 1.0;
    utterance.lang = 'en-US';

    // Pick an English voice if available
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(
      (v) => (v.lang.startsWith('en') || v.lang === 'en-US') && (v.name.includes('Google') || v.name.includes('Natural') || !v.localService)
    ) || voices.find((v) => v.lang.startsWith('en'));

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => {
      options.onStart?.();
    };

    utterance.onend = () => {
      activeUtterance = null;
      options.onEnd?.();
    };

    utterance.onerror = (e) => {
      activeUtterance = null;
      // Do not treat cancellation as a hard error
      if (e.error !== 'canceled' && e.error !== 'interrupted') {
        options.onError?.(e);
      } else {
        options.onEnd?.();
      }
    };

    activeUtterance = utterance;
    window.speechSynthesis.speak(utterance);
    return utterance;
  } catch (err) {
    options.onError?.(err);
    return null;
  }
}
