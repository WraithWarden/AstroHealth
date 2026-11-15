import { describe, expect, it, vi } from 'vitest';
import { handleAskRequest } from './aiHandler.js';

function makeRequest(body, method = 'POST') {
  return new Request('http://localhost/api/ask', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: method === 'POST' ? JSON.stringify(body) : undefined,
  });
}

describe('Gemini protocol assistant endpoint', () => {
  it('rejects invalid requests and unsupported methods', async () => {
    const getResponse = await handleAskRequest(makeRequest({}, 'GET'), { apiKey: 'test-key' });
    expect(getResponse.status).toBe(405);

    const invalidResponse = await handleAskRequest(makeRequest({ question: ' ', recordId: '1B-i' }), { apiKey: 'test-key' });
    expect(invalidResponse.status).toBe(400);

    const invalidRecord = await handleAskRequest(makeRequest({ question: 'Explain this', recordId: 'not-a-record' }), { apiKey: 'test-key' });
    expect(invalidRecord.status).toBe(400);
  });

  it('requires a server-side Gemini key', async () => {
    const response = await handleAskRequest(makeRequest({ question: 'How is ONSD measured?', recordId: '1B-i' }), {
      apiKey: '',
    });

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ error: expect.stringContaining('GEMINI_API_KEY') });
  });

  it('sends the question and retrieved protocol only, then returns answer citations', async () => {
    const fetchImpl = vi.fn(async (_url, options) => {
      const requestBody = JSON.parse(options.body);
      const prompt = requestBody.contents[0].parts[0].text;
      expect(prompt).toContain('Close the eye');
      expect(prompt).not.toContain('private reading');
      expect(requestBody.systemInstruction.parts[0].text).toContain('Do not invent thresholds');
      return new Response(JSON.stringify({
        candidates: [{ content: { parts: [{ text: 'Measure 3 mm behind the eye. [1B-i; L, H]' }] } }],
      }), { status: 200 });
    });

    const response = await handleAskRequest(
      makeRequest({
        question: 'How do I measure ONSD?',
        recordId: '1B-i',
        readings: { secret: 'private reading' },
        profile: { name: 'Private name' },
      }),
      { apiKey: 'test-key', fetchImpl },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      answer: expect.stringContaining('3 mm'),
      sources: [{ id: '1B-i', sourceTags: ['L', 'H'] }],
    });
    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(fetchImpl.mock.calls[0][1].headers['x-goog-api-key']).toBe('test-key');
  });

  it('surfaces provider quota exhaustion without returning a success-shaped response', async () => {
    const response = await handleAskRequest(
      makeRequest({ question: 'Why monitor sleep?' }),
      { apiKey: 'test-key', fetchImpl: async () => new Response('', { status: 429 }) },
    );

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toMatchObject({ error: expect.stringContaining('quota or rate limit') });
  });
});
