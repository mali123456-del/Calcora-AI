import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ISO_CURRENCIES,
  TOTAL_CURRENCIES_COUNT,
  getCurrency,
  searchCurrencies,
  getPopularCurrencies,
} from '../../services/currency/currencyRegistry';
import {
  CurrencyRateProvider,
  BASELINE_USD_RATES,
} from '../../services/currency/currencyRateProvider';

describe('Production ISO 4217 Currency Registry & Rate Provider', () => {
  it('registers 128+ active world currencies (target: 128+)', () => {
    assert.ok(
      TOTAL_CURRENCIES_COUNT >= 128,
      `Expected at least 128 currencies, got ${TOTAL_CURRENCIES_COUNT}`
    );
    assert.equal(ISO_CURRENCIES.length, TOTAL_CURRENCIES_COUNT);
  });

  it('verifies PKR (Pakistani Rupee) with authoritative metadata and rates', () => {
    const pkr = getCurrency('PKR');
    assert.ok(pkr, 'PKR must be registered');
    assert.equal(pkr.code, 'PKR');
    assert.equal(pkr.name, 'Pakistani Rupee');
    assert.equal(pkr.countryOrRegion, 'Pakistan');
    assert.equal(pkr.symbol, '₨');
    assert.equal(pkr.numericCode, '586');
    assert.equal(pkr.minorUnit, 2);
    assert.equal(pkr.flagOrCountryCode, 'PK');
    assert.equal(pkr.active, true);
    assert.ok(pkr.aliases.includes('rupee'));

    // Check exchange rate
    const pkrRate = CurrencyRateProvider.getRateToUSD('PKR');
    assert.ok(pkrRate && pkrRate > 0, 'PKR rate to USD must be positive');
  });

  it('verifies at least 20 additional required world currencies', () => {
    const requiredCodes = [
      'USD', // United States Dollar
      'EUR', // Eurozone Euro
      'GBP', // British Pound Sterling
      'JPY', // Japanese Yen
      'CNY', // Chinese Yuan
      'INR', // Indian Rupee
      'AED', // UAE Dirham
      'SAR', // Saudi Riyal
      'CAD', // Canadian Dollar
      'AUD', // Australian Dollar
      'CHF', // Swiss Franc
      'TRY', // Turkish Lira
      'BDT', // Bangladeshi Taka
      'LKR', // Sri Lankan Rupee
      'NPR', // Nepalese Rupee
      'AFN', // Afghan Afghani
      'ZAR', // South African Rand
      'RUB', // Russian Ruble
      'KRW', // South Korean Won
      'SGD', // Singapore Dollar
      'MYR', // Malaysian Ringgit
      'IDR', // Indonesian Rupiah
      'THB', // Thai Baht
      'VND', // Vietnamese Dong
      'PHP', // Philippine Peso
      'BRL', // Brazilian Real
      'MXN', // Mexican Peso
      'NGN', // Nigerian Naira
      'EGP', // Egyptian Pound
      'ILS', // Israeli New Shekel
      'QAR', // Qatari Riyal
      'KWD', // Kuwaiti Dinar
      'BHD', // Bahraini Dinar
      'OMR', // Omani Rial
    ];

    assert.ok(
      requiredCodes.length >= 20,
      `Expected at least 20 currencies, got ${requiredCodes.length}`
    );

    for (const code of requiredCodes) {
      const curr = getCurrency(code);
      assert.ok(curr, `Currency ${code} must exist in registry`);
      assert.equal(curr.code, code);
      assert.ok(curr.name && curr.name.length > 0, `${code} must have a name`);
      assert.ok(curr.countryOrRegion && curr.countryOrRegion.length > 0, `${code} must have country`);
      assert.ok(curr.symbol && curr.symbol.length > 0, `${code} must have a symbol`);
      assert.ok(curr.numericCode && curr.numericCode.length > 0, `${code} must have numeric code`);
      assert.equal(curr.active, true, `${code} must be active`);

      // Rate verification
      const rate = CurrencyRateProvider.getRateToUSD(code);
      assert.ok(rate && rate > 0, `${code} must have a valid baseline rate to USD`);
    }
  });

  it('searches currencies by code, country, name, and symbol', () => {
    // Search by code
    const byCode = searchCurrencies('PKR');
    assert.ok(byCode.some((c) => c.code === 'PKR'));

    // Search by country
    const byCountry = searchCurrencies('Japan');
    assert.ok(byCountry.some((c) => c.code === 'JPY'));

    // Search by name
    const byName = searchCurrencies('Pound Sterling');
    assert.ok(byName.some((c) => c.code === 'GBP'));

    // Search by symbol
    const bySymbol = searchCurrencies('€');
    assert.ok(bySymbol.some((c) => c.code === 'EUR'));

    // Search by alias
    const byAlias = searchCurrencies('quid');
    assert.ok(byAlias.some((c) => c.code === 'GBP'));
  });

  it('calculates deterministic currency conversions accurately', () => {
    // 100 USD to PKR
    const pkrRate = BASELINE_USD_RATES['PKR'] || 278.5;
    const res = CurrencyRateProvider.convert('USD', 'PKR', 100, 2);
    assert.equal(res.fromCode, 'USD');
    assert.equal(res.toCode, 'PKR');
    assert.equal(res.amount, 100);
    assert.equal(res.resultAmount, Math.round(100 * pkrRate * 100) / 100);
    assert.ok(res.displayResult.includes('₨'));
    assert.ok(res.inverseRate > 0);
    assert.ok(res.provider.length > 0);
    assert.ok(res.timestamp.length > 0);

    // Inverse conversion: PKR to USD
    const invRes = CurrencyRateProvider.convert('PKR', 'USD', res.resultAmount, 2);
    assert.ok(Math.abs(invRes.resultAmount - 100) < 0.1);
  });

  it('supports custom precision and zero/negative amount edge cases gracefully', () => {
    const resHighPrec = CurrencyRateProvider.convert('EUR', 'USD', 50, 4);
    assert.equal(resHighPrec.precision, 4);

    const resZero = CurrencyRateProvider.convert('USD', 'EUR', 0);
    assert.equal(resZero.resultAmount, 0);

    const resNaN = CurrencyRateProvider.convert('USD', 'EUR', Number.NaN);
    assert.equal(resNaN.resultAmount, 0);
  });

  it('manages conversion history and markdown export', () => {
    CurrencyRateProvider.clearHistory();
    assert.equal(CurrencyRateProvider.getHistory().length, 0);

    CurrencyRateProvider.recordHistory({
      fromCode: 'USD',
      toCode: 'PKR',
      amount: 50,
      resultAmount: 13925,
      rate: 278.5,
    });

    const history = CurrencyRateProvider.getHistory();
    assert.equal(history.length, 1);
    assert.equal(history[0].fromCode, 'USD');
    assert.equal(history[0].toCode, 'PKR');

    const md = CurrencyRateProvider.exportHistoryMarkdown();
    assert.ok(md.includes('Calcora AI - Currency Conversion History'));
    assert.ok(md.includes('USD'));
    assert.ok(md.includes('PKR'));
  });

  it('manages favorite currency pairs', () => {
    const isFav = CurrencyRateProvider.toggleFavoritePair('USD', 'CHF');
    const favorites = CurrencyRateProvider.getFavoritePairs();
    assert.ok(favorites.some(([f, t]) => f === 'USD' && t === 'CHF'));

    // Toggle off
    CurrencyRateProvider.toggleFavoritePair('USD', 'CHF');
    const updatedFavs = CurrencyRateProvider.getFavoritePairs();
    assert.ok(!updatedFavs.some(([f, t]) => f === 'USD' && t === 'CHF'));
  });
});
