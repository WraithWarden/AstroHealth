import { useState } from 'react';

const SYMPTOMS = [
  'Headache', 'Blurred vision', 'Dizziness',
  'Chest pain', 'Nausea', 'Confusion', 'Fatigue', 'Joint pain',
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
  fontFamily:    "'Orbitron', sans-serif",
  fontSize:      9,
  letterSpacing: '0.12em',
  color:         'rgba(0,180,255,0.6)',
  marginBottom:  4,
  display:       'block',
};

function Field({ label, unit, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label style={LABEL_STYLE}>{label} {unit && <span style={{ opacity: 0.5 }}>({unit})</span>}</label>
      <input
        {...props}
        style={{ ...FIELD_STYLE, borderColor: focused ? 'rgba(0,180,255,0.5)' : 'rgba(0,180,255,0.2)' }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </div>
  );
}

export default function CheckInModal({ onClose }) {
  const [form, setForm] = useState({
    sleep: '', hr: '', spo2: '', onsd: '', mood: '', glucose: '',
  });
  const [symptoms, setSymptoms] = useState([]);
  const [submitted, setSubmitted] = useState(false);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  function toggleSymptom(s) {
    setSymptoms(prev =>
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
    );
  }

  function handleSubmit(e) {
    e.preventDefault();
    const payload = { ...form, symptoms, timestamp: new Date().toISOString() };
    // Slot: Person 1 / Person 3 wires this to addReading()
    console.log('[CHECK-IN SUBMITTED]', payload);
    setSubmitted(true);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="hud-panel fade-in"
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 520, maxHeight: '90vh',
          overflowY: 'auto', padding: 24,
        }}
      >
        {/* Title bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 11, fontWeight: 700,
              letterSpacing: '0.2em', color: '#00b4ff', marginBottom: 2 }}>
              + LOG DAILY CHECK-IN
            </div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: 'rgba(0,180,255,0.4)' }}>
              {new Date().toISOString().replace('T', ' ').slice(0, 16)} UTC
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'none', border: '1px solid rgba(0,180,255,0.2)', color: 'rgba(0,180,255,0.6)',
              width: 28, height: 28, cursor: 'pointer', fontSize: 14,
              fontFamily: "'Space Mono', monospace", display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>

        {submitted ? (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div style={{ color: '#00ff9d', fontFamily: "'Orbitron', sans-serif", fontSize: 14,
              fontWeight: 700, letterSpacing: '0.2em', marginBottom: 8, textShadow: '0 0 12px rgba(0,255,157,0.5)' }}>
              ◆ CHECK-IN LOGGED
            </div>
            <div style={{ color: 'rgba(0,180,255,0.5)', fontFamily: "'Space Mono', monospace", fontSize: 10 }}>
              Data queued for engine processing
            </div>
            <button
              onClick={onClose}
              style={{
                marginTop: 20, padding: '8px 24px',
                background: 'rgba(0,255,157,0.08)', border: '1px solid rgba(0,255,157,0.3)',
                color: '#00ff9d', cursor: 'pointer', fontFamily: "'Orbitron', sans-serif",
                fontSize: 10, letterSpacing: '0.15em',
              }}
            >
              CLOSE
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {/* Vitals grid */}
            <div style={{ marginBottom: 12 }}>
              <div className="hud-label" style={{ marginBottom: 10 }}>Biometric Readings</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Field label="Sleep Duration" unit="h" type="number" min="0" max="24" step="0.5"
                  placeholder="7.5" value={form.sleep} onChange={e => set('sleep', e.target.value)} />
                <Field label="Heart Rate" unit="bpm" type="number" min="20" max="220"
                  placeholder="72" value={form.hr} onChange={e => set('hr', e.target.value)} />
                <Field label="SpO₂" unit="%" type="number" min="80" max="100" step="0.1"
                  placeholder="98.5" value={form.spo2} onChange={e => set('spo2', e.target.value)} />
                <Field label="ONSD" unit="mm" type="number" min="0" max="10" step="0.01"
                  placeholder="5.20" value={form.onsd} onChange={e => set('onsd', e.target.value)} />
                <Field label="Mood VAS" unit="1-10" type="number" min="1" max="10"
                  placeholder="7" value={form.mood} onChange={e => set('mood', e.target.value)} />
                <Field label="Blood Glucose" unit="mmol/L" type="number" min="0" max="30" step="0.1"
                  placeholder="5.4" value={form.glucose} onChange={e => set('glucose', e.target.value)} />
              </div>
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: 'rgba(0,180,255,0.1)', margin: '14px 0' }} />

            {/* Symptom checkboxes */}
            <div style={{ marginBottom: 16 }}>
              <div className="hud-label" style={{ marginBottom: 10 }}>Active Symptoms</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {SYMPTOMS.map(s => {
                  const checked = symptoms.includes(s);
                  return (
                    <label key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <span style={{
                        width: 14, height: 14, border: `1px solid ${checked ? '#00b4ff' : 'rgba(0,180,255,0.25)'}`,
                        background: checked ? 'rgba(0,180,255,0.15)' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0, transition: 'all 0.15s',
                      }}>
                        {checked && <span style={{ color: '#00b4ff', fontSize: 9, lineHeight: 1 }}>✓</span>}
                      </span>
                      <input type="checkbox" checked={checked} onChange={() => toggleSymptom(s)}
                        style={{ display: 'none' }} />
                      <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11,
                        color: checked ? '#c8e4ff' : 'rgba(200,228,255,0.45)' }}>{s}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              style={{
                width: '100%', padding: '10px 0',
                background: 'rgba(0,180,255,0.1)', border: '1px solid rgba(0,180,255,0.4)',
                color: '#00b4ff', cursor: 'pointer',
                fontFamily: "'Orbitron', sans-serif", fontSize: 11, fontWeight: 700,
                letterSpacing: '0.2em', transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,180,255,0.18)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,180,255,0.1)'; }}
            >
              TRANSMIT CHECK-IN
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
