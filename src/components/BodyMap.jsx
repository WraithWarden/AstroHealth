import { useState } from 'react';

const STATUS_COLORS = {
  GREEN:  { fill: '#22c55e', glow: '#22c55e' },
  YELLOW: { fill: '#eab308', glow: '#eab308' },
  RED:    { fill: '#ef4444', glow: '#ef4444' },
};

// Node definitions: id, label, cx, cy (positions on the SVG figure)
const NODES = [
  { id: 'brain',  label: 'Brain',          cx: 100, cy: 42  },
  { id: 'eyes',   label: 'Eyes',           cx: 100, cy: 62  },
  { id: 'heart',  label: 'Heart / Vessels',cx: 100, cy: 110 },
  { id: 'lungs',  label: 'Lungs',          cx: 100, cy: 130 },
  { id: 'bones',  label: 'Bones',          cx: 100, cy: 185 },
  { id: 'whole',  label: 'Whole Body',     cx: 100, cy: 220 },
];

export default function BodyMap({ nodes = {}, selectedNode, onSelectNode }) {
  const [hovered, setHovered] = useState(null);

  return (
    <div className="flex flex-col items-center select-none">
      <svg
        width="200" height="300"
        viewBox="0 0 200 300"
        aria-label="Body map with clickable health nodes"
        role="img"
      >
        {/* ── Human figure outline ── */}
        {/* Head */}
        <ellipse cx="100" cy="38" rx="20" ry="24" fill="#1e293b" stroke="#475569" strokeWidth="2" />
        {/* Neck */}
        <rect x="93" y="60" width="14" height="12" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />
        {/* Torso */}
        <path d="M70 72 Q65 100 68 145 L132 145 Q135 100 130 72 Z" fill="#1e293b" stroke="#475569" strokeWidth="2" />
        {/* Left arm */}
        <path d="M70 75 Q52 100 50 148" fill="none" stroke="#475569" strokeWidth="10" strokeLinecap="round" />
        {/* Right arm */}
        <path d="M130 75 Q148 100 150 148" fill="none" stroke="#475569" strokeWidth="10" strokeLinecap="round" />
        {/* Left leg */}
        <path d="M82 145 Q78 190 76 240" fill="none" stroke="#475569" strokeWidth="12" strokeLinecap="round" />
        {/* Right leg */}
        <path d="M118 145 Q122 190 124 240" fill="none" stroke="#475569" strokeWidth="12" strokeLinecap="round" />

        {/* ── Clickable nodes ── */}
        {NODES.map((node) => {
          const status = nodes[node.id] ?? 'GREEN';
          const colors = STATUS_COLORS[status] ?? STATUS_COLORS.GREEN;
          const isSelected = selectedNode === node.id;
          const isHovered  = hovered === node.id;
          const shouldPulse = status === 'YELLOW' || status === 'RED';

          return (
            <g
              key={node.id}
              tabIndex={0}
              role="button"
              aria-label={`${node.label}: ${status}`}
              aria-pressed={isSelected}
              onClick={() => onSelectNode(node.id)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelectNode(node.id); }}
              onMouseEnter={() => setHovered(node.id)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: 'pointer', outline: 'none' }}
            >
              {/* Pulse ring for Yellow / Red */}
              {shouldPulse && (
                <circle
                  cx={node.cx} cy={node.cy} r={isSelected ? 14 : 11}
                  fill="none"
                  stroke={colors.fill}
                  strokeWidth="2"
                  opacity="0.5"
                  style={{ animation: 'bodyPulse 1.5s ease-in-out infinite' }}
                />
              )}
              {/* Glow on hover / selected */}
              {(isHovered || isSelected) && (
                <circle
                  cx={node.cx} cy={node.cy} r="13"
                  fill={colors.fill}
                  opacity="0.15"
                />
              )}
              {/* Main dot */}
              <circle
                cx={node.cx} cy={node.cy} r={isSelected ? 10 : 8}
                fill={colors.fill}
                opacity={isHovered ? 1 : 0.9}
                style={{ transition: 'r 0.2s, opacity 0.2s' }}
              />
              {/* Selection ring */}
              {isSelected && (
                <circle
                  cx={node.cx} cy={node.cy} r="13"
                  fill="none"
                  stroke={colors.fill}
                  strokeWidth="2"
                />
              )}
              {/* Hover label */}
              {isHovered && (
                <text
                  x={node.cx + 16} y={node.cy + 4}
                  fontSize="10"
                  fill="#f8fafc"
                  style={{ pointerEvents: 'none' }}
                >
                  {node.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Pulse keyframe injected via style tag */}
      <style>{`
        @keyframes bodyPulse {
          0%, 100% { opacity: 0.5; r: 11px; }
          50%       { opacity: 0.9; r: 14px; }
        }
      `}</style>

      {/* Legend */}
      <div className="flex gap-4 mt-2 text-xs">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />Nominal</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" />Warning</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />Critical</span>
      </div>
    </div>
  );
}
