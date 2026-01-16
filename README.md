# Whether — Regime Station v1.0

Whether is a “Product Weather Report” that translates macroeconomic signals into **operational engineering constraints**.
It bridges the gap between finance data and product execution so teams don’t run strategies that are 6–18 months behind economic reality.

## Why this exists (the gap)
Teams often lag the macro environment:
- Blitzscale when capital is expensive.
- Over-optimize for efficiency when the market rewards growth.

Whether closes this gap by turning public Treasury data into clear, actionable guidance.
This is **not** financial advice (“Buy Stock”). It’s operational advice (“Ship Faster” vs. “Cut Burn”).

## Product principles
- **Physics, not philosophy**: strategy follows the market’s funding realities, not opinions.
- **Serious, not cute**: a professional utility with high data density.
- **Plain English first**: translate jargon into operational guidance.
- **Defensible data**: all outputs trace to public US Treasury sources.

## Core product (MVP)

### 1) Regime Engine (logic core)
Classifies the environment using two signals:
- **Cost of Money (Capital Tightness)**
- **Market Bravery (Risk Appetite)**

Four regimes:
- **Survival Mode (Scarcity)**: High Cost + Low Bravery → *Extend runway.*
- **Efficiency Mode (Defensive)**: High Cost + Moderate Bravery → *Cash conversion.*
- **Safety Mode (Volatile)**: Low Cost + Low Bravery → *Trust/security.*
- **Growth Mode (Expansion)**: Low Cost + High Bravery → *Land grab.*

### 2) Live Sensor Array (dashboard)
Data comes from the **US Treasury Fiscal Data API**:
- Endpoint: `/v2/accounting/od/daily_treasury_yield_curve`
- Auth: none

Sensors:
- **Cost of Money** = 1‑Month Treasury Yield (base rate) + Yield Curve Slope (10Y − 2Y)
  - High base rate (>4%) **or** inverted curve (<0) ⇒ **Expensive**
  - Otherwise ⇒ **Cheap**
- **Market Bravery** = proxy via Yield Curve Slope (10Y − 2Y) in MVP
  - Positive slope ⇒ **Brave**
  - Inverted/flat ⇒ **Scared**

### 3) Decision Shield (action validator)
Validates actions (Hiring, Roadmap, Pricing) against current regime.
Example logic:
- If **Survival** and **Hire** ⇒ **Danger** (misaligned)
- If **Growth** and **Hire** ⇒ **Safe** (aligned)

Output includes a **status flag + concrete advice** (e.g., payback window), plus copy-ready
verdict text for sharing in planning reviews.

### 4) Time Machine (historical analysis)
Query any month since 2000 via the Treasury API to show the regime on the latest available
record on or before that date, clearly labeled as historical.
The Time Machine now prefers the local cache (`data/time_machine_cache.json`) to avoid
third‑party lookups in replay mode. Refresh the cache by re-running the Treasury query
logic in a connected environment and committing the updated file.

## Technical requirements
- **Snapshot mode**: render instantly from cached data (0ms), then fetch async.
- **Live vs snapshot indicators**: clearly label data freshness.
- **Fail gracefully** if the API is down or blocked.

## Repo layout (current scaffolding)
- `lib/regimeEngine.ts`: deterministic scoring + regime classification core.
- `lib/decisionShield.ts`: decision verdicts tied to regimes and sensor states.
- `lib/treasuryNormalizer.ts`: maps Treasury API payloads into normalized data shapes.
- `lib/treasuryClient.ts`: Treasury fetcher with snapshot fallback and explicit metadata.
- `lib/sensors.ts`: builds sensor readings with source + timestamp metadata.
- `lib/playbook.ts`: selects regime playbook guidance from the insight database.
- `lib/timeMachine.ts`: builds historical queries and labels.
- `lib/types.ts`: shared Treasury data + sensor types.
- `data/snapshot_fallback.json`: offline snapshot with source and timestamps.

### Scoring (MVP)
- Tightness score (0–100):
  - Base rate > 5% adds 90
  - Inverted curve adds 25
  - Clamp to 100

## UX guidance
- Dark mode default, high contrast.
- Monospace for data readouts.
- Small LED‑style status indicators.
- Show **Data Source** + **Last Updated** timestamp prominently.

## Notes for developers
This repo should make the product’s **purpose and market gap** obvious:
- We are the bridge between **CFO macro data** and **CTO/CPO execution decisions**.
- The “Whether Report” output should be shareable (copy/screenshot) to influence decisions.

For UI and engineering inspiration, see `LEARNINGS.md`.

## Local development
1. Install dependencies: `npm install`
2. Run the dashboard: `npm run dev`
3. Open `http://localhost:3000` to view the Regime Station UI.
