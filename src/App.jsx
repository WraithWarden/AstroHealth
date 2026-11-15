import { useState, useMemo, useCallback, useEffect } from 'react';
import nasaLogo from './assets/nasa-logo.svg';
import { evaluate, addReading } from './engine/index.js';
import profiles from './data/profiles.json';
import Gauge from './components/Gauge.jsx';
import HazardBars from './components/HazardBars.jsx';
import BodyMap from './components/BodyMap.jsx';
import Chart from './components/Chart.jsx';
import CheckInModal from './components/CheckInModal.jsx';
import { useCheckIn, RedFlagBanner } from './components/CheckInHost.jsx';
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
  { key: 'iss',   label: 'ISS · LEO',       dot: '#10b981' },
  { key: 'lunar', label: 'Lunar · Artemis', dot: '#f59e0b' },
  { key: 'mars',  label: 'Mars · Transit',  dot: '#f43f5e' },
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
  brain: 'Brain & Neuro-Vigilance',
  heart: 'Heart & Vascular',
  lungs: 'Lungs & Cabin Air',
  bones: 'Skeletal & Calcium',
  whole: 'Core (Systemic & Radiation)',
};

const INDICATOR_COUNTS = Object.fromEntries(
  Object.entries(NODE_MEASUREMENTS).map(([k, ids]) => [k, ids.length])
);

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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 8 }}>
      <div className="hud-label">{children}</div>
      {right && <div>{right}</div>}
    </div>
  );
}

