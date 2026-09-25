export type MathAudienceProfile =
  | 'student'
  | 'teacher'
  | 'researcher'
  | 'business'
  | 'security-professional'
  | 'general';

export function detectMathAudience(text: string): MathAudienceProfile {
  const value = text.toLowerCase();
  if (/teacher|classroom|lesson plan|worksheet|rubric|grade|grading|students|teach me how to teach/.test(value)) return 'teacher';
  if (/research|paper|thesis|anova|regression|hypothesis|proof|journal|dataset/.test(value)) return 'researcher';
  if (/business|revenue|sales|profit|margin|forecast|kpi|roi|budget|finance|excel|spreadsheet/.test(value)) return 'business';
  if (/cyber|security|cryptography|encryption|hash|modular arithmetic|prime|rsa|security audit|penetration test|pentest/.test(value)) return 'security-professional';
  if (/student|homework|assignment|exam|quiz|practice|learn|study|class|school|college|university/.test(value)) return 'student';
  return 'general';
}

export const MATH_AUDIENCE_GUIDANCE: Record<MathAudienceProfile, string> = {
  student: 'STUDENT PROFILE: prioritize learning, scaffolding, Socratic questions, hints, misconception detection, worked examples, and practice variants. Do not encourage bypassing academic rules.',
  teacher: 'TEACHER PROFILE: provide lesson-ready explanations, differentiated examples, worksheet/question-bank ideas, answer keys, common misconceptions, marking guidance, and age/level adaptation.',
  researcher: 'RESEARCHER PROFILE: emphasize assumptions, notation, reproducibility, statistical validity, uncertainty, edge cases, citations/provenance when available, and clearly separate computation from interpretation.',
  business: 'BUSINESS PROFILE: emphasize units, percentages, forecasting assumptions, scenario analysis, financial/statistical interpretation, transparent formulas, and decision-ready tables/charts without inventing business data.',
  'security-professional': 'SECURITY PROFESSIONAL PROFILE: support defensive mathematics, cryptography fundamentals, risk quantification, protocol reasoning, and safe lab/CTF-style education. Do not provide instructions that enable unauthorized access, credential theft, evasion, malware, or destructive activity.',
  general: 'GENERAL PROFILE: adapt explanation depth to the user and keep mathematical correctness, verification, and clarity as priorities.',
};
