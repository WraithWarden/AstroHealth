import { useEffect, useId, useState } from 'react';

// Usage (all props optional except onClose):
// <CheckInModal
//   onClose={() => setShowCheckIn(false)}
//   open={true}                               // defaults to true, so { show && <CheckInModal/> } still works
//   defaults={{ sbp: 112, dbp: 71 }}          // override baseline pre-fill
//   auto={{ radiation: 0.48, co2: 2.3 }}      // filled automatically, read-only
//   pvt={{ median_ms: 262, lapses: 0 }}       // from PvtTest, or null
//   onSubmit={(reading, meta) => ...}         // reading keyed by measurement id; meta = { symptoms, redFlag, timestamp }
// />
// If docs/CONTRACT.md uses a different reading shape, only buildReading() needs to change.

const FIELDS = [
  { key: 'sbp',     id: '1A-i',  label: 'BP systolic',        unit: 'mm Hg', min: 60, max: 220, step: 1,    def: 112 },
  { key: 'dbp',     id: '1A-i',  label: 'BP diastolic',       unit: 'mm Hg', min: 30, max: 140, step: 1,    def: 71 },
  { key: 'hr',      id: '1A-ii', label: 'Resting heart rate', unit: 'bpm',   min: 30, max: 200, step: 1,    def: 62 },
  { key: 'spo2',    id: '4A-i',  label: 'SpO₂',               unit: '%',     min: 70, max: 100, step: 1,    def: 98 },
  { key: 'temp',    id: '2B-ii', label: 'Body temperature',   unit: '°C',    min: 34, max: 42,  step: 0.1,  def: 37.1 },
  { key: 'sleep',   id: '3A-i',  label: 'Sleep last night',   unit: 'h',     min: 0,  max: 14,  step: 0.1,  def: 6.4 },
  { key: 'mood',    id: '3B-i',  label: 'Mood / stress',      unit: '1–10',  min: 1,  max: 10,  step: 1,    def: 3 },
  { key: 'glucose', id: '4B-i',  label: 'Fasting glucose',    unit: 'mg/dL', min: 30, max: 400, step: 1,    def: 90 },
  { key: 'onsd',    id: '1B-i',  label: 'ONSD (optional)',    unit: 'mm',    min: 3,  max: 8,   step: 0.05, def: '', optional: true },
];

// Red-flag symptoms from the blueprint. Any ticked box = red-flag check-in.
const SYMPTOMS = [
  { key: 'headache',   label: 'Headache' },
  { key: 'blurred',    label: 'Blurred vision' },
  { key: 'dizziness',  label: 'Dizziness or fainting' },
  { key: 'chest_pain', label: 'Chest pain' },
  { key: 'nausea',     label: 'Nausea' },
  { key: 'confusion',  label: 'Confusion' },
  { key: 'self_harm',  label: 'Low mood or thoughts of self-harm' },
];

const FIELD_STYLE = {
  width: '100%',
  background: '#030e1c',
  border: '1px solid rgba(0,180,255,0.2)',
  color: '#c8e4ff',
  padding: '7px 10px',
  fontFamily: "'Space Mono', monospace",
  fontSize: 12,
  outline: 'none',
  transition: 'border-color 0.2s',
};

const LABEL_STYLE = {
  fontFamily: "'Orbitron', sans-serif",
  fontSize: 9,
  letterSpacing: '0.12em',
  color: 'rgba(0,180,255,0.6)',
  marginBottom: 4,
  display: 'block',
};

const initialValues = (defaults) =>
  Object.fromEntries(FIELDS.map((f) => [f.key, String(defaults?.[f.key] ?? f.def)]));

function validate(field, raw) {
  if (raw === '' || raw == null) return field.optional ? '' : 'Enter a value.';
  const n = Number(raw);
  if (Number.isNaN(n)) return 'Enter a number.';
  if (n < field.min || n > field.max) {
    return `Enter a value between ${field.min} and ${field.max} ${field.unit}.`;
  }
  return '';
}

