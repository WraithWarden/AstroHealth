import bodySvg from '../assets/body-silhouette.svg';

const STATUS = {
  GREEN:  { dot: '#00ff9d', glow: 'rgba(0,255,157,0.4)',  ring: 'rgba(0,255,157,0.65)' },
  YELLOW: { dot: '#ffc800', glow: 'rgba(255,200,0,0.4)',  ring: 'rgba(255,200,0,0.65)' },
  RED:    { dot: '#ff3355', glow: 'rgba(255,51,85,0.45)', ring: 'rgba(255,51,85,0.75)' },
};

/*
  Positions calibrated to the SVG viewBox 160×480:

  HEAD:   y=8→80, center y≈44, top y≈22
  EYES:   mid-face  y≈46,  x=80  →  50%, 46/480 = 9.6%
  BRAIN:  upper head y≈24, x=80  →  50%, 24/480 = 5.0%
  HEART:  left chest  x≈62, y≈128 →  62/160=38.8%, 128/480=26.7%
  LUNGS:  right chest x≈98, y≈128 →  98/160=61.3%, 128/480=26.7%
  WHOLE:  navel/core  x=80, y≈218 →  50%, 218/480=45.4%
  BONES:  mid-thigh   x=80, y≈375 →  50%, 375/480=78.1%
*/
const NODES = [
  { id: 'brain', label: 'Brain',    px: 50,   py: 5.0  },
  { id: 'eyes',  label: 'Eyes',     px: 50,   py: 9.6  },
  { id: 'heart', label: 'Heart',    px: 38.8, py: 26.7 },
  { id: 'lungs', label: 'Lungs',    px: 61.3, py: 26.7 },
  { id: 'whole', label: 'Core',     px: 50,   py: 45.4 },
  { id: 'bones', label: 'Skeletal', px: 50,   py: 78.1 },
];

/*
  Display container: width=138px → height = 138 × (480/160) = 414px
  This keeps the SVG pixel-perfect with its viewBox ratio.
*/
const W = 138;
const H = Math.round(W * (480 / 160)); // 414

export default function BodyMap({ nodes = {}, selectedNode, onSelectNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{ position: 'relative', width: W, height: H, flexShrink: 0 }}>
        <img
          src={bodySvg}
          alt="Human body silhouette"
          width={W}
          height={H}
          style={{ display: 'block', userSelect: 'none', pointerEvents: 'none' }}
          draggable={false}
        />

        {/* Clickable nodes */}
        {NODES.map((n) => {
          const status   = nodes[n.id] ?? 'GREEN';
          const c        = STATUS[status] ?? STATUS.GREEN;
          const isActive = selectedNode === n.id;
          const pulse    = status === 'YELLOW' || status === 'RED';
          const size     = isActive ? 18 : 14;

          return (
            <button
              key={n.id}
              onClick={() => onSelectNode(n.id)}
              aria-label={`${n.label}: ${status}`}
              aria-pressed={isActive}
              title={`${n.label} · ${status}`}
              style={{
                position:     'absolute',
                left:         `${n.px}%`,
                top:          `${n.py}%`,
                transform:    'translate(-50%, -50%)',
                width:        size,
                height:       size,
                borderRadius: '50%',
                border:       `2px solid ${c.ring}`,
                background:   c.dot,
                boxShadow:    `0 0 ${isActive ? 14 : 7}px ${c.glow}, 0 0 ${isActive ? 24 : 0}px ${c.glow}`,
                cursor:       'pointer',
                padding:      0,
                outline:      'none',
                transition:   'all 0.2s ease',
                animation:    pulse && !isActive ? 'nodePulse 1.6s ease-in-out infinite' : 'none',
                zIndex:       isActive ? 10 : 5,
              }}
            />
          );
        })}

        {/* Floating label for active node */}
        {NODES.map((n) => {
          if (selectedNode !== n.id) return null;
          const status = nodes[n.id] ?? 'GREEN';
          const c      = STATUS[status] ?? STATUS.GREEN;
          const goLeft = n.px > 54;
          return (
            <div
              key={`lbl-${n.id}`}
              style={{
                position:    'absolute',
                left:        `${n.px}%`,
                top:         `${n.py}%`,
                transform:   goLeft
                  ? 'translate(calc(-100% - 11px), -50%)'
                  : 'translate(11px, -50%)',
                fontFamily:  "'Orbitron', sans-serif",
                fontSize:    8,
                fontWeight:  700,
                letterSpacing: '0.12em',
                color:       c.dot,
                whiteSpace:  'nowrap',
                pointerEvents: 'none',
                textShadow:  `0 0 8px ${c.glow}`,
                zIndex:      20,
              }}
            >
              {n.label.toUpperCase()}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 12 }}>
        {[
          { label: 'Nominal',  color: '#00ff9d' },
          { label: 'Warning',  color: '#ffc800' },
          { label: 'Critical', color: '#ff3355' },
        ].map(({ label, color }) => (
          <span
            key={label}
            style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 8,
              fontFamily: "'Space Mono', monospace", color: 'rgba(200,228,255,0.45)' }}
          >
            <span style={{
              width: 7, height: 7, borderRadius: '50%',
              background: color, boxShadow: `0 0 4px ${color}`,
              display: 'inline-block', flexShrink: 0,
            }}/>
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
