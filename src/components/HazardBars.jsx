const STATUS_COLORS = {
  GREEN:  { bar: '#00ff9d', text: '#00ff9d', glow: 'rgba(0,255,157,0.4)'  },
  YELLOW: { bar: '#ffc800', text: '#ffc800', glow: 'rgba(255,200,0,0.4)'  },
  RED:    { bar: '#ff3355', text: '#ff3355', glow: 'rgba(255,51,85,0.4)'  },
};

const AUTONOMY_CFG = {
  A0: { label: 'A0 · REAL-TIME',  color: '#00ff9d', bg: 'rgba(0,255,157,0.08)',  border: 'rgba(0,255,157,0.3)'  },
  A1: { label: 'A1 · DELAYED',    color: '#ffc800', bg: 'rgba(255,200,0,0.08)',  border: 'rgba(255,200,0,0.3)'  },
  A2: { label: 'A2 · AUTONOMOUS', color: '#ff3355', bg: 'rgba(255,51,85,0.08)', border: 'rgba(255,51,85,0.3)'  },
};

export default function HazardBars({ hazards, autonomy }) {
  const aCfg = AUTONOMY_CFG[autonomy] ?? AUTONOMY_CFG.A0;

  return (
    <div style={{ width: '100%' }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span className="hud-label">NASA Hazard Risk Scores</span>
        <span style={{
          fontFamily:    "'Orbitron', sans-serif",
          fontSize:      9,
          fontWeight:    700,
          letterSpacing: '0.12em',
          color:         aCfg.color,
          background:    aCfg.bg,
          border:        `1px solid ${aCfg.border}`,
          padding:       '2px 10px',
        }}>
          {aCfg.label}
        </span>
      </div>

      {/* Hazard rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {(hazards ?? []).map((h) => {
          const cfg = STATUS_COLORS[h.status] ?? STATUS_COLORS.GREEN;
          return (
            <div key={h.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: 'rgba(200,228,255,0.75)', fontWeight: 500 }}>
                  {h.name}
                </span>
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, fontWeight: 700, color: cfg.text,
                  textShadow: `0 0 6px ${cfg.glow}` }}>
                  {h.score}
                </span>
              </div>
              {/* Bar track */}
              <div style={{ width: '100%', height: 4, background: 'rgba(0,180,255,0.07)', position: 'relative' }}>
                <div
                  role="meter"
                  aria-valuenow={h.score}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${h.name}: ${h.score}`}
                  style={{
                    position:   'absolute',
                    left:       0, top: 0, bottom: 0,
                    width:      `${h.score}%`,
                    background: cfg.bar,
                    boxShadow:  `0 0 6px ${cfg.glow}`,
                    transition: 'width 0.8s ease',
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
