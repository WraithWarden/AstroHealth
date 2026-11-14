import { useState, useMemo, useCallback, useEffect } from 'react';
import { evaluate, addReading } from './engine/index.js';
import profiles from './data/profiles.json';
import Gauge from './components/Gauge.jsx';
import Badge from './components/Badge.jsx';
import HazardBars from './components/HazardBars.jsx';
import BodyMap from './components/BodyMap.jsx';
import Chart from './components/Chart.jsx';
import CheckInModal from './components/CheckInModal.jsx';
import InstructionDrawer from './components/InstructionDrawer.jsx';
import hazard3 from './data/hazard3.json';
import AutonomyChip from './components/AutonomyChip.jsx';
import PvtTest from './components/PvtTest.jsx';

/* ── Preset config ── */
const PRESETS = [
  { key: 'iss',   label: 'ISS MISSION',   icon: '🛸' },
  { key: 'lunar', label: 'LUNAR SURFACE', icon: '🌕' },
  { key: 'mars',  label: 'MARS TRANSIT',  icon: '🔴' },
];

/* ── Node → all its measurement IDs (CONTRACT.md §3) ── */
const NODE_MEASUREMENTS = {
  eyes:  ['1B-i'],
  brain: ['3A-i', '3A-ii', '3B-i', '3B-ii'],
  heart: ['1A-i', '1A-ii'],
  lungs: ['4A-i', '4A-ii'],
  bones: ['1B-ii'],
  whole: ['2A-i', '2A-ii', '2B-i', '2B-ii', '4B-i', '4B-ii'],
};

const STATUS_COLOR = {
  GREEN: '#00ff9d', YELLOW: '#ffc800', RED: '#ff3355',
  NOMINAL: '#00ff9d', WARNING: '#ffc800', CRITICAL: '#ff3355',
};

/* ── localStorage helpers ── */
const LS_KEY = (preset) => `ahm_state_${preset}`;
const LS_HIST = (preset) => `ahm_hist_${preset}`;

function saveState(preset, state) {
  try { localStorage.setItem(LS_KEY(preset), JSON.stringify(state)); } catch (_) {}
}
function loadState(preset) {
  try { return JSON.parse(localStorage.getItem(LS_KEY(preset))); } catch (_) { return null; }
}
function saveHistory(preset, hist) {
  try { localStorage.setItem(LS_HIST(preset), JSON.stringify(hist)); } catch (_) {}
}
function loadHistory(preset) {
  try { return JSON.parse(localStorage.getItem(LS_HIST(preset))) ?? []; } catch (_) { return []; }
}
function clearSaved(preset) {
  try {
    localStorage.removeItem(LS_KEY(preset));
    localStorage.removeItem(LS_HIST(preset));
  } catch (_) {}
}

/* ── UI helpers ── */
function CornerMark({ pos }) {
  return (
    <div style={{
      position: 'absolute', width: 10, height: 10,
      borderColor: 'rgba(0,180,255,0.4)', borderStyle: 'solid',
      ...(pos === 'tl' && { top: 0, left: 0,   borderWidth: '1px 0 0 1px' }),
      ...(pos === 'tr' && { top: 0, right: 0,  borderWidth: '1px 1px 0 0' }),
      ...(pos === 'bl' && { bottom: 0, left: 0,  borderWidth: '0 0 1px 1px' }),
      ...(pos === 'br' && { bottom: 0, right: 0, borderWidth: '0 1px 1px 0' }),
    }} />
  );
}

function Panel({ children, style = {} }) {
  return (
    <div style={{ position: 'relative', background: '#060f1e',
      border: '1px solid rgba(0,180,255,0.15)', overflow: 'hidden', ...style }}>
      <CornerMark pos="tl" /><CornerMark pos="tr" />
      <CornerMark pos="bl" /><CornerMark pos="br" />
      {children}
    </div>
  );
}

