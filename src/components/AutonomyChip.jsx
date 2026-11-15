const AUTONOMY_CFG = {
  A0: {
    code: 'A0',
    label: 'Real-time',
    icon: '◆',
    color: '#34d399',
    bg: 'rgba(16, 185, 129, 0.12)',
    border: 'rgba(16, 185, 129, 0.32)',
  },
  A1: {
    code: 'A1',
    label: 'Delayed',
    icon: '▲',
    color: '#fbbf24',
    bg: 'rgba(245, 158, 11, 0.12)',
    border: 'rgba(245, 158, 11, 0.35)',
  },
  A2: {
    code: 'A2',
    label: 'Autonomous',
    icon: '■',
    color: '#fb7185',
    bg: 'rgba(244, 63, 94, 0.14)',
    border: 'rgba(244, 63, 94, 0.38)',
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
        fontFamily:    "'Inter', sans-serif",
        fontSize:      11,
        fontWeight:    600,
        letterSpacing: '0.04em',
        color:         cfg.color,
        background:    cfg.bg,
        border:        `1px solid ${cfg.border}`,
        borderRadius:  6,
        padding:       '4px 10px',
      }}
    >
      <span aria-hidden="true" style={{ fontSize: 8 }}>{cfg.icon}</span>
      <span>{cfg.code} · {cfg.label}</span>
      {delayText && (
        <span style={{
          fontFamily: "'Space Mono', monospace",
          fontSize:   10.5,
          opacity:    0.92,
          borderLeft: `1px solid ${cfg.border}`,
          paddingLeft: 6,
        }}>
          {delayText}
        </span>
      )}
    </span>
  );
}
