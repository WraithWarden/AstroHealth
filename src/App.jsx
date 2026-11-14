import { useState, useMemo } from 'react';
import evaluate from './engine/index.js';
import profiles from './data/profiles.json';
import Gauge from './components/Gauge.jsx';
import Badge from './components/Badge.jsx';
import HazardBars from './components/HazardBars.jsx';
import BodyMap from './components/BodyMap.jsx';
import Chart from './components/Chart.jsx';
import CheckInModal from './components/CheckInModal.jsx';

/* ── Preset config ── */
const PRESETS = [
  { key: 'iss',   label: 'ISS MISSION',    icon: '🛸' },
  { key: 'lunar', label: 'LUNAR SURFACE',  icon: '🌕' },
  { key: 'mars',  label: 'MARS TRANSIT',   icon: '🔴' },
];

/* ── Shared style helpers ── */
const panelStyle = (extra = {}) => ({
  position:   'relative',
  background: '#060f1e',
  border:     '1px solid rgba(0,180,255,0.15)',
  ...extra,
});

function CornerMark({ pos }) {
  const style = {
    position:    'absolute',
    width:       10, height: 10,
    borderColor: 'rgba(0,180,255,0.4)',
    borderStyle: 'solid',
    ...(pos === 'tl' && { top: 0, left: 0, borderWidth: '1px 0 0 1px' }),
    ...(pos === 'tr' && { top: 0, right: 0, borderWidth: '1px 1px 0 0' }),
    ...(pos === 'bl' && { bottom: 0, left: 0, borderWidth: '0 0 1px 1px' }),
    ...(pos === 'br' && { bottom: 0, right: 0, borderWidth: '0 1px 1px 0' }),
  };
  return <div style={style} />;
}

function Panel({ children, style = {}, className = '' }) {
  return (
    <div style={{ position: 'relative', background: '#060f1e',
      border: '1px solid rgba(0,180,255,0.15)', overflow: 'hidden', ...style }}
      className={className}>
      <CornerMark pos="tl" />
      <CornerMark pos="tr" />
      <CornerMark pos="bl" />
      <CornerMark pos="br" />
      {children}
    </div>
  );
}

function HudLabel({ children }) {
  return (
    <div style={{
      fontFamily: "'Orbitron', sans-serif", fontSize: 9, fontWeight: 600,
      letterSpacing: '0.18em', textTransform: 'uppercase',
      color: 'rgba(0,180,255,0.6)', display: 'flex', alignItems: 'center', gap: 6,
      marginBottom: 10,
    }}>
      <span style={{ width: 2, height: 10, background: 'rgba(0,180,255,0.5)', flexShrink: 0 }} />
      {children}
    </div>
  );
}

