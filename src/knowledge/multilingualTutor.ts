/**
 * Multilingual Mathematics Tutor System
 * Comprehensive linguistic grounding for 26 supported languages.
 * Mathematical notation (numbers, LaTeX formulas, exact values) remains canonical and invariant,
 * while explanations, pedagogical scaffolding, and feedback adapt fluently to the learner's chosen language.
 */

export interface SupportedLanguage {
  code: string;
  name: string;
  nativeName: string;
  isRtl?: boolean;
}

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', isRtl: true },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', isRtl: true },
  { code: 'fa', name: 'Persian', nativeName: 'فارسی', isRtl: true },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
];

export interface MultilingualTemplate {
  answerLabel: string;
  stepPrefix: string;
  verifiedBadge: string;
  offlineNotice: string;
  directAnswerPhrase: (expr: string, res: string) => string;
}

export const MULTILINGUAL_TEMPLATES: Record<string, MultilingualTemplate> = {
  en: {
    answerLabel: 'ANSWER:',
    stepPrefix: 'Step',
    verifiedBadge: 'Verified by Deterministic Engine',
    offlineNotice: 'AI explanation is temporarily unavailable. Calcora calculated and verified the result deterministically.',
    directAnswerPhrase: (expr, res) => `The calculated result is ${res}. ($${expr} = ${res}$)`,
  },
  ur: {
    answerLabel: 'جواب:',
    stepPrefix: 'مرحلہ',
    verifiedBadge: 'حساباتی انجن سے تصدیق شدہ',
    offlineNotice: 'مصنوعی ذہانت کی وضاحت عارضی طور پر غیر دستیاب ہے۔ کالکورا نے نتیجہ حتمی طور پر حساب کیا۔',
    directAnswerPhrase: (expr, res) => `حساب کا حتمی نتیجہ ${res} ہے۔ ($${expr} = ${res}$)`,
  },
  hi: {
    answerLabel: 'उत्तर:',
    stepPrefix: 'चरण',
    verifiedBadge: 'गणितीय इंजन द्वारा सत्यापित',
    offlineNotice: 'एआई स्पष्टीकरण अस्थायी रूप से अनुपलब्ध है। कैलकोरा ने परिणाम की सटीक गणना की है।',
    directAnswerPhrase: (expr, res) => `सटीक परिकलित उत्तर ${res} है। ($${expr} = ${res}$)`,
  },
  ar: {
    answerLabel: 'الإجابة:',
    stepPrefix: 'الخطوة',
    verifiedBadge: 'تم التحقق بواسطة المحرك الحسابي',
    offlineNotice: 'الشرح عبر الذكاء الاصطناعي غير متوفر مؤقتًا. قامت كالكورا بحساب النتيجة بدقة وبشكل قطعي.',
    directAnswerPhrase: (expr, res) => `النتيجة المحسوبة هي ${res}. ($${expr} = ${res}$)`,
  },
  es: {
    answerLabel: 'RESPUESTA:',
    stepPrefix: 'Paso',
    verifiedBadge: 'Verificado por el Motor Determinista',
    offlineNotice: 'La explicación de IA no está disponible temporalmente. Calcora calculó y verificó el resultado localmente.',
    directAnswerPhrase: (expr, res) => `El resultado calculado es ${res}. ($${expr} = ${res}$)`,
  },
  fr: {
    answerLabel: 'RÉPONSE :',
    stepPrefix: 'Étape',
    verifiedBadge: 'Vérifié par le moteur déterministe',
    offlineNotice: 'L\'explication IA est temporairement indisponible. Calcora a calculé et vérifié le résultat de manière déterministe.',
    directAnswerPhrase: (expr, res) => `Le résultat calculé est ${res}. ($${expr} = ${res}$)`,
  },
  de: {
    answerLabel: 'ANTWORT:',
    stepPrefix: 'Schritt',
    verifiedBadge: 'Vom deterministischen Modul verifiziert',
    offlineNotice: 'Die KI-Erklärung ist vorübergehend nicht verfügbar. Calcora hat das Ergebnis deterministisch berechnet.',
    directAnswerPhrase: (expr, res) => `Das berechnete Ergebnis ist ${res}. ($${expr} = ${res}$)`,
  },
  zh: {
    answerLabel: '答案：',
    stepPrefix: '步骤',
    verifiedBadge: '经确定性计算引擎验证',
    offlineNotice: 'AI 解释暂时不可用。Calcora 已对结果进行确定性精确计算与验证。',
    directAnswerPhrase: (expr, res) => `计算得出的最终结果是 ${res}。($${expr} = ${res}$)`,
  },
  ja: {
    answerLabel: '答え：',
    stepPrefix: 'ステップ',
    verifiedBadge: '決定論的エンジンで検証済み',
    offlineNotice: 'AIの説明は一時的に利用できません。Calcoraが結果を厳密に計算・検証しました。',
    directAnswerPhrase: (expr, res) => `計算結果は ${res} です。($${expr} = ${res}$)`,
  },
  ru: {
    answerLabel: 'ОТВЕТ:',
    stepPrefix: 'Шаг',
    verifiedBadge: 'Проверено детерминированным движком',
    offlineNotice: 'Объяснение ИИ временно недоступно. Calcora выполнила точный детерминированный расчет.',
    directAnswerPhrase: (expr, res) => `Вычисленный результат равен ${res}. ($${expr} = ${res}$)`,
  },
};

/**
 * Returns the template for a given language, defaulting to English
 */
export function getLanguageTemplate(langCode: string = 'en'): MultilingualTemplate {
  const norm = (langCode || 'en').toLowerCase().slice(0, 2);
  return MULTILINGUAL_TEMPLATES[norm] || MULTILINGUAL_TEMPLATES.en;
}

/**
 * Generates system prompt instruction for the specified language
 */
export function getLanguageSystemInstruction(langCode: string = 'en'): string {
  const lang = SUPPORTED_LANGUAGES.find(l => l.code === langCode) || SUPPORTED_LANGUAGES[0];
  if (lang.code === 'en') {
    return 'Respond in English. Format all math expressions and variables in standard LaTeX enclosed in dollar signs ($...$).';
  }
  return `MANDATORY LANGUAGE INSTRUCTION:
You MUST provide all your pedagogical explanations, steps, and conversational feedback in ${lang.name} (${lang.nativeName}).
IMPORTANT: Do NOT translate numbers, variables, equation symbols, or LaTeX expressions.
Keep all formulas and calculations in canonical standard LaTeX math syntax (e.g. $7 \\times 8 = 56$, $x^2 - 5x + 6 = 0$).
Translate all explanations, introductions, reasoning, and labels into fluent, grammatically correct ${lang.name}.`;
}
