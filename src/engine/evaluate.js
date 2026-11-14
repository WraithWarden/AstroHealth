import indicators from '../data/indicators.json';
import presets from '../data/presets.json';
import { getIndicatorSpec, normalizeRegime, worstStatus } from './indicatorHelpers.js';
import { generateHistory, hashKey } from './historyGenerator.js';
import { checkThreshold } from './thresholds.js';
import { checkDrift } from './drift.js';
import { checkTrend } from './trend.js';
import { evaluateAutonomy } from './autonomy.js';
import { scoreMeasurement, aggregateScores } from './scoring.js';

const FRIENDLY_NAMES = {
  '1A-i': 'BloodPressure',
  '1A-ii': 'HeartRate',
  '1B-i': 'ONSD',
  '1B-ii': 'UrineCalcium',
  '2A-i': 'RadDose',
  '2A-ii': 'CareerDose',
  '2B-i': 'WBC',
  '2B-ii': 'BodyTemp',
  '3A-i': 'Sleep',
  '3A-ii': 'PVT',
  '3B-i': 'MoodStress',
  '3B-ii': 'HRV',
  '4A-i': 'SpO2',
  '4A-ii': 'CabinCO2',
  '4B-i': 'Glucose',
  '4B-ii': 'SkinStatus',
  '5A': 'CommDelay',
  '5B': 'MedKitStock',
};

const ALIAS_TO_ID = {
  ...Object.fromEntries(Object.entries(FRIENDLY_NAMES).map(([id, name]) => [name.toLowerCase(), id])),
  bp: '1A-i',
  sbp: '1A-i',
  systolic: '1A-i',
  hr: '1A-ii',
  heartrate: '1A-ii',
  onsd: '1B-i',
  calcium: '1B-ii',
  urinecalcium: '1B-ii',
  raddose: '2A-i',
  careerdose: '2A-ii',
  wbc: '2B-i',
  temp: '2B-ii',
  temperature: '2B-ii',
  sleep: '3A-i',
  pvt: '3A-ii',
  mood: '3B-i',
  stress: '3B-i',
  hrv: '3B-ii',
  spo2: '4A-i',
  co2: '4A-ii',
  ppco2: '4A-ii',
  glucose: '4B-i',
  skin: '4B-ii',
  commdelay: '5A',
  medkit: '5B',
};

const SYMPTOM_LABEL_MAP = {
  'blurred vision': 'blurredVision',
  blurredvision: 'blurredVision',
  headache: 'persistentHeadache',
  'persistent headache': 'persistentHeadache',
  persistentheadache: 'persistentHeadache',
  dizziness: 'dizzinessSyncope',
  'dizziness or fainting': 'dizzinessSyncope',
  fainting: 'dizzinessSyncope',
  syncope: 'dizzinessSyncope',
  dizzinesssyncope: 'dizzinessSyncope',
  'chest pain': 'chestPain',
  chestpain: 'chestPain',
  confusion: 'confusion',
  nausea: 'nausea',
  'low mood': 'selfHarmIdeation',
  'thoughts of self-harm': 'selfHarmIdeation',
  'low mood or thoughts of self-harm': 'selfHarmIdeation',
  selfharmideation: 'selfHarmIdeation',
};

/**
 * Resolves either a preset identifier ('iss', 'lunar', 'mars', 'AST-001'..'AST-003')
 * or a full `{ profile, symptoms, readings }` input object.
 *
 * @param {string|Object} input
 * @returns {{ profile: Object, symptoms: Object, readings: Object, presetKey: string }}
 */
function resolveInput(input) {
  if (!input || typeof input === 'string') {
    const rawKey = String(input || 'mars').toLowerCase();
    let key = 'mars';
    if (rawKey.includes('iss') || rawKey.includes('001')) key = 'iss';
    else if (rawKey.includes('lunar') || rawKey.includes('moon') || rawKey.includes('002')) key = 'lunar';
    const preset = presets[key] || presets.mars;
    return {
      profile: preset.profile,
      symptoms: preset.symptoms || {},
      readings: preset.readings || {},
      presetKey: key,
    };
  }

  return {
    profile: input.profile || presets.mars.profile,
    symptoms: input.symptoms || {},
    readings: input.readings || {},
    presetKey: normalizeRegime(input.profile?.regime).toLowerCase(),
  };
}

/**
 * Evaluates astronaut profile, acute symptoms, and 18 clinical readings through
 * the 4-stage deterministic spaceflight triage pipeline.
 *
 * @param {string|Object} [input='mars'] Preset name or `{ profile, symptoms, readings }`
 * @returns {Object} Contract-compliant evaluation output (see docs/CONTRACT.md)
 */
