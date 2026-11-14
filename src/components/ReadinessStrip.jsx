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

  const r = 13;
  const circ = 2 * Math.PI * r;
  const dashOffset = circ * (1 - pct);
  const ringColor = total === 0 || pct >= 1 ? '#00ff9d' : pct >= 0.5 ? '#ffc800' : '#00b4ff';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Top metrics row: RED | YELLOW | STREAK | ACTION RING */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1.25fr', gap: 6, alignItems: 'center' }}>
        {[
          { label: 'RED', value: redCount, color: '#ff3355' },
          { label: 'YELLOW', value: yellowCount, color: '#ffc800' },
          { label: 'STREAK', value: `${streakDays}d`, color: 'rgba(0,180,255,0.75)' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ textAlign: 'center', padding: '5px 0', background: 'rgba(0,180,255,0.03)', border: '1px solid rgba(0,180,255,0.08)' }}>
            <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 13, fontWeight: 700, color }}>
              {value}
            </div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 7, color: 'rgba(200,228,255,0.38)', marginTop: 1 }}>
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
            gap: 6,
            padding: '3px 6px',
            background: 'rgba(0,180,255,0.03)',
            border: '1px solid rgba(0,180,255,0.1)',
          }}
        >
          <svg width="34" height="34" viewBox="0 0 34 34" aria-label={`Actions completed: ${completed} of ${total}`}>
            <circle cx="17" cy="17" r={r} fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth="3.5" />
            <circle
              cx="17"
              cy="17"
              r={r}
              fill="none"
              stroke={ringColor}
              strokeWidth="3.5"
              strokeDasharray={circ}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              transform="rotate(-90 17 17)"
              style={{ transition: 'stroke-dashoffset 0.3s ease' }}
            />
            <text
              x="17"
              y="19.5"
              textAnchor="middle"
              fill="#c8e4ff"
              style={{ fontFamily: "'Space Mono', monospace", fontSize: 7.5, fontWeight: 700 }}
            >
              {total > 0 ? `${completed}/${total}` : 'OK'}
            </text>
          </svg>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 7, color: 'rgba(200,228,255,0.48)', lineHeight: 1.2 }}>
            ACT<br />RING
          </div>
        </div>
      </div>

      {/* Due-Now Banner or Mission Readiness Badge + Packet Buttons */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 6,
          padding: '6px 8px',
          background: allLogged
            ? 'rgba(0,255,157,0.08)'
            : overdueCount > 0
              ? 'rgba(255,51,85,0.09)'
              : 'rgba(255,200,0,0.09)',
          border: `1px solid ${
            allLogged
              ? 'rgba(0,255,157,0.35)'
              : overdueCount > 0
                ? 'rgba(255,51,85,0.35)'
                : 'rgba(255,200,0,0.35)'
          }`,
        }}
      >
        <div style={{ minWidth: 0 }}>
          {allLogged ? (
            <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 8.5, fontWeight: 700, letterSpacing: '0.1em', color: '#00ff9d' }}>
              ◆ MISSION READINESS · ALL DUE LOGGED
            </div>
          ) : (
            <>
              <div
                style={{
                  fontFamily: "'Orbitron', sans-serif",
                  fontSize: 8.5,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  color: overdueCount > 0 ? '#ff6680' : '#ffc800',
                }}
              >
                {dueCount} {dueCount === 1 ? 'MEASUREMENT' : 'MEASUREMENTS'} DUE
                {overdueCount > 0 ? ` (${overdueCount} OVERDUE)` : ''}
              </div>
              {dueLabels.length > 0 && (
                <div
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 7.5,
                    color: 'rgba(200,228,255,0.6)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    marginTop: 1,
                  }}
                >
                  {dueLabels.join(' · ')}
                </div>
              )}
            </>
          )}
        </div>

        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <button
            type="button"
            onClick={onDownloadJson}
            title="Download full medical report packet (.json)"
            style={{
              padding: '4px 7px',
              background: 'rgba(0,180,255,0.1)',
              border: '1px solid rgba(0,180,255,0.35)',
              color: '#00b4ff',
              fontFamily: "'Orbitron', sans-serif",
              fontSize: 7.5,
              fontWeight: 700,
              letterSpacing: '0.08em',
              cursor: 'pointer',
            }}
          >
            ⬇ PACKET
          </button>
          <button
            type="button"
            onClick={onDownloadTxt}
            title="Download readable text summary (.txt)"
            style={{
              padding: '4px 6px',
              background: 'rgba(0,180,255,0.04)',
              border: '1px solid rgba(0,180,255,0.22)',
              color: 'rgba(200,228,255,0.75)',
              fontFamily: "'Space Mono', monospace",
              fontSize: 7.5,
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
