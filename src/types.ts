/** Core Types for Digital AI Scientific Calculator */
export type AngleMode = 'DEG' | 'RAD' | 'GRAD';
export type ThemeMode = 'dark' | 'light' | 'system';
export type CalculatorSubMode = 'standard' | 'scientific' | 'engineering' | 'programmer';
export type PrecisionMode = 'auto' | 2 | 4 | 6 | 8 | 10 | 12;
export type ActiveTab = 'home'|'calculator'|'graph'|'equations'|'calculus'|'matrix'|'programmer'|'statistics'|'engineering'|'units'|'finance'|'currency'|'ai'|'tutor'|'formulas'|'practice'|'multimodal'|'datalab'|'notebook'|'workspaces'|'history'|'settings';
export interface HistoryItem { id:string; expression:string; result:string; angleMode:AngleMode; precision?:PrecisionMode; mode?:CalculatorSubMode; category?:string; isFavorite?:boolean; notes?:string; verified?:boolean; timestamp:number; }
export interface CalculationResult { value:number; display:string; exactFraction?:string; error?:string; steps?:string[]; }
export interface Fraction { numerator:number; denominator:number; }
export type BitWidth=8|16|32|64; export type NumberBase='HEX'|'DEC'|'OCT'|'BIN';
export interface ProgrammerState { currentValue:bigint; bitWidth:BitWidth; activeBase:NumberBase; isUnsigned:boolean; }
export type Matrix=number[][];
export interface MatrixOperationResult { matrix?:Matrix; scalar?:number; steps:string[]; explanation:string; error?:string; }
export interface Vector3D { x:number; y:number; z?:number; }
export interface VectorOperationResult { vector?:Vector3D; scalar?:number; angleDeg?:number; steps:string[]; explanation:string; error?:string; }
export interface EquationSolution { equation:string; type:'linear'|'quadratic'|'cubic'|'polynomial'|'system'|'unsupported'; variables:string[]; solutions:number[]; solutionPairs?:Record<string,number>[]; steps:string[]; discriminant?:number; explanation:string; isValid:boolean; error?:string; }
export interface CalculusResult { type:'derivative'|'integral'|'limit'; expression:string; variable:string; resultDisplay:string; numericValue?:number; steps:string[]; explanation:string; error?:string; }
export interface GraphFunction { id:string; expression:string; color:string; visible:boolean; }
export interface GraphViewport { xMin:number; xMax:number; yMin:number; yMax:number; }
export interface StatisticsResult { count:number; sum:number; mean:number; median:number; mode:number[]; min:number; max:number; range:number; varianceSample:number; variancePopulation:number; stdDevSample:number; stdDevPopulation:number; q1:number; q3:number; iqr:number; sortedData:number[]; }
export interface RegressionResult { type:'linear'|'polynomial'; equation:string; slope?:number; intercept?:number; r:number; rSquared:number; residuals:{x:number;y:number;predicted:number;residual:number}[]; }
export type UnitCategory='length'|'weight'|'temperature'|'area'|'volume'|'speed'|'time'|'pressure'|'energy'|'power'|'data'|'frequency'|'voltage'|'current'|'resistance'|'angle';
export interface UnitDefinition { id:string; name:string; symbol:string; toBase:(val:number)=>number; fromBase:(val:number)=>number; }
export interface UnitCategoryData { id:UnitCategory; name:string; iconName:string; units:UnitDefinition[]; }
export type FinanceTool='percentage'|'discount'|'tip'|'simpleInterest'|'compoundInterest'|'loanPayment'|'investment'|'savingsGoal'|'inflation'|'roi'|'tax'|'currency';
export interface AmortizationRow { month:number; payment:number; principalPart:number; interestPart:number; balance:number; }
export interface LoanPaymentResult { monthlyPayment:number; totalPayment:number; totalInterest:number; schedule:AmortizationRow[]; }
export interface PercentageCalcParams { type:'percentOf'|'whatPercent'|'percentChange'; valA:number; valB:number; }
export interface DiscountCalcParams { originalPrice:number; discountPercent:number; }
export interface TipCalcParams { billAmount:number; tipPercent:number; numPeople:number; }
export interface SimpleInterestParams { principal:number; rateAnnualPercent:number; timeYears:number; }
export interface CompoundInterestParams { principal:number; rateAnnualPercent:number; compoundsPerYear:number; timeYears:number; }
export interface LoanPaymentParams { principal:number; annualRatePercent:number; termYears:number; }
export interface InvestmentParams { initialInvestment:number; monthlyContribution:number; annualRatePercent:number; timeYears:number; }
export interface SavingsGoalParams { targetAmount:number; annualRatePercent:number; timeYears:number; }
export interface InflationParams { currentAmount:number; annualInflationPercent:number; timeYears:number; }
export interface RoiParams { initialCost:number; finalRevenue:number; }
export interface TaxParams { amount:number; taxRatePercent:number; }
export interface FormulaItem { id:string; name:string; category:'algebra'|'geometry'|'trigonometry'|'calculus'|'statistics'|'physics'|'engineering'|'finance'; latex:string; displayFormula:string; description:string; variables:{symbol:string;name:string;unit?:string}[]; exampleCalculation?:string; defaultExpression?:string; isFavorite?:boolean; }
export interface CalculationNote { id:string; title:string; content:string; associatedExpression?:string; associatedResult?:string; timestamp:number; }
export interface WorkspaceSession { id:string; name:string; description?:string; category:'general'|'physics'|'finance'|'engineering'|'math'; historyItems:HistoryItem[]; notes:CalculationNote[]; created:number; lastModified:number; }
export interface AppSettings { theme:ThemeMode; defaultMode:CalculatorSubMode; defaultAngle:AngleMode; precision:PrecisionMode; thousandsSeparator:boolean; scientificNotationThreshold:number; highContrast:boolean; reducedMotion:boolean; aiMode:'copilot'|'tutor'|'strict'; explanationDetail:'concise'|'detailed'|'pedagogical'; autoSaveHistory:boolean; maxHistoryRecords:number; }
export type AIMode='explain'|'solve'|'teach'|'verify'|'practice'|'hint'|'quiz';
export type AIMessageVerification = import('./verification/verificationStates').VerificationOutcome;
export interface AIMessage { id:string; role:'user'|'assistant'; content:string; expression?:string; result?:string; steps?:string[]; formula?:string; isVerified?:boolean; verificationNote?:string; /**
 * Canonical four-state verification for this message. When present it is the single
 * source of truth for the badge; `isVerified` is a derived legacy convenience.
 */
verification?:AIMessageVerification; responseSource?:'gemini'|'local-deterministic'|'local-model'|'document-grounded'|'document-insufficient-evidence'; providerMessage?:string; timestamp:number; isError?:boolean; }
export interface QuizQuestion { id:string; topic:string; difficulty:'beginner'|'intermediate'|'advanced'; question:string; options:string[]; correctOptionIndex:number; explanation:string; hints:string[]; }


/** Canonical deterministic contract consumed by Tutor orchestration. */
export interface MathVerificationBadge {
  isVerified: boolean;
  verificationMethod: string;
  verificationMessage: string;
  timestamp?: string;
  confidence: number;
}

export interface MathToolResult {
  success: boolean;
  toolName: string;
  expression: string;
  result: string;
  exactResult: string;
  approximateResult?: string;
  derivationSteps: string[];
  formula?: string | null;
  domain?: string | null;
  domainRestrictions: string[];
  verificationBadge: MathVerificationBadge;
  executionTimeMs?: number;
  metadata?: Record<string, unknown>;
  error?: string;
  steps?: string[];
  restrictions?: string[];
  verification?: { isVerified: boolean; method: string; message: string };
}
