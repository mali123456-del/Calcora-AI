/**
 * Deterministic Financial Calculations Engine - Expanded
 * Formulas for percentages, discounts, tips, simple & compound interest,
 * amortized loan schedules, investment growth, savings goals, inflation, ROI, and currency conversions.
 */

import {
  AmortizationRow,
  DiscountCalcParams,
  TipCalcParams,
  SimpleInterestParams,
  CompoundInterestParams,
  LoanPaymentParams,
  InvestmentParams,
  SavingsGoalParams,
  InflationParams,
  RoiParams,
  TaxParams,
} from '../types';
import { sanitizeNumber, formatResult } from './mathEngine';

export interface FinanceResult {
  primaryValue: number;
  primaryLabel: string;
  primaryDisplay: string;
  secondaryValues: { label: string; value: string }[];
  steps: string[];
  schedule?: AmortizationRow[];
}

export function calculatePercentageTool(
  type: 'percentOf' | 'whatPercent' | 'percentChange',
  a: number,
  b: number
): FinanceResult {
  if (type === 'percentOf') {
    const res = (a * b) / 100;
    return {
      primaryValue: sanitizeNumber(res),
      primaryLabel: `${a}% of ${b}`,
      primaryDisplay: formatResult(sanitizeNumber(res)),
      secondaryValues: [
        { label: 'Decimal multiplier', value: formatResult(a / 100) },
        { label: 'Fractional ratio', value: `${a}/100` },
      ],
      steps: [
        `Step 1: Convert percentage to fraction: ${a} ÷ 100 = ${a / 100}`,
        `Step 2: Multiply by base amount: ${b} × ${a / 100} = ${formatResult(sanitizeNumber(res))}`,
      ],
    };
  }

  if (type === 'whatPercent') {
    if (b === 0) {
      throw new Error('Base value cannot be zero for percentage ratio');
    }
    const ratio = (a / b) * 100;
    return {
      primaryValue: sanitizeNumber(ratio),
      primaryLabel: `${a} is what % of ${b}`,
      primaryDisplay: `${formatResult(sanitizeNumber(ratio))}%`,
      secondaryValues: [{ label: 'Raw proportion', value: formatResult(a / b) }],
      steps: [
        `Step 1: Compute fraction: ${a} ÷ ${b} = ${formatResult(a / b)}`,
        `Step 2: Convert to percentage: ${formatResult(a / b)} × 100 = ${formatResult(sanitizeNumber(ratio))}%`,
      ],
    };
  }

  if (a === 0) {
    throw new Error('Initial value cannot be zero for percentage change calculation');
  }
  const diff = b - a;
  const pct = (diff / Math.abs(a)) * 100;
  const isIncrease = diff >= 0;

  return {
    primaryValue: sanitizeNumber(pct),
    primaryLabel: isIncrease ? 'Percentage Increase' : 'Percentage Decrease',
    primaryDisplay: `${pct > 0 ? '+' : ''}${formatResult(sanitizeNumber(pct))}%`,
    secondaryValues: [
      { label: 'Absolute Difference', value: formatResult(diff) },
      { label: 'Trend Direction', value: isIncrease ? 'Upward / Growth' : 'Downward / Loss' },
    ],
    steps: [
      `Step 1: Difference: ${b} - ${a} = ${diff}`,
      `Step 2: Divide by initial value: ${diff} ÷ |${a}| = ${diff / Math.abs(a)}`,
      `Step 3: Multiply by 100: ${diff / Math.abs(a)} × 100 = ${formatResult(sanitizeNumber(pct))}%`,
    ],
  };
}

export function calculateDiscount(params: DiscountCalcParams): FinanceResult {
  const { originalPrice, discountPercent } = params;
  if (originalPrice < 0 || discountPercent < 0) {
    throw new Error('Price and discount percentage must be non-negative');
  }

  const savings = originalPrice * (discountPercent / 100);
  const finalPrice = Math.max(0, originalPrice - savings);

  return {
    primaryValue: sanitizeNumber(finalPrice),
    primaryLabel: 'Final Discounted Price',
    primaryDisplay: `$${finalPrice.toFixed(2)}`,
    secondaryValues: [
      { label: 'Total Savings', value: `$${savings.toFixed(2)}` },
      { label: 'Effective Ratio', value: `${(100 - discountPercent).toFixed(1)}% of original` },
    ],
    steps: [
      `Step 1: Calculate savings: $${originalPrice.toFixed(2)} × (${discountPercent} ÷ 100) = $${savings.toFixed(2)}`,
      `Step 2: Subtract discount from price: $${originalPrice.toFixed(2)} - $${savings.toFixed(2)} = $${finalPrice.toFixed(2)}`,
    ],
  };
}

