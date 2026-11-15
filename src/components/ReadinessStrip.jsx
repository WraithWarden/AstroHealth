export default function ReadinessStrip({
  overallDetails,
  dueSummary,
  actionProgress,
  onDownloadJson,
  onDownloadTxt,
  dueLabels = [],
}) {
  const redCount = overallDetails?.redCount ?? 0;
  const yellowCount = overallDetails?.yellowCount ?? 0;
  const streakDays = overallDetails?.streakDays ?? 0;

  const dueCount = dueSummary?.dueCount ?? 0;
  const overdueCount = dueSummary?.overdueCount ?? 0;
  const allLogged = dueSummary?.allLogged ?? dueCount === 0;

  const completed = actionProgress?.completed ?? 0;
  const total = actionProgress?.total ?? 0;
  const pct = total > 0 ? Math.min(1, completed / total) : 1;

  const r = 14;
  const circ = 2 * Math.PI * r;
  const dashOffset = circ * (1 - pct);
  const ringColor = total === 0 || pct >= 1 ? '#10b981' : pct >= 0.5 ? '#f59e0b' : '#38bdf8';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Top metrics row: RED | YELLOW | STREAK | ACTION RING */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1.35fr', gap: 6, alignItems: 'stretch' }}>
        {[
          { label: 'Critical', value: redCount, color: '#fb7185', icon: '■' },
          { label: 'Warning', value: yellowCount, color: '#fbbf24', icon: '▲' },
          { label: 'Streak', value: `${streakDays}d`, color: '#38bdf8', icon: '◆' },
        ].map(({ label, value, color, icon }) => (
          <div
            key={label}
            style={{
              textAlign: 'center',
              padding: '7px 4px',
              borderRadius: 7,
              background: 'rgba(30, 41, 59, 0.55)',
              border: '1px solid rgba(148, 163, 184, 0.14)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 14, fontWeight: 700, color }}>
              {value}
            </div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, color: '#94a3b8', marginTop: 2, fontWeight: 500 }}>
              <span aria-hidden="true" style={{ fontSize: 8, marginRight: 3, color }}>{icon}</span>
              {label}
            </div>
          </div>
        ))}

        {/* Action Completion Ring */}
        <div
          title={total > 0 ? `${completed} of ${total} listed actions completed` : 'No pending triage actions'}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 7,
            padding: '5px 8px',
            borderRadius: 7,
            background: 'rgba(30, 41, 59, 0.55)',
            border: '1px solid rgba(148, 163, 184, 0.14)',
          }}
        >
          <svg width="36" height="36" viewBox="0 0 36 36" aria-label={`Actions completed: ${completed} of ${total}`}>
            <circle cx="18" cy="18" r={r} fill="none" stroke="rgba(148, 163, 184, 0.18)" strokeWidth="3.5" />
            <circle
              cx="18"
              cy="18"
              r={r}
              fill="none"
              stroke={ringColor}
              strokeWidth="3.5"
              strokeDasharray={circ}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              transform="rotate(-90 18 18)"
              style={{ transition: 'stroke-dashoffset 0.3s ease' }}
            />
            <text
              x="18"
              y="20.5"
              textAnchor="middle"
              fill="#f1f5f9"
              style={{ fontFamily: "'Space Mono', monospace", fontSize: 8.5, fontWeight: 700 }}
            >
              {total > 0 ? `${completed}/${total}` : 'OK'}
            </text>
          </svg>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, color: '#94a3b8', lineHeight: 1.2, fontWeight: 500 }}>
            Actions<br />Done
          </div>
        </div>
      </div>

      {/* Due-Now Banner or Mission Readiness Badge + Packet Buttons */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          padding: '8px 10px',
          borderRadius: 7,
          background: allLogged
            ? 'rgba(16, 185, 129, 0.1)'
            : overdueCount > 0
              ? 'rgba(244, 63, 94, 0.11)'
              : 'rgba(245, 158, 11, 0.11)',
          border: `1px solid ${
            allLogged
              ? 'rgba(16, 185, 129, 0.32)'
              : overdueCount > 0
                ? 'rgba(244, 63, 94, 0.35)'
                : 'rgba(245, 158, 11, 0.35)'
          }`,
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          {allLogged ? (
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11.5, fontWeight: 600, color: '#34d399' }}>
              ◆ Mission Readiness · All Due Logged
            </div>
          ) : (
            <>
              <div
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: overdueCount > 0 ? '#fb7185' : '#fbbf24',
                }}
              >
                {overdueCount > 0 ? '■ ' : '▲ '}
                {dueCount} {dueCount === 1 ? 'measurement' : 'measurements'} due
                {overdueCount > 0 ? ` (${overdueCount} overdue)` : ''}
              </div>
              {dueLabels.length > 0 && (
                <div
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 10.5,
                    color: '#94a3b8',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    marginTop: 2,
                  }}
                  title={dueLabels.join(', ')}
                >
                  {dueLabels.join(' · ')}
                </div>
              )}
            </>
          )}
        </div>

        <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
          <button
            type="button"
            onClick={onDownloadJson}
            title="Download full medical report packet (.json)"
            style={{
              padding: '5px 9px',
              borderRadius: 6,
              background: 'rgba(56, 189, 248, 0.14)',
              border: '1px solid rgba(56, 189, 248, 0.38)',
              color: '#38bdf8',
              fontFamily: "'Inter', sans-serif",
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            ⬇ Packet
          </button>
          <button
            type="button"
            onClick={onDownloadTxt}
            title="Download readable text summary (.txt)"
            style={{
              padding: '5px 7px',
              borderRadius: 6,
              background: 'rgba(30, 41, 59, 0.7)',
              border: '1px solid rgba(148, 163, 184, 0.25)',
              color: '#cbd5e1',
              fontFamily: "'Space Mono', monospace",
              fontSize: 10,
              cursor: 'pointer',
            }}
          >
            .TXT
          </button>
        </div>
      </div>
    </div>
  );
}
