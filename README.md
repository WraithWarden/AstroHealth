# AstroHealth: Autonomous Astronaut Health Monitor

**Autonomous Clinical Decision Support System for Deep-Space Exploration (ISS LEO · Lunar Artemis · Mars Transit)**

---

## 1. What It Is

**AstroHealth** is an offline-first, in-browser clinical decision support dashboard designed for astronauts and Crew Medical Officers (CMOs) operating across three spaceflight regimes:

1. **ISS Low Earth Orbit (`A0` Real-Time, ~0 s delay):** Continuous ground telemedicine support.
2. **Lunar Surface — Artemis Base Camp (`A0/A1` Near-Real-Time, ~1.3 s delay):** Early warning drift and radiation monitoring.
3. **Mars Transit (`A2` Autonomous Triage, 18 min one-way delay):** Earth-independent CMO triage mode with an offline 4-step clinical protocol, action completion tracking, and downloadable ground-downlink report packets (`.json` and `.txt`).

The system monitors **18 physiological, behavioral, environmental, and operational indicators** mapped across **5 NASA Human Research Program (HRP) Spaceflight Hazards** and **6 anatomical health nodes** (`Brain`, `Eyes`, `Heart`, `Lungs`, `Core`, `Skeletal`).

---

## 2. How to Run It

### Prerequisites
- **Node.js** `>= 18.x` and **npm**

### Local Development
```bash
# 1. Install dependencies
npm install

# 2. Start the local development server
npm run dev

# 3. Run the automated Vitest test suite
npm test

# 4. Build for production deployment
npm run build
```

### Optional AI Protocol Assistant

The protocol assistant uses Gemini on the server side. In local development, the Vite server handles `/api/ask`; on Vercel, `api/ask.js` handles the same endpoint.

