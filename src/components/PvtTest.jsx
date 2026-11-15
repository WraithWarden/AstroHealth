import { useState, useEffect, useRef, useCallback } from 'react';

const TRIALS    = 5;
const MIN_DELAY = 1500;
const MAX_DELAY = 4500;
const LAPSE_MS  = 500;

const PHASES = {
  IDLE:     'IDLE',
  WAITING:  'WAITING',
  STIMULUS: 'STIMULUS',
  FEEDBACK: 'FEEDBACK',
  DONE:     'DONE',
  EARLY:    'EARLY',
};

function median(arr) {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

export default function PvtTest({ onComplete, onCancel }) {
  const [phase, setPhase]           = useState(PHASES.IDLE);
  const [trial, setTrial]           = useState(0);
  const [rts, setRts]               = useState([]);
  const [lastRt, setLastRt]         = useState(null);

  const stimulusStartRef = useRef(null);
  const timeoutRef       = useRef(null);

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  const scheduleStimulus = useCallback(() => {
    setPhase(PHASES.WAITING);
    const delay = MIN_DELAY + Math.random() * (MAX_DELAY - MIN_DELAY);
    timeoutRef.current = setTimeout(() => {
      stimulusStartRef.current = performance.now();
      setPhase(PHASES.STIMULUS);
    }, delay);
  }, []);

  function startTest() {
    setTrial(0);
    setRts([]);
    setLastRt(null);
    scheduleStimulus();
  }

  function handleTap() {
    if (phase === PHASES.WAITING) {
      clearTimeout(timeoutRef.current);
      setPhase(PHASES.EARLY);
      timeoutRef.current = setTimeout(() => scheduleStimulus(), 1200);
      return;
    }

    if (phase === PHASES.STIMULUS) {
      const rt = Math.round(performance.now() - stimulusStartRef.current);
      const nextRts = [...rts, rt];
      setLastRt(rt);
      setRts(nextRts);
      setPhase(PHASES.FEEDBACK);

      const nextTrial = trial + 1;
      if (nextTrial >= TRIALS) {
        timeoutRef.current = setTimeout(() => {
          const med    = median(nextRts);
          const lapses = nextRts.filter(r => r > LAPSE_MS).length;
          setPhase(PHASES.DONE);
          onComplete?.({ median_ms: med, lapses, trials: nextRts });
        }, 900);
      } else {
        setTrial(nextTrial);
        timeoutRef.current = setTimeout(() => scheduleStimulus(), 900);
      }
    }
  }

  const isLapse = lastRt != null && lastRt > LAPSE_MS;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
      {/* Header */}
      <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#38bdf8' }}>
            3A-ii · Cognitive Alertness
          </div>
          <h3 style={{ margin: '3px 0 0', fontFamily: "'Inter', sans-serif", fontSize: 16, fontWeight: 700, color: '#f8fafc' }}>
            PVT-Lite Reaction Test
          </h3>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
            {TRIALS} trials · Tap immediately when the target turns red (&gt;500 ms = lapse)
          </div>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={() => { clearTimeout(timeoutRef.current); onCancel(); }}
            style={{
              background: 'rgba(30, 41, 59, 0.7)',
              border: '1px solid rgba(148, 163, 184, 0.25)',
              borderRadius: 6,
              color: '#cbd5e1',
              padding: '4px 9px',
              cursor: 'pointer',
              fontSize: 11.5,
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Trial progress dots */}
      {phase !== PHASES.IDLE && phase !== PHASES.DONE && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {Array.from({ length: TRIALS }).map((_, i) => (
            <div key={i} style={{
              width: 10, height: 10, borderRadius: '50%',
              background: i < rts.length
                ? (rts[i] > LAPSE_MS ? '#f43f5e' : '#10b981')
                : i === trial
                ? '#38bdf8'
                : 'rgba(148, 163, 184, 0.2)',
              transition: 'background 0.25s',
            }}/>
          ))}
        </div>
      )}

      {/* Start button */}
      {phase === PHASES.IDLE && (
        <div style={{ width: '100%', textAlign: 'center' }}>
          <button
            type="button"
            onClick={startTest}
            style={{
              width: '100%',
              padding: '13px 0',
              borderRadius: 8,
              background: 'linear-gradient(180deg, rgba(56, 189, 248, 0.24) 0%, rgba(14, 165, 233, 0.16) 100%)',
              border: '1px solid rgba(56, 189, 248, 0.5)',
              color: '#f0f9ff',
              cursor: 'pointer',
              fontFamily: "'Inter', sans-serif",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Start 5-Trial Reaction Test
          </button>
        </div>
      )}

      {(phase === PHASES.WAITING || phase === PHASES.STIMULUS ||
        phase === PHASES.FEEDBACK || phase === PHASES.EARLY) && (
        <button
          type="button"
          onClick={handleTap}
          style={{
            width: '100%',
            height: 110,
            borderRadius: 8,
            background: phase === PHASES.STIMULUS
              ? '#e11d48'
              : phase === PHASES.EARLY
              ? 'rgba(245, 158, 11, 0.14)'
              : phase === PHASES.FEEDBACK
              ? (isLapse ? 'rgba(244, 63, 94, 0.12)' : 'rgba(16, 185, 129, 0.12)')
              : 'rgba(15, 23, 42, 0.8)',
            border: phase === PHASES.STIMULUS
              ? '2px solid #fda4af'
              : phase === PHASES.EARLY
              ? '1px solid rgba(245, 158, 11, 0.45)'
              : phase === PHASES.FEEDBACK
              ? `1px solid ${isLapse ? 'rgba(244, 63, 94, 0.45)' : 'rgba(16, 185, 129, 0.45)'}`
              : '1px solid rgba(148, 163, 184, 0.2)',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
          }}
        >
          {phase === PHASES.WAITING && (
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 500, color: '#94a3b8' }}>
              Wait for red signal...
            </span>
          )}
          {phase === PHASES.STIMULUS && (
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 20, fontWeight: 800, color: '#ffffff' }}>
              TAP NOW!
            </span>
          )}
          {phase === PHASES.FEEDBACK && (
            <>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 20, fontWeight: 700, color: isLapse ? '#fb7185' : '#34d399' }}>
                {lastRt} ms
              </span>
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 600, color: isLapse ? '#fb7185' : '#34d399' }}>
                {isLapse ? '▲ Lapse (>500 ms)' : '◆ Good Response'}
              </span>
            </>
          )}
          {phase === PHASES.EARLY && (
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600, color: '#fbbf24' }}>
              ▲ Too early — wait for red!
            </span>
          )}
        </button>
      )}

      {/* Results screen */}
      {phase === PHASES.DONE && (
        <div style={{ width: '100%' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div style={{ padding: 12, borderRadius: 8, border: '1px solid rgba(16, 185, 129, 0.3)', background: 'rgba(16, 185, 129, 0.08)', textAlign: 'center' }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 20, fontWeight: 700, color: '#34d399' }}>
                {median(rts)} ms
              </div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                Median Reaction Time
              </div>
            </div>
            <div style={{ padding: 12, borderRadius: 8, border: '1px solid rgba(148, 163, 184, 0.2)', background: 'rgba(15, 23, 42, 0.6)', textAlign: 'center' }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 20, fontWeight: 700, color: rts.filter(r => r > LAPSE_MS).length > 1 ? '#fb7185' : '#f1f5f9' }}>
                {rts.filter(r => r > LAPSE_MS).length}
              </div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                Lapses (&gt;500 ms)
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={startTest}
              style={{
                flex: 1,
                padding: '9px 0',
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
              Retry
            </button>
            <button
              type="button"
              onClick={() => onComplete?.({ median_ms: median(rts), lapses: rts.filter(r => r > LAPSE_MS).length, trials: rts })}
              style={{
                flex: 2,
                padding: '9px 0',
                borderRadius: 7,
                background: 'rgba(16, 185, 129, 0.16)',
                border: '1px solid rgba(16, 185, 129, 0.45)',
                color: '#34d399',
                cursor: 'pointer',
                fontFamily: "'Inter', sans-serif",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              Use Result
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
