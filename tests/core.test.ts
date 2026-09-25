import assert from 'node:assert/strict';
import { getOfflinePolicy } from '../src/ai/offlinePolicy';
import { recommendedDifficulty, recordPractice } from '../src/learning/masteryStore';

const privatePolicy=getOfflinePolicy('private');
assert.equal(privatePolicy.allowCloudAI,false);
assert.equal(privatePolicy.failClosed,true);
const offlinePolicy=getOfflinePolicy('offline');
assert.equal(offlinePolicy.allowCloudAI,false);
assert.equal(offlinePolicy.allowLocalAI,true);

const topic='__test_adaptive__';
const first=recordPractice(topic,true,0);
assert.ok(first.mastery>0.5);
assert.equal(recommendedDifficulty(topic),'intermediate');

console.log('Calcora core tests passed');
