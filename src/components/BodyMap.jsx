import { useCallback, useEffect, useRef, useState } from 'react';
import bodySvg from '../assets/body-silhouette.svg';
import Astronaut3D from './Astronaut3D.jsx';

const STATUS = {
  GREEN: { dot: '#10b981', glow: 'rgba(16, 185, 129, 0.50)', ring: '#6ee7b7', icon: '◆', label: 'Nominal' },
  YELLOW: { dot: '#f59e0b', glow: 'rgba(245, 158, 11, 0.55)', ring: '#fcd34d', icon: '▲', label: 'Warning' },
  RED: { dot: '#f43f5e', glow: 'rgba(244, 63, 94, 0.60)', ring: '#fda4af', icon: '■', label: 'Critical' },
};

// Telemetry callouts arranged neatly on left/right margins so large circles never obscure the helmet/visor
const NODES = [
  { id: 'brain', label: 'Brain', side: 'left', pillTop: 12, px: 47, py: 12 },
  { id: 'eyes', label: 'Eyes', side: 'right', pillTop: 22, px: 54, py: 20 },
  { id: 'lungs', label: 'Lungs', side: 'left', pillTop: 37, px: 44, py: 35 },
  { id: 'heart', label: 'Heart', side: 'right', pillTop: 42, px: 56, py: 35 },
  { id: 'whole', label: 'Core', side: 'right', pillTop: 59, px: 52, py: 48 },
  { id: 'bones', label: 'Skeletal', side: 'left', pillTop: 71, px: 44, py: 68 },
];

