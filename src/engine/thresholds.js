import { getIndicatorSpec } from './indicatorHelpers.js';

/**
 * Evaluates Stage 1 absolute thresholds and acute red-flag symptom overrides
 * for a single clinical indicator.
 *
 * @param {string} indicatorId Indicator ID (e.g., '1A-i', '1B-i', '4B-i')
 * @param {number|Object} readingOrValue Numeric value or reading object `{ value, secondaryValue, ... }`
 * @param {Object} [symptoms={}] Active red-flag symptoms map
 * @param {string} [regime='MARS'] Mission regime ('ISS' | 'LUNAR' | 'MARS')
 * @returns {{ status: 'GREEN'|'YELLOW'|'RED', subType: string|null, reason: string|null, thresholdScore: number|null }}
 */
export function checkThreshold(indicatorId, readingOrValue, symptoms = {}, regime = 'MARS') {
  const reading = typeof readingOrValue === 'object' && readingOrValue !== null
    ? readingOrValue
    : { value: readingOrValue };
  const value = Number(reading.value ?? 0);
  const { thresholds } = getIndicatorSpec(indicatorId, regime);

  switch (indicatorId) {
    case '1A-i': {
      const sbp = value;
      const dbp = Number(reading.secondaryValue ?? 71);
      if (symptoms.chestPain || symptoms.dizzinessSyncope) {
        return { status: 'RED', subType: 'SYMPTOMATIC', reason: 'Symptomatic BP alert (chest pain / syncope)', thresholdScore: 15 };
      }
      if (sbp >= 140 || dbp >= 90 || sbp <= 85 || dbp <= 55) {
        return { status: 'RED', subType: sbp <= 85 || dbp <= 55 ? 'HYPOTENSIVE' : 'HYPERTENSIVE', reason: `BP ${sbp}/${dbp} mmHg breached Red cutoff`, thresholdScore: 25 };
      }
      if ((sbp >= 121 && sbp <= 139) || (dbp >= 81 && dbp <= 89) || (sbp >= 86 && sbp <= 99) || (dbp >= 56 && dbp <= 59)) {
        return { status: 'YELLOW', subType: sbp <= 99 || dbp <= 59 ? 'LOW' : 'HIGH', reason: `BP ${sbp}/${dbp} mmHg in Yellow range`, thresholdScore: 68 };
      }
      return { status: 'GREEN', subType: null, reason: null, thresholdScore: null };
    }

    case '1A-ii': {
      if (symptoms.chestPain || symptoms.dizzinessSyncope) {
        return { status: 'RED', subType: 'SYMPTOMATIC', reason: 'Symptomatic heart rate alert', thresholdScore: 15 };
      }
      if (value < 40 || (value > 100 && (reading.sustainedHighReadings ?? 0) >= 2)) {
        return { status: 'RED', subType: value < 40 ? 'BRADYCARDIA' : 'TACHYCARDIA', reason: `Resting HR ${value} bpm breached Red cutoff`, thresholdScore: 25 };
      }
      if ((value >= 40 && value <= 49) || value >= 81) {
        return { status: 'YELLOW', subType: value <= 49 ? 'LOW' : 'HIGH', reason: `Resting HR ${value} bpm in Yellow range`, thresholdScore: 68 };
      }
      return { status: 'GREEN', subType: null, reason: null, thresholdScore: null };
    }

    case '1B-i': {
      if (symptoms.blurredVision || symptoms.persistentHeadache) {
        return { status: 'RED', subType: 'SYMPTOMATIC_SANS', reason: 'Neuro-ocular symptom override (blurred vision / headache)', thresholdScore: 15 };
      }
      if (value >= 5.8) {
        const score = Math.max(0, Math.round(49 - Math.min(1, (value - 5.8) / 0.6) * 49));
        return { status: 'RED', subType: null, reason: `ONSD ${value} mm >= 5.8 mm Red cutoff`, thresholdScore: score };
      }
      if (value >= 5.5) {
        const score = Math.round(79 - ((value - 5.5) / 0.3) * 29);
        return { status: 'YELLOW', subType: null, reason: `ONSD ${value} mm in Yellow range (5.5-5.7)`, thresholdScore: score };
      }
      return { status: 'GREEN', subType: null, reason: null, thresholdScore: null };
    }

    case '1B-ii': {
      if (value > 300) {
        return { status: 'RED', subType: null, reason: `Urine calcium ${value} mg/day > 300 Red cutoff`, thresholdScore: 30 };
      }
      if (value >= 261) {
        const score = Math.round(79 - ((value - 261) / 39) * 29);
        return { status: 'YELLOW', subType: null, reason: `Urine calcium ${value} mg/day in Yellow range`, thresholdScore: score };
      }
      return { status: 'GREEN', subType: null, reason: null, thresholdScore: null };
    }

    case '2A-i': {
      const yellowLimit = thresholds.yellowHigh ?? 1.5;
      const redLimit = thresholds.redHigh ?? 5.0;
      const spike = reading.hourlySpikeMultiple ?? 1.0;
      if (value >= redLimit || spike >= 3.0) {
        const excess = Math.min(1, Math.max(0, (value - redLimit) / 5.0));
        const score = value >= redLimit ? Math.max(0, Math.round(30 - excess * 30)) : 25;
        return { status: 'RED', subType: 'SPE_ONSET', reason: `Daily radiation ${value} mSv/day (${spike}x spike)`, thresholdScore: score };
      }
      if (value > yellowLimit) {
        const score = Math.round(79 - ((value - yellowLimit) / (redLimit - yellowLimit)) * 29);
        return { status: 'YELLOW', subType: null, reason: `Daily radiation ${value} mSv/day > ${yellowLimit}`, thresholdScore: score };
      }
      return { status: 'GREEN', subType: null, reason: null, thresholdScore: null };
    }

    case '2A-ii': {
      const limit = 600;
      const pct = (value / limit) * 100;
      if (pct >= 80 || (reading.singleSpeDoseMsv ?? 0) >= 250) {
        const score = Math.max(0, Math.round(49 - Math.min(1, (pct - 80) / 20) * 49));
        return { status: 'RED', subType: null, reason: `Career dose ${value} mSv (${pct.toFixed(0)}% of 600 mSv limit)`, thresholdScore: score };
      }
      if (pct >= 50 || (reading.projectedEomPct ?? 0) >= 75) {
        const score = Math.round(79 - ((pct - 50) / 30) * 29);
        return { status: 'YELLOW', subType: null, reason: `Career dose ${value} mSv (${pct.toFixed(0)}% of 600 mSv limit)`, thresholdScore: score };
      }
      return { status: 'GREEN', subType: null, reason: null, thresholdScore: null };
    }

    case '2B-i': {
      if (value < 3.5 || value > 11.0) {
        return { status: 'RED', subType: value < 3.5 ? 'LEUKOPENIA' : 'LEUKOCYTOSIS', reason: `WBC ${value} breached Red cutoff`, thresholdScore: 30 };
      }
      if (value <= 4.1 || value >= 9.6) {
        return { status: 'YELLOW', subType: value <= 4.1 ? 'LOW' : 'HIGH', reason: `WBC ${value} in Yellow range`, thresholdScore: 65 };
      }
      return { status: 'GREEN', subType: null, reason: null, thresholdScore: null };
    }

    case '2B-ii': {
      if (value >= 38.0) {
        return { status: 'RED', subType: 'FEBRILE', reason: `Temperature ${value} °C >= 38.0 °C`, thresholdScore: 25 };
      }
      if (value >= 37.6) {
        const score = Math.round(79 - ((value - 37.6) / 0.4) * 29);
        return { status: 'YELLOW', subType: null, reason: `Temperature ${value} °C in Yellow range`, thresholdScore: score };
      }
      return { status: 'GREEN', subType: null, reason: null, thresholdScore: null };
    }

    case '3A-i': {
      if (value < 4.5 && (reading.consecutiveLowNights ?? 0) >= 2) {
        return { status: 'RED', subType: null, reason: `Sleep ${value} h < 4.5 h for >= 2 nights`, thresholdScore: 25 };
      }
      if (value <= 5.5) {
        const score = Math.round(50 + Math.max(0, (value - 4.5) / 1.0) * 29);
        return { status: 'YELLOW', subType: null, reason: `Sleep ${value} h <= 5.5 h`, thresholdScore: score };
      }
      return { status: 'GREEN', subType: null, reason: null, thresholdScore: null };
    }

    case '3A-ii': {
      if (value > 350 || (reading.lapses ?? 0) >= 2) {
        return { status: 'RED', subType: null, reason: `PVT ${value} ms / lapses ${reading.lapses ?? 0} Red cutoff`, thresholdScore: 30 };
      }
      if (value >= 291 || (reading.lapses ?? 0) === 1) {
        const score = Math.round(79 - ((value - 291) / 59) * 29);
        return { status: 'YELLOW', subType: null, reason: `PVT ${value} ms >= 291 ms or 1 lapse`, thresholdScore: score };
      }
      return { status: 'GREEN', subType: null, reason: null, thresholdScore: null };
    }

    case '3B-i': {
      if (symptoms.selfHarmIdeation || value >= 7) {
        return { status: 'RED', subType: symptoms.selfHarmIdeation ? 'SELF_HARM_FLAG' : null, reason: 'Severe stress / behavioral Red flag', thresholdScore: 15 };
      }
      if (value >= 5) {
        const score = Math.round(79 - ((value - 5) / 2) * 29);
        return { status: 'YELLOW', subType: null, reason: `Stress score ${value}/10 in Yellow range`, thresholdScore: score };
      }
      return { status: 'GREEN', subType: null, reason: null, thresholdScore: null };
    }

    case '3B-ii': {
      if (value <= 38) {
        return { status: 'RED', subType: null, reason: `HRV RMSSD ${value} ms <= 38 ms`, thresholdScore: 30 };
      }
      if (value <= 42) {
        const score = Math.round(50 + ((value - 38) / 4) * 29);
        return { status: 'YELLOW', subType: null, reason: `HRV RMSSD ${value} ms in Yellow range`, thresholdScore: score };
      }
      return { status: 'GREEN', subType: null, reason: null, thresholdScore: null };
    }

    case '4A-i': {
      if (value <= 91) {
        return { status: 'RED', subType: 'HYPOXIA', reason: `SpO2 ${value}% <= 91% (acute hypobaric/stagnant hypoxia)`, thresholdScore: 20 };
      }
      if (value <= 94) {
        const score = Math.round(50 + ((value - 92) / 2) * 29);
        return { status: 'YELLOW', subType: null, reason: `SpO2 ${value}% in Yellow range (92-94%)`, thresholdScore: score };
      }
      return { status: 'GREEN', subType: null, reason: null, thresholdScore: null };
    }

    case '4A-ii': {
      if (symptoms.confusion || value >= 4.0) {
        return { status: 'RED', subType: 'HYPERCAPNIA', reason: `Cabin ppCO2 ${value} mmHg >= 4.0 or confusion`, thresholdScore: 25 };
      }
      if (value >= 3.0) {
        const score = Math.round(79 - ((value - 3.0) / 1.0) * 29);
        return { status: 'YELLOW', subType: null, reason: `Cabin ppCO2 ${value} mmHg in Yellow range`, thresholdScore: score };
      }
      return { status: 'GREEN', subType: null, reason: null, thresholdScore: null };
    }

    case '4B-i': {
      if (value >= 126) {
        return { status: 'RED', subType: 'HYPERGLYCEMIC', reason: `Glucose ${value} mg/dL >= 126 (Hyperglycemic)`, thresholdScore: 25 };
      }
      if (value < 70) {
        return { status: 'RED', subType: 'HYPOGLYCEMIC', reason: `Glucose ${value} mg/dL < 70 (Hypoglycemic)`, thresholdScore: 20 };
      }
      if (value >= 106 && value < 126) {
        const score = Math.round(79 - ((value - 106) / 20) * 29);
        return { status: 'YELLOW', subType: 'HYPERGLYCEMIC', reason: `Glucose ${value} mg/dL elevated`, thresholdScore: score };
      }
      if (value >= 70 && value <= 74) {
        const score = Math.round(50 + ((value - 70) / 4) * 29);
        return { status: 'YELLOW', subType: 'HYPOGLYCEMIC', reason: `Glucose ${value} mg/dL low`, thresholdScore: score };
      }
      return { status: 'GREEN', subType: null, reason: null, thresholdScore: null };
    }

    case '4B-ii': {
      if (value >= 3) {
        return { status: 'RED', subType: 'SEVERE', reason: 'Severe skin lesion / ulceration (Grade 3)', thresholdScore: 20 };
      }
      if (value >= 1) {
        return { status: 'YELLOW', subType: value === 2 ? 'MODERATE' : 'MILD', reason: `Skin Grade ${value}`, thresholdScore: value === 2 ? 55 : 75 };
      }
      return { status: 'GREEN', subType: 'CLEAR', reason: null, thresholdScore: 100 };
    }

    case '5A': {
      const delaySec = reading.commDelaySec ?? value * 60;
      if (delaySec > 300) return { status: 'RED', subType: 'A2', reason: 'One-way comm delay > 5 min (A2 Autonomous)', thresholdScore: 0 };
      if (delaySec >= 5) return { status: 'YELLOW', subType: 'A1', reason: 'One-way comm delay 5 s - 5 min (A1 Delayed)', thresholdScore: 65 };
      return { status: 'GREEN', subType: 'A0', reason: null, thresholdScore: 100 };
    }

    case '5B': {
      if (reading.criticalItemDepleted || value < 50) {
        return { status: 'RED', subType: 'DEPLETED', reason: `Medical kit stock critical (${value}%)`, thresholdScore: 25 };
      }
      if (value < 70) {
        return { status: 'YELLOW', subType: 'LOW', reason: `Medical kit stock low (${value}%)`, thresholdScore: 62 };
      }
      return { status: 'GREEN', subType: 'NOMINAL', reason: null, thresholdScore: 95 };
    }

    default:
      return { status: 'GREEN', subType: null, reason: null, thresholdScore: null };
  }
}
