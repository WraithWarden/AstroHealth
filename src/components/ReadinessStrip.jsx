export default function ReadinessStrip({
  overallDetails,
  dueSummary,
  dueLabels = [],
}) {
  const redCount    = overallDetails?.redCount ?? 0;
  const yellowCount = overallDetails?.yellowCount ?? 0;
  const streakDays  = overallDetails?.streakDays ?? 0;

  const dueCount     = dueSummary?.dueCount ?? 0;
  const overdueCount = dueSummary?.overdueCount ?? 0;
  const allLogged    = dueSummary?.allLogged ?? dueCount === 0;

  return (
    <div
      style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, width: '100%' }}
      title={dueLabels.length > 0 ? `Due measurements: ${dueLabels.join(', ')}` : 'All scheduled measurements logged'}
    >
      {[
        { label: 'Critical', value: redCount, color: '#fb7185', dot: '#f43f5e' },
        { label: 'Warning',  value: yellowCount, color: '#fbbf24', dot: '#f59e0b' },
        { label: 'Streak',   value: `${streakDays}d`, color: '#38bdf8', dot: '#38bdf8' },
        {
          label: allLogged ? 'Ready' : 'Due',
          value: allLogged ? '✓' : dueCount,
          color: allLogged ? '#34d399' : overdueCount > 0 ? '#fb7185' : '#fbbf24',
          dot:   allLogged ? '#10b981' : overdueCount > 0 ? '#f43f5e' : '#f59e0b',
        },
      ].map(({ label, value, color, dot }) => (
        <div
          key={label}
          style={{
            textAlign: 'center',
            padding: '6px 3px',
            borderRadius: 7,
            background: 'rgba(15, 23, 42, 0.72)',
            border: '1px solid rgba(148, 163, 184, 0.16)',
          }}
        >
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 14, fontWeight: 700, color, lineHeight: 1.15 }}>
            {value}
          </div>
          <div style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 9.5,
            color: '#94a3b8',
            marginTop: 2,
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 3,
          }}>
            <span aria-hidden="true" style={{ width: 5, height: 5, borderRadius: '50%', background: dot, flexShrink: 0 }} />
            <span>{label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
