/**
 * Calcora AI - Production Currency Rate Provider
 *
 * Clean multi-tier provider abstraction:
 * 1. Live Public Provider (open.er-api.com with timeout & error handling)
 * 2. Cached Rates (localStorage + in-memory fallback, 1 hour TTL)
 * 3. Last-Known Baseline Rates (deterministic authoritative fallback for 158+ ISO currencies)
 * 4. Deterministic conversion & inverse rate calculation
 * 5. Full audit metadata: timestamp, provider/source, base, target, rate freshness, inverse rate
 */

import { getCurrency, ISO_CURRENCIES } from './currencyRegistry';

export type RateFreshness = 'live' | 'cached' | 'baseline_fallback';

export interface CurrencyConversionResult {
  fromCode: string;
  toCode: string;
  amount: number;
  resultAmount: number;
  displayResult: string;
  rate: number;
  inverseRate: number;
  precision: number;
  freshness: RateFreshness;
  provider: string;
  timestamp: string;
  isStale: boolean;
  formula: string;
}

export interface CurrencyHistoryItem {
  id: string;
  fromCode: string;
  toCode: string;
  amount: number;
  resultAmount: number;
  rate: number;
  timestamp: number;
}

// Deterministic baseline rates relative to USD (1 USD = X Currency)
// Authoritative last-known reference values
export const BASELINE_USD_RATES: Record<string, number> = {
  USD: 1.0,
  EUR: 0.92,
  GBP: 0.78,
  PKR: 278.5,
  INR: 83.5,
  JPY: 155.2,
  CNY: 7.24,
  AED: 3.6725,
  SAR: 3.75,
  CAD: 1.37,
  AUD: 1.52,
  CHF: 0.91,
  TRY: 32.2,
  BDT: 117.5,
  LKR: 302.0,
  NPR: 133.6,
  AFN: 70.8,
  ZAR: 18.5,
  RUB: 91.2,
  KRW: 1375.0,
  SGD: 1.35,
  MYR: 4.71,
  IDR: 16250.0,
  THB: 36.8,
  VND: 25450.0,
  PHP: 58.2,
  BRL: 5.25,
  MXN: 17.8,
  NGN: 1480.0,
  EGP: 47.6,
  ILS: 3.72,
  QAR: 3.64,
  KWD: 0.307,
  BHD: 0.376,
  OMR: 0.385,
  SEK: 10.7,
  NOK: 10.6,
  DKK: 6.9,
  PLN: 3.95,
  CZK: 23.1,
  HUF: 360.5,
  RON: 4.6,
  BGN: 1.8,
  HRK: 6.95,
  RSD: 108.0,
  ISK: 138.5,
  UAH: 40.2,
  GEL: 2.75,
  AMD: 388.0,
  AZN: 1.7,
  KZT: 445.0,
  UZS: 12650.0,
  TJS: 10.9,
  KGS: 87.5,
  TMT: 3.5,
  MNT: 3450.0,
  HKD: 7.82,
  TWD: 32.4,
  MOP: 8.05,
  NZD: 1.63,
  FJD: 2.26,
  PGK: 3.85,
  SBD: 8.45,
  VUV: 120.0,
  WST: 2.75,
  TOP: 2.35,
  CLP: 920.0,
  COP: 3950.0,
  ARS: 890.0,
  PEN: 3.74,
  UYU: 38.8,
  BOB: 6.91,
  PYG: 7500.0,
  VES: 36.5,
  CRC: 525.0,
  PAB: 1.0,
  GTQ: 7.75,
  HNL: 24.7,
  NIO: 36.8,
  DOP: 59.2,
  JMD: 156.0,
  TTD: 6.78,
  BBD: 2.0,
  BSD: 1.0,
  BZD: 2.0,
  GYD: 209.0,
  SRD: 31.5,
  HTG: 132.5,
  CUP: 24.0,
  XCD: 2.7,
  AWG: 1.8,
  ANG: 1.8,
  BMD: 1.0,
  KYD: 0.83,
  GIP: 0.78,
  FKP: 0.78,
  SHP: 0.78,
  MAD: 10.0,
  DZD: 134.5,
  TND: 3.12,
  LYD: 4.85,
  SDG: 601.0,
  KES: 131.0,
  UGX: 3780.0,
  TZS: 2600.0,
  RWF: 1300.0,
  ETB: 57.5,
  SOS: 571.0,
  DJF: 178.0,
  GHS: 14.8,
  GMD: 68.5,
  GNF: 8600.0,
  SLL: 22.5,
  LRD: 194.0,
  CVE: 102.5,
  XOF: 605.0,
  XAF: 605.0,
  CDF: 2800.0,
  AOA: 855.0,
  MZN: 63.8,
  ZMW: 26.5,
  MWK: 1735.0,
  BWP: 13.6,
  NAD: 18.5,
  LSL: 18.5,
  SZL: 18.5,
  MGA: 4450.0,
  MUR: 46.2,
  SCR: 13.5,
  KMF: 455.0,
  STN: 22.8,
  BIF: 2880.0,
  SSP: 130.0,
  ERN: 15.0,
  MRU: 39.8,
  JOD: 0.709,
  LBP: 89500.0,
  SYP: 13000.0,
  IQD: 1310.0,
  IRR: 42000.0,
  YER: 250.0,
  ALL: 93.5,
  MKD: 56.8,
  BAM: 1.8,
  MDL: 17.7,
  BYN: 3.28,
  BND: 1.35,
  KHR: 4100.0,
  LAK: 21800.0,
  MMK: 2100.0,
  MVR: 15.4,
  BTN: 83.5,
  XPF: 110.0,
  ZWL: 13.5,
  XAU: 0.00042, // ~2380 USD / oz
  XAG: 0.032,   // ~31 USD / oz
  XPT: 0.00102, // ~980 USD / oz
  XPD: 0.00105, // ~950 USD / oz
};

