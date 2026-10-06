/**
 * Calcora AI - Production 128+ Currency Converter Widget
 *
 * Implements:
 * - 158+ ISO 4217 currencies
 * - Searchable currency picker by code, country, name, symbol
 * - Popular currencies quick-select
 * - Live/Cached/Baseline rate provider with freshness indicator
 * - Precision adjustment (0 to 8 decimals)
 * - Currency swap, copy result, reset, clear
 * - Favorite pairs and recent conversion history with Markdown export
 * - Keyboard accessible and mobile responsive
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  CurrencyRecord,
  ISO_CURRENCIES,
  searchCurrencies,
  getCurrency,
  getPopularCurrencies,
} from '../services/currency/currencyRegistry';
import {
  CurrencyRateProvider,
  CurrencyConversionResult,
  CurrencyHistoryItem,
} from '../services/currency/currencyRateProvider';
import {
  ArrowRightLeft,
  Search,
  Star,
  Clock,
  Copy,
  Check,
  RotateCcw,
  Download,
  Trash2,
  TrendingUp,
  RefreshCw,
  Globe,
  Info,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';

interface CurrencyConverterWidgetProps {
  initialFrom?: string;
  initialTo?: string;
  onApplyToCalculator?: (expr: string) => void;
}

export const CurrencyConverterWidget: React.FC<CurrencyConverterWidgetProps> = ({
  initialFrom = 'USD',
  initialTo = 'PKR',
  onApplyToCalculator,
}) => {
  const [fromCode, setFromCode] = useState<string>(initialFrom);
  const [toCode, setToCode] = useState<string>(initialTo);
  const [amount, setAmount] = useState<string>('100');
  const [precision, setPrecision] = useState<number>(2);
  const [copied, setCopied] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [activePicker, setActivePicker] = useState<'from' | 'to' | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [favoritePairs, setFavoritePairs] = useState<Array<[string, string]>>(() =>
    CurrencyRateProvider.getFavoritePairs()
  );
  const [history, setHistory] = useState<CurrencyHistoryItem[]>(() =>
    CurrencyRateProvider.getHistory()
  );
  const [showHistory, setShowHistory] = useState<boolean>(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Initialize from local cache or bundled baseline. Live rates are fetched only
  // after the learner explicitly selects Refresh Live Exchange Rates.
  useEffect(() => {
    CurrencyRateProvider.init();
  }, []);

  // Focus search input when picker opens
  useEffect(() => {
    if (activePicker && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [activePicker]);

  // Current conversion calculation
  const parsedAmount = parseFloat(amount) || 0;
  const conversionResult: CurrencyConversionResult = useMemo(() => {
    return CurrencyRateProvider.convert(fromCode, toCode, parsedAmount, precision);
  }, [fromCode, toCode, parsedAmount, precision]);

  const fromCurrency = getCurrency(fromCode) || ISO_CURRENCIES[0];
  const toCurrency = getCurrency(toCode) || ISO_CURRENCIES[1];

  const popularCurrencies = useMemo(() => getPopularCurrencies(), []);
  const filteredCurrencies = useMemo(() => searchCurrencies(searchQuery), [searchQuery]);

  const handleSwap = () => {
    const temp = fromCode;
    setFromCode(toCode);
    setToCode(temp);
  };

  const handleRefreshRates = async () => {
    setIsRefreshing(true);
    await CurrencyRateProvider.fetchLiveRates(true);
    setIsRefreshing(false);
  };

  const handleCopy = () => {
    const textToCopy = `${conversionResult.displayResult} (${conversionResult.amount} ${fromCode} = ${conversionResult.resultAmount} ${toCode})`;
    navigator.clipboard?.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRecordHistory = () => {
    if (parsedAmount <= 0) return;
    CurrencyRateProvider.recordHistory({
      fromCode,
      toCode,
      amount: parsedAmount,
      resultAmount: conversionResult.resultAmount,
      rate: conversionResult.rate,
    });
    setHistory(CurrencyRateProvider.getHistory());
  };

  const handleToggleFavorite = () => {
    CurrencyRateProvider.toggleFavoritePair(fromCode, toCode);
    setFavoritePairs(CurrencyRateProvider.getFavoritePairs());
  };

  const isCurrentPairFavorite = favoritePairs.some(
    ([f, t]) => f === fromCode && t === toCode
  );

  const handleExportHistory = () => {
    const md = CurrencyRateProvider.exportHistoryMarkdown();
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `calcora_currency_history_${Date.now()}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleClearHistory = () => {
    CurrencyRateProvider.clearHistory();
    setHistory([]);
  };

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Top Header / Meta Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <div className="font-semibold text-slate-200 flex items-center gap-2">
              <span>ISO 4217 Currency Hub</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 font-mono">
                {ISO_CURRENCIES.length} Currencies
              </span>
            </div>
            <div className="text-[11px] text-slate-400">
              Provider: <span className="text-slate-300 font-medium">{conversionResult.provider}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Rate freshness pill */}
          <span
            className={`px-2 py-1 rounded-lg text-[10px] font-mono flex items-center gap-1.5 ${
              conversionResult.freshness === 'live'
                ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30'
                : conversionResult.freshness === 'cached'
                ? 'bg-blue-950/60 text-blue-300 border border-blue-500/30'
                : 'bg-amber-950/60 text-amber-300 border border-amber-500/30'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                conversionResult.freshness === 'live'
                  ? 'bg-emerald-400 animate-pulse'
                  : conversionResult.freshness === 'cached'
                  ? 'bg-blue-400'
                  : 'bg-amber-400'
              }`}
            />
            {conversionResult.freshness === 'live'
              ? 'Live Rate'
              : conversionResult.freshness === 'cached'
              ? 'Cached Feed'
              : 'Verified Baseline'}
          </span>

          <button
            type="button"
            onClick={handleRefreshRates}
            disabled={isRefreshing}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all border border-slate-700/60"
            title="Refresh Live Exchange Rates"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Converter Card */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-6">
        {/* Popular Quick Select */}
        <div>
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Popular Currencies</span>
            <span className="text-[11px] text-slate-400 font-normal">Click to set target</span>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {popularCurrencies.map((c) => (
              <button
                key={c.code}
                type="button"
                onClick={() => setToCode(c.code)}
                className={`px-2.5 py-1 rounded-xl text-xs font-mono font-medium transition-all shrink-0 flex items-center gap-1.5 ${
                  toCode === c.code
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>{c.code}</span>
                <span className="text-[10px] opacity-75">{c.symbol}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Input & Pickers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* FROM SECTION (5 Cols) */}
          <div className="md:col-span-5 flex flex-col gap-2">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              You Send ({fromCurrency.countryOrRegion})
            </label>
            <div className="flex items-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500/50">
              <button
                type="button"
                onClick={() => {
                  setActivePicker('from');
                  setSearchQuery('');
                }}
                className="px-3.5 py-3 flex items-center gap-2 border-r border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-900/80 hover:bg-slate-200/70 dark:hover:bg-slate-800/80 transition-all shrink-0"
              >
                <span className="text-base font-bold font-mono text-slate-900 dark:text-white">
                  {fromCurrency.code}
                </span>
                <span className="text-xs text-slate-400 font-mono">▼</span>
              </button>
              <input
                type="number"
                min="0"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-3 text-lg font-mono font-bold bg-transparent text-slate-900 dark:text-white focus:outline-hidden"
              />
            </div>
            <div className="text-[11px] text-slate-400 truncate">
              {fromCurrency.name} • {fromCurrency.symbol}
            </div>
          </div>

          {/* SWAP BUTTON (2 Cols) */}
          <div className="md:col-span-2 flex justify-center">
            <button
              type="button"
              onClick={handleSwap}
              className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-emerald-600 hover:text-white transition-all shadow-xs border border-slate-200 dark:border-slate-700"
              title="Swap Currencies"
            >
              <ArrowRightLeft className="w-5 h-5" />
            </button>
          </div>

          {/* TO SECTION (5 Cols) */}
          <div className="md:col-span-5 flex flex-col gap-2">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Recipient Gets ({toCurrency.countryOrRegion})
            </label>
            <div className="flex items-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 overflow-hidden">
              <button
                type="button"
                onClick={() => {
                  setActivePicker('to');
                  setSearchQuery('');
                }}
                className="px-3.5 py-3 flex items-center gap-2 border-r border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-900/80 hover:bg-slate-200/70 dark:hover:bg-slate-800/80 transition-all shrink-0"
              >
                <span className="text-base font-bold font-mono text-slate-900 dark:text-white">
                  {toCurrency.code}
                </span>
                <span className="text-xs text-slate-400 font-mono">▼</span>
              </button>
              <div className="w-full px-4 py-3 text-lg font-mono font-bold text-emerald-600 dark:text-emerald-400 truncate">
                {conversionResult.displayResult}
              </div>
            </div>
            <div className="text-[11px] text-slate-400 truncate">
              {toCurrency.name} • {toCurrency.symbol}
            </div>
          </div>
        </div>

        {/* Rate Summary, Precision Controls, and Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="space-y-1">
            <div className="text-xs font-medium text-slate-700 dark:text-slate-300 font-mono">
              {conversionResult.formula}
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              Inverse: 1 {toCode} = {conversionResult.inverseRate.toFixed(Math.min(6, precision + 2))} {fromCode}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Precision Selector */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-xl text-xs">
              <span className="text-[10px] text-slate-400 font-medium">Decimals:</span>
              {[2, 4, 6, 8].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPrecision(p)}
                  className={`px-1.5 py-0.5 rounded text-[11px] font-mono font-medium ${
                    precision === p
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Favorite Button */}
            <button
              type="button"
              onClick={handleToggleFavorite}
              className={`p-2 rounded-xl border transition-all ${
                isCurrentPairFavorite
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
              title={isCurrentPairFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
            >
              <Star className="w-4 h-4" />
            </button>

            {/* Save to History Button */}
            <button
              type="button"
              onClick={handleRecordHistory}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center gap-1.5"
            >
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Record</span>
            </button>

            {/* Copy Result Button */}
            <button
              type="button"
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-xs flex items-center gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Favorite Pairs Quick-Pills */}
        {favoritePairs.length > 0 && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 overflow-x-auto scrollbar-none">
            <span className="text-[11px] text-slate-400 shrink-0 font-medium">Favorite Pairs:</span>
            {favoritePairs.map(([f, t]) => (
              <button
                key={`${f}-${t}`}
                type="button"
                onClick={() => {
                  setFromCode(f);
                  setToCode(t);
                }}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-mono border transition-all shrink-0 ${
                  fromCode === f && toCode === t
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:text-white'
                }`}
              >
                {f} → {t}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* History Drawer Toggle & Table */}
      <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowHistory(!showHistory)}
            className="text-xs font-semibold text-slate-300 flex items-center gap-2 hover:text-white transition-all"
          >
            <Clock className="w-4 h-4 text-emerald-400" />
            <span>Conversion History ({history.length})</span>
            <span className="text-[11px] text-slate-500">{showHistory ? '▲ Hide' : '▼ View'}</span>
          </button>

          {history.length > 0 && showHistory && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportHistory}
                className="px-2.5 py-1 rounded-lg text-[11px] bg-slate-800 text-slate-300 hover:text-white flex items-center gap-1 transition-all"
              >
                <Download className="w-3 h-3" />
                <span>Export Markdown</span>
              </button>
              <button
                type="button"
                onClick={handleClearHistory}
                className="px-2.5 py-1 rounded-lg text-[11px] bg-rose-950/60 text-rose-300 hover:bg-rose-900 flex items-center gap-1 transition-all"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear</span>
              </button>
            </div>
          )}
        </div>

        {showHistory && (
          <div className="mt-4 overflow-x-auto">
            {history.length === 0 ? (
              <div className="text-xs text-slate-500 py-3 text-center">
                No conversions recorded yet. Click "Record" above to save your conversions.
              </div>
            ) : (
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 text-[11px]">
                    <th className="py-2">Time</th>
                    <th className="py-2">From</th>
                    <th className="py-2">To</th>
                    <th className="py-2">Amount</th>
                    <th className="py-2">Result</th>
                    <th className="py-2">Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {history.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-800/30">
                      <td className="py-2 text-slate-500 text-[11px]">
                        {new Date(item.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="py-2 font-bold">{item.fromCode}</td>
                      <td className="py-2 font-bold text-emerald-400">{item.toCode}</td>
                      <td className="py-2">{item.amount.toLocaleString()}</td>
                      <td className="py-2 text-emerald-400 font-bold">
                        {item.resultAmount.toLocaleString()}
                      </td>
                      <td className="py-2 text-slate-400">
                        1 {item.fromCode} = {item.rate.toFixed(4)} {item.toCode}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Currency Search / Picker Modal */}
      {activePicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="w-full max-w-lg max-h-[85vh] flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Select {activePicker === 'from' ? 'Base' : 'Target'} Currency
                </h3>
                <p className="text-xs text-slate-400">
                  Search across 158+ ISO 4217 world currencies
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActivePicker(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Search Input Bar */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by code (e.g. PKR), country (e.g. Pakistan), or name..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Currency List */}
            <div className="flex-1 overflow-y-auto p-2 divide-y divide-slate-100 dark:divide-slate-800/60 max-h-[400px]">
              {filteredCurrencies.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  No currencies match "{searchQuery}".
                </div>
              ) : (
                filteredCurrencies.map((c) => {
                  const isSelected = activePicker === 'from' ? fromCode === c.code : toCode === c.code;
                  return (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => {
                        if (activePicker === 'from') setFromCode(c.code);
                        else setToCode(c.code);
                        setActivePicker(null);
                      }}
                      className={`w-full p-3 rounded-xl flex items-center justify-between text-left transition-all ${
                        isSelected
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-900 dark:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-mono font-bold text-xs text-slate-700 dark:text-slate-300">
                          {c.code.slice(0, 3)}
                        </span>
                        <div>
                          <div className="text-sm font-semibold flex items-center gap-2">
                            <span>{c.name}</span>
                            <span className="text-xs text-slate-400 font-mono">({c.code})</span>
                          </div>
                          <div className="text-xs text-slate-400">
                            {c.countryOrRegion} • Symbol: {c.symbol}
                          </div>
                        </div>
                      </div>

                      {isSelected && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
