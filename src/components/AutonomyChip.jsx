const AUTONOMY_CFG = {
  A0: {
    code: 'A0',
    label: 'Real-time',
    icon: '◆',
    color: '#00ff9d',
    bg: 'rgba(0,255,157,0.08)',
    border: 'rgba(0,255,157,0.3)',
  },
  A1: {
    code: 'A1',
    label: 'Delayed',
    icon: '▲',
    color: '#ffc800',
    bg: 'rgba(255,200,0,0.08)',
    border: 'rgba(255,200,0,0.3)',
  },
  A2: {
    code: 'A2',
    label: 'Autonomous',
    icon: '■',
    color: '#ff3355',
    bg: 'rgba(255,51,85,0.08)',
    border: 'rgba(255,51,85,0.3)',
  },
};

export function resolveAutonomyLevel(autonomy, delaySeconds) {
  if (delaySeconds != null && Number.isFinite(Number(delaySeconds))) {
    const sec = Number(delaySeconds);
    if (sec < 5) return 'A0';
    if (sec <= 300) return 'A1';
    return 'A2';
  }
  return AUTONOMY_CFG[autonomy] ? autonomy : 'A0';
}

export function formatCommDelay(delaySeconds) {
  if (delaySeconds == null || !Number.isFinite(Number(delaySeconds))) {
    return null;
  }
  const sec = Math.max(0, Number(delaySeconds));
  if (sec < 60) {
    return `${Number.isInteger(sec) ? sec : Number(sec.toFixed(1))}s`;
  }
  const mins = sec / 60;
  return `${Number.isInteger(mins) ? mins : Number(mins.toFixed(1))} min`;
}

/**
 * Displays mission communication autonomy tier (A0/A1/A2) and one-way delay.
 * Thresholds: < 5s = A0 Real-time, 5s to 5 min = A1 Delayed, > 5 min = A2 Autonomous.
 */
export default function AutonomyChip({ autonomy, delaySeconds }) {
  const level = resolveAutonomyLevel(autonomy, delaySeconds);
  const cfg = AUTONOMY_CFG[level];
  const delayText = formatCommDelay(delaySeconds);

  return (
    <span
      role="status"
      aria-label={`Autonomy ${cfg.code} ${cfg.label}${delayText ? `, one-way delay ${delayText}` : ''}`}
      title={`One-way comm delay: ${delayText ?? '—'} (${cfg.code} ${cfg.label})`}
      style={{
        display:       'inline-flex',
        alignItems:    'center',
        gap:           6,
        fontFamily:    "'Orbitron', sans-serif",
        fontSize:      9,
        fontWeight:    700,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color:         cfg.color,
        background:    cfg.bg,
        border:        `1px solid ${cfg.border}`,
        padding:       '2px 10px',
      }}
    >
      <span aria-hidden="true" style={{ fontSize: 7 }}>{cfg.icon}</span>
      <span>{cfg.code} · {cfg.label}</span>
      {delayText && (
        <span style={{
          fontFamily: "'Space Mono', monospace",
          opacity:    0.9,
          borderLeft: `1px solid ${cfg.border}`,
          paddingLeft: 6,
        }}>
          {delayText}
        </span>
      )}
    </span>
  );
}
