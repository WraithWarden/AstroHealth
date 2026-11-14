# AstroHealth Engine Data Contract (`docs/CONTRACT.md`)

All UI components in `src/components` consume **only** the plain-JavaScript output of `evaluate(input)` from `src/engine`. No React code or raw clinical threshold logic belongs inside UI components.

---

## Architecture & Enums Summary

- **Triage Status (`status`):**
  - `"NOMINAL"` (Green, score `80–100`)
  - `"WARNING"` (Yellow, score `50–79`)
  - `"CRITICAL"` (Red, score `0–49`)
- **Autonomy Level (`autonomy.level`):**
  - `"A0"`: Real-Time Telemedicine (`commDelaySec < 5`, ~0 s)
  - `"A1"`: Delayed Operations (`5 <= commDelaySec <= 300`, e.g., Lunar ~1.3 s to 5 min)
  - `"A2"`: Earth-Independent Autonomous Triage / Level of Care V (`commDelaySec > 300`, Mars ~18 min one-way)
- **5 NASA Spaceflight Hazards:**
  - `H1`: Altered Gravity Fields (Card 1A: Hemodynamics; Card 1B: Neuro-Ocular SANS & Skeletal)
  - `H2`: Space Radiation & Immune Dysregulation (Card 2A: Radiation; Card 2B: Hostile Closed Immune/Thermoregulation)
  - `H3`: Isolation & Confinement (Card 3A: Sleep & PVT; Card 3B: Autonomic & Mood Stress)
  - `H4`: Distance from Earth / Hostile Environment (Card 4A: Respiratory Gas; Card 4B: Metabolic & Integumentary)
  - `H5`: Autonomous Operations / Context (Card 5A: Telecommunication Latency; Card 5B: Medical Consumables Buffer)

---

## 4-Stage Clinical Decision Pipeline

1. **Stage 1: Absolute Thresholds & Symptom Red Flags**
   - Evaluates numeric Yellow/Red boundaries per indicator.
   - 7 Acute Red-Flag Symptoms: `blurredVision`, `persistentHeadache`, `dizzinessSyncope`, `chestPain`, `confusion`, `nausea`, `selfHarmIdeation`.
   - Any active red-flag symptom escalates linked indicators and caps overall status at `"CRITICAL"` (`score <= 49`).
   - Special rules:
     - `1A-ii` (Resting HR): Red if `> 100 bpm` sustained across 2 readings 10 min apart, `< 40 bpm`, or symptomatic.
     - `3A-i` (Sleep): Red if `< 4.5 h` for `>= 2` consecutive nights or `z <= -3.0`.
     - `4B-i` (Fasting Glucose): Splits Red into `"HYPERGLYCEMIC"` (`>= 126 mg/dL`) vs. `"HYPOGLYCEMIC"` (`< 70 mg/dL`).

2. **Stage 2: Directional Personal Space Drift (z-score)**
   - Computes:
     $$z = \frac{\text{current} - \mu_{\text{space}}}{\max(\sigma_{\text{space}}, \sigma_{\min})}$$
   - Evaluated strictly in unfavorable direction:
     - `HIGH`: Yellow if $z \ge +2.0$, Red if $z \ge +3.0$.
     - `LOW`: Yellow if $z \le -2.0$, Red if $z \le -3.0$.
     - `BOTH`: Yellow if $|z| \ge 2.0$, Red if $|z| \ge 3.0$.

3. **Stage 3: Consecutive Worsening Trend Rule**
   - Applies to indicators remaining `"NOMINAL"` (Green) after Stages 1 & 2.
   - If the last 3 day-over-day intervals ($t_{-3} \to t_{-2} \to t_{-1} \to t_0$) moved monotonically in the unfavorable direction AND net excursion $\ge 1.0 \times \sigma_{\text{space}}$, status elevates to `"WARNING"` with `trending: true`.

