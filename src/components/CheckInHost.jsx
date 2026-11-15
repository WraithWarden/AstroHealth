import { useEffect, useRef, useState } from 'react';
import CheckInModal from './CheckInModal.jsx';
import PvtTest from './PvtTest.jsx';
import { submitCheckIn, normalizePreset } from '../flow/submitCheckIn.js';

const PRIMARY_BTN = {
  padding: '9px 14px',
  borderRadius: 7,
  background: 'linear-gradient(180deg, rgba(56, 189, 248, 0.22) 0%, rgba(14, 165, 233, 0.14) 100%)',
  border: '1px solid rgba(56, 189, 248, 0.45)',
  color: '#f0f9ff',
  cursor: 'pointer',
  fontFamily: "'Inter', sans-serif",
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: '0.02em',
};

const SECONDARY_BTN = {
  padding: '9px 12px',
  borderRadius: 7,
  background: 'rgba(30, 41, 59, 0.7)',
  border: '1px solid rgba(148, 163, 184, 0.24)',
  color: '#cbd5e1',
  cursor: 'pointer',
  fontFamily: "'Inter', sans-serif",
  fontSize: 12,
  fontWeight: 500,
};

export function useCheckIn({ preset, state, addReading, evaluate, onUpdate }) {
  const [pvt, setPvt] = useState(null);
  const [logged, setLogged] = useState(null);
  const count = useRef(0);
  const presetKey = normalizePreset(preset);

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
    <div
      role="alert"
      style={{
        padding: '10px 12px',
        borderRadius: 8,
        border: '1px solid rgba(244, 63, 94, 0.45)',
        background: 'rgba(244, 63, 94, 0.12)',
        color: '#fecdd3',
        fontFamily: "'Inter', sans-serif",
        fontSize: 12,
        lineHeight: 1.5,
      }}
    >
      <strong style={{ color: '#fb7185' }}>■ Red Flag: Contact the Crew Medical Officer / ground now.</strong>
      <div style={{ marginTop: 4 }}>Reported: {result.symptoms.join(', ')}.</div>
      {result.selfHarm && (
        <div style={{ marginTop: 4, fontWeight: 500 }}>
          If you are thinking about harming yourself, tell a crewmate or the Crew Medical Officer right now.
        </div>
      )}
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          style={{
            marginTop: 8,
            borderRadius: 5,
            background: 'rgba(244, 63, 94, 0.15)',
            border: '1px solid rgba(244, 63, 94, 0.4)',
            color: '#fecdd3',
            cursor: 'pointer',
            fontSize: 11,
            padding: '3px 9px',
          }}
        >
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
        <button type="button" style={{ ...PRIMARY_BTN, flex: 1 }} onClick={() => setFormOpen(true)}>
          + Log Check-In
        </button>
        <button type="button" style={SECONDARY_BTN} onClick={() => setPvtOpen(true)}>
          Reaction Test
        </button>
      </div>

      {pvt && !formOpen && (
        <div style={{
          padding: '7px 10px',
          borderRadius: 6,
          background: 'rgba(56, 189, 248, 0.08)',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          fontFamily: "'Inter', sans-serif",
          fontSize: 11.5,
          color: '#bae6fd',
        }}>
          ◆ PVT ready: <strong>{pvt.median_ms} ms</strong> ({pvt.lapses} {pvt.lapses === 1 ? 'lapse' : 'lapses'}) — queued for next check-in.
        </div>
      )}

      <div aria-live="polite">
        {logged && !logged.redFlag && (
          <div style={{
            padding: '6px 10px',
            borderRadius: 6,
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#34d399',
            fontFamily: "'Inter', sans-serif",
            fontSize: 11.5,
            fontWeight: 600,
          }}>
            ◆ {logged.dayLabel}
          </div>
        )}
      </div>
      <RedFlagBanner result={logged} onDismiss={clearLogged} />

      {pvtOpen && (
        <div className="modal-overlay" onClick={() => setPvtOpen(false)}>
          <div
            className="hud-panel fade-in"
            role="dialog"
            aria-modal="true"
            aria-label="Reaction test"
            onClick={(e) => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 380, padding: 22 }}
          >
            <PvtTest
              onComplete={(r) => {
                setPvt(r);
                setPvtOpen(false);
              }}
              onCancel={() => setPvtOpen(false)}
            />
          </div>
        </div>
      )}

      <CheckInModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        auto={auto}
        pvt={pvt}
        onSubmit={(reading, meta) => {
          submit(reading, meta);
          setFormOpen(false);
        }}
      />
    </div>
  );
}
