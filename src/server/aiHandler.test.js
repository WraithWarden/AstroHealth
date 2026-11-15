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

    const invalidHistory = await handleAskRequest(makeRequest({
      question: 'Why?',
      history: [{ role: 'assistant', text: 'Previous answer' }],
    }), { apiKey: 'test-key' });
    expect(invalidHistory.status).toBe(400);
  });

  it('answers a greeting briefly without attaching the selected protocol as a source', async () => {
    const fetchImpl = vi.fn();
    const response = await handleAskRequest(makeRequest({
      question: 'hi baby',
      recordId: '1B-i',
    }), { apiKey: '', fetchImpl });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      answer: 'Hi! What would you like to know about the AstroHealth protocols?',
      sources: [],
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('does not add the selected protocol to unrelated questions', async () => {
    const fetchImpl = vi.fn(async (_url, options) => {
      const requestBody = JSON.parse(options.body);
      expect(requestBody.contents[0].parts[0].text).toContain('Retrieved protocol records (JSON):\n[]');
      return new Response(JSON.stringify({
        candidates: [{ content: { parts: [{ text: 'That topic is outside the bundled protocols.' }] } }],
      }), { status: 200 });
    });

    const response = await handleAskRequest(makeRequest({
      question: 'What is the capital of France?',
      recordId: '1B-i',
    }), { apiKey: 'test-key', fetchImpl });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      sources: [],
    });
  });

  it('requires a server-side Gemini key', async () => {
    const response = await handleAskRequest(makeRequest({ question: 'How is ONSD measured?', recordId: '1B-i' }), {
      apiKey: '',
    });

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ error: expect.stringContaining('GEMINI_API_KEY') });
  });

  it('sends the question and retrieved protocol only, then returns answer citations', async () => {
    let requestBody;
    const fetchImpl = vi.fn(async (_url, options) => {
      requestBody = JSON.parse(options.body);
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
    const prompt = requestBody.contents[requestBody.contents.length - 1].parts[0].text;
    expect(prompt).toContain('Close the eye');
    expect(prompt).not.toContain('private reading');
    expect(requestBody.systemInstruction.parts[0].text).toContain('do not invent, round, or infer missing details');
    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(fetchImpl.mock.calls[0][1].headers['x-goog-api-key']).toBe('test-key');
  });

  it('uses recent conversation turns to answer a follow-up with matching protocol context', async () => {
    const fetchImpl = vi.fn(async (_url, options) => {
      const requestBody = JSON.parse(options.body);
      expect(requestBody.contents).toHaveLength(3);
      expect(requestBody.contents[0]).toMatchObject({
        role: 'user',
        parts: [{ text: 'How do I measure ONSD?' }],
      });
      expect(requestBody.contents[1]).toMatchObject({
        role: 'assistant',
        parts: [{ text: 'Use the ultrasound protocol.' }],
      });
      expect(requestBody.contents[2].parts[0].text).toContain('"id":"1B-i"');
      return new Response(JSON.stringify({
        candidates: [{ content: { parts: [{ text: 'It is monitored as a protocol indicator. [1B-i; L, H]' }] } }],
      }), { status: 200 });
    });

    const response = await handleAskRequest(makeRequest({
      question: 'Why?',
      history: [
        { role: 'user', text: 'How do I measure ONSD?' },
        { role: 'assistant', text: 'Use the ultrasound protocol.' },
      ],
      recordId: '1B-i',
    }), { apiKey: 'test-key', fetchImpl });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      answer: expect.stringContaining('protocol indicator'),
      sources: [{ id: '1B-i' }],
    });
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
