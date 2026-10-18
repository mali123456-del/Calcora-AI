import type { MathKnowledgeItem } from './knowledgeTypes';

type MultilingualConceptAlias = {
  conceptId: string;
  aliases: Record<string, string[]>;
};

/**
 * Curated multilingual aliases for high-frequency Tutor concepts.
 * Canonical IDs remain the source of truth; aliases only improve discovery.
 */
export const MULTILINGUAL_MATH_CONCEPT_ALIASES: readonly MultilingualConceptAlias[] = [
  {
    conceptId: 'calc-derivatives-rules',
    aliases: {
      en: ['derivative', 'derivatives', 'differentiation', 'rate of change', 'what is a derivative', 'what is derivative', 'power rule', 'x^2', 'x squared', 'become 2x'],
      ur: ['مشتق', 'مشتق کیا ہے', 'تفریق'],
      hi: ['अवकलज', 'अवकलन', 'डेरिवेटिव'],
      ar: ['المشتق', 'مشتقة', 'التفاضل'],
      es: ['derivada', 'derivadas', 'derivación'],
      fr: ['dérivée', 'dérivées', 'dérivation'],
      de: ['ableitung', 'ableitungen', 'differentiation'],
      pt: ['derivada', 'derivadas', 'diferenciação'],
      zh: ['导数', '微分'],
      ja: ['導関数', '微分'],
      ko: ['도함수', '미분'],
    },
  },
  {
    conceptId: 'calc-fundamental-theorem-integrals',
    aliases: {
      en: ['integral', 'integrals', 'integration', 'antiderivative', 'what is an integral', 'what is integral'],
      ur: ['تکمل', 'تکامل', 'تکملی'],
      hi: ['समाकलन', 'समाकल', 'इंटीग्रल'],
      ar: ['التكامل', 'تكامل', 'التكاملات'],
      es: ['integral', 'integrales', 'integración'],
      fr: ['intégrale', 'intégrales', 'intégration'],
      de: ['integral', 'integrale', 'integration'],
      pt: ['integral', 'integrais', 'integração'],
      zh: ['积分', '积分学'],
      ja: ['積分', '積分法'],
      ko: ['적분'],
    },
  },
  {
    conceptId: 'alg-quadratic-formula',
    aliases: {
      en: ['quadratic equation', 'quadratic equations', 'quadratic formula'],
      ur: ['مساوات تربيعی', 'مربع مساوات', 'دو درجی مساوات'],
      hi: ['द्विघात समीकरण', 'द्विघात सूत्र', 'क्वाड्रेटिक समीकरण'],
      ar: ['المعادلة التربيعية', 'المعادلات التربيعية', 'الصيغة التربيعية'],
      es: ['ecuación cuadrática', 'ecuaciones cuadráticas', 'fórmula cuadrática'],
      fr: ['équation quadratique', 'équations quadratiques', 'formule quadratique'],
      de: ['quadratische gleichung', 'quadratische gleichungen', 'mitternachtsformel'],
      pt: ['equação quadrática', 'equações quadráticas', 'fórmula quadrática'],
      zh: ['二次方程', '一元二次方程', '求根公式'],
      ja: ['二次方程式', '二次方程式の解の公式'],
      ko: ['이차방정식', '근의 공식'],
    },
  },
  {
    conceptId: 'alg-linear-equations',
    aliases: {
      en: ['linear equation', 'linear equations'],
      ur: ['خطی مساوات', 'خطی مساواتیں'],
      hi: ['रैखिक समीकरण', 'रैखिक समीकरणों'],
      ar: ['المعادلة الخطية', 'المعادلات الخطية'],
      es: ['ecuación lineal', 'ecuaciones lineales'],
      fr: ['équation linéaire', 'équations linéaires'],
      de: ['lineare gleichung', 'lineare gleichungen'],
      pt: ['equação linear', 'equações lineares'],
      zh: ['线性方程', '线性方程组'],
      ja: ['一次方程式', '線形方程式'],
      ko: ['일차방정식', '선형 방정식'],
    },
  },
  {
    conceptId: 'arith-fractions-operations',
    aliases: {
      en: ['fraction', 'fractions', 'fraction operations'],
      ur: ['کسر', 'کسور', 'کسر کے عملیات'],
      hi: ['भिन्न', 'भिन्नों', 'भिन्न संक्रियाएँ'],
      ar: ['الكسر', 'الكسور', 'عمليات الكسور'],
      es: ['fracción', 'fracciones'],
      fr: ['fraction', 'fractions'],
      de: ['bruch', 'brüche', 'bruchrechnung'],
      pt: ['fração', 'frações'],
      zh: ['分数', '分数运算'],
      ja: ['分数', '分数計算'],
      ko: ['분수', '분수 계산'],
    },
  },
  {
    conceptId: 'arith-exponents-roots',
    aliases: {
      en: ['exponent', 'exponents', 'square root', 'roots'],
      ur: ['اس', 'قوت', 'جذر', 'مربع جذر'],
      hi: ['घातांक', 'घात', 'वर्गमूल', 'मूल'],
      ar: ['الأس', 'الأسس', 'الجذر التربيعي', 'الجذور'],
      es: ['exponente', 'exponentes', 'raíz cuadrada', 'raíces'],
      fr: ['exposant', 'exposants', 'racine carrée', 'racines'],
      de: ['exponent', 'exponenten', 'quadratische wurzel', 'wurzeln'],
      pt: ['expoente', 'expoentes', 'raiz quadrada', 'raízes'],
      zh: ['指数', '平方根', '根式'],
      ja: ['指数', '平方根', '根'],
      ko: ['지수', '제곱근', '근호'],
    },
  },
  {
    conceptId: 'geom-pythagorean-theorem',
    aliases: {
      en: ['pythagorean theorem', 'pythagoras theorem', 'pythagorean'],
      ur: ['فیثاغورث مینڈل', 'پیتھاگورس کا مینڈل'],
      hi: ['पाइथागोरस प्रमेय', 'पाइथागोरस'],
      ar: ['نظرية فيثاغورس', 'فيثاغورس'],
      es: ['teorema de pitágoras', 'pitágoras'],
      fr: ['théorème de pythagore', 'pythagore'],
      de: ['satz des pythagoras', 'pythagoras'],
      pt: ['teorema de pitágoras', 'pitágoras'],
      zh: ['勾股定理', '毕达哥拉斯定理'],
      ja: ['ピタゴラスの定理', 'ピタゴラス'],
      ko: ['피타고라스의 정리', '피타고라스'],
    },
  },
];

