const STATUS_COLORS = {
  GREEN:  { bar: 'bg-green-500',  text: 'text-green-400'  },
  YELLOW: { bar: 'bg-yellow-500', text: 'text-yellow-400' },
  RED:    { bar: 'bg-red-500',    text: 'text-red-400'    },
};

const AUTONOMY_LABELS = {
  A0: { label: 'A0 Real-time',  color: 'text-green-400',  bg: 'bg-green-500/20'  },
  A1: { label: 'A1 Delayed',    color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
  A2: { label: 'A2 Autonomous', color: 'text-red-400',    bg: 'bg-red-500/20'    },
};

export default function HazardBars({ hazards, autonomy }) {
  const autonomyCfg = AUTONOMY_LABELS[autonomy] ?? AUTONOMY_LABELS.A0;

  return (
    <div className="space-y-3 w-full">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Hazards</span>
        {/* Autonomy chip — slot reserved for Person 1 to fill */}
        <span
          className={`text-xs font-bold px-2 py-0.5 rounded-full ${autonomyCfg.color} ${autonomyCfg.bg}`}
          aria-label={`Autonomy level: ${autonomyCfg.label}`}
        >
          {autonomyCfg.label}
        </span>
      </div>
      {(hazards ?? []).map((h) => {
        const cfg = STATUS_COLORS[h.status] ?? STATUS_COLORS.GREEN;
        return (
          <div key={h.id} className="space-y-0.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-300 font-medium">{h.name}</span>
              <span className={`font-bold ${cfg.text}`}>{h.score}</span>
            </div>
            <div className="w-full h-2.5 bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${cfg.bar}`}
                style={{ width: `${h.score}%`, transition: 'width 0.6s ease' }}
                role="meter"
                aria-valuenow={h.score}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${h.name}: ${h.score}`}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