4. **Stage 4: Linear Score Interpolation, Red-Floor Capping & Autonomy Penalty**
   - **Band mapping:** Green $|z| \in [0, 2) \to 100..80$, Yellow $|z| \in [2, 3) \to 79..50$, Red $|z| \in [3, 5] \to 49..0$. (Takes lower of threshold vs drift score).
   - **Card Score:** $\min(\text{constituent measurement scores})$.
   - **Hazard Score ($H_1..H_4$):** $\text{mean}(\text{card}_1, \text{card}_2)$.
     - *Red-Floor Capping Rule:* If either card in a hazard is Red, parent hazard score is capped at $\le 49$ (`cappedByRedFloor: true`).
   - **Overall Score:**
     $$\text{Overall Score} = \text{clamp}_{[0, 100]}\left(\frac{H_1 + H_2 + H_3 + H_4}{4} - \text{AutonomyPenalty}\right)$$
     where $\text{AutonomyPenalty} = 10$ if $\text{Autonomy Level} = \text{A2}$ AND $\ge 1$ indicator is Red, else $0$.

---

## 1. Engine Input (`evaluate(input)`)

`evaluate(input)` receives an object with `profile`, `symptoms`, and all 18 `readings`:

```json
{
  "profile": {
    "id": "AST-003",
    "name": "Cmdr. Elena Vance",
    "role": "Commander / Crew Medical Officer",
    "missionType": "Mars Transit (0g Deep Space)",
    "regime": "MARS",
    "gravityG": 0,
    "missionDay": 240,
    "missionTotalDays": 540,
    "timestampUtc": "2026-11-14T08:00:00Z",
    "sex": "F",
    "age": 39,
    "heightCm": 172,
    "weightKg": 66,
    "allergies": ["Penicillin"],
    "careerPreFlightDoseMsv": 120
  },
  "symptoms": {
    "blurredVision": false,
    "persistentHeadache": false,
    "dizzinessSyncope": false,
    "chestPain": false,
    "confusion": false,
    "nausea": false,
    "selfHarmIdeation": false
  },
  "readings": {
    "1A-i": { "value": 118, "secondaryValue": 76, "history7d": [112, 113, 111, 112, 114, 116, 118], "historySecondary7d": [71, 71, 70, 71, 73, 74, 76], "lastMeasuredDaysAgo": 0 },
    "1A-ii": { "value": 66, "sustainedHighReadings": 0, "history7d": [62, 61, 63, 62, 63, 65, 66], "lastMeasuredDaysAgo": 0 },
    "1B-i": { "value": 5.90, "history7d": [5.25, 5.22, 5.28, 5.25, 5.47, 5.68, 5.90], "lastMeasuredDaysAgo": 0 },
    "1B-ii": { "value": 285, "history7d": [230, 226, 234, 230, 248, 267, 285], "lastMeasuredDaysAgo": 0 },
    "2A-i": { "value": 6.20, "hourlySpikeMultiple": 4.0, "history7d": [1.55, 1.50, 1.60, 1.55, 3.10, 4.65, 6.20], "lastMeasuredDaysAgo": 0 },
    "2A-ii": { "value": 515, "singleSpeDoseMsv": 12, "history7d": [501.0, 502.5, 504.1, 505.6, 508.7, 513.4, 515.0], "lastMeasuredDaysAgo": 0 },
    "2B-i": { "value": 4.0, "history7d": [6.5, 6.6, 6.4, 6.5, 5.7, 4.8, 4.0], "lastMeasuredDaysAgo": 0 },
    "2B-ii": { "value": 37.2, "history7d": [37.1, 37.0, 37.1, 37.1, 37.1, 37.2, 37.2], "lastMeasuredDaysAgo": 0 },
    "3A-i": { "value": 5.4, "consecutiveLowNights": 0, "history7d": [6.4, 6.5, 6.3, 6.4, 6.1, 5.7, 5.4], "lastMeasuredDaysAgo": 0 },
    "3A-ii": { "value": 310, "lapses": 1, "history7d": [260, 256, 264, 260, 277, 293, 310], "lastMeasuredDaysAgo": 0 },
    "3B-i": { "value": 5, "history7d": [3, 3, 3, 3, 4, 4, 5], "lastMeasuredDaysAgo": 0 },
    "3B-ii": { "value": 41, "history7d": [50, 51, 49, 50, 47, 44, 41], "lastMeasuredDaysAgo": 0 },
    "4A-i": { "value": 97, "history7d": [98, 97, 98, 97, 97, 97, 97], "lastMeasuredDaysAgo": 0 },
    "4A-ii": { "value": 2.6, "history7d": [2.3, 2.2, 2.4, 2.3, 2.4, 2.5, 2.6], "lastMeasuredDaysAgo": 0 },
    "4B-i": { "value": 99, "history7d": [90, 88, 92, 90, 93, 96, 99], "lastMeasuredDaysAgo": 0 },
    "4B-ii": { "value": 0, "history7d": [0, 0, 0, 0, 0, 0, 0], "lastMeasuredDaysAgo": 0 },
    "5A": { "value": 18, "commDelaySec": 1080, "history7d": [17.1, 17.3, 17.4, 17.6, 17.7, 17.9, 18.0], "lastMeasuredDaysAgo": 0 },
    "5B": { "value": 62, "criticalItemDepleted": false, "history7d": [68, 67, 66, 65, 64, 63, 62], "lastMeasuredDaysAgo": 0 }
  }
}
```