export default function BodyMap({ nodes = {}, selectedNode, onSelectNode, indicatorCounts = {} }) {
  const [use3D, setUse3D] = useState(true);
  const [hoveredNode, setHoveredNode] = useState(null);

  const stageRef = useRef(null);
  const pipRefs = useRef({});
  const pillRefs = useRef({});
  const lineRefs = useRef({});
  const pillAnchorsRef = useRef({});
  const lastProjectedRef = useRef(
    Object.fromEntries(NODES.map((n) => [n.id, { px: n.px, py: n.py, front: true }])),
  );

  const applyPositions = useCallback((projected) => {
    for (let i = 0; i < NODES.length; i++) {
      const n = NODES[i];
      const p = projected[n.id];
      if (!p) continue;

      const pipEl = pipRefs.current[n.id];
      if (pipEl) {
        pipEl.style.left = `${p.px.toFixed(2)}%`;
        pipEl.style.top = `${p.py.toFixed(2)}%`;
        pipEl.style.opacity = p.front ? '1' : '0.40';
      }

      const lineEl = lineRefs.current[n.id];
      const anchor = pillAnchorsRef.current[n.id];
      if (lineEl && anchor) {
        const elbowX = anchor.ax + (p.px - anchor.ax) * 0.35;
        lineEl.setAttribute(
          'points',
          `${p.px.toFixed(2)},${p.py.toFixed(2)} ${elbowX.toFixed(2)},${anchor.ay.toFixed(2)} ${anchor.ax.toFixed(2)},${anchor.ay.toFixed(2)}`,
        );
        lineEl.style.opacity = p.front ? '1' : '0.35';
      }
    }
  }, []);

  const measurePills = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const sr = stage.getBoundingClientRect();
    if (!sr.width || !sr.height) return;

    for (let i = 0; i < NODES.length; i++) {
      const n = NODES[i];
      const pill = pillRefs.current[n.id];
      if (!pill) continue;
      const pr = pill.getBoundingClientRect();
      const edgeX = n.side === 'left' ? pr.right - sr.left : pr.left - sr.left;
      const centerY = pr.top + pr.height * 0.5 - sr.top;
      pillAnchorsRef.current[n.id] = {
        ax: (edgeX / sr.width) * 100,
        ay: (centerY / sr.height) * 100,
      };
    }

    applyPositions(lastProjectedRef.current);
  }, [applyPositions]);

  useEffect(() => {
    measurePills();
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(measurePills);
    ro.observe(stage);
    return () => ro.disconnect();
  }, [measurePills, use3D, selectedNode]);

  // Update 3D reticle pips & leader lines smoothly at 60fps without triggering React re-renders
  const handleProjectNodes = useCallback((projected) => {
    lastProjectedRef.current = projected;
    applyPositions(projected);
  }, [applyPositions]);

  const handleFallback = useCallback(() => setUse3D(false), []);

  return (
    <div className="astro-body-stage">
      <div ref={stageRef} className="astro-suit-frame">
        {use3D ? (
          <Astronaut3D
            onProjectNodes={handleProjectNodes}
            onFallback={handleFallback}
          />
        ) : (
          <img
            src={bodySvg}
            alt="Astronaut spacesuit silhouette"
            style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', userSelect: 'none', pointerEvents: 'none' }}
            draggable={false}
          />
        )}

        {/* Telemetry SVG leader lines connecting 3D anatomical pips to side callout pills */}
        <svg
          aria-hidden="true"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 6,
            overflow: 'visible',
          }}
        >
          {NODES.map((n) => {
            const status = nodes[n.id] ?? 'GREEN';
            const c = STATUS[status] ?? STATUS.GREEN;
            const emphasized = selectedNode === n.id || hoveredNode === n.id;
            const defaultEdgeX = n.side === 'left' ? 19 : 81;
            const elbowX = defaultEdgeX + (n.px - defaultEdgeX) * 0.35;
            return (
              <polyline
                key={`line-${n.id}`}
                ref={(el) => { lineRefs.current[n.id] = el; }}
                fill="none"
                points={`${n.px},${n.py} ${elbowX.toFixed(2)},${n.pillTop} ${defaultEdgeX},${n.pillTop}`}
                stroke={emphasized ? c.ring : c.dot}
                strokeWidth={emphasized ? 2.4 : 1.5}
                strokeOpacity={emphasized ? 0.96 : 0.62}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
        </svg>

        {/* Subtle precision target pips on the 3D astronaut (never block the helmet/visor) */}
        {NODES.map((n) => {
          const status = nodes[n.id] ?? 'GREEN';
          const c = STATUS[status] ?? STATUS.GREEN;
          const isActive = selectedNode === n.id;
          const isHovered = hoveredNode === n.id;
          const emphasized = isActive || isHovered;
          const pipSize = emphasized ? 12 : 9;
          const pipPulseClass = status === 'RED'
            ? 'node-pulse-crit'
            : status === 'YELLOW'
              ? 'node-pulse'
              : '';

          return (
            <button
              key={`pip-${n.id}`}
              ref={(el) => { pipRefs.current[n.id] = el; }}
              type="button"
              tabIndex={-1}
              aria-hidden="true"
              onPointerDown={(e) => e.stopPropagation()}
              onMouseEnter={() => setHoveredNode(n.id)}
              onMouseLeave={() => setHoveredNode((prev) => (prev === n.id ? null : prev))}
              onClick={() => onSelectNode(n.id)}
              className={pipPulseClass}
              style={{
                position: 'absolute',
                left: `${n.px}%`,
                top: `${n.py}%`,
                transform: 'translate(-50%, -50%)',
                width: 24,
                height: 24,
                borderRadius: '50%',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                padding: 0,
                zIndex: emphasized ? 14 : 7,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span
                style={{
                  width: pipSize,
                  height: pipSize,
                  borderRadius: '50%',
                  background: emphasized ? '#ffffff' : c.dot,
                  border: `1.5px solid ${emphasized ? c.dot : 'rgba(8, 12, 20, 0.9)'}`,
                  boxShadow: emphasized
                    ? `0 0 0 3px ${c.glow}, 0 0 12px ${c.glow}`
                    : `0 0 0 1.5px rgba(8, 12, 20, 0.8), 0 0 7px ${c.glow}`,
                  transition: 'width 0.14s ease, height 0.14s ease, box-shadow 0.14s ease',
                }}
              />
            </button>
          );
        })}

        {/* Ergonomic left/right HUD telemetry callout pills (primary easy-click targets) */}
        {NODES.map((n) => {
          const status = nodes[n.id] ?? 'GREEN';
          const c = STATUS[status] ?? STATUS.GREEN;
          const isActive = selectedNode === n.id;
          const isHovered = hoveredNode === n.id;
          const emphasized = isActive || isHovered;
          const pulse = status === 'YELLOW' || status === 'RED';
          const pillPulseClass = status === 'RED'
            ? 'pill-pulse-crit'
            : status === 'YELLOW'
              ? 'pill-pulse-warn'
              : '';
          const count = indicatorCounts[n.id];

          return (
            <button
              key={n.id}
              ref={(el) => { pillRefs.current[n.id] = el; }}
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onMouseEnter={() => setHoveredNode(n.id)}
              onMouseLeave={() => setHoveredNode((prev) => (prev === n.id ? null : prev))}
              onClick={() => onSelectNode(n.id)}
              aria-label={`${n.label}: ${c.label}`}
              aria-pressed={isActive}
              title={`${n.label} · ${c.label}${count != null ? ` (${count})` : ''}`}
              className={pillPulseClass}
              style={{
                position: 'absolute',
                [n.side]: 'clamp(2px, 1cqw, 8px)',
                top: `${n.pillTop}%`,
                transform: 'translateY(-50%)',
                zIndex: emphasized ? 16 : 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 7,
                minWidth: 'clamp(92px, 22cqw, 120px)',
                padding: 'clamp(6px, 1.4cqw, 8px) clamp(9px, 2.1cqw, 14px)',
                borderRadius: 9,
                background: isActive ? 'rgba(15, 23, 42, 0.96)' : 'rgba(10, 16, 28, 0.86)',
                backdropFilter: 'blur(6px)',
                border: `${isActive ? 1.5 : 1}px solid ${isActive ? (pulse ? c.ring : c.dot) : isHovered ? c.ring : pulse ? c.dot : 'rgba(148, 163, 184, 0.32)'}`,
                ...(pulse ? {} : {
                  boxShadow: isActive
                    ? `0 0 16px ${c.glow}, inset 0 0 0 1px rgba(255,255,255,0.08)`
                    : '0 4px 12px rgba(0, 0, 0, 0.4)',
                }),
                color: isActive ? '#f8fafc' : '#e2e8f0',
                fontFamily: "'Inter', sans-serif",
                fontSize: 'clamp(11.5px, 2.5cqw, 13.5px)',
                fontWeight: isActive ? 700 : 600,
                lineHeight: 1.1,
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                transition: 'border-color 0.14s ease, box-shadow 0.14s ease, background 0.14s ease',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className={pulse && !isActive ? 'crit-blink' : ''} style={{ color: c.dot, fontSize: 'clamp(9.5px, 2cqw, 11.5px)', flexShrink: 0 }}>{c.icon}</span>
                <span>{n.label}</span>
              </span>
              {count != null && (
                <span
                  style={{
                    fontSize: 'clamp(10.5px, 2.2cqw, 12px)',
                    fontWeight: 600,
                    color: isActive ? '#e2e8f0' : '#94a3b8',
                    paddingLeft: 6,
                    borderLeft: '1px solid rgba(148, 163, 184, 0.24)',
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
