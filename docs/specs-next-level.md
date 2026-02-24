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

## 7) AUP-enabled operating posture (less restrained, still compliant)

Now that an Acceptable Use Policy is in place, the product can move from strictly descriptive
briefing language toward stronger internal operating guidance. This section defines where we can
be more assertive without crossing legal boundaries.

### 7.1 Recommendation tone upgrade
- Upgrade selected surfaces from "signals only" phrasing to action-oriented posture:
  - "Recommended default posture"
  - "Base case / upside / downside operating plan"
  - "Do now / hold / monitor" blocks
- Keep probabilistic qualifiers in all recommendation surfaces.
- Never present outcomes as guaranteed or deterministic.

### 7.2 Internal distribution + embed permissions
- Enable first-class internal export + reuse workflows:
  - Copy-ready board memo blocks.
  - Investor update snippets.
  - Internal wiki-compatible markdown exports.
- Add an "Internal use" label on exported assets.

### 7.3 Human-in-the-loop decision assist
- Allow the app to prefill draft recommendations for:
  - Hiring pace options.
  - Budget allocation trade-offs.
  - Product roadmap sequencing under macro constraints.
- Require explicit human attestation before marking any draft as a final decision.
- Block or warn when users attempt to use generated content as sole basis for
  people-affecting decisions.

### 7.4 Guardrail UX and enforcement controls
- Add policy-aware interaction checks:
  - Warning banner for regulated-advice-like wording.
  - Confirmation modal when exporting high-certainty language.
  - Admin event logs for policy-triggered warnings and blocks.
- Preserve an enforcement path for repeat or severe policy violations.

### 7.5 API and platform boundaries
- Permit richer operational integrations for internal workflows.
- Keep anti-circumvention controls explicit:
  - Rate-limit and authentication enforcement.
  - No unauthorized resale/white-label operation.
  - No reverse-engineering of proprietary scoring logic.

### 7.6 Acceptance criteria
- Recommendation modules include confidence + uncertainty labels by default.
- Export flows stamp every artifact with:
  - "Informational, not professional advice"
  - Timestamp and source links
  - "Internal use" marker
- Any workflow producing legally significant individual-impact decisions must
  require human review and cannot complete in fully automated mode.
