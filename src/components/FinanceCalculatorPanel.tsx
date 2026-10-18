import React, { useState } from 'react';
import {
  calculatePercentageTool,
  calculateDiscount,
  calculateTip,
  calculateSimpleInterest,
  calculateCompoundInterest,
  calculateLoanPayment,
  calculateInvestmentGrowth,
  calculateSavingsGoal,
  calculateInflation,
  calculateRoi,
  calculateTax,
  convertCurrency,
  CURRENCY_RATES,
  FinanceResult,
} from '../engine/financeEngine';
import {
  Percent,
  Tag,
  HeartHandshake,
  TrendingUp,
  PiggyBank,
  Landmark,
  Coins,
  ArrowRight,
  Flame,
  Receipt,
  DollarSign,
} from 'lucide-react';

interface FinanceCalculatorPanelProps {
  onApplyResultToCalculator?: (val: string) => void;
}

type FinanceSubTool =
  | 'percentage'
  | 'discount'
  | 'tip'
  | 'simpleInterest'
  | 'compoundInterest'
  | 'loan'
  | 'investment'
  | 'savingsGoal'
  | 'inflation'
  | 'roi'
  | 'tax'
  | 'currency';

export const FinanceCalculatorPanel: React.FC<FinanceCalculatorPanelProps> = ({
  onApplyResultToCalculator,
}) => {
  const [subTool, setSubTool] = useState<FinanceSubTool>('percentage');

  // Percentage state
  const [pctType, setPctType] = useState<'percentOf' | 'whatPercent' | 'percentChange'>('percentOf');
  const [pctA, setPctA] = useState<string>('15');
  const [pctB, setPctB] = useState<string>('850');

  // Discount state
  const [origPrice, setOrigPrice] = useState<string>('120');
  const [discountPct, setDiscountPct] = useState<string>('25');

  // Tip state
  const [billAmt, setBillAmt] = useState<string>('84.50');
  const [tipPct, setTipPct] = useState<string>('18');
  const [peopleCount, setPeopleCount] = useState<string>('2');

  // Simple Interest state
  const [siPrincipal, setSiPrincipal] = useState<string>('5000');
  const [siRate, setSiRate] = useState<string>('4.5');
  const [siTime, setSiTime] = useState<string>('3');

  // Compound Interest state
  const [ciPrincipal, setCiPrincipal] = useState<string>('10000');
  const [ciRate, setCiRate] = useState<string>('6');
  const [ciCompounds, setCiCompounds] = useState<number>(12);
  const [ciTime, setCiTime] = useState<string>('5');

  // Loan state
  const [loanPrincipal, setLoanPrincipal] = useState<string>('25000');
  const [loanRate, setLoanRate] = useState<string>('5.5');
  const [loanYears, setLoanYears] = useState<string>('5');

  // Investment state
  const [invPrincipal, setInvPrincipal] = useState<string>('5000');
  const [invMonthly, setInvMonthly] = useState<string>('300');
  const [invRate, setInvRate] = useState<string>('8');
  const [invYears, setInvYears] = useState<string>('10');

  // Savings Goal state
  const [sgTarget, setSgTarget] = useState<string>('50000');
  const [sgRate, setSgRate] = useState<string>('5');
  const [sgYears, setSgYears] = useState<string>('5');

  // Inflation state
  const [infAmount, setInfAmount] = useState<string>('1000');
  const [infRate, setInfRate] = useState<string>('3.2');
  const [infYears, setInfYears] = useState<string>('10');

  // ROI state
  const [roiCost, setRoiCost] = useState<string>('5000');
  const [roiRev, setRoiRev] = useState<string>('7500');

  // Tax state
  const [taxSubtotal, setTaxSubtotal] = useState<string>('89.99');
  const [taxRate, setTaxRate] = useState<string>('8.25');

  // Currency state
  const [currFrom, setCurrFrom] = useState<string>('USD');
  const [currTo, setCurrTo] = useState<string>('EUR');
  const [currAmount, setCurrAmount] = useState<string>('100');

  // Compute active result
  let result: FinanceResult | null = null;
  let currencyResult: { result: number; display: string; rateUsed: number } | null = null;
  let calcError: string | null = null;

  try {
    if (subTool === 'percentage') {
      result = calculatePercentageTool(pctType, parseFloat(pctA) || 0, parseFloat(pctB) || 0);
    } else if (subTool === 'discount') {
      result = calculateDiscount({
        originalPrice: parseFloat(origPrice) || 0,
        discountPercent: parseFloat(discountPct) || 0,
      });
    } else if (subTool === 'tip') {
      result = calculateTip({
        billAmount: parseFloat(billAmt) || 0,
        tipPercent: parseFloat(tipPct) || 0,
        numPeople: parseInt(peopleCount, 10) || 1,
      });
    } else if (subTool === 'simpleInterest') {
      result = calculateSimpleInterest({
        principal: parseFloat(siPrincipal) || 0,
        rateAnnualPercent: parseFloat(siRate) || 0,
        timeYears: parseFloat(siTime) || 0,
      });
    } else if (subTool === 'compoundInterest') {
      result = calculateCompoundInterest({
        principal: parseFloat(ciPrincipal) || 0,
        rateAnnualPercent: parseFloat(ciRate) || 0,
        compoundsPerYear: ciCompounds,
        timeYears: parseFloat(ciTime) || 0,
      });
    } else if (subTool === 'loan') {
      result = calculateLoanPayment({
        principal: parseFloat(loanPrincipal) || 0,
        annualRatePercent: parseFloat(loanRate) || 0,
        termYears: parseFloat(loanYears) || 0,
      });
    } else if (subTool === 'investment') {
      result = calculateInvestmentGrowth({
        initialInvestment: parseFloat(invPrincipal) || 0,
        monthlyContribution: parseFloat(invMonthly) || 0,
        annualRatePercent: parseFloat(invRate) || 0,
        timeYears: parseFloat(invYears) || 0,
      });
    } else if (subTool === 'savingsGoal') {
      result = calculateSavingsGoal({
        targetAmount: parseFloat(sgTarget) || 0,
        annualRatePercent: parseFloat(sgRate) || 0,
        timeYears: parseFloat(sgYears) || 0,
      });
    } else if (subTool === 'inflation') {
      result = calculateInflation({
        currentAmount: parseFloat(infAmount) || 0,
        annualInflationPercent: parseFloat(infRate) || 0,
        timeYears: parseFloat(infYears) || 0,
      });
    } else if (subTool === 'roi') {
      result = calculateRoi({
        initialCost: parseFloat(roiCost) || 0,
        finalRevenue: parseFloat(roiRev) || 0,
      });
    } else if (subTool === 'tax') {
      result = calculateTax({
        amount: parseFloat(taxSubtotal) || 0,
        taxRatePercent: parseFloat(taxRate) || 0,
      });
    } else if (subTool === 'currency') {
      currencyResult = convertCurrency(currFrom, currTo, parseFloat(currAmount) || 0);
    }
  } catch (err: any) {
    calcError = err.message || 'Calculation error';
  }

  const toolButtons: { id: FinanceSubTool; label: string; icon: any }[] = [
    { id: 'percentage', label: 'Percentages', icon: Percent },
    { id: 'discount', label: 'Discounts', icon: Tag },
    { id: 'tip', label: 'Tip Splitter', icon: HeartHandshake },
    { id: 'loan', label: 'Loan / Mortgage', icon: Landmark },
    { id: 'compoundInterest', label: 'Compound Growth', icon: TrendingUp },
    { id: 'investment', label: 'Investment Portfolio', icon: PiggyBank },
    { id: 'savingsGoal', label: 'Savings Target', icon: Coins },
    { id: 'inflation', label: 'Inflation Impact', icon: Flame },
    { id: 'roi', label: 'ROI Analysis', icon: TrendingUp },
    { id: 'tax', label: 'Sales Tax', icon: Receipt },
    { id: 'currency', label: 'Currency Rates', icon: DollarSign },
  ];

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Sub-tool Selector Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {toolButtons.map((tb) => {
          const Icon = tb.icon;
          const isActive = subTool === tb.id;
          return (
            <button
              key={tb.id}
              onClick={() => setSubTool(tb.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-cyan-700 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tb.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Grid: Inputs + Output */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Inputs Column */}
        <div className="lg:col-span-6 flex flex-col gap-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            {/* PERCENTAGES */}
            {subTool === 'percentage' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Mode</label>
                  <select
                    value={pctType}
                    onChange={(e: any) => setPctType(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="percentOf">What is X% of Y?</option>
                    <option value="whatPercent">X is what percent of Y?</option>
                    <option value="percentChange">Percentage change from X to Y</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="fin-pct-x" className="block text-xs font-medium text-slate-500 mb-1">Value X</label>
                    <input
                      id="fin-pct-x"
                      type="number"
                      value={pctA}
                      onChange={(e) => setPctA(e.target.value)}
                      className="w-full text-sm font-mono px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label htmlFor="fin-pct-y" className="block text-xs font-medium text-slate-500 mb-1">Value Y</label>
                    <input
                      id="fin-pct-y"
                      type="number"
                      value={pctB}
                      onChange={(e) => setPctB(e.target.value)}
                      className="w-full text-sm font-mono px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* DISCOUNT */}
            {subTool === 'discount' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Original Price ($)</label>
                  <input
                    type="number"
                    value={origPrice}
                    onChange={(e) => setOrigPrice(e.target.value)}
                    className="w-full text-sm font-mono px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Discount Percent (%)</label>
                  <input
                    type="number"
                    value={discountPct}
                    onChange={(e) => setDiscountPct(e.target.value)}
                    className="w-full text-sm font-mono px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
              </div>
            )}

            {/* TIP */}
            {subTool === 'tip' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Bill Amount ($)</label>
                  <input
                    type="number"
                    value={billAmt}
                    onChange={(e) => setBillAmt(e.target.value)}
                    className="w-full text-sm font-mono px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Tip Percent (%)</label>
                    <input
                      type="number"
                      value={tipPct}
                      onChange={(e) => setTipPct(e.target.value)}
                      className="w-full text-sm font-mono px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Split Between (People)</label>
                    <input
                      type="number"
                      value={peopleCount}
                      onChange={(e) => setPeopleCount(e.target.value)}
                      className="w-full text-sm font-mono px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* LOAN */}
            {subTool === 'loan' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Principal / Loan Amount ($)</label>
                  <input
                    type="number"
                    value={loanPrincipal}
                    onChange={(e) => setLoanPrincipal(e.target.value)}
                    className="w-full text-sm font-mono px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Annual Interest Rate (%)</label>
                    <input
                      type="number"
                      value={loanRate}
                      onChange={(e) => setLoanRate(e.target.value)}
                      className="w-full text-sm font-mono px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Term (Years)</label>
                    <input
                      type="number"
                      value={loanYears}
                      onChange={(e) => setLoanYears(e.target.value)}
                      className="w-full text-sm font-mono px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* INVESTMENT */}
            {subTool === 'investment' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Initial Deposit ($)</label>
                    <input
                      type="number"
                      value={invPrincipal}
                      onChange={(e) => setInvPrincipal(e.target.value)}
                      className="w-full text-sm font-mono px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Monthly Contribution ($)</label>
                    <input
                      type="number"
                      value={invMonthly}
                      onChange={(e) => setInvMonthly(e.target.value)}
                      className="w-full text-sm font-mono px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Annual Return (%)</label>
                    <input
                      type="number"
                      value={invRate}
                      onChange={(e) => setInvRate(e.target.value)}
                      className="w-full text-sm font-mono px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Horizon (Years)</label>
                    <input
                      type="number"
                      value={invYears}
                      onChange={(e) => setInvYears(e.target.value)}
                      className="w-full text-sm font-mono px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* SAVINGS GOAL */}
            {subTool === 'savingsGoal' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Target Savings Goal ($)</label>
                  <input
                    type="number"
                    value={sgTarget}
                    onChange={(e) => setSgTarget(e.target.value)}
                    className="w-full text-sm font-mono px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Expected Annual Return (%)</label>
                    <input
                      type="number"
                      value={sgRate}
                      onChange={(e) => setSgRate(e.target.value)}
                      className="w-full text-sm font-mono px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Target Years</label>
                    <input
                      type="number"
                      value={sgYears}
                      onChange={(e) => setSgYears(e.target.value)}
                      className="w-full text-sm font-mono px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* INFLATION */}
            {subTool === 'inflation' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Current Amount ($)</label>
                  <input
                    type="number"
                    value={infAmount}
                    onChange={(e) => setInfAmount(e.target.value)}
                    className="w-full text-sm font-mono px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Annual Inflation Rate (%)</label>
                    <input
                      type="number"
                      value={infRate}
                      onChange={(e) => setInfRate(e.target.value)}
                      className="w-full text-sm font-mono px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Years in Future</label>
                    <input
                      type="number"
                      value={infYears}
                      onChange={(e) => setInfYears(e.target.value)}
                      className="w-full text-sm font-mono px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ROI */}
            {subTool === 'roi' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Initial Cost / Investment ($)</label>
                  <input
                    type="number"
                    value={roiCost}
                    onChange={(e) => setRoiCost(e.target.value)}
                    className="w-full text-sm font-mono px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Final Total Revenue / Return ($)</label>
                  <input
                    type="number"
                    value={roiRev}
                    onChange={(e) => setRoiRev(e.target.value)}
                    className="w-full text-sm font-mono px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
              </div>
            )}

            {/* TAX */}
            {subTool === 'tax' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Subtotal Amount ($)</label>
                  <input
                    type="number"
                    value={taxSubtotal}
                    onChange={(e) => setTaxSubtotal(e.target.value)}
                    className="w-full text-sm font-mono px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Sales Tax Rate (%)</label>
                  <input
                    type="number"
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                    className="w-full text-sm font-mono px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
              </div>
            )}

            {/* CURRENCY */}
            {subTool === 'currency' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Amount to Convert</label>
                  <input
                    type="number"
                    value={currAmount}
                    onChange={(e) => setCurrAmount(e.target.value)}
                    className="w-full text-sm font-mono px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">From Currency</label>
                    <select
                      value={currFrom}
                      onChange={(e) => setCurrFrom(e.target.value)}
                      className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                    >
                      {Object.keys(CURRENCY_RATES).map((k) => (
                        <option key={k} value={k}>
                          {k} ({CURRENCY_RATES[k].name})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">To Currency</label>
                    <select
                      value={currTo}
                      onChange={(e) => setCurrTo(e.target.value)}
                      className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                    >
                      {Object.keys(CURRENCY_RATES).map((k) => (
                        <option key={k} value={k}>
                          {k} ({CURRENCY_RATES[k].name})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400">
                  Fixed benchmark rates relative to USD. Rate: 1 {currFrom} ={' '}
                  {CURRENCY_RATES[currFrom].rateToUSD / CURRENCY_RATES[currTo].rateToUSD} {currTo}.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Output Column */}
        <div className="lg:col-span-6 flex flex-col gap-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            {currencyResult ? (
              <div className="space-y-4">
                <div>
                  <div className="text-xs text-slate-400">Converted Value</div>
                  <div className="text-3xl font-mono font-bold text-cyan-600 dark:text-cyan-400 mt-1">
                    {currencyResult.display}
                  </div>
                </div>
                <div className="text-xs text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
                  Exchange Rate: 1 {currFrom} = {currencyResult.rateUsed} {currTo}
                </div>
              </div>
            ) : result ? (
              <div className="space-y-4">
                <div>
                  <div className="text-xs text-slate-400">{result.primaryLabel}</div>
                  <div className="text-3xl font-mono font-bold text-cyan-600 dark:text-cyan-400 mt-1">
                    {result.primaryDisplay}
                  </div>
                </div>

                {result.secondaryValues && result.secondaryValues.length > 0 && (
                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                    {result.secondaryValues.map((sv, i) => (
                      <div key={i} className="text-xs">
                        <span className="text-slate-400 block">{sv.label}:</span>
                        <strong className="text-slate-900 dark:text-white font-mono text-sm">
                          {sv.value}
                        </strong>
                      </div>
                    ))}
                  </div>
                )}

                {result.steps && result.steps.length > 0 && (
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                    <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Calculation Steps
                    </h5>
                    <div className="space-y-1 text-xs font-mono text-slate-600 dark:text-slate-400">
                      {result.steps.map((st, i) => (
                        <div key={i}>• {st}</div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Amortization schedule preview if available */}
                {result.schedule && (
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Amortization Schedule Preview
                    </h5>
                    <div className="max-h-40 overflow-y-auto">
                      <table className="w-full text-[11px] font-mono text-left">
                        <thead>
                          <tr className="text-slate-400 border-b border-slate-200 dark:border-slate-700">
                            <th className="py-1">Mo</th>
                            <th className="py-1">Principal</th>
                            <th className="py-1">Interest</th>
                            <th className="py-1">Balance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.schedule.map((row) => (
                            <tr key={row.month} className="border-b border-slate-100 dark:border-slate-800/40">
                              <td className="py-1">{row.month}</td>
                              <td className="py-1 text-emerald-500">${row.principalPart.toFixed(2)}</td>
                              <td className="py-1 text-rose-500">${row.interestPart.toFixed(2)}</td>
                              <td className="py-1 text-slate-500">${row.balance.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {onApplyResultToCalculator && (
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                    <button
                      onClick={() => onApplyResultToCalculator(String(result?.primaryValue))}
                      className="text-xs text-cyan-500 hover:underline flex items-center gap-1 font-semibold"
                    >
                      <span>Send to Scientific Calculator</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-10 text-xs text-slate-400">
                {calcError || 'Select parameters on the left to calculate.'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