function HudLabel({ children, style = {} }) {
  return (
    <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 9, fontWeight: 600,
      letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(0,180,255,0.6)',
      display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, ...style }}>
      <span style={{ width: 2, height: 10, background: 'rgba(0,180,255,0.5)', flexShrink: 0 }} />
      {children}
    </div>
  );
}

function MeasurementRow({ label, value, unit, status, zScore, selected, onClick }) {
  const color = STATUS_COLOR[status] ?? '#c8e4ff';
  return (
    <button onClick={onClick} style={{
      width: '100%', textAlign: 'left',
      background: selected ? 'rgba(0,180,255,0.07)' : 'transparent',
      border: `1px solid ${selected ? 'rgba(0,180,255,0.25)' : 'rgba(0,180,255,0.07)'}`,
      padding: '7px 10px', cursor: 'pointer', marginBottom: 4, transition: 'all 0.15s',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, color: 'rgba(200,228,255,0.7)' }}>
          {label}
        </span>
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, fontWeight: 700,
          color, textShadow: `0 0 6px ${color}60` }}>
          {value != null ? value : '—'}
          {unit && <span style={{ fontSize: 8, opacity: 0.6, marginLeft: 3 }}>{unit}</span>}
        </span>
      </div>
      {zScore != null && (
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 8,
          color: 'rgba(0,180,255,0.4)', marginTop: 2 }}>
          z {zScore > 0 ? '+' : ''}{zScore.toFixed(2)}
        </div>
      )}
    </button>
  );
}

