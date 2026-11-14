import { useEffect, useState } from 'react';

// Scale calibration inside the 400x260 ultrasound viewBox: 100 SVG px = 10 mm => 10 px/mm.
const PX_PER_MM = 10;

export default function OnsdCaliperModal({ open = false, currentValue = 5.9, onClose, onApply }) {
  const [points, setPoints] = useState([]);

  useEffect(() => {
    if (!open) return undefined;
    setPoints([]);
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleSvgClick = (e) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 400;
    const y = ((e.clientY - rect.top) / rect.height) * 260;

    setPoints((prev) => {
      if (prev.length >= 2) return [{ x, y }];
      return [...prev, { x, y }];
    });
  };

  let measuredMm = null;
  if (points.length === 2) {
    const dx = points[1].x - points[0].x;
    const dy = points[1].y - points[0].y;
    const px = Math.hypot(dx, dy);
    measuredMm = Math.round((px / PX_PER_MM) * 100) / 100;
  }

  const previewStatus =
    measuredMm == null
      ? null
      : measuredMm >= 5.8
        ? { label: 'RED', color: '#ff3355' }
        : measuredMm >= 5.0
          ? { label: 'YELLOW', color: '#ffc800' }
          : { label: 'GREEN', color: '#00ff9d' };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="hud-panel fade-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby="onsd-caliper-title"
        onClick={(e) => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 480, padding: 18 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div>
            <div className="hud-label">1B-i · SANS / ICP SCREENING TOOL</div>
            <h3 id="onsd-caliper-title" style={{ margin: '3px 0 0', fontFamily: "'Orbitron', sans-serif", fontSize: 12, color: '#c8e4ff' }}>
              ONSD TWO-CLICK ULTRASOUND CALIPER
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: '1px solid rgba(0,180,255,0.25)', color: 'rgba(200,228,255,0.7)', fontFamily: "'Space Mono', monospace", fontSize: 10, padding: '3px 8px', cursor: 'pointer' }}
          >
            ESC
          </button>
        </div>

        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11.5, color: 'rgba(200,228,255,0.75)', margin: '0 0 10px', lineHeight: 1.45 }}>
          Click <strong>two points</strong> across the hypoechoic optic nerve sheath 3 mm posterior to the globe. Distance converts from pixels to mm using the <strong>10 mm</strong> scale bar.
        </p>

        {/* Simulated B-mode ocular ultrasound canvas */}
        <svg
          viewBox="0 0 400 260"
          onClick={handleSvgClick}
          style={{
            width: '100%',
            height: 'auto',
            display: 'block',
            background: '#03080f',
            border: '1px solid rgba(0,180,255,0.25)',
            cursor: 'crosshair',
            userSelect: 'none',
          }}
        >
          <defs>
            <radialGradient id="globeGrad" cx="50%" cy="45%" r="55%">
              <stop offset="0%" stopColor="#02050a" />
              <stop offset="82%" stopColor="#06121f" />
              <stop offset="100%" stopColor="#355570" />
            </radialGradient>
            <linearGradient id="sheathGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#587c9c" stopOpacity="0.65" />
              <stop offset="16%" stopColor="#0a1624" stopOpacity="0.95" />
              <stop offset="50%" stopColor="#1b2c40" stopOpacity="0.85" />
              <stop offset="84%" stopColor="#0a1624" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#587c9c" stopOpacity="0.65" />
            </linearGradient>
          </defs>

          {/* Retrobulbar tissue echogenicity */}
          <rect x="0" y="130" width="400" height="130" fill="#102030" opacity="0.65" />
          {/* Optic nerve + sheath shadow (59 px wide = 5.9 mm visual cue, user measures freely) */}
          <rect x="170.5" y="135" width="59" height="120" fill="url(#sheathGrad)" />
          <rect x="184" y="135" width="32" height="120" fill="#060d16" opacity="0.7" />

          {/* Ocular globe (vitreous chamber) */}
          <ellipse cx="200" cy="82" rx="108" ry="66" fill="url(#globeGrad)" stroke="#5c8ab0" strokeWidth="2.2" />
          {/* Anterior cornea/lens hint */}
          <path d="M 155 24 Q 200 12 245 24" fill="none" stroke="#85b4d9" strokeWidth="1.5" opacity="0.75" />

          {/* 3 mm posterior measurement guide line (3 * 10px = 30 px below posterior retina y=148 => y=178) */}
          <line x1="125" y1="178" x2="275" y2="178" stroke="rgba(0,180,255,0.4)" strokeWidth="1" strokeDasharray="4 3" />
          <text x="128" y="173" fill="rgba(0,180,255,0.7)" style={{ fontFamily: "'Space Mono', monospace", fontSize: 8 }}>
            3 mm posterior guide
          </text>

          {/* Calibrated 10 mm Scale Bar (100 px = 10 mm) */}
          <g transform="translate(366, 40)">
            <line x1="0" y1="0" x2="0" y2="100" stroke="#00ff9d" strokeWidth="2" />
            <line x1="-5" y1="0" x2="5" y2="0" stroke="#00ff9d" strokeWidth="1.5" />
            <line x1="-5" y1="50" x2="2" y2="50" stroke="#00ff9d" strokeWidth="1" />
            <line x1="-5" y1="100" x2="5" y2="100" stroke="#00ff9d" strokeWidth="1.5" />
            <text x="-8" y="-7" textAnchor="end" fill="#00ff9d" style={{ fontFamily: "'Space Mono', monospace", fontSize: 8.5, fontWeight: 700 }}>
              10 mm scale
            </text>
            <text x="-8" y="53" textAnchor="end" fill="rgba(0,255,157,0.75)" style={{ fontFamily: "'Space Mono', monospace", fontSize: 7.5 }}>
              5 mm
            </text>
          </g>

          {/* Caliper points & connecting line */}
          {points.map((pt, idx) => (
            <g key={idx}>
              <circle cx={pt.x} cy={pt.y} r="4" fill="#ffc800" stroke="#03080f" strokeWidth="1" />
              <line x1={pt.x - 7} y1={pt.y} x2={pt.x + 7} y2={pt.y} stroke="#ffc800" strokeWidth="1" />
              <line x1={pt.x} y1={pt.y - 7} x2={pt.x} y2={pt.y + 7} stroke="#ffc800" strokeWidth="1" />
            </g>
          ))}
          {points.length === 2 && (
            <line
              x1={points[0].x}
              y1={points[0].y}
              x2={points[1].x}
              y2={points[1].y}
              stroke="#ffc800"
              strokeWidth="1.5"
              strokeDasharray="3 2"
            />
          )}
        </svg>

        {/* Readout & Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, gap: 10, flexWrap: 'wrap' }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: '#c8e4ff' }}>
            {points.length === 0 && `Current ONSD: ${currentValue} mm · Click point 1 (left margin)`}
            {points.length === 1 && 'Point 1 placed · Click point 2 (opposite margin)'}
            {measuredMm != null && (
              <span>
                Measured:{' '}
                <strong style={{ color: previewStatus.color, fontSize: 12 }}>{measuredMm} mm</strong>{' '}
                <span style={{ color: previewStatus.color }}>[{previewStatus.label}]</span>
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              onClick={() => setPoints([])}
              style={{
                padding: '6px 10px',
                background: 'none',
                border: '1px solid rgba(0,180,255,0.25)',
                color: 'rgba(200,228,255,0.7)',
                fontFamily: "'Orbitron', sans-serif",
                fontSize: 8.5,
                cursor: 'pointer',
              }}
            >
              RESET
            </button>
            {measuredMm != null && onApply && (
              <button
                type="button"
                onClick={() => {
                  onApply(measuredMm);
                  onClose?.();
                }}
                style={{
                  padding: '6px 12px',
                  background: 'rgba(0,255,157,0.14)',
                  border: '1px solid rgba(0,255,157,0.55)',
                  color: '#00ff9d',
                  fontFamily: "'Orbitron', sans-serif",
                  fontSize: 8.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                LOG ONSD ({measuredMm} mm)
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