1. Copy `.env.example` to `.env.local` and set `GEMINI_API_KEY` from [Google AI Studio](https://aistudio.google.com/apikey). Keep this key private and out of source control.
2. Restart `npm run dev`, then use **Ask AstroHealth AI** in the guidance panel.
3. Before deploying to Vercel, add `GEMINI_API_KEY` in the project's Environment Variables and redeploy. `GEMINI_MODEL` is optional and defaults to `gemini-3.5-flash-lite`.

The question is sent to Google Gemini together with matching protocol records. The app does not automatically send astronaut profiles, check-in readings, or dashboard state. Do not enter real names or personal/crew health information in questions. AI responses are educational demo guidance, not diagnosis or medical advice; verify sources in the protocol guide.

---

## 3. Data Sources & Standards

AstroHealth grounds its baselines, thresholds, and clinical guidance in publicly available NASA standards and spaceflight medical literature:

- **[NASA-STD-3001](https://www.nasa.gov/ochmo/health-and-medical-standards/)** (*Spaceflight Human-System Standard, Volumes 1 & 2*): Cabin $\text{ppCO}_2$, $\text{SpO}_2$, radiation career limits, sleep/circadian standards, and Levels of Care (`[S]`).
- **[NASA Human Research Program (HRP) — 5 Hazards of Human Spaceflight](https://www.nasa.gov/hrp/5-hazards-of-human-spaceflight/)**: Altered gravity (SANS / ONSD, bone mineral turnover), radiation, isolation/confinement (PVT-lite, sleep, mood/HRV), hostile closed environments, and distance from Earth (`[L]`).
- **[NASA Open Science Data Repository (OSDR) RadLab](https://visualization.osdr.nasa.gov/radlab/gui/overview/)**: ISS *Destiny* US Laboratory radiation dosimetry reference (`scripts/radlab-daily.mjs` and `export.csv`).
- **Standard Terrestrial Clinical Cutoffs (`[C]`):** ACC/AHA blood pressure, ADA fasting glucose, fever/hypothermia, and leukopenia/leukocytosis bounds.

### NASA OSDR RadLab Telemetry & Fallback Disclosure
During Phase 1 verification, ISS US Lab telemetry was sampled from NASA OSDR RadLab (`export.csv`). Because the exported TEPC/REM column reports **absorbed dose** ($\mu\text{Gy}$), and converting absorbed dose ($\text{Gy}$) to **dose equivalent** ($\text{Sv}$) requires the linear energy transfer (LET) quality factor ($Q$), the app follows the clinical blueprint rule:
- Raw absorbed dose is **not** converted without $Q$.
- The app runs 100% offline in-browser and uses the calibrated ISS reference baseline of **$0.48\text{ mSv/day}$** (`history7d: [0.48, 0.47, 0.49, 0.48, 0.47, 0.48, 0.48]`).
- For verified hourly dose-equivalent feeds ($\mu\text{Sv/h}$), the pipeline conversion is $\text{mSv/day} = (\mu\text{Sv/h} \times 24) / 1000$.

---

## 4. How the Status Engine Works

The pure-JavaScript rules engine (`src/engine/evaluate.js`) evaluates all 18 indicators through a deterministic **4-stage pipeline**:

1. **Stage 1 — Absolute Thresholds & Red-Flag Symptoms (`thresholds.js`):**
   - Evaluates Yellow/Red clinical cutoffs (including bidirectional bounds for BP, HR, Body Temp, WBC, and Fasting Glucose).
   - Evaluates **7 acute red-flag symptoms** (`Headache`, `Blurred vision`, `Dizziness or fainting`, `Chest pain`, `Nausea`, `Confusion`, `Low mood or thoughts of self-harm`). Any active red-flag symptom escalates linked indicators to `RED` and caps the overall mission status at `CRITICAL` ($\le 49$).
2. **Stage 2 — Directional Personal Space Drift (`drift.js`):**
   - Computes personalized deviation from the astronaut's spaceflight adapted baseline:
     $$z = \frac{\text{value} - \mu_{\text{space}}}{\max(\sigma_{\text{space}}, \sigma_{\min})}$$
   - Evaluated strictly in the clinically unfavorable direction (`< 2.0 SD` Green, `2.0–2.99 SD` Yellow, `>= 3.0 SD` Red).
3. **Stage 3 — Consecutive Worsening Trend (`trend.js`):**
   - Upgrades a `GREEN` indicator to `YELLOW` (`trending: true`) if the last 3 intervals (`d[4] -> d[5] -> d[6]`) worsen monotonically by a cumulative $\ge 1.0\text{ SD}$.
4. **Stage 4 — Scoring, Autonomy Triage & Cadence (`scoring.js`, `autonomy.js`, `cadence.js`):**
   - Interpolates `0–100` scores per indicator, aggregates by sub-card (`1A..5B`), hazard (`H1..H5`), and anatomical node (`worstStatus`), applies the `A2` autonomy penalty (`-5` pts when comm delay $> 5\text{ min}$ and any physiological metric is non-green), and enforces the Red-Floor cap ($\le 49$).
   - Compares each indicator's `lastMeasuredDaysAgo` against `cadence.routineIntervalDays` (`1`, `3`, or `7` days) to drive `DUE NOW` / `OVERDUE` badges and the `Mission Readiness` status.

---

## 5. Limitations & Medical Disclaimer

- **Decision support, not a medical device:** AstroHealth is an educational and hackathon prototype decision-support tool and is **not** a certified medical device or diagnostic instrument.
- **Simulated demo data:** All crew profiles (`AST-001` ISS, `AST-002` Lunar, `AST-003` Mars) and 7-day histories in `src/data/presets.json` are synthetic demonstration datasets.
- **Heuristic thresholds (`[H]`):** Thresholds and scoring rules tagged `[H]` (such as composite weighting, autonomy penalties, and 3-day trend rules) are operational triage heuristics for demonstration rather than formal NASA flight rules.
- **Prototype interactive tools:** The ONSD two-click ultrasound caliper (`OnsdCaliperModal.jsx`) and PVT-Lite reaction test (`PvtTest.jsx`) are interactive UI prototypes.

---

## 6. Team & Architecture

- **Person 1 — Clinical Rules Engine & Autonomous Operations:** 4-stage evaluation pipeline (`src/engine/`), `addReading()`, `AutonomyChip`, cadence due-now engine (`cadence.js`), Mars `A2` CMO offline checklist (`MarsTriageModal.jsx`), downloadable report packets (`reportPacket.js`), ONSD 2-click caliper (`OnsdCaliperModal.jsx`), and `docs/CONTRACT.md`.
- **Person 2 — Mission Control Dashboard & Visual Analytics:** 3-column responsive layout (`src/App.jsx`), overall health `<Gauge />`, anatomical `<BodyMap />`, Recharts 7-day trend vs. Earth/Space baseline `<Chart />`, `<HazardBars />`, and localStorage persistence.
- **Person 3 — Check-In Flow, Clinical Content & Guidance:** 18-indicator clinical protocol records (`src/data/hazard1..5.json`), `<CheckInHost />`, `<CheckInModal />`, `<GuidancePanel />`, `<InstructionDrawer />`, and `src/flow/submitCheckIn.js`.