export function calculateTax(params: TaxParams): FinanceResult {
  const { amount, taxRatePercent } = params;
  if (amount < 0 || taxRatePercent < 0) {
    throw new Error('Amount and tax rate must be non-negative');
  }

  const tax = amount * (taxRatePercent / 100);
  const total = amount + tax;

  return {
    primaryValue: sanitizeNumber(total),
    primaryLabel: 'Total Price with Tax',
    primaryDisplay: `$${total.toFixed(2)}`,
    secondaryValues: [
      { label: 'Tax Amount', value: `$${tax.toFixed(2)}` },
      { label: 'Original Subtotal', value: `$${amount.toFixed(2)}` },
    ],
    steps: [
      `Step 1: Compute tax: $${amount.toFixed(2)} × ${taxRatePercent}% = $${tax.toFixed(2)}`,
      `Step 2: Add tax to subtotal: $${amount.toFixed(2)} + $${tax.toFixed(2)} = $${total.toFixed(2)}`,
    ],
  };
}

export function calculateTip(params: TipCalcParams): FinanceResult {
  const { billAmount, tipPercent, numPeople } = params;
  if (billAmount < 0 || tipPercent < 0) {
    throw new Error('Bill amount and tip percentage must be non-negative');
  }
  const people = Math.max(1, Math.floor(numPeople));

  const tipAmount = billAmount * (tipPercent / 100);
  const totalBill = billAmount + tipAmount;
  const perPerson = totalBill / people;
  const tipPerPerson = tipAmount / people;

  return {
    primaryValue: sanitizeNumber(totalBill),
    primaryLabel: 'Total Bill with Tip',
    primaryDisplay: `$${totalBill.toFixed(2)}`,
    secondaryValues: [
      { label: 'Tip Amount', value: `$${tipAmount.toFixed(2)}` },
      { label: 'Amount Per Person', value: `$${perPerson.toFixed(2)}` },
      { label: 'Tip Per Person', value: `$${tipPerPerson.toFixed(2)}` },
    ],
    steps: [
      `Step 1: Tip Amount = $${billAmount.toFixed(2)} × ${tipPercent}% = $${tipAmount.toFixed(2)}`,
      `Step 2: Total Amount = $${billAmount.toFixed(2)} + $${tipAmount.toFixed(2)} = $${totalBill.toFixed(2)}`,
      people > 1
        ? `Step 3: Split among ${people} people = $${totalBill.toFixed(2)} ÷ ${people} = $${perPerson.toFixed(2)} each`
        : 'Single person (no split)',
    ],
  };
}

export function calculateSimpleInterest(params: SimpleInterestParams): FinanceResult {
  const { principal, rateAnnualPercent, timeYears } = params;
  if (principal < 0 || rateAnnualPercent < 0 || timeYears < 0) {
    throw new Error('Principal, rate, and time must be non-negative');
  }

  const r = rateAnnualPercent / 100;
  const interest = principal * r * timeYears;
  const total = principal + interest;

  return {
    primaryValue: sanitizeNumber(total),
    primaryLabel: 'Total Accumulated Value',
    primaryDisplay: `$${total.toFixed(2)}`,
    secondaryValues: [
      { label: 'Interest Earned', value: `$${interest.toFixed(2)}` },
      { label: 'Initial Principal', value: `$${principal.toFixed(2)}` },
    ],
    steps: [
      `Formula: I = P × r × t`,
      `Step 1: Interest = $${principal.toFixed(2)} × (${rateAnnualPercent} ÷ 100) × ${timeYears} = $${interest.toFixed(2)}`,
      `Step 2: Total Future Value = $${principal.toFixed(2)} + $${interest.toFixed(2)} = $${total.toFixed(2)}`,
    ],
  };
}

