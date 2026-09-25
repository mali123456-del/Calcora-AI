import assert from 'node:assert/strict';
import { AI_INTELLIGENCE_SOURCES } from '../src/services/aiIntelligence';

assert.ok(AI_INTELLIGENCE_SOURCES.length >= 15, 'intelligence registry should cover major public AI ecosystems');
assert.ok(AI_INTELLIGENCE_SOURCES.every(s => new URL(s.url).protocol === 'https:'), 'all sources must use HTTPS');
const allowedHosts = new Set([
  'huggingface.co','ollama.com','api.github.com','platform.openai.com','docs.anthropic.com',
  'ai.google.dev','docs.mistral.ai','console.groq.com','docs.cohere.com','docs.langchain.com',
  'docs.llamaindex.ai','modelcontextprotocol.io',
]);
assert.ok(AI_INTELLIGENCE_SOURCES.every(s => allowedHosts.has(new URL(s.url).hostname)), 'all sources must use the explicit allowlist');
assert.ok(AI_INTELLIGENCE_SOURCES.some(s => s.kind === 'model-catalog'));
assert.ok(AI_INTELLIGENCE_SOURCES.some(s => s.kind === 'dataset-catalog'));
assert.ok(AI_INTELLIGENCE_SOURCES.some(s => s.kind === 'release-feed'));
assert.ok(AI_INTELLIGENCE_SOURCES.some(s => s.kind === 'official-docs'));
console.log('AI intelligence source tests: 7/7 passed');
