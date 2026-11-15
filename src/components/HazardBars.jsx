import AutonomyChip from './AutonomyChip.jsx';

const STATUS_COLORS = {
  GREEN:  { bar: '#10b981', text: '#34d399', icon: '◆', label: 'NOMINAL'  },
  YELLOW: { bar: '#f59e0b', text: '#fbbf24', icon: '▲', label: 'WARNING'  },
  RED:    { bar: '#f43f5e', text: '#fb7185', icon: '■', label: 'CRITICAL' },
};

export default function HazardBars({ hazards, autonomy, delaySeconds, autonomyDetails }) {
  const effectiveDelay = delaySeconds ?? autonomyDetails?.commDelaySec;

  return (
    <div style={{ width: '100%' }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <span className="hud-label">NASA Hazard Risk Scores</span>
        <AutonomyChip autonomy={autonomy} delaySeconds={effectiveDelay} />
      </div>

      {/* Hazard rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {(hazards ?? []).map((h) => {
          const cfg = STATUS_COLORS[h.status] ?? STATUS_COLORS.GREEN;
          return (
            <div key={h.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5, gap: 8 }}>
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: '#e2e8f0', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span aria-hidden="true" style={{ color: cfg.text, fontSize: 9 }}>{cfg.icon}</span>
                  <span>{h.name}</span>
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 9.5, fontWeight: 600, color: cfg.text, opacity: 0.85 }}>
                    {cfg.label}
                  </span>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, fontWeight: 700, color: cfg.text, minWidth: 24, textAlign: 'right' }}>
                    {h.score}
                  </span>
                </span>
              </div>
              {/* Bar track */}
              <div style={{ width: '100%', height: 6, borderRadius: 3, background: 'rgba(148, 163, 184, 0.12)', overflow: 'hidden', position: 'relative' }}>
                <div
                  role="meter"
                  aria-valuenow={h.score}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${h.name}: ${h.score} (${cfg.label})`}
                  style={{
                    height:     '100%',
                    width:      `${Math.max(0, Math.min(100, h.score ?? 0))}%`,
                    borderRadius: 3,
                    background: cfg.bar,
                    transition: 'width 0.5s ease',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