/* ═══════════════════════════════════════════════════
   MAIN APP
═══════════════════════════════════════════════════ */
export default function App() {
  const [activePreset, setActivePreset] = useState('mars');
  const [showDrawer, setShowDrawer]     = useState(false);
  const [drawerRecord, setDrawerRecord] = useState(hazard3[0]);

  /* Phase 4: load persisted state from localStorage on mount */
  const [liveState, setLiveState] = useState(() => loadState('mars'));
  const [checkInHistory, setCheckInHistory] = useState(() => loadHistory('mars'));

  const [selectedNode, setSelectedNode]   = useState('eyes');
  const [selectedMeasId, setSelectedMeasId] = useState('1B-i');

  /* Phase 4: PVT flow — 'hidden' | 'pvt' | 'checkin' */
  const [modalFlow, setModalFlow] = useState('hidden');
  const [pvtResult, setPvtResult] = useState(null);

  const [checkedActs, setCheckedActs] = useState({});

  /* ── Evaluate ── */
  const data = useMemo(() => {
    return liveState ? evaluate(liveState) : evaluate(activePreset);
  }, [liveState, activePreset]);

  const { overall, badge, autonomy, hazards, nodes, cards,
    measurements, autonomyDetails, profile: engineProfile } = data;
  const profile = profiles[activePreset] ?? engineProfile ?? {};

  /* ── Node measurements ── */
  const nodeMeasIds  = NODE_MEASUREMENTS[selectedNode] ?? [];
  const nodeMeasList = nodeMeasIds
    .map(id => ({ id, ...measurements?.[id] }))
    .filter(m => m.value != null || m.name);

  const chartMeasId = nodeMeasList.some(m => m.id === selectedMeasId)
    ? selectedMeasId : nodeMeasList[0]?.id ?? null;
  const chartMeas = chartMeasId ? measurements?.[chartMeasId] : null;

  function handleSelectNode(nodeId) {
    setSelectedNode(nodeId);
    const first = NODE_MEASUREMENTS[nodeId]?.[0];
    if (first) setSelectedMeasId(first);
  }

  const allActions = (cards ?? []).flatMap(c =>
    (c.actions ?? []).map(a => ({ ...a, cardTitle: c.title, cardId: c.id }))
  );
  function toggleAction(id) {
    setCheckedActs(prev => ({ ...prev, [id]: !prev[id] }));
  }

  /* ── Phase 4: Check-in submit with persistence + history ── */
  const handleCheckInSubmit = useCallback((reading, meta) => {
    const currentState = liveState ?? activePreset;
    const nextState = addReading(currentState, {
      ...reading,
      symptoms: meta.symptoms.reduce((acc, key) => ({ ...acc, [key]: true }), {}),
    });

    // Evaluate to get the new score for the history entry
    const nextData = evaluate(nextState);

    const histEntry = {
      timestamp:  meta.timestamp,
      missionDay: nextState.profile?.missionDay,
      overall:    nextData.overall,
      badge:      nextData.badge,
      redFlag:    meta.redFlag,
      pvt:        pvtResult,
    };

    const nextHist = [histEntry, ...checkInHistory].slice(0, 20); // keep last 20

    setLiveState(nextState);
    setCheckInHistory(nextHist);
    setPvtResult(null);
    setCheckedActs({});
    setModalFlow('hidden');

    // Persist to localStorage
    saveState(activePreset, nextState);
    saveHistory(activePreset, nextHist);
  }, [liveState, activePreset, checkInHistory, pvtResult]);

  /* ── Phase 4: Preset switch with persistence ── */
  function handlePresetSwitch(key) {
    setActivePreset(key);
    const saved = loadState(key);
    setLiveState(saved);
    setCheckInHistory(loadHistory(key));
    setSelectedNode('eyes');
    setSelectedMeasId('1B-i');
    setCheckedActs({});
    setPvtResult(null);
    setModalFlow('hidden');
  }

  /* ── Phase 4: Reset preset (clear saved state) ── */
  function handleReset() {
    clearSaved(activePreset);
    setLiveState(null);
    setCheckInHistory([]);
    setCheckedActs({});
    setPvtResult(null);
  }

  /* ── Phase 4: Keyboard shortcuts ── */
  useEffect(() => {
    function onKey(e) {
      if (e.target.tagName === 'INPUT') return;
      if (e.key === 'c' || e.key === 'C') setModalFlow(f => f === 'hidden' ? 'pvt' : 'hidden');
      if (e.key === '1') handlePresetSwitch('iss');
      if (e.key === '2') handlePresetSwitch('lunar');
      if (e.key === '3') handlePresetSwitch('mars');
      if (e.key === 'Escape') setModalFlow('hidden');
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const isCritical   = badge === 'CRITICAL';
  const bannerAlert  = autonomyDetails?.bannerAlert;
  const delaySeconds = autonomyDetails?.commDelaySec;
  const isLive       = liveState !== null;
  const lastCheckIn  = checkInHistory[0];

  return (
    <div style={{ height: '100vh', background: '#030e1c', color: '#c8e4ff',
      fontFamily: "'Inter', sans-serif", display: 'flex', flexDirection: 'column',
      overflow: 'hidden' }}>

      {/* ══ HEADER ══ */}
      <header style={{ borderBottom: '1px solid rgba(0,180,255,0.12)', padding: '9px 18px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: '#040e1f', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 34, height: 34, borderRadius: '50%',
            border: '2px solid rgba(0,180,255,0.4)', background: 'rgba(0,180,255,0.07)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: "'Orbitron', sans-serif", fontSize: 7,
            color: 'rgba(0,180,255,0.7)', letterSpacing: '0.08em', flexShrink: 0 }}>
            NASA
          </div>
          <div>
            <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 13, fontWeight: 700,
              letterSpacing: '0.15em', color: '#c8e4ff' }}>
              ASTRONAUT HEALTH MONITORING SYSTEM
            </div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 8,
              color: 'rgba(0,180,255,0.4)', letterSpacing: '0.07em', marginTop: 1 }}>
              AUTONOMOUS DECISION SUPPORT · REAL-TIME TELEMETRY
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {isLive && (
            <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 8, fontWeight: 700,
              letterSpacing: '0.15em', color: '#00ff9d', background: 'rgba(0,255,157,0.08)',
              border: '1px solid rgba(0,255,157,0.3)', padding: '2px 10px' }}>
              ◆ LIVE
            </span>
          )}
          <AutonomyChip autonomy={autonomy} delaySeconds={delaySeconds} />
          <Badge status={badge} />
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 8,
            color: 'rgba(0,180,255,0.35)', textAlign: 'right', lineHeight: 1.7 }}>
            <div>MET {(isLive ? liveState?.profile?.missionDay : profile.missionDay) ?? '—'}/{profile.missionTotalDays ?? '—'} DAYS</div>
            <div>UTC {new Date().toISOString().slice(11, 19)}</div>
          </div>
        </div>
      </header>

      {/* ══ CRITICAL BANNER ══ */}
      {isCritical && bannerAlert && (
        <div className="crit-blink" style={{ background: 'rgba(255,51,85,0.08)',
          borderBottom: '1px solid rgba(255,51,85,0.25)', padding: '4px 18px',
          display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <span style={{ color: '#ff3355', fontFamily: "'Orbitron', sans-serif",
            fontSize: 8, fontWeight: 700, letterSpacing: '0.15em', flexShrink: 0 }}>
            ■ ALERT
          </span>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 8,
            color: 'rgba(255,100,120,0.9)', letterSpacing: '0.04em' }}>
            {bannerAlert}
          </span>
        </div>
      )}

      {/* ══ MAIN GRID ══ */}
      <main style={{ flex: 1, minHeight: 0, display: 'grid',
        gridTemplateColumns: '210px 1fr 290px', gap: 8,
        padding: '8px 10px 10px', overflow: 'hidden' }}>

        {/* ════ LEFT ════ */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 8,
          minHeight: 0, overflowY: 'auto' }}>

          {/* Profile */}
          <Panel style={{ padding: 14, flexShrink: 0 }}>
            <HudLabel>Crew Profile</HudLabel>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
              <div style={{ width: 52, height: 52, border: '1px solid rgba(0,180,255,0.3)',
                background: 'rgba(0,180,255,0.05)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>
                {profile.sex === 'F' ? '👩‍🚀' : '👨‍🚀'}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 10, fontWeight: 600,
                color: '#c8e4ff', letterSpacing: '0.07em', marginBottom: 6 }}>
                {profile.name ?? '—'}
              </div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 8,
                color: 'rgba(0,180,255,0.5)', lineHeight: 1.9 }}>
                <div>{profile.role ?? '—'}</div>
                <div>{profile.missionType ?? '—'}</div>
                <div>Age {profile.age ?? '—'} · Sex {profile.sex ?? '—'}</div>
                <div>{profile.heightCm ?? '—'} cm · {profile.weightKg ?? '—'} kg</div>
              </div>
            </div>
            {/* Phase 4: last check-in */}
            {lastCheckIn && (
              <div style={{ marginTop: 10, padding: '6px 8px',
                background: 'rgba(0,255,157,0.05)', border: '1px solid rgba(0,255,157,0.15)',
                textAlign: 'center' }}>
                <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 7,
                  letterSpacing: '0.12em', color: 'rgba(0,255,157,0.6)', marginBottom: 2 }}>
                  LAST CHECK-IN · DAY {lastCheckIn.missionDay}
                </div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 8,
                  color: 'rgba(0,255,157,0.8)' }}>
                  {lastCheckIn.timestamp?.slice(11, 16)} UTC
                </div>
                {lastCheckIn.pvt && (
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 8,
                    color: 'rgba(0,180,255,0.5)', marginTop: 3 }}>
                    PVT {lastCheckIn.pvt.median_ms} ms · {lastCheckIn.pvt.lapses} lapses
                  </div>
                )}
              </div>
            )}
          </Panel>

          {/* Scenario Presets */}
          <Panel style={{ padding: 14, flexShrink: 0 }}>
            <HudLabel>Scenario Presets</HudLabel>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 7,
              color: 'rgba(0,180,255,0.3)', marginBottom: 8 }}>
              Keys: 1 · 2 · 3
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {PRESETS.map(({ key, label, icon }) => {
                const active = activePreset === key;
                const hasSaved = loadState(key) !== null;
                return (
                  <button key={key} onClick={() => handlePresetSwitch(key)} aria-pressed={active}
                    style={{ width: '100%', padding: '7px 10px',
                      background: active ? 'rgba(0,180,255,0.12)' : 'rgba(0,180,255,0.03)',
                      border: active ? '1px solid rgba(0,180,255,0.5)' : '1px solid rgba(0,180,255,0.1)',
                      color: active ? '#00b4ff' : 'rgba(200,228,255,0.45)',
                      cursor: 'pointer', fontFamily: "'Orbitron', sans-serif", fontSize: 9,
                      fontWeight: 600, letterSpacing: '0.12em', textAlign: 'left',
                      display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s' }}>
                    <span style={{ fontSize: 13 }}>{icon}</span>
                    <span style={{ flex: 1 }}>{label}</span>
                    {hasSaved && (
                      <span style={{ fontSize: 7, color: '#00ff9d', opacity: 0.7 }}>●</span>
                    )}
                  </button>
                );
              })}
            </div>
            {/* Reset saved data */}
            {isLive && (
              <button onClick={handleReset}
                style={{ width: '100%', marginTop: 8, padding: '5px 0',
                  background: 'none', border: '1px solid rgba(255,51,85,0.2)',
                  color: 'rgba(255,51,85,0.5)', cursor: 'pointer',
                  fontFamily: "'Orbitron', sans-serif", fontSize: 7, letterSpacing: '0.12em' }}>
                RESET TO SEED DATA
              </button>
            )}
          </Panel>

          {/* Comm Status */}
          {autonomyDetails && (
            <Panel style={{ padding: 12, flexShrink: 0 }}>
              <HudLabel>Comm Status</HudLabel>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9,
                color: 'rgba(0,180,255,0.5)', lineHeight: 1.9 }}>
                <div>Delay: <span style={{ color: '#ffc800' }}>{autonomyDetails.commDelayMin ?? 0} MIN OW</span></div>
                <div>MedKit: <span style={{ color: autonomyDetails.medKitStatus === 'WARNING' ? '#ffc800' : '#00ff9d' }}>
                  {autonomyDetails.medKitStockPct ?? 100}%</span></div>
                <div>Care: <span style={{ color: '#c8e4ff' }}>{autonomyDetails.levelOfCare ?? '—'}</span></div>
              </div>
            </Panel>
          )}

          {/* Phase 4: Check-in history log */}
          {checkInHistory.length > 0 && (
            <Panel style={{ padding: 12, flexShrink: 0 }}>
              <HudLabel>Check-In Log</HudLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {checkInHistory.slice(0, 5).map((h, i) => {
                  const col = STATUS_COLOR[h.badge] ?? '#c8e4ff';
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center',
                      gap: 8, padding: '5px 8px',
                      background: 'rgba(0,180,255,0.03)',
                      border: '1px solid rgba(0,180,255,0.08)' }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%',
                        background: col, flexShrink: 0 }} />
                      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 8,
                        color: 'rgba(0,180,255,0.5)', flex: 1 }}>
                        Day {h.missionDay}
                      </span>
                      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 8,
                        color: col, fontWeight: 700 }}>
                        {h.overall}
                      </span>
                      {h.redFlag && (
                        <span style={{ color: '#ff3355', fontSize: 8 }}>⚠</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </Panel>
          )}

          {/* Log Check-In button — Phase 4: starts PVT flow first */}
          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button onClick={() => setModalFlow('pvt')}
              style={{ width: '100%', padding: '10px 0',
                background: 'rgba(0,180,255,0.07)', border: '1px solid rgba(0,180,255,0.3)',
                color: '#00b4ff', cursor: 'pointer', fontFamily: "'Orbitron', sans-serif",
                fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,180,255,0.14)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,180,255,0.07)'; }}>
              + LOG DAILY CHECK-IN
            </button>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 7,
              color: 'rgba(0,180,255,0.25)', textAlign: 'center' }}>
              shortcut: C
            </div>

            <button
              onClick={() => {
                setDrawerRecord(hazard3[0]);
                setShowDrawer(true);
              }}
              style={{
                width:         '100%',
                padding:       '8px 0',
                background:    'rgba(0,180,255,0.04)',
                border:        '1px solid rgba(0,180,255,0.2)',
                color:         'rgba(0,180,255,0.7)',
                cursor:        'pointer',
                fontFamily:    "'Orbitron', sans-serif",
                fontSize:      9,
                fontWeight:    600,
                letterSpacing: '0.12em',
                transition:    'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,180,255,0.1)'; e.currentTarget.style.color = '#c8e4ff'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,180,255,0.04)'; e.currentTarget.style.color = 'rgba(0,180,255,0.7)'; }}
            >
              📖 INSTRUCTION DRAWER (SLEEP)
            </button>
          </div>
        </aside>

        {/* ════ CENTER ════ */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 8,
          minHeight: 0, overflow: 'hidden' }}>

          <Panel style={{ padding: 14, display: 'flex', flexDirection: 'row',
            gap: 16, flex: 1, minHeight: 0, overflow: 'hidden' }}>

            {/* Gauge + measurements */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
              flexShrink: 0, width: 200 }}>
              <HudLabel>Overall Health Score</HudLabel>
              <Gauge score={overall} status={badge} />
              <div style={{ marginTop: -6 }}><Badge status={badge} /></div>

              {nodeMeasList.length > 0 && (
                <div style={{ width: '100%', marginTop: 12 }}>
                  <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 7,
                    letterSpacing: '0.14em', color: 'rgba(0,180,255,0.4)',
                    marginBottom: 6, paddingLeft: 2 }}>
                    {selectedNode.toUpperCase()} INDICATORS
                  </div>
                  {nodeMeasList.map(m => (
                    <MeasurementRow key={m.id} label={m.name ?? m.id}
                      value={m.value} unit={m.unit} status={m.status} zScore={m.zScore}
                      selected={m.id === chartMeasId}
                      onClick={() => setSelectedMeasId(m.id)} />
                  ))}
                </div>
              )}
            </div>

            <div style={{ width: 1, background: 'rgba(0,180,255,0.1)',
              flexShrink: 0, alignSelf: 'stretch' }} />

            {/* Body Map */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', overflowY: 'auto', paddingRight: 4 }}>
              <HudLabel>Anatomical Health Nodes</HudLabel>
              <BodyMap nodes={nodes} selectedNode={selectedNode} onSelectNode={handleSelectNode} />
            </div>
          </Panel>

          <Panel style={{ padding: 14, flexShrink: 0 }}>
            <HazardBars hazards={hazards} autonomy={autonomy} />
          </Panel>
        </section>

        {/* ════ RIGHT ════ */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 8,
          minHeight: 0, overflow: 'hidden' }}>

          <Panel style={{ padding: 14, flexShrink: 0 }}>
            <HudLabel>7-Day Space vs. Earth Baseline</HudLabel>
            <Chart measurement={chartMeas} measurementKey={chartMeasId} />
          </Panel>

          <Panel style={{ padding: 0, flex: 1, minHeight: 0, display: 'flex',
            flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '12px 14px 6px',
              borderBottom: '1px solid rgba(0,180,255,0.08)', flexShrink: 0 }}>
              <HudLabel>Immediate Actions &amp; Guidance</HudLabel>
            </div>
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '10px 14px 14px' }}>

              {data.overallDetails && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
                  gap: 6, marginBottom: 12 }}>
                  {[
                    { label: 'RED',    value: data.overallDetails.redCount,    color: '#ff3355' },
                    { label: 'YELLOW', value: data.overallDetails.yellowCount, color: '#ffc800' },
                    { label: 'STREAK', value: `${data.overallDetails.streakDays}d`, color: 'rgba(0,180,255,0.6)' },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ padding: '5px 8px',
                      border: '1px solid rgba(0,180,255,0.1)',
                      background: 'rgba(0,180,255,0.03)', textAlign: 'center' }}>
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 13,
                        fontWeight: 700, color }}>{value}</div>
                      <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 7,
                        letterSpacing: '0.1em', color: 'rgba(0,180,255,0.4)', marginTop: 2 }}>{label}</div>
                    </div>
                  ))}
                </div>
              )}

              {allActions.length === 0 ? (
                <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 9,
                  color: 'rgba(0,180,255,0.3)', lineHeight: 1.8 }}>
                  No critical actions required.<br />All systems nominal.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                  {allActions.map((act) => {
                    const done = !!checkedActs[act.id];
                    return (
                      <label key={act.id} style={{ display: 'flex', alignItems: 'flex-start',
                        gap: 8, cursor: 'pointer' }}>
                        <span onClick={() => toggleAction(act.id)} style={{
                          flexShrink: 0, marginTop: 1, width: 14, height: 14,
                          border: `1px solid ${done ? 'rgba(0,255,157,0.5)' : 'rgba(0,180,255,0.3)'}`,
                          background: done ? 'rgba(0,255,157,0.1)' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all 0.15s' }}>
                          {done && <span style={{ color: '#00ff9d', fontSize: 9, lineHeight: 1 }}>✓</span>}
                        </span>
                        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 10,
                          lineHeight: 1.55,
                          color: done ? 'rgba(200,228,255,0.25)' : 'rgba(200,228,255,0.8)',
                          textDecoration: done ? 'line-through' : 'none', transition: 'all 0.2s' }}>
                          {act.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}

              {(cards ?? []).filter(c => c.summary).length > 0 && (
                <div style={{ marginTop: 14, borderTop: '1px solid rgba(0,180,255,0.08)',
                  paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {(cards ?? []).filter(c => c.summary).map(c => (
                    <div key={c.id}>
                      <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 7,
                        letterSpacing: '0.12em', color: 'rgba(0,180,255,0.45)', marginBottom: 3 }}>
                        [{c.id}] {c.title?.toUpperCase()}
                      </div>
                      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 10,
                        color: 'rgba(200,228,255,0.45)', lineHeight: 1.55 }}>
                        {c.summary}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Panel>
        </aside>
      </main>

      {/* ══ PHASE 4: PVT MODAL ══ */}
      {modalFlow === 'pvt' && (
        <div className="modal-overlay" onClick={() => setModalFlow('hidden')}>
          <div className="hud-panel fade-in" onClick={e => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 420, padding: 24 }}>
            <PvtTest
              onComplete={(result) => {
                setPvtResult(result);
                setModalFlow('checkin');
              }}
              onCancel={() => {
                /* Skip PVT, go straight to check-in */
                setPvtResult(null);
                setModalFlow('checkin');
              }}
            />
            <button
              onClick={() => setModalFlow('checkin')}
              style={{ width: '100%', marginTop: 12, padding: '7px 0',
                background: 'none', border: '1px solid rgba(0,180,255,0.15)',
                color: 'rgba(0,180,255,0.4)', cursor: 'pointer',
                fontFamily: "'Orbitron', sans-serif", fontSize: 8, letterSpacing: '0.12em' }}>
              SKIP PVT → GO TO CHECK-IN FORM
            </button>
          </div>
        </div>
      )}

      {/* ══ CHECK-IN MODAL ══ */}
      {modalFlow === 'checkin' && (
        <CheckInModal
          open
          onClose={() => setModalFlow('hidden')}
          onSubmit={handleCheckInSubmit}
          pvt={pvtResult}
        />
      )}

      {/* ══ INSTRUCTION DRAWER ══ */}
      {showDrawer && (
        <InstructionDrawer
          record={drawerRecord ?? hazard3[0]}
          open={showDrawer}
          onClose={() => setShowDrawer(false)}
        />
      )}
    </div>
  );
}
