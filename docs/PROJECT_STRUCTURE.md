# AstroHealth Monitor - Project Structure and Handoff Guide

## Purpose

AstroHealth Monitor is a browser-based, offline-first prototype for monitoring astronaut health across ISS, Lunar, and Mars mission regimes. It combines synthetic mission readings, NASA-inspired clinical thresholds and protocols, a deterministic JavaScript evaluation engine, a React dashboard, and optional Gemini-powered protocol explanations.

This document is intended as a complete handoff reference for Claude or another coding agent. It describes the repository layout, responsibilities of every source file, state/data flow, public interfaces, commands, conventions, and known implementation boundaries.

> AstroHealth is a decision-support and hackathon prototype, not a certified medical device or flight-qualified system.

---

## Technology Summary

- **Runtime:** Modern browser
- **UI:** React 19 with JSX
- **Build/dev tool:** Vite 8
- **Styling:** Tailwind CSS 4 Vite integration plus custom CSS
- **Charts:** Recharts 3
- **3D:** Three.js
- **Testing:** Vitest 5
- **AI backend:** Gemini-compatible HTTP endpoint through a Vite middleware or serverless `api/ask.js` adapter
- **Persistent browser state:** `localStorage`
- **Primary language:** JavaScript ES modules
- **TypeScript support:** `tsconfig.json` is used for editor/type tooling; application code is mostly `.js`/`.jsx`

---

## Install and Run

```bash
npm install
npm run dev
```

Typical Vite URL: `http://localhost:5173`

```bash
npm test
npm run build
npm run preview
```

Optional AI configuration:

```bash
copy .env.example .env.local
```

Set `GEMINI_API_KEY` in `.env.local` or in the deployment environment. Do not expose secrets with `VITE_*` names.

---

## Complete File Tree

```text
astroHealth-monitor/
|-- .env.example
|-- .gitignore
|-- README.md
|-- PROJECT_STRUCTURE.md
|-- export.csv
|-- index.html
|-- package.json
|-- package-lock.json
|-- tsconfig.json
|-- vite.config.js
|-- api/
|   `-- ask.js
|-- docs/
|   `-- CONTRACT.md
|-- public/
|   |-- favicon.svg
|   `-- icons.svg
|-- scripts/
|   `-- radlab-daily.mjs
`-- src/
    |-- App.jsx
    |-- index.css
    |-- main.jsx
    |-- assets/
    |   |-- astro-ai-logo.svg
    |   |-- body-silhouette.svg
    |   |-- hero.png
    |   |-- nasa-logo.svg
    |   |-- typescript.svg
    |   `-- vite.svg
    |-- components/
    |   |-- AIChat.jsx
    |   |-- Astronaut3D.jsx
    |   |-- AutonomyChip.jsx
    |   |-- Badge.jsx
    |   |-- BodyMap.jsx
    |   |-- Chart.jsx
    |   |-- CheckInHost.jsx
    |   |-- CheckInModal.jsx
    |   |-- Gauge.jsx
    |   |-- GuidancePanel.jsx
    |   |-- HazardBars.jsx
    |   |-- InstructionDrawer.jsx
    |   |-- MarsTriageModal.jsx
    |   |-- OnsdCaliperModal.jsx
    |   |-- PvtTest.jsx
    |   `-- ReadinessStrip.jsx
    |-- data/
    |   |-- TEMPLATE.json
    |   |-- hazard1.json
    |   |-- hazard2.json
    |   |-- hazard3.json
    |   |-- hazard4.json
    |   |-- hazard5.json
    |   |-- indicators.json
    |   |-- presets.json
    |   `-- profiles.json
    |-- engine/
    |   |-- autonomy.js
    |   |-- cadence.js
    |   |-- drift.js
    |   |-- evaluate.js
    |   |-- evaluate.test.js
    |   |-- historyGenerator.js
    |   |-- index.js
    |   |-- indicatorHelpers.js
    |   |-- mock-iss.json
    |   |-- mock-lunar.json
    |   |-- mock-mars.json
    |   |-- scoring.js
    |   |-- thresholds.js
    |   `-- trend.js
    |-- flow/
    |   |-- submitCheckIn.js
    |   `-- submitCheckIn.test.js
    |-- server/
    |   |-- aiHandler.js
    |   `-- aiHandler.test.js
    `-- utils/
        `-- reportPacket.js
