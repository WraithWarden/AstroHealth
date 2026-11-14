import { describe, it, expect } from 'vitest';
import {
  evaluate,
  addReading,
  evaluateAutonomy,
  checkThreshold,
  checkDrift,
  checkTrend,
  scoreMeasurement,
  generateHistory,
} from './index.js';
import { resolveAutonomyLevel, formatCommDelay } from '../components/AutonomyChip.jsx';
import indicators from '../data/indicators.json';
import presets from '../data/presets.json';
import hazard1 from '../data/hazard1.json';
import hazard5 from '../data/hazard5.json';

describe('Phase 1: History Generator', () => {
  it('generates 7 days with Days 1-4 within ±0.5 SD and Day 7 equal to todayValue using fixed seed', () => {
    const mean = 5.25;
    const sd = 0.15;
    const today = 5.90;

    const h1 = generateHistory(mean, sd, today, 1234);
    const h2 = generateHistory(mean, sd, today, 1234);

    expect(h1).toEqual(h2); // Reproducible
    expect(h1.length).toBe(7);

    // Days 1-4 within mean ± 0.5 SD
    for (let i = 0; i < 4; i++) {
      expect(h1[i]).toBeGreaterThanOrEqual(mean - 0.5 * sd - 0.01);
      expect(h1[i]).toBeLessThanOrEqual(mean + 0.5 * sd + 0.01);
    }

    // Days 5-7 straight-line drift toward today
    expect(h1[4]).toBeGreaterThan(mean);
    expect(h1[5]).toBeGreaterThan(h1[4]);
    expect(h1[6]).toBe(today);
  });
});

describe('Phase 1: Stage 1 Threshold Checks', () => {
  it('tests both low and high limits for bidirectional metrics (BP, HR, Glucose)', () => {
    // 1A-i Blood Pressure
    expect(checkThreshold('1A-i', { value: 112, secondaryValue: 71 }).status).toBe('GREEN');
    expect(checkThreshold('1A-i', { value: 128, secondaryValue: 78 }).status).toBe('YELLOW');
    expect(checkThreshold('1A-i', { value: 92, secondaryValue: 64 }).status).toBe('YELLOW');
    expect(checkThreshold('1A-i', { value: 145, secondaryValue: 92 }).status).toBe('RED');
    expect(checkThreshold('1A-i', { value: 82, secondaryValue: 52 }).status).toBe('RED');

    // 1A-ii Resting Heart Rate
    expect(checkThreshold('1A-ii', { value: 62 }).status).toBe('GREEN');
    expect(checkThreshold('1A-ii', { value: 45 }).status).toBe('YELLOW');
    expect(checkThreshold('1A-ii', { value: 88 }).status).toBe('YELLOW');
    expect(checkThreshold('1A-ii', { value: 38 }).status).toBe('RED');
    expect(checkThreshold('1A-ii', { value: 105, sustainedHighReadings: 2 }).status).toBe('RED');

    // 4B-i Fasting Glucose (split hyper/hypoglycemic)
    const hyper = checkThreshold('4B-i', { value: 130 });
    expect(hyper.status).toBe('RED');
    expect(hyper.subType).toBe('HYPERGLYCEMIC');

    const hypo = checkThreshold('4B-i', { value: 65 });
    expect(hypo.status).toBe('RED');
    expect(hypo.subType).toBe('HYPOGLYCEMIC');
  });

  it('handles special cases: cumulative career dose %, categorical skin 0-3, and symptom overrides', () => {
    // 2A-ii Cumulative Career Dose (600 mSv limit: 50% = 300 Yellow, 80% = 480 Red)
    expect(checkThreshold('2A-ii', 250).status).toBe('GREEN');
    expect(checkThreshold('2A-ii', 310).status).toBe('YELLOW');
    expect(checkThreshold('2A-ii', 490).status).toBe('RED');

    // 4B-ii Skin categorical 0-3
    expect(checkThreshold('4B-ii', 0).status).toBe('GREEN');
    expect(checkThreshold('4B-ii', 1).status).toBe('YELLOW');
    expect(checkThreshold('4B-ii', 2).status).toBe('YELLOW');
    expect(checkThreshold('4B-ii', 3).status).toBe('RED');

    // Symptom red-flag override on ONSD
    expect(checkThreshold('1B-i', 5.2, { blurredVision: true }).status).toBe('RED');
  });
});

