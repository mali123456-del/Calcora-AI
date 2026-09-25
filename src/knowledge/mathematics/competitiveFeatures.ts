export interface CompetitiveFeatureProfile {
  product: string;
  publicCapabilities: string[];
  CalcoraTranslation: string[];
  sourceClass: 'public-product-documentation';
}

// Capability research only. This file stores original summaries of publicly documented
// product behavior; it does not copy proprietary prompts, chat logs, or training datasets.
export const COMPETITIVE_MATH_FEATURE_PROFILES: CompetitiveFeatureProfile[] = [
  { product: 'OpenAI Study Mode', publicCapabilities: ['guided learning', 'step-by-step homework help', 'Socratic questioning', 'layered explanations', 'quizzes and practice', 'uploaded study materials'], CalcoraTranslation: ['Socratic Tutor', 'progressive hints', 'adaptive difficulty', 'PDF/image study grounding', 'practice and mastery tracking'], sourceClass: 'public-product-documentation' },
  { product: 'Khanmigo', publicCapabilities: ['guided tutoring instead of answer-only behavior', 'teacher lesson planning', 'rubrics', 'exit tickets', 'targeted practice', 'interactive learning support'], CalcoraTranslation: ['Teacher Studio', 'worksheet/rubric generator', 'targeted practice generator', 'learning objectives', 'safe tutoring guardrails'], sourceClass: 'public-product-documentation' },
  { product: 'Julius AI', publicCapabilities: ['chat with files', 'data cleaning', 'charts', 'statistical modeling', 'research workflows', 'business analysis', 'Python/R-backed analysis'], CalcoraTranslation: ['Data Lab', 'dataset chat', 'reproducible analysis notebook', 'business scenario analysis', 'statistics tutor'], sourceClass: 'public-product-documentation' },
  { product: 'Microsoft Math Solver', publicCapabilities: ['step-by-step explanations', 'graphing', 'practice resources', 'multilingual math help'], CalcoraTranslation: ['verified step explainer', 'graph workspace', 'practice hub', 'language-aware tutor'], sourceClass: 'public-product-documentation' },
  { product: 'GeoGebra', publicCapabilities: ['graphing', '3D', 'geometry construction', 'CAS', 'probability', 'calculator suite'], CalcoraTranslation: ['2D/3D graph workspace', 'geometry studio', 'CAS workspace', 'probability lab'], sourceClass: 'public-product-documentation' },
  { product: 'Symbolab / Photomath / Mathway', publicCapabilities: ['natural-language math input', 'step-by-step solving', 'photo/problem capture', 'practice and multiple methods'], CalcoraTranslation: ['multimodal math intake', 'multiple-method solver', 'step audit', 'camera/worksheet pipeline'], sourceClass: 'public-product-documentation' },
  { product: 'OpenAI interactive math learning', publicCapabilities: ['interactive visual explanations', 'manipulable variables and formulas', 'real-time graph/outcome exploration'], CalcoraTranslation: ['interactive concept explorer', 'parameter sliders tied to deterministic graphing', 'visual explanation layer'], sourceClass: 'public-product-documentation' },
  { product: 'Google Gemini code execution', publicCapabilities: ['model-generated Python execution', 'iterative reasoning from execution results', 'equation solving and data processing with code'], CalcoraTranslation: ['deterministic tool layer before model reasoning', 'sandboxed analysis path for supported data workflows', 'execution provenance in evaluation metadata'], sourceClass: 'public-product-documentation' },
  { product: 'Anthropic Claude Artifacts', publicCapabilities: ['interactive React components', 'editable visualizations and tools', 'versioned artifact iteration'], CalcoraTranslation: ['persistent math workspaces', 'editable visualization modules', 'workspace-safe iteration without proprietary artifact code'], sourceClass: 'public-product-documentation' },
  { product: 'Wolfram|Alpha step-by-step', publicCapabilities: ['intermediate steps', 'method selection', 'hints', 'broad math topic coverage', 'problem generation'], CalcoraTranslation: ['step walker', 'method compare', 'progressive hints', 'expanded deterministic coverage', 'practice generator'], sourceClass: 'public-product-documentation' },
];

export function buildCompetitiveCapabilityContext(): string {
  return COMPETITIVE_MATH_FEATURE_PROFILES.map((profile) =>
    profile.product + ': ' + profile.publicCapabilities.join('; ') + '. Calcora: ' + profile.CalcoraTranslation.join('; ')
  ).join('\\n');
}