const ALIAS_TO_CONCEPT_ID = new Map<string, string>();
for (const entry of MULTILINGUAL_MATH_CONCEPT_ALIASES) {
  for (const aliases of Object.values(entry.aliases)) {
    for (const alias of aliases) {
      ALIAS_TO_CONCEPT_ID.set(alias.trim().toLocaleLowerCase(), entry.conceptId);
    }
  }
}

/**
 * Single-entry memo for the alias scan.
 *
 * The scan is O(aliases) with substring work per alias, and retrieval calls it
 * once per corpus item for the same query, so a single request resolved the
 * whole alias table dozens of times. The function is pure in `query`, so caching
 * the most recent result is behaviour-preserving.
 */
let lastResolvedQuery = '';
let lastResolvedIds: readonly string[] = [];

export function resolveMultilingualConceptIds(query: string): string[] {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) return [];
  if (normalized === lastResolvedQuery) return [...lastResolvedIds];

  // Remove common filler words
  const cleaned = normalized
    .replace(/^(what is|what are|what's|what does|explain|teach me|tell me about|define|meaning of)\s+/i, '')
    .replace(/[?!.]$/, '')
    .trim();

  const matches = new Set<string>();
  for (const [alias, conceptId] of ALIAS_TO_CONCEPT_ID.entries()) {
    // Match if cleaned query equals alias or contains it
    if (cleaned === alias || cleaned.includes(alias) || alias.includes(cleaned)) {
      matches.add(conceptId);
    }
    // Also check original normalized query for backward compatibility
    if (normalized === alias || normalized.includes(alias)) {
      matches.add(conceptId);
    }
  }
  lastResolvedQuery = normalized;
  lastResolvedIds = [...matches];
  return [...lastResolvedIds];
}

export function getMultilingualAliasesForConcept(conceptId: string): string[] {
  const entry = MULTILINGUAL_MATH_CONCEPT_ALIASES.find(item => item.conceptId === conceptId);
  if (!entry) return [];
  return [...new Set(Object.values(entry.aliases).flat())];
}

/**
 * Topic-level localized names, used when the retrieved concept has no alias entry
 * for the requested language. Only terms with an established translation are listed;
 * an absent entry means "no localized name available", never a guess.
 */
const LOCALIZED_TOPIC_NAMES: Record<string, Record<string, string[]>> = {
  algebra: { ur: ['الجبرا'], ar: ['الجبرا'] },
};

/**
 * Returns the curated localized key terms for a concept (or, failing that, its topic)
 * in the requested language.
 *
 * Answers are grounded in the canonical knowledge index, whose definitions are English.
 * When the learner asks in Urdu, the explanation must also *name* the concept the way
 * Urdu mathematics does ("خطی مساوات", "الجبرا"), otherwise the response is English
 * vocabulary under a localized label — the exact defect caught by the language
 * regression suite.
 */
export function getLocalizedTermsForConcept(
  conceptId: string,
  language: string,
  topic?: string,
): string[] {
  const code = language.split(/[-_]/)[0].toLowerCase();
  const entry = MULTILINGUAL_MATH_CONCEPT_ALIASES.find(item => item.conceptId === conceptId);
  const fromConcept = entry?.aliases[code] ?? [];
  const fromTopic = topic
    ? LOCALIZED_TOPIC_NAMES[topic.trim().toLowerCase()]?.[code] ?? []
    : [];
  return [...new Set([...fromConcept, ...fromTopic])];
}

export function rankMultilingualConceptMatch(
  item: MathKnowledgeItem,
  query: string,
): number {
  const ids = resolveMultilingualConceptIds(query);
  return ids.includes(item.id) ? 10000 : 0;
}
