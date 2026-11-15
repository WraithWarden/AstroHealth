import { useState, useMemo, useCallback, useEffect } from 'react';
import { evaluate, addReading } from './engine/index.js';
import profiles from './data/profiles.json';
import Gauge from './components/Gauge.jsx';
import Badge from './components/Badge.jsx';
import HazardBars from './components/HazardBars.jsx';
import BodyMap from './components/BodyMap.jsx';
import Chart from './components/Chart.jsx';
import CheckInModal from './components/CheckInModal.jsx';
import CheckInHost from './components/CheckInHost.jsx';
import InstructionDrawer from './components/InstructionDrawer.jsx';
import GuidancePanel, { actionsFor } from './components/GuidancePanel.jsx';
import AutonomyChip from './components/AutonomyChip.jsx';
import PvtTest from './components/PvtTest.jsx';
import MarsTriageModal from './components/MarsTriageModal.jsx';
import ReadinessStrip from './components/ReadinessStrip.jsx';
import OnsdCaliperModal from './components/OnsdCaliperModal.jsx';
import { computeActionProgress, buildReportPacket, downloadReportPacket } from './utils/reportPacket.js';
import hazard1 from './data/hazard1.json';
import hazard2 from './data/hazard2.json';
import hazard3 from './data/hazard3.json';
import hazard4 from './data/hazard4.json';
import hazard5 from './data/hazard5.json';

const ALL_RECORDS = [...hazard1, ...hazard2, ...hazard3, ...hazard4, ...hazard5];
const RECORD_BY_ID = Object.fromEntries(ALL_RECORDS.map(r => [r.id, r]));

const PRESETS = [
  { key: 'iss',   label: 'ISS · LEO',       icon: '🛸' },
  { key: 'lunar', label: 'Lunar · Artemis', icon: '🌕' },
  { key: 'mars',  label: 'Mars · Transit',  icon: '🔴' },
];

const NODE_MEASUREMENTS = {
  eyes:  ['1B-i'],
  brain: ['3A-i', '3A-ii', '3B-i', '3B-ii'],
  heart: ['1A-i', '1A-ii'],
  lungs: ['4A-i', '4A-ii'],
  bones: ['1B-ii'],
  whole: ['2A-i', '2A-ii', '2B-i', '2B-ii', '4B-i', '4B-ii'],
};

const NODE_TITLES = {
  eyes:  'Eyes & Neuro-Ocular',
  brain: 'Central Nervous System',
  heart: 'Cardiovascular',
  lungs: 'Respiratory & Cabin Gas',
  bones: 'Skeletal & Mineral',
  whole: 'Systemic, Radiation & Metabolic',
};

const STATUS_META = {
  GREEN:    { color: '#34d399', icon: '◆', label: 'Nominal'  },
  YELLOW:   { color: '#fbbf24', icon: '▲', label: 'Warning'  },
  RED:      { color: '#fb7185', icon: '■', label: 'Critical' },
  NOMINAL:  { color: '#34d399', icon: '◆', label: 'Nominal'  },
  WARNING:  { color: '#fbbf24', icon: '▲', label: 'Warning'  },
  CRITICAL: { color: '#fb7185', icon: '■', label: 'Critical' },
};

/* ── localStorage helpers ── */
const LS_STATE_KEY   = (preset) => `astro_state_${preset}`;
const LS_HISTORY_KEY = (preset) => `astro_history_${preset}`;