// Storage keys
const RATES_CACHE_KEY = 'calcora_currency_rates_cache_v2';
const RECENT_PAIRS_KEY = 'calcora_currency_recent_pairs_v2';
const FAVORITE_PAIRS_KEY = 'calcora_currency_favorite_pairs_v2';
const CONVERSION_HISTORY_KEY = 'calcora_currency_history_v2';

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

interface RatesCachePayload {
  timestamp: number;
  rates: Record<string, number>;
  source: string;
}

let inMemoryRatesCache: RatesCachePayload | null = null;
let inMemoryHistory: CurrencyHistoryItem[] = [];

function isStorageAvailable(): boolean {
  try {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  } catch {
    return false;
  }
}

/**
 * CurrencyRateProvider Class
 */
export class CurrencyRateProvider {
  private static cachedRatesMap: Record<string, number> = { ...BASELINE_USD_RATES };
  private static currentFreshness: RateFreshness = 'baseline_fallback';
  private static currentProviderName = 'Authoritative Baseline ISO 4217 Rates';
  private static lastRateTimestamp = new Date().toISOString();

  /**
   * Initializes rate provider and loads cached rates or baseline.
   */
  public static init(): void {
    if (isStorageAvailable()) {
      try {
        const raw = localStorage.getItem(RATES_CACHE_KEY);
        if (raw) {
          const payload: RatesCachePayload = JSON.parse(raw);
          if (Date.now() - payload.timestamp < CACHE_TTL_MS) {
            this.cachedRatesMap = { ...BASELINE_USD_RATES, ...payload.rates };
            this.currentFreshness = 'cached';
            this.currentProviderName = payload.source || 'Cached Public Exchange Feed';
            this.lastRateTimestamp = new Date(payload.timestamp).toISOString();
            return;
          }
        }
      } catch {}
    }

    if (inMemoryRatesCache && Date.now() - inMemoryRatesCache.timestamp < CACHE_TTL_MS) {
      this.cachedRatesMap = { ...BASELINE_USD_RATES, ...inMemoryRatesCache.rates };
      this.currentFreshness = 'cached';
      this.currentProviderName = inMemoryRatesCache.source;
      this.lastRateTimestamp = new Date(inMemoryRatesCache.timestamp).toISOString();
    }
  }

