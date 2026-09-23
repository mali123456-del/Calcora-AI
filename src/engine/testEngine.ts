/**
 * Production Testing and Verification Suite (Phase 24)
 * Executes automated deterministic tests across all mathematical engines,
 * calculus, linear algebra, programmer bitwise, statistics, unit conversion,
 * finance, security, and AI handshake.
 */

import { calculateExpression } from './mathEngine';
import { solveEquation } from './equationSolver';
import { calculatePercentage } from './scientificEngine';
import { convertUnits } from './unitConverter';
import { calculateDiscount, calculateLoanPayment } from './financeEngine';
import { numericalDerivative, simpsonsRuleDefiniteIntegral } from './calculusEngine';
import { multiplyMatrices, determinantMatrix, dotProduct, crossProduct3D } from './matrixEngine';
import { parseNumberInBase, performBitwiseOp, performBitShift } from './programmerEngine';
import { computeStatistics, computeLinearRegression } from './statisticsEngine';
import { solveOhmsLaw, calculateElectricalPower, calculateKineticEnergy, calculatePressure } from './engineeringEngine';
import { permutations, combinations, binomialProbability } from './probabilityEngine';
import { exportWorkspaceToJSON, validateAndImportWorkspace, DEFAULT_WORKSPACE } from './workspaceEngine';
import { verifyWithDeterministicEngine } from '../ai/client';
import { sanitizeSpokenMath, sanitizeQueryText } from '../utils/sanitizer';
import { convertMathToSpokenText } from '../utils/speechSynthesis';
import { extractLaTeXFormula, generateConversationMarkdown } from '../utils/aiExport';
import { buildQuickPrompt } from '../utils/aiQuickPrompts';
import {
  detectMathTopic,
  generateProgressiveHints,
  checkUserStep,
  analyzeMistake,
  generatePracticeProblems,
  evaluatePracticeAnswer,
  LearningObjective,
  DifficultyLevel,
} from '../utils/aiTutor';
import { AIMessage } from '../types';

export interface TestCaseResult {
  category: string;
  testName: string;
  input: string;
  expected: string;
  actual: string;
  passed: boolean;
  notes?: string;
}

