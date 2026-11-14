import { describe, it, expect } from 'vitest';
import { submitCheckIn, missionDay } from './submitCheckIn.js';

// Stand-ins for Person 1's engine, so this test runs without it.
const addReading = (state, reading) => ({ ...state, day: state.day + 1, last: reading });
const evaluate = (state) => ({ day: state.day, spo2: state.last['4A-i'] });

const base = { state: { day: 14 }, addReading, evaluate, preset: 'ISS' };

describe('submitCheckIn', () => {
  it('passes the reading to addReading, then evaluates the new state', () => {
    const r = submitCheckIn({ ...base, reading: { '4A-i': 90 }, meta: {} });
    expect(r.state.last['4A-i']).toBe(90);
    expect(r.output.spo2).toBe(90);
    expect(r.state.day).toBe(15);
  });

  it('labels the day: ISS 15, Lunar 91, Mars 241', () => {
    expect(submitCheckIn({ ...base, reading: { a: 1 } }).dayLabel).toBe('Day 15 logged');
    expect(missionDay({}, 'LUNAR', 1)).toBe(91);
    expect(missionDay({}, 'MARS', 1)).toBe(241);
    expect(missionDay({}, 'Mars', 2)).toBe(242);
  });

  it('flags a red-flag symptom', () => {
    const r = submitCheckIn({ ...base, reading: { a: 1 }, meta: { symptoms: ['chest_pain'], redFlag: true } });
    expect(r.redFlag).toBe(true);
    expect(r.symptoms).toEqual(['Chest pain']);
    expect(r.selfHarm).toBe(false);
  });

  it('marks self-harm symptom for the extra support line', () => {
    const r = submitCheckIn({ ...base, reading: { a: 1 }, meta: { symptoms: ['self_harm'] } });
    expect(r.redFlag).toBe(true);
    expect(r.selfHarm).toBe(true);
  });

  it('no symptoms means no red flag', () => {
    expect(submitCheckIn({ ...base, reading: { a: 1 }, meta: { symptoms: [] } }).redFlag).toBe(false);
  });

  it('rejects an empty reading', () => {
    expect(() => submitCheckIn({ ...base, reading: {} })).toThrow();
  });
});