  /**
   * Fetches fresh rates from open public exchange rate API.
   * Fail-safe: if unavailable, falls back to cached or verified baseline without errors.
   */
  public static async fetchLiveRates(force = false): Promise<boolean> {
    if (!force && this.currentFreshness === 'live') {
      return true;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const resp = await fetch('https://open.er-api.com/v6/latest/USD', {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!resp.ok) {
        throw new Error(`Public exchange rate API returned HTTP ${resp.status}`);
      }

      const data = await resp.json();
      if (data && data.rates && typeof data.rates === 'object') {
        const liveRates: Record<string, number> = {};
        for (const [code, rate] of Object.entries(data.rates)) {
          if (typeof rate === 'number' && rate > 0) {
            liveRates[code.toUpperCase()] = rate;
          }
        }

        this.cachedRatesMap = { ...BASELINE_USD_RATES, ...liveRates };
        this.currentFreshness = 'live';
        this.currentProviderName = 'Open Exchange Rate Feed (open.er-api.com)';
        this.lastRateTimestamp = new Date().toISOString();

        const payload: RatesCachePayload = {
          timestamp: Date.now(),
          rates: liveRates,
          source: this.currentProviderName,
        };

        inMemoryRatesCache = payload;
        if (isStorageAvailable()) {
          try {
            localStorage.setItem(RATES_CACHE_KEY, JSON.stringify(payload));
          } catch {}
        }

        return true;
      }
    } catch {
      // Keep baseline/cached rates; gracefully handle offline or network restrictions
    }

    return false;
  }

  /**
   * Get single rate relative to USD
   */
  public static getRateToUSD(code: string): number | undefined {
    return this.cachedRatesMap[code.toUpperCase()] || BASELINE_USD_RATES[code.toUpperCase()];
  }

  /**
   * Calculates rate between two currencies: (USD -> toCode) / (USD -> fromCode)
   */
  public static getExchangeRate(fromCode: string, toCode: string): number | null {
    const fromUSD = this.getRateToUSD(fromCode);
    const toUSD = this.getRateToUSD(toCode);

    if (!fromUSD || !toUSD || fromUSD <= 0 || toUSD <= 0) {
      return null;
    }

    return toUSD / fromUSD;
  }

  /**
   * Performs deterministic conversion between any of the 158+ supported currencies.
   */
  public static convert(
    fromCode: string,
    toCode: string,
    amount: number,
    precision = 2
  ): CurrencyConversionResult {
    const cleanFrom = fromCode.toUpperCase();
    const cleanTo = toCode.toUpperCase();
    const fromCurr = getCurrency(cleanFrom);
    const toCurr = getCurrency(cleanTo);

    const safeAmount = Number.isNaN(amount) ? 0 : amount;
    const rate = this.getExchangeRate(cleanFrom, cleanTo) ?? 1.0;
    const inverseRate = rate > 0 ? 1 / rate : 0;
    const rawResult = safeAmount * rate;

    // Apply specified precision
    const clampedPrecision = Math.max(0, Math.min(8, precision));
    const factor = Math.pow(10, clampedPrecision);
    const roundedResult = Math.round(rawResult * factor) / factor;

    const toSymbol = toCurr?.symbol || cleanTo;
    const displayResult = `${toSymbol} ${roundedResult.toLocaleString('en-US', {
      minimumFractionDigits: clampedPrecision,
      maximumFractionDigits: clampedPrecision,
    })}`;

    const formula = `1 ${cleanFrom} = ${rate.toFixed(Math.min(6, clampedPrecision + 2))} ${cleanTo}`;

    const result: CurrencyConversionResult = {
      fromCode: cleanFrom,
      toCode: cleanTo,
      amount: safeAmount,
      resultAmount: roundedResult,
      displayResult,
      rate,
      inverseRate,
      precision: clampedPrecision,
      freshness: this.currentFreshness,
      provider: this.currentProviderName,
      timestamp: this.lastRateTimestamp,
      isStale: this.currentFreshness === 'baseline_fallback',
      formula,
    };

    // Auto-record to recent pairs
    this.recordRecentPair(cleanFrom, cleanTo);

    return result;
  }

  // -------------------------------------------------------------------------
  // Recent & Favorite Pairs
  // -------------------------------------------------------------------------

  public static getRecentPairs(): Array<[string, string]> {
    if (isStorageAvailable()) {
      try {
        const raw = localStorage.getItem(RECENT_PAIRS_KEY);
        if (raw) return JSON.parse(raw);
      } catch {}
    }
    return [
      ['USD', 'PKR'],
      ['EUR', 'USD'],
      ['GBP', 'USD'],
      ['USD', 'INR'],
      ['AED', 'PKR'],
      ['SAR', 'PKR'],
    ];
  }

  public static recordRecentPair(from: string, to: string): void {
    if (from === to) return;
    const current = this.getRecentPairs();
    const filtered = current.filter(([f, t]) => !(f === from && t === to));
    filtered.unshift([from, to]);
    const trimmed = filtered.slice(0, 10);

    if (isStorageAvailable()) {
      try {
        localStorage.setItem(RECENT_PAIRS_KEY, JSON.stringify(trimmed));
      } catch {}
    }
  }

  public static getFavoritePairs(): Array<[string, string]> {
    if (isStorageAvailable()) {
      try {
        const raw = localStorage.getItem(FAVORITE_PAIRS_KEY);
        if (raw) return JSON.parse(raw);
      } catch {}
    }
    return [
      ['USD', 'PKR'],
      ['EUR', 'USD'],
      ['GBP', 'USD'],
      ['USD', 'AED'],
      ['SAR', 'PKR'],
    ];
  }

  public static toggleFavoritePair(from: string, to: string): boolean {
    const favorites = this.getFavoritePairs();
    const idx = favorites.findIndex(([f, t]) => f === from && t === to);
    let isFav = false;

    if (idx >= 0) {
      favorites.splice(idx, 1);
      isFav = false;
    } else {
      favorites.unshift([from, to]);
      isFav = true;
    }

    if (isStorageAvailable()) {
      try {
        localStorage.setItem(FAVORITE_PAIRS_KEY, JSON.stringify(favorites));
      } catch {}
    }

    return isFav;
  }

  // -------------------------------------------------------------------------
  // Conversion History
  // -------------------------------------------------------------------------

  public static recordHistory(item: Omit<CurrencyHistoryItem, 'id' | 'timestamp'>): void {
    const fullItem: CurrencyHistoryItem = {
      ...item,
      id: `curr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
    };

    inMemoryHistory.unshift(fullItem);
    if (inMemoryHistory.length > 50) {
      inMemoryHistory.pop();
    }

    if (isStorageAvailable()) {
      try {
        localStorage.setItem(CONVERSION_HISTORY_KEY, JSON.stringify(inMemoryHistory.slice(0, 30)));
      } catch {}
    }
  }

  public static getHistory(): CurrencyHistoryItem[] {
    if (isStorageAvailable()) {
      try {
        const raw = localStorage.getItem(CONVERSION_HISTORY_KEY);
        if (raw) {
          inMemoryHistory = JSON.parse(raw);
          return inMemoryHistory;
        }
      } catch {}
    }
    return inMemoryHistory;
  }

  public static clearHistory(): void {
    inMemoryHistory = [];
    if (isStorageAvailable()) {
      try {
        localStorage.removeItem(CONVERSION_HISTORY_KEY);
      } catch {}
    }
  }

  public static exportHistoryMarkdown(): string {
    const history = this.getHistory();
    let md = `# Calcora AI - Currency Conversion History\n`;
    md += `Exported on: ${new Date().toLocaleString()}\n\n`;
    md += `| Date & Time | From | To | Original Amount | Converted Amount | Exchange Rate |\n`;
    md += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`;

    for (const h of history) {
      const dt = new Date(h.timestamp).toLocaleString();
      md += `| ${dt} | ${h.fromCode} | ${h.toCode} | ${h.amount} ${h.fromCode} | ${h.resultAmount} ${h.toCode} | 1 ${h.fromCode} = ${h.rate.toFixed(4)} ${h.toCode} |\n`;
    }

    return md;
  }
}

// Auto-init on load
CurrencyRateProvider.init();