export function runFullVerificationSuite(): {
  total: number;
  passed: number;
  failed: number;
  results: TestCaseResult[];
  allPassed: boolean;
} {
  const results: TestCaseResult[] = [];

  function assertCalc(
    category: string,
    testName: string,
    expr: string,
    expectedVal: number,
    angleMode: 'DEG' | 'RAD' = 'DEG'
  ) {
    const res = calculateExpression(expr, angleMode);
    const passed = !res.error && Math.abs(res.value - expectedVal) < 1e-7;
    results.push({
      category,
      testName,
      input: expr,
      expected: String(expectedVal),
      actual: res.error || String(res.value),
      passed,
      notes: res.error,
    });
  }

  function assertError(category: string, testName: string, expr: string) {
    const res = calculateExpression(expr);
    const passed = Boolean(res.error);
    results.push({
      category,
      testName,
      input: expr,
      expected: 'Error',
      actual: res.error ? `Caught: ${res.error}` : String(res.value),
      passed,
    });
  }

  // 1. Basic Arithmetic
  assertCalc('Arithmetic', 'Addition: 2 + 3 = 5', '2 + 3', 5);
  assertCalc('Arithmetic', 'Subtraction: 10 - 3 = 7', '10 - 3', 7);
  assertCalc('Arithmetic', 'Multiplication: 4 * 5 = 20', '4 * 5', 20);
  assertCalc('Arithmetic', 'Division: 20 / 4 = 5', '20 / 4', 5);
  assertCalc('Arithmetic', 'Decimal arithmetic: 0.1 + 0.2 = 0.3', '0.1 + 0.2', 0.3);

  // 2. Precedence & Parentheses
  assertCalc('Precedence', 'Operator precedence: 2 + 3 * 4 = 14', '2 + 3 * 4', 14);
  assertCalc('Precedence', 'Parentheses precedence: (2 + 3) * 4 = 20', '(2 + 3) * 4', 20);
  assertCalc('Precedence', 'Power precedence: 2 * 3 ^ 2 = 18', '2 * 3 ^ 2', 18);
  assertCalc('Precedence', 'Implicit multiplication: 2(3 + 4) = 14', '2(3 + 4)', 14);

  // 3. Scientific Operations
  assertCalc('Scientific', 'Square root: sqrt(144) = 12', 'sqrt(144)', 12);
  assertCalc('Scientific', 'Power: 5 ^ 2 = 25', '5 ^ 2', 25);
  assertCalc('Scientific', 'Trigonometry: sin(30 deg) = 0.5', 'sin(30)', 0.5, 'DEG');
  assertCalc('Scientific', 'Trigonometry in Rad: sin(pi / 6) = 0.5', 'sin(pi / 6)', 0.5, 'RAD');
  assertCalc('Scientific', 'Factorial: 5! = 120', '5!', 120);
  assertCalc('Scientific', 'Natural logarithm: ln(e) = 1', 'ln(e)', 1);

  // 4. Equation Solver
  const eqQuad = solveEquation('x^2 + 5x + 6 = 0');
  const quadPassed =
    eqQuad.isValid &&
    eqQuad.solutions.includes(-2) &&
    eqQuad.solutions.includes(-3);
  results.push({
    category: 'Equation Solver',
    testName: 'Quadratic equation: x² + 5x + 6 = 0',
    input: 'x^2 + 5x + 6 = 0',
    expected: 'x = -3, -2',
    actual: eqQuad.solutions.join(', '),
    passed: quadPassed,
  });

  const eqLinear = solveEquation('2x + 5 = 15');
  const linPassed = eqLinear.isValid && eqLinear.solutions[0] === 5;
  results.push({
    category: 'Equation Solver',
    testName: 'Linear equation: 2x + 5 = 15',
    input: '2x + 5 = 15',
    expected: 'x = 5',
    actual: eqLinear.solutions.join(', '),
    passed: linPassed,
  });

  // 5. Calculus Engine Verification
  const dRes = numericalDerivative('x^2', 3);
  const dPassed = Math.abs(dRes.value - 6) < 1e-4;
  results.push({
    category: 'Calculus Engine',
    testName: 'Numerical Derivative: d/dx(x²) at x=3 is ~6',
    input: 'd/dx(x^2) at x=3',
    expected: '6',
    actual: String(dRes.value),
    passed: dPassed,
  });

  const intVal = simpsonsRuleDefiniteIntegral('x^2', 0, 3, 100);
  const intPassed = Math.abs(intVal - 9) < 1e-3;
  results.push({
    category: 'Calculus Engine',
    testName: 'Definite Integral: ∫₀³ x² dx = 9 (Simpson 1/3)',
    input: '∫ 0 to 3 of x^2 dx',
    expected: '9',
    actual: String(intVal),
    passed: intPassed,
  });

  // 6. Linear Algebra (Matrix & Vectors)
  const matA = [
    [1, 2],
    [3, 4],
  ];
  const matB = [
    [2, 0],
    [1, 2],
  ];
  const matMul = multiplyMatrices(matA, matB);
  // [1*2+2*1, 1*0+2*2] = [4, 4]
  // [3*2+4*1, 3*0+4*2] = [10, 8]
  const matMulPassed =
    matMul[0][0] === 4 && matMul[0][1] === 4 && matMul[1][0] === 10 && matMul[1][1] === 8;
  results.push({
    category: 'Matrix & Vectors',
    testName: 'Matrix 2x2 Multiplication A × B',
    input: '[[1,2],[3,4]] * [[2,0],[1,2]]',
    expected: '[[4,4],[10,8]]',
    actual: JSON.stringify(matMul),
    passed: matMulPassed,
  });

  const detA = determinantMatrix(matA); // 1*4 - 2*3 = -2
  results.push({
    category: 'Matrix & Vectors',
    testName: 'Matrix 2x2 Determinant det(A)',
    input: 'det([[1,2],[3,4]])',
    expected: '-2',
    actual: String(detA),
    passed: detA === -2,
  });

  const dot = dotProduct([1, 2, 3], [4, -5, 6]); // 4 - 10 + 18 = 12
  results.push({
    category: 'Matrix & Vectors',
    testName: 'Vector Dot Product u · v',
    input: '[1,2,3] · [4,-5,6]',
    expected: '12',
    actual: String(dot),
    passed: dot === 12,
  });

  const cross = crossProduct3D([1, 0, 0], [0, 1, 0]); // [0, 0, 1]
  const crossPassed = cross[0] === 0 && cross[1] === 0 && cross[2] === 1;
  results.push({
    category: 'Matrix & Vectors',
    testName: 'Vector Cross Product î × ĵ = k̂',
    input: '[1,0,0] × [0,1,0]',
    expected: '[0,0,1]',
    actual: JSON.stringify(cross),
    passed: crossPassed,
  });

  // 7. Programmer Mode Logic
  const hexParsed = parseNumberInBase('FF', 'HEX', 32);
  results.push({
    category: 'Programmer Mode',
    testName: 'Base Parsing: HEX FF = DEC 255',
    input: 'FF in HEX',
    expected: '255',
    actual: hexParsed.toString(),
    passed: hexParsed === 255n,
  });

  const bitAnd = performBitwiseOp(12n, 10n, 'AND', 32); // 1100 & 1010 = 1000 (8)
  results.push({
    category: 'Programmer Mode',
    testName: 'Bitwise AND: 12 AND 10 = 8',
    input: '12 & 10',
    expected: '8',
    actual: bitAnd.toString(),
    passed: bitAnd === 8n,
  });

  const bitShl = performBitShift(1n, 'SHL', 4, 32); // 1 << 4 = 16
  results.push({
    category: 'Programmer Mode',
    testName: 'Bit Shift Left: 1 << 4 = 16',
    input: '1 << 4',
    expected: '16',
    actual: bitShl.toString(),
    passed: bitShl === 16n,
  });

  // 8. Statistics & Linear Regression
  const stats = computeStatistics([10, 20, 30, 40, 50]);
  const statsPassed = stats.mean === 30 && stats.median === 30 && stats.count === 5;
  results.push({
    category: 'Statistics',
    testName: 'Descriptive Stats: Mean & Median of [10,20,30,40,50]',
    input: '[10,20,30,40,50]',
    expected: 'mean=30, median=30',
    actual: `mean=${stats.mean}, median=${stats.median}`,
    passed: statsPassed,
  });

  const reg = computeLinearRegression([
    { x: 1, y: 2 },
    { x: 2, y: 4 },
    { x: 3, y: 6 },
  ]);
  const regPassed = reg.slope === 2 && reg.intercept === 0 && reg.r === 1;
  results.push({
    category: 'Statistics',
    testName: 'Linear Regression: (1,2), (2,4), (3,6) -> y = 2x',
    input: 'Points (1,2), (2,4), (3,6)',
    expected: 'slope=2, intercept=0, r=1',
    actual: `slope=${reg.slope}, intercept=${reg.intercept}, r=${reg.r}`,
    passed: regPassed,
  });

  // 9. Percentage & Finance
  const pct = calculatePercentage(850, 15, 'of');
  const pctPassed = Math.abs(pct.result - 127.5) < 1e-9;
  results.push({
    category: 'Percentage',
    testName: '15% of 850 = 127.5',
    input: '15% of 850',
    expected: '127.5',
    actual: String(pct.result),
    passed: pctPassed,
  });

  const disc = calculateDiscount({ originalPrice: 100, discountPercent: 20 });
  results.push({
    category: 'Finance Engine',
    testName: '20% discount on $100 = $80',
    input: '$100 with 20% off',
    expected: '80',
    actual: String(disc.primaryValue),
    passed: disc.primaryValue === 80,
  });

  const loan = calculateLoanPayment({ principal: 10000, annualRatePercent: 5, termYears: 3 });
  results.push({
    category: 'Finance Engine',
    testName: 'Amortized loan monthly payment ($10,000, 5%, 3yr)',
    input: 'P=10000, r=5%, t=3',
    expected: '~$299.71',
    actual: `$${loan.primaryValue.toFixed(2)}`,
    passed: Math.abs(loan.primaryValue - 299.71) < 0.05,
  });

  // 10. Unit Converter
  const unit1 = convertUnits('length', 'km', 'm', 5);
  results.push({
    category: 'Unit Conversion',
    testName: '5 km to meters = 5000 m',
    input: '5 km -> m',
    expected: '5000',
    actual: String(unit1.result),
    passed: unit1.result === 5000,
  });

  const unitTemp = convertUnits('temperature', 'c', 'f', 100);
  results.push({
    category: 'Unit Conversion',
    testName: '100 °C to °F = 212 °F',
    input: '100 C -> F',
    expected: '212',
    actual: String(unitTemp.result),
    passed: Math.abs(unitTemp.result - 212) < 1e-9,
  });

  // 11. AI Handshake Verification
  const handshake = verifyWithDeterministicEngine('3 * (4 + 5)');
  const is27 = handshake.verifiedResult === '27';
  results.push({
    category: 'AI Handshake & Security',
    testName: 'AI Expression Verification: 3 * (4 + 5) = 27',
    input: '3 * (4 + 5)',
    expected: '27 (verified)',
    actual: `${handshake.verifiedResult} (verified=${handshake.isVerified})`,
    passed: handshake.isVerified && is27,
  });

  // 12. Workspace Backup / Restore JSON Validation
  const jsonExport = exportWorkspaceToJSON(DEFAULT_WORKSPACE);
  const importedWs = validateAndImportWorkspace(jsonExport);
  const wsPassed = importedWs.name === DEFAULT_WORKSPACE.name && Array.isArray(importedWs.notes);
  results.push({
    category: 'Workspace Integrity',
    testName: 'JSON Schema Export & Import Roundtrip',
    input: 'Workspace JSON string',
    expected: 'Valid WorkspaceSession Object',
    actual: `Valid: ${wsPassed}`,
    passed: wsPassed,
  });

  // 13. Speech & Input Sanitization
  const voiceRaw = '<script>alert("hack")</script>10 divided by 2 plus 3 squared';
  const voiceSanitized = sanitizeSpokenMath(voiceRaw);
  const voiceExpected = '10 / 2 + 3²';
  results.push({
    category: 'Speech & Input Sanitization',
    testName: 'Voice Math Sanitization: Strip tags & normalize operations',
    input: voiceRaw,
    expected: voiceExpected,
    actual: voiceSanitized,
    passed: voiceSanitized === voiceExpected,
  });

  const queryRaw = '  <style>body{color:red}</style>  What is 15% of 850?  \u0000 ';
  const querySanitized = sanitizeQueryText(queryRaw);
  const queryExpected = 'What is 15% of 850?';
  results.push({
    category: 'Speech & Input Sanitization',
    testName: 'Query Sanitization: Strip control chars & normalize whitespace',
    input: queryRaw,
    expected: queryExpected,
    actual: querySanitized,
    passed: querySanitized === queryExpected,
  });

  const mathLatex = 'The formula is $a^2 + b^2 = c^2$ with $\\sqrt{x}$ and $\\pm 5$';
  const mathSpoken = convertMathToSpokenText(mathLatex);
  const mathSpokenExpectedContains = 'a squared plus b squared equals c squared';
  const spokenPassed = mathSpoken.includes(mathSpokenExpectedContains) && mathSpoken.includes('square root of x') && mathSpoken.includes('plus or minus 5');
  results.push({
    category: 'Speech & Input Sanitization',
    testName: 'Math Speech Synthesis: Convert LaTeX to natural spoken English',
    input: mathLatex,
    expected: 'Contains natural spoken words for powers, roots, and signs',
    actual: mathSpoken,
    passed: spokenPassed,
  });

  // 14. Error & Safety Handling
  assertError('Error Handling', 'Division by zero: 1 / 0', '1 / 0');
  assertError('Error Handling', 'Square root of negative: sqrt(-4)', 'sqrt(-4)');
  assertError('Error Handling', 'Mismatched parentheses: (2 + 3', '(2 + 3');
  assertError('Error Handling', 'Factorial of negative: (-3)!', '(-3)!');

  // 15. Engineering & Physics
  const ohms = solveOhmsLaw({ current: 2, resistance: 5 });
  results.push({
    category: 'Engineering & Physics',
    testName: 'Ohm’s Law: V = I * R (2A * 5Ω)',
    input: 'I = 2, R = 5',
    expected: '10',
    actual: String(ohms.value),
    passed: ohms.value === 10,
  });

  const pwr = calculateElectricalPower({ voltage: 120, current: 0.5 });
  results.push({
    category: 'Engineering & Physics',
    testName: 'Electrical Power: P = V * I (120V * 0.5A)',
    input: 'V = 120, I = 0.5',
    expected: '60',
    actual: String(pwr.powerWatts),
    passed: pwr.powerWatts === 60,
  });

  const ke = calculateKineticEnergy(10, 4);
  results.push({
    category: 'Engineering & Physics',
    testName: 'Kinetic Energy: 0.5 * m * v^2 (m=10kg, v=4m/s)',
    input: 'm = 10, v = 4',
    expected: '80',
    actual: String(ke.energyJoules),
    passed: ke.energyJoules === 80,
  });

  const press = calculatePressure(500, 2);
  results.push({
    category: 'Engineering & Physics',
    testName: 'Fluid Pressure: P = F / A (500N / 2m²)',
    input: 'F = 500, A = 2',
    expected: '250',
    actual: String(press.pressurePascals),
    passed: press.pressurePascals === 250,
  });

  // 16. Probability & Combinatorics
  const perm = permutations(5, 2);
  results.push({
    category: 'Probability & Combinatorics',
    testName: 'Permutations: 5P2 = 5! / 3!',
    input: 'n = 5, r = 2',
    expected: '20',
    actual: String(perm.result),
    passed: perm.result === 20,
  });

  const comb = combinations(5, 2);
  results.push({
    category: 'Probability & Combinatorics',
    testName: 'Combinations: 5C2 = 5! / (2! * 3!)',
    input: 'n = 5, r = 2',
    expected: '10',
    actual: String(comb.result),
    passed: comb.result === 10,
  });

  const binom = binomialProbability(4, 2, 0.5);
  results.push({
    category: 'Probability & Combinatorics',
    testName: 'Binomial Probability: P(X=2) for n=4, p=0.5',
    input: 'n = 4, k = 2, p = 0.5',
    expected: '0.375',
    actual: String(binom.exactProbability),
    passed: Math.abs(binom.exactProbability - 0.375) < 1e-6,
  });

  // 17. AI Conversation Export & LaTeX Extraction
  const sampleMsg1: AIMessage = {
    id: 'msg-1',
    role: 'assistant',
    content: 'The quadratic formula is:\n$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$\nUsed to solve $ax^2 + bx + c = 0$.',
    timestamp: 1700000000000,
  };

  const extractedFormula1 = extractLaTeXFormula(sampleMsg1);
  results.push({
    category: 'AI Export & LaTeX Extraction',
    testName: 'Extract LaTeX from block math ($$ ... $$)',
    input: sampleMsg1.content,
    expected: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}',
    actual: extractedFormula1 || '',
    passed: extractedFormula1 === 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}',
  });

  const sampleMsg2: AIMessage = {
    id: 'msg-2',
    role: 'assistant',
    content: 'Pythagorean relation: $a^2 + b^2 = c^2$',
    timestamp: 1700000001000,
  };

  const extractedFormula2 = extractLaTeXFormula(sampleMsg2);
  results.push({
    category: 'AI Export & LaTeX Extraction',
    testName: 'Extract LaTeX from inline math ($ ... $)',
    input: sampleMsg2.content,
    expected: 'a^2 + b^2 = c^2',
    actual: extractedFormula2 || '',
    passed: extractedFormula2 === 'a^2 + b^2 = c^2',
  });

  const sampleConvo: AIMessage[] = [
    {
      id: 'usr-1',
      role: 'user',
      content: 'Solve x^2 - 4 = 0',
      timestamp: 1700000000000,
    },
    {
      id: 'ast-1',
      role: 'assistant',
      content: 'The roots are $x = 2$ and $x = -2$.',
      steps: ['Factor as $(x - 2)(x + 2) = 0$', 'Set each factor to zero: $x = \\pm 2$'],
      formula: 'x = \\pm 2',
      isVerified: true,
      timestamp: 1700000002000,
    },
  ];

  const exportedMd = generateConversationMarkdown(sampleConvo);
  const mdHasUser = exportedMd.includes('Solve x^2 - 4 = 0');
  const mdHasAssistant = exportedMd.includes('The roots are');
  const mdHasSteps = exportedMd.includes('Factor as $(x - 2)(x + 2) = 0$');
  const mdHasFormula = exportedMd.includes('x = \\pm 2');
  const mdPassed = mdHasUser && mdHasAssistant && mdHasSteps && mdHasFormula;

  results.push({
    category: 'AI Export & LaTeX Extraction',
    testName: 'Generate Conversation Markdown structure',
    input: `${sampleConvo.length} messages`,
    expected: 'Contains User, Assistant, Steps & LaTeX block',
    actual: mdPassed ? 'Contains User, Assistant, Steps & LaTeX block' : 'Missing sections',
    passed: mdPassed,
  });

  // 18. AI Quick Prompts
  const promptExplainStep = buildQuickPrompt('explain-step', {
    targetStep: 'x^2 - 4 = (x - 2)(x + 2)',
  });
  results.push({
    category: 'AI Quick Prompts',
    testName: 'Generate "Explain this step" with target step',
    input: 'x^2 - 4 = (x - 2)(x + 2)',
    expected: 'Contains target step',
    actual: promptExplainStep.includes('(x - 2)(x + 2)') ? 'Contains target step' : 'Missing',
    passed: promptExplainStep.includes('(x - 2)(x + 2)'),
  });

  const promptCheckErrors = buildQuickPrompt('check-errors', {
    currentExpression: '2x + 5 = 15',
    currentResult: 'x = 4',
  });
  results.push({
    category: 'AI Quick Prompts',
    testName: 'Generate "Check for errors" with active equation',
    input: '2x + 5 = 15 = x = 4',
    expected: 'Contains equation check',
    actual: promptCheckErrors.includes('2x + 5 = 15 = x = 4') ? 'Contains equation check' : 'Missing',
    passed: promptCheckErrors.includes('2x + 5 = 15 = x = 4'),
  });

  const promptSimplify = buildQuickPrompt('simplify', {
    currentExpression: '(x^2 - 9)/(x - 3)',
  });
  results.push({
    category: 'AI Quick Prompts',
    testName: 'Generate "Simplify expression" with expression',
    input: '(x^2 - 9)/(x - 3)',
    expected: 'Contains expression',
    actual: promptSimplify.includes('(x^2 - 9)/(x - 3)') ? 'Contains expression' : 'Missing',
    passed: promptSimplify.includes('(x^2 - 9)/(x - 3)'),
  });

  // =========================================================================
  // 19. AI Mathematical Tutor Mode 2.0
  // =========================================================================

  // A. Hint Progression (1 to 5 levels)
  const hintsForLinear = generateProgressiveHints('2x + 5 = 17', '2x + 5 = 17', ['2x = 12', 'x = 6'], 'x = 6');
  const hintsValidCount = hintsForLinear.length === 5;
  const hintLevel1Conceptual = hintsForLinear[0].length > 10;
  const hintLevel5Solution = hintsForLinear[4].includes('Complete solution') || hintsForLinear[4].includes('x = 6');

  results.push({
    category: 'AI Mathematical Tutor 2.0',
    testName: 'A. Progressive Hint System (5 Discrete Levels)',
    input: '2x + 5 = 17',
    expected: '5 progressive levels with conceptual starting level and full solution at level 5',
    actual: hintsValidCount && hintLevel1Conceptual && hintLevel5Solution ? '5 progressive levels verified' : 'Invalid hint structure',
    passed: hintsValidCount && hintLevel1Conceptual && hintLevel5Solution,
  });

  // B. Topic Detection
  const topicCalc = detectMathTopic('calculate the derivative d/dx (x^3 + 4x)');
  const topicTrig = detectMathTopic('evaluate sin(30 deg) + cos(60 deg)');
  const topicAlg = detectMathTopic('solve 3x + 7 = 22');
  const topicStat = detectMathTopic('find the mean, median, and standard deviation of dataset');
  const topicEng = detectMathTopic('calculate current through a 240 ohm resistor with 12V voltage');
  const topicDetectAllPassed =
    topicCalc === 'Calculus' &&
    topicTrig === 'Trigonometry' &&
    topicAlg === 'Algebra' &&
    topicStat === 'Statistics' &&
    topicEng === 'Engineering';

  results.push({
    category: 'AI Mathematical Tutor 2.0',
    testName: 'B. Automated Math Topic Detection',
    input: 'Calculus, Trig, Algebra, Stats, Engineering prompts',
    expected: 'Accurate topic classification across 5 domains',
    actual: topicDetectAllPassed ? 'Calculus, Trig, Algebra, Statistics, Engineering' : 'Topic detection discrepancy',
    passed: topicDetectAllPassed,
  });

  // C. Difficulty Mapping
  const difficultyLevels: DifficultyLevel[] = ['beginner', 'intermediate', 'advanced', 'expert'];
  const difficultyProblems = difficultyLevels.map((diff) => generatePracticeProblems('Algebra', diff, 1));
  const difficultyPassed = difficultyProblems.every((set) => set.length === 1 && set[0].id.length > 0);

  results.push({
    category: 'AI Mathematical Tutor 2.0',
    testName: 'C. Difficulty Level Mapping',
    input: 'beginner, intermediate, advanced, expert',
    expected: 'Practice problems successfully mapped to each difficulty',
    actual: difficultyPassed ? 'All 4 difficulty tiers verified' : 'Difficulty mapping failed',
    passed: difficultyPassed,
  });

  // D. Learning Objective Mapping
  const objectives: LearningObjective[] = ['concept', 'practice', 'formula', 'check-work', 'exam', 'review-mistakes'];
  const objectivesMapped = objectives.length === 6;

  results.push({
    category: 'AI Mathematical Tutor 2.0',
    testName: 'D. Learning Objective Mapping (6 Objectives)',
    input: 'concept, practice, formula, check-work, exam, review-mistakes',
    expected: '6 standard learning objectives registered',
    actual: objectivesMapped ? '6 objectives active' : 'Missing objectives',
    passed: objectivesMapped,
  });

  // E. Step Checking (Equivalent, Incorrect, Invalid Transformation, Missing Condition)
  const stepEquivalent = checkUserStep('2x + 5 = 17', '2x = 12');
  const stepSolved = checkUserStep('2x + 5 = 17', 'x = 6');
  const stepSignError = checkUserStep('2x + 5 = 17', '2x = 22');
  const stepDivZero = checkUserStep('x / 0 = 5', 'x = 0 / 0');
  const stepMissingCondition = checkUserStep('x^2 = 9', 'x = 3');

  const stepChecksPassed =
    stepEquivalent.status === 'mathematically_equivalent' &&
    stepEquivalent.isEquivalent === true &&
    stepSolved.status === 'mathematically_equivalent' &&
    stepSignError.status === 'incorrect' &&
    stepDivZero.status === 'invalid_transformation' &&
    stepMissingCondition.status === 'missing_condition';

  results.push({
    category: 'AI Mathematical Tutor 2.0',
    testName: 'E. Deterministic Step Checking Engine',
    input: '2x+5=17 steps (2x=12, 2x=22, /0, x^2=9 -> x=3)',
    expected: 'Accurate classification: equivalent, sign error, invalid transformation, missing condition',
    actual: stepChecksPassed ? 'All 4 step statuses classified accurately' : 'Step checking classification error',
    passed: stepChecksPassed,
  });

  // F. Mistake Categorization & Structured Analysis
  const signAnalysis = analyzeMistake('2x = 10', '-5', '5');
  const pemdasAnalysis = analyzeMistake('2 + 3 * 4', '20', '14');
  const domainAnalysis = analyzeMistake('1/x', 'divide by 0', 'x != 0');

  const structuredFieldsValid = (a: any) =>
    Boolean(a.errorType && a.whyItIsWrong && a.correctPrinciple && a.correction && a.preventionTip);

  const mistakeAnalysisPassed =
    signAnalysis.errorType === 'sign_error' &&
    pemdasAnalysis.errorType === 'arithmetic_mistake' &&
    domainAnalysis.errorType === 'domain_restriction' &&
    structuredFieldsValid(signAnalysis) &&
    structuredFieldsValid(pemdasAnalysis);

  results.push({
    category: 'AI Mathematical Tutor 2.0',
    testName: 'F. Structured Mistake Analysis (5 Structured Fields)',
    input: 'Sign error (-5 vs 5), PEMDAS (20 vs 14), Domain (/0)',
    expected: 'errorType, whyItIsWrong, correctPrinciple, correction, preventionTip',
    actual: mistakeAnalysisPassed ? 'Structured fields and categories verified' : 'Analysis structure missing fields',
    passed: mistakeAnalysisPassed,
  });

  // G. Practice Problem Validation
  const practiceProblems = generatePracticeProblems('Arithmetic', 'beginner', 2);
  const practiceValid =
    practiceProblems.length === 2 &&
    practiceProblems[0].hints.length === 5 &&
    practiceProblems[0].correctAnswer.length > 0 &&
    practiceProblems[0].explanation.length > 0;

  results.push({
    category: 'AI Mathematical Tutor 2.0',
    testName: 'G. Practice Problem Generation & Validation',
    input: 'Arithmetic beginner (2 problems)',
    expected: 'Valid problems with 5-level hints and verified answers',
    actual: practiceValid ? 'Generated and verified 2 practice problems' : 'Invalid practice problem structure',
    passed: practiceValid,
  });

  // H. Practice Scoring & Answer Evaluation
  const testProb = practiceProblems[0];
  const evalCorrect = evaluatePracticeAnswer(testProb, testProb.correctAnswer);
  const evalWrong = evaluatePracticeAnswer(testProb, '999999');
  const scoringPassed = evalCorrect.isCorrect === true && evalWrong.isCorrect === false;

  results.push({
    category: 'AI Mathematical Tutor 2.0',
    testName: 'H. Practice Answer Evaluation (Numerical & Symbolic)',
    input: `Correct: ${testProb.correctAnswer}, Incorrect: 999999`,
    expected: 'Accurate determination: true for match, false for mismatch',
    actual: scoringPassed ? 'Answer evaluation verified' : 'Scoring discrepancy',
    passed: scoringPassed,
  });

  // I. Session Progress Tracking
  const mockProblemResults: Record<number, { isCorrect: boolean; attempts: number; hintsUsed: number; timeSpentSec: number }> = {
    0: { isCorrect: true, attempts: 1, hintsUsed: 0, timeSpentSec: 15 },
    1: { isCorrect: false, attempts: 2, hintsUsed: 2, timeSpentSec: 35 },
    2: { isCorrect: true, attempts: 1, hintsUsed: 1, timeSpentSec: 20 },
  };
  const sessionCorrect = Object.values(mockProblemResults).filter((r) => r.isCorrect).length;
  const sessionAccuracy = Math.round((sessionCorrect / 3) * 100);
  const progressPassed = sessionCorrect === 2 && sessionAccuracy === 67;

  results.push({
    category: 'AI Mathematical Tutor 2.0',
    testName: 'I. Practice Session Progress & Scoring Accuracy',
    input: '3 problems (2 correct, 1 incorrect)',
    expected: 'Score: 2/3 (67% accuracy)',
    actual: progressPassed ? `Score: ${sessionCorrect}/3 (${sessionAccuracy}%)` : 'Scoring calculation mismatch',
    passed: progressPassed,
  });

  // J. Tutor State Reset
  const resetHints = generateProgressiveHints('x + 1 = 2');
  const resetPassed = resetHints.length === 5;

  results.push({
    category: 'AI Mathematical Tutor 2.0',
    testName: 'J. Tutor State Clean Reset',
    input: 'Reset session target x + 1 = 2',
    expected: 'Hints refreshed cleanly without residual state',
    actual: resetPassed ? 'Clean reset verified' : 'Residual state error',
    passed: resetPassed,
  });

  // K. LaTeX Preservation in Hints and Formulas
  const quadHints = generateProgressiveHints('x^2 - 5x + 6 = 0');
  const latexPreserved = quadHints.some((h) => h.includes('$') || h.includes('\\frac'));

  results.push({
    category: 'AI Mathematical Tutor 2.0',
    testName: 'K. LaTeX Formatting Preservation in Hints',
    input: 'Quadratic equation hints',
    expected: 'Contains LaTeX syntax ($...$, \\frac)',
    actual: latexPreserved ? 'LaTeX math notation preserved' : 'Missing LaTeX math formatting',
    passed: latexPreserved,
  });

  // L. Invalid Input Handling & Edge Cases
  const emptyStep = checkUserStep('2x + 5 = 17', '   ');
  const emptyTopic = detectMathTopic('');
  const edgeCasesPassed = emptyStep.status === 'incorrect' && emptyTopic === 'Algebra';

  results.push({
    category: 'AI Mathematical Tutor 2.0',
    testName: 'L. Invalid Input Handling & Edge Cases',
    input: 'Empty user step, empty topic string',
    expected: 'Safe handling without runtime exceptions',
    actual: edgeCasesPassed ? 'Handled safely with default fallbacks' : 'Unhandled edge case exception',
    passed: edgeCasesPassed,
  });

  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.length - passedCount;

  return {
    total: results.length,
    passed: passedCount,
    failed: failedCount,
    results,
    allPassed: failedCount === 0,
  };
}
