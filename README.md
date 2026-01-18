# Whether — Market Climate Station v1.0

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
Classifies the market climate using two signals:
- **Cost of Money (Capital Tightness)**
- **Market Bravery (Risk Appetite)**

Every scoring output now includes explicit source metadata (Treasury endpoint URL) and freshness
timestamps so operators can audit when each input was captured.

Four market climates:
- **Survival Mode (Scarcity)**: High Cost + Low Bravery → *Extend runway.*
- **Efficiency Mode (Defensive)**: High Cost + Moderate Bravery → *Cash conversion.*
- **Safety Mode (Volatile)**: Low Cost + Low Bravery → *Trust/security.*
- **Growth Mode (Expansion)**: Low Cost + High Bravery → *Land grab.*

The dashboard now includes a **Regime summary** panel that translates the regime into plain-English
operating guidance with the corresponding constraint list and Treasury provenance attached.

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
- **Expanded Macro Signals** = CPI inflation, unemployment rate, and BBB credit spreads (snapshot) with explicit sources.

### 3) Decision Shield (action validator)
Validates actions (Hiring, Roadmap, Pricing) against the current market climate.
Example logic:
- If **Survival** and **Hire** ⇒ **Danger** (misaligned)
- If **Growth** and **Hire** ⇒ **Safe** (aligned)

Output includes a **status flag + concrete advice** (e.g., payback window), plus copy-ready
verdict text for sharing in planning reviews. Operators can also save common scenarios as presets
to speed up recurring decisions.

### 3b) Decision Memory (audit trail)
Log decision context with the regime, constraints in force, and data confidence level. Each entry
can be attached to URLs and copied into exported snapshots to prevent hindsight rewriting.

### 3c) Assumption Locking (explicit posture)
Teams can lock their risk posture, threshold tolerance, and interpretation stance. A banner makes
the locked assumptions visible in reviews so disagreements stay explicit.

### 3d) Counterfactual View (scenario literacy)
Slide key drivers (base rate and curve slope) to preview how the regime and constraints would
change under alternative narratives.

### 4) Time Machine (historical analysis)
Query any month since 2000 via the Treasury API to show the market climate on the latest available
record on or before that date, clearly labeled as historical.
The Time Machine now prefers the local cache (`data/time_machine_cache.json`) to avoid
third‑party lookups in replay mode. Refresh the cache by re-running the Treasury query
logic in a connected environment and committing the updated file.

### 4b) Market climate change alerts (signal shifts)
Surface notifications only when the regime changes or tightness/bravery cross a threshold, with a
reason-code summary so leaders can spot when posture needs to change and replay the prior month using
the Time Machine for context.

### 5) Report lanes (multi-page workflow)
The report now ships as three focused lanes so leaders can consume the right depth without
scrolling a single mega-page:
- **Overview**: executive snapshot and market climate posture.
- **Signals & thresholds**: sensor detail, macro signals, and historical time machine context.
- **Operations playbook**: action guidance, decision shields, and export briefs.

### 6) Insight Database (evidence pack)
Attach citations and historical precedent to playbook guidance, including a “Fossil Record” view
of how organization and product artifacts map to capital climates.

## Technical requirements
- **Snapshot mode**: render instantly from cached data (0ms), then fetch async.
- **Live vs snapshot indicators**: clearly label data freshness.
- **Fail gracefully** if the API is down or blocked.
- **Market climate thresholds**: adjustable via URL parameters with audit trail visibility.
- **Export briefs**: copy-ready Slack/email text and print-to-PDF support.
- **Weekly summary API**: `/api/weekly` returns copy-ready weekly action text plus provenance metadata.
- **Monthly summary API**: `/api/monthly` returns copy-ready monthly action text plus provenance metadata.

## Repo layout (current scaffolding)
- `lib/regimeEngine.ts`: deterministic scoring + market climate classification core.
- `lib/decisionShield.ts`: decision verdicts tied to market climates and sensor states.
- `lib/treasuryNormalizer.ts`: maps Treasury API payloads into normalized data shapes.
- `lib/treasuryClient.ts`: Treasury fetcher with snapshot fallback and explicit metadata.
- `lib/sensors.ts`: builds sensor readings with source + timestamp metadata.
- `lib/playbook.ts`: selects market climate playbook guidance from the insight database.
- `lib/timeMachine.ts`: builds historical queries and labels.
- `lib/types.ts`: shared Treasury data + sensor types.
- `lib/macroSnapshot.ts`: expanded macro series snapshot loader.
- `lib/thresholds.ts`: URL threshold parsing helpers.
- `data/snapshot_fallback.json`: offline snapshot with source and timestamps.
- `data/macro_snapshot.json`: expanded macro series snapshot.

### Scoring (MVP)
- Tightness score (0–100):
  - Base rate > 5% adds 90
  - Inverted curve adds 25
  - Clamp to 100

## UX guidance
- Dark mode default with strong contrast and restrained color accents.
- Use a clean sans for labels and a monospace face for numeric readouts.
- Lead with a single, high‑signal summary before secondary panels.
- Prefer dense, grid‑aligned layouts with consistent spacing.
- Show **Data Source** + **Last Updated** timestamp inline with each dataset using compact freshness badges.
- Surface scoring inputs alongside the executive snapshot to keep constraints traceable.
- Keep motion minimal and purposeful (status changes, hover affordances).

## Notes for developers
This repo should make the product’s **purpose and market gap** obvious:
- We are the bridge between **CFO macro data** and **CTO/CPO execution decisions**.
- The “Whether Report” output should be shareable (copy/screenshot) to influence decisions.

For UI and engineering inspiration, see `LEARNINGS.md`.

## Local development
0. Use Node.js 20 (see `.nvmrc`) and Bun 1.2.
1. Install dependencies: `bun install`
2. Run the dashboard: `bun run dev`
3. Open `http://localhost:3000` to view the Market Climate Station UI.
