import {
  ComposedChart, Line, Area, ReferenceArea, ReferenceLine,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';

const STATUS_COLORS = {
  GREEN:  '#00ff9d',
  YELLOW: '#ffc800',
  RED:    '#ff3355',
};

function TrendArrow({ history }) {
  if (!history || history.length < 3) return null;
  const last3 = history.slice(-3);
  const delta = last3[2] - last3[0];
  const threshold = 0.05 * (Math.abs(last3[0]) || 1);
  if (Math.abs(delta) < threshold)
    return <span style={{ color: 'rgba(0,180,255,0.6)', fontSize: 9 }}>→ STABLE</span>;
  return delta > 0
    ? <span style={{ color: '#ff3355', fontSize: 9 }}>↑ RISING</span>
    : <span style={{ color: '#00ff9d', fontSize: 9 }}>↓ FALLING</span>;
}

function NasaTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  const color = STATUS_COLORS[d?.status] ?? '#94a3b8';
  return (
    <div style={{
      background: '#060f1e',
      border: `1px solid rgba(0,180,255,0.2)`,
      padding: '8px 12px',
      fontFamily: "'Space Mono', monospace",
      fontSize: 10,
    }}>
      <p style={{ color: 'rgba(0,180,255,0.6)', marginBottom: 4 }}>DAY {label}</p>
      <p style={{ color, fontWeight: 700 }}>{payload[0]?.value} <span style={{ opacity: 0.6 }}>{d?.unit}</span></p>
      {d?.status && <p style={{ color, opacity: 0.8, marginTop: 2, letterSpacing: '0.1em' }}>{d.status}</p>}
    </div>
  );
}

export default function Chart({ measurement, measurementKey }) {
  if (!measurement) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: 160, color: 'rgba(0,180,255,0.3)', fontFamily: "'Orbitron', sans-serif",
        fontSize: 10, letterSpacing: '0.1em', textAlign: 'center' }}>
        SELECT A NODE<br/>TO VIEW TREND
      </div>
    );
  }

  const { history = [], unit = '', status = 'GREEN', baseline } = measurement;
  const color = STATUS_COLORS[status] ?? '#94a3b8';

  const data = history.map((val, i) => ({
    day: i + 1,
    value: val,
    unit,
    status,
    baseHigh: baseline ? baseline.mean + baseline.sd : undefined,
    baseLow:  baseline ? baseline.mean - baseline.sd : undefined,
  }));

  const earthNormal  = measurement.earth_normal;
  const baselineMean = baseline?.mean;

  const vals = data.map(d => d.value).filter(Boolean);
  const allVals = [
    ...vals,
    earthNormal,
    baselineMean,
    baseline ? baseline.mean + baseline.sd : null,
    baseline ? baseline.mean - baseline.sd : null,
  ].filter(v => v != null);
  const pad   = 0.1;
  const minY  = Math.min(...allVals) * (1 - pad);
  const maxY  = Math.max(...allVals) * (1 + pad);

  return (
    <div style={{ width: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 9, fontWeight: 600,
          letterSpacing: '0.12em', color: 'rgba(0,180,255,0.7)', textTransform: 'uppercase' }}>
          {measurementKey ?? 'Measurement'} ({unit})
        </span>
        <span style={{ fontFamily: "'Space Mono', monospace" }}>
          <TrendArrow history={history} />
        </span>
      </div>

      <ResponsiveContainer width="100%" height={160}>
        <ComposedChart data={data} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
          <CartesianGrid strokeDasharray="2 4" stroke="rgba(0,180,255,0.05)" vertical={false} />
          <XAxis
            dataKey="day"
            tick={{ fill: 'rgba(0,180,255,0.3)', fontSize: 9, fontFamily: "'Space Mono', monospace" }}
            tickLine={false}
            axisLine={{ stroke: 'rgba(0,180,255,0.1)' }}
          />
          <YAxis
            domain={[minY, maxY]}
            tick={{ fill: 'rgba(0,180,255,0.3)', fontSize: 9, fontFamily: "'Space Mono', monospace" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<NasaTooltip />} />

          {/* Baseline band */}
          {baseline && (
            <ReferenceArea
              y1={baseline.mean - baseline.sd}
              y2={baseline.mean + baseline.sd}
              fill="rgba(0,180,255,0.06)"
              stroke="none"
              label={{ value: 'BL', position: 'insideTopRight', fill: 'rgba(0,180,255,0.3)', fontSize: 8,
                fontFamily: "'Space Mono', monospace" }}
            />
          )}

          {/* Earth normal dashed line */}
          {earthNormal != null && (
            <ReferenceLine
              y={earthNormal}
              stroke="rgba(0,180,255,0.4)"
              strokeDasharray="4 3"
              strokeWidth={1}
              label={{ value: 'Earth', position: 'insideTopRight', fill: 'rgba(0,180,255,0.4)', fontSize: 8,
                fontFamily: "'Space Mono', monospace" }}
            />
          )}

          {/* 7-day measurement line */}
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={{ r: 2.5, fill: color, strokeWidth: 0 }}
            activeDot={{ r: 4, fill: color, strokeWidth: 0 }}
            animationDuration={700}
            style={{ filter: `drop-shadow(0 0 4px ${color})` }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 8,
          fontFamily: "'Space Mono', monospace", color: 'rgba(0,180,255,0.4)' }}>
          <span style={{ display: 'inline-block', width: 14, height: 1, background: 'rgba(0,180,255,0.4)',
            borderTop: '1px dashed rgba(0,180,255,0.4)' }}/>
          Earth Normal
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 8,
          fontFamily: "'Space Mono', monospace", color: 'rgba(0,180,255,0.4)' }}>
          <span style={{ display: 'inline-block', width: 10, height: 6,
            background: 'rgba(0,180,255,0.1)' }}/>
          Baseline ±1SD
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 8,
          fontFamily: "'Space Mono', monospace", color }}>
          <span style={{ display: 'inline-block', width: 14, height: 1, background: color }}/>
          7-Day
        </span>
      </div>
    </div>
  );
}