export default function App() {
  const [activePreset, setActivePreset] = useState('mars');
  const [selectedNode, setSelectedNode] = useState('eyes');
  const [showCheckIn, setShowCheckIn]   = useState(false);
  const [checkedActs, setCheckedActs]   = useState({});

  /* pull data from Person 1's engine */
  const data = useMemo(() => evaluate(activePreset), [activePreset]);
  const {
    overall, badge, autonomy, hazards, nodes, cards,
    measurements, autonomyDetails, profile: engineProfile,
  } = data;

  /* Profile from profiles.json */
  const profile = profiles[activePreset] ?? engineProfile ?? {};

  /* Selected node measurement */
  const selectedMeasurementKey = Object.keys(measurements ?? {}).find(
    k => measurements[k].node === selectedNode
  );
  const selectedMeasurement = selectedMeasurementKey
    ? measurements[selectedMeasurementKey]
    : null;

  /* Actions from cards with actions[] */
  const allActions = (cards ?? []).flatMap(c =>
    (c.actions ?? []).map(a => ({ ...a, cardTitle: c.title, cardId: c.id }))
  );

  function toggleAction(id) {
    setCheckedActs(prev => ({ ...prev, [id]: !prev[id] }));
  }

  const isCritical = badge === 'CRITICAL';
  const bannerAlert = autonomyDetails?.bannerAlert;

  return (
    <div style={{ minHeight: '100vh', background: '#030e1c', color: '#c8e4ff',
      fontFamily: "'Inter', sans-serif", display: 'flex', flexDirection: 'column' }}>

      {/* ── HEADER ── */}
      <header style={{
        borderBottom: '1px solid rgba(0,180,255,0.12)',
        padding: '10px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: '#040e1f',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* NASA meatball placeholder */}
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            border: '2px solid rgba(0,180,255,0.4)',
            background: 'rgba(0,180,255,0.07)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: "'Orbitron', sans-serif", fontSize: 8, color: 'rgba(0,180,255,0.7)',
            letterSpacing: '0.08em', flexShrink: 0,
          }}>
            NASA
          </div>
          <div>
            <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 14, fontWeight: 700,
              letterSpacing: '0.15em', color: '#c8e4ff' }}>
              ASTRONAUT HEALTH MONITORING SYSTEM
            </div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9,
              color: 'rgba(0,180,255,0.4)', letterSpacing: '0.08em', marginTop: 1 }}>
              AUTONOMOUS DECISION SUPPORT · 36-HR SPRINT BUILD · REAL-TIME TELEMETRY
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Badge status={badge} />
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9,
            color: 'rgba(0,180,255,0.35)', textAlign: 'right', lineHeight: 1.6 }}>
            <div>MET: {profile.missionDay ?? '—'}/{profile.missionTotalDays ?? '—'} DAYS</div>
            <div>UTC: {new Date().toISOString().slice(11, 19)}</div>
          </div>
        </div>
      </header>

      {/* ── CRITICAL BANNER ── */}
      {isCritical && bannerAlert && (
        <div className="crit-blink" style={{
          background: 'rgba(255,51,85,0.1)', borderBottom: '1px solid rgba(255,51,85,0.3)',
          padding: '5px 20px', display: 'flex', alignItems: 'center', gap: 10,
          flexShrink: 0,
        }}>
          <span style={{ color: '#ff3355', fontFamily: "'Orbitron', sans-serif",
            fontSize: 9, fontWeight: 700, letterSpacing: '0.15em', flexShrink: 0 }}>
            ■ ALERT
          </span>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9,
            color: 'rgba(255,100,120,0.9)', letterSpacing: '0.05em' }}>
            {bannerAlert}
          </span>
        </div>
      )}

      {/* ── MAIN GRID ── */}
      <main style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '210px 1fr 1fr 268px',
        gap: 8,
        padding: '8px 10px 10px',
        minHeight: 0,
        overflow: 'hidden',
      }}>

        {/* ════ LEFT: Profile + Presets + Log btn ════ */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0, overflowY: 'auto' }}>

          {/* Profile card */}
          <Panel style={{ padding: 14 }}>
            <HudLabel>Crew Profile</HudLabel>
            {/* Avatar */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
              <div style={{
                width: 56, height: 56, border: '1px solid rgba(0,180,255,0.3)',
                background: 'rgba(0,180,255,0.05)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28,
              }}>
                {profile.sex === 'F' ? '👩‍🚀' : '👨‍🚀'}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 11, fontWeight: 600,
                color: '#c8e4ff', letterSpacing: '0.08em', marginBottom: 4 }}>
                {profile.name ?? '—'}
              </div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9,
                color: 'rgba(0,180,255,0.5)', lineHeight: 1.7 }}>
                <div>{profile.role ?? '—'}</div>
                <div>{profile.missionType ?? '—'}</div>
                <div>Age {profile.age ?? '—'} · Sex {profile.sex ?? '—'}</div>
                <div>{profile.heightCm ?? '—'} cm · {profile.weightKg ?? '—'} kg</div>
              </div>
            </div>
          </Panel>

          {/* Scenario presets */}
          <Panel style={{ padding: 14 }}>
            <HudLabel>Scenario Presets</HudLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {PRESETS.map(({ key, label, icon }) => {
                const active = activePreset === key;
                return (
                  <button
                    key={key}
                    onClick={() => { setActivePreset(key); setSelectedNode('eyes'); setCheckedActs({}); }}
                    aria-pressed={active}
                    style={{
                      width: '100%', padding: '7px 10px',
                      background:  active ? 'rgba(0,180,255,0.12)' : 'rgba(0,180,255,0.03)',
                      border:      active ? '1px solid rgba(0,180,255,0.5)' : '1px solid rgba(0,180,255,0.1)',
                      color:       active ? '#00b4ff' : 'rgba(200,228,255,0.5)',
                      cursor:      'pointer',
                      fontFamily:  "'Orbitron', sans-serif", fontSize: 9, fontWeight: 600,
                      letterSpacing: '0.12em', textAlign: 'left',
                      display:    'flex', alignItems: 'center', gap: 8,
                      transition: 'all 0.2s',
                    }}
                  >
                    <span style={{ fontSize: 14 }}>{icon}</span>
                    {label}
                  </button>
                );
              })}
            </div>
          </Panel>

          {/* Autonomy info */}
          {autonomyDetails && (
            <Panel style={{ padding: 12 }}>
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

          {/* Log Check-In button */}
          <button
            onClick={() => setShowCheckIn(true)}
            style={{
              width: '100%', padding: '10px 0',
              background: 'rgba(0,180,255,0.07)', border: '1px solid rgba(0,180,255,0.3)',
              color: '#00b4ff', cursor: 'pointer',
              fontFamily: "'Orbitron', sans-serif", fontSize: 10, fontWeight: 700,
              letterSpacing: '0.15em', marginTop: 'auto',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,180,255,0.14)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,180,255,0.07)'; }}
          >
            + LOG DAILY CHECK-IN
          </button>
        </aside>

        {/* ════ CENTER-LEFT: Gauge + Hazard Bars ════ */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0 }}>

          {/* Overall health score */}
          <Panel style={{ padding: '14px 14px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <HudLabel>Overall Health Score</HudLabel>
            <Gauge score={overall} status={badge} />
            <div style={{ marginTop: -4 }}>
              <Badge status={badge} />
            </div>
          </Panel>

          {/* Hazard bars */}
          <Panel style={{ padding: 14, flex: 1 }}>
            <HazardBars hazards={hazards} autonomy={autonomy} />
          </Panel>
        </section>

        {/* ════ CENTER-RIGHT: Anatomical Body Map ════ */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0 }}>
          <Panel style={{ padding: '14px 14px', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <HudLabel>Anatomical Health Nodes</HudLabel>

            <BodyMap
              nodes={nodes}
              selectedNode={selectedNode}
              onSelectNode={setSelectedNode}
            />

            {/* Selected node detail */}
            {selectedMeasurement && (
              <div style={{
                marginTop: 10, width: '100%', padding: '8px 10px',
                background: 'rgba(0,180,255,0.04)', border: '1px solid rgba(0,180,255,0.1)',
              }}>
                <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 9, letterSpacing: '0.12em',
                  color: 'rgba(0,180,255,0.6)', marginBottom: 4 }}>
                  {selectedMeasurementKey?.toUpperCase()}
                </div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, fontWeight: 700,
                  color: { GREEN: '#00ff9d', YELLOW: '#ffc800', RED: '#ff3355' }[selectedMeasurement.status] ?? '#c8e4ff' }}>
                  {selectedMeasurement.value} <span style={{ fontSize: 10, opacity: 0.7 }}>{selectedMeasurement.unit}</span>
                </div>
                {selectedMeasurement.zScore != null && (
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9,
                    color: 'rgba(0,180,255,0.4)', marginTop: 2 }}>
                    z = {selectedMeasurement.zScore > 0 ? '+' : ''}{selectedMeasurement.zScore?.toFixed(2)}
                  </div>
                )}
              </div>
            )}
          </Panel>
        </section>

        {/* ════ RIGHT: 7-Day Chart + Actions ════ */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0, overflowY: 'auto' }}>

          {/* 7-day chart */}
          <Panel style={{ padding: 14 }}>
            <HudLabel>7-Day Space vs. Earth Baseline</HudLabel>
            <Chart
              measurement={selectedMeasurement}
              measurementKey={selectedMeasurementKey}
            />
          </Panel>

          {/* Immediate actions */}
          <Panel style={{ padding: 14, flex: 1, overflowY: 'auto' }}>
            <HudLabel>Immediate Actions &amp; Guidance</HudLabel>

            {allActions.length === 0 ? (
              <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 9,
                color: 'rgba(0,180,255,0.3)', lineHeight: 1.7 }}>
                No critical actions required.<br/>All systems nominal.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {allActions.map((act) => {
                  const done = !!checkedActs[act.id];
                  return (
                    <label key={act.id} style={{ display: 'flex', alignItems: 'flex-start',
                      gap: 8, cursor: 'pointer' }}>
                      <span
                        onClick={() => toggleAction(act.id)}
                        style={{
                          flexShrink:  0,
                          marginTop:   1,
                          width:       14, height: 14,
                          border:      `1px solid ${done ? 'rgba(0,255,157,0.5)' : 'rgba(0,180,255,0.3)'}`,
                          background:  done ? 'rgba(0,255,157,0.12)' : 'transparent',
                          display:     'flex', alignItems: 'center', justifyContent: 'center',
                          transition:  'all 0.15s',
                        }}
                      >
                        {done && <span style={{ color: '#00ff9d', fontSize: 9, lineHeight: 1 }}>✓</span>}
                      </span>
                      <span style={{
                        fontFamily:  "'Inter', sans-serif", fontSize: 10, lineHeight: 1.5,
                        color:       done ? 'rgba(200,228,255,0.3)' : 'rgba(200,228,255,0.8)',
                        textDecoration: done ? 'line-through' : 'none',
                        transition:  'all 0.2s',
                      }}>
                        {act.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}

            {/* Card summaries */}
            {(cards ?? []).filter(c => c.summary).length > 0 && (
              <div style={{ marginTop: 12, borderTop: '1px solid rgba(0,180,255,0.08)', paddingTop: 10 }}>
                {(cards ?? []).filter(c => c.summary).map(c => (
                  <div key={c.id} style={{ marginBottom: 8 }}>
                    <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 8,
                      letterSpacing: '0.12em', color: 'rgba(0,180,255,0.5)', marginBottom: 2 }}>
                      [{c.id}] {c.title?.toUpperCase()}
                    </div>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 10,
                      color: 'rgba(200,228,255,0.5)', lineHeight: 1.5 }}>
                      {c.summary}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </aside>
      </main>

      {/* ── CHECK-IN MODAL ── */}
      {showCheckIn && <CheckInModal onClose={() => setShowCheckIn(false)} />}
    </div>
  );
}
