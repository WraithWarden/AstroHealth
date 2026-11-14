import { getIndicatorSpec } from './indicatorHelpers.js';

/**
 * Evaluates Stage 2 directional personal drift (z-score) against the astronaut's
 * adapted spaceflight baseline.
 *
 * @param {string} indicatorId Indicator ID (e.g. '1B-i', '3A-i')
 * @param {number|Object} readingOrValue Numeric value or reading object
 * @param {string} [regime='MARS'] Mission regime ('ISS' | 'LUNAR' | 'MARS')
 * @returns {{ status: 'GREEN'|'YELLOW'|'RED', zScore: number, effectiveZ: number }}
 */
export function checkDrift(indicatorId, readingOrValue, regime = 'MARS') {
  const reading = typeof readingOrValue === 'object' && readingOrValue !== null
    ? readingOrValue
    : { value: readingOrValue };
  const value = Number(reading.value ?? 0);

  const { indicator, baseline } = getIndicatorSpec(indicatorId, regime);
  const direction = indicator.driftDirection;

  if (direction === 'THRESHOLD_ONLY' || direction === 'CONTEXT_ONLY') {
    return { status: 'GREEN', zScore: 0, effectiveZ: 0 };
  }

  const sd = Math.max(baseline.sigmaMin ?? 1, 1e-6);
  let rawZ = (value - baseline.mean) / sd;

  // Special dual-value drift check for Blood Pressure (SBP + DBP)
  if (indicatorId === '1A-i' && reading.secondaryValue != null && baseline.secondaryMean != null) {
    const dbpSd = Math.max(baseline.secondarySigmaMin ?? 1, 1e-6);
    const dbpZ = (Number(reading.secondaryValue) - baseline.secondaryMean) / dbpSd;
    if (Math.abs(dbpZ) > Math.abs(rawZ)) {
      rawZ = dbpZ;
    }
  }

  let effectiveZ = 0;
  if (direction === 'HIGH') {
    effectiveZ = Math.max(0, rawZ);
  } else if (direction === 'LOW') {
    effectiveZ = Math.max(0, -rawZ);
  } else if (direction === 'BOTH') {
    effectiveZ = Math.abs(rawZ);
  }

  // Normalize IEEE 754 floating-point precision before threshold comparison
  const roundedRawZ = Math.round(rawZ * 100) / 100;
  const roundedEffZ = Math.round(effectiveZ * 10000) / 10000;

  let status = 'GREEN';
  if (roundedEffZ >= 3.0) {
    status = 'RED';
  } else if (roundedEffZ >= 2.0) {
    status = 'YELLOW';
  }

  return {
    status,
    zScore: roundedRawZ,
    effectiveZ: Math.round(effectiveZ * 100) / 100,
  };
}
