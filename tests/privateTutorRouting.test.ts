import assert from 'node:assert/strict';
import { askAIMathAssistant, isLocalCalcoraOrigin } from '../src/ai/client';
import { clearActiveDocument, setActiveDocument } from '../src/services/activeDocument';

async function main() {
  assert.equal(isLocalCalcoraOrigin('localhost'), true);
  assert.equal(isLocalCalcoraOrigin('127.0.0.1'), true);
  assert.equal(isLocalCalcoraOrigin('127.10.20.30'), true);
  assert.equal(isLocalCalcoraOrigin('::1'), true);
  assert.equal(isLocalCalcoraOrigin('calcora.example.com'), false);

  const requests: Array<{ url: string; body: Record<string, unknown> }> = [];
  const originalFetch = globalThis.fetch;
  setActiveDocument({
    fileName: 'private-worksheet.pdf',
    selectedPages: [1],
    totalPages: 1,
    totalChars: 55,
    needsOcr: false,
    pages: [{ pageNumber: 1, text: 'The private worksheet states that 7 times 8 equals 56.', charCount: 55 }],
  });
  globalThis.fetch = async (input, init) => {
    requests.push({ url: String(input), body: JSON.parse(String(init?.body)) as Record<string, unknown> });
    return new Response(JSON.stringify({ answer: 'local response', steps: [], isOfflineFallback: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  try {
    await askAIMathAssistant('According to my worksheet, what does 7 times 8 equal?', [], undefined, undefined, 'teach', {
      privacyMode: 'offline',
      tutorMode: 'tutor',
    });
  } finally {
    globalThis.fetch = originalFetch;
    clearActiveDocument();
  }

  assert.equal(requests.length, 1, 'offline Tutor should use only the local Calcora API');
  assert.equal(requests[0].url, '/api/ai/math', 'offline Tutor must not call a cloud provider');
  assert.equal(requests[0].body.offlineOnly, true, 'server must be explicitly asked to stay local');
  const document = requests[0].body.document as { fileName: string; pages: Array<{ pageNumber: number; text: string }> };
  assert.equal(document.fileName, 'private-worksheet.pdf');
  assert.match(document.pages[0].text, /7 times 8 equals 56/, 'actual extracted text must reach the local Tutor backend');
  assert.equal(requests[0].body.localModelId, undefined, 'a document remains on the deterministic document-grounded path');

  clearActiveDocument();
  globalThis.fetch = async (input, init) => {
    requests.push({ url: String(input), body: JSON.parse(String(init?.body)) as Record<string, unknown> });
    return new Response(JSON.stringify({ answer: 'local response', steps: [], isOfflineFallback: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };
  try {
    await askAIMathAssistant('Explain 2 + 3', [], undefined, undefined, 'teach', {
      privacyMode: 'offline',
      tutorMode: 'tutor',
      localModelId: 'gguf-0123456789abcdef',
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
  assert.equal(requests.length, 2);
  assert.equal(requests[1].url, '/api/ai/math');
  assert.equal(requests[1].body.offlineOnly, true);
  assert.equal(requests[1].body.localModelId, 'gguf-0123456789abcdef', 'offline Tutor forwards only the opaque model ID');
  assert.equal(JSON.stringify(requests[1].body).includes('C:\\\\'), false, 'no local filesystem path is sent by the browser');

  globalThis.fetch = async (input, init) => {
    requests.push({ url: String(input), body: JSON.parse(String(init?.body)) as Record<string, unknown> });
    return new Response(JSON.stringify({ answer: 'local response', steps: [], isOfflineFallback: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };
  const originalWindow = globalThis.window;
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { location: { hostname: 'calcora.example.com' } },
  });
  setActiveDocument({
    fileName: 'hosted-private.pdf',
    selectedPages: [],
    totalPages: 1,
    totalChars: 20,
    needsOcr: false,
    pages: [{ pageNumber: 1, text: 'private text', charCount: 12 }],
  });
  try {
    const blocked = await askAIMathAssistant('Summarize my PDF', [], undefined, undefined, 'teach', {
      privacyMode: 'offline',
      tutorMode: 'tutor',
    });
    assert.equal(requests.length, 2, 'hosted-origin local-only request must not POST private document text');
    assert.equal(blocked.blockedCloudFallback, true);
    assert.match(blocked.verificationNote ?? '', /no prompt or document text was sent/i);
  } finally {
    clearActiveDocument();
    if (originalWindow === undefined) delete (globalThis as typeof globalThis & { window?: Window }).window;
    else Object.defineProperty(globalThis, 'window', { configurable: true, value: originalWindow });
  }

  console.log('Private Tutor routing tests passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
