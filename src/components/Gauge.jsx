const STATUS_COLORS = {
  GREEN:    '#00ff9d',
  YELLOW:   '#ffc800',
  RED:      '#ff3355',
  NOMINAL:  '#00ff9d',
  WARNING:  '#ffc800',
  CRITICAL: '#ff3355',
};

const STATUS_TRACK = {
  GREEN:    'rgba(0,255,157,0.08)',
  YELLOW:   'rgba(255,200,0,0.08)',
  RED:      'rgba(255,51,85,0.1)',
  NOMINAL:  'rgba(0,255,157,0.08)',
  WARNING:  'rgba(255,200,0,0.08)',
  CRITICAL: 'rgba(255,51,85,0.1)',
};

export default function Gauge({ score, status }) {
  const r  = 72;
  const cx = 100;
  const cy = 100;
  const C  = 2 * Math.PI * r;          // full circumference ≈ 452.4

  /* 240° arc, gap at the bottom, starts at 8 o'clock (150°) */
  const arcFraction  = 240 / 360;      // 0.6667
  const arcLen       = C * arcFraction; // ≈ 301.6  (the drawn portion)
  const gapLen       = C - arcLen;     // ≈ 150.8  (invisible gap)

  /* rotate so the gap is at the bottom */
  const rotationDeg  = 150;            // 8-o'clock start

  const normalised   = Math.max(0, Math.min(100, score ?? 0));
  const fillLen      = arcLen * (normalised / 100);

  const color        = STATUS_COLORS[status] ?? '#94a3b8';
  const trackColor   = STATUS_TRACK[status]  ?? 'rgba(100,116,139,0.1)';
  const glowId       = `gaugeGlow-${status}`;

  /* Tick marks */
  const ticks = [0, 25, 50, 75, 100];

  function tickCoords(val) {
    const angleDeg = rotationDeg + (val / 100) * 240;
    const rad = (angleDeg * Math.PI) / 180;
    return {
      x1: cx + (r - 6) * Math.cos(rad),
      y1: cy + (r - 6) * Math.sin(rad),
      x2: cx + (r + 6) * Math.cos(rad),
      y2: cy + (r + 6) * Math.sin(rad),
    };
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width={200} height={200} viewBox="0 0 200 200" aria-label={`Health score: ${normalised}`}>
        <defs>
          <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur"/>
            <feComposite in="SourceGraphic" in2="blur" operator="over"/>
          </filter>
        </defs>

        {/* Background track */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={trackColor}
          strokeWidth={12}
          strokeDasharray={`${arcLen} ${gapLen}`}
          transform={`rotate(${rotationDeg} ${cx} ${cy})`}
        />

        {/* Score fill arc */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={color}
          strokeWidth={10}
          strokeLinecap="butt"
          strokeDasharray={`${fillLen} ${C - fillLen}`}
          transform={`rotate(${rotationDeg} ${cx} ${cy})`}
          filter={`url(#${glowId})`}
          style={{ transition: 'stroke-dasharray 0.8s ease, stroke 0.4s ease' }}
        />

        {/* Tick marks */}
        {ticks.map((v) => {
          const t = tickCoords(v);
          return (
            <line
              key={v}
              x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
              stroke={v === 0 || v === 100 ? color : 'rgba(0,180,255,0.3)'}
              strokeWidth={v === 0 || v === 100 ? 1.5 : 1}
            />
          );
        })}

        {/* Score number */}
        <text
          x={cx} y={cy - 8}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={color}
          fontSize={42}
          fontWeight={700}
          fontFamily="'Orbitron', sans-serif"
          filter={`url(#${glowId})`}
          style={{ transition: 'fill 0.4s ease' }}
        >
          {Math.round(normalised)}
        </text>

        {/* /100 */}
        <text
          x={cx} y={cy + 22}
          textAnchor="middle"
          fill="rgba(0,180,255,0.4)"
          fontSize={10}
          fontFamily="'Space Mono', monospace"
        >
          /100
        </text>

        {/* Label below */}
        <text
          x={cx} y={cy + 42}
          textAnchor="middle"
          fill="rgba(0,180,255,0.5)"
          fontSize={8}
          fontFamily="'Orbitron', sans-serif"
          letterSpacing={2}
        >
          HEALTH INDEX
        </text>
      </svg>
    </div>
  );
}