export function calculateCompoundInterest(params: CompoundInterestParams): FinanceResult {
  const { principal, rateAnnualPercent, compoundsPerYear, timeYears } = params;
  if (principal < 0 || rateAnnualPercent < 0 || timeYears < 0 || compoundsPerYear <= 0) {
    throw new Error('Parameters must be positive');
  }

  const r = rateAnnualPercent / 100;
  const n = compoundsPerYear;
  const t = timeYears;
  const amount = principal * Math.pow(1 + r / n, n * t);
  const interest = amount - principal;

  return {
    primaryValue: sanitizeNumber(amount),
    primaryLabel: 'Future Compound Value',
    primaryDisplay: `$${amount.toFixed(2)}`,
    secondaryValues: [
      { label: 'Total Compound Interest', value: `$${interest.toFixed(2)}` },
      { label: 'Principal', value: `$${principal.toFixed(2)}` },
      { label: 'Total Compounding Periods', value: `${n * t} periods` },
    ],
    steps: [
      `Formula: A = P(1 + r/n)^(nt)`,
      `Step 1: Periodic interest rate = ${rateAnnualPercent}% ÷ ${n} = ${((r / n) * 100).toFixed(4)}%`,
      `Step 2: Compounding factor = (1 + ${formatResult(r / n)})^(${n} × ${t}) = ${formatResult(Math.pow(1 + r / n, n * t))}`,
      `Step 3: Future Value = $${principal.toFixed(2)} × ${formatResult(Math.pow(1 + r / n, n * t))} = $${amount.toFixed(2)}`,
      `Step 4: Interest Earned = $${amount.toFixed(2)} - $${principal.toFixed(2)} = $${interest.toFixed(2)}`,
    ],
  };
}

export function generateAmortizationSchedule(
  principal: number,
  annualRatePercent: number,
  termYears: number
): { monthlyPayment: number; totalPayment: number; totalInterest: number; schedule: AmortizationRow[] } {
  const totalMonths = Math.round(termYears * 12);
  const monthlyRate = annualRatePercent / 100 / 12;

  let monthlyPayment = 0;
  if (monthlyRate === 0) {
    monthlyPayment = principal / totalMonths;
  } else {
    const factor = Math.pow(1 + monthlyRate, totalMonths);
    monthlyPayment = (principal * (monthlyRate * factor)) / (factor - 1);
  }

  const schedule: AmortizationRow[] = [];
  let balance = principal;
  let totalInterest = 0;

  for (let m = 1; m <= totalMonths; m++) {
    const interestPart = monthlyRate === 0 ? 0 : balance * monthlyRate;
    const principalPart = monthlyPayment - interestPart;
    balance = Math.max(0, balance - principalPart);
    totalInterest += interestPart;

    if (m <= 24 || m === totalMonths || m % 12 === 0) {
      // Record sample rows for display efficiency
      schedule.push({
        month: m,
        payment: sanitizeNumber(monthlyPayment),
        principalPart: sanitizeNumber(principalPart),
        interestPart: sanitizeNumber(interestPart),
        balance: sanitizeNumber(balance),
      });
    }
  }

  return {
    monthlyPayment: sanitizeNumber(monthlyPayment),
    totalPayment: sanitizeNumber(monthlyPayment * totalMonths),
    totalInterest: sanitizeNumber(totalInterest),
    schedule,
  };
}

export function calculateLoanPayment(params: LoanPaymentParams): FinanceResult {
  const { principal, annualRatePercent, termYears } = params;
  if (principal <= 0 || termYears <= 0 || annualRatePercent < 0) {
    throw new Error('Principal and term must be greater than zero');
  }

  const amort = generateAmortizationSchedule(principal, annualRatePercent, termYears);
  const totalMonths = Math.round(termYears * 12);

  return {
    primaryValue: amort.monthlyPayment,
    primaryLabel: 'Monthly Payment (Principal + Interest)',
    primaryDisplay: `$${amort.monthlyPayment.toFixed(2)}`,
    secondaryValues: [
      { label: 'Total Loan Repayment', value: `$${amort.totalPayment.toFixed(2)}` },
      { label: 'Total Interest Charge', value: `$${amort.totalInterest.toFixed(2)}` },
      { label: 'Duration', value: `${totalMonths} monthly payments (${termYears} yrs)` },
    ],
    steps: [
      `Formula: M = P · [r(1+r)ⁿ] / [(1+r)ⁿ - 1]`,
      `Step 1: Monthly interest rate r = ${annualRatePercent}% / 12 = ${(annualRatePercent / 12).toFixed(4)}%`,
      `Step 2: Total payments n = ${termYears} × 12 = ${totalMonths}`,
      `Step 3: Monthly Payment M = $${amort.monthlyPayment.toFixed(2)}`,
      `Step 4: Total Cost = $${amort.totalPayment.toFixed(2)} ($${amort.totalInterest.toFixed(2)} interest)`,
    ],
    schedule: amort.schedule,
  };
}

