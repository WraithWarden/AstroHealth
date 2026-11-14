const CFG = {
  NOMINAL:  { color: '#00ff9d', bg: 'rgba(0,255,157,0.08)',  border: 'rgba(0,255,157,0.35)',  icon: '◆', label: 'NOMINAL'  },
  WARNING:  { color: '#ffc800', bg: 'rgba(255,200,0,0.08)',  border: 'rgba(255,200,0,0.35)',  icon: '▲', label: 'WARNING'  },
  CRITICAL: { color: '#ff3355', bg: 'rgba(255,51,85,0.1)',   border: 'rgba(255,51,85,0.4)',   icon: '■', label: 'CRITICAL' },
};

export default function Badge({ status }) {
  const c = CFG[status] ?? CFG.NOMINAL;
  const isCrit = status === 'CRITICAL';

  return (
    <div
      role="status"
      aria-label={`Health status: ${c.label}`}
      className={isCrit ? 'crit-blink' : ''}
      style={{
        display:        'inline-flex',
        alignItems:     'center',
        gap:            8,
        padding:        '5px 16px',
        border:         `1px solid ${c.border}`,
        background:     c.bg,
        color:          c.color,
        fontFamily:     "'Orbitron', sans-serif",
        fontSize:       11,
        fontWeight:     700,
        letterSpacing:  '0.2em',
        textTransform:  'uppercase',
        boxShadow:      `0 0 12px ${c.border}`,
      }}
    >
      <span aria-hidden="true" style={{ fontSize: 8 }}>{c.icon}</span>
      <span>{c.label}</span>
    </div>
  );
}
