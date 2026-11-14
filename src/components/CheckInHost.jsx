import { useEffect, useRef, useState } from 'react';
import CheckInModal from './CheckInModal.jsx';
import PvtTest from './PvtTest.jsx';
import { submitCheckIn, normalizePreset } from '../flow/submitCheckIn.js';

// Wires the whole check-in flow. Drop it into the left column next to the preset buttons.
//
// <CheckInHost
//   preset="MARS"                       // 'ISS' | 'LUNAR' | 'MARS'
//   state={engineState}                 // current state used by addReading()
//   addReading={addReading}  evaluate={evaluate}     // from src/engine
//   onUpdate={(newState, output) => { setEngineState(newState); setOutput(output); }}
//   auto={{ radiation: 0.48, co2: 2.3 }}             // optional, read-only values for the form
// />
// onUpdate must replace the dashboard's state and engine output so the gauge, nodes and chart refresh.

const HUD_BTN = {
  padding: '8px 12px', background: 'rgba(0,180,255,0.08)', border: '1px solid rgba(0,180,255,0.35)',
  color: '#00b4ff', cursor: 'pointer', fontFamily: "'Orbitron', sans-serif", fontSize: 10,
  fontWeight: 700, letterSpacing: '0.12em',
};

export function useCheckIn({ preset, state, addReading, evaluate, onUpdate }) {
  const [pvt, setPvt] = useState(null);
  const [logged, setLogged] = useState(null);
  const count = useRef(0);
  const presetKey = normalizePreset(preset);

  // New preset = new mission: reset the counter and the last message.
  useEffect(() => {
    count.current = 0;
    setLogged(null);
    setPvt(null);
  }, [presetKey]);

  const submit = (reading, meta) => {
    count.current += 1;
    const result = submitCheckIn({
      state, reading, meta, preset: presetKey, addReading, evaluate, sessionCount: count.current,
    });
    onUpdate?.(result.state, result.output, result);
    setLogged(result);
    setPvt(null);
    return result;
  };

  return { pvt, setPvt, logged, clearLogged: () => setLogged(null), submit };
}

export function RedFlagBanner({ result, onDismiss }) {
  if (!result?.redFlag) return null;
  return (
    <div role="alert" style={{ padding: '10px 12px', border: '1px solid #ff5c5c', background: 'rgba(255,92,92,0.12)', color: '#ffd0d0', fontFamily: "'Inter', sans-serif", fontSize: 12, lineHeight: 1.5 }}>
      <strong>⚠ Red flag: contact the Crew Medical Officer / ground now.</strong>
      <div style={{ marginTop: 4 }}>Reported: {result.symptoms.join(', ')}.</div>
      {result.selfHarm && (
        <div style={{ marginTop: 4 }}>
          If you are thinking about harming yourself, tell a crewmate or the Crew Medical Officer right now.
        </div>
      )}
      {onDismiss && (
        <button type="button" onClick={onDismiss} style={{ marginTop: 8, background: 'none', border: '1px solid rgba(255,92,92,0.6)', color: '#ffd0d0', cursor: 'pointer', fontSize: 11, padding: '3px 8px' }}>
          Dismiss
        </button>
      )}
    </div>
  );
}

export default function CheckInHost({ preset, state, addReading, evaluate, onUpdate, auto }) {
  const [formOpen, setFormOpen] = useState(false);
  const [pvtOpen, setPvtOpen] = useState(false);
  const { pvt, setPvt, logged, clearLogged, submit } = useCheckIn({ preset, state, addReading, evaluate, onUpdate });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" style={{ ...HUD_BTN, flex: 1 }} onClick={() => setFormOpen(true)}>+ LOG CHECK-IN</button>
        <button type="button" style={HUD_BTN} onClick={() => setPvtOpen(true)}>REACTION TEST</button>
      </div>

      {pvt && !formOpen && (
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: 'rgba(200,228,255,0.7)' }}>
          Reaction test ready: {pvt.median_ms} ms, {pvt.lapses} {pvt.lapses === 1 ? 'lapse' : 'lapses'}. It is added to your next check-in.
        </div>
      )}

      <div aria-live="polite">
        {logged && !logged.redFlag && (
          <div style={{ color: '#00ff9d', fontFamily: "'Orbitron', sans-serif", fontSize: 10, letterSpacing: '0.12em' }}>
            ◆ {logged.dayLabel.toUpperCase()}
          </div>
        )}
      </div>
      <RedFlagBanner result={logged} onDismiss={clearLogged} />

      {pvtOpen && (
        <div className="modal-overlay" onClick={() => setPvtOpen(false)}>
          <div className="hud-panel fade-in" role="dialog" aria-modal="true" aria-label="Reaction test"
            onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 360, padding: 20 }}>
            <PvtTest
              onComplete={(r) => setPvt({ median_ms: r.median_ms, lapses: r.lapses })}
              onCancel={() => setPvtOpen(false)}
              onClose={() => setPvtOpen(false)}
            />
          </div>
        </div>
      )}

      <CheckInModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={submit}
        auto={auto}
        pvt={pvt}
        loggedLabel={logged?.dayLabel}
      />
    </div>
  );
}
