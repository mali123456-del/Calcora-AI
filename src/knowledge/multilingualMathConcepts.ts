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
      en: ['derivative', 'derivatives', 'differentiation', 'rate of change'],
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
      en: ['integral', 'integrals', 'integration', 'antiderivative'],
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
];

const ALIAS_TO_CONCEPT_ID = new Map<string, string>();
for (const entry of MULTILINGUAL_MATH_CONCEPT_ALIASES) {
  for (const aliases of Object.values(entry.aliases)) {
    for (const alias of aliases) {
      ALIAS_TO_CONCEPT_ID.set(alias.trim().toLocaleLowerCase(), entry.conceptId);
    }
  }
}

export function resolveMultilingualConceptIds(query: string): string[] {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) return [];

  const matches = new Set<string>();
  for (const [alias, conceptId] of ALIAS_TO_CONCEPT_ID.entries()) {
    if (normalized === alias || normalized.includes(alias)) matches.add(conceptId);
  }
  return [...matches];
}

export function getMultilingualAliasesForConcept(conceptId: string): string[] {
  const entry = MULTILINGUAL_MATH_CONCEPT_ALIASES.find(item => item.conceptId === conceptId);
  if (!entry) return [];
  return [...new Set(Object.values(entry.aliases).flat())];
}

export function rankMultilingualConceptMatch(
  item: MathKnowledgeItem,
  query: string,
): number {
  const ids = resolveMultilingualConceptIds(query);
  return ids.includes(item.id) ? 250 : 0;
}
