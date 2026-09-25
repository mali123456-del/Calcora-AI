import React, { useMemo, useState } from 'react';
import { ArrowDownUp, Copy, Search } from 'lucide-react';
import { CURRENCIES, searchCurrencies } from '../data/currencies';
import { convertCurrency, type CurrencyRateSnapshot } from '../services/currencyService';

const DEMO_RATE_SOURCE_NOTE = 'Connect a verified live-rate provider to enable conversion rates. No rates are fabricated.';

export const CurrencyConverterPanel: React.FC = () => {
  const [amount, setAmount] = useState('1');
  const [from, setFrom] = useState('USD');
  const [to, setTo] = useState('PKR');
  const [query, setQuery] = useState('');
  const [rateInput, setRateInput] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const filtered = useMemo(() => searchCurrencies(query), [query]);

  const swap = () => { setFrom(to); setTo(from); setResult(null); };
  const calculate = () => {
    const numericAmount = Number(amount);
    const numericRate = Number(rateInput);
    if (!Number.isFinite(numericRate) || numericRate <= 0) {
      setResult(null);
      return;
    }
    const snapshot: CurrencyRateSnapshot = { base: from, rates: { [to]: numericRate }, fetchedAt: new Date().toISOString(), provider: 'User-verified rate', stale: false };
    const conversion = convertCurrency(numericAmount, from, to, snapshot);
    setResult('error' in conversion ? conversion.error : `${conversion.converted.toLocaleString()} ${conversion.to.code}  |  1 ${conversion.from.code} = ${conversion.rate} ${conversion.to.code}`);
  };

  const copy = async () => { if (result) await navigator.clipboard?.writeText(result); };

  return <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-5 shadow-xl space-y-5">
    <div>
      <h2 className="text-lg font-bold">Currency Converter</h2>
      <p className="text-xs text-slate-500 mt-1">{CURRENCIES.length}+ currencies • searchable ISO 4217 registry • PKR included</p>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 items-end">
      <label className="space-y-1"><span className="text-xs font-semibold text-slate-500">From</span><select value={from} onChange={e=>setFrom(e.target.value)} className="w-full rounded-xl border p-3 bg-transparent">{filtered.map(c=><option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}</select></label>
      <button type="button" onClick={swap} className="rounded-xl border p-3 hover:bg-slate-100 dark:hover:bg-slate-800" title="Swap currencies"><ArrowDownUp className="w-4 h-4"/></button>
      <label className="space-y-1"><span className="text-xs font-semibold text-slate-500">To</span><select value={to} onChange={e=>setTo(e.target.value)} className="w-full rounded-xl border p-3 bg-transparent">{filtered.map(c=><option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}</select></label>
    </div>
    <div className="flex gap-2"><div className="relative flex-1"><Search className="absolute left-3 top-3 w-4 h-4 text-slate-400"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search country, currency, code or symbol" className="w-full rounded-xl border p-3 pl-9 bg-transparent"/></div><input value={amount} onChange={e=>setAmount(e.target.value)} type="number" min="0" className="w-32 rounded-xl border p-3 bg-transparent" placeholder="Amount"/></div>
    <div className="rounded-xl border border-dashed p-4 space-y-2">
      <label className="block text-xs font-semibold text-slate-500">Verified rate: 1 {from} = {to}</label>
      <div className="flex gap-2"><input value={rateInput} onChange={e=>setRateInput(e.target.value)} type="number" min="0" step="any" className="flex-1 rounded-xl border p-3 bg-transparent" placeholder="Enter a verified provider rate"/><button type="button" onClick={calculate} className="rounded-xl px-4 py-2 bg-cyan-500 text-slate-950 font-bold">Convert</button></div>
      <p className="text-[11px] text-slate-500">{DEMO_RATE_SOURCE_NOTE}</p>
    </div>
    {result && <div className="flex items-center justify-between rounded-xl bg-slate-100 dark:bg-slate-800 p-4"><span className="font-semibold">{result}</span><button type="button" onClick={copy} title="Copy result" className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700"><Copy className="w-4 h-4"/></button></div>}
  </section>;
};