---

## 2. Engine Output Structure

`evaluate(input)` returns a single deterministic object containing:

```json
{
  "profile": {
    "id": "AST-003",
    "name": "Cmdr. Elena Vance",
    "role": "Commander / Crew Medical Officer",
    "missionType": "Mars Transit (0g Deep Space)",
    "regime": "MARS"
  },
  "overall": 51,
  "badge": "CRITICAL",
  "autonomy": "A2",
  "overallDetails": {
    "score": 51,
    "rawAverage": 61,
    "autonomyPenalty": 10,
    "status": "CRITICAL",
    "triageMode": "EARTH_INDEPENDENT_A2",
    "redCount": 3,
    "yellowCount": 7,
    "streakDays": 14,
    "activeRedFlagSymptoms": []
  },
  "autonomyDetails": {
    "level": "A2",
    "levelOfCare": "Level of Care V",
    "commDelayMin": 18,
    "commDelaySec": 1080,
    "medKitStockPct": 62,
    "medKitStatus": "WARNING",
    "bannerAlert": "MARS COMM DELAY (18 MIN ONE-WAY): Earth-Independent Triage Mode (A2 / Level of Care V) Active."
  },
  "hazards": [
    {
      "id": "H1",
      "number": 1,
      "name": "Altered Gravity Fields",
      "score": 49,
      "status": "RED",
      "triageStatus": "CRITICAL",
      "cappedByRedFloor": true,
      "cards": ["1A", "1B"]
    },
    {
      "id": "H2",
      "number": 2,
      "name": "Space Radiation & Immune",
      "score": 35,
      "status": "RED",
      "triageStatus": "CRITICAL",
      "cappedByRedFloor": true,
      "cards": ["2A", "2B"]
    },
    {
      "id": "H3",
      "number": 3,
      "name": "Isolation & Confinement",
      "score": 68,
      "status": "YELLOW",
      "triageStatus": "WARNING",
      "cappedByRedFloor": false,
      "cards": ["3A", "3B"]
    },
    {
      "id": "H4",
      "number": 4,
      "name": "Hostile Closed Environment",
      "score": 92,
      "status": "GREEN",
      "triageStatus": "NOMINAL",
      "cappedByRedFloor": false,
      "cards": ["4A", "4B"]
    }
  ],
  "nodes": {
    "brain": "YELLOW",
    "eyes": "RED",
    "heart": "GREEN",
    "lungs": "GREEN",
    "bones": "YELLOW",
    "whole": "RED"
  },
  "cards": [
    {
      "id": "1A",
      "hazardId": "H1",
      "title": "Cardiovascular & Hemodynamics",
      "score": 85,
      "status": "GREEN",
      "measurementIds": ["1A-i", "1A-ii"]
    },
    {
      "id": "1B",
      "hazardId": "H1",
      "title": "Neuro-Ocular (SANS) & Skeletal Calcium",
      "score": 16,
      "status": "RED",
      "measurementIds": ["1B-i", "1B-ii"],
      "summary": "ONSD reached 5.90 mm (z=+4.33, Red) and 24-h urine calcium elevated at 285 mg/day (z=+2.75, Yellow).",
      "actions": [
        { "id": "act-1b-1", "label": "Don Lower Body Negative Pressure (LBNP) suit for 45 min per CMO checklist", "checked": false }
      ]
    }
  ],
  "measurements": {
    "1B-i": {
      "id": "1B-i",
      "cardId": "1B",
      "hazardId": "H1",
      "node": "eyes",
      "name": "Optic Nerve Sheath Diameter (ONSD)",
      "unit": "mm",
      "value": 5.90,
      "status": "RED",
      "zScore": 4.33,
      "score": 16,
      "history": [5.25, 5.22, 5.28, 5.25, 5.47, 5.68, 5.90],
      "baseline": { "mean": 5.25, "sd": 0.15 },
      "earth_normal": 4.6
    }
  }
}
```

