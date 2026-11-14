import indicators from '../data/indicators.json';

export const STATUS_RANK = { GREEN: 0, YELLOW: 1, RED: 2 };

export const STATUS_TO_BADGE = {
  GREEN: 'NOMINAL',
  YELLOW: 'WARNING',
  RED: 'CRITICAL',
};

/**
 * Returns the worse of two status strings ('GREEN' | 'YELLOW' | 'RED').
 *
 * @param {'GREEN'|'YELLOW'|'RED'} a
 * @param {'GREEN'|'YELLOW'|'RED'} b
 * @returns {'GREEN'|'YELLOW'|'RED'}
 */
export function worstStatus(a = 'GREEN', b = 'GREEN') {
  return (STATUS_RANK[a] ?? 0) >= (STATUS_RANK[b] ?? 0) ? a : b;
}

/**
 * Normalizes regime string to 'ISS' | 'LUNAR' | 'MARS'.
 *
 * @param {string} [regime='MARS']
 * @returns {'ISS'|'LUNAR'|'MARS'}
 */
export function normalizeRegime(regime = 'MARS') {
  const upper = String(regime || 'MARS').toUpperCase();
  if (upper.includes('ISS')) return 'ISS';
  if (upper.includes('LUNAR') || upper.includes('MOON')) return 'LUNAR';
  return 'MARS';
}

/**
 * Resolves the indicator definition, regime-specific baseline, and regime-specific thresholds.
 *
 * @param {string} indicatorId
 * @param {string} [regime='MARS']
 * @returns {{ indicator: Object, baseline: Object, thresholds: Object }}
 */
export function getIndicatorSpec(indicatorId, regime = 'MARS') {
  const indicator = indicators[indicatorId];
  if (!indicator) {
    throw new Error(`Unknown indicator ID: ${indicatorId}`);
  }
  const normRegime = normalizeRegime(regime);

  const baseline =
    indicator.spaceBaseline ||
    indicator.spaceBaselineByRegime?.[normRegime] ||
    indicator.spaceBaselineByRegime?.MARS ||
    { mean: 0, sigmaMin: 1 };

  const thresholds =
    indicator.thresholds ||
    indicator.thresholdsByRegime?.[normRegime] ||
    indicator.thresholdsByRegime?.MARS ||
    {};

  return { indicator, baseline, thresholds };
}
