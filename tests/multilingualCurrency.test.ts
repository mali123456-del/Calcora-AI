import assert from 'node:assert/strict';
import { CURRENCIES, findCurrency, searchCurrencies } from '../src/data/currencies';
import { convertCurrency } from '../src/services/currencyService';
import { TUTOR_LANGUAGES, getTutorLanguageCapability } from '../src/ai/tutorLanguages';
import { buildMultilingualTutorKnowledge, detectLanguageFromText } from '../src/services/multilingualTutorKnowledge';

assert.ok(CURRENCIES.length >= 128, `expected 128+ currencies, got ${CURRENCIES.length}`);
assert.equal(findCurrency('PKR')?.name, 'Pakistani Rupee');
assert.equal(findCurrency('PKR')?.numericCode, '586');
assert.ok(searchCurrencies('Pakistan').some(c => c.code === 'PKR'));
assert.ok(new Set(CURRENCIES.map(c => c.code)).size === CURRENCIES.length);

const conversion = convertCurrency(100, 'USD', 'PKR', {
  base: 'USD',
  rates: { PKR: 280 },
  fetchedAt: new Date().toISOString(),
  provider: 'test-verified-rate',
  stale: false,
});
assert.equal('error' in conversion, false);
if (!('error' in conversion)) assert.equal(conversion.converted, 28000);

assert.ok(TUTOR_LANGUAGES.length >= 100, `expected 100+ languages, got ${TUTOR_LANGUAGES.length}`);
assert.ok(getTutorLanguageCapability('ur').direction === 'rtl');
assert.ok(getTutorLanguageCapability('ar').direction === 'rtl');
assert.equal(detectLanguageFromText('مجھے الجبرا سمجھاؤ'), 'ur');
assert.equal(detectLanguageFromText('Explain algebra'), 'en');
assert.ok(buildMultilingualTutorKnowledge('ur').includes('gender agreement'));
assert.ok(buildMultilingualTutorKnowledge('ja').includes('particles'));

console.log(`PASS multilingualCurrency: ${CURRENCIES.length} currencies, ${TUTOR_LANGUAGES.length} languages`);