function loadState(preset) {
  try {
    const raw = localStorage.getItem(LS_STATE_KEY(preset));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveState(preset, state) {
  try { localStorage.setItem(LS_STATE_KEY(preset), JSON.stringify(state)); } catch { /* quota */ }
}

function loadHistory(preset) {
  try {
    const raw = localStorage.getItem(LS_HISTORY_KEY(preset));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveHistory(preset, history) {
  try { localStorage.setItem(LS_HISTORY_KEY(preset), JSON.stringify(history)); } catch { /* quota */ }
}

function clearSaved(preset) {
  try {
    localStorage.removeItem(LS_STATE_KEY(preset));
    localStorage.removeItem(LS_HISTORY_KEY(preset));
  } catch { /* ignore */ }
}

function Panel({ children, style = {}, className = '' }) {
  return (
    <div className={`hud-panel ${className}`} style={style}>
      {children}
    </div>
  );
}

function HudLabel({ children, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
      <div className="hud-label">{children}</div>
      {right && <div>{right}</div>}
    </div>
  );
}

function MeasurementRow({ label, value, secondaryValue, unit, status, zScore, cadenceStatus, selected, onClick }) {
  const meta = STATUS_META[status] ?? STATUS_META.GREEN;
  const shownVal =
    value == null
      ? '—'
      : secondaryValue != null
        ? `${value}/${secondaryValue}`
        : value;

  const cadenceBadge =
    cadenceStatus === 'OVERDUE'
      ? { text: 'OVERDUE', color: '#fb7185', bg: 'rgba(244, 63, 94, 0.14)', border: 'rgba(244, 63, 94, 0.42)' }
      : cadenceStatus === 'DUE_NOW'
        ? { text: 'DUE NOW', color: '#fbbf24', bg: 'rgba(245, 158, 11, 0.14)', border: 'rgba(245, 158, 11, 0.4)' }
        : null;

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%',
        textAlign: 'left',
        borderRadius: 8,
        background: selected ? 'rgba(56, 189, 248, 0.12)' : 'rgba(15, 23, 42, 0.5)',
        border: selected ? '1px solid #38bdf8' : '1px solid rgba(148, 163, 184, 0.14)',
        padding: '9px 11px',
        cursor: 'pointer',
        marginBottom: 6,
        transition: 'all 0.15s ease',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: selected ? 600 : 500, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span aria-hidden="true" style={{ color: meta.color, fontSize: 9 }}>{meta.icon}</span>
          <span>{label}</span>
        </span>
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, fontWeight: 700, color: meta.color, flexShrink: 0 }}>
          {shownVal}
          {unit && <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 400, marginLeft: 3 }}>{unit}</span>}
        </span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: '#64748b' }}>
          {zScore != null ? `z ${zScore > 0 ? '+' : ''}${zScore.toFixed(2)} · ${meta.label}` : meta.label}
        </span>
        {cadenceBadge && (
          <span style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 9.5,
            fontWeight: 700,
            letterSpacing: '0.04em',
            color: cadenceBadge.color,
            background: cadenceBadge.bg,
            border: `1px solid ${cadenceBadge.border}`,
            borderRadius: 4,
            padding: '1px 6px',
          }}>
            {cadenceBadge.text}
          </span>
        )}
      </div>
    </button>
  );
}