export function evaluate(input = 'mars') {
  const { profile, symptoms, readings, presetKey } = resolveInput(input);
  const regime = normalizeRegime(profile?.regime);

  const activeRedFlagSymptoms = Object.entries(symptoms)
    .filter(([, active]) => Boolean(active))
    .map(([key]) => key);

  const byId = {};
  const measurements = {};

  for (const indId of Object.keys(indicators)) {
    const { indicator, baseline } = getIndicatorSpec(indId, regime);
    const rawReading = readings[indId] ?? { value: baseline.mean };
    const reading = typeof rawReading === 'object' ? rawReading : { value: rawReading };
    const value = Number(reading.value ?? baseline.mean);

    const history = Array.isArray(reading.history7d) && reading.history7d.length > 0
      ? reading.history7d
      : generateHistory(baseline.mean, baseline.sigmaMin, value, hashKey(indId));

    // Stage 1: Absolute thresholds & symptoms
    const stage1 = checkThreshold(indId, reading, symptoms, regime);

    // Stage 2: Directional personal space drift
    const stage2 = checkDrift(indId, reading, regime);

    // Combine Stage 1 & Stage 2 worst status
    const combined12 = worstStatus(stage1.status, stage2.status);

    // Stage 3: Consecutive 3-day worsening trend check (only if still GREEN)
    const stage3 = checkTrend(indId, history, combined12, regime);
    const finalStatus = stage3.status;

    // Stage 4: Linear score interpolation
    const score = scoreMeasurement(finalStatus, stage2.effectiveZ, stage1.thresholdScore, stage3.trending);

    const earthRange = indicator.earthRange || {};
    const earthMid =
      earthRange.min != null && earthRange.max != null
        ? Math.round(((earthRange.min + earthRange.max) / 2) * 100) / 100
        : earthRange.max ?? null;

    const evaluated = {
      id: indId,
      cardId: indicator.cardId,
      hazardId: indicator.hazardId,
      node: indicator.node,
      name: indicator.name,
      unit: indicator.unit,
      value,
      secondaryValue: reading.secondaryValue ?? null,
      status: finalStatus,
      zScore: stage2.zScore,
      effectiveZ: stage2.effectiveZ,
      trending: stage3.trending,
      subType: stage1.subType,
      reason: stage1.reason,
      score,
      history,
      baseline: { mean: baseline.mean, sd: baseline.sigmaMin },
      earth_normal: earthMid,
    };

    byId[indId] = evaluated;
    measurements[indId] = evaluated;

    const friendly = FRIENDLY_NAMES[indId];
    if (friendly) {
      measurements[friendly] = evaluated;
    }
  }

  // Evaluate Autonomy (Hazard 5 context)
  const autonomyDetails = evaluateAutonomy(readings['5A'], readings['5B']);

  // Aggregate Cards, Hazards, Nodes, Overall Score, Badge
  const agg = aggregateScores(byId, autonomyDetails.level, activeRedFlagSymptoms);

  return {
    profile,
    overall: agg.overall,
    badge: agg.badge,
    autonomy: autonomyDetails.level,
    overallDetails: {
      score: agg.overall,
      rawAverage: agg.rawAverage,
      autonomyPenalty: agg.autonomyPenalty,
      status: agg.badge,
      triageMode: autonomyDetails.level === 'A2' ? 'EARTH_INDEPENDENT_A2' : autonomyDetails.level,
      redCount: agg.redCount,
      yellowCount: agg.yellowCount,
      activeRedFlagSymptoms,
    },
    autonomyDetails,
    hazards: agg.hazards,
    nodes: agg.nodes,
    cards: agg.cards,
    measurements,
    delay_seconds: autonomyDetails.commDelaySec,
    preset: presetKey,
  };
}

