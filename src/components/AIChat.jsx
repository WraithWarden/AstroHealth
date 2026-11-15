import { useState } from 'react';

const buttonStyle = {
  borderRadius: 6,
  padding: '7px 10px',
  background: 'rgba(56, 189, 248, 0.1)',
  border: '1px solid rgba(56, 189, 248, 0.3)',
  color: '#7dd3fc',
  cursor: 'pointer',
  fontFamily: "'Inter', sans-serif",
  fontSize: 10.5,
  fontWeight: 600,
};

export default function AIChat({ record, records, onClose, onOpenProtocol }) {
  const [question, setQuestion] = useState('');
  const [turns, setTurns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    const text = question.trim();
    if (!text || loading) return;

    setError('');
    setLoading(true);
    try {
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: text,
          recordId: record?.id ?? null,
          history: turns.slice(-4).flatMap((turn) => [
            { role: 'user', text: turn.question },
            { role: 'assistant', text: turn.answer },
          ]),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || `The request failed (HTTP ${response.status}).`);
      if (typeof result.answer !== 'string' || !result.answer.trim()) {
        throw new Error('The AI service returned an empty answer. Please try again.');
      }

      setTurns((current) => [...current, {
        question: text,
        answer: result.answer,
        sources: Array.isArray(result.sources) ? result.sources : [],
      }]);
      setQuestion('');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'The AI request failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section
      aria-labelledby="astro-ai-title"
      style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, padding: '12px 14px' }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div>
          <div className="hud-label">AstroHealth AI</div>
          <h3 id="astro-ai-title" style={{ margin: '3px 0 0', color: '#f1f5f9', fontSize: 13.5, fontWeight: 600 }}>
            Ask about spaceflight health protocols
          </h3>
        </div>
        <button type="button" onClick={onClose} style={{ ...buttonStyle, flexShrink: 0 }}>
          Back to guidance
        </button>
      </div>

      <p style={{ margin: '7px 0 9px', padding: '7px 8px', borderRadius: 6, background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.22)', color: '#fcd34d', fontSize: 9.5, lineHeight: 1.4 }}>
        Your question, recent chat turns, and matching protocol text are sent to Google Gemini. Do not enter real names or personal/crew health information. Dashboard readings are not sent automatically.
      </p>

      <div aria-live="polite" style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 9, padding: '2px 2px 8px' }}>
        {turns.length === 0 ? (
          <p style={{ color: '#94a3b8', fontSize: 11, lineHeight: 1.5 }}>
            Ask about a measurement, how to perform it, its thresholds, or why it matters. Answers use the bundled protocol records and include source tags.
          </p>
        ) : turns.map((turn, index) => (
          <article key={`${index}-${turn.question}`} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div style={{ alignSelf: 'flex-end', maxWidth: '92%', borderRadius: '8px 8px 2px 8px', background: 'rgba(56, 189, 248, 0.12)', border: '1px solid rgba(56, 189, 248, 0.24)', padding: '7px 9px', color: '#e0f2fe', fontSize: 10.5, lineHeight: 1.45 }}>
              {turn.question}
            </div>
            <div style={{ borderRadius: '8px 8px 8px 2px', background: 'rgba(15, 23, 42, 0.72)', border: '1px solid rgba(148, 163, 184, 0.16)', padding: '8px 9px', color: '#e2e8f0', fontSize: 10.5, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
              {turn.answer}
              {turn.sources.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 7, paddingTop: 6, borderTop: '1px solid rgba(148, 163, 184, 0.14)' }}>
                  {turn.sources.map((source) => {
                    const sourceRecord = records.find((item) => item.id === source.id);
                    return (
                      <button
                        key={source.id}
                        type="button"
                        disabled={!sourceRecord}
                        onClick={() => sourceRecord && onOpenProtocol?.(sourceRecord)}
                        style={{
                          ...buttonStyle,
                          padding: '4px 6px',
                          fontSize: 9,
                          opacity: sourceRecord ? 1 : 0.55,
                        }}
                      >
                        {source.id} · {source.sourceTags?.join(', ') || 'source'}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </article>
        ))}
        {loading && <div role="status" style={{ color: '#7dd3fc', fontSize: 10.5 }}>Checking the protocol and asking Gemini…</div>}
        {error && <div role="alert" style={{ color: '#fda4af', fontSize: 10.5, lineHeight: 1.45 }}>{error}</div>}
      </div>

      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 8, borderTop: '1px solid rgba(148, 163, 184, 0.12)' }}>
        <textarea
          aria-label="Ask Gemini a protocol question"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          maxLength={600}
          rows={2}
          placeholder="e.g. Why is ONSD monitored in microgravity?"
          style={{ resize: 'vertical', minHeight: 48, maxHeight: 88, borderRadius: 6, border: '1px solid rgba(148, 163, 184, 0.24)', background: 'rgba(8, 15, 27, 0.8)', color: '#e2e8f0', padding: '7px 9px', fontFamily: "'Inter', sans-serif", fontSize: 10.5 }}
        />
        <button type="submit" disabled={!question.trim() || loading} style={{ ...buttonStyle, width: '100%', opacity: question.trim() && !loading ? 1 : 0.55 }}>
          {loading ? 'Asking Gemini…' : 'Ask AstroHealth AI'}
        </button>
      </form>

      <p style={{ margin: '7px 0 0', color: '#64748b', fontSize: 9, lineHeight: 1.35 }}>
        Educational demo only—not a diagnosis or substitute for the Crew Medical Officer.
      </p>
    </section>
  );
}
