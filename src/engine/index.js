import mockMars from './mock-mars.json';
import mockISS from './mock-iss.json';
import mockLunar from './mock-lunar.json';

/**
 * Evaluates astronaut inputs and returns health status according to docs/CONTRACT.md.
 * In Phase 0, evaluate() is a stub returning the contract-compliant mock output.
 * If a preset string or profile regime is provided ('iss', 'lunar', 'mars'), it returns
 * the corresponding dataset; defaults to mockMars.
 *
 * @param {Object|string} [input='mars'] Input data or preset key
 * @returns {Object} Complete contract-compliant evaluation output
 */
export function evaluate(input = 'mars') {
  if (typeof input === 'string') {
    const key = input.toLowerCase();
    if (key.includes('iss')) return mockISS;
    if (key.includes('lunar') || key.includes('moon')) return mockLunar;
    return mockMars;
  }
  if (input && input.profile && input.profile.regime) {
    const regime = String(input.profile.regime).toLowerCase();
    if (regime === 'iss') return mockISS;
    if (regime === 'lunar') return mockLunar;
    return mockMars;
  }
  return mockMars;
}

export { mockMars, mockISS, mockLunar };
export default evaluate;
