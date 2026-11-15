import {
  Area, ComposedChart, Line, ReferenceArea, ReferenceLine, ReferenceDot,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { useId } from 'react';

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
  const point = payload.find((entry) => entry.dataKey === 'value')?.payload ?? payload[0]?.payload;
  const value = point?.value;
  const color = STATUS_COLORS[point?.status] ?? '#94a3b8';
  const formattedValue = Number.isFinite(value)
    ? new Intl.NumberFormat(undefined, { maximumSignificantDigits: 4 }).format(value)
    : '—';
  return (
    <div style={{
      background: 'linear-gradient(145deg, #132238, #081321)',
      border: '1px solid rgba(125, 211, 252, 0.28)',
      borderRadius: 8,
      padding: '9px 12px',
      fontFamily: "'Inter', sans-serif",
      fontSize: 11,
      boxShadow: '0 10px 28px rgba(0, 0, 0, 0.48), 0 0 16px rgba(56, 189, 248, 0.08)',
    }}>
      <div style={{ color: '#7dd3fc', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
        Mission day {String(label).replace(/^D/, '')}
      </div>
      <div style={{ fontFamily: "'Space Mono', monospace", color: '#f8fafc', fontWeight: 700, fontSize: 14 }}>
        {formattedValue} <span style={{ color: '#94a3b8', fontWeight: 400, fontSize: 10 }}>{point?.unit}</span>
      </div>
      {point?.status && (
        <div style={{ color, fontWeight: 700, fontSize: 9, marginTop: 5, letterSpacing: '0.06em' }}>
          {point.status}
        </div>
      )}
    </div>
  );
}

export default function Chart({ measurement, measurementKey }) {
  const chartId = useId().replace(/:/g, '');

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
  const gradientId = `trend-fill-${chartId}`;
  const glowId = `trend-glow-${chartId}`;

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
  const lastPoint = data[data.length - 1];
  const formatTick = (value) => Number.isFinite(value)
    ? Number(value.toPrecision(3)).toString()
    : value;

  return (
    <div style={{ width: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12.5, fontWeight: 600, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {name ?? measurementKey ?? 'Indicator'} <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10.5, color: '#64748b', fontWeight: 400 }}>({unit || measurementKey})</span>
          </div>
        </div>
        <TrendArrow history={history} />
      </div>

      <ResponsiveContainer width="100%" height={150}>
        <ComposedChart data={data} margin={{ top: 10, right: 12, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.28} />
              <stop offset="95%" stopColor={color} stopOpacity={0.015} />
            </linearGradient>
            <filter id={glowId} x="-40%" y="-60%" width="180%" height="220%">
              <feGaussianBlur stdDeviation="2.5" result="lineGlow" />
              <feMerge>
                <feMergeNode in="lineGlow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <CartesianGrid strokeDasharray="3 5" stroke="rgba(148, 163, 184, 0.1)" vertical={false} />
          <XAxis
            dataKey="day"
            tick={{ fill: '#94a3b8', fontSize: 9, fontFamily: "'Space Mono', monospace" }}
            tickLine={false}
            axisLine={{ stroke: 'rgba(148, 163, 184, 0.15)' }}
            tickMargin={7}
          />
          <YAxis
            domain={[minY, maxY]}
            tick={{ fill: '#94a3b8', fontSize: 9, fontFamily: "'Space Mono', monospace" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatTick}
            width={40}
          />
          <Tooltip content={<NasaTooltip />} />

          {data.length > 1 && (
            <Area
              type="monotone"
              dataKey="value"
              stroke="none"
              fill={`url(#${gradientId})`}
              isAnimationActive={false}
              connectNulls
            />
          )}

          {/* Personal space baseline band (mean ± 1 SD) */}
          {baseline && baseline.mean != null && baseline.sd != null && (
            <ReferenceArea
              y1={baseline.mean - baseline.sd}
              y2={baseline.mean + baseline.sd}
              fill="rgba(56, 189, 248, 0.09)"
              stroke="rgba(56, 189, 248, 0.24)"
              strokeDasharray="3 3"
            />
          )}

          {/* Earth normal dashed line */}
          {earthNormal != null && Number.isFinite(earthNormal) && (
            <ReferenceLine
              y={earthNormal}
              stroke="#cbd5e1"
              strokeDasharray="5 4"
              strokeWidth={1.5}
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
            strokeWidth={2.75}
            filter={`url(#${glowId})`}
            connectNulls
            dot={{ r: 2.5, fill: color, stroke: '#0b1524', strokeWidth: 1.5 }}
            activeDot={{ r: 5, fill: color, stroke: '#f8fafc', strokeWidth: 1.5 }}
            animationDuration={450}
          />
          {lastPoint && Number.isFinite(lastPoint.value) && (
            <ReferenceDot
              x={lastPoint.day}
              y={lastPoint.value}
              r={4}
              fill={color}
              stroke="#f8fafc"
              strokeWidth={1.5}
              isFront
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px', marginTop: 3, paddingTop: 8, borderTop: '1px solid rgba(148, 163, 184, 0.1)' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10, fontFamily: "'Inter', sans-serif", color: '#aebccc' }}>
          <span style={{ display: 'inline-block', width: 14, height: 0, borderTop: '2px dashed #cbd5e1' }}/>
          Earth Normal
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10, fontFamily: "'Inter', sans-serif", color: '#aebccc' }}>
          <span style={{ display: 'inline-block', width: 12, height: 9, borderRadius: 3, background: 'rgba(56, 189, 248, 0.14)', border: '1px solid rgba(56, 189, 248, 0.4)' }}/>
          Space Baseline (±1 SD)
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10, fontFamily: "'Inter', sans-serif", color: '#e2e8f0', fontWeight: 600 }}>
          <span style={{ display: 'inline-block', width: 14, height: 3, borderRadius: 2, background: color, boxShadow: `0 0 7px ${color}80` }}/>
          7-Day Trend
        </span>
      </div>
    </div>
  );
}