function buildReading(values, pvt, auto) {
  const n = (k) => Number(values[k]);
  return {
    '1A-i': { sbp: n('sbp'), dbp: n('dbp') },
    '1A-ii': n('hr'),
    '4A-i': n('spo2'),
    '2B-ii': n('temp'),
    '3A-i': n('sleep'),
    '3B-i': n('mood'),
    '4B-i': n('glucose'),
    ...(values.onsd !== '' ? { '1B-i': n('onsd') } : {}),
    ...(pvt ? { '3A-ii': { median_ms: pvt.median_ms, lapses: pvt.lapses } } : {}),
    ...(auto?.radiation != null ? { '2A-i': auto.radiation } : {}),
    ...(auto?.co2 != null ? { '4A-ii': auto.co2 } : {}),
  };
}

function Field({ id, label, unit, error, onBlur, ...props }) {
  const [focused, setFocused] = useState(false);
  const errId = `${id}-err`;
  return (
    <div>
      <label htmlFor={id} style={LABEL_STYLE}>
        {label} {unit && <span style={{ opacity: 0.6 }}>({unit})</span>}
      </label>
      <input
        id={id}
        {...props}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? errId : undefined}
        style={{
          ...FIELD_STYLE,
          borderColor: error ? '#ff5c5c' : focused ? 'rgba(0,180,255,0.5)' : 'rgba(0,180,255,0.2)',
        }}
        onFocus={() => setFocused(true)}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
      />
      {error && (
        <div id={errId} role="alert" style={{ color: '#ff8a8a', fontSize: 10, marginTop: 3, fontFamily: "'Inter', sans-serif" }}>
          {error}
        </div>
      )}
    </div>
  );
}