function toFiniteNumber(raw) {
  if (raw === '' || raw === null || raw === undefined) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function normalizeSymptoms(prevSymptoms = {}, incoming) {
  const next = { ...prevSymptoms };
  if (!incoming) return next;

  if (Array.isArray(incoming)) {
    for (const label of incoming) {
      const key = SYMPTOM_LABEL_MAP[String(label).trim().toLowerCase()];
      if (key) next[key] = true;
    }
    return next;
  }

  if (typeof incoming === 'object') {
    for (const [rawKey, active] of Object.entries(incoming)) {
      const key = SYMPTOM_LABEL_MAP[rawKey.trim().toLowerCase()] || rawKey;
      next[key] = Boolean(active);
    }
  }
  return next;
}

function extractIncomingPatches(reading = {}) {
  const patches = {};
  const sources = [
    reading.readings && typeof reading.readings === 'object' ? reading.readings : null,
    reading && typeof reading === 'object' ? reading : null,
  ].filter(Boolean);

  for (const src of sources) {
    for (const [rawKey, rawVal] of Object.entries(src)) {
      if (rawKey === 'readings' || rawKey === 'symptoms' || rawKey === 'timestamp' || rawKey === 'timestampUtc') {
        continue;
      }

      const lower = rawKey.toLowerCase();
      if (lower === 'dbp' || lower === 'diastolic') {
        const dbp = toFiniteNumber(rawVal);
        if (dbp !== null) {
          patches['1A-i'] = { ...(patches['1A-i'] || {}), secondaryValue: dbp };
        }
        continue;
      }
      if (lower === 'lapses') {
        const lapses = toFiniteNumber(rawVal);
        if (lapses !== null) {
          patches['3A-ii'] = { ...(patches['3A-ii'] || {}), lapses };
        }
        continue;
      }
      if (lower === 'commdelaysec') {
        const sec = toFiniteNumber(rawVal);
        if (sec !== null) {
          patches['5A'] = { ...(patches['5A'] || {}), commDelaySec: sec };
        }
        continue;
      }

      const indId = indicators[rawKey] ? rawKey : ALIAS_TO_ID[lower];
      if (!indId) continue;

      if (typeof rawVal === 'object' && rawVal !== null) {
        const val = toFiniteNumber(rawVal.value ?? rawVal.sbp);
        const secVal = toFiniteNumber(rawVal.secondaryValue ?? rawVal.dbp);
        const patch = { ...rawVal };
        if (val !== null) patch.value = val;
        else delete patch.value;
        if (secVal !== null) patch.secondaryValue = secVal;
        if (Object.keys(patch).length > 0) {
          patches[indId] = { ...(patches[indId] || {}), ...patch };
        }
      } else {
        const val = toFiniteNumber(rawVal);
        if (val !== null) {
          patches[indId] = { ...(patches[indId] || {}), value: val };
        }
      }
    }
  }

  return patches;
}

/**
 * Advances the mission state by one day (`missionDay + 1`), applies any new
 * check-in readings and symptoms, trims every indicator's history to the last
 * 7 days, and returns a fresh state object ready for `evaluate(newState)`.
 *
 * @param {string|Object} state Current state (`{ profile, symptoms, readings }`) or preset key
 * @param {Object} [reading={}] Check-in readings (by indicator ID or friendly key) & symptoms
 * @returns {{ profile: Object, symptoms: Object, readings: Object }} Updated mission state
 */
export function addReading(state, reading = {}) {
  const resolved = resolveInput(state);
  const regime = normalizeRegime(resolved.profile?.regime);

  const nextProfile = {
    ...resolved.profile,
    missionDay: (Number(resolved.profile?.missionDay) || 0) + 1,
    ...(reading.timestamp || reading.timestampUtc
      ? { timestampUtc: reading.timestamp || reading.timestampUtc }
      : {}),
  };

  const nextSymptoms = normalizeSymptoms(resolved.symptoms, reading?.symptoms);
  const patches = extractIncomingPatches(reading);
  const nextReadings = {};

  for (const indId of Object.keys(indicators)) {
    const { baseline } = getIndicatorSpec(indId, regime);
    const rawPrev = resolved.readings[indId] ?? { value: baseline.mean };
    const prev = typeof rawPrev === 'object' && rawPrev !== null
      ? { ...rawPrev }
      : { value: rawPrev };

    const prevValue = toFiniteNumber(prev.value) ?? baseline.mean;
    const prevHistory = Array.isArray(prev.history7d) && prev.history7d.length > 0
      ? [...prev.history7d]
      : generateHistory(baseline.mean, baseline.sigmaMin, prevValue, hashKey(indId));

    const patch = patches[indId];
    const hasNewValue = patch && (patch.value != null || patch.commDelaySec != null);

    let nextValue = prevValue;
    let nextCommDelaySec = prev.commDelaySec;

    if (indId === '5A' && patch) {
      if (patch.commDelaySec != null && patch.value == null) {
        nextCommDelaySec = patch.commDelaySec;
        nextValue = Math.round((nextCommDelaySec / 60) * 1000) / 1000;
      } else if (patch.value != null && patch.commDelaySec == null) {
        nextValue = patch.value;
        nextCommDelaySec = Math.round(nextValue * 60);
      } else if (patch.value != null && patch.commDelaySec != null) {
        nextValue = patch.value;
        nextCommDelaySec = patch.commDelaySec;
      }
    } else if (patch?.value != null) {
      nextValue = patch.value;
    }

    const nextHistory = [...prevHistory, nextValue].slice(-7);

    const updated = {
      ...prev,
      ...(patch || {}),
      value: nextValue,
      history7d: nextHistory,
      lastMeasuredDaysAgo: hasNewValue ? 0 : (Number(prev.lastMeasuredDaysAgo) || 0) + 1,
    };

    if (indId === '5A' && nextCommDelaySec != null) {
      updated.commDelaySec = nextCommDelaySec;
    }

    if (indId === '1A-i') {
      const prevSec = toFiniteNumber(prev.secondaryValue) ?? baseline.secondaryMean ?? 71;
      const nextSec = patch?.secondaryValue != null ? patch.secondaryValue : prevSec;
      const prevSecHist = Array.isArray(prev.historySecondary7d) && prev.historySecondary7d.length > 0
        ? [...prev.historySecondary7d]
        : Array(prevHistory.length).fill(prevSec);
      updated.secondaryValue = nextSec;
      updated.historySecondary7d = [...prevSecHist, nextSec].slice(-7);
    }

    nextReadings[indId] = updated;
  }

  return {
    profile: nextProfile,
    symptoms: nextSymptoms,
    readings: nextReadings,
  };
}

export default evaluate;