export function calculateInvestmentGrowth(params: InvestmentParams): FinanceResult {
  const { initialInvestment, monthlyContribution, annualRatePercent, timeYears } = params;
  const r = annualRatePercent / 100 / 12;
  const totalMonths = Math.round(timeYears * 12);

  let futureValue = initialInvestment * Math.pow(1 + r, totalMonths);
  if (r > 0 && monthlyContribution > 0) {
    futureValue += monthlyContribution * ((Math.pow(1 + r, totalMonths) - 1) / r);
  } else if (r === 0) {
    futureValue += monthlyContribution * totalMonths;
  }

  const totalContributions = initialInvestment + monthlyContribution * totalMonths;
  const interestEarned = futureValue - totalContributions;

  return {
    primaryValue: sanitizeNumber(futureValue),
    primaryLabel: 'Future Portfolio Value',
    primaryDisplay: `$${futureValue.toFixed(2)}`,
    secondaryValues: [
      { label: 'Total Principal Invested', value: `$${totalContributions.toFixed(2)}` },
      { label: 'Total Interest / Compound Growth', value: `$${interestEarned.toFixed(2)}` },
      { label: 'Investment Horizon', value: `${timeYears} years (${totalMonths} months)` },
    ],
    steps: [
      `Step 1: Compound initial deposit: $${initialInvestment.toFixed(2)} × (1 + ${(r * 100).toFixed(4)}%)^${totalMonths}`,
      `Step 2: Future value of monthly annuity: $${monthlyContribution.toFixed(2)} / month`,
      `Step 3: Total Portfolio Future Value = $${futureValue.toFixed(2)}`,
      `Step 4: Total compound interest earned = $${interestEarned.toFixed(2)}`,
    ],
  };
}

export function calculateSavingsGoal(params: SavingsGoalParams): FinanceResult {
  const { targetAmount, annualRatePercent, timeYears } = params;
  const r = annualRatePercent / 100 / 12;
  const totalMonths = Math.round(timeYears * 12);

  let monthlyNeeded = 0;
  if (r === 0) {
    monthlyNeeded = targetAmount / totalMonths;
  } else {
    // PMT = FV * r / [(1 + r)^n - 1]
    monthlyNeeded = (targetAmount * r) / (Math.pow(1 + r, totalMonths) - 1);
  }

  return {
    primaryValue: sanitizeNumber(monthlyNeeded),
    primaryLabel: 'Required Monthly Deposit',
    primaryDisplay: `$${monthlyNeeded.toFixed(2)} / month`,
    secondaryValues: [
      { label: 'Target Savings Goal', value: `$${targetAmount.toFixed(2)}` },
      { label: 'Total Out-of-Pocket Deposits', value: `$${(monthlyNeeded * totalMonths).toFixed(2)}` },
      { label: 'Interest Assistance', value: `$${(targetAmount - monthlyNeeded * totalMonths).toFixed(2)}` },
    ],
    steps: [
      `Formula: PMT = Target · r / [(1 + r)ⁿ - 1]`,
      `Step 1: Monthly interest rate r = ${(r * 100).toFixed(4)}%`,
      `Step 2: Total contribution period n = ${totalMonths} months`,
      `Step 3: Save $${monthlyNeeded.toFixed(2)} per month to reach $${targetAmount.toFixed(2)} in ${timeYears} years.`,
    ],
  };
}

