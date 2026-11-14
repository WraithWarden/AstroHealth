import { useState, useMemo } from 'react';
import evaluate from './engine/index.js';
import profiles from './data/profiles.json';
import Gauge from './components/Gauge.jsx';
import Badge from './components/Badge.jsx';
import HazardBars from './components/HazardBars.jsx';
import BodyMap from './components/BodyMap.jsx';
import Chart from './components/Chart.jsx';
import CheckInModal from './components/CheckInModal.jsx';
import InstructionDrawer from './components/InstructionDrawer.jsx';
import hazard3 from './data/hazard3.json';

/* ── Preset config ── */
const PRESETS = [
  { key: 'iss',   label: 'ISS MISSION',   icon: '🛸' },
  { key: 'lunar', label: 'LUNAR SURFACE', icon: '🌕' },
  { key: 'mars',  label: 'MARS TRANSIT',  icon: '🔴' },
];

/* ── Panel with corner marks ── */
function CornerMark({ pos }) {
  return (
    <div style={{
      position:    'absolute',
      width: 10, height: 10,
      borderColor: 'rgba(0,180,255,0.4)',
      borderStyle: 'solid',
      ...(pos === 'tl' && { top: 0, left: 0,  borderWidth: '1px 0 0 1px' }),
      ...(pos === 'tr' && { top: 0, right: 0, borderWidth: '1px 1px 0 0' }),
      ...(pos === 'bl' && { bottom: 0, left: 0,  borderWidth: '0 0 1px 1px' }),
      ...(pos === 'br' && { bottom: 0, right: 0, borderWidth: '0 1px 1px 0' }),
    }} />
  );
}

function Panel({ children, style = {} }) {
  return (
    <div style={{
      position:   'relative',
      background: '#060f1e',
      border:     '1px solid rgba(0,180,255,0.15)',
      overflow:   'hidden',
      ...style,
    }}>
      <CornerMark pos="tl" /><CornerMark pos="tr" />
      <CornerMark pos="bl" /><CornerMark pos="br" />
      {children}
    </div>
  );
}

function HudLabel({ children }) {
  return (
    <div style={{
      fontFamily:    "'Orbitron', sans-serif",
      fontSize:      9,
      fontWeight:    600,
      letterSpacing: '0.18em',
      textTransform: 'uppercase',
      color:         'rgba(0,180,255,0.6)',
      display:       'flex',
      alignItems:    'center',
      gap:           6,
      marginBottom:  10,
    }}>
      <span style={{ width: 2, height: 10, background: 'rgba(0,180,255,0.5)', flexShrink: 0 }}/>
      {children}
    </div>
  );
}