/** Shared quick-action pair rendered in the header and bottom-left sidebar. */
function CheckInActions({ onOpenCheckIn, onOpenPvt, pvt, fullWidth = false }) {
  const flexBtn = fullWidth ? { flex: 1 } : {};
  return (
    <>
      <button
        type="button"
        onClick={onOpenCheckIn}
        style={{
          ...flexBtn,
          padding: fullWidth ? '7px 10px' : '8px 13px',
          borderRadius: 7,
          background: 'linear-gradient(180deg, rgba(56, 189, 248, 0.22) 0%, rgba(14, 165, 233, 0.14) 100%)',
          border: '1px solid rgba(56, 189, 248, 0.45)',
          color: '#f0f9ff',
          cursor: 'pointer',
          fontFamily: "'Inter', sans-serif",
          fontSize: 12,
          fontWeight: 600,
          whiteSpace: 'nowrap',
        }}
      >
        + Log Check-In
      </button>
      <button
        type="button"
        onClick={onOpenPvt}
        style={{
          ...flexBtn,
          padding: fullWidth ? '7px 10px' : '8px 12px',
          borderRadius: 7,
          background: 'rgba(30, 41, 59, 0.75)',
          border: '1px solid rgba(148, 163, 184, 0.25)',
          color: pvt ? '#38bdf8' : '#cbd5e1',
          cursor: 'pointer',
          fontFamily: "'Inter', sans-serif",
          fontSize: 12,
          fontWeight: 500,
          whiteSpace: 'nowrap',
        }}
      >
        {pvt ? `PVT: ${pvt.median_ms}ms` : 'Reaction Test'}
      </button>
    </>
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
        background: selected ? 'rgba(56, 189, 248, 0.13)' : 'rgba(15, 23, 42, 0.6)',
        border: selected ? '1px solid #38bdf8' : '1px solid rgba(148, 163, 184, 0.14)',
        padding: '6px 9px',
        cursor: 'pointer',
        marginBottom: 5,
        transition: 'all 0.15s ease',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6, marginBottom: 2 }}>
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11.5, fontWeight: 600, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span aria-hidden="true" style={{ color: meta.color, fontSize: 9 }}>{meta.icon}</span>
          <span>{label}</span>
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginBottom: 2 }}>
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 14, fontWeight: 700, color: meta.color, lineHeight: 1.1 }}>
          {shownVal}
        </span>
        {unit && (
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: '#94a3b8' }}>
            {unit}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10.5, color: '#94a3b8' }}>
          {zScore != null ? `z: ${zScore > 0 ? '+' : ''}${zScore.toFixed(2)} · ` : ''}
          <span style={{ color: meta.color, fontWeight: 600 }}>{meta.label}</span>
        </span>
        {cadenceBadge && (
          <span style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 9,
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

const INITIAL_PRESET = 'iss';

export default function App() {
  const [activePreset, setActivePreset] = useState(INITIAL_PRESET);
  const [showDrawer, setShowDrawer]     = useState(false);
  const [drawerRecord, setDrawerRecord] = useState(hazard3[0]);

  const [liveState, setLiveState]           = useState(() => loadState(INITIAL_PRESET));
  const [checkInHistory, setCheckInHistory] = useState(() => loadHistory(INITIAL_PRESET));

  // Remember each simulation's last selected node & measurement (first visit defaults to 'eyes')
  const [selectionByPreset, setSelectionByPreset] = useState({
    iss:   { node: 'eyes', measId: '1B-i' },
    lunar: { node: 'eyes', measId: '1B-i' },
    mars:  { node: 'eyes', measId: '1B-i' },
  });
  const selectedNode   = selectionByPreset[activePreset]?.node ?? 'eyes';
  const selectedMeasId = selectionByPreset[activePreset]?.measId ?? '1B-i';

  const [checkInModalOpen, setCheckInModalOpen] = useState(false);
  const [pvtModalOpen, setPvtModalOpen]         = useState(false);

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
    const first = NODE_MEASUREMENTS[nodeId]?.[0] ?? '1B-i';
    setSelectionByPreset((prev) => ({
      ...prev,
      [activePreset]: { node: nodeId, measId: first },
    }));
  }

  function handleSelectMeas(measId) {
    setSelectionByPreset((prev) => ({
      ...prev,
      [activePreset]: { node: selectedNode, measId },
    }));
  }

  const recordStateUpdate = useCallback((nextState, output, redFlag = false) => {
    const nextData = output ?? evaluate(nextState);
    const histEntry = {
      timestamp: new Date().toISOString(),
      missionDay: nextState.profile?.missionDay ?? nextState.day,
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

  const { pvt, setPvt, logged, clearLogged, submit: submitHostCheckIn } = useCheckIn({
    preset: activePreset,
    state: liveState ?? activePreset,
    addReading,
    evaluate: (s) => evaluate(s),
    onUpdate: (newState, output, metaResult) => {
      recordStateUpdate(newState, output, Boolean(metaResult?.redFlag));
    },
  });

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
    recordStateUpdate(nextState, evaluate(nextState), false);
  }, [liveState, activePreset, recordStateUpdate]);

  function handlePresetSwitch(key) {
    setActivePreset(key);
    const saved = loadState(key);
    setLiveState(saved);
    setCheckInHistory(loadHistory(key));
    setGuidanceDoneById({});
    setMarsStepsDone({});
    setMarsNotes('');
    setQueuedForGround(false);
    setShowMarsModal(false);
    setShowOnsdCaliper(false);
    setCheckInModalOpen(false);
    setPvtModalOpen(false);
    clearLogged();
  }

  function handleReset() {
    clearSaved(activePreset);
    setLiveState(null);
    setCheckInHistory([]);
    setGuidanceDoneById({});
    setMarsStepsDone({});
    setMarsNotes('');
    setQueuedForGround(false);
    clearLogged();
  }

  useEffect(() => {
    function onKey(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'c' || e.key === 'C') setCheckInModalOpen(v => !v);
      if (e.key === '1') handlePresetSwitch('iss');
      if (e.key === '2') handlePresetSwitch('lunar');
      if (e.key === '3') handlePresetSwitch('mars');
      if (e.key === 'Escape') {
        setCheckInModalOpen(false);
        setPvtModalOpen(false);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const isCritical    = badge === 'CRITICAL';
  const bannerAlert   = autonomyDetails?.bannerAlert;
  const delaySeconds  = autonomyDetails?.commDelaySec;
  const delayMin      = Math.max(1, Math.round((delaySeconds ?? 0) / 60));
  const isLive        = liveState !== null;
  const currentDay    = (isLive ? liveState?.profile?.missionDay : profile.missionDay) ?? engineProfile?.missionDay ?? '—';
  const selNodeStatus = STATUS_META[nodes?.[selectedNode] ?? 'GREEN'] ?? STATUS_META.GREEN;

  return (
    <div
      className="astro-shell"
      style={{
        display: 'flex',
        flexDirection: 'column',
        color: '#f1f5f9',
        fontFamily: "'Inter', sans-serif",
      }}
    >

      {/* ══ TOP NAVIGATION BAR (matches reference header structure) ══ */}
      <header style={{
        borderBottom: '1px solid rgba(148, 163, 184, 0.14)',
        padding: '7px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 10,
        background: 'rgba(11, 17, 30, 0.94)',
        backdropFilter: 'blur(8px)',
        position: 'sticky',
        top: 0,
        zIndex: 30,
        flexShrink: 0,
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <img
            src={nasaLogo}
            alt="NASA"
            style={{ width: 40, height: 34, objectFit: 'contain', flexShrink: 0, display: 'block' }}
          />
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
          gap: 5,
          padding: 4,
          borderRadius: 9,
          background: 'rgba(15, 23, 42, 0.88)',
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
                  gap: 7,
                  padding: '6px 12px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 12,
                  fontWeight: active ? 600 : 500,
                  color: active ? '#f8fafc' : '#94a3b8',
                  background: active ? 'rgba(244, 63, 94, 0.18)' : 'transparent',
                  border: active ? '1px solid rgba(244, 63, 94, 0.45)' : '1px solid transparent',
                  transition: 'all 0.15s ease',
                }}
              >
                <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: '50%', background: p.dot }} />
                <span>{p.label}</span>
                {hasSaved && (
                  <span title="Has saved check-ins" style={{ width: 5, height: 5, borderRadius: '50%', background: '#10b981' }} />
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
                padding: '5px 8px',
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

        {/* Right: Mission Day + Autonomy */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: '#e2e8f0', fontWeight: 700 }}>
            Day {currentDay} <span style={{ color: '#64748b', fontWeight: 400 }}>/ {profile.missionTotalDays ?? '—'}</span>
          </div>
          <AutonomyChip autonomy={autonomy} delaySeconds={delaySeconds} />
        </div>
      </header>

      {/* ══ POST CHECK-IN FEEDBACK / RED-FLAG ALERT (only visible after logging a check-in) ══ */}
      {logged && (
        <div style={{
          background: logged.redFlag
            ? 'rgba(244, 63, 94, 0.09)'
            : 'rgba(16, 185, 129, 0.09)',
          borderBottom: `1px solid ${
            logged.redFlag
              ? 'rgba(244, 63, 94, 0.28)'
              : 'rgba(16, 185, 129, 0.28)'
          }`,
          padding: '5px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          flexShrink: 0,
          gap: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', flex: 1 }}>
            {!logged.redFlag && (
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 600, color: '#34d399' }}>
                ◆ {logged.dayLabel}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={clearLogged}
            aria-label="Dismiss check-in notice"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              fontSize: 13,
              padding: '2px 6px',
            }}
          >
            ✕
          </button>

          {logged.redFlag && (
            <div style={{ width: '100%' }}>
              <RedFlagBanner result={logged} onDismiss={clearLogged} />
            </div>
          )}
        </div>
      )}

      {/* ══ MAIN 3-COLUMN WORKSPACE ══ */}
      <main className="astro-grid">

        {/* ════ LEFT COLUMN: CREW PROFILE, OVERALL HEALTH INDEX (WITH 4 STATS), HAZARD RISK ════ */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 9, minHeight: 0, height: '100%' }}>

          {/* Crew Profile */}
          <Panel style={{ padding: '10px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 9,
                border: '1px solid rgba(56, 189, 248, 0.35)',
                background: 'rgba(56, 189, 248, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 21,
                flexShrink: 0,
              }}>
                {profile.sex === 'F' ? '👩‍🚀' : '👨‍🚀'}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13.5, fontWeight: 700, color: '#f8fafc' }}>
                  {profile.name ?? 'Crew Member'}
                </div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: '#cbd5e1', marginTop: 1 }}>
                  {profile.role ?? 'Mission Specialist'}
                </div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
                  ID {profile.id ?? '—'} · Age {profile.age ?? '—'} ({profile.sex ?? '—'})
                </div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: '#64748b', marginTop: 1 }}>
                  Day {currentDay}/{profile.missionTotalDays ?? '—'}
                </div>
              </div>
            </div>
          </Panel>

          {/* Overall Health Index + 4-Box Readiness Strip (Critical | Warning | Streak | Due) */}
          <Panel style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: '100%' }}>
              <HudLabel>Overall Health Index</HudLabel>
            </div>
            <Gauge score={overall} status={badge} />
            {data.overallDetails && (
              <div style={{ width: '100%', marginTop: 4 }}>
                <ReadinessStrip
                  overallDetails={data.overallDetails}
                  dueSummary={dueSummary}
                  dueLabels={dueLabels}
                />
              </div>
            )}
          </Panel>

          {/* Hazard Risk Scores */}
          <Panel style={{ padding: '12px 13px', flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            <HazardBars hazards={hazards} autonomy={autonomy} delaySeconds={delaySeconds} />
          </Panel>

          {/* Daily Check-In & Vigilance (Bottom-Left Quick Actions) */}
          <Panel style={{ padding: '9px 12px', flexShrink: 0 }}>
            <div style={{ marginBottom: 7 }}>
              <div className="hud-label">Daily Check-In &amp; Vigilance</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <CheckInActions
                fullWidth
                onOpenCheckIn={() => setCheckInModalOpen(true)}
                onOpenPvt={() => setPvtModalOpen(true)}
                pvt={pvt}
              />
            </div>
          </Panel>
        </aside>

        {/* ════ CENTER COLUMN: ANATOMICAL TRIAGE MAP + SELECTED NODE INDICATORS ════ */}
        <section style={{ display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%' }}>
          <Panel style={{ padding: '11px 14px', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid rgba(148, 163, 184, 0.12)', flexWrap: 'wrap', gap: 8, flexShrink: 0 }}>
              <div className="hud-label">Anatomical Triage Map</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11.5 }}>
                <span style={{ color: '#94a3b8', fontWeight: 500 }}>CURRENT SELECTION:</span>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontWeight: 700,
                  color: '#f8fafc',
                  background: 'rgba(15, 23, 42, 0.75)',
                  border: `1px solid ${selNodeStatus.color}`,
                  borderRadius: 6,
                  padding: '2px 9px',
                }}>
                  <span style={{ color: selNodeStatus.color, fontSize: 9 }}>{selNodeStatus.icon}</span>
                  <span>{(NODE_TITLES[selectedNode] || selectedNode).toUpperCase()}</span>
                </span>
              </div>
            </div>

            {/* Body Map Left + Node Measurement Cards Right */}
            <div className="astro-map-split" style={{ flex: 1, minHeight: 0 }}>
              {/* Astronaut Silhouette & Status Legend */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', minHeight: 0, width: '100%' }}>
                <BodyMap
                  nodes={nodes}
                  selectedNode={selectedNode}
                  onSelectNode={handleSelectNode}
                  indicatorCounts={INDICATOR_COUNTS}
                />
                <div style={{ display: 'flex', gap: 14, fontSize: 10.5, color: '#94a3b8', marginTop: 4, paddingTop: 5, borderTop: '1px solid rgba(148, 163, 184, 0.1)', flexShrink: 0 }}>
                  <span><strong style={{ color: '#34d399' }}>◆</strong> Nominal</span>
                  <span><strong style={{ color: '#fbbf24' }}>▲</strong> Warning</span>
                  <span><strong style={{ color: '#fb7185' }}>■</strong> Critical</span>
                </div>
              </div>

              {/* Selected Node Indicators Stack */}
              <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflowY: 'auto', paddingRight: 2 }}>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, flexShrink: 0 }}>
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
                    onClick={() => handleSelectMeas(m.id)}
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
            </div>
          </Panel>
        </section>

        {/* ════ RIGHT COLUMN: DYNAMIC INSPECTOR (7-DAY CHART + CLINICAL GUIDANCE) ════ */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 9, minHeight: 0, height: '100%' }}>
          <Panel style={{ padding: '11px 13px' }}>
            <HudLabel
              right={
                checkInHistory.length > 0 && (
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: '#34d399' }}>
                    Last log: Day {checkInHistory[0].missionDay} ({checkInHistory[0].overall})
                  </span>
                )
              }
            >
              7-Day vs. Space Baseline
            </HudLabel>
            <Chart measurement={chartMeas} measurementKey={chartMeasId} />
          </Panel>

          <Panel style={{ padding: 0, flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <GuidancePanel
              record={guidanceRecord}
              records={ALL_RECORDS}
              status={guidanceMeasStatus}
              value={guidanceMeasValue}
              onProgress={({ id, completed }) => {
                setGuidanceDoneById((prev) => (prev[id] === completed ? prev : { ...prev, [id]: completed }));
              }}
              onOpenInstructions={guidanceRecord ? (targetRecord) => {
                const nextRecord =
                  targetRecord && typeof targetRecord === 'object' && 'id' in targetRecord && 'name' in targetRecord
                    ? targetRecord
                    : guidanceRecord;
                setDrawerRecord(nextRecord);
                setShowDrawer(true);
              } : undefined}
            />
          </Panel>
        </aside>
      </main>

      {/* ══ FOOTER ══ */}
      <footer style={{
        marginTop: 'auto',
        borderTop: '1px solid rgba(148, 163, 184, 0.14)',
        background: 'rgba(11, 17, 30, 0.92)',
        padding: '6px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        fontSize: 11,
        color: '#94a3b8',
        flexShrink: 0,
      }}>
        <div>
          Decision support, not a medical device. Demo data is simulated.
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          {autonomy === 'A2' && (
            <button
              type="button"
              onClick={() => setShowMarsModal(true)}
              style={{
                background: 'transparent',
                border: 'none',
                padding: 0,
                color: '#fb7185',
                fontFamily: "'Inter', sans-serif",
                fontSize: 11,
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
              background: 'transparent',
              border: 'none',
              padding: 0,
              color: '#38bdf8',
              fontFamily: "'Inter', sans-serif",
              fontSize: 11,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            ⬇ Report Packet
          </button>
          {[
            { label: 'NASA-STD-3001 ↗', href: 'https://www.nasa.gov/ochmo/hsa-standards/' },
            { label: 'NASA HRP Hazards ↗', href: 'https://www.nasa.gov/hrp/hazards/' },
            { label: 'NASA OSDR ↗', href: 'https://osdr.nasa.gov/bio/repo/' },
          ].map((link) => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#38bdf8', textDecoration: 'none', fontWeight: 500 }}
            >
              {link.label}
            </a>
          ))}
        </div>
      </footer>

      {/* ══ PVT REACTION TEST MODAL ══ */}
      {pvtModalOpen && (
        <div className="modal-overlay" onClick={() => setPvtModalOpen(false)}>
          <div
            className="hud-panel fade-in"
            role="dialog"
            aria-modal="true"
            aria-label="Reaction test"
            onClick={(e) => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 390, padding: 22 }}
          >
            <PvtTest
              onComplete={(r) => {
                setPvt(r);
                setPvtModalOpen(false);
              }}
              onCancel={() => setPvtModalOpen(false)}
            />
          </div>
        </div>
      )}

      {/* ══ DAILY CHECK-IN MODAL ══ */}
      <CheckInModal
        open={checkInModalOpen}
        onClose={() => {
          setCheckInModalOpen(false);
          setShowDrawer(false);
        }}
        pvt={pvt}
        auto={{
          radiation: measurements?.['2A-i']?.value ?? 0.48,
          co2: measurements?.['4A-ii']?.value ?? 2.3,
        }}
        guideOpen={showDrawer}
        activeGuideId={drawerRecord?.id}
        onInspectHow={(measId) => {
          const rec = RECORD_BY_ID[measId];
          if (rec) {
            setDrawerRecord(rec);
            setShowDrawer(true);
          }
        }}
        onCloseGuide={() => setShowDrawer(false)}
        onSubmit={(reading, meta) => {
          submitHostCheckIn(reading, meta);
          setCheckInModalOpen(false);
          setShowDrawer(false);
        }}
      />

      {/* ══ INSTRUCTION DRAWER ══ */}
      {showDrawer && (
        <InstructionDrawer
          record={drawerRecord ?? guidanceRecord ?? hazard3[0]}
          open={showDrawer}
          sideBySide={checkInModalOpen}
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