export function calculateInflation(params: InflationParams): FinanceResult {
  const { currentAmount, annualInflationPercent, timeYears } = params;
  const i = annualInflationPercent / 100;
  const futureCost = currentAmount * Math.pow(1 + i, timeYears);
  const purchasingPower = currentAmount / Math.pow(1 + i, timeYears);

  return {
    primaryValue: sanitizeNumber(futureCost),
    primaryLabel: 'Future Adjusted Cost',
    primaryDisplay: `$${futureCost.toFixed(2)}`,
    secondaryValues: [
      { label: 'Purchasing Power of Today\'s $' + currentAmount, value: `$${purchasingPower.toFixed(2)}` },
      { label: 'Cumulative Price Increase', value: `${((futureCost / currentAmount - 1) * 100).toFixed(1)}%` },
    ],
    steps: [
      `Formula: Future Value = Present Value × (1 + inflation)^years`,
      `Step 1: Inflation multiplier = (1 + ${annualInflationPercent}%)^${timeYears} = ${formatResult(Math.pow(1 + i, timeYears))}`,
      `Step 2: $${currentAmount.toFixed(2)} today will require $${futureCost.toFixed(2)} in ${timeYears} years.`,
    ],
  };
}

export function calculateRoi(params: RoiParams): FinanceResult {
  const { initialCost, finalRevenue } = params;
  if (initialCost <= 0) {
    throw new Error('Initial cost must be positive');
  }

  const netProfit = finalRevenue - initialCost;
  const roiPct = (netProfit / initialCost) * 100;

  return {
    primaryValue: sanitizeNumber(roiPct),
    primaryLabel: 'Return on Investment (ROI)',
    primaryDisplay: `${roiPct >= 0 ? '+' : ''}${roiPct.toFixed(2)}%`,
    secondaryValues: [
      { label: 'Net Profit / Gain', value: `$${netProfit.toFixed(2)}` },
      { label: 'Initial Investment', value: `$${initialCost.toFixed(2)}` },
      { label: 'Total Revenue', value: `$${finalRevenue.toFixed(2)}` },
    ],
    steps: [
      `Formula: ROI = [(Final Revenue - Initial Cost) / Initial Cost] × 100%`,
      `Step 1: Net Profit = $${finalRevenue.toFixed(2)} - $${initialCost.toFixed(2)} = $${netProfit.toFixed(2)}`,
      `Step 2: ROI = ($${netProfit.toFixed(2)} ÷ $${initialCost.toFixed(2)}) × 100 = ${roiPct.toFixed(2)}%`,
    ],
  };
}

// Fixed baseline exchange rates relative to USD (clearly documented architecture)
export const CURRENCY_RATES: Record<string, { name: string; rateToUSD: number; symbol: string }> = {
  USD: { name: 'US Dollar', rateToUSD: 1.0, symbol: '$' },
  EUR: { name: 'Euro', rateToUSD: 1.08, symbol: '€' },
  GBP: { name: 'British Pound', rateToUSD: 1.28, symbol: '£' },
  JPY: { name: 'Japanese Yen', rateToUSD: 0.0067, symbol: '¥' },
  CAD: { name: 'Canadian Dollar', rateToUSD: 0.74, symbol: 'C$' },
  AUD: { name: 'Australian Dollar', rateToUSD: 0.66, symbol: 'A$' },
  CHF: { name: 'Swiss Franc', rateToUSD: 1.13, symbol: 'Fr' },
  CNY: { name: 'Chinese Yuan', rateToUSD: 0.14, symbol: '¥' },
  INR: { name: 'Indian Rupee', rateToUSD: 0.012, symbol: '₹' },
};

export function convertCurrency(
  fromCode: string,
  toCode: string,
  amount: number,
  customRate?: number
): { result: number; display: string; rateUsed: number; isManual: boolean } {
  const from = CURRENCY_RATES[fromCode];
  const to = CURRENCY_RATES[toCode];

  if (!from || !to) {
    throw new Error('Unsupported currency selection');
  }

  const rate = customRate && customRate > 0 ? customRate : from.rateToUSD / to.rateToUSD;
  const converted = amount * rate;

  return {
    result: sanitizeNumber(converted),
    display: `${to.symbol}${converted.toFixed(2)}`,
    rateUsed: sanitizeNumber(rate),
    isManual: !!customRate,
  };
}