export default function App() {
  const [activePreset, setActivePreset] = useState('mars');
  const [selectedNode, setSelectedNode] = useState('eyes');
  const [showCheckIn, setShowCheckIn]   = useState(false);
  const [showDrawer, setShowDrawer]     = useState(false);
  const [drawerRecord, setDrawerRecord] = useState(hazard3[0]);
  const [checkedActs, setCheckedActs]   = useState({});

  const data = useMemo(() => evaluate(activePreset), [activePreset]);
  const {
    overall, badge, autonomy, hazards, nodes, cards,
    measurements, autonomyDetails, profile: engineProfile,
  } = data;

  const profile = profiles[activePreset] ?? engineProfile ?? {};

  const selectedMeasurementKey = Object.keys(measurements ?? {}).find(
    k => measurements[k].node === selectedNode
  );
  const selectedMeasurement = selectedMeasurementKey
    ? measurements[selectedMeasurementKey]
    : null;

  const allActions = (cards ?? []).flatMap(c =>
    (c.actions ?? []).map(a => ({ ...a, cardTitle: c.title, cardId: c.id }))
  );

  function toggleAction(id) {
    setCheckedActs(prev => ({ ...prev, [id]: !prev[id] }));
  }

  const isCritical  = badge === 'CRITICAL';
  const bannerAlert = autonomyDetails?.bannerAlert;

  /* node status color lookup */
  const nodeColors = {
    GREEN:  '#00ff9d',
    YELLOW: '#ffc800',
    RED:    '#ff3355',
  };

  return (
    /*
      Root: 100vh, flex-col, overflow hidden
      → prevents the page from ever scrolling globally
    */
    <div style={{
      height:         '100vh',
      background:     '#030e1c',
      color:          '#c8e4ff',
      fontFamily:     "'Inter', sans-serif",
      display:        'flex',
      flexDirection:  'column',
      overflow:       'hidden',
    }}>

      {/* ══ HEADER ══ */}
      <header style={{
        borderBottom: '1px solid rgba(0,180,255,0.12)',
        padding:      '9px 18px',
        display:      'flex',
        alignItems:   'center',
        justifyContent: 'space-between',
        background:   '#040e1f',
        flexShrink:   0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 34, height: 34, borderRadius: '50%',
            border: '2px solid rgba(0,180,255,0.4)',
            background: 'rgba(0,180,255,0.07)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: "'Orbitron', sans-serif", fontSize: 7,
            color: 'rgba(0,180,255,0.7)', letterSpacing: '0.08em', flexShrink: 0,
          }}>
            NASA
          </div>
          <div>
            <div style={{
              fontFamily: "'Orbitron', sans-serif", fontSize: 13, fontWeight: 700,
              letterSpacing: '0.15em', color: '#c8e4ff',
            }}>
              ASTRONAUT HEALTH MONITORING SYSTEM
            </div>
            <div style={{
              fontFamily: "'Space Mono', monospace", fontSize: 8,
              color: 'rgba(0,180,255,0.4)', letterSpacing: '0.07em', marginTop: 1,
            }}>
              AUTONOMOUS DECISION SUPPORT · REAL-TIME TELEMETRY
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Badge status={badge} />
          <div style={{
            fontFamily: "'Space Mono', monospace", fontSize: 8,
            color: 'rgba(0,180,255,0.35)', textAlign: 'right', lineHeight: 1.7,
          }}>
            <div>MET {profile.missionDay ?? '—'}/{profile.missionTotalDays ?? '—'} DAYS</div>
            <div>UTC {new Date().toISOString().slice(11, 19)}</div>
          </div>
        </div>
      </header>

      {/* ══ CRITICAL BANNER ══ */}
      {isCritical && bannerAlert && (
        <div
          className="crit-blink"
          style={{
            background:   'rgba(255,51,85,0.08)',
            borderBottom: '1px solid rgba(255,51,85,0.25)',
            padding:      '4px 18px',
            display:      'flex',
            alignItems:   'center',
            gap:          10,
            flexShrink:   0,
          }}
        >
          <span style={{
            color: '#ff3355', fontFamily: "'Orbitron', sans-serif",
            fontSize: 8, fontWeight: 700, letterSpacing: '0.15em', flexShrink: 0,
          }}>
            ■ ALERT
          </span>
          <span style={{
            fontFamily: "'Space Mono', monospace", fontSize: 8,
            color: 'rgba(255,100,120,0.9)', letterSpacing: '0.04em',
          }}>
            {bannerAlert}
          </span>
        </div>
      )}

      {/*
        ══ MAIN 3-COLUMN GRID ══
        flex: 1 + minHeight: 0 → fills remaining height exactly, no overflow
        overflow: hidden → columns handle their own scroll
      */}
      <main style={{
        flex:                   1,
        minHeight:              0,
        display:                'grid',
        gridTemplateColumns:    '210px 1fr 290px',
        gridTemplateRows:       '1fr',
        gap:                    8,
        padding:                '8px 10px 10px',
        overflow:               'hidden',
      }}>

        {/* ════════════════════════════════════
            LEFT COLUMN — Profile + Presets
        ════════════════════════════════════ */}
        <aside style={{
          display:        'flex',
          flexDirection:  'column',
          gap:            8,
          minHeight:      0,
          overflowY:      'auto',   /* only this column scrolls if content is tall */
        }}>

          {/* Crew Profile */}
          <Panel style={{ padding: 14, flexShrink: 0 }}>
            <HudLabel>Crew Profile</HudLabel>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
              <div style={{
                width: 52, height: 52,
                border: '1px solid rgba(0,180,255,0.3)',
                background: 'rgba(0,180,255,0.05)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26,
              }}>
                {profile.sex === 'F' ? '👩‍🚀' : '👨‍🚀'}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontFamily: "'Orbitron', sans-serif", fontSize: 10, fontWeight: 600,
                color: '#c8e4ff', letterSpacing: '0.07em', marginBottom: 6,
              }}>
                {profile.name ?? '—'}
              </div>
              <div style={{
                fontFamily: "'Space Mono', monospace", fontSize: 8,
                color: 'rgba(0,180,255,0.5)', lineHeight: 1.9,
              }}>
                <div>{profile.role ?? '—'}</div>
                <div>{profile.missionType ?? '—'}</div>
                <div>Age {profile.age ?? '—'} · Sex {profile.sex ?? '—'}</div>
                <div>{profile.heightCm ?? '—'} cm · {profile.weightKg ?? '—'} kg</div>
              </div>
            </div>
          </Panel>

          {/* Scenario Presets */}
          <Panel style={{ padding: 14, flexShrink: 0 }}>
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
                      width:         '100%',
                      padding:       '7px 10px',
                      background:    active ? 'rgba(0,180,255,0.12)' : 'rgba(0,180,255,0.03)',
                      border:        active ? '1px solid rgba(0,180,255,0.5)' : '1px solid rgba(0,180,255,0.1)',
                      color:         active ? '#00b4ff' : 'rgba(200,228,255,0.45)',
                      cursor:        'pointer',
                      fontFamily:    "'Orbitron', sans-serif",
                      fontSize:      9,
                      fontWeight:    600,
                      letterSpacing: '0.12em',
                      textAlign:     'left',
                      display:       'flex',
                      alignItems:    'center',
                      gap:           8,
                      transition:    'all 0.2s',
                    }}
                  >
                    <span style={{ fontSize: 13 }}>{icon}</span>
                    {label}
                  </button>
                );
              })}
            </div>
          </Panel>

          {/* Comm / Autonomy Status */}
          {autonomyDetails && (
            <Panel style={{ padding: 12, flexShrink: 0 }}>
              <HudLabel>Comm Status</HudLabel>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9,
                color: 'rgba(0,180,255,0.5)', lineHeight: 1.9 }}>
                <div>Delay: <span style={{ color: '#ffc800' }}>{autonomyDetails.commDelayMin ?? 0} MIN OW</span></div>
                <div>MedKit: <span style={{
                  color: autonomyDetails.medKitStatus === 'WARNING' ? '#ffc800' : '#00ff9d'
                }}>{autonomyDetails.medKitStockPct ?? 100}%</span></div>
                <div>Care: <span style={{ color: '#c8e4ff' }}>{autonomyDetails.levelOfCare ?? '—'}</span></div>
              </div>
            </Panel>
          )}

          {/* Log Check-In (pinned to bottom of left col via marginTop auto) */}
          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button
              onClick={() => setShowCheckIn(true)}
              style={{
                width:         '100%',
                padding:       '10px 0',
                background:    'rgba(0,180,255,0.07)',
                border:        '1px solid rgba(0,180,255,0.3)',
                color:         '#00b4ff',
                cursor:        'pointer',
                fontFamily:    "'Orbitron', sans-serif",
                fontSize:      10,
                fontWeight:    700,
                letterSpacing: '0.15em',
                transition:    'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,180,255,0.14)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,180,255,0.07)'; }}
            >
              + LOG DAILY CHECK-IN
            </button>

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

        {/* ════════════════════════════════════
            CENTER COLUMN — Gauge+Body / Hazards
        ════════════════════════════════════ */}
        <section style={{
          display:       'flex',
          flexDirection: 'column',
          gap:           8,
          minHeight:     0,
          overflow:      'hidden',
        }}>

          {/*
            TOP PANEL: Overall Health Score (Gauge) + Anatomical Body Map
            side by side in one single bordered panel
          */}
          <Panel style={{
            padding:    14,
            display:    'flex',
            flexDirection: 'row',
            gap:        16,
            flex:       1,
            minHeight:  0,
            overflow:   'hidden',
          }}>
            {/* Left half — Gauge + Badge + selected node chip */}
            <div style={{
              display:        'flex',
              flexDirection:  'column',
              alignItems:     'center',
              justifyContent: 'flex-start',
              flexShrink:     0,
              width:          200,
            }}>
              <HudLabel>Overall Health Score</HudLabel>
              <Gauge score={overall} status={badge} />
              <div style={{ marginTop: -6 }}>
                <Badge status={badge} />
              </div>

              {/* Selected node reading - shown below gauge */}
              {selectedMeasurement && (
                <div style={{
                  marginTop:  14,
                  width:      '100%',
                  padding:    '8px 12px',
                  background: 'rgba(0,180,255,0.04)',
                  border:     '1px solid rgba(0,180,255,0.12)',
                }}>
                  <div style={{
                    fontFamily:    "'Orbitron', sans-serif",
                    fontSize:      8,
                    letterSpacing: '0.12em',
                    color:         'rgba(0,180,255,0.55)',
                    marginBottom:  4,
                  }}>
                    {selectedMeasurementKey?.toUpperCase()}
                  </div>
                  <div style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize:   15,
                    fontWeight: 700,
                    color:      nodeColors[selectedMeasurement.status] ?? '#c8e4ff',
                    textShadow: `0 0 8px ${nodeColors[selectedMeasurement.status] ?? '#c8e4ff'}80`,
                  }}>
                    {selectedMeasurement.value}
                    <span style={{ fontSize: 9, opacity: 0.6, marginLeft: 4 }}>
                      {selectedMeasurement.unit}
                    </span>
                  </div>
                  {selectedMeasurement.zScore != null && (
                    <div style={{
                      fontFamily: "'Space Mono', monospace",
                      fontSize:   8,
                      color:      'rgba(0,180,255,0.4)',
                      marginTop:  2,
                    }}>
                      z-score {selectedMeasurement.zScore > 0 ? '+' : ''}
                      {selectedMeasurement.zScore?.toFixed(2)}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Divider */}
            <div style={{
              width:      1,
              background: 'rgba(0,180,255,0.1)',
              flexShrink: 0,
              alignSelf:  'stretch',
            }}/>

            {/* Right half — Body Map */}
            <div style={{
              flex:           1,
              display:        'flex',
              flexDirection:  'column',
              alignItems:     'center',
              overflowY:      'auto',
              paddingRight:   4,
            }}>
              <HudLabel>Anatomical Health Nodes</HudLabel>
              <BodyMap
                nodes={nodes}
                selectedNode={selectedNode}
                onSelectNode={setSelectedNode}
              />
            </div>
          </Panel>

          {/* BOTTOM PANEL — Hazard Risk Bars */}
          <Panel style={{ padding: 14, flexShrink: 0 }}>
            <HazardBars hazards={hazards} autonomy={autonomy} />
          </Panel>
        </section>

        {/* ════════════════════════════════════
            RIGHT COLUMN — Chart + Actions
            overflow:hidden here → only inner actions div scrolls
        ════════════════════════════════════ */}
        <aside style={{
          display:       'flex',
          flexDirection: 'column',
          gap:           8,
          minHeight:     0,
          overflow:      'hidden',  /* crucial — no page-level scroll */
        }}>

          {/* 7-Day Trend Chart (fixed height, no scroll) */}
          <Panel style={{ padding: 14, flexShrink: 0 }}>
            <HudLabel>7-Day Space vs. Earth Baseline</HudLabel>
            <Chart
              measurement={selectedMeasurement}
              measurementKey={selectedMeasurementKey}
            />
          </Panel>

          {/*
            Actions panel — flex:1 so it fills remaining height.
            overflow:hidden on the outer panel, then inner div scrolls.
          */}
          <Panel style={{
            padding:       0,
            flex:          1,
            minHeight:     0,
            display:       'flex',
            flexDirection: 'column',
            overflow:      'hidden',
          }}>
            {/* Sticky label header */}
            <div style={{
              padding:      '12px 14px 6px',
              borderBottom: '1px solid rgba(0,180,255,0.08)',
              flexShrink:   0,
            }}>
              <HudLabel>Immediate Actions &amp; Guidance</HudLabel>
            </div>

            {/* ← ONLY THIS DIV SCROLLS → */}
            <div style={{
              flex:      1,
              minHeight: 0,
              overflowY: 'auto',
              padding:   '10px 14px 14px',
            }}>
              {/* Actions checklist */}
              {allActions.length === 0 ? (
                <p style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 9,
                  color: 'rgba(0,180,255,0.3)', lineHeight: 1.8,
                }}>
                  No critical actions required.<br/>All systems nominal.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                  {allActions.map((act) => {
                    const done = !!checkedActs[act.id];
                    return (
                      <label
                        key={act.id}
                        style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer' }}
                      >
                        <span
                          onClick={() => toggleAction(act.id)}
                          style={{
                            flexShrink:  0,
                            marginTop:   1,
                            width:       14,
                            height:      14,
                            border:      `1px solid ${done ? 'rgba(0,255,157,0.5)' : 'rgba(0,180,255,0.3)'}`,
                            background:  done ? 'rgba(0,255,157,0.1)' : 'transparent',
                            display:     'flex',
                            alignItems:  'center',
                            justifyContent: 'center',
                            transition:  'all 0.15s',
                          }}
                        >
                          {done && (
                            <span style={{ color: '#00ff9d', fontSize: 9, lineHeight: 1 }}>✓</span>
                          )}
                        </span>
                        <span style={{
                          fontFamily:     "'Inter', sans-serif",
                          fontSize:       10,
                          lineHeight:     1.55,
                          color:          done ? 'rgba(200,228,255,0.25)' : 'rgba(200,228,255,0.8)',
                          textDecoration: done ? 'line-through' : 'none',
                          transition:     'all 0.2s',
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
                <div style={{
                  marginTop:  14,
                  borderTop:  '1px solid rgba(0,180,255,0.08)',
                  paddingTop: 12,
                  display:    'flex',
                  flexDirection: 'column',
                  gap:        10,
                }}>
                  {(cards ?? []).filter(c => c.summary).map(c => (
                    <div key={c.id}>
                      <div style={{
                        fontFamily:    "'Orbitron', sans-serif",
                        fontSize:      7,
                        letterSpacing: '0.12em',
                        color:         'rgba(0,180,255,0.45)',
                        marginBottom:  3,
                      }}>
                        [{c.id}] {c.title?.toUpperCase()}
                      </div>
                      <div style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize:   10,
                        color:      'rgba(200,228,255,0.45)',
                        lineHeight: 1.55,
                      }}>
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

      {/* ══ CHECK-IN MODAL ══ */}
      {showCheckIn && <CheckInModal onClose={() => setShowCheckIn(false)} />}

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
