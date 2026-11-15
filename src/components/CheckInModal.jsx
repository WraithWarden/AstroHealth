import { useEffect, useId, useState } from 'react';

const FIELDS = [
  { key: 'sbp',     id: '1A-i',  label: 'BP Systolic',        unit: 'mm Hg', min: 60, max: 220, step: 1,    def: 112 },
  { key: 'dbp',     id: '1A-i',  label: 'BP Diastolic',       unit: 'mm Hg', min: 30, max: 140, step: 1,    def: 71 },
  { key: 'hr',      id: '1A-ii', label: 'Resting Heart Rate', unit: 'bpm',   min: 30, max: 200, step: 1,    def: 62 },
  { key: 'spo2',    id: '4A-i',  label: 'Blood Oxygen (SpO₂)',unit: '%',     min: 70, max: 100, step: 1,    def: 98 },
  { key: 'temp',    id: '2B-ii', label: 'Body Temperature',   unit: '°C',    min: 34, max: 42,  step: 0.1,  def: 37.1 },
  { key: 'sleep',   id: '3A-i',  label: 'Sleep Last Night',   unit: 'h',     min: 0,  max: 14,  step: 0.1,  def: 6.4 },
  { key: 'mood',    id: '3B-i',  label: 'Mood / Stress',      unit: '1–10',  min: 1,  max: 10,  step: 1,    def: 3 },
  { key: 'glucose', id: '4B-i',  label: 'Fasting Glucose',    unit: 'mg/dL', min: 30, max: 400, step: 1,    def: 90 },
  { key: 'onsd',    id: '1B-i',  label: 'ONSD (Optional)',    unit: 'mm',    min: 3,  max: 8,   step: 0.05, def: '', optional: true },
];

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
  background: '#090e1a',
  border: '1px solid rgba(148, 163, 184, 0.24)',
  borderRadius: 6,
  color: '#f1f5f9',
  padding: '8px 10px',
  fontFamily: "'Space Mono', monospace",
  fontSize: 12.5,
  outline: 'none',
  transition: 'border-color 0.2s',
};

const LABEL_STYLE = {
  fontFamily: "'Inter', sans-serif",
  fontSize: 11.5,
  fontWeight: 500,
  color: '#cbd5e1',
  marginBottom: 5,
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

function HowButton({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`How to measure ${label}`}
      aria-pressed={active || undefined}
      title={`How to measure ${label}`}
      style={{
        background: active ? 'rgba(56, 189, 248, 0.22)' : 'rgba(56, 189, 248, 0.08)',
        border: `1px solid ${active ? '#38bdf8' : 'rgba(56, 189, 248, 0.24)'}`,
        borderRadius: 4,
        color: active ? '#e0f2fe' : '#38bdf8',
        fontFamily: "'Inter', sans-serif",
        fontSize: 10,
        fontWeight: 600,
        lineHeight: 1.2,
        padding: '2px 6px',
        cursor: 'pointer',
        flexShrink: 0,
        transition: 'background 0.14s ease, border-color 0.14s ease',
      }}
    >
      ? How
    </button>
  );
}

function Field({ id, label, unit, error, onBlur, onInspectHow, howActive, ...props }) {
  const [focused, setFocused] = useState(false);
  const errId = `${id}-err`;
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 5 }}>
        <label htmlFor={id} style={{ ...LABEL_STYLE, marginBottom: 0 }}>
          {label} {unit && <span style={{ color: '#64748b', fontWeight: 400 }}>({unit})</span>}
        </label>
        {onInspectHow && (
          <HowButton label={label} active={howActive} onClick={onInspectHow} />
        )}
      </div>
      <input
        id={id}
        {...props}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? errId : undefined}
        style={{
          ...FIELD_STYLE,
          borderColor: error ? '#fb7185' : focused ? '#38bdf8' : 'rgba(148, 163, 184, 0.24)',
        }}
        onFocus={() => setFocused(true)}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
      />
      {error && (
        <div id={errId} role="alert" style={{ color: '#fb7185', fontSize: 11, marginTop: 4, fontFamily: "'Inter', sans-serif" }}>
          {error}
        </div>
      )}
    </div>
  );
}

