import assert from 'node:assert/strict';
import {
  containsSecret,
  exportCalcoraData,
  validateAndImportCalcoraData,
  stripSecretsRecursively,
  type CalcoraDataSnapshot,
} from '../src/services/dataTransferService';

const safe = {
  version: 1,
  exportedAt: 0,
  calculationHistory: [{ id: '1', expression: '2+2', result: '4', angleMode: 'DEG', timestamp: 0, verified: true }],
  workspaces: [],
  activeWorkspaceId: 'default-workspace',
  tutorConversation: null,
  tutorSettings: { mode: 'tutor', learningObjective: 'concept', difficulty: 'intermediate', socraticMode: true, examMode: false },
  tutorStats: { sessionsCompleted: 1, totalProblemsAttempted: 2, totalCorrect: 2, hintsUsedCount: 0, lastActiveTimestamp: 0, streakDays: 1 },
  tutorMistakes: [],
  agentData: {
    preferences: { language: 'en', learningLevel: 'intermediate', explanationDepth: 'balanced', pace: 'normal', angleMode: 'DEG' },
    mastery: { Algebra: 50 },
    mistakes: [],
    savedProblems: [{ id: 'p1', problem: '2+2', topic: 'Arithmetic', createdAt: 0 }],
  },
} satisfies CalcoraDataSnapshot;

assert.equal(containsSecret({ nested: { token: 'Bearer abc.def.ghi' } }), true);
assert.equal(containsSecret({ apiKey: 'AIzaSyExample' }), true);
assert.equal(containsSecret({ password: 'secret' }), true);
assert.deepEqual(stripSecretsRecursively({ safe: 1, apiKey: 'sk-test', nested: { password: 'x' } }), { safe: 1, nested: {} });

const exported = exportCalcoraData(safe);
assert.equal(containsSecret(JSON.parse(exported)), false);

const imported = validateAndImportCalcoraData(exported);
assert.equal(imported.version, 1);
assert.equal(imported.calculationHistory[0].result, '4');

assert.throws(() => validateAndImportCalcoraData(JSON.stringify({ version: 1, apiKey: 'AIzaSyExample' })), /secret/i);
assert.throws(() => validateAndImportCalcoraData('{bad json'), /Invalid JSON/i);
assert.throws(() => validateAndImportCalcoraData(JSON.stringify({ version: 99 })), /version/i);

console.log('Data transfer privacy tests passed');
