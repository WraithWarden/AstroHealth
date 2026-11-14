// Submit flow: form + PVT + symptoms -> addReading() -> evaluate() -> dashboard refresh.
// Pure functions, no React. addReading and evaluate come from Person 1's engine and are passed in.
//
// ADAPT HERE if Person 1's engine signatures differ (see docs/CONTRACT.md):
//   addReading(state, reading) -> newState      (adds day + 1, keeps the last 7 days)
//   evaluate(newState, preset) -> engineOutput  (overall, hazards, cards, nodes, measurements)

export const BASE_DAY = { ISS: 14, LUNAR: 90, MARS: 240 };

export const SYMPTOM_LABELS = {
  headache: 'Headache',
  blurred: 'Blurred vision',
  dizziness: 'Dizziness or fainting',
  chest_pain: 'Chest pain',
  nausea: 'Nausea',
  confusion: 'Confusion',
  self_harm: 'Low mood or thoughts of self-harm',
};

export function normalizePreset(p) {
  const s = String(p ?? '').toUpperCase();
  if (s.startsWith('ISS')) return 'ISS';
  if (s.startsWith('LUN') || s.startsWith('MOON')) return 'LUNAR';
  if (s.startsWith('MAR')) return 'MARS';
  return s;
}

// Mission day after this check-in. Prefer the day the engine state reports;
// otherwise count up from the preset's day (ISS 14, Lunar 90, Mars 240).
export function missionDay(newState, preset, sessionCount = 1) {
  const fromState = newState?.day ?? newState?.missionDay ?? newState?.currentDay;
  if (Number.isFinite(fromState)) return fromState;
  const base = BASE_DAY[normalizePreset(preset)];
  return Number.isFinite(base) ? base + sessionCount : null;
}

export function submitCheckIn({ state, reading, meta = {}, preset, addReading, evaluate, sessionCount = 1 }) {
  if (!reading || Object.keys(reading).length === 0) {
    throw new Error('submitCheckIn: empty reading');
  }
  if (typeof addReading !== 'function' || typeof evaluate !== 'function') {
    throw new Error('submitCheckIn: addReading and evaluate are required');
  }

  const newState = addReading(state, reading);
  const output = evaluate(newState, preset);

  const symptomKeys = meta.symptoms ?? [];
  const redFlag = Boolean(meta.redFlag) || symptomKeys.length > 0;
  const day = missionDay(newState, preset, sessionCount);

  return {
    state: newState,
    output,
    day,
    dayLabel: day != null ? `Day ${day} logged` : 'Check-in logged',
    redFlag,
    symptoms: symptomKeys.map((k) => SYMPTOM_LABELS[k] || k),
    selfHarm: symptomKeys.includes('self_harm'),
    timestamp: meta.timestamp ?? new Date().toISOString(),
  };
}