```

---

# Top-Level Files

## `.env.example`

Template for optional Gemini AI configuration:

- `GEMINI_API_KEY`: server-side API key
- `GEMINI_MODEL`: Gemini model name

Copy to `.env.local` for local development. It must not contain committed credentials.

## `.gitignore`

Ignores dependencies, build output, local environment files, logs, editor directories, and deployment metadata. `.env.example` is explicitly allowed so the sample configuration remains in git.

## `README.md`

User-facing project overview containing the application purpose, quick start, architecture summary, rules-engine stages, data sources, limitations, and medical disclaimer.

## `PROJECT_STRUCTURE.md`

This repository handoff guide.

## `package.json`

Defines the package and scripts:

- `npm run dev` - starts Vite
- `npm run build` - creates a production build
- `npm run preview` - previews the built application
- `npm test` - runs Vitest once

Core dependencies include React, ReactDOM, Recharts, Three.js, Tailwind, and Vite plugins.

## `package-lock.json`

npm dependency lockfile. Regenerate with npm rather than editing manually.

## `vite.config.js`

Configures React and Tailwind Vite plugins. It also creates a local `/api/ask` middleware in development and delegates requests to `handleAskRequest()` from `src/server/aiHandler.js`.

Loads:

- `process.env.GEMINI_API_KEY`
- `GEMINI_API_KEY` from Vite env loading
- `process.env.GEMINI_MODEL`
- `GEMINI_MODEL` from Vite env loading

## `tsconfig.json`

IDE/tooling configuration for ES2023, ESM, DOM, bundler-style module resolution, and no emitted JS. It includes only `src`. It does not control the Vite build by itself.

## `index.html`

Browser document shell. It declares the root element, loads Google fonts, sets the page title, and imports `src/main.jsx`.

## `export.csv`

NASA OSDR/RadLab-derived radiation data export with ISS TEPC absorbed-dose observations. The script `scripts/radlab-daily.mjs` reads this file and averages a selected numeric column by day. It is demonstration/reference data, not a live API feed.

---

# `api/`

## `api/ask.js`

Serverless/Vercel-style entry point for `POST /api/ask`. Imports `handleAskRequest` and adapts a framework-style `fetch(request)` call. Local Vite development uses the same handler through middleware in `vite.config.js`.

---

# `docs/`

## `docs/CONTRACT.md`

Detailed engine/UI API contract. It describes:

- the 4-stage evaluation pipeline
- autonomy levels
- five hazard and ten sub-card definitions
- engine input and output shapes
- node-to-indicator mappings
- UI compatibility fields
- preset and `addReading` call patterns

Treat this file as the public contract between the engine and React components.

---

# `public/`

## `public/favicon.svg`

Static favicon asset.

## `public/icons.svg`

Static SVG icon sprite/resource file.

---

# `scripts/`

## `scripts/radlab-daily.mjs`

Node utility that:

1. reads a CSV or TSV file
2. detects or accepts a time column
3. detects numeric columns
4. accepts `--value <column>` and optional `--time <column>`
5. computes one average for each day
6. prints the latest 7 daily averages and JSON

It does not mutate the application preset or `export.csv`; results must be copied into relevant demo data manually.

---

# `src/`

## `src/main.jsx`

Browser entry point. Creates the React root, wraps `App` in `StrictMode`, and imports the global stylesheet.

## `src/App.jsx`

Main application state and dashboard composition. It:

- owns the active mission preset
- loads/saves mission state and check-in history in `localStorage`
- evaluates preset or live state
- connects the 3-column dashboard
- switches ISS/Lunar/Mars presets
- tracks selected anatomical node and measurement
- tracks guidance-action completion
- manages PVT, check-in, ONSD, Mars triage, and instruction modals
- builds/downloads report packets
- handles keyboard shortcuts

Main keyboard behavior:

- `C`: toggle check-in modal
- `1`, `2`, `3`: switch ISS, Lunar, Mars
- `Esc`: close active modals

The three mission presets are:

- `iss`
- `lunar`
- `mars`

The saved state key format is `astro_state_<preset>` and history uses `astro_history_<preset>`.

## `src/index.css`

Global visual system and component classes. Implements the dark NASA/HUD look, typography, panel styling, grid/layout behavior, overlays, responsive behavior, animations, and reusable utility classes.

---

# `src/assets/`

## `src/assets/nasa-logo.svg`

NASA-style logo artwork used in the application header.

## `src/assets/astro-ai-logo.svg`

AstroHealth AI logo used in chat/guidance UI.

## `src/assets/body-silhouette.svg`

Base astronaut silhouette for `BodyMap.jsx`.

## `src/assets/hero.png`

Large visual image asset; use is determined by the dashboard/layout code.

## `src/assets/typescript.svg`

TypeScript logo asset retained for starter/template branding or tooling.

## `src/assets/vite.svg`

Vite logo asset retained for starter/template branding or tooling.

---

# `src/data/`

## `src/data/indicators.json`

Canonical metadata for all 18 physiological/operational indicators plus 5A/5B context indicators.

Each indicator includes ID, card/hazard/node, name, unit, drift direction, provenance tags, Earth range, space baseline, thresholds, cadence, and node assignment. This is the primary engine data source.

## `src/data/presets.json`

Seed state for ISS, Lunar, and Mars:

- crew profile
- symptoms
- 7-day readings
- current mission day
- communication and kit values

Lowercase mission keys are mapped to the engine's three profiles.

## `src/data/profiles.json`

Additional profile display metadata used by the dashboard for mission labels and crew identity.

## `src/data/hazard1.json` through `hazard5.json`

Protocol record arrays for the five health-hazard areas. Each record contains:

- indicator ID and name
- anatomical node
- Earth range
- space baseline
- direction and thresholds
- equipment
- measurement procedure
- mistakes
- escalation guidance
- rationale
- benefits
- yellow/red actions
- source tags

These arrays power the guidance panel, instruction drawer, and local AI protocol retrieval.

## `src/data/TEMPLATE.json`

Example/schema-like JSON record showing the expected structure for a measurement/protocol record.

---

# `src/components/`

## `AIChat.jsx`

Chat interface for protocol questions. Sends `{ question, recordId, history }` to `/api/ask`, renders answers and source metadata, and handles provider/configuration errors.

It is only for protocol explanation. It must not replace the clinical rules engine or diagnose.

## `Astronaut3D.jsx`

Three.js-based astronaut visualization. Builds and manages the 3D scene and exposes/selects node projection anchors. It provides a fallback if WebGL/3D initialization fails.

## `AutonomyChip.jsx`

Small badge that resolves and formats communication-delay autonomy:

- `A0`: less than 5 seconds
- `A1`: 5 to 300 seconds
- `A2`: more than 300 seconds

Exports `resolveAutonomyLevel()` and `formatCommDelay()` for tests and reuse.

## `Badge.jsx`

Reusable triage badge. Displays status such as NOMINAL, WARNING, or CRITICAL with matching visual styling.

## `BodyMap.jsx`

Anatomical node visualization built around a body silhouette and optional 3D astronaut scene. Receives node statuses, selected node, and indicator counts. Selecting a node updates `App`.

## `Chart.jsx`

Recharts 7-day trend chart for the selected measurement. It shows the measurement history, Earth normal, space baseline, and status context.

## `CheckInHost.jsx`

Orchestrates check-in submission and PVT state:

- provides `useCheckIn`
- opens check-in and PVT modals
- calls `submitCheckIn`
- passes updated engine state/results back to `App`
- renders the red/symptom banner

## `CheckInModal.jsx`

Daily check-in form. Fields include BP, heart rate, SpO₂, temperature, sleep, mood/stress, glucose, optional ONSD, PVT, radiation, and CO₂ context supplied by the host. It validates ranges and accepts acute symptom flags.

## `Gauge.jsx`

Circular overall health score gauge using the engine score and badge.

## `HazardBars.jsx`

Displays the H1-H4 hazard scores, statuses, and autonomy context. It includes `AutonomyChip`.

## `GuidancePanel.jsx`

Shows the selected indicator's meaning and yellow/red actions. Tracks completed actions locally within the component and reports progress to `App`. It can open protocol instructions or the AstroHealth AI chat.

## `InstructionDrawer.jsx`

Accessible protocol drawer for a selected hazard record. Presents "How" and "Why" content, source references, equipment, mistakes, thresholds, and escalation procedures.

## `MarsTriageModal.jsx`

Mars/A2 Earth-independent 4-step CMO workflow:

1. re-measure
2. check cabin CO₂ and shielding
3. log actions
4. queue report for ground

It stores step completion and CMO notes in `App`.

## `OnsdCaliperModal.jsx`

Interactive ONSD 2-click image/caliper prototype. Applies a measured millimeter value back into the engine state.

## `PvtTest.jsx`

PVT-Lite reaction-time test. Records reaction samples, median reaction time, and lapses for the next check-in.

## `ReadinessStrip.jsx`

Compact readiness summary showing critical count, warning count, streak, and due/overdue status.

---

# `src/engine/`

## `src/engine/index.js`

Public barrel export for engine modules and mock presets. Components should normally import from here:

- `evaluate`
- `addReading`
- `checkThreshold`
- `checkDrift`
- `checkTrend`
- `scoreMeasurement`
- `aggregateScores`
- `evaluateAutonomy`
- `evaluateCadence`
- `generateHistory`
- indicator helpers

## `src/engine/evaluate.js`

Core engine implementation.

It:

- resolves presets or complete input state
- iterates every indicator in `indicators.json`
- generates deterministic history when history is absent
- runs thresholds
- runs directional drift
- runs worsening trends
- scores measurements
- computes cadence
- evaluates autonomy
- aggregates cards, hazards, nodes, overall score, badge, and UI output

It also implements `addReading()`, which advances mission day and streak, normalizes aliases and symptom keys, updates last-measured cadence, appends 7-day histories, and keeps passive telemetry synchronized.

## `src/engine/thresholds.js`

Stage 1 implementation for absolute numeric thresholds and symptom overrides.

Each indicator has ID-specific logic for:

- blood pressure
- heart rate
- ONSD
- urine calcium
- radiation
- WBC
- temperature
- sleep
- PVT
- mood
- HRV
- SpO₂
- CO₂
- glucose
- skin

It returns status, subtype, reason, and threshold-based score.

## `src/engine/drift.js`

Stage 2 implementation. Calculates directional z-score drift:

```text
z = (current value - space baseline mean) / max(space sigma, sigma minimum)
```

The effective z is only unfavorable for `HIGH`, `LOW`, or `BOTH` indicators.

## `src/engine/trend.js`

Stage 3 implementation. Upgrades an otherwise green indicator to yellow if the last four readings move monotonically in the unfavorable direction and change by at least one baseline SD.

## `src/engine/scoring.js`

Stage 4 implementation.

Responsibilities:

- interpolate measurement 0-100 scores
- enforce GREEN/YELLOW/RED score bands
- aggregate card scores
- aggregate H1-H4 hazards
- apply hazard red-floor caps
- calculate autonomy penalty
- calculate overall score and badge
- calculate anatomical node statuses
- count red/yellow physiological indicators

## `src/engine/autonomy.js`

Converts 5A communication delay and 5B medical-kit stock into:

- `A0`, `A1`, or `A2`
- Level of Care
- banner text
- kit status
- delay in seconds/minutes

## `src/engine/cadence.js`

Compares `lastMeasuredDaysAgo` to each indicator's routine interval.

Statuses:

- `CURRENT`
- `DUE_NOW`
- `OVERDUE`

It also builds the due-summary used by `ReadinessStrip`.

## `src/engine/indicatorHelpers.js`

Shared indicator utilities:

- normalize regime
- fetch the appropriate regime baseline
- resolve indicator specifications
- compare status severity
- map status to triage badge

## `src/engine/historyGenerator.js`

Deterministic seeded PRNG and 7-day history generation. It ensures generated histories are reproducible across runs.

## `src/engine/evaluate.test.js`

Large Vitest integration/unit suite for engine behavior, UI helpers, report packet utilities, and the submit flow. It imports many modules and JSON records to verify cross-layer behavior.

## `mock-iss.json`, `mock-lunar.json`, `mock-mars.json`

Mock evaluation data exported by `engine/index.js` for demos and tests.

---

# `src/flow/`

## `src/flow/submitCheckIn.js`

Pure submit pipeline. It:

- rejects empty readings
- requires `addReading` and `evaluate`
- merges symptom metadata
- calls the engine
- returns state, output, mission day, labels, red flags, and timestamp

It does not depend on React.

## `src/flow/submitCheckIn.test.js`

Vitest tests for mission-day calculation and submission behavior.

---

# `src/server/`

## `src/server/aiHandler.js`

Server-side AI request handler for protocol questions.

Responsibilities:

- validates HTTP method and JSON
- validates question length and conversation history
- handles greetings
- checks for an API key
- ranks relevant protocol JSON records
- sends a restricted protocol context to Gemini
- validates provider responses
- returns answer text and source records

It imports protocol JSON records directly and uses a concise system instruction requiring answers to stay grounded in bundled records.

## `src/server/aiHandler.test.js`

Vitest tests for request validation, protocol retrieval, provider integration with mocked fetch, API-key behavior, and HTTP error handling.

---

# `src/utils/`

## `src/utils/reportPacket.js`

Creates and downloads offline report packets.

It:

- defines the Mars/A2 4-step CMO checklist
- counts guidance and Mars checklist progress
- builds a versioned JSON packet
- includes profile, autonomy, overall status, due cadence, measurements, trends, actions, notes, and queue state
- formats a plain-text downlink report
- creates browser Blob downloads for `.json` and `.txt`

---

# State and Data Flow

## Normal Dashboard Initialization

```text
presets.json
    |
    v
