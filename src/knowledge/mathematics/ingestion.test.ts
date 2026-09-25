import assert from 'node:assert/strict';
import { normalizeMathDatasetRecords } from './ingestion';

const rejected = normalizeMathDatasetRecords('openmathinstruct-2', [{
  id: 'rational-equation-001',
  question: '(y² - 3y + 2) / (y - 2) = y + 1',
  answer: '2',
}]);
assert.equal(rejected.records[0]?.status, 'rejected');
assert.match(rejected.records[0]?.verificationNote ?? '', /denominator restriction/i);

const verified = normalizeMathDatasetRecords('openmathinstruct-2', [{
  id: 'simple-equation-001',
  question: '2 + 2',
  answer: '4',
}]);
assert.equal(verified.records[0]?.status, 'verified');

console.log('math ingestion domain-verification tests: PASS');
