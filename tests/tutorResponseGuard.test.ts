import assert from 'node:assert/strict';
import { guardTutorResponse } from '../src/services/tutorResponseGuard';

const base = {
  deterministic: { result: '42' } as any,
  authoritative: true,
};

assert.equal(guardTutorResponse({ ...base, mode: 'tutor', answer: 'The answer is 42.' }).safe, true);
const guarded = guardTutorResponse({ ...base, mode: 'challenge', answer: 'The answer is 42.' });
assert.equal(guarded.safe, false);
assert.ok(guarded.issues.includes('premature-final-answer'));

const empty = guardTutorResponse({ ...base, mode: 'tutor', answer: '' });
assert.equal(empty.safe, false);

console.log('Tutor response guard tests passed');