export default function CheckInModal({
  open = true,
  onClose,
  onSubmit,
  defaults,
  auto,
  pvt,
  onInspectHow,
  activeGuideId,
  guideOpen = false,
  onCloseGuide,
}) {
  const [values, setValues] = useState(() => initialValues(defaults));
  const [errors, setErrors] = useState({});
  const [symptoms, setSymptoms] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const uid = useId();

  useEffect(() => {
    if (!open) return;
    setValues(initialValues(defaults));
    setErrors({});
    setSymptoms([]);
    setSubmitted(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open || guideOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, guideOpen, onClose]);

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
    <div
      className={`modal-overlay${guideOpen ? ' check-in-with-guide' : ''}`}
      onClick={() => (guideOpen ? onCloseGuide?.() : onClose?.())}
    >
      <div
        className="hud-panel fade-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 580, maxHeight: '90vh', overflowY: 'auto', padding: 24 }}
      >
        {/* Title bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
          <div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#38bdf8' }}>
              Daily Medical Check-In
            </div>
            <h2 id={titleId} style={{ margin: '3px 0 0', fontFamily: "'Inter', sans-serif", fontSize: 17, fontWeight: 700, color: '#f8fafc' }}>
              Log Biometrics & Symptoms
            </h2>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: '#64748b', marginTop: 2 }}>
              {new Date().toISOString().replace('T', ' ').slice(0, 16)} UTC · Pre-filled at personal baseline
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close check-in"
            style={{
              background: 'rgba(30, 41, 59, 0.7)',
              border: '1px solid rgba(148, 163, 184, 0.25)',
              borderRadius: 6,
              color: '#cbd5e1',
              padding: '5px 10px',
              cursor: 'pointer',
              fontSize: 12,
              fontFamily: "'Inter', sans-serif",
            }}
          >
            Esc ✕
          </button>
        </div>

        {submitted ? (
          <div style={{ textAlign: 'center', padding: '28px 0' }}>
            <div style={{ color: '#34d399', fontFamily: "'Inter', sans-serif", fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
              ◆ Check-In Logged Successfully
            </div>
            {redFlag && (
              <div role="alert" style={{ color: '#fb7185', fontFamily: "'Inter', sans-serif", fontSize: 13, marginBottom: 8 }}>
                ■ Red-flag symptom reported. Contact the Crew Medical Officer / ground now.
              </div>
            )}
            <button
              type="button"
              onClick={onClose}
              style={{
                marginTop: 16,
                padding: '8px 22px',
                borderRadius: 6,
                background: 'rgba(16, 185, 129, 0.14)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                color: '#34d399',
                cursor: 'pointer',
                fontFamily: "'Inter', sans-serif",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            {/* Vitals grid */}
            <div style={{ marginBottom: 14 }}>
              <div className="hud-label" style={{ marginBottom: 10 }}>Biometric Readings</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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
                    onInspectHow={onInspectHow ? () => onInspectHow(f.id) : undefined}
                    howActive={guideOpen && activeGuideId === f.id}
                    {...(i === 0 ? { autoFocus: true } : {})}
                  />
                ))}
              </div>
            </div>

            {/* Reaction test + auto values */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 12,
              margin: '14px 0',
              padding: 12,
              borderRadius: 8,
              border: '1px solid rgba(148, 163, 184, 0.16)',
              background: 'rgba(15, 23, 42, 0.6)',
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 4 }}>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 10.5, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>
                    Reaction Test (PVT-Lite)
                  </div>
                  {onInspectHow && (
                    <HowButton
                      label="Reaction Test (PVT-Lite)"
                      active={guideOpen && activeGuideId === '3A-ii'}
                      onClick={() => onInspectHow('3A-ii')}
                    />
                  )}
                </div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11.5, color: '#e2e8f0' }}>
                  {pvt
                    ? `${pvt.median_ms} ms median · ${pvt.lapses} ${pvt.lapses === 1 ? 'lapse' : 'lapses'}`
                    : 'Not taken in this session'}
                </div>
              </div>
              <div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 10.5, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>
                  Spacecraft Telemetry (Auto)
                </div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11.5, color: '#e2e8f0' }}>
                  Rad: {auto?.radiation != null ? `${auto.radiation} mSv/d` : '—'} · CO₂: {auto?.co2 != null ? `${auto.co2} mmHg` : '—'}
                </div>
              </div>
            </div>

            {/* Symptom checklist */}
            <fieldset style={{ border: 'none', padding: 0, margin: '0 0 18px' }}>
              <legend className="hud-label" style={{ marginBottom: 10, padding: 0 }}>
                Red-Flag Symptoms (Tick Any Present)
              </legend>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {SYMPTOMS.map((s) => {
                  const checked = symptoms.includes(s.key);
                  return (
                    <label
                      key={s.key}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '7px 10px',
                        borderRadius: 6,
                        background: checked ? 'rgba(244, 63, 94, 0.12)' : 'rgba(15, 23, 42, 0.45)',
                        border: `1px solid ${checked ? 'rgba(244, 63, 94, 0.4)' : 'rgba(148, 163, 184, 0.14)'}`,
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSymptom(s.key)}
                        style={{ accentColor: '#f43f5e', width: 14, height: 14, flexShrink: 0 }}
                      />
                      <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: checked ? '#fecdd3' : '#cbd5e1' }}>
                        {s.label}
                      </span>
                    </label>
                  );
                })}
              </div>
              {redFlag && (
                <div
                  role="alert"
                  style={{
                    marginTop: 10,
                    padding: '9px 12px',
                    borderRadius: 7,
                    border: '1px solid rgba(244, 63, 94, 0.45)',
                    background: 'rgba(244, 63, 94, 0.12)',
                    color: '#fecdd3',
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 12,
                  }}
                >
                  ■ Red flag: contact the Crew Medical Officer / ground immediately.
                </div>
              )}
            </fieldset>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={() => { setValues(initialValues(defaults)); setErrors({}); }}
                style={{
                  padding: '10px 16px',
                  borderRadius: 7,
                  background: 'rgba(30, 41, 59, 0.7)',
                  border: '1px solid rgba(148, 163, 184, 0.25)',
                  color: '#cbd5e1',
                  cursor: 'pointer',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 12,
                  fontWeight: 500,
                }}
              >
                Reset to Baseline
              </button>
              <button
                type="submit"
                style={{
                  flex: 1,
                  padding: '10px 0',
                  borderRadius: 7,
                  background: 'linear-gradient(180deg, rgba(56, 189, 248, 0.24) 0%, rgba(14, 165, 233, 0.16) 100%)',
                  border: '1px solid rgba(56, 189, 248, 0.5)',
                  color: '#f0f9ff',
                  cursor: 'pointer',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                Save & Evaluate Check-In
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
