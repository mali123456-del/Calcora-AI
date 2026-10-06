import assert from 'node:assert/strict';
import { AI_INTELLIGENCE_SOURCES, isAIIntelligenceSyncEnabled, startAIIntelligenceScheduler } from '../src/services/aiIntelligence';

assert.ok(AI_INTELLIGENCE_SOURCES.length >= 15, 'intelligence registry should cover major public AI ecosystems');
assert.ok(AI_INTELLIGENCE_SOURCES.every((source) => new URL(source.url).protocol === 'https:'), 'all sources must use HTTPS');
const allowedHosts = new Set([
  'huggingface.co', 'ollama.com', 'api.github.com', 'platform.openai.com', 'docs.anthropic.com',
  'ai.google.dev', 'docs.mistral.ai', 'console.groq.com', 'docs.cohere.com', 'docs.langchain.com',
  'docs.llamaindex.ai', 'modelcontextprotocol.org', 'modelcontextprotocol.io',
]);
assert.ok(AI_INTELLIGENCE_SOURCES.every((source) => allowedHosts.has(new URL(source.url).hostname)), 'all sources must use the explicit allowlist');
assert.ok(AI_INTELLIGENCE_SOURCES.some((source) => source.kind === 'model-catalog'));
assert.ok(AI_INTELLIGENCE_SOURCES.some((source) => source.kind === 'dataset-catalog'));
assert.ok(AI_INTELLIGENCE_SOURCES.some((source) => source.kind === 'release-feed'));
assert.ok(AI_INTELLIGENCE_SOURCES.some((source) => source.kind === 'official-docs'));
assert.equal(isAIIntelligenceSyncEnabled({ CALCORA_ENABLE_INTELLIGENCE_SYNC: 'false' }), false);
assert.equal(isAIIntelligenceSyncEnabled({ CALCORA_ENABLE_INTELLIGENCE_SYNC: 'true' }), true);
assert.equal(startAIIntelligenceScheduler(false), false, 'background cloud sync stays disabled unless explicitly opted in');
console.log('AI intelligence source tests: 10/10 passed');