evaluate('iss' | 'lunar' | 'mars')
    |
    v
engine output
    |
    +--> Gauge
    +--> HazardBars
    +--> BodyMap
    +--> Chart
    +--> ReadinessStrip
    +--> GuidancePanel
    +--> report packet
```

## User Check-In Flow

```text
CheckInModal / PvtTest
    |
    v
submitCheckIn.js
    |
    v
addReading(state, reading)
    |
    v
new state + 7-day histories
    |
    v
evaluate(newState)
    |
    v
new dashboard output
    |
    v
save to localStorage
```

## Engine Pipeline

1. Resolve preset or supplied state.
2. Evaluate absolute thresholds and symptom overrides.
3. Calculate directional personal-baseline drift.
4. Detect consecutive worsening trends.
5. Calculate measurement scores.
6. Aggregate cards and hazards.
7. Apply autonomy penalty and overall badge.
8. Build anatomical node statuses.
9. Calculate cadence/due state.
10. Return the UI-compatible output object.

## Persistence

`App.jsx` saves only browser-local mission state and history:

- `astro_state_<preset>`
- `astro_history_<preset>`

Guidance completion, Mars checklist completion, and UI selections are session state unless explicitly added to persistence.

Reset removes the saved state and history for the active preset.

---

# Hazard and Indicator Model

## Hazard 1 - Altered Gravity Fields

- `1A`: cardiovascular and hemodynamics
- `1B`: neuro-ocular SANS and skeletal calcium

## Hazard 2 - Space Radiation and Immune Function

- `2A`: daily/cumulative radiation exposure
- `2B`: immune and thermoregulation

## Hazard 3 - Isolation and Confinement

- `3A`: sleep and PVT performance
- `3B`: autonomic and psychosocial stress

## Hazard 4 - Hostile Closed Environment

- `4A`: respiratory gases
- `4B`: metabolic and skin integrity

## Hazard 5 - Autonomous Operations Context

- `5A`: communication latency
- `5B`: medical kit/consumables

Hazard 5 is context-only and does not replace the H1-H4 physiological score.

## Anatomical Nodes

| Node | Indicator IDs |
|---|---|
| `eyes` | `1B-i` |
| `brain` | `3A-i`, `3A-ii`, `3B-i`, `3B-ii` |
| `heart` | `1A-i`, `1A-ii` |
| `lungs` | `4A-i`, `4A-ii` |
| `bones` | `1B-ii` |
| `whole` | `2A-i`, `2A-ii`, `2B-i`, `2B-ii`, `4B-i`, `4B-ii` |

---

# Public Engine Conventions

## Evaluation Input

`evaluate(input)` accepts:

- preset name/ID: `iss`, `lunar`, `mars`, `AST-001`, `AST-002`, `AST-003`
- full `{ profile, symptoms, readings }` object

## Evaluation Output

The engine returns:

- `profile`
- `overall`
- `badge`
- `autonomy`
- `delay_seconds`
- `overallDetails`
- `autonomyDetails`
- `hazards`
- `nodes`
- `cards`
- `measurements`
- `dueSummary`
- `preset`

Keep UI components dependent on this evaluated output rather than direct clinical threshold logic.

## Update Input

`addReading(state, reading)` accepts indicator IDs and friendly aliases, for example:

```js
{
  spo2: 97,
  sleep: 5.8,
  hr: 68,
  symptoms: ['headache', 'blurred']
}
```

It may also accept IDs such as `'1B-i'`, `'4A-i'`, or nested `readings`.

## Status and Badge Names

- measurement status: `GREEN`, `YELLOW`, `RED`
- overall badge: `NOMINAL`, `WARNING`, `CRITICAL`

---

# AI Endpoint

Browser requests go to `POST /api/ask` with:

```json
{
  "question": "How do I measure ONSD?",
  "recordId": "1B-i",
  "history": [
    { "role": "user", "text": "Previous question" },
    { "role": "assistant", "text": "Previous answer" }
  ]
}
```

Local Vite middleware forwards this into `handleAskRequest`.

The handler retrieves only bundled protocol records and sends those records to Gemini. It does not send raw crew records or localStorage state.

Configuration failure usually results in HTTP `503`. Provider/rate failures are converted to browser-friendly API errors.

---

# Styling and UI Conventions

- React components are default exports unless they also export helpers.
- Inline styles are used heavily in JSX.
- `index.css` contains global layout and shared HUD classes.
- Status colors:
  - green/nominal: `#34d399` / `#10b981`
  - yellow/warning: `#fbbf24` / `#f59e0b`
  - red/critical: `#fb7185` / `#f43f5e`
