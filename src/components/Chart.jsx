import {
  ComposedChart, Line, ReferenceArea, ReferenceLine,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';

const STATUS_COLORS = {
  GREEN:  '#10b981',
  YELLOW: '#f59e0b',
  RED:    '#f43f5e',
};

function TrendArrow({ history }) {
  if (!history || history.length < 3) return null;
  const last3 = history.slice(-3);
  const delta = last3[2] - last3[0];
  const threshold = 0.05 * (Math.abs(last3[0]) || 1);
  if (Math.abs(delta) < threshold) {
    return (
      <span style={{ color: '#94a3b8', fontSize: 11, fontWeight: 600 }}>
        → Stable
      </span>
    );
  }
  return delta > 0 ? (
    <span style={{ color: '#fbbf24', fontSize: 11, fontWeight: 600 }}>
      ↑ Rising
    </span>
  ) : (
    <span style={{ color: '#38bdf8', fontSize: 11, fontWeight: 600 }}>
      ↓ Falling
    </span>
  );
}

function NasaTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  const color = STATUS_COLORS[d?.status] ?? '#94a3b8';
  return (
    <div style={{
      background: '#0f172a',
      border: '1px solid rgba(148, 163, 184, 0.25)',
      borderRadius: 6,
      padding: '8px 12px',
      fontFamily: "'Inter', sans-serif",
      fontSize: 11,
      boxShadow: '0 8px 20px rgba(0, 0, 0, 0.45)',
    }}>
      <div style={{ color: '#94a3b8', fontSize: 10, marginBottom: 3 }}>Day {label} of 7-day window</div>
      <div style={{ fontFamily: "'Space Mono', monospace", color: '#f8fafc', fontWeight: 700, fontSize: 12 }}>
        {payload[0]?.value} <span style={{ color: '#94a3b8', fontWeight: 400 }}>{d?.unit}</span>
      </div>
      {d?.status && (
        <div style={{ color, fontWeight: 600, fontSize: 10, marginTop: 2 }}>
          Status: {d.status}
        </div>
      )}
    </div>
  );
}

export default function Chart({ measurement, measurementKey }) {
  if (!measurement) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: 165, color: '#64748b', fontFamily: "'Inter', sans-serif",
        fontSize: 12, textAlign: 'center',
      }}>
        Select an anatomical node or indicator to view its 7-day trend.
      </div>
    );
  }

  const { name, history = [], unit = '', status = 'GREEN', baseline } = measurement;
  const color = STATUS_COLORS[status] ?? '#94a3b8';

  const data = history.map((val, i) => ({
    day: `D${i + 1}`,
    value: val,
    unit,
    status,
  }));

  const earthNormal  = measurement.earth_normal;
  const baselineMean = baseline?.mean;

  const vals = data.map(d => d.value).filter(v => v != null && Number.isFinite(v));
  const allVals = [
    ...vals,
    earthNormal,
    baselineMean,
    baseline && baseline.mean != null && baseline.sd != null ? baseline.mean + baseline.sd : null,
    baseline && baseline.mean != null && baseline.sd != null ? baseline.mean - baseline.sd : null,
  ].filter(v => v != null && Number.isFinite(v));

  const rawMin = allVals.length > 0 ? Math.min(...allVals) : 0;
  const rawMax = allVals.length > 0 ? Math.max(...allVals) : 10;
  const span   = Math.max(Math.abs(rawMax - rawMin), Math.abs(rawMax) * 0.15, 1);
  const minY   = Math.round((rawMin - span * 0.15) * 100) / 100;
  const maxY   = Math.round((rawMax + span * 0.15) * 100) / 100;

  return (
    <div style={{ width: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {name ?? measurementKey ?? 'Indicator'}
          </div>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10.5, color: '#64748b' }}>
            {measurementKey} {unit ? `· ${unit}` : ''}
          </div>
        </div>
        <TrendArrow history={history} />
      </div>

      <ResponsiveContainer width="100%" height={165}>
        <ComposedChart data={data} margin={{ top: 6, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.08)" vertical={false} />
          <XAxis
            dataKey="day"
            tick={{ fill: '#64748b', fontSize: 10, fontFamily: "'Space Mono', monospace" }}
            tickLine={false}
            axisLine={{ stroke: 'rgba(148, 163, 184, 0.15)' }}
          />
          <YAxis
            domain={[minY, maxY]}
            tick={{ fill: '#64748b', fontSize: 10, fontFamily: "'Space Mono', monospace" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<NasaTooltip />} />

          {/* Personal space baseline band (mean ± 1 SD) */}
          {baseline && baseline.mean != null && baseline.sd != null && (
            <ReferenceArea
              y1={baseline.mean - baseline.sd}
              y2={baseline.mean + baseline.sd}
              fill="rgba(56, 189, 248, 0.1)"
              stroke="rgba(56, 189, 248, 0.2)"
              strokeDasharray="2 2"
            />
          )}

          {/* Earth normal dashed line */}
          {earthNormal != null && Number.isFinite(earthNormal) && (
            <ReferenceLine
              y={earthNormal}
              stroke="#94a3b8"
              strokeDasharray="4 4"
              strokeWidth={1.25}
              label={{
                value: 'Earth',
                position: 'insideTopRight',
                fill: '#94a3b8',
                fontSize: 9.5,
                fontFamily: "'Inter', sans-serif",
              }}
            />
          )}

          {/* 7-day measurement line */}
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2.5}
            dot={{ r: 3, fill: color, stroke: '#0f172a', strokeWidth: 1.5 }}
            activeDot={{ r: 5, fill: color, stroke: '#f8fafc', strokeWidth: 1.5 }}
            animationDuration={450}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 8, paddingTop: 6, borderTop: '1px solid rgba(148, 163, 184, 0.08)' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontFamily: "'Inter', sans-serif", color: '#94a3b8' }}>
          <span style={{ display: 'inline-block', width: 14, height: 0, borderTop: '2px dashed #94a3b8' }}/>
          Earth Normal
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontFamily: "'Inter', sans-serif", color: '#94a3b8' }}>
          <span style={{ display: 'inline-block', width: 12, height: 8, borderRadius: 2, background: 'rgba(56, 189, 248, 0.18)', border: '1px solid rgba(56, 189, 248, 0.35)' }}/>
          Space Baseline (±1 SD)
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontFamily: "'Inter', sans-serif", color: '#e2e8f0', fontWeight: 500 }}>
          <span style={{ display: 'inline-block', width: 14, height: 2.5, borderRadius: 2, background: color }}/>
          7-Day Trend
        </span>
      </div>
    </div>
  );
}
