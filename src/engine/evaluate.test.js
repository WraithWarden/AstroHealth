import { describe, it, expect } from 'vitest';
import { evaluate, mockMars } from './index.js';
import indicators from '../data/indicators.json';
import presets from '../data/presets.json';

describe('Phase 0: Engine Stub & Data Contract Verification', () => {
  it('evaluate() returns mock Mars data by default', () => {
    const result = evaluate();
    expect(result).toBeDefined();
    expect(result.preset).toBe('mars');
    expect(result.overall).toBe(51);
    expect(result.badge).toBe('CRITICAL');
    expect(result.autonomy).toBe('A2');
  });

  it('verifies exact Mars numbers per Phase 0 Sprint Guide', () => {
    const result = evaluate('mars');
    expect(result.overall).toBe(51);
    expect(result.badge).toBe('CRITICAL');
    expect(result.autonomy).toBe('A2');

    // Hazard scores: 49 / 35 / 68 / 92
    const h1 = result.hazards.find(h => h.id === 1 || h.hazardId === 'H1');
    const h2 = result.hazards.find(h => h.id === 2 || h.hazardId === 'H2');
    const h3 = result.hazards.find(h => h.id === 3 || h.hazardId === 'H3');
    const h4 = result.hazards.find(h => h.id === 4 || h.hazardId === 'H4');

    expect(h1).toBeDefined();
    expect(h1.score).toBe(49);
    expect(h1.status).toBe('RED');

    expect(h2).toBeDefined();
    expect(h2.score).toBe(35);
    expect(h2.status).toBe('RED');

    expect(h3).toBeDefined();
    expect(h3.score).toBe(68);
    expect(h3.status).toBe('YELLOW');

    expect(h4).toBeDefined();
    expect(h4.score).toBe(92);
    expect(h4.status).toBe('GREEN');
  });

  it('contains all 6 BodyMap nodes with expected Mars statuses', () => {
    const result = evaluate();
    expect(result.nodes).toBeDefined();
    expect(result.nodes.eyes).toBe('RED');
    expect(result.nodes.whole).toBe('RED');
    expect(result.nodes.brain).toBe('YELLOW');
    expect(result.nodes.bones).toBe('YELLOW');
    expect(result.nodes.heart).toBe('GREEN');
    expect(result.nodes.lungs).toBe('GREEN');
  });

  it('contains vital measurements with history and baseline for Chart component', () => {
    const result = evaluate();
    expect(result.measurements).toBeDefined();

    // 1B-i ONSD
    const onsd = result.measurements['1B-i'] || result.measurements.ONSD;
    expect(onsd).toBeDefined();
    expect(onsd.value).toBe(5.90);
    expect(onsd.unit).toBe('mm');
    expect(onsd.status).toBe('RED');
    expect(onsd.node).toBe('eyes');
    expect(Array.isArray(onsd.history)).toBe(true);
    expect(onsd.history.length).toBe(7);
  });

  it('validates src/data/indicators.json has all 18 NASA spaceflight indicators', () => {
    const indicatorKeys = Object.keys(indicators);
    expect(indicatorKeys.length).toBe(18);

    const requiredKeys = [
      '1A-i', '1A-ii', '1B-i', '1B-ii',
      '2A-i', '2A-ii', '2B-i', '2B-ii',
      '3A-i', '3A-ii', '3B-i', '3B-ii',
      '4A-i', '4A-ii', '4B-i', '4B-ii',
      '5A', '5B'
    ];

    for (const key of requiredKeys) {
      expect(indicators[key]).toBeDefined();
      expect(indicators[key].name).toBeTruthy();
      expect(indicators[key].unit).toBeTruthy();
      expect(indicators[key].node).toBeTruthy();
    }
  });

  it('validates src/data/presets.json has all 3 mission regimes (ISS, Lunar, Mars)', () => {
    expect(presets.iss).toBeDefined();
    expect(presets.lunar).toBeDefined();
    expect(presets.mars).toBeDefined();

    expect(presets.iss.profile.regime).toBe('ISS');
    expect(presets.lunar.profile.regime).toBe('LUNAR');
    expect(presets.mars.profile.regime).toBe('MARS');

    expect(Object.keys(presets.mars.readings).length).toBe(18);
  });
});
