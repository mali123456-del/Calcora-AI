import { findCurrency, type CurrencyDefinition } from '../data/currencies';

export interface CurrencyRateSnapshot {
  base: string;
  rates: Record<string, number>;
  fetchedAt: string;
  provider: string;
  stale: boolean;
}

export interface CurrencyConversion {
  amount: number;
  from: CurrencyDefinition;
  to: CurrencyDefinition;
  rate: number;
  converted: number;
  fetchedAt: string;
  provider: string;
  stale: boolean;
}

export function convertCurrency(
  amount: number,
  fromCode: string,
  toCode: string,
  snapshot: CurrencyRateSnapshot,
): CurrencyConversion | { error: string } {
  if (!Number.isFinite(amount)) return { error: 'Amount must be a finite number.' };
  const from = findCurrency(fromCode);
  const to = findCurrency(toCode);
  if (!from || !to) return { error: 'Unsupported currency code.' };
  if (snapshot.base.toUpperCase() !== from.code) return { error: `Rate snapshot base is ${snapshot.base}, not ${from.code}.` };
  const direct = to.code === from.code ? 1 : snapshot.rates[to.code];
  if (!Number.isFinite(direct) || direct <= 0) return { error: `A verified rate for ${from.code} → ${to.code} is unavailable.` };
  return { amount, from, to, rate: direct, converted: amount * direct, fetchedAt: snapshot.fetchedAt, provider: snapshot.provider, stale: snapshot.stale };
}

export function normalizeRateSnapshot(input: unknown): CurrencyRateSnapshot | null {
  if (!input || typeof input !== 'object') return null;
  const value = input as Partial<CurrencyRateSnapshot>;
  if (typeof value.base !== 'string' || typeof value.fetchedAt !== 'string' || typeof value.provider !== 'string' || typeof value.rates !== 'object' || !value.rates) return null;
  const rates: Record<string, number> = {};
  for (const [code, rate] of Object.entries(value.rates)) {
    if (typeof rate === 'number' && Number.isFinite(rate) && rate > 0 && findCurrency(code)) rates[code.toUpperCase()] = rate;
  }
  return { base: value.base.toUpperCase(), rates, fetchedAt: value.fetchedAt, provider: value.provider, stale: Boolean(value.stale) };
}
