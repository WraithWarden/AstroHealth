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

export default evaluate;