---

## 3. Node Mapping Reference

Each measurement links to exactly one anatomical node for the Body Map visualization:

| Node ID | Anatomical Target | Linked Indicators |
| :--- | :--- | :--- |
| `eyes` | Eyes & Neuro-Ocular | `1B-i` (ONSD) |
| `brain` | Central Nervous System | `3A-i` (Sleep), `3A-ii` (PVT), `3B-i` (Mood/Stress), `3B-ii` (HRV RMSSD) |
| `heart` | Heart & Vascular Tree | `1A-i` (Blood Pressure), `1A-ii` (Resting Heart Rate) |
| `lungs` | Respiratory & Gas Exchange | `4A-i` (SpO₂), `4A-ii` (Cabin ppCO₂) |
| `bones` | Skeletal & Calcium Turnover | `1B-ii` (24-h Urine Calcium) |
| `whole` | Systemic / Immune / Radiation | `2A-i` (Daily Dose), `2A-ii` (Career Dose), `2B-i` (WBC), `2B-ii` (Body Temp), `4B-i` (Glucose), `4B-ii` (Skin) |

Each node's status equals the worst status among its assigned measurements:
$$\text{node.status} = \max(\text{status of constituent measurements})$$

---

## 4. UI Compatibility Guarantee

To support existing UI components without regressions:
- `data.overall`: Numeric score `0–100` consumed by `<Gauge score={overall} />`.
- `data.badge`: String `"NOMINAL" | "WARNING" | "CRITICAL"` consumed by `<Badge status={badge} />` and `<Gauge status={badge} />`.
- `data.autonomy`: String `"A0" | "A1" | "A2"` consumed by `<HazardBars autonomy={autonomy} delaySeconds={data.delay_seconds} />` and `<AutonomyChip />`.
- `data.delay_seconds`: Numeric one-way comm delay in seconds (`< 5` = `A0 Real-time`, `5..300` = `A1 Delayed`, `> 300` = `A2 Autonomous`).
- `data.hazards`: Array of hazard objects `{ id, name, score, status }` consumed by `<HazardBars hazards={hazards} />`.
- `data.nodes`: Object with keys `brain`, `eyes`, `heart`, `lungs`, `bones`, `whole` mapping to `"GREEN" | "YELLOW" | "RED"`.
- `data.measurements`: Dictionary of measurements containing `value`, `unit`, `status`, `node`, `history`, `baseline`, `earth_normal`, `cadenceStatus` (`"CURRENT" | "DUE_NOW" | "OVERDUE"`), `cadenceIntervalDays`, and `lastMeasuredDaysAgo` consumed by `<Chart />`, measurement badges, and the Guidance Drawer.
- `data.dueSummary`: `{ dueCount, overdueCount, dueIds, overdueIds, allLogged }` driving the Readiness strip due banner and "Mission Readiness" badge.
- `data.overallDetails.streakDays`: Consecutive mission days logged (incremented on each `addReading` call).

---

## 5. How to Call the Engine

```javascript
import { evaluate, addReading } from '../engine/index.js';

// 1. Evaluate a built-in mission preset ('iss' | 'lunar' | 'mars')
const marsResult = evaluate('mars');

// 2. Log a daily check-in (advances missionDay and streakDays by +1, keeps last 7 days)
//    Accepts indicator IDs ('4A-i', '1B-i', ...) or form keys (sleep, hr, spo2, onsd, mood, glucose)
const nextState = addReading('iss', {
  '4A-i': 90,          // or { spo2: 90, sleep: 5.2 }
  symptoms: { blurredVision: false },
});

// 3. Re-evaluate the updated mission state to refresh all UI components
const updatedResult = evaluate(nextState);
```
