import { useState } from 'react';
import Gauge from './components/Gauge.jsx';
import Badge from './components/Badge.jsx';
import HazardBars from './components/HazardBars.jsx';
import BodyMap from './components/BodyMap.jsx';
import Chart from './components/Chart.jsx';

// Preset mocks — Person 1 will replace with real evaluate()
import mockISS  from './engine/mock-iss.json';
import mockLunar from './engine/mock-lunar.json';
import mockMars  from './engine/mock-mars.json';

const PRESETS = {
  iss:   { label: 'ISS',   data: mockISS   },
  lunar: { label: 'Lunar', data: mockLunar },
  mars:  { label: 'Mars',  data: mockMars  },
};

const PRESET_ORDER = ['iss', 'lunar', 'mars'];

export default function App() {
  const [activePreset, setActivePreset]   = useState('mars');
  const [selectedNode, setSelectedNode]   = useState('eyes');

  const data = PRESETS[activePreset].data;
  const { overall, badge, autonomy, hazards, nodes, measurements } = data;

  // Find the measurement for the selected node
  const selectedMeasurementKey = Object.keys(measurements ?? {}).find(
    k => measurements[k].node === selectedNode
  );
  const selectedMeasurement = selectedMeasurementKey
    ? measurements[selectedMeasurementKey]
    : null;

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 font-sans">
      {/* Top Bar */}
      <header className="border-b border-slate-800 px-6 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold tracking-wide">🚀 Astronaut Health Monitor</h1>
          <p className="text-xs text-slate-500">Autonomous Decision Support · 36-hr Sprint Build</p>
        </div>
        <Badge status={badge} />
      </header>

      {/* Main 3-column layout */}
      <main className="grid grid-cols-[220px_1fr_300px] gap-4 p-4 h-[calc(100vh-64px)]">

        {/* ── LEFT COLUMN: Profile + Preset Buttons ── */}
        <aside className="flex flex-col gap-4">
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <h2 className="text-xs text-slate-500 uppercase tracking-wider mb-3 font-semibold">Mission Preset</h2>
            <div className="flex flex-col gap-2">
              {PRESET_ORDER.map((key) => (
                <button
                  key={key}
                  onClick={() => setActivePreset(key)}
                  className={`w-full py-2 px-4 rounded-lg text-sm font-semibold transition-all ${
                    activePreset === key
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                  aria-pressed={activePreset === key}
                >
                  {PRESETS[key].label}
                </button>
              ))}
            </div>
          </div>

          {/* Astronaut profile placeholder */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex-1">
            <h2 className="text-xs text-slate-500 uppercase tracking-wider mb-3 font-semibold">Crew Profile</h2>
            <div className="flex flex-col items-center gap-2">
              <div className="w-14 h-14 rounded-full bg-slate-700 flex items-center justify-center text-2xl">👨‍🚀</div>
              <p className="text-sm font-semibold text-slate-200">Astronaut A</p>
              <p className="text-xs text-slate-500">{PRESETS[activePreset].label} Mission</p>
              <p className="text-xs text-slate-500">Day 7</p>
            </div>
            {/* Raw JSON preview (Phase 0 requirement) */}
            <details className="mt-4">
              <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-300">Raw data</summary>
              <pre className="text-[9px] text-slate-500 mt-2 overflow-auto max-h-40 leading-relaxed">
                {JSON.stringify({ overall, badge, autonomy }, null, 2)}
              </pre>
            </details>
          </div>
        </aside>

        {/* ── CENTER COLUMN: Gauge + BodyMap + HazardBars ── */}
        <section className="flex flex-col gap-4 overflow-y-auto">
          {/* Gauge + Badge */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex flex-col items-center gap-2">
            <Gauge score={overall} status={badge} />
            <Badge status={badge} />
          </div>

          {/* Body Map */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex flex-col items-center">
            <h2 className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-semibold self-start">Body Map</h2>
            <BodyMap
              nodes={nodes}
              selectedNode={selectedNode}
              onSelectNode={setSelectedNode}
            />
          </div>

          {/* Hazard Bars */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <HazardBars hazards={hazards} autonomy={autonomy} />
          </div>
        </section>

        {/* ── RIGHT COLUMN: Chart + Guidance ── */}
        <aside className="flex flex-col gap-4 overflow-y-auto">
          {/* Selected node info */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <h2 className="text-xs text-slate-500 uppercase tracking-wider mb-1 font-semibold">
              Selected: {selectedNode ?? '—'}
            </h2>
            {selectedMeasurementKey ? (
              <div className="text-sm mt-1">
                <span className="font-bold text-slate-200">{selectedMeasurementKey}</span>
                <span className="text-slate-400 ml-2">
                  {selectedMeasurement?.value} {selectedMeasurement?.unit}
                </span>
              </div>
            ) : (
              <p className="text-xs text-slate-500">No measurement for this node</p>
            )}
          </div>

          {/* Chart */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <Chart
              measurement={selectedMeasurement}
              measurementKey={selectedMeasurementKey}
            />
          </div>

          {/* Guidance placeholder — Person 3 fills this */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex-1">
            <h2 className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-semibold">Guidance</h2>
            <p className="text-xs text-slate-400">
              {selectedMeasurement
                ? `Current ${selectedMeasurementKey} reading is ${selectedMeasurement.value} ${selectedMeasurement.unit}. Status: ${selectedMeasurement.status}.`
                : 'Select a node on the body map to view guidance.'}
            </p>
            <p className="text-xs text-slate-600 mt-2 italic">
              [Instruction drawer — Person 3]
            </p>
          </div>
        </aside>
      </main>
    </div>
  );
}
