import assert from 'node:assert/strict';
import { analyzeTutorInput } from '../src/services/multilingualTutorInput';
import { buildMultilingualResponseQualityInstruction } from '../src/services/multilingualResponseQuality';

const analysis = analyzeTutorInput('yar 2x+3=7 ko solve karo please', 'ur');
const instruction = buildMultilingualResponseQualityInstruction(analysis, 'ur');

assert.match(instruction, /Target response language code: ur/);
assert.match(instruction, /Romanized or mixed-script/);
assert.match(instruction, /Preserve conversational state/);
assert.match(instruction, /Do not invent dialect-specific grammar/);

console.log('Multilingual response quality tests passed');
