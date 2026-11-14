import bodySvg from '../assets/body-silhouette.svg';

const STATUS = {
  GREEN:  { dot: '#00ff9d', glow: 'rgba(0,255,157,0.35)',  ring: 'rgba(0,255,157,0.6)'  },
  YELLOW: { dot: '#ffc800', glow: 'rgba(255,200,0,0.35)',  ring: 'rgba(255,200,0,0.6)'  },
  RED:    { dot: '#ff3355', glow: 'rgba(255,51,85,0.4)',   ring: 'rgba(255,51,85,0.7)'  },
};

/*
  Node positions as % of the SVG container (160×460 viewBox)
  Matching the lo-fi: head top, eyes mid-head, heart left-chest,
  lungs right-chest, core/whole abdomen, bones lower legs
*/
const NODES = [
  { id: 'brain',  label: 'Brain',      px: 50,  py: 7.2  },
  { id: 'eyes',   label: 'Eyes',       px: 50,  py: 13.5 },
  { id: 'heart',  label: 'Heart',      px: 36,  py: 29   },
  { id: 'lungs',  label: 'Lungs',      px: 64,  py: 29   },
  { id: 'whole',  label: 'Core',       px: 50,  py: 45   },
  { id: 'bones',  label: 'Skeletal',   px: 50,  py: 78   },
];

export default function BodyMap({ nodes = {}, selectedNode, onSelectNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      {/* Container sized to match the SVG viewBox aspect ratio 160:460 */}
      <div style={{ position: 'relative', width: 148, height: 426 }}>
        <img
          src={bodySvg}
          alt="Human body silhouette"
          style={{ width: '100%', height: '100%', display: 'block', userSelect: 'none' }}
          draggable={false}
        />

        {NODES.map((n) => {
          const status   = nodes[n.id] ?? 'GREEN';
          const colors   = STATUS[status] ?? STATUS.GREEN;
          const isActive = selectedNode === n.id;
          const shouldPulse = status === 'YELLOW' || status === 'RED';

          return (
            <button
              key={n.id}
              onClick={() => onSelectNode(n.id)}
              aria-label={`${n.label}: ${status}`}
              aria-pressed={isActive}
              style={{
                position:  'absolute',
                left:      `${n.px}%`,
                top:       `${n.py}%`,
                transform: 'translate(-50%, -50%)',
                width:     isActive ? 20 : 16,
                height:    isActive ? 20 : 16,
                borderRadius: '50%',
                border:    `2px solid ${colors.ring}`,
                background: colors.dot,
                boxShadow: `0 0 ${isActive ? 12 : 6}px ${colors.glow}`,
                cursor:    'pointer',
                padding:   0,
                outline:   'none',
                transition: 'all 0.2s ease',
                animation: shouldPulse && !isActive ? 'nodePulse 1.6s ease-in-out infinite' : 'none',
                zIndex:    isActive ? 10 : 5,
              }}
              title={`${n.label} · ${status}`}
            />
          );
        })}

        {/* Floating labels for active node */}
        {NODES.map((n) => {
          const status   = nodes[n.id] ?? 'GREEN';
          const colors   = STATUS[status] ?? STATUS.GREEN;
          const isActive = selectedNode === n.id;
          if (!isActive) return null;
          const goLeft = n.px > 50;
          return (
            <div
              key={`label-${n.id}`}
              style={{
                position:   'absolute',
                left:       `${n.px}%`,
                top:        `${n.py}%`,
                transform:  goLeft
                  ? 'translate(calc(-100% - 10px), -50%)'
                  : 'translate(10px, -50%)',
                fontFamily: "'Orbitron', sans-serif",
                fontSize:   9,
                fontWeight: 600,
                letterSpacing: '0.1em',
                color:      colors.dot,
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
                textShadow: `0 0 8px ${colors.glow}`,
                zIndex:     20,
              }}
            >
              {n.label.toUpperCase()}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 12, marginTop: 2 }}>
        {[
          { label: 'Nominal',  color: '#00ff9d' },
          { label: 'Warning',  color: '#ffc800' },
          { label: 'Critical', color: '#ff3355' },
        ].map(({ label, color }) => (
          <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9,
            fontFamily: "'Space Mono', monospace", color: 'rgba(200,228,255,0.5)' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: color,
              boxShadow: `0 0 4px ${color}`, display: 'inline-block' }}/>
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
