# Specs — Next-Level Signal Ops + Decision Memory

## 1) Signal Ops
### Alert triggers
- Trigger only on:
  - Regime changes.
  - Tightness or bravery crossing configured thresholds.
- Suppress duplicate alerts within a 24-hour window unless the regime flips again.

### Alert payload requirements
- Regime label + short explanation.
- Reason codes (e.g., BASE_RATE_HIGH, CURVE_INVERTED).
- Sensor values + thresholds at evaluation time.
- Source URLs + timestamps for every signal.
- Time Machine deep link for replay.

### Weekly digest
- Summarize deltas for tightness, risk appetite, and regime changes.
- Include “what changed” bullets tied to sensor movements.

## 2) Executive briefing pack
### Formats
- Slack/email copy block.
- Slide-ready bullets.
- PDF-friendly view.

### Required content
- Regime summary + operational constraint list.
- Key sensor values with freshness badges.
- Decision Shield highlights (top 3).
- Citations with source URLs.

## 3) Decision Memory
### Data model (append-only)
- `decision_id` (uuid)
- `created_at`
- `inputs`: lifecycle, category, action
- `regime`: label, tightness, risk appetite
- `sensors`: base rate, curve slope, macro snapshot
- `thresholds` in force
- `sources`: URL + timestamp per signal
- `notes` (optional)
- `links` (optional)

### Export
- JSON and CSV export.
- Immutable records once saved.

## 4) Scenario Studio
### Interaction
- Sliders for base rate and curve slope.
- Visual “Simulated” state on all affected cards.
- Delta summary vs. current regime (constraints + score shifts).

### Guardrails
- Simulations cannot be exported as live data.
- Explicit banner reminding users of assumptions.

## 5) Macro data reliability
- Add live fetchers for:
  - CPI (BLS)
  - Unemployment (BLS)
  - BBB credit spreads (FRED)
- Cache each series with `fetched_at`, `record_date`, and `source` metadata.
- Surface fallback reasons when snapshots are used.

## 6) Accessibility + UX
- All new UI controls must pass the “no mouse” rule.
- Alerts and brief exports must be reachable via keyboard and screen reader.
- No layout shifts when loading export content.
