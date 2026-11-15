import bodySvg from '../assets/body-silhouette.svg';

const STATUS = {
  GREEN:  { dot: '#10b981', glow: 'rgba(16, 185, 129, 0.48)', ring: '#6ee7b7', icon: '◆', label: 'Nominal'  },
  YELLOW: { dot: '#f59e0b', glow: 'rgba(245, 158, 11, 0.48)', ring: '#fcd34d', icon: '▲', label: 'Warning'  },
  RED:    { dot: '#f43f5e', glow: 'rgba(244, 63, 94, 0.55)',  ring: '#fda4af', icon: '■', label: 'Critical' },
};

// Coordinates calibrated to viewBox 250x410 in src/assets/body-silhouette.svg
// Front-facing anatomical orientation: patient's left (heart) sits on viewer's right
const NODES = [
  { id: 'brain', label: 'Brain',    px: 50,   py: 6.2  },
  { id: 'eyes',  label: 'Eyes',     px: 50,   py: 12.8 },
  { id: 'lungs', label: 'Lungs',    px: 42.5, py: 29.5 },
  { id: 'heart', label: 'Heart',    px: 57.5, py: 29.5 },
  { id: 'whole', label: 'Core',     px: 50,   py: 47.0 },
  { id: 'bones', label: 'Skeletal', px: 38.5, py: 70.5 },
];

export default function BodyMap({ nodes = {}, selectedNode, onSelectNode, indicatorCounts = {} }) {
  return (
    <div className="astro-body-stage">
      {/* Spacesuit Silhouette scaled proportionally to fill the triage stage */}
      <div className="astro-suit-frame">
        <img
          src={bodySvg}
          alt="Astronaut spacesuit silhouette"
          style={{ width: '100%', height: '100%', display: 'block', userSelect: 'none', pointerEvents: 'none' }}
          draggable={false}
        />

        {/* Clickable nodes */}
        {NODES.map((n) => {
          const status   = nodes[n.id] ?? 'GREEN';
          const c        = STATUS[status] ?? STATUS.GREEN;
          const isActive = selectedNode === n.id;
          const pulse    = status === 'YELLOW' || status === 'RED';
          const size     = isActive ? 22 : 17;

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
                position:       'absolute',
                left:           `${n.px}%`,
                top:            `${n.py}%`,
                transform:      'translate(-50%, -50%)',
                width:          size,
                height:         size,
                borderRadius:   '50%',
                border:         `2px solid ${isActive ? '#ffffff' : c.ring}`,
                background:     c.dot,
                boxShadow:      `0 0 ${isActive ? 16 : 8}px ${c.glow}`,
                cursor:         'pointer',
                padding:        0,
                transition:     'all 0.18s ease',
                zIndex:         isActive ? 10 : 5,
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                color:          '#080c14',
                fontSize:       7,
                fontWeight:     900,
              }}
            >
              <span aria-hidden="true">{c.icon}</span>
            </button>
          );
        })}

        {/* Floating callout for active node */}
        {NODES.map((n) => {
          if (selectedNode !== n.id) return null;
          const status = nodes[n.id] ?? 'GREEN';
          const c      = STATUS[status] ?? STATUS.GREEN;
          const count  = indicatorCounts[n.id];
          const goLeft = n.px <= 50;
          return (
            <div
              key={`lbl-${n.id}`}
              style={{
                position:     'absolute',
                left:         `${n.px}%`,
                top:          `${n.py}%`,
                transform:    goLeft
                  ? 'translate(calc(-100% - 14px), -50%)'
                  : 'translate(14px, -50%)',
                fontFamily:   "'Inter', sans-serif",
                color:        '#f8fafc',
                background:   'rgba(15, 23, 42, 0.96)',
                border:       `1px solid ${c.dot}`,
                borderRadius: 7,
                padding:      '5px 9px',
                whiteSpace:   'nowrap',
                pointerEvents:'none',
                zIndex:       20,
                boxShadow:    '0 8px 20px rgba(0,0,0,0.5)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 700 }}>
                <span style={{ color: c.dot, fontSize: 8.5 }}>{c.icon}</span>
                <span>{n.label}</span>
              </div>
              {count != null && (
                <div style={{ fontSize: 9.5, color: '#94a3b8', marginTop: 1 }}>
                  {count} {count === 1 ? 'indicator' : 'indicators'}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
