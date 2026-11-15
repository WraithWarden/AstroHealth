import { useEffect, useState } from 'react';

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
        ? { label: 'CRITICAL', color: '#fb7185' }
        : measuredMm >= 5.0
          ? { label: 'WARNING', color: '#fbbf24' }
          : { label: 'NOMINAL', color: '#34d399' };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="hud-panel fade-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby="onsd-caliper-title"
        onClick={(e) => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 490, padding: 22 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <div>
            <div className="hud-label">1B-i · Ocular Ultrasound Caliper</div>
            <h3 id="onsd-caliper-title" style={{ margin: '4px 0 0', fontFamily: "'Inter', sans-serif", fontSize: 16, fontWeight: 700, color: '#f8fafc' }}>
              ONSD Two-Click Measurement
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close caliper"
            style={{
              background: 'rgba(30, 41, 59, 0.7)',
              border: '1px solid rgba(148, 163, 184, 0.25)',
              borderRadius: 6,
              color: '#cbd5e1',
              fontFamily: "'Inter', sans-serif",
              fontSize: 12,
              padding: '4px 9px',
              cursor: 'pointer',
            }}
          >
            Esc ✕
          </button>
        </div>

        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12.5, color: '#cbd5e1', margin: '0 0 12px', lineHeight: 1.5 }}>
          Click <strong>two points</strong> across the optic nerve sheath 3 mm posterior to the retina. Pixel distance converts to mm using the calibrated <strong>10 mm</strong> scale bar.
        </p>

        {/* Simulated B-mode ocular ultrasound canvas */}
        <svg
          viewBox="0 0 400 260"
          onClick={handleSvgClick}
          style={{
            width: '100%',
            height: 'auto',
            display: 'block',
            background: '#050911',
            borderRadius: 8,
            border: '1px solid rgba(148, 163, 184, 0.24)',
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

          <rect x="0" y="130" width="400" height="130" fill="#102030" opacity="0.65" />
          <rect x="170.5" y="135" width="59" height="120" fill="url(#sheathGrad)" />
          <rect x="184" y="135" width="32" height="120" fill="#060d16" opacity="0.7" />

          <ellipse cx="200" cy="82" rx="108" ry="66" fill="url(#globeGrad)" stroke="#5c8ab0" strokeWidth="2.2" />
          <path d="M 155 24 Q 200 12 245 24" fill="none" stroke="#85b4d9" strokeWidth="1.5" opacity="0.75" />

          <line x1="125" y1="178" x2="275" y2="178" stroke="rgba(56, 189, 248, 0.5)" strokeWidth="1" strokeDasharray="4 3" />
          <text x="128" y="172" fill="#7dd3fc" style={{ fontFamily: "'Space Mono', monospace", fontSize: 8.5 }}>
            3 mm posterior guide
          </text>

          <g transform="translate(366, 40)">
            <line x1="0" y1="0" x2="0" y2="100" stroke="#34d399" strokeWidth="2" />
            <line x1="-5" y1="0" x2="5" y2="0" stroke="#34d399" strokeWidth="1.5" />
            <line x1="-5" y1="50" x2="2" y2="50" stroke="#34d399" strokeWidth="1" />
            <line x1="-5" y1="100" x2="5" y2="100" stroke="#34d399" strokeWidth="1.5" />
            <text x="-8" y="-7" textAnchor="end" fill="#34d399" style={{ fontFamily: "'Space Mono', monospace", fontSize: 8.5, fontWeight: 700 }}>
              10 mm scale
            </text>
            <text x="-8" y="53" textAnchor="end" fill="#6ee7b7" style={{ fontFamily: "'Space Mono', monospace", fontSize: 7.5 }}>
              5 mm
            </text>
          </g>

          {points.map((pt, idx) => (
            <g key={idx}>
              <circle cx={pt.x} cy={pt.y} r="4" fill="#fbbf24" stroke="#03080f" strokeWidth="1" />
              <line x1={pt.x - 7} y1={pt.y} x2={pt.x + 7} y2={pt.y} stroke="#fbbf24" strokeWidth="1" />
              <line x1={pt.x} y1={pt.y - 7} x2={pt.x} y2={pt.y + 7} stroke="#fbbf24" strokeWidth="1" />
            </g>
          ))}
          {points.length === 2 && (
            <line
              x1={points[0].x}
              y1={points[0].y}
              x2={points[1].x}
              y2={points[1].y}
              stroke="#fbbf24"
              strokeWidth="1.5"
              strokeDasharray="3 2"
            />
          )}
        </svg>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, gap: 10, flexWrap: 'wrap' }}>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: '#e2e8f0' }}>
            {points.length === 0 && `Current ONSD: ${currentValue} mm · Click point 1 (left margin)`}
            {points.length === 1 && 'Point 1 placed · Click point 2 (right margin)'}
            {measuredMm != null && (
              <span>
                Measured:{' '}
                <strong style={{ fontFamily: "'Space Mono', monospace", color: previewStatus.color, fontSize: 13 }}>{measuredMm} mm</strong>{' '}
                <span style={{ color: previewStatus.color, fontWeight: 600 }}>({previewStatus.label})</span>
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={() => setPoints([])}
              style={{
                padding: '7px 12px',
                borderRadius: 6,
                background: 'rgba(30, 41, 59, 0.7)',
                border: '1px solid rgba(148, 163, 184, 0.25)',
                color: '#cbd5e1',
                fontFamily: "'Inter', sans-serif",
                fontSize: 11.5,
                cursor: 'pointer',
              }}
            >
              Reset
            </button>
            {measuredMm != null && onApply && (
              <button
                type="button"
                onClick={() => {
                  onApply(measuredMm);
                  onClose?.();
                }}
                style={{
                  padding: '7px 14px',
                  borderRadius: 6,
                  background: 'rgba(16, 185, 129, 0.16)',
                  border: '1px solid rgba(16, 185, 129, 0.45)',
                  color: '#34d399',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 11.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Log ONSD ({measuredMm} mm)
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
