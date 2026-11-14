const STATUS_COLORS = {
  GREEN: '#22c55e',
  YELLOW: '#eab308',
  RED: '#ef4444',
  NOMINAL: '#22c55e',
  WARNING: '#eab308',
  CRITICAL: '#ef4444',
};

export default function Gauge({ score, status }) {
  const r = 70;
  const cx = 90;
  const cy = 90;
  const circumference = 2 * Math.PI * r;
  const normalizedScore = Math.max(0, Math.min(100, score ?? 0));
  const dash = (normalizedScore / 100) * circumference;
  const color = STATUS_COLORS[status] ?? '#94a3b8';

  return (
    <div className="flex flex-col items-center">
      <svg width="180" height="180" viewBox="0 0 180 180">
        {/* Background track */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke="#1e293b"
          strokeWidth="14"
        />
        {/* Score arc */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={color}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          strokeDashoffset={circumference / 4}
          style={{ transition: 'stroke-dasharray 0.6s ease, stroke 0.4s ease' }}
        />
        {/* Score number */}
        <text
          x={cx} y={cy - 6}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={color}
          fontSize="32"
          fontWeight="bold"
          style={{ transition: 'fill 0.4s ease' }}
        >
          {Math.round(normalizedScore)}
        </text>
        {/* Label */}
        <text
          x={cx} y={cy + 24}
          textAnchor="middle"
          fill="#94a3b8"
          fontSize="11"
        >
          HEALTH SCORE
        </text>
      </svg>
    </div>
  );
}
