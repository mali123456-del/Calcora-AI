import assert from 'node:assert/strict';
import { analyzeTutorInput } from '../src/services/multilingualTutorInput';

const cases = [
  ['yar mujhe 2x+3=7 solve kr k samjhao', 'roman-urdu'],
  ['bhai please derivative of x^2 batao', 'roman-hindi-or-urdu'],
  ['solve करो 2x + 4 = 10 please', 'mixed-devanagari-latin'],
  ['حل کریں 2x + 4 = 10', 'urdu'],
  ['日本語で x^2 の微分を説明してください', 'japanese'],
  ['Реши 2x + 4 = 10', 'russian'],
  ['solve 2x + 4 = 10 por favor', 'mixed-latin'],
  ['¿Puedes explicar la derivada de x²?', 'spanish'],
  ['2x + 4 = 10', 'language-neutral-math'],
];

for (const [input] of cases) {
  const result = analyzeTutorInput(input);
  assert.ok(result.normalizedText.length > 0, input);
  assert.ok(result.scripts.length >= 1, input);
}

assert.equal(analyzeTutorInput('hello', 'ur').requestedLanguage, 'ur');
console.log('Multilingual adversarial input tests passed');
