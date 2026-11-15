import { useEffect, useState } from 'react';

const STATUS = {
  green:  { label: 'NOMINAL',  icon: '◆', color: '#34d399', bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.35)', text: 'within your normal range' },
  yellow: { label: 'WARNING',  icon: '▲', color: '#fbbf24', bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.38)', text: 'outside your usual range (caution)' },
  red:    { label: 'CRITICAL', icon: '■', color: '#fb7185', bg: 'rgba(244, 63, 94, 0.14)',  border: 'rgba(244, 63, 94, 0.42)',  text: 'in the danger range' },
};
const ALIAS = { NOMINAL: 'green', WARNING: 'yellow', CRITICAL: 'red', GREEN: 'green', YELLOW: 'yellow', RED: 'red' };

const norm = (s) => (STATUS[s] ? s : ALIAS[String(s).toUpperCase()] || 'green');
const toArr = (x) => (Array.isArray(x) ? x : typeof x === 'string' && x.trim() ? [x] : []);

export function formatValue(v, unit) {
  if (v == null) return 'no value yet';
  if (typeof v === 'object') {
    if ('sbp' in v) return `${v.sbp}/${v.dbp} ${unit}`;
    if ('median_ms' in v) return `${v.median_ms} ms, ${v.lapses} ${v.lapses === 1 ? 'lapse' : 'lapses'}`;
    return JSON.stringify(v);
  }
  return `${v} ${unit}`;
}

export function meaningSentence(record, status, value) {
  const s = STATUS[status] || STATUS.green;
  const shown = formatValue(value, record.unit);
  const base = `Your ${record.name.toLowerCase()} is ${shown}, which is ${s.text}.`;
  if (status === 'green') {
    const refText = record.baseline?.text || record.earth_range?.text;
    return refText ? `${base} Your usual range is ${refText}.` : base;
  }
  const limit = status === 'yellow' ? record.yellow?.text : record.red?.text;
  return limit ? `${base} Alert level: ${limit}.` : base;
}

export function actionsFor(record, status, value) {
  if (!record) return [];
  const a = record.actions || {};
  if (status === 'green') return [];
  if (status === 'yellow') return toArr(a.yellow);
  if (a.red) return toArr(a.red);
  if (a.red_high || a.red_low) {
    const v = typeof value === 'number' ? value : null;
    if (v != null && record.red?.gte != null && v >= record.red.gte) return toArr(a.red_high);
    if (v != null && record.red?.lt != null && v < record.red.lt) return toArr(a.red_low);
    return [...toArr(a.red_high), ...toArr(a.red_low)];
  }
  return [];
}

export default function GuidancePanel({ record, status = 'green', value, onProgress, onOpenInstructions }) {
  const st = norm(status);
  const [done, setDone] = useState({});

  const actions = record ? actionsFor(record, st, value) : [];
  const keyOf = (i) => `${record.id}|${st}|${i}`;
  const completed = actions.filter((_, i) => done[keyOf(i)]).length;

  useEffect(() => {
    if (record) onProgress?.({ id: record.id, completed, total: actions.length });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record?.id, st, completed, actions.length]);

  if (!record) {
    return (
      <section style={{ padding: 16 }}>
        <div className="hud-label">Clinical Guidance</div>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12.5, color: '#94a3b8', marginTop: 8 }}>
          Select a body node or measurement to view clinical interpretation and countermeasures.
        </p>
      </section>
    );
  }

  const s = STATUS[st];

  return (
    <section style={{ padding: 16 }} aria-labelledby="guidance-title">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
        <div>
          <div className="hud-label">Clinical Guidance</div>
          <h3 id="guidance-title" style={{ margin: '4px 0 0', fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 600, color: '#f1f5f9' }}>
            {record.name}
          </h3>
        </div>
        <span style={{
          color: s.color,
          background: s.bg,
          border: `1px solid ${s.border}`,
          borderRadius: 6,
          padding: '4px 9px',
          fontFamily: "'Inter', sans-serif",
          fontSize: 10.5,
          fontWeight: 700,
          letterSpacing: '0.06em',
          whiteSpace: 'nowrap',
        }}>
          <span aria-hidden="true">{s.icon} </span>{s.label}
        </span>
      </div>

      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12.5, lineHeight: 1.55, color: '#cbd5e1', margin: '0 0 14px' }}>
        {meaningSentence(record, st, value)}
      </p>

      {actions.length === 0 ? (
        <div style={{
          padding: '10px 12px',
          borderRadius: 8,
          background: 'rgba(16, 185, 129, 0.06)',
          border: '1px solid rgba(16, 185, 129, 0.2)',
          fontFamily: "'Inter', sans-serif",
          fontSize: 12,
          color: '#a7f3d0',
        }}>
          ◆ No acute countermeasure needed. Continue scheduled mission checks.
        </div>
      ) : (
        <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
          <legend className="hud-label" style={{ padding: 0, marginBottom: 8 }}>
            Countermeasure Checklist ({completed}/{actions.length} done)
          </legend>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {actions.map((text, i) => {
              const k = keyOf(i);
              const isChecked = !!done[k];
              return (
                <label
                  key={k}
                  style={{
                    display: 'flex',
                    gap: 10,
                    alignItems: 'flex-start',
                    padding: '8px 10px',
                    borderRadius: 7,
                    background: isChecked ? 'rgba(16, 185, 129, 0.08)' : 'rgba(30, 41, 59, 0.5)',
                    border: `1px solid ${isChecked ? 'rgba(16, 185, 129, 0.28)' : 'rgba(148, 163, 184, 0.14)'}`,
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => setDone((d) => ({ ...d, [k]: !d[k] }))}
                    style={{ accentColor: '#10b981', marginTop: 2, flexShrink: 0 }}
                  />
                  <span style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 12,
                    lineHeight: 1.45,
                    color: isChecked ? '#94a3b8' : '#e2e8f0',
                    textDecoration: isChecked ? 'line-through' : 'none',
                  }}>
                    {text}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      {onOpenInstructions && (
        <button
          type="button"
          onClick={onOpenInstructions}
          style={{
            marginTop: 12,
            width: '100%',
            padding: '8px 12px',
            borderRadius: 7,
            background: 'rgba(56, 189, 248, 0.1)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            color: '#38bdf8',
            cursor: 'pointer',
            fontFamily: "'Inter', sans-serif",
            fontSize: 11.5,
            fontWeight: 600,
            letterSpacing: '0.03em',
          }}
        >
          How to Measure & Protocol Guide →
        </button>
      )}
    </section>
  );
}
