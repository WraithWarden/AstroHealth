import { getIndicatorSpec } from './indicatorHelpers.js';

/**
 * Evaluates Stage 3 Consecutive Worsening Trend Rule:
 * Applies ONLY if the indicator is still 'GREEN' after Stages 1 & 2.
 * Inspects the last 4 readings [t-3, t-2, t-1, t0]. If all 3 intervals moved
 * strictly monotonically in the unfavorable direction and total excursion >= 1.0 SD,
 * upgrades status from 'GREEN' to 'YELLOW' with trending: true.
 *
 * @param {string} indicatorId
 * @param {number[]} history7d Array of daily readings (at least 4 items)
 * @param {'GREEN'|'YELLOW'|'RED'} [currentStatus='GREEN'] Status after Stages 1-2
 * @param {string} [regime='MARS'] Mission regime
 * @returns {{ status: 'GREEN'|'YELLOW'|'RED', trending: boolean }}
 */
export function checkTrend(indicatorId, history7d, currentStatus = 'GREEN', regime = 'MARS') {
  if (currentStatus !== 'GREEN' || !Array.isArray(history7d) || history7d.length < 4) {
    return { status: currentStatus, trending: false };
  }

  const { indicator, baseline } = getIndicatorSpec(indicatorId, regime);
  const direction = indicator.driftDirection;
  if (direction === 'THRESHOLD_ONLY' || direction === 'CONTEXT_ONLY') {
    return { status: currentStatus, trending: false };
  }

  const sd = Math.max(baseline.sigmaMin ?? 1, 1e-6);
  const [r0, r1, r2, r3] = history7d.slice(-4).map(Number);

  const rising = r1 > r0 && r2 > r1 && r3 > r2;
  const falling = r1 < r0 && r2 < r1 && r3 < r2;
  const excursion = Math.round(Math.abs(r3 - r0) * 10000) / 10000;
  const sdTarget = Math.round(sd * 10000) / 10000;

  let isWorsening = false;
  if (direction === 'HIGH') {
    isWorsening = rising && (r3 - r0 + 1e-9) >= sdTarget;
  } else if (direction === 'LOW') {
    isWorsening = falling && (r0 - r3 + 1e-9) >= sdTarget;
  } else if (direction === 'BOTH') {
    const movingUpOutward = rising && r3 > baseline.mean && excursion >= sdTarget;
    const movingDownOutward = falling && r3 < baseline.mean && excursion >= sdTarget;
    isWorsening = movingUpOutward || movingDownOutward;
  }

  if (isWorsening) {
    return { status: 'YELLOW', trending: true };
  }

  return { status: currentStatus, trending: false };
}
