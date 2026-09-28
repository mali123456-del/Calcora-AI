import assert from 'node:assert/strict';
import { loadAgentData, saveAgentData, resetAgentData, type AgentData } from '../src/services/agentDataLayer';

const memory: Record<string,string> = {};
(globalThis as any).window = { localStorage: {
  getItem: (k: string) => memory[k] ?? null,
  setItem: (k: string, v: string) => { memory[k] = v; },
  removeItem: (k: string) => { delete memory[k]; },
}};

const data: AgentData = {
  preferences: { language: 'ur', learningLevel: 'beginner', explanationDepth: 'detailed', pace: 'slow', angleMode: 'DEG' },
  mastery: { Algebra: 75 },
  mistakes: [{ problem: 'x+1', timestamp: 1 }],
  savedProblems: [{ id: 'p1', problem: '2+2', topic: 'Arithmetic', createdAt: 1 }],
};

saveAgentData(data);
assert.deepEqual(loadAgentData(), data);
assert.equal(memory.calcora_agent_data_v1.includes('AIza'), false);
resetAgentData();
assert.deepEqual(loadAgentData().mastery, {});
assert.deepEqual(loadAgentData().savedProblems, []);

console.log('Agent data layer tests passed');
