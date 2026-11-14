/**
 * Deterministic seeded PRNG (Mulberry32) so history generation produces
 * identical sequences across all runs and machines.
 *
 * @param {number} seed Integer seed
 * @returns {() => number} Pseudo-random generator returning [0, 1)
 */
export function createSeededRng(seed = 42) {
  let state = seed >>> 0;
  return function nextRandom() {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Rounds a number to a fixed decimal precision.
 *
 * @param {number} value
 * @param {number} decimals
 * @returns {number}
 */
function roundTo(value, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/**
 * Generates a deterministic 7-day history for a measurement:
 * - Days 1-4: baseline mean plus deterministic noise within ±0.5 SD
 * - Days 5-7: linear drift from baseline mean toward todayValue (Day 7 = todayValue)
 *
 * @param {number} mean Baseline mean
 * @param {number} sd Baseline standard deviation
 * @param {number} todayValue Today's reading (Day 7)
 * @param {number} [seed=2026] Fixed random seed
 * @param {number} [decimals=2] Rounding precision
 * @returns {number[]} Array of 7 daily values
 */
export function generateHistory(mean, sd, todayValue, seed = 2026, decimals = 2) {
  const rng = createSeededRng(seed);
  const history = [];

  // Days 1-4: baseline mean + noise within [-0.5 * sd, +0.5 * sd]
  for (let i = 0; i < 4; i++) {
    const noise = (rng() * 2 - 1) * 0.5 * sd;
    history.push(roundTo(mean + noise, decimals));
  }

  // Days 5-7: linear drift from baseline mean toward todayValue
  const delta = todayValue - mean;
  history.push(roundTo(mean + delta * (1 / 3), decimals));
  history.push(roundTo(mean + delta * (2 / 3), decimals));
  history.push(roundTo(todayValue, decimals));

  return history;
}

/**
 * Generates a simple deterministic integer hash from a string key (e.g. indicator ID)
 * to seed each indicator reproducibly.
 *
 * @param {string} key
 * @returns {number}
 */
export function hashKey(key) {
  let hash = 2166136261;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
