import bodySvg from '../assets/body-silhouette.svg';

const STATUS = {
  GREEN:  { dot: '#10b981', glow: 'rgba(16, 185, 129, 0.45)', ring: '#6ee7b7', icon: '◆', label: 'Nominal'  },
  YELLOW: { dot: '#f59e0b', glow: 'rgba(245, 158, 11, 0.45)', ring: '#fcd34d', icon: '▲', label: 'Warning'  },
  RED:    { dot: '#f43f5e', glow: 'rgba(244, 63, 94, 0.5)',   ring: '#fda4af', icon: '■', label: 'Critical' },
};

const NODES = [
  { id: 'brain', label: 'Brain',    px: 50,   py: 5.0  },
  { id: 'eyes',  label: 'Eyes',     px: 50,   py: 9.6  },
  { id: 'heart', label: 'Heart',    px: 38.8, py: 26.7 },
  { id: 'lungs', label: 'Lungs',    px: 61.3, py: 26.7 },
  { id: 'whole', label: 'Core',     px: 50,   py: 45.4 },
  { id: 'bones', label: 'Skeletal', px: 50,   py: 78.1 },
];

const W = 132;
const H = Math.round(W * (480 / 160)); // 396

export default function BodyMap({ nodes = {}, selectedNode, onSelectNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, width: '100%' }}>
      {/* Anatomical Silhouette Canvas */}
      <div style={{ position: 'relative', width: W, height: H, flexShrink: 0, margin: '4px 0' }}>
        <img
          src={bodySvg}
          alt="Human body silhouette"
          width={W}
          height={H}
          style={{ display: 'block', userSelect: 'none', pointerEvents: 'none', opacity: 0.85 }}
          draggable={false}
        />

        {/* Clickable nodes */}
        {NODES.map((n) => {
          const status   = nodes[n.id] ?? 'GREEN';
          const c        = STATUS[status] ?? STATUS.GREEN;
          const isActive = selectedNode === n.id;
          const pulse    = status === 'YELLOW' || status === 'RED';
          const size     = isActive ? 20 : 15;

          return (
            <button
              key={n.id}
              type="button"
              onClick={() => onSelectNode(n.id)}
              aria-label={`${n.label}: ${c.label}`}
              aria-pressed={isActive}
              title={`${n.label} · ${c.label}`}
              className={pulse && !isActive ? 'node-pulse' : ''}
              style={{
                position:     'absolute',
                left:         `${n.px}%`,
                top:          `${n.py}%`,
                transform:    'translate(-50%, -50%)',
                width:        size,
                height:       size,
                borderRadius: '50%',
                border:       `2px solid ${isActive ? '#ffffff' : c.ring}`,
                background:   c.dot,
                boxShadow:    `0 0 ${isActive ? 16 : 8}px ${c.glow}`,
                cursor:       'pointer',
                padding:      0,
                transition:   'all 0.18s ease',
                zIndex:       isActive ? 10 : 5,
                display:      'flex',
                alignItems:   'center',
                justifyContent: 'center',
                color:        '#080c14',
                fontSize:     7,
                fontWeight:   900,
              }}
            >
              <span aria-hidden="true">{c.icon}</span>
            </button>
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
                position:      'absolute',
                left:          `${n.px}%`,
                top:           `${n.py}%`,
                transform:     goLeft
                  ? 'translate(calc(-100% - 14px), -50%)'
                  : 'translate(14px, -50%)',
                fontFamily:    "'Inter', sans-serif",
                fontSize:      11,
                fontWeight:    600,
                color:         '#f8fafc',
                background:    'rgba(15, 23, 42, 0.95)',
                border:        `1px solid ${c.dot}`,
                borderRadius:  6,
                padding:       '3px 8px',
                whiteSpace:    'nowrap',
                pointerEvents: 'none',
                zIndex:        20,
                boxShadow:     '0 4px 12px rgba(0,0,0,0.4)',
                display:       'flex',
                alignItems:    'center',
                gap:           5,
              }}
            >
              <span style={{ color: c.dot, fontSize: 9 }}>{c.icon}</span>
              <span>{n.label}</span>
            </div>
          );
        })}
      </div>

      {/* Quick Anatomical Node Pills (accessible & clear in grayscale) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, width: '100%', maxWidth: 280 }}>
        {NODES.map((n) => {
          const status   = nodes[n.id] ?? 'GREEN';
          const c        = STATUS[status] ?? STATUS.GREEN;
          const isActive = selectedNode === n.id;
          return (
            <button
              key={`pill-${n.id}`}
              type="button"
              onClick={() => onSelectNode(n.id)}
              style={{
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                gap:            5,
                padding:        '6px 8px',
                borderRadius:   6,
                cursor:         'pointer',
                fontFamily:     "'Inter', sans-serif",
                fontSize:       11,
                fontWeight:     isActive ? 600 : 500,
                color:          isActive ? '#f8fafc' : '#cbd5e1',
                background:     isActive ? 'rgba(56, 189, 248, 0.16)' : 'rgba(30, 41, 59, 0.55)',
                border:         isActive ? '1px solid #38bdf8' : '1px solid rgba(148, 163, 184, 0.16)',
                transition:     'all 0.15s ease',
              }}
            >
              <span aria-hidden="true" style={{ color: c.dot, fontSize: 9 }}>{c.icon}</span>
              <span>{n.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
