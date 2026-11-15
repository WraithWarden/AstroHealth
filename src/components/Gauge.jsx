const STATUS_COLORS = {
  GREEN:    '#10b981',
  YELLOW:   '#f59e0b',
  RED:      '#f43f5e',
  NOMINAL:  '#10b981',
  WARNING:  '#f59e0b',
  CRITICAL: '#f43f5e',
};

const STATUS_TEXT_COLORS = {
  GREEN:    '#34d399',
  YELLOW:   '#fbbf24',
  RED:      '#fb7185',
  NOMINAL:  '#34d399',
  WARNING:  '#fbbf24',
  CRITICAL: '#fb7185',
};

const STATUS_LABELS = {
  GREEN:    'NOMINAL',
  YELLOW:   'WARNING',
  RED:      'CRITICAL',
  NOMINAL:  'NOMINAL',
  WARNING:  'WARNING',
  CRITICAL: 'CRITICAL',
};

const STATUS_TRACK = {
  GREEN:    'rgba(16, 185, 129, 0.14)',
  YELLOW:   'rgba(245, 158, 11, 0.14)',
  RED:      'rgba(244, 63, 94, 0.16)',
  NOMINAL:  'rgba(16, 185, 129, 0.14)',
  WARNING:  'rgba(245, 158, 11, 0.14)',
  CRITICAL: 'rgba(244, 63, 94, 0.16)',
};

export default function Gauge({ score, status }) {
  const r  = 56;
  const cx = 80;
  const cy = 72;
  const C  = 2 * Math.PI * r;

  const arcFraction = 240 / 360;
  const arcLen      = C * arcFraction;
  const gapLen      = C - arcLen;
  const rotationDeg = 150;

  const normalised  = Math.max(0, Math.min(100, score ?? 0));
  const fillLen     = arcLen * (normalised / 100);

  const color       = STATUS_COLORS[status] ?? '#94a3b8';
  const textColor   = STATUS_TEXT_COLORS[status] ?? '#cbd5e1';
  const label       = STATUS_LABELS[status] ?? 'NOMINAL';
  const trackColor  = STATUS_TRACK[status] ?? 'rgba(148, 163, 184, 0.14)';
  const glowId      = `gaugeGlow-${status}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width={160} height={130} viewBox="0 0 160 130" aria-label={`Health score: ${Math.round(normalised)}, ${label}`}>
        <defs>
          <filter id={glowId} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={trackColor}
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={`${arcLen} ${gapLen}`}
          transform={`rotate(${rotationDeg} ${cx} ${cy})`}
        />

        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={color}
          strokeWidth={9}
          strokeLinecap="round"
          strokeDasharray={`${fillLen} ${C - fillLen}`}
          transform={`rotate(${rotationDeg} ${cx} ${cy})`}
          filter={`url(#${glowId})`}
          style={{ transition: 'stroke-dasharray 0.6s ease, stroke 0.3s ease' }}
        />

        <text
          x={cx} y={cy - 6}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#f8fafc"
          fontSize={32}
          fontWeight={700}
          fontFamily="'Orbitron', sans-serif"
        >
          {Math.round(normalised)}
        </text>

        <text
          x={cx} y={cy + 16}
          textAnchor="middle"
          fill="#94a3b8"
          fontSize={10}
          fontFamily="'Space Mono', monospace"
        >
          / 100
        </text>

        <text
          x={cx} y={cy + 36}
          textAnchor="middle"
          fill={textColor}
          fontSize={11}
          fontWeight={700}
          fontFamily="'Inter', sans-serif"
          letterSpacing={1.5}
        >
          {label}
        </text>
      </svg>
    </div>
  );
}
