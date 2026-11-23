# AstroHealth — Autonomous Astronaut Health Monitor

> **Offline-first clinical decision support for ISS, Lunar Artemis, and Mars transit missions.**
> Built on NASA-STD-3001, NASA HRP spaceflight hazard frameworks, and NASA OSDR radiation telemetry.


![License](https://img.shields.io/badge/license-MIT-blue)
![Data](https://img.shields.io/badge/data-NASA%20OSDR%20%7C%20NASA--STD--3001-blue)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Quick Start](#2-quick-start)
3. [Architecture](#3-architecture)
4. [Clinical Rules Engine](#4-clinical-rules-engine)
5. [Data Sources & Standards](#5-data-sources--standards)
6. [Limitations & Medical Disclaimer](#6-limitations--medical-disclaimer)

---

## 1. Overview

**AstroHealth** is a browser-based, backend clinical decision-support dashboard for astronauts and Crew Medical Officers (CMOs) across three spaceflight autonomy regimes:

| Regime | Comm Delay | Autonomy Level | Key Capability |
|--------|-----------|----------------|----------------|
| **ISS Low Earth Orbit** | ~0 s | A0 — Real-Time | Continuous ground telemedicine support |
| **Lunar Surface (Artemis)** | ~1.3 s | A0/A1 — Near-Real-Time | Early-warning drift & radiation monitoring |
| **Mars Transit** | 4–22 min | A2 — Autonomous | Earth-independent CMO triage, offline 4-step protocol, downloadable report packets |

The system monitors **18 physiological, behavioral, environmental, and operational indicators** mapped across:
- **5 NASA HRP Spaceflight Hazards** (Altered Gravity · Radiation · Isolation/Confinement · Hostile Closed Environment · Distance from Earth)
- **6 anatomical health nodes** (Brain · Eyes · Heart · Lungs · Core · Skeletal)

All thresholds, baselines, and clinical protocol records are **bundled offline** — no network requests at runtime beyond optional AI and Google Fonts.

---

## 2. Quick Start

### Prerequisites

- **Node.js** `>= 18.x` and **npm**

### Install & Run

```bash
# Clone the repository
git clone https://github.com/Deadpoets888/astro-health-monitor.git
cd astro-health-monitor

# Install dependencies
npm install

# Start the local development server (http://localhost:5173)
npm run dev

# Run the full test suite (Vitest — 20 tests)
npm test

# Build for production
npm run build
```

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `C` | Open check-in flow (PVT → check-in form) |
| `1` | Switch to ISS preset |
| `2` | Switch to Lunar preset |
| `3` | Switch to Mars preset |
| `Esc` | Close any open modal |

---

## 3. Architecture

```
astro-health-monitor/
├── src/
│   ├── engine/               # Person 1 — Pure JS rules engine (no React)
│   │   ├── evaluate.js       #   4-stage pipeline: thresholds → drift → trend → scoring
│   │   ├── thresholds.js     #   Yellow/Red clinical cutoffs (bundled offline)
│   │   ├── drift.js          #   Personalised space-baseline z-score drift
│   │   ├── trend.js          #   Monotonic 3-day worsening detection
│   │   ├── scoring.js        #   0–100 weighted composite scoring
│   │   ├── autonomy.js       #   A0/A1/A2 autonomy level & A2 penalty
│   │   ├── cadence.js        #   DUE NOW / OVERDUE badge logic
│   │   └── evaluate.test.js  #   14 engine unit tests
│   │
│   ├── flow/                 # Person 3 — Check-in submit pipeline
│   │   ├── submitCheckIn.js  #   form + PVT + symptoms → addReading → evaluate
│   │   └── submitCheckIn.test.js  # 6 flow unit tests
│   │
│   ├── data/                 # Offline clinical content (bundled, no live fetch)
│   │   ├── hazard1..5.json   #   18 indicator protocol records (actions, why, steps)
│   │   ├── presets.json      #   Seed readings: ISS (AST-001), Lunar (AST-002), Mars (AST-003)
│   │   └── profiles.json     #   Crew demographic profiles
│   │
│   ├── components/           # React UI components
│   │   ├── CheckInHost.jsx   #   Person 3 — Self-contained check-in orchestrator
│   │   ├── CheckInModal.jsx  #   Person 3 — Readings form with symptom flags
│   │   ├── GuidancePanel.jsx #   Person 3 — Contextual action panel per selected measurement
│   │   ├── InstructionDrawer.jsx # Person 3 — How-to / Why two-tab protocol drawer
│   │   ├── Gauge.jsx         #   Person 2 — Circular overall health score
│   │   ├── BodyMap.jsx       #   Person 2 — Clickable anatomical SVG nodes
│   │   ├── Chart.jsx         #   Person 2 — 7-day trend vs. Earth/Space baseline
│   │   ├── HazardBars.jsx    #   Person 2 — 5-hazard status bar strip
│   │   ├── PvtTest.jsx       #   Person 1 — PVT-Lite reaction time test
│   │   └── AutonomyChip.jsx  #   Person 1 — A0/A1/A2 level chip
│   │
│   ├── App.jsx               # Person 2 — 3-column dashboard layout & state
│   └── index.css             # NASA HUD design system (Orbitron · Space Mono · Inter)
│
├── scripts/
│   └── radlab-daily.mjs      # NASA OSDR RadLab CSV → 7-day daily averages
├── export.csv                # ISS TEPC absorbed dose sample (NASA OSDR RadLab, Sep–Nov 2014)
└── docs/CONTRACT.md          # Engine API contract between team members
```

### Data Flow

```
presets.json (seed)                 User check-in (CheckInHost)
       │                                    │
       ▼                                    ▼
  addReading(state, reading)  ◄─────────────┘
       │
       ▼
  evaluate(newState)   ←── thresholds.js / drift.js / trend.js / scoring.js
       │
       ├──► overall score + badge (Gauge, Badge)
       ├──► per-hazard status (HazardBars)
       ├──► per-node status (BodyMap)
       ├──► per-measurement status + 7d history (Chart, GuidancePanel)
       └──► autonomy level + cadence flags (AutonomyChip)
```

---

## 4. Clinical Rules Engine

The pure-JavaScript engine (`src/engine/evaluate.js`) runs a deterministic **4-stage pipeline** on every state change:

### Stage 1 — Absolute Thresholds & Red-Flag Symptoms
- Evaluates Yellow/Red clinical cutoffs against `thresholds.js` (bundled offline), including bidirectional bounds for Blood Pressure, Heart Rate, Body Temperature, WBC, and Fasting Glucose.
- Flags **7 acute red-flag symptoms**: Headache · Blurred vision · Dizziness or fainting · Chest pain · Nausea · Confusion · Low mood or thoughts of self-harm.
- Any active red-flag symptom escalates linked indicators to `RED` and hard-caps the overall score at **≤ 49 (CRITICAL)**.

### Stage 2 — Personalised Space-Baseline Drift

$$z = \frac{\text{value} - \mu_{\text{space}}}{\max(\sigma_{\text{space}},\ \sigma_{\min})}$$

Deviation evaluated strictly in the clinically unfavourable direction:

| z-score | Status |
|---------|--------|
| < 2.0 SD | 🟢 GREEN |
| 2.0 – 2.99 SD | 🟡 YELLOW |
| ≥ 3.0 SD | 🔴 RED |

### Stage 3 — Consecutive Worsening Trend
Upgrades a GREEN indicator to YELLOW (`trending: true`) when the last 3 intervals worsen monotonically by a cumulative **≥ 1.0 SD**.

### Stage 4 — Scoring, Autonomy & Cadence
- Interpolates **0–100** scores per indicator, aggregated by sub-card (`1A`..`5B`), hazard (`H1`..`H5`), and anatomical node.
- Applies the **A2 autonomy penalty** (−5 pts when comm delay > 5 min and any physiological metric is non-green).
- Compares `lastMeasuredDaysAgo` against `cadence.routineIntervalDays` (1, 3, or 7 days) to drive `DUE NOW` / `OVERDUE` badges.

---

## 5. Data Sources & Standards

All numeric cutoffs, baselines, and clinical protocol records are **bundled offline** in `thresholds.js`, `presets.json`, and `src/data/hazard1..5.json`. The URLs below are reference sources cited in the UI guidance drawer and dashboard footer.

### Reference Standards

| Tag | Standard / Source | Used For |
|-----|-------------------|----------|
| `[S]` | [NASA-STD-3001 — Spaceflight Human-System Standard](https://www.nasa.gov/ochmo/human-spaceflight-and-aviation-standards/) ([Vol. 1: Crew Health](https://www.nasa.gov/reference/nasa-std-3001v1/) · [Vol. 2: Environmental Health](https://www.nasa.gov/reference/nasa-std-3001v2/)) | Cabin ppCO₂, SpO₂, radiation career limits, sleep/circadian norms, Levels of Care |
| `[L]` | [NASA HRP — Human Research Program Risks](https://www.nasa.gov/hrp/risks/) | SANS/ONSD, bone mineral density, neuro-behavioural risks, isolation/confinement |
| `[C]` | [NIH MedlinePlus — Vital Signs Reference](https://medlineplus.gov/vitalsigns.html) ([Blood Glucose](https://medlineplus.gov/bloodglucose.html)) | Terrestrial clinical cutoffs: BP, HR, Body Temp, SpO₂, Fasting Glucose |
| `[H]` | [NASA OCHMO Technical Briefs](https://www.nasa.gov/ochmo/hsa-standards/ochmo-technical-briefs/) | Operational triage heuristics, composite scoring rules, autonomy penalties |
| `HRP` | [NASA HRP — 5 Hazards of Human Spaceflight](https://www.nasa.gov/hrp/hazards/) | General spaceflight hazard reference (drawer fallback + footer) |

### NASA Radiation Data Sources

| Source | URL | What It Provides |
|--------|-----|-----------------|
| **NASA OSDR Visualization Portal (RadLab / EDA)** | [visualization.osdr.nasa.gov](https://visualization.osdr.nasa.gov/) | Interactive ISS radiation & environmental telemetry portal (hosts RadLab and EDA for TEPC, DosTel instruments) |
| **NASA OSDR RadLab Portal & API Guide** | [osdr-tutorials.readthedocs.io/.../radlab_portal.html](https://osdr-tutorials.readthedocs.io/en/latest/pages/guides/radlab_portal.html) | Documentation and query workflow for the RadLab dosimetry explorer used to export `export.csv` |
| **NASA OSDR Biological Data Repository** | [osdr.nasa.gov/bio/repo](https://osdr.nasa.gov/bio/repo/) | Space biology & radiation-related open science study repository |

**Sampled dataset:** ISS *Destiny* US Lab, instrument `TEPC-SMP327-pre`, Sep 2014 – May 2016 (325 rows, `export.csv`).

**Columns in `export.csv`:**

| Column | Type | Notes |
|--------|------|-------|
| `timestamp` | ISO 8601 date | Daily measurement date |
| `instrument_id` | string | e.g. `TEPC-SMP327-pre`, `IV-TEPC-SMP328-pre` |
| `absorbed_dose_rate` | float (µGy/day) | **Absorbed dose only — not dose equivalent** |
| `instrument_family` | string | `TEPC` |
| `spacecraft` | string | `ISS` |

> **Offline guarantee:** None of these URLs are fetched at runtime. All threshold and baseline values are statically bundled.

---

## 6. Limitations & Medical Disclaimer

> [!CAUTION]
> **AstroHealth is an educational and hackathon prototype. It is not a certified medical device, diagnostic instrument, or flight-qualified software.**

| Limitation | Detail |
|------------|--------|
| **Decision support only** | Outputs are clinical prompts for a trained CMO, not autonomous diagnoses. |
| **Synthetic demo data** | All crew profiles (`AST-001` ISS, `AST-002` Lunar, `AST-003` Mars) and 7-day histories in `presets.json` are demonstration datasets. |
| **Heuristic thresholds `[H]`** | Composite weighting, autonomy penalties, and 3-day trend rules are operational triage heuristics — not formal NASA flight rules. |
| **Prototype UI tools** | The ONSD ultrasound caliper (`OnsdCaliperModal.jsx`) and PVT-Lite reaction test (`PvtTest.jsx`) are interactive UI prototypes. |
| **Radiation unit** | The ISS radiation baseline uses mSv/day (dose equivalent). The NASA OSDR RadLab export provides absorbed dose (µGy) only — see §5. |

---