- Typography:
  - Orbitron for display/brand text
  - Space Mono for numeric data
  - Inter for interface text
- Modals should support Escape and prevent accidental state leakage.
- Components should consume evaluated values and avoid duplicating thresholds.

---

# Testing

Vitest test files:

- `src/engine/evaluate.test.js`
- `src/flow/submitCheckIn.test.js`
- `src/server/aiHandler.test.js`

Run all tests:

```bash
npm test
```

When changing engine behavior, update or add focused tests in `evaluate.test.js`. When changing check-in submission, update `submitCheckIn.test.js`. When changing `/api/ask`, update `aiHandler.test.js`.

---

# Build and Development Notes

- Use ES module syntax.
- JSON imports in server code use the import attributes syntax supported by Node/Vite.
- Do not place Gemini API keys in `VITE_*` variables or browser code.
- `dist/` is generated and ignored.
- `node_modules/` is ignored.
- `.env.local` and `.env.*` are ignored except `.env.example`.
- Google Fonts require network access for first-load appearance, while clinical data and engine logic are bundled locally.

---

# Known Limitations and Risks

- Synthetic demo crew profiles and readings
- Educational/decision-support status only
- Operational triage heuristics may not correspond to formal NASA flight rules
- PVT-Lite is a browser interaction prototype
- ONSD caliper is an image/caliper UI prototype
- Radiation units and sources must remain clearly distinguished:
  - NASA OSDR export can provide absorbed dose
  - engine radiation telemetry may use dose-equivalent mSv/day
- Browser localStorage is not a clinical audit system
- Report downloads are client-side and no downlink backend is present
- AI answers are restricted to bundled protocol records but remain optional and non-diagnostic
- The app should not be presented as validated, flight-qualified, or medically certified
