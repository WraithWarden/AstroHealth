# AstroHealth: Autonomous Astronaut Health Monitor

NASA Space Apps Challenge / HRP Autonomous Medical Decision Support System.

Autonomous clinical decision support tool designed for deep-space exploration and exploration analog missions (ISS LEO, Lunar Surface Artemis Base Camp, and Mars Transit). Operates 100% offline in-browser without external live server dependencies or medical data transmission requirements.

---

## NASA OSDR RadLab Telemetry & Fallback Disclosure

### RadLab Export & Unit Analysis
As part of Phase 1 Person 3 verification, telemetry from NASA Open Science Data Repository (OSDR) RadLab was sampled for the ISS US Lab radiation environment (`scripts/radlab-daily.mjs` and `export.csv`):

- **Data Source:** NASA OSDR RadLab (`https://visualization.osdr.nasa.gov/radlab/api`)
- **Spacecraft & Location:** International Space Station (ISS), US Laboratory (*Destiny*)
- **Instrument Telemetry:** Tissue Equivalent Proportional Counter (TEPC) / Radiation Environment Monitor (Timepix REM)
- **Extracted Column:** `absorbed_dose_rate`
- **Unit Finding:** The telemetry provides **absorbed dose** ($\mu\text{Gy/h}$), rather than **dose equivalent** ($\mu\text{Sv/h}$).

### Blueprint Rule & Fallback Implementation
In space radiation dosimetry, converting absorbed dose ($\text{Gy}$) to dose equivalent ($\text{Sv}$) requires measuring the particle linear energy transfer (LET) spectrum to determine radiation quality factors ($Q$). Per Section 2 of the clinical blueprint and sprint guidelines:
> *If the RadLab export contains absorbed dose and not dose equivalent, do not convert it. State so in the README and maintain the simulated baseline values for the ISS preset.*

Consequently:
- The app operates **locally and never contacts RadLab in real-time**.
- The ISS preset in `src/data/presets.json` uses the calibrated reference baseline of **$0.48\text{ mSv/day}$** (`history7d: [0.48, 0.47, 0.49, 0.48, 0.47, 0.48, 0.48]`).
- For datasets providing verified hourly dose equivalent ($\mu\text{Sv/h}$), the conversion formula implemented in the pipeline is:
  $$\text{mSv/day} = \frac{\mu\text{Sv/h} \times 24}{1000}$$

---

## Clinical Architecture

- **Stage 1 (Clinical Cutoffs):** Evaluates absolute physiological limits and 7 acute red-flag symptom overrides.
- **Stage 2 (Directional Drift):** Computes personalized $z$-score deviation from mission baseline.
- **Stage 3 (Consecutive Trend):** 3-day monotonic worsening detection.
- **Stage 4 (Autonomy Triage):** Comm latency penalty ($A_0$ real-time to $A_2$ autonomous triage mode).

---

## Disclaimer
> **Notice:** Autonomous Decision Support System. Decision support only, not a certified medical device. Demo data is simulated.