describe('Phase 1: Stage 2 Directional Drift Checks (z-score)', () => {
  it('counts only the bad direction and applies <2 Green, 2-3 Yellow, >=3 Red', () => {
    // 1B-i ONSD (HIGH is bad: mean 5.25, sd 0.15)
    expect(checkDrift('1B-i', 4.80).status).toBe('GREEN'); // lower is NOT bad for HIGH
    expect(checkDrift('1B-i', 4.80).effectiveZ).toBe(0);
    expect(checkDrift('1B-i', 5.55).status).toBe('YELLOW'); // z = +2.0
    expect(checkDrift('1B-i', 5.90).status).toBe('RED'); // z = +4.33

    // 3A-i Sleep (LOW is bad: mean 6.4, sd 0.5)
    expect(checkDrift('3A-i', 8.0).status).toBe('GREEN'); // higher is NOT bad for LOW
    expect(checkDrift('3A-i', 5.2).status).toBe('YELLOW'); // z = -2.4
    expect(checkDrift('3A-i', 4.8).status).toBe('RED'); // z = -3.2
  });
});

describe('Phase 1: Stage 3 Worsening Trend Checks', () => {
  it('upgrades GREEN to YELLOW when last 3 intervals worsen monotonically by >= 1 SD', () => {
    // 1B-i ONSD: mean 5.25, sd 0.15 -> 3 steps rising from 5.15 to 5.36 (delta = 0.21 >= 0.15)
    const res = checkTrend('1B-i', [5.25, 5.25, 5.25, 5.15, 5.22, 5.29, 5.36], 'GREEN');
    expect(res.status).toBe('YELLOW');
    expect(res.trending).toBe(true);

    // Non-monotonic stays GREEN
    const nonMono = checkTrend('1B-i', [5.25, 5.25, 5.25, 5.20, 5.28, 5.24, 5.30], 'GREEN');
    expect(nonMono.status).toBe('GREEN');
    expect(nonMono.trending).toBe(false);
  });
});

describe('Phase 1: Stage 4 Scoring & Full Presets Verification', () => {
  it('verifies sleep 5.2 h scores ~67 and ONSD 5.9 mm scores ~17', () => {
    // Sleep 5.2h: mean 6.4, sd 0.5 -> effZ = 2.4 -> score = 79 - 0.4 * 29 = 67.4 (~67)
    const sleepDrift = checkDrift('3A-i', 5.2);
    const sleepThresh = checkThreshold('3A-i', 5.2);
    const sleepScore = scoreMeasurement('YELLOW', sleepDrift.effectiveZ, sleepThresh.thresholdScore);
    expect(sleepScore).toBeGreaterThanOrEqual(66);
    expect(sleepScore).toBeLessThanOrEqual(69);

    // ONSD 5.9mm: mean 5.25, sd 0.15 -> effZ = 4.33 -> score ~16-17
    const onsdDrift = checkDrift('1B-i', 5.9);
    const onsdThresh = checkThreshold('1B-i', 5.9);
    const onsdScore = scoreMeasurement('RED', onsdDrift.effectiveZ, onsdThresh.thresholdScore);
    expect(onsdScore).toBeGreaterThanOrEqual(15);
    expect(onsdScore).toBeLessThanOrEqual(18);
  });

  it('evaluates ISS preset as NOMINAL with all green physiological indicators', () => {
    const res = evaluate('iss');
    expect(res.badge).toBe('NOMINAL');
    expect(res.autonomy).toBe('A0');
    expect(res.overall).toBeGreaterThanOrEqual(80);
    expect(res.overallDetails.redCount).toBe(0);
    expect(res.overallDetails.yellowCount).toBe(0);
  });

  it('evaluates LUNAR preset as WARNING with zero RED physiological indicators', () => {
    const res = evaluate('lunar');
    expect(res.badge).toBe('WARNING');
    expect(res.autonomy).toBe('A0'); // 1.3s comm delay (< 5s = A0)
    expect(res.overallDetails.redCount).toBe(0);
    expect(res.overallDetails.yellowCount).toBeGreaterThan(0);
  });

  it('evaluates MARS preset as CRITICAL with A2 autonomy penalty and Red-Floor cap', () => {
    const res = evaluate('mars');
    expect(res.badge).toBe('CRITICAL');
    expect(res.autonomy).toBe('A2');
    expect(res.overallDetails.autonomyPenalty).toBe(10);
    expect(res.overall).toBeLessThanOrEqual(55);
    expect(res.overall).toBeGreaterThanOrEqual(45);

    // Red-Floor capping on H1 and H2
    const h1 = res.hazards.find(h => h.hazardId === 'H1');
    const h2 = res.hazards.find(h => h.hazardId === 'H2');
    expect(h1.cappedByRedFloor).toBe(true);
    expect(h1.score).toBeLessThanOrEqual(49);
    expect(h2.cappedByRedFloor).toBe(true);
    expect(h2.score).toBeLessThanOrEqual(49);

    // Eyes node must be RED
    expect(res.nodes.eyes).toBe('RED');
  });

  it('validates Hazard 1 and Hazard 5 content files (6 records total) and 18 indicators', () => {
    expect(hazard1.length).toBe(4);
    expect(hazard5.length).toBe(2);
    expect(Object.keys(indicators).length).toBe(18);
    expect(Object.keys(presets.mars.readings).length).toBe(18);
  });
});

