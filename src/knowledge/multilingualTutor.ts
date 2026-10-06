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
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski' },
  { code: 'cs', name: 'Czech', nativeName: 'Čeština' },
  { code: 'sk', name: 'Slovak', nativeName: 'Slovenčina' },
  { code: 'ro', name: 'Romanian', nativeName: 'Română' },
  { code: 'hu', name: 'Hungarian', nativeName: 'Magyar' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย' },
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili' },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska' },
  { code: 'da', name: 'Danish', nativeName: 'Dansk' },
  { code: 'no', name: 'Norwegian', nativeName: 'Norsk' },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi' },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', isRtl: true },
  { code: 'af', name: 'Afrikaans', nativeName: 'Afrikaans' },
  { code: 'ne', name: 'Nepali', nativeName: 'नेपाली' },
  { code: 'si', name: 'Sinhala', nativeName: 'සිංහල' },
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
  fa: {
    answerLabel: 'پاسخ:',
    stepPrefix: 'مرحله',
    verifiedBadge: 'تأیید شده توسط موتور محاسباتی قطعی',
    offlineNotice: 'توضیحات هوش مصنوعی موقتاً در دسترس نیست. کالکورا نتیجه را با قطعیت کامل محاسبه و تأیید کرد.',
    directAnswerPhrase: (expr, res) => `نتیجه دقیق محاسبه ${res} است. ($${expr} = ${res}$)`,
  },
  bn: {
    answerLabel: 'উত্তর:',
    stepPrefix: 'ধাপ',
    verifiedBadge: 'গাণিতিক ইঞ্জিন দ্বারা যাচাইকৃত',
    offlineNotice: 'এআই ব্যাখ্যা সাময়িকভাবে অনুপলব্ধ। ক্যালকোরা ফলাফলটি নিশ্চিতভাবে গণনা করেছে।',
    directAnswerPhrase: (expr, res) => `গণনাকৃত ফলাফল হলো ${res}। ($${expr} = ${res}$)`,
  },
  pa: {
    answerLabel: 'ਜਵਾਬ:',
    stepPrefix: 'ਕਦਮ',
    verifiedBadge: 'ਗਣਿਤਕ ਇੰਜਣ ਦੁਆਰਾ ਪ੍ਰਮਾਣਿਤ',
    offlineNotice: 'ਏਆਈ ਵਿਆਖਿਆ ਅਸਥਾਈ ਤੌਰ \'ਤੇ ਉਪਲਬਧ ਨਹੀਂ ਹੈ। ਕੈਲਕੋਰਾ ਨੇ ਨਤੀਜਾ ਨਿਰਧਾਰਿਤ ਤੌਰ \'ਤੇ ਗਿਣਿਆ ਹੈ।',
    directAnswerPhrase: (expr, res) => `ਗਿਣਿਆ ਗਿਆ ਨਤੀਜਾ ${res} ਹੈ। ($${expr} = ${res}$)`,
  },
  gu: {
    answerLabel: 'જવાબ:',
    stepPrefix: 'પગલું',
    verifiedBadge: 'ગણિત એન્જિન દ્વારા ચકાસાયેલ',
    offlineNotice: 'AI સમજૂતી અસ્થાયી રૂપે અનુપલબ્ધ છે. કેલ્કોરાએ પરિણામની ચોક્કસ ગણતરી કરી છે.',
    directAnswerPhrase: (expr, res) => `ગણતરી કરેલ પરિણામ ${res} છે. ($${expr} = ${res}$)`,
  },
  mr: {
    answerLabel: 'उत्तर:',
    stepPrefix: 'टप्पा',
    verifiedBadge: 'गणितीय इंजिनद्वारे सत्यापित',
    offlineNotice: 'AI स्पष्टीकरण तात्पुरते अनुपलब्ध आहे. कॅलकोराने अचूक गणना केली आहे.',
    directAnswerPhrase: (expr, res) => `गणना केलेले उत्तर ${res} आहे. ($${expr} = ${res}$)`,
  },
  ta: {
    answerLabel: 'பதில்:',
    stepPrefix: 'படி',
    verifiedBadge: 'கணித இயந்திரத்தால் சரிபார்க்கப்பட்டது',
    offlineNotice: 'AI விளக்கம் தற்காலிகமாக கிடைக்கவில்லை. கால்கோரா முடிவை துல்லியமாகக் கணக்கிட்டது.',
    directAnswerPhrase: (expr, res) => `கணக்கிடப்பட்ட முடிவு ${res} ஆகும். ($${expr} = ${res}$)`,
  },
  te: {
    answerLabel: 'సమాధానం:',
    stepPrefix: 'దశ',
    verifiedBadge: 'గణిత ఇంజిన్ ద్వారా ధృవీకరించబడింది',
    offlineNotice: 'AI వివరణ తాత్కాలికంగా అందుబాటులో లేదు. కాలికోరా ఖచ్చితమైన గణన చేసింది.',
    directAnswerPhrase: (expr, res) => `గణించిన ఫలితం ${res}. ($${expr} = ${res}$)`,
  },
  kn: {
    answerLabel: 'ಉತ್ತರ:',
    stepPrefix: 'ಹಂತ',
    verifiedBadge: 'ಗಣಿತ ಇಂಜಿನ್‌ನಿಂದ ಪರಿಶೀಲಿಸಲಾಗಿದೆ',
    offlineNotice: 'AI ವಿವರಣೆ ತಾತ್ಕಾಲಿಕವಾಗಿ ಲಭ್ಯವಿಲ್ಲ. ಕ್ಯಾಲ್ಕೋರಾ ನಿಖರವಾಗಿ ಲೆಕ್ಕಾಚಾರ ಮಾಡಿದೆ.',
    directAnswerPhrase: (expr, res) => `ಲೆಕ್ಕಹಾಕಿದ ಫಲಿತಾಂಶ ${res}. ($${expr} = ${res}$)`,
  },
  ml: {
    answerLabel: 'ഉത്തരം:',
    stepPrefix: 'ഘട്ടം',
    verifiedBadge: 'ഗണിത എഞ്ചിൻ പരിശോധിച്ചുറപ്പിച്ചത്',
    offlineNotice: 'AI വിശദീകരണം താൽക്കാലികമായി ലഭ്യമല്ല. കാൽകോറ കൃത്യമായ കണക്കുകൂട്ടൽ നടത്തി.',
    directAnswerPhrase: (expr, res) => `കണക്കാക്കിയ ഫലം ${res} ആണ്. ($${expr} = ${res}$)`,
  },
  tr: {
    answerLabel: 'CEVAP:',
    stepPrefix: 'Adım',
    verifiedBadge: 'Deterministik Motor Tarafından Doğrulandı',
    offlineNotice: 'Yapay zeka açıklaması geçici olarak kullanılamıyor. Calcora sonucu kesin olarak hesapladı ve doğruladı.',
    directAnswerPhrase: (expr, res) => `Hesaplanan sonuç ${res} değerindedir. ($${expr} = ${res}$)`,
  },
  id: {
    answerLabel: 'JAWABAN:',
    stepPrefix: 'Langkah',
    verifiedBadge: 'Diverifikasi oleh Mesin Deterministik',
    offlineNotice: 'Penjelasan AI sementara tidak tersedia. Calcora menghitung dan memverifikasi hasil secara deterministik.',
    directAnswerPhrase: (expr, res) => `Hasil perhitungan adalah ${res}. ($${expr} = ${res}$)`,
  },
  ms: {
    answerLabel: 'JAWAPAN:',
    stepPrefix: 'Langkah',
    verifiedBadge: 'Disahkan oleh Enjin Deterministik',
    offlineNotice: 'Penerangan AI tidak tersedia buat sementara waktu. Calcora mengira dan mengesahkan keputusan secara pasti.',
    directAnswerPhrase: (expr, res) => `Keputusan yang dikira ialah ${res}. ($${expr} = ${res}$)`,
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
  es: {
    answerLabel: 'RESPUESTA:',
    stepPrefix: 'Paso',
    verifiedBadge: 'Verificado por el Motor Determinista',
    offlineNotice: 'La explicación de IA no está disponible temporalmente. Calcora calculó y verificó el resultado localmente.',
    directAnswerPhrase: (expr, res) => `El resultado calculado es ${res}. ($${expr} = ${res}$)`,
  },
  pt: {
    answerLabel: 'RESPOSTA:',
    stepPrefix: 'Passo',
    verifiedBadge: 'Verificado pelo Motor Determinístico',
    offlineNotice: 'A explicação da IA está temporariamente indisponível. A Calcora calculou e verificou o resultado deterministicamente.',
    directAnswerPhrase: (expr, res) => `O resultado calculado é ${res}. ($${expr} = ${res}$)`,
  },
  it: {
    answerLabel: 'RISPOSTA:',
    stepPrefix: 'Passaggio',
    verifiedBadge: 'Verificato dal Motore Deterministico',
    offlineNotice: 'La spiegazione IA è temporaneamente non disponibile. Calcora ha calcolato e verificato il risultato in modo deterministico.',
    directAnswerPhrase: (expr, res) => `Il risultato calcolato è ${res}. ($${expr} = ${res}$)`,
  },
  ru: {
    answerLabel: 'ОТВЕТ:',
    stepPrefix: 'Шаг',
    verifiedBadge: 'Проверено детерминированным движком',
    offlineNotice: 'Объяснение ИИ временно недоступно. Calcora выполнила точный детерминированный расчет.',
    directAnswerPhrase: (expr, res) => `Вычисленный результат равен ${res}. ($${expr} = ${res}$)`,
  },
  uk: {
    answerLabel: 'ВІДПОВІДЬ:',
    stepPrefix: 'Крок',
    verifiedBadge: 'Перевірено детерміністичним рушієм',
    offlineNotice: 'Пояснення ШІ тимчасово недоступне. Calcora обчислила і верифікувала результат детерміністично.',
    directAnswerPhrase: (expr, res) => `Обчислений результат дорівнює ${res}. ($${expr} = ${res}$)`,
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
  ko: {
    answerLabel: '정답:',
    stepPrefix: '단계',
    verifiedBadge: '결정론적 엔진으로 검증됨',
    offlineNotice: 'AI 설명은 일시적으로 사용할 수 없습니다. Calcora가 결과를 결정론적으로 계산하고 검증했습니다.',
    directAnswerPhrase: (expr, res) => `계산된 결과는 ${res}입니다. ($${expr} = ${res}$)`,
  },
  nl: {
    answerLabel: 'ANTWOORD:',
    stepPrefix: 'Stap',
    verifiedBadge: 'Geverifieerd door deterministische engine',
    offlineNotice: 'De AI-uitleg is tijdelijk niet beschikbaar. Calcora heeft het resultaat deterministisch berekend en geverifieerd.',
    directAnswerPhrase: (expr, res) => `Het berekende resultaat is ${res}. ($${expr} = ${res}$)`,
  },
  pl: {
    answerLabel: 'ODPOWIEDŹ:',
    stepPrefix: 'Krok',
    verifiedBadge: 'Zweryfikowane przez silnik deterministyczny',
    offlineNotice: 'Wyjaśnienie AI jest tymczasowo niedostępne. Calcora obliczyła i zweryfikowała wynik deterministycznie.',
    directAnswerPhrase: (expr, res) => `Obliczony wynik to ${res}. ($${expr} = ${res}$)`,
  },
  cs: {
    answerLabel: 'ODPOVĚĎ:',
    stepPrefix: 'Krok',
    verifiedBadge: 'Ověřeno deterministickým strojem',
    offlineNotice: 'Vysvětlení AI je dočasně nedostupné. Calcora výsledek deterministicky vypočítala a ověřila.',
    directAnswerPhrase: (expr, res) => `Vypočtený výsledek je ${res}. ($${expr} = ${res}$)`,
  },
  sk: {
    answerLabel: 'ODPOVEĎ:',
    stepPrefix: 'Krok',
    verifiedBadge: 'Overené deterministickým strojom',
    offlineNotice: 'Vysvetlenie AI je dočasne nedostupné. Calcora výsledok deterministicky vypočítala a overila.',
    directAnswerPhrase: (expr, res) => `Vypočítaný výsledok je ${res}. ($${expr} = ${res}$)`,
  },
  ro: {
    answerLabel: 'RĂSPUNS:',
    stepPrefix: 'Pas',
    verifiedBadge: 'Verificat de motorul determinist',
    offlineNotice: 'Explicația AI este temporar indisponibilă. Calcora a calculat și verificat rezultatul în mod determinist.',
    directAnswerPhrase: (expr, res) => `Rezultatul calculat este ${res}. ($${expr} = ${res}$)`,
  },
  hu: {
    answerLabel: 'VÁLASZ:',
    stepPrefix: 'Lépés',
    verifiedBadge: 'Determinisztikus motor által ellenőrizve',
    offlineNotice: 'Az AI-magyarázat átmenetileg nem elérhető. A Calcora determinisztikusan kiszámította és ellenőrizte az eredményt.',
    directAnswerPhrase: (expr, res) => `A kiszámított eredmény ${res}. ($${expr} = ${res}$)`,
  },
  vi: {
    answerLabel: 'TRẢ LỜI:',
    stepPrefix: 'Bước',
    verifiedBadge: 'Đã xác minh bởi động cơ tất định',
    offlineNotice: 'Giải thích bằng AI tạm thời không khả dụng. Calcora đã tính và xác minh kết quả một cách tất định.',
    directAnswerPhrase: (expr, res) => `Kết quả tính được là ${res}. ($${expr} = ${res}$)`,
  },
  th: {
    answerLabel: 'คำตอบ:',
    stepPrefix: 'ขั้นตอน',
    verifiedBadge: 'ตรวจสอบโดยกลไกกำหนดผลลัพธ์',
    offlineNotice: 'คำอธิบายจาก AI ไม่พร้อมใช้งานชั่วคราว Calcora ได้คำนวณและตรวจสอบผลลัพธ์อย่างแน่นอนแล้ว',
    directAnswerPhrase: (expr, res) => `ผลลัพธ์ที่คำนวณได้คือ ${res} ($${expr} = ${res}$)`,
  },
  sw: {
    answerLabel: 'JIBU:',
    stepPrefix: 'Hatua',
    verifiedBadge: 'Imethibitishwa na Injini ya Uhakika',
    offlineNotice: 'Maelezo ya AI hayapatikani kwa muda. Calcora ilikokotoa na kuthibitisha jibu kwa uhakika.',
    directAnswerPhrase: (expr, res) => `Jibu lililokokotolewa ni ${res}. ($${expr} = ${res}$)`,
  },
  el: {
    answerLabel: 'ΑΠΑΝΤΗΣΗ:',
    stepPrefix: 'Βήμα',
    verifiedBadge: 'Επαληθεύτηκε από τη ντετερμινιστική μηχανή',
    offlineNotice: 'Η εξήγηση της τεχνητής νοημοσύνης δεν είναι προσωρινά διαθέσιμη. Το Calcora υπολόγισε και επαλήθευσε το αποτέλεσμα ντετερμινιστικά.',
    directAnswerPhrase: (expr, res) => `Το υπολογισμένο αποτέλεσμα είναι ${res}. ($${expr} = ${res}$)`,
  },
  sv: {
    answerLabel: 'SVAR:',
    stepPrefix: 'Steg',
    verifiedBadge: 'Verifierat av deterministisk motor',
    offlineNotice: 'AI-förklaringen är tillfälligt otillgänglig. Calcora beräknade och verifierade resultatet deterministiskt.',
    directAnswerPhrase: (expr, res) => `Det beräknade resultatet är ${res}. ($${expr} = ${res}$)`,
  },
  da: {
    answerLabel: 'SVAR:',
    stepPrefix: 'Trin',
    verifiedBadge: 'Verificeret af deterministisk motor',
    offlineNotice: 'AI-forklaringen er midlertidigt utilgængelig. Calcora beregnede og verificerede resultatet deterministisk.',
    directAnswerPhrase: (expr, res) => `Det beregnede resultat er ${res}. ($${expr} = ${res}$)`,
  },
  no: {
    answerLabel: 'SVAR:',
    stepPrefix: 'Trinn',
    verifiedBadge: 'Verifisert av deterministisk motor',
    offlineNotice: 'AI-forklaringen er midlertidig utilgjengelig. Calcora beregnet og verifiserte resultatet deterministisk.',
    directAnswerPhrase: (expr, res) => `Det beregnede resultatet er ${res}. ($${expr} = ${res}$)`,
  },
  fi: {
    answerLabel: 'VASTAUS:',
    stepPrefix: 'Vaihe',
    verifiedBadge: 'Deterministisen moottorin vahvistama',
    offlineNotice: 'Tekoälyn selitys ei ole väliaikaisesti saatavilla. Calcora laski ja vahvisti tuloksen deterministisesti.',
    directAnswerPhrase: (expr, res) => `Laskettu tulos on ${res}. ($${expr} = ${res}$)`,
  },
  he: {
    answerLabel: 'תשובה:',
    stepPrefix: 'שלב',
    verifiedBadge: 'אומת על ידי מנוע דטרמיניסטי',
    offlineNotice: 'ההסבר של הבינה המלאכותית אינו זמין זמנית. Calcora חישבה ואימתה את התוצאה באופן דטרמיניסטי.',
    directAnswerPhrase: (expr, res) => `התוצאה המחושבת היא ${res}. ($${expr} = ${res}$)`,
  },
  af: {
    answerLabel: 'ANTWOORD:',
    stepPrefix: 'Stap',
    verifiedBadge: 'Geverifieer deur deterministiese enjin',
    offlineNotice: 'Die KI-verduideliking is tydelik nie beskikbaar nie. Calcora het die resultaat deterministies bereken en verifieer.',
    directAnswerPhrase: (expr, res) => `Die berekende resultaat is ${res}. ($${expr} = ${res}$)`,
  },
  ne: {
    answerLabel: 'उत्तर:',
    stepPrefix: 'चरण',
    verifiedBadge: 'निर्धारक इन्जिनद्वारा प्रमाणित',
    offlineNotice: 'AI स्पष्टीकरण अस्थायी रूपमा उपलब्ध छैन। क्यालकोराले नतिजा निश्चित रूपमा गणना र प्रमाणित गर्यो।',
    directAnswerPhrase: (expr, res) => `गणना गरिएको नतिजा ${res} हो। ($${expr} = ${res}$)`,
  },
  si: {
    answerLabel: 'පිළිතුර:',
    stepPrefix: 'පියවර',
    verifiedBadge: 'නිර්ණායක එන්ජිම මගින් සත්‍යාපිතයි',
    offlineNotice: 'AI පැහැදිලි කිරීම තාවකාලිකව නොමැත. Calcora ප්‍රතිඵලය නිශ්චිතව ගණනය කර සත්‍යාපනය කළේය.',
    directAnswerPhrase: (expr, res) => `ගණනය කළ ප්‍රතිඵලය ${res} වේ. ($${expr} = ${res}$)`,
  },
};

/**
 * Returns the template for a given language, defaulting to English
 */
export function getLanguageTemplate(langCode: string = 'en'): MultilingualTemplate {
  const norm = (langCode || 'en').toLowerCase().slice(0, 2);
  const template = MULTILINGUAL_TEMPLATES[norm] || MULTILINGUAL_TEMPLATES.en;
  return withEquationSafeDirectAnswer(template);
}

/**
 * Renders `<expr> = <res>` only when the expression is not already an equation.
 *
 * The per-language `directAnswerPhrase` templates all append `= ${res}`. When the
 * deterministic engine returns an already-solved equation (e.g. `2x + 5 = 15`) that
 * produced the false statement `2x + 5 = 15 = 5`. Wrap the phrase once here instead of
 * patching every language entry.
 */
function withEquationSafeDirectAnswer(template: MultilingualTemplate): MultilingualTemplate {
  const phrase = template.directAnswerPhrase;
  return {
    ...template,
    directAnswerPhrase: (expr, res) => {
      const value = String(expr ?? '').trim();
      if (!value.includes('=')) return phrase(expr, res);
      return phrase(expr, res).replace(`$${expr} = ${res}$`, `$${expr} \\Rightarrow ${res}$`);
    },
  };
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
