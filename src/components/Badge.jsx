const CFG = {
  NOMINAL:  { color: '#34d399', bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.35)', icon: '◆', label: 'NOMINAL'  },
  WARNING:  { color: '#fbbf24', bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.38)', icon: '▲', label: 'WARNING'  },
  CRITICAL: { color: '#fb7185', bg: 'rgba(244, 63, 94, 0.14)',  border: 'rgba(244, 63, 94, 0.42)',  icon: '■', label: 'CRITICAL' },
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
        display:       'inline-flex',
        alignItems:    'center',
        gap:           7,
        padding:       '5px 12px',
        borderRadius:  6,
        border:        `1px solid ${c.border}`,
        background:    c.bg,
        color:         c.color,
        fontFamily:    "'Inter', sans-serif",
        fontSize:      11,
        fontWeight:    700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
      }}
    >
      <span aria-hidden="true" style={{ fontSize: 9 }}>{c.icon}</span>
      <span>{c.label}</span>
    </div>
  );
}
