import { useEffect, useState } from 'react';

// Right-column panel for the selected measurement.
//
// Usage:
// <GuidancePanel
//   record={recordForSelectedMeasurement}   // one object from TEMPLATE.json
//   status="red"                            // 'green' | 'yellow' | 'red' (or NOMINAL / WARNING / CRITICAL)
//   value={5.9}                             // number, or { sbp, dbp }, or { median_ms, lapses }
//   onProgress={({ id, completed, total }) => ...}   // for Person 1's completion ring
//   onOpenInstructions={() => setDrawerOpen(true)}   // optional
// />

const STATUS = {
  green:  { label: 'NOMINAL',  icon: '●', color: '#00ff9d', text: 'within your normal range' },
  yellow: { label: 'WARNING',  icon: '▲', color: '#ffc800', text: 'outside your usual range (caution)' },
  red:    { label: 'CRITICAL', icon: '✖', color: '#ff5c5c', text: 'in the danger range' },
};
const ALIAS = { NOMINAL: 'green', WARNING: 'yellow', CRITICAL: 'red', GREEN: 'green', YELLOW: 'yellow', RED: 'red' };

const norm = (s) => (STATUS[s] ? s : ALIAS[String(s).toUpperCase()] || 'green');

export function formatValue(v, unit) {
  if (v == null) return 'no value yet';
  if (typeof v === 'object') {
    if ('sbp' in v) return `${v.sbp}/${v.dbp} ${unit}`;
    if ('median_ms' in v) return `${v.median_ms} ms, ${v.lapses} ${v.lapses === 1 ? 'lapse' : 'lapses'}`;
    return JSON.stringify(v);
  }
  return `${v} ${unit}`;
}

// One plain-English sentence built from the content record.
export function meaningSentence(record, status, value) {
  const s = STATUS[status];
  const shown = formatValue(value, record.unit);
  const base = `Your ${record.name.toLowerCase()} is ${shown}, which is ${s.text}.`;
  if (status === 'green') return `${base} Your usual range is ${record.baseline?.text || record.earth_range?.text}.`;
  const limit = status === 'yellow' ? record.yellow?.text : record.red?.text;
  return limit ? `${base} Alert level: ${limit}.` : base;
}

// Pick the action list that matches the status (glucose has separate high and low red lists).
export function actionsFor(record, status, value) {
  const a = record.actions || {};
  if (status === 'green') return [];
  if (status === 'yellow') return a.yellow || [];
  if (a.red) return a.red;
  if (a.red_high || a.red_low) {
    const v = typeof value === 'number' ? value : null;
    if (v != null && record.red?.gte != null && v >= record.red.gte) return a.red_high || [];
    if (v != null && record.red?.lt != null && v < record.red.lt) return a.red_low || [];
    return [...(a.red_high || []), ...(a.red_low || [])];
  }
  return [];
}

export default function GuidancePanel({ record, status = 'green', value, onProgress, onOpenInstructions }) {
  const st = norm(status);
  const [done, setDone] = useState({}); // key: `${id}|${st}|${index}` -> true

  const actions = record ? actionsFor(record, st, value) : [];
  const keyOf = (i) => `${record.id}|${st}|${i}`;
  const completed = actions.filter((_, i) => done[keyOf(i)]).length;

  useEffect(() => {
    if (record) onProgress?.({ id: record.id, completed, total: actions.length });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record?.id, st, completed, actions.length]);

  if (!record) {
    return (
      <section className="hud-panel" style={{ padding: 16 }}>
        <div className="hud-label">Guidance</div>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: 'rgba(200,228,255,0.6)' }}>
          Select a body node or a measurement to see what it means and what to do.
        </p>
      </section>
    );
  }

  const s = STATUS[st];

  return (
    <section className="hud-panel" style={{ padding: 16 }} aria-labelledby="guidance-title">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div>
          <div className="hud-label">Guidance</div>
          <h3 id="guidance-title" style={{ margin: '2px 0 0', fontFamily: "'Orbitron', sans-serif", fontSize: 12, color: '#c8e4ff' }}>
            {record.name}
          </h3>
        </div>
        <span style={{ color: s.color, border: `1px solid ${s.color}`, padding: '3px 8px', fontFamily: "'Orbitron', sans-serif", fontSize: 9, letterSpacing: '0.12em' }}>
          <span aria-hidden="true">{s.icon} </span>{s.label}
        </span>
      </div>

      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, lineHeight: 1.5, color: '#c8e4ff', margin: '0 0 12px' }}>
        {meaningSentence(record, st, value)}
      </p>

      {actions.length === 0 ? (
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: 'rgba(200,228,255,0.6)', margin: 0 }}>
          No action needed. Keep up the routine checks.
        </p>
      ) : (
        <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
          <legend className="hud-label" style={{ padding: 0, marginBottom: 6 }}>
            What to do ({completed}/{actions.length} done)
          </legend>
          {actions.map((text, i) => {
            const k = keyOf(i);
            return (
              <label key={k} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 6, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={!!done[k]}
                  onChange={() => setDone((d) => ({ ...d, [k]: !d[k] }))}
                  style={{ accentColor: '#00b4ff', marginTop: 2 }}
                />
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: done[k] ? 'rgba(200,228,255,0.45)' : '#c8e4ff', textDecoration: done[k] ? 'line-through' : 'none' }}>
                  {text}
                </span>
              </label>
            );
          })}
        </fieldset>
      )}

      {onOpenInstructions && (
        <button
          type="button"
          onClick={onOpenInstructions}
          style={{ marginTop: 10, padding: '6px 12px', background: 'none', border: '1px solid rgba(0,180,255,0.3)', color: '#00b4ff', cursor: 'pointer', fontFamily: "'Orbitron', sans-serif", fontSize: 9, letterSpacing: '0.12em' }}
        >
          HOW TO MEASURE
        </button>
      )}
    </section>
  );
}
