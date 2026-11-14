import { useState, useEffect, useRef, useCallback } from 'react';

/*
  PVT-Lite (Psychomotor Vigilance Task) — NASA-standard cognitive alertness test.
  How it works:
    1. Blank screen with "READY" prompt
    2. After a random 2–10 s delay, a red stimulus appears
    3. User taps/clicks as fast as possible
    4. 5 trials → shows median RT and lapse count (RT > 500 ms = lapse)
    5. Calls onComplete({ median_ms, lapses, trials }) when done
*/

const TRIALS      = 5;
const MIN_DELAY   = 2000;
const MAX_DELAY   = 10000;
const LAPSE_MS    = 500;

const PHASES = {
  IDLE:     'IDLE',      // before starting
  WAITING:  'WAITING',  // waiting for stimulus (blank)
  STIMULUS: 'STIMULUS', // red target shown — tap now
  FEEDBACK: 'FEEDBACK', // showing RT for this trial
  DONE:     'DONE',     // all 5 trials complete
  EARLY:    'EARLY',    // tapped too early
};

function median(arr) {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

export default function PvtTest({ onComplete, onCancel }) {
  const [phase, setPhase]       = useState(PHASES.IDLE);
  const [trial, setTrial]       = useState(0);       // 0-based
  const [rts, setRts]           = useState([]);       // reaction times ms
  const [lastRt, setLastRt]     = useState(null);
  const [earlyCount, setEarlyCount] = useState(0);

  const stimulusStartRef = useRef(null);
  const timeoutRef       = useRef(null);

  /* Clear any pending timeout on unmount */
  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  /* Schedule the stimulus after a random delay */
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
    setEarlyCount(0);
    scheduleStimulus();
  }

  function handleTap() {
    if (phase === PHASES.WAITING) {
      /* Tapped too early */
      clearTimeout(timeoutRef.current);
      setEarlyCount(c => c + 1);
      setPhase(PHASES.EARLY);
      timeoutRef.current = setTimeout(() => scheduleStimulus(), 1500);
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
        /* All done */
        timeoutRef.current = setTimeout(() => {
          const med    = median(nextRts);
          const lapses = nextRts.filter(r => r > LAPSE_MS).length;
          setPhase(PHASES.DONE);
          onComplete?.({ median_ms: med, lapses, trials: nextRts });
        }, 1200);
      } else {
        setTrial(nextTrial);
        timeoutRef.current = setTimeout(() => scheduleStimulus(), 1200);
      }
      return;
    }
  }

  /* ── Render ── */
  const isLapse = lastRt != null && lastRt > LAPSE_MS;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: 0, width: '100%' }}>

      {/* Header */}
      <div style={{ width: '100%', marginBottom: 12 }}>
        <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 10, fontWeight: 700,
          letterSpacing: '0.18em', color: '#00b4ff', marginBottom: 4 }}>
          PVT REACTION TEST
        </div>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 8,
          color: 'rgba(0,180,255,0.4)', lineHeight: 1.7 }}>
          {TRIALS} trials · tap when red appears · &gt;500 ms = lapse
        </div>
      </div>

      {/* Trial progress dots */}
      {phase !== PHASES.IDLE && phase !== PHASES.DONE && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          {Array.from({ length: TRIALS }).map((_, i) => (
            <div key={i} style={{
              width: 8, height: 8, borderRadius: '50%',
              background: i < rts.length
                ? (rts[i] > LAPSE_MS ? '#ff3355' : '#00ff9d')
                : i === trial
                ? 'rgba(0,180,255,0.4)'
                : 'rgba(0,180,255,0.1)',
              transition: 'background 0.3s',
            }}/>
          ))}
        </div>
      )}

      {/* Main tap area */}
      {phase === PHASES.IDLE && (
        <div style={{ width: '100%', textAlign: 'center' }}>
          <button
            onClick={startTest}
            style={{ width: '100%', padding: '14px 0',
              background: 'rgba(0,180,255,0.08)', border: '1px solid rgba(0,180,255,0.35)',
              color: '#00b4ff', cursor: 'pointer', fontFamily: "'Orbitron', sans-serif",
              fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,180,255,0.15)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,180,255,0.08)'; }}
          >
            START TEST
          </button>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 8,
            color: 'rgba(0,180,255,0.3)', marginTop: 6 }}>
            ~{Math.round((MIN_DELAY + MAX_DELAY) / 2 / 1000 * TRIALS / 2 + TRIALS * 1.5)} min estimated
          </div>
        </div>
      )}

      {(phase === PHASES.WAITING || phase === PHASES.STIMULUS ||
        phase === PHASES.FEEDBACK || phase === PHASES.EARLY) && (
        <button
          onClick={handleTap}
          style={{
            width: '100%', height: 80,
            background: phase === PHASES.STIMULUS
              ? 'rgba(255,51,85,0.9)'
              : phase === PHASES.EARLY
              ? 'rgba(255,200,0,0.1)'
              : phase === PHASES.FEEDBACK
              ? (isLapse ? 'rgba(255,51,85,0.08)' : 'rgba(0,255,157,0.08)')
              : 'rgba(0,180,255,0.04)',
            border: phase === PHASES.STIMULUS
              ? '1px solid rgba(255,51,85,0.8)'
              : phase === PHASES.EARLY
              ? '1px solid rgba(255,200,0,0.4)'
              : phase === PHASES.FEEDBACK
              ? `1px solid ${isLapse ? 'rgba(255,51,85,0.4)' : 'rgba(0,255,157,0.4)'}`
              : '1px solid rgba(0,180,255,0.15)',
            cursor: 'pointer', transition: 'background 0.05s, border 0.05s',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 4,
          }}
        >
          {phase === PHASES.WAITING && (
            <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 10,
              color: 'rgba(0,180,255,0.3)', letterSpacing: '0.15em' }}>
              WAIT...
            </span>
          )}
          {phase === PHASES.STIMULUS && (
            <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 16, fontWeight: 900,
              color: '#fff', letterSpacing: '0.1em', textShadow: '0 0 20px #ff3355' }}>
              TAP!
            </span>
          )}
          {phase === PHASES.FEEDBACK && (
            <>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 18, fontWeight: 700,
                color: isLapse ? '#ff3355' : '#00ff9d',
                textShadow: `0 0 12px ${isLapse ? '#ff3355' : '#00ff9d'}` }}>
                {lastRt} ms
              </span>
              <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 7,
                letterSpacing: '0.15em',
                color: isLapse ? 'rgba(255,51,85,0.7)' : 'rgba(0,255,157,0.7)' }}>
                {isLapse ? 'LAPSE' : 'GOOD'}
              </span>
            </>
          )}
          {phase === PHASES.EARLY && (
            <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 10,
              color: '#ffc800', letterSpacing: '0.12em' }}>
              TOO EARLY
            </span>
          )}
        </button>
      )}

      {/* Results screen */}
      {phase === PHASES.DONE && (
        <div style={{ width: '100%' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
            <div style={{ padding: '10px', border: '1px solid rgba(0,255,157,0.2)',
              background: 'rgba(0,255,157,0.05)', textAlign: 'center' }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 20, fontWeight: 700,
                color: '#00ff9d', textShadow: '0 0 10px #00ff9d60' }}>
                {median(rts)}
              </div>
              <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 7,
                letterSpacing: '0.12em', color: 'rgba(0,255,157,0.6)', marginTop: 4 }}>
                MEDIAN MS
              </div>
            </div>
            <div style={{ padding: '10px',
              border: `1px solid ${rts.filter(r=>r>LAPSE_MS).length > 1 ? 'rgba(255,51,85,0.3)' : 'rgba(0,180,255,0.15)'}`,
              background: rts.filter(r=>r>LAPSE_MS).length > 1 ? 'rgba(255,51,85,0.05)' : 'rgba(0,180,255,0.03)',
              textAlign: 'center' }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 20, fontWeight: 700,
                color: rts.filter(r=>r>LAPSE_MS).length > 1 ? '#ff3355' : '#00ff9d' }}>
                {rts.filter(r => r > LAPSE_MS).length}
              </div>
              <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 7,
                letterSpacing: '0.12em', color: 'rgba(0,180,255,0.4)', marginTop: 4 }}>
                LAPSES
              </div>
            </div>
          </div>
          {/* individual trials */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
            {rts.map((rt, i) => (
              <div key={i} style={{ flex: 1, padding: '4px 2px', textAlign: 'center',
                background: rt > LAPSE_MS ? 'rgba(255,51,85,0.08)' : 'rgba(0,255,157,0.05)',
                border: `1px solid ${rt > LAPSE_MS ? 'rgba(255,51,85,0.2)' : 'rgba(0,255,157,0.15)'}` }}>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10,
                  color: rt > LAPSE_MS ? '#ff3355' : '#00ff9d' }}>{rt}</div>
                <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 6,
                  color: 'rgba(0,180,255,0.3)', marginTop: 2 }}>T{i+1}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={startTest}
              style={{ flex: 1, padding: '8px 0', background: 'rgba(0,180,255,0.05)',
                border: '1px solid rgba(0,180,255,0.2)', color: 'rgba(0,180,255,0.6)',
                cursor: 'pointer', fontFamily: "'Orbitron', sans-serif", fontSize: 9,
                letterSpacing: '0.12em' }}>
              RETRY
            </button>
            <button
              onClick={() => onComplete?.({ median_ms: median(rts),
                lapses: rts.filter(r => r > LAPSE_MS).length, trials: rts })}
              style={{ flex: 2, padding: '8px 0', background: 'rgba(0,255,157,0.08)',
                border: '1px solid rgba(0,255,157,0.35)', color: '#00ff9d',
                cursor: 'pointer', fontFamily: "'Orbitron', sans-serif", fontSize: 9,
                fontWeight: 700, letterSpacing: '0.12em' }}>
              USE RESULT
            </button>
          </div>
        </div>
      )}

      {/* Cancel */}
      {phase !== PHASES.IDLE && phase !== PHASES.DONE && (
        <button onClick={() => { clearTimeout(timeoutRef.current); onCancel?.(); }}
          style={{ marginTop: 8, background: 'none', border: 'none',
            color: 'rgba(0,180,255,0.3)', cursor: 'pointer',
            fontFamily: "'Space Mono', monospace", fontSize: 8 }}>
          cancel
        </button>
      )}
    </div>
  );
}