export default function CheckInModal({ open = true, onClose, onSubmit, defaults, auto, pvt }) {
  const [values, setValues] = useState(() => initialValues(defaults));
  const [errors, setErrors] = useState({});
  const [symptoms, setSymptoms] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const uid = useId();

  // Reset to baseline every time the form opens.
  useEffect(() => {
    if (!open) return;
    setValues(initialValues(defaults));
    setErrors({});
    setSymptoms([]);
    setSubmitted(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Esc closes.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const set = (k, v) => setValues((s) => ({ ...s, [k]: v }));
  const checkOne = (f) => setErrors((e) => ({ ...e, [f.key]: validate(f, values[f.key]) }));
  const toggleSymptom = (k) =>
    setSymptoms((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));

  const redFlag = symptoms.length > 0;

  function handleSubmit(e) {
    e.preventDefault();
    const next = {};
    FIELDS.forEach((f) => {
      const msg = validate(f, values[f.key]);
      if (msg) next[f.key] = msg;
    });
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    const meta = { symptoms, redFlag, timestamp: new Date().toISOString() };
    onSubmit?.(buildReading(values, pvt, auto), meta);
    setSubmitted(true);
  }

  const titleId = `${uid}-title`;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="hud-panel fade-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', padding: 24 }}
      >
        {/* Title bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div
              id={titleId}
              style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', color: '#00b4ff', marginBottom: 2 }}
            >
              + LOG DAILY CHECK-IN
            </div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: 'rgba(0,180,255,0.4)' }}>
              {new Date().toISOString().replace('T', ' ').slice(0, 16)} UTC · fields start at your baseline
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close check-in"
            style={{
              background: 'none', border: '1px solid rgba(0,180,255,0.2)', color: 'rgba(0,180,255,0.6)',
              width: 28, height: 28, cursor: 'pointer', fontSize: 14, fontFamily: "'Space Mono', monospace",
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>

        {submitted ? (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div style={{ color: '#00ff9d', fontFamily: "'Orbitron', sans-serif", fontSize: 14, fontWeight: 700, letterSpacing: '0.2em', marginBottom: 8, textShadow: '0 0 12px rgba(0,255,157,0.5)' }}>
              ◆ CHECK-IN LOGGED
            </div>
            {redFlag && (
              <div role="alert" style={{ color: '#ff8a8a', fontFamily: "'Inter', sans-serif", fontSize: 12, marginBottom: 8 }}>
                Red-flag symptom reported. Contact the Crew Medical Officer / ground now.
              </div>
            )}
            <div style={{ color: 'rgba(0,180,255,0.5)', fontFamily: "'Space Mono', monospace", fontSize: 10 }}>
              Data queued for engine processing
            </div>
            <button
              type="button"
              onClick={onClose}
              style={{ marginTop: 20, padding: '8px 24px', background: 'rgba(0,255,157,0.08)', border: '1px solid rgba(0,255,157,0.3)', color: '#00ff9d', cursor: 'pointer', fontFamily: "'Orbitron', sans-serif", fontSize: 10, letterSpacing: '0.15em' }}
            >
              CLOSE
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            {/* Vitals grid */}
            <div style={{ marginBottom: 12 }}>
              <div className="hud-label" style={{ marginBottom: 10 }}>Biometric Readings</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {FIELDS.map((f, i) => (
                  <Field
                    key={f.key}
                    id={`${uid}-${f.key}`}
                    label={f.label}
                    unit={f.unit}
                    type="number"
                    inputMode="decimal"
                    min={f.min}
                    max={f.max}
                    step={f.step}
                    value={values[f.key]}
                    error={errors[f.key]}
                    onChange={(e) => set(f.key, e.target.value)}
                    onBlur={() => checkOne(f)}
                    {...(i === 0 ? { autoFocus: true } : {})}
                  />
                ))}
              </div>
            </div>

            {/* Reaction test + auto values */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, margin: '14px 0', padding: 10, border: '1px solid rgba(0,180,255,0.12)', background: 'rgba(0,180,255,0.04)' }}>
              <div>
                <div style={LABEL_STYLE}>REACTION TEST (PVT-LITE)</div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: '#c8e4ff' }}>
                  {pvt
                    ? `${pvt.median_ms} ms median, ${pvt.lapses} ${pvt.lapses === 1 ? 'lapse' : 'lapses'}`
                    : 'Not taken yet'}
                </div>
              </div>
              <div>
                <div style={LABEL_STYLE}>FILLED AUTOMATICALLY</div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: '#c8e4ff' }}>
                  Radiation: {auto?.radiation != null ? `${auto.radiation} mSv/day` : 'no feed'}
                </div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: '#c8e4ff' }}>
                  Cabin CO₂: {auto?.co2 != null ? `${auto.co2} mm Hg` : 'no feed'}
                </div>
              </div>
            </div>

            <div style={{ height: 1, background: 'rgba(0,180,255,0.1)', margin: '14px 0' }} />

            {/* Symptom checklist */}
            <fieldset style={{ border: 'none', padding: 0, margin: '0 0 16px' }}>
              <legend className="hud-label" style={{ marginBottom: 10, padding: 0 }}>Active Symptoms</legend>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {SYMPTOMS.map((s) => {
                  const checked = symptoms.includes(s.key);
                  return (
                    <label key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSymptom(s.key)}
                        style={{ accentColor: '#00b4ff', width: 14, height: 14, flexShrink: 0 }}
                      />
                      <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: checked ? '#c8e4ff' : 'rgba(200,228,255,0.6)' }}>
                        {s.label}
                      </span>
                    </label>
                  );
                })}
              </div>
              {redFlag && (
                <div role="alert" style={{ marginTop: 10, padding: '8px 10px', border: '1px solid #ff5c5c', background: 'rgba(255,92,92,0.1)', color: '#ffb3b3', fontFamily: "'Inter', sans-serif", fontSize: 12 }}>
                  ⚠ Red flag: contact the Crew Medical Officer / ground now.
                </div>
              )}
            </fieldset>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={() => { setValues(initialValues(defaults)); setErrors({}); }}
                style={{ padding: '10px 14px', background: 'none', border: '1px solid rgba(0,180,255,0.2)', color: 'rgba(0,180,255,0.7)', cursor: 'pointer', fontFamily: "'Orbitron', sans-serif", fontSize: 9, letterSpacing: '0.12em' }}
              >
                RESET TO BASELINE
              </button>
              <button
                type="submit"
                style={{ flex: 1, padding: '10px 0', background: 'rgba(0,180,255,0.1)', border: '1px solid rgba(0,180,255,0.4)', color: '#00b4ff', cursor: 'pointer', fontFamily: "'Orbitron', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', transition: 'all 0.2s' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,180,255,0.18)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0,180,255,0.1)'; }}
              >
                TRANSMIT CHECK-IN
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}