describe('Phase 2: Preset Histories, addReading() & Autonomy Chip', () => {
  it('verifies Mars preset 7-day histories drift toward red on key indicators', () => {
    const mars = evaluate('mars');
    const onsdHist = mars.measurements['1B-i'].history;
    const radHist = mars.measurements['2A-i'].history;
    expect(onsdHist.length).toBe(7);
    expect(onsdHist[6]).toBe(5.9);
    expect(onsdHist[6]).toBeGreaterThan(onsdHist[4]);
    expect(onsdHist[4]).toBeGreaterThan(onsdHist[3]);
    expect(radHist[6]).toBe(6.2);
    expect(radHist[6]).toBeGreaterThan(radHist[3]);
  });

  it('advances missionDay by 1, keeps strictly 7 days, and returns a new immutable state', () => {
    const day14 = presets.iss;
    const day15 = addReading(day14, { '4A-i': 90, sleep: 5.2 });

    expect(day14.profile.missionDay).toBe(14);
    expect(day15.profile.missionDay).toBe(15);
    expect(day14.readings['4A-i'].value).toBe(98);
    expect(day15.readings['4A-i'].value).toBe(90);

    for (const indId of Object.keys(indicators)) {
      expect(day15.readings[indId].history7d.length).toBe(7);
    }
    expect(day15.readings['4A-i'].history7d[6]).toBe(90);
    expect(day15.readings['3A-i'].history7d[6]).toBe(5.2);

    const res = evaluate(day15);
    expect(res.nodes.lungs).toBe('RED');
    expect(res.badge).toBe('CRITICAL');
  });

  it('increments Lunar Day 90 -> 91 and Mars Day 240 -> 241 and supports symptom arrays', () => {
    const lunar91 = addReading('lunar', { symptoms: ['Blurred vision'] });
    expect(lunar91.profile.missionDay).toBe(91);
    expect(lunar91.symptoms.blurredVision).toBe(true);
    expect(evaluate(lunar91).nodes.eyes).toBe('RED');

    const mars241 = addReading('mars', { onsd: 6.0 });
    expect(mars241.profile.missionDay).toBe(241);
    expect(mars241.readings['1B-i'].value).toBe(6.0);
  });

  it('classifies autonomy tiers (< 5s A0, 5s-5m A1, > 5m A2) and formats delays for the chip', () => {
    const iss = evaluate('iss');
    const lunar = evaluate('lunar');
    const mars = evaluate('mars');

    expect(resolveAutonomyLevel(iss.autonomy, iss.delay_seconds)).toBe('A0');
    expect(formatCommDelay(iss.delay_seconds)).toBe('0s');

    expect(resolveAutonomyLevel(lunar.autonomy, lunar.delay_seconds)).toBe('A0');
    expect(formatCommDelay(lunar.delay_seconds)).toBe('1.3s');

    expect(resolveAutonomyLevel(mars.autonomy, mars.delay_seconds)).toBe('A2');
    expect(formatCommDelay(mars.delay_seconds)).toBe('18 min');

    // Boundary checks for A1 Delayed (5s to 300s)
    expect(evaluateAutonomy({ commDelaySec: 4 }).level).toBe('A0');
    expect(evaluateAutonomy({ commDelaySec: 5 }).level).toBe('A1');
    expect(evaluateAutonomy({ commDelaySec: 300 }).level).toBe('A1');
    expect(evaluateAutonomy({ commDelaySec: 301 }).level).toBe('A2');
    expect(resolveAutonomyLevel(undefined, 45)).toBe('A1');
    expect(formatCommDelay(45)).toBe('45s');
  });
});