export default function App() {
  const [activePreset, setActivePreset] = useState('mars');
  const [showDrawer, setShowDrawer]     = useState(false);
  const [drawerRecord, setDrawerRecord] = useState(hazard3[0]);

  const [liveState, setLiveState]           = useState(() => loadState('mars'));
  const [checkInHistory, setCheckInHistory] = useState(() => loadHistory('mars'));

  const [selectedNode, setSelectedNode]     = useState('eyes');
  const [selectedMeasId, setSelectedMeasId] = useState('1B-i');

  const [modalFlow, setModalFlow] = useState('hidden');
  const [pvtResult, setPvtResult] = useState(null);

  const [guidanceDoneById, setGuidanceDoneById] = useState({});
  const [showMarsModal, setShowMarsModal]       = useState(false);
  const [marsStepsDone, setMarsStepsDone]       = useState({});
  const [marsNotes, setMarsNotes]               = useState('');
  const [queuedForGround, setQueuedForGround]   = useState(false);
  const [showOnsdCaliper, setShowOnsdCaliper]   = useState(false);

  /* ── Evaluate ── */
  const data = useMemo(() => {
    return liveState ? evaluate(liveState) : evaluate(activePreset);
  }, [liveState, activePreset]);

  const {
    overall, badge, autonomy, hazards, nodes,
    measurements, autonomyDetails, dueSummary, profile: engineProfile,
  } = data;
  const profile = profiles[activePreset] ?? engineProfile ?? {};

  const actionProgress = useMemo(() => computeActionProgress({
    measurements,
    recordById: RECORD_BY_ID,
    actionsFor,
    guidanceDoneCountById: guidanceDoneById,
    autonomy,
    marsStepsDone,
  }), [measurements, guidanceDoneById, autonomy, marsStepsDone]);

  const dueLabels = useMemo(
    () => (dueSummary?.dueIds || []).map((id) => measurements?.[id]?.name || id),
    [dueSummary, measurements]
  );

  /* ── Node measurements ── */
  const nodeMeasIds  = NODE_MEASUREMENTS[selectedNode] ?? [];
  const nodeMeasList = nodeMeasIds
    .map(id => ({ id, ...measurements?.[id] }))
    .filter(m => m.value != null || m.name);

  const chartMeasId = nodeMeasList.some(m => m.id === selectedMeasId)
    ? selectedMeasId : nodeMeasList[0]?.id ?? null;
  const chartMeas = chartMeasId ? measurements?.[chartMeasId] : null;

  const guidanceRecord = RECORD_BY_ID[chartMeasId] ?? null;
  const guidanceMeasValue =
    chartMeasId === '1A-i' && chartMeas?.value != null && chartMeas?.secondaryValue != null
      ? { sbp: chartMeas.value, dbp: chartMeas.secondaryValue }
      : chartMeas?.value ?? null;
  const guidanceMeasStatus = (chartMeas?.status ?? 'green').toLowerCase();

  function handleSelectNode(nodeId) {
    setSelectedNode(nodeId);
    const first = NODE_MEASUREMENTS[nodeId]?.[0];
    if (first) setSelectedMeasId(first);
  }

  const recordStateUpdate = useCallback((nextState, redFlag = false) => {
    const nextData = evaluate(nextState);
    const histEntry = {
      timestamp: new Date().toISOString(),
      missionDay: nextState.profile?.missionDay,
      overall: nextData.overall,
      badge: nextData.badge,
      redFlag,
    };
    const nextHist = [histEntry, ...checkInHistory].slice(0, 20);
    setLiveState(nextState);
    setCheckInHistory(nextHist);
    setGuidanceDoneById({});
    saveState(activePreset, nextState);
    saveHistory(activePreset, nextHist);
  }, [activePreset, checkInHistory]);

  const handleCheckInSubmit = useCallback((reading, meta) => {
    const currentState = liveState ?? activePreset;
    const nextState = addReading(currentState, {
      ...reading,
      symptoms: meta.symptoms.reduce((acc, key) => ({ ...acc, [key]: true }), {}),
    });

    const nextData = evaluate(nextState);
    const histEntry = {
      timestamp:  meta.timestamp,
      missionDay: nextState.profile?.missionDay,
      overall:    nextData.overall,
      badge:      nextData.badge,
      redFlag:    meta.redFlag,
      pvt:        pvtResult,
    };

    const nextHist = [histEntry, ...checkInHistory].slice(0, 20);
    setLiveState(nextState);
    setCheckInHistory(nextHist);
    setPvtResult(null);
    setGuidanceDoneById({});
    setModalFlow('hidden');

    saveState(activePreset, nextState);
    saveHistory(activePreset, nextHist);
  }, [liveState, activePreset, checkInHistory, pvtResult]);

  const handleDownloadPacket = useCallback((format = 'json') => {
    const packet = buildReportPacket({
      data,
      recordById: RECORD_BY_ID,
      actionsFor,
      guidanceDoneCountById: guidanceDoneById,
      marsStepsDone,
      marsNotes,
      queuedForGround: queuedForGround || autonomy === 'A2',
    });
    downloadReportPacket(packet, format);
    if (autonomy === 'A2') {
      setQueuedForGround(true);
      setMarsStepsDone((prev) => ({ ...prev, queue_ground: true }));
    }
  }, [data, guidanceDoneById, marsStepsDone, marsNotes, queuedForGround, autonomy]);

  const handleApplyOnsd = useCallback((measuredMm) => {
    const currentState = liveState ?? activePreset;
    const nextState = addReading(currentState, { '1B-i': measuredMm });
    recordStateUpdate(nextState, false);
  }, [liveState, activePreset, recordStateUpdate]);

  function handlePresetSwitch(key) {
    setActivePreset(key);
    const saved = loadState(key);
    setLiveState(saved);
    setCheckInHistory(loadHistory(key));
    setSelectedNode('eyes');
    setSelectedMeasId('1B-i');
    setGuidanceDoneById({});
    setMarsStepsDone({});
    setMarsNotes('');
    setQueuedForGround(false);
    setShowMarsModal(false);
    setShowOnsdCaliper(false);
    setPvtResult(null);
    setModalFlow('hidden');
  }

  function handleReset() {
    clearSaved(activePreset);
    setLiveState(null);
    setCheckInHistory([]);
    setGuidanceDoneById({});
    setMarsStepsDone({});
    setMarsNotes('');
    setQueuedForGround(false);
    setPvtResult(null);
  }

  useEffect(() => {
    function onKey(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'c' || e.key === 'C') setModalFlow(f => f === 'hidden' ? 'checkin' : 'hidden');
      if (e.key === '1') handlePresetSwitch('iss');
      if (e.key === '2') handlePresetSwitch('lunar');
      if (e.key === '3') handlePresetSwitch('mars');
      if (e.key === 'Escape') setModalFlow('hidden');
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const isCritical   = badge === 'CRITICAL';
  const bannerAlert  = autonomyDetails?.bannerAlert;
  const delaySeconds = autonomyDetails?.commDelaySec;
  const delayMin     = Math.max(1, Math.round((delaySeconds ?? 0) / 60));
  const isLive       = liveState !== null;
  const currentDay   = (isLive ? liveState?.profile?.missionDay : profile.missionDay) ?? engineProfile?.missionDay ?? '—';

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'transparent',
      color: '#f1f5f9',
      fontFamily: "'Inter', sans-serif",
    }}>

      {/* ══ TOP NAVIGATION BAR ══ */}
      <header style={{
        borderBottom: '1px solid rgba(148, 163, 184, 0.14)',
        padding: '10px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        background: 'rgba(11, 17, 30, 0.92)',
        backdropFilter: 'blur(8px)',
        position: 'sticky',
        top: 0,
        zIndex: 30,
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 9,
            border: '1px solid rgba(56, 189, 248, 0.4)',
            background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.2) 0%, rgba(15, 23, 42, 0.9) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: "'Orbitron', sans-serif",
            fontSize: 9,
            fontWeight: 700,
            color: '#38bdf8',
            letterSpacing: '0.06em',
            flexShrink: 0,
          }}>
            NASA
          </div>
          <div>
            <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 13.5, fontWeight: 700, letterSpacing: '0.08em', color: '#f8fafc' }}>
              ASTROHEALTH
            </div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: '#94a3b8' }}>
              Autonomous Crew Medical Decision Support
            </div>
          </div>
        </div>

        {/* Center: Mission Regime Selector */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: 4,
          borderRadius: 9,
          background: 'rgba(15, 23, 42, 0.85)',
          border: '1px solid rgba(148, 163, 184, 0.16)',
        }}>
          {PRESETS.map((p) => {
            const active   = activePreset === p.key;
            const hasSaved = loadState(p.key) !== null;
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => handlePresetSwitch(p.key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 12,
                  fontWeight: active ? 600 : 500,
                  color: active ? '#f8fafc' : '#94a3b8',
                  background: active ? 'rgba(56, 189, 248, 0.18)' : 'transparent',
                  border: active ? '1px solid rgba(56, 189, 248, 0.45)' : '1px solid transparent',
                  transition: 'all 0.15s ease',
                }}
              >
                <span aria-hidden="true">{p.icon}</span>
                <span>{p.label}</span>
                {hasSaved && (
                  <span title="Has logged check-ins" style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
                )}
              </button>
            );
          })}
          {isLive && (
            <button
              type="button"
              onClick={handleReset}
              title="Reset preset to initial baseline"
              style={{
                padding: '5px 9px',
                borderRadius: 6,
                background: 'rgba(244, 63, 94, 0.12)',
                border: '1px solid rgba(244, 63, 94, 0.35)',
                color: '#fb7185',
                fontFamily: "'Inter', sans-serif",
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Reset
            </button>
          )}
        </div>

        {/* Right: Mission Clock, Autonomy Chip, Status Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: '#94a3b8', textAlign: 'right', paddingRight: 4 }}>
            <span style={{ color: '#e2e8f0', fontWeight: 700 }}>DAY {currentDay}</span>
            <span style={{ color: '#64748b' }}> / {profile.missionTotalDays ?? '—'}</span>
          </div>
          <AutonomyChip autonomy={autonomy} delaySeconds={delaySeconds} />
          <Badge status={badge} />
        </div>
      </header>

      {/* ══ UNIFIED AUTONOMOUS / CRITICAL TRIAGE BAR ══ */}
      {(autonomy === 'A2' || (isCritical && bannerAlert)) && (
        <div style={{
          background: 'rgba(244, 63, 94, 0.1)',
          borderBottom: '1px solid rgba(244, 63, 94, 0.3)',
          padding: '8px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 12,
              fontWeight: 700,
              color: '#fb7185',
              background: 'rgba(244, 63, 94, 0.16)',
              border: '1px solid rgba(244, 63, 94, 0.4)',
              borderRadius: 5,
              padding: '2px 8px',
            }}>
              {autonomy === 'A2'
                ? `■ Autonomous mode: ${delayMin} min one-way delay`
                : '■ Critical Clinical Alert'}
            </span>
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: '#fecdd3' }}>
              {bannerAlert || 'Earth-Independent Crew Medical Officer triage protocol active.'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {autonomy === 'A2' && (
              <button
                type="button"
                onClick={() => setShowMarsModal(true)}
                style={{
                  padding: '5px 12px',
                  borderRadius: 6,
                  background: 'rgba(244, 63, 94, 0.18)',
                  border: '1px solid rgba(244, 63, 94, 0.5)',
                  color: '#ffe4e6',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 11.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                CMO Offline Checklist ({actionProgress.marsCompleted}/4)
              </button>
            )}
            <button
              type="button"
              onClick={() => handleDownloadPacket('json')}
              style={{
                padding: '5px 12px',
                borderRadius: 6,
                background: 'rgba(56, 189, 248, 0.15)',
                border: '1px solid rgba(56, 189, 248, 0.4)',
                color: '#e0f2fe',
                fontFamily: "'Inter', sans-serif",
                fontSize: 11.5,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              ⬇ Report Packet
            </button>
          </div>
        </div>
      )}

      {/* ══ MAIN 3-COLUMN WORKSPACE ══ */}
      <main style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '310px minmax(460px, 1fr) 360px',
        gap: 12,
        padding: '12px 16px',
        maxWidth: 1880,
        width: '100%',
        margin: '0 auto',
        alignItems: 'start',
      }}>

        {/* ════ LEFT COLUMN: CREW, READINESS, CHECK-IN & HAZARDS ════ */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Crew Profile + Readiness Strip */}
          <Panel style={{ padding: 15 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid rgba(148, 163, 184, 0.12)' }}>
              <div style={{
                width: 46,
                height: 46,
                borderRadius: 10,
                border: '1px solid rgba(56, 189, 248, 0.35)',
                background: 'rgba(56, 189, 248, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
                flexShrink: 0,
              }}>
                {profile.sex === 'F' ? '👩‍🚀' : '👨‍🚀'}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 700, color: '#f8fafc' }}>
                  {profile.name ?? 'Crew Member'}
                </div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11.5, color: '#94a3b8', marginTop: 1 }}>
                  {profile.role ?? 'Mission Specialist'} · {profile.regime ?? activePreset.toUpperCase()}
                </div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10.5, color: '#64748b', marginTop: 2 }}>
                  ID {profile.id ?? '—'} · Age {profile.age ?? '—'} ({profile.sex ?? '—'})
                </div>
              </div>
            </div>

            {data.overallDetails && (
              <ReadinessStrip
                overallDetails={data.overallDetails}
                dueSummary={dueSummary}
                actionProgress={actionProgress}
                dueLabels={dueLabels}
                onDownloadJson={() => handleDownloadPacket('json')}
                onDownloadTxt={() => handleDownloadPacket('txt')}
              />
            )}
          </Panel>

          {/* Daily Check-In & Reaction Test */}
          <Panel style={{ padding: 15 }}>
            <HudLabel>Daily Check-In & Vigilance</HudLabel>
            <CheckInHost
              preset={activePreset}
              state={liveState ?? activePreset}
              addReading={addReading}
              evaluate={(s) => evaluate(s)}
              onUpdate={(newState, output, metaResult) => {
                const nextData = output ?? evaluate(newState);
                const histEntry = {
                  timestamp:  new Date().toISOString(),
                  missionDay: newState?.profile?.missionDay ?? newState?.day,
                  overall:    nextData.overall,
                  badge:      nextData.badge,
                  redFlag:    Boolean(metaResult?.redFlag),
                };
                const nextHist = [histEntry, ...checkInHistory].slice(0, 20);
                setLiveState(newState);
                setCheckInHistory(nextHist);
                setGuidanceDoneById({});
                saveState(activePreset, newState);
                saveHistory(activePreset, nextHist);
              }}
              auto={{
                radiation: measurements?.['2A-i']?.value ?? 0.48,
                co2: measurements?.['4A-ii']?.value ?? 2.3,
              }}
            />

            {/* Recent Check-Ins Log */}
            {checkInHistory.length > 0 && (
              <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(148, 163, 184, 0.12)' }}>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 10.5, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                  Recent Check-Ins ({checkInHistory.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 95, overflowY: 'auto' }}>
                  {checkInHistory.slice(0, 5).map((h, i) => {
                    const meta = STATUS_META[h.badge] ?? STATUS_META.NOMINAL;
                    return (
                      <div
                        key={i}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '5px 8px',
                          borderRadius: 6,
                          background: 'rgba(15, 23, 42, 0.55)',
                          border: '1px solid rgba(148, 163, 184, 0.12)',
                          fontSize: 11,
                        }}
                      >
                        <span style={{ fontFamily: "'Space Mono', monospace", color: '#cbd5e1' }}>
                          Day {h.missionDay}
                        </span>
                        <span style={{ fontFamily: "'Space Mono', monospace", color: meta.color, fontWeight: 700 }}>
                          {meta.icon} {h.overall}/100 {h.redFlag ? '⚠' : ''}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Panel>

          {/* NASA Hazard Risk Scores */}
          <Panel style={{ padding: 15 }}>
            <HazardBars hazards={hazards} autonomy={autonomy} delaySeconds={delaySeconds} />
          </Panel>
        </aside>

        {/* ════ CENTER COLUMN: HEALTH INDEX, NODE INDICATORS & BODY MAP ════ */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Panel style={{ padding: 18, display: 'grid', gridTemplateColumns: '255px 1fr', gap: 20, alignItems: 'start' }}>

            {/* Left sub-pane: Overall Gauge + Selected Node Indicators */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', borderRight: '1px solid rgba(148, 163, 184, 0.12)', paddingRight: 18 }}>
              <div style={{ width: '100%' }}>
                <HudLabel>Overall Health Index</HudLabel>
              </div>
              <Gauge score={overall} status={badge} />
              <div style={{ marginTop: -2, marginBottom: 14 }}>
                <Badge status={badge} />
              </div>

              {nodeMeasList.length > 0 && (
                <div style={{ width: '100%', paddingTop: 12, borderTop: '1px solid rgba(148, 163, 184, 0.12)' }}>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                    {NODE_TITLES[selectedNode] || selectedNode} ({nodeMeasList.length})
                  </div>
                  {nodeMeasList.map(m => (
                    <MeasurementRow
                      key={m.id}
                      label={m.name ?? m.id}
                      value={m.value}
                      secondaryValue={m.secondaryValue}
                      unit={m.unit}
                      status={m.status}
                      zScore={m.zScore}
                      cadenceStatus={m.cadenceStatus}
                      selected={m.id === chartMeasId}
                      onClick={() => setSelectedMeasId(m.id)}
                    />
                  ))}
                  {chartMeasId === '1B-i' && (
                    <button
                      type="button"
                      onClick={() => setShowOnsdCaliper(true)}
                      style={{
                        width: '100%',
                        marginTop: 4,
                        padding: '8px 10px',
                        borderRadius: 7,
                        background: 'rgba(56, 189, 248, 0.12)',
                        border: '1px solid rgba(56, 189, 248, 0.38)',
                        color: '#38bdf8',
                        fontFamily: "'Inter', sans-serif",
                        fontSize: 11.5,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      ⌖ Open ONSD 2-Click Caliper
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Right sub-pane: Anatomical Body Map */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 8 }}>
                <div className="hud-label">Anatomical Health Nodes</div>
                <div style={{ display: 'flex', gap: 10, fontSize: 11, color: '#94a3b8' }}>
                  <span><strong style={{ color: '#34d399' }}>◆</strong> Nominal</span>
                  <span><strong style={{ color: '#fbbf24' }}>▲</strong> Warning</span>
                  <span><strong style={{ color: '#fb7185' }}>■</strong> Critical</span>
                </div>
              </div>
              <BodyMap nodes={nodes} selectedNode={selectedNode} onSelectNode={handleSelectNode} />
            </div>
          </Panel>
        </section>

        {/* ════ RIGHT COLUMN: 7-DAY TREND CHART & CLINICAL GUIDANCE ════ */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Panel style={{ padding: 16 }}>
            <HudLabel>7-Day Space vs. Earth Baseline</HudLabel>
            <Chart measurement={chartMeas} measurementKey={chartMeasId} />
          </Panel>

          <Panel style={{ padding: 0 }}>
            <GuidancePanel
              record={guidanceRecord}
              status={guidanceMeasStatus}
              value={guidanceMeasValue}
              onProgress={({ id, completed }) => {
                setGuidanceDoneById((prev) => (prev[id] === completed ? prev : { ...prev, [id]: completed }));
              }}
              onOpenInstructions={guidanceRecord ? () => {
                setDrawerRecord(guidanceRecord);
                setShowDrawer(true);
              } : undefined}
            />
          </Panel>
        </aside>
      </main>

      {/* ══ PHASE 4 FOOTER: STANDARDS, CITATIONS & DISCLAIMER ══ */}
      <footer style={{
        marginTop: 'auto',
        borderTop: '1px solid rgba(148, 163, 184, 0.14)',
        background: 'rgba(11, 17, 30, 0.9)',
        padding: '10px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        fontSize: 11.5,
        color: '#94a3b8',
      }}>
        <div>
          Decision support, not a medical device. Demo data is simulated.
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <a
            href="https://www.nasa.gov/ochmo/health-and-medical-standards/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#38bdf8', textDecoration: 'none', fontWeight: 500 }}
          >
            NASA-STD-3001 ↗
          </a>
          <a
            href="https://www.nasa.gov/hrp/5-hazards-of-human-spaceflight/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#38bdf8', textDecoration: 'none', fontWeight: 500 }}
          >
            NASA HRP Hazards ↗
          </a>
          <a
            href="https://visualization.osdr.nasa.gov/radlab/gui/overview/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#38bdf8', textDecoration: 'none', fontWeight: 500 }}
          >
            OSDR RadLab ↗
          </a>
        </div>
      </footer>

      {/* ══ KEYBOARD SHORTCUT CHECK-IN MODAL ══ */}
      {modalFlow === 'checkin' && (
        <CheckInModal
          open
          onClose={() => setModalFlow('hidden')}
          onSubmit={handleCheckInSubmit}
          pvt={pvtResult}
          auto={{
            radiation: measurements?.['2A-i']?.value ?? 0.48,
            co2: measurements?.['4A-ii']?.value ?? 2.3,
          }}
        />
      )}

      {/* ══ INSTRUCTION DRAWER ══ */}
      {showDrawer && (
        <InstructionDrawer
          record={drawerRecord ?? guidanceRecord ?? hazard3[0]}
          open={showDrawer}
          onClose={() => setShowDrawer(false)}
        />
      )}

      {/* ══ MARS EARTH-INDEPENDENT CMO CHECKLIST MODAL (A2) ══ */}
      <MarsTriageModal
        open={showMarsModal}
        onClose={() => setShowMarsModal(false)}
        delayMin={delayMin}
        stepsDone={marsStepsDone}
        onToggleStep={(stepId) => setMarsStepsDone((prev) => ({ ...prev, [stepId]: !prev[stepId] }))}
        notes={marsNotes}
        onNotesChange={setMarsNotes}
        queuedForGround={queuedForGround}
        onQueueAndDownload={() => handleDownloadPacket('json')}
        onDownloadTxt={() => handleDownloadPacket('txt')}
      />

      {/* ══ ONSD TWO-CLICK ULTRASOUND CALIPER MODAL ══ */}
      <OnsdCaliperModal
        open={showOnsdCaliper}
        currentValue={measurements?.['1B-i']?.value ?? 5.9}
        onClose={() => setShowOnsdCaliper(false)}
        onApply={handleApplyOnsd}
      />
    </div>
  );
}
