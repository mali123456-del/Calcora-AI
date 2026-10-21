/**
 * Workspace-scoped tutor storage regression tests.
 *
 * Previously the tutor conversation lived in a single origin-wide key
 * (`calcora_tutor_conversation_state_v2`), so transcripts and learning state were
 * shared across every workspace on the machine. The v3 store keeps one bucket per
 * workspace, migrates the legacy value instead of dropping it, and stays bounded.
 */
import { strict as assert } from 'node:assert';

// ---------------------------------------------------------------------------
// Node localStorage polyfill (installed before any service calls run)
// ---------------------------------------------------------------------------
class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  get length(): number { return this.data.size; }
  clear(): void { this.data.clear(); }
  getItem(key: string): string | null { return this.data.has(key) ? this.data.get(key)! : null; }
  key(index: number): string | null { return [...this.data.keys()][index] ?? null; }
  removeItem(key: string): void { this.data.delete(key); }
  setItem(key: string, value: string): void { this.data.set(key, String(value)); }
}
const backing = new MemoryStorage();
(globalThis as Record<string, unknown>).localStorage = backing;
(globalThis as Record<string, unknown>).window = { localStorage: backing };

const {
  loadTutorConversationState,
  appendTutorMessage,
  createTutorConversationState,
} = await import('../src/services/tutorConversationService');
const { setActiveWorkspaceId } = await import('../src/engine/workspaceEngine');
const {
  loadCalcoraDataSnapshot,
  saveCalcoraDataSnapshot,
  deleteCalcoraData,
  validateAndImportCalcoraData,
} = await import('../src/services/dataTransferService');

const V3_KEY = 'calcora_tutor_conversation_state_v3';
const V2_KEY = 'calcora_tutor_conversation_state_v2';

// 1. Two workspaces must keep separate conversations.
setActiveWorkspaceId('workspace-a');
let convA = appendTutorMessage(loadTutorConversationState(), { role: 'user', content: 'Physics question about momentum' });
setActiveWorkspaceId('workspace-b');
let convB = appendTutorMessage(loadTutorConversationState(), { role: 'user', content: 'Chemistry question about moles' });

setActiveWorkspaceId('workspace-a');
convA = loadTutorConversationState();
assert.equal(convA.messages.some((m) => m.content === 'Physics question about momentum'), true, 'workspace-a must retain its message');
assert.equal(convA.messages.some((m) => m.content === 'Chemistry question about moles'), false, 'workspace-a must not see workspace-b content');

setActiveWorkspaceId('workspace-b');
convB = loadTutorConversationState();
assert.equal(convB.messages.some((m) => m.content === 'Chemistry question about moles'), true, 'workspace-b must retain its message');
assert.equal(convB.messages.some((m) => m.content === 'Physics question about momentum'), false, 'workspace-b must not see workspace-a content');

// 2. Legacy v2 conversation migrates into the active workspace and is removed.
const legacy = createTutorConversationState('legacy-session');
legacy.messages.push({ id: 'legacy-msg', role: 'user', content: 'Legacy quadratic revision session', timestamp: Date.now() });
backing.setItem(V2_KEY, JSON.stringify(legacy));
backing.removeItem(V3_KEY);
setActiveWorkspaceId('default-workspace');
const migrated = loadTutorConversationState();
assert.equal(migrated.messages.some((m) => m.content === 'Legacy quadratic revision session'), true, 'legacy v2 content must migrate');
assert.equal(backing.getItem(V2_KEY), null, 'legacy key must be removed after migration');

// 3. A corrupt v3 payload degrades to a fresh state instead of throwing.
backing.setItem(V3_KEY, '{not json');
const afterCorrupt = loadTutorConversationState();
assert.ok(afterCorrupt.id.startsWith('tutor-'), 'corrupt store must yield a fresh state');
assert.ok(afterCorrupt.messages.length >= 1, 'fresh state has the welcome message');

// 4. Data export reads the active workspace's conversation and hides nothing.
backing.removeItem(V3_KEY);
setActiveWorkspaceId('export-ws');
appendTutorMessage(loadTutorConversationState(), { role: 'user', content: 'Export me precisely' });
const snapshot = loadCalcoraDataSnapshot();
const exportedConversation = snapshot.tutorConversation as { messages: Array<{ content: string }> } | null;
assert.ok(exportedConversation, 'snapshot must include the active conversation');
assert.equal(exportedConversation.messages.some((m) => m.content === 'Export me precisely'), true, 'export must contain active workspace messages');

// 5. Import round-trip: snapshot saves into the v3 bucket for that workspace only.
const importPayload = validateAndImportCalcoraData(
  JSON.stringify({
    version: 1,
    exportedAt: Date.now(),
    calculationHistory: [],
    workspaces: [],
    activeWorkspaceId: 'restored-ws',
    tutorConversation: exportedConversation,
    tutorSettings: null,
    tutorStats: null,
    tutorMistakes: [],
    agentData: { preferences: { language: 'en', learningLevel: 'intermediate', explanationDepth: 'balanced', pace: 'normal', angleMode: 'DEG' }, mastery: {}, mistakes: [], savedProblems: [] },
  }),
);
saveCalcoraDataSnapshot({ ...importPayload, agentData: importPayload.agentData });
setActiveWorkspaceId('restored-ws');
const restored = loadTutorConversationState();
assert.equal(restored.messages.some((m) => m.content === 'Export me precisely'), true, 'restore must place the conversation in its workspace');
setActiveWorkspaceId('export-ws');
const untouched = loadTutorConversationState();
assert.equal(untouched.messages.some((m) => m.content === 'Export me precisely'), true, 'import must not clobber other buckets');

// 6. Deleting tutor data clears every workspace's conversation (privacy control).
deleteCalcoraData('tutor');
setActiveWorkspaceId('restored-ws');
const cleared = loadTutorConversationState();
assert.equal(cleared.messages.some((m) => m.content === 'Export me precisely'), false, 'delete-all-tutor must clear restored-ws');
setActiveWorkspaceId('export-ws');
assert.equal(loadTutorConversationState().messages.some((m) => m.content === 'Export me precisely'), false, 'delete-all-tutor must clear export-ws');

// 7. Buckets stay bounded: many workspaces cannot grow storage without limit.
setActiveWorkspaceId('flood-root');
appendTutorMessage(loadTutorConversationState(), { role: 'user', content: 'flood' });
let lastLoaded = createTutorConversationState();
for (let i = 0; i < 30; i++) {
  setActiveWorkspaceId(`flood-${i}`);
  lastLoaded = appendTutorMessage(lastLoaded, { role: 'user', content: `flood ${i}`, id: `flood-${i}` });
}
const storeRaw = JSON.parse(backing.getItem(V3_KEY)!) as { conversations: Record<string, unknown> };
assert.equal(Object.keys(storeRaw.conversations).length <= 25, true, 'conversation buckets must be bounded');

console.log('Workspace-scoped tutor storage tests passed');
