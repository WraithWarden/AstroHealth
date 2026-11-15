const STATUS_COLORS = {
  GREEN:    '#10b981',
  YELLOW:   '#f59e0b',
  RED:      '#f43f5e',
  NOMINAL:  '#10b981',
  WARNING:  '#f59e0b',
  CRITICAL: '#f43f5e',
};

const STATUS_TRACK = {
  GREEN:    'rgba(16, 185, 129, 0.12)',
  YELLOW:   'rgba(245, 158, 11, 0.12)',
  RED:      'rgba(244, 63, 94, 0.14)',
  NOMINAL:  'rgba(16, 185, 129, 0.12)',
  WARNING:  'rgba(245, 158, 11, 0.12)',
  CRITICAL: 'rgba(244, 63, 94, 0.14)',
};

export default function Gauge({ score, status }) {
  const r  = 68;
  const cx = 92;
  const cy = 90;
  const C  = 2 * Math.PI * r;

  const arcFraction = 240 / 360;
  const arcLen      = C * arcFraction;
  const gapLen      = C - arcLen;
  const rotationDeg = 150;

  const normalised  = Math.max(0, Math.min(100, score ?? 0));
  const fillLen     = arcLen * (normalised / 100);

  const color       = STATUS_COLORS[status] ?? '#94a3b8';
  const trackColor  = STATUS_TRACK[status]  ?? 'rgba(148, 163, 184, 0.12)';
  const glowId      = `gaugeGlow-${status}`;

  const ticks = [0, 25, 50, 75, 100];

  function tickCoords(val) {
    const angleDeg = rotationDeg + (val / 100) * 240;
    const rad = (angleDeg * Math.PI) / 180;
    return {
      x1: cx + (r - 5) * Math.cos(rad),
      y1: cy + (r - 5) * Math.sin(rad),
      x2: cx + (r + 5) * Math.cos(rad),
      y2: cy + (r + 5) * Math.sin(rad),
    };
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width={184} height={172} viewBox="0 0 184 172" aria-label={`Health score: ${normalised}`}>
        <defs>
          <filter id={glowId} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3" result="blur"/>
            <feComposite in="SourceGraphic" in2="blur" operator="over"/>
          </filter>
        </defs>

        {/* Background track */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={trackColor}
          strokeWidth={11}
          strokeLinecap="round"
          strokeDasharray={`${arcLen} ${gapLen}`}
          transform={`rotate(${rotationDeg} ${cx} ${cy})`}
        />

        {/* Score fill arc */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={color}
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={`${fillLen} ${C - fillLen}`}
          transform={`rotate(${rotationDeg} ${cx} ${cy})`}
          filter={`url(#${glowId})`}
          style={{ transition: 'stroke-dasharray 0.6s ease, stroke 0.3s ease' }}
        />

        {/* Tick marks */}
        {ticks.map((v) => {
          const t = tickCoords(v);
          return (
            <line
              key={v}
              x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
              stroke={v === 0 || v === 100 ? color : 'rgba(148, 163, 184, 0.3)'}
              strokeWidth={v === 0 || v === 100 ? 1.5 : 1}
            />
          );
        })}

        {/* Score number */}
        <text
          x={cx} y={cy - 6}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#f8fafc"
          fontSize={38}
          fontWeight={700}
          fontFamily="'Orbitron', sans-serif"
        >
          {Math.round(normalised)}
        </text>

        {/* /100 */}
        <text
          x={cx} y={cy + 20}
          textAnchor="middle"
          fill="#64748b"
          fontSize={10.5}
          fontFamily="'Space Mono', monospace"
        >
          / 100
        </text>

        {/* Label below */}
        <text
          x={cx} y={cy + 40}
          textAnchor="middle"
          fill="#94a3b8"
          fontSize={9}
          fontWeight={600}
          fontFamily="'Inter', sans-serif"
          letterSpacing={1.4}
        >
          HEALTH INDEX
        </text>
      </svg>
    </div>
  );
}
