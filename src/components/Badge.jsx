const BADGE_CONFIG = {
  NOMINAL:  { bg: 'bg-green-500/20',  border: 'border-green-500',  text: 'text-green-400',  icon: '✓', label: 'NOMINAL'   },
  WARNING:  { bg: 'bg-yellow-500/20', border: 'border-yellow-500', text: 'text-yellow-400', icon: '⚠', label: 'WARNING'   },
  CRITICAL: { bg: 'bg-red-500/20',    border: 'border-red-500',    text: 'text-red-400',    icon: '✕', label: 'CRITICAL'  },
};

export default function Badge({ status }) {
  const cfg = BADGE_CONFIG[status] ?? BADGE_CONFIG.NOMINAL;
  return (
    <div
      className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-sm font-bold tracking-widest ${cfg.bg} ${cfg.border} ${cfg.text}`}
      role="status"
      aria-label={`Health status: ${cfg.label}`}
    >
      <span aria-hidden="true">{cfg.icon}</span>
      <span>{cfg.label}</span>
    </div>
  );
}
