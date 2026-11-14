import {
  ComposedChart, Line, Area, ReferenceArea, ReferenceLine,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';

const STATUS_COLORS = { GREEN: '#22c55e', YELLOW: '#eab308', RED: '#ef4444' };

function TrendArrow({ history }) {
  if (!history || history.length < 3) return null;
  const last3 = history.slice(-3);
  const delta = last3[2] - last3[0];
  const threshold = 0.05 * (Math.abs(last3[0]) || 1);
  if (Math.abs(delta) < threshold) return <span className="text-slate-400">→ Stable</span>;
  return delta > 0
    ? <span className="text-red-400">↑ Rising</span>
    : <span className="text-green-400">↓ Falling</span>;
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  const color = STATUS_COLORS[d?.status] ?? '#94a3b8';
  return (
    <div className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-slate-400 mb-1">Day {label}</p>
      <p style={{ color }} className="font-bold">{payload[0]?.value} {d?.unit}</p>
      {d?.status && (
        <p style={{ color }} className="mt-0.5 uppercase tracking-wide">{d.status}</p>
      )}
    </div>
  );
}

export default function Chart({ measurement, measurementKey }) {
  if (!measurement) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
        Select a body node to view chart
      </div>
    );
  }

  const { history = [], unit = '', status = 'GREEN', baseline } = measurement;
  const color = STATUS_COLORS[status] ?? '#94a3b8';

  // Build chart data with day labels
  const data = history.map((val, i) => ({
    day: i + 1,
    value: val,
    unit,
    status,
    // Baseline band
    baseHigh: baseline ? baseline.mean + baseline.sd : undefined,
    baseLow:  baseline ? baseline.mean - baseline.sd : undefined,
  }));

  const earthNormal = measurement.earth_normal;
  const baselineMean = baseline?.mean;

  // Auto-scale Y axis with padding
  const vals = data.map(d => d.value).filter(Boolean);
  const allVals = [
    ...vals,
    earthNormal,
    baselineMean,
    baseline ? baseline.mean + baseline.sd : null,
    baseline ? baseline.mean - baseline.sd : null,
  ].filter(v => v != null);
  const minY = Math.min(...allVals) * 0.9;
  const maxY = Math.max(...allVals) * 1.1;

  return (
    <div className="w-full">
      {/* Chart header */}
      <div className="flex items-center justify-between mb-2 text-xs">
        <span className="text-slate-300 font-semibold">{measurementKey ?? 'Measurement'} ({unit})</span>
        <span className="font-medium">
          <TrendArrow history={history} />
        </span>
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <ComposedChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis
            dataKey="day"
            tick={{ fill: '#64748b', fontSize: 10 }}
            tickLine={false}
            label={{ value: 'Day', position: 'insideBottomRight', fill: '#475569', fontSize: 10, offset: -4 }}
          />
          <YAxis
            domain={[minY, maxY]}
            tick={{ fill: '#64748b', fontSize: 10 }}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />

          {/* Personal baseline band (mean ± 1 SD) */}
          {baseline && (
            <ReferenceArea
              y1={baseline.mean - baseline.sd}
              y2={baseline.mean + baseline.sd}
              fill="#3b82f6"
              fillOpacity={0.08}
              label={{ value: 'Baseline', position: 'insideTopRight', fill: '#3b82f6', fontSize: 9 }}
            />
          )}

          {/* Earth normal dashed line */}
          {earthNormal != null && (
            <ReferenceLine
              y={earthNormal}
              stroke="#60a5fa"
              strokeDasharray="5 3"
              strokeWidth={1.5}
              label={{ value: 'Earth', position: 'insideTopRight', fill: '#60a5fa', fontSize: 9 }}
            />
          )}

          {/* 7-day measurement line */}
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2.5}
            dot={{ r: 3, fill: color, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: color }}
            animationDuration={600}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex gap-3 mt-1 text-xs text-slate-400">
        <span className="flex items-center gap-1">
          <span className="inline-block w-4 border-t-2 border-blue-400 border-dashed" /> Earth normal
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-4 h-2 bg-blue-500 opacity-20 rounded" /> Baseline ±1SD
        </span>
        <span className="flex items-center gap-1" style={{ color }}>
          <span className="inline-block w-4 border-t-2" style={{ borderColor: color }} /> 7-day
        </span>
      </div>
    </div>
  );
}
