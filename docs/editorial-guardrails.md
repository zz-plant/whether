# Editorial guardrails for board-facing SEO content

Use this guide for long-form governance resources, pillar pages, and board-facing template copy.

## Tone and voice
- Write for directors, founders, and executive staff who need operating clarity under uncertainty.
- Prioritize concrete governance mechanics (cadence, thresholds, artifacts, and owners).
- Favor precise, non-sensational language over market prediction rhetoric.
- Keep claims operational: describe what teams can control, monitor, and escalate.

## Disallowed and preferred framing
- **Avoid: predict downturns**
- Avoid deterministic macro forecasts, certainty language, and “guaranteed outcomes.”
- Avoid fear-based copy that implies governance can remove uncertainty.

- **Preferred: governance, discipline, reversibility, thresholds, artifacts**
- Prefer framing that emphasizes controllable process quality.
- Prefer artifact-centric language (decision packets, board packs, threshold logs, rollback plans).

## Primary product-surface positioning guardrails

For first-touch product surfaces (homepage hero copy, metadata descriptions, exported brief headers),
lead with founder decisions before methodology.

- Preferred framing:
  - "weekly answer for hiring, fundraising, and runway"
  - "startup market weather"
  - "weekly operating posture for founders"
- Disallowed framing on primary surfaces:
  - "macro dashboard"
  - "startup data platform"
  - "economic forecasting tool"
  - "market analysis"

Primary-surface copy should follow: weather/context → weekly posture → concrete decision action.

## Claims policy
- Do not claim that any framework “prevents failure.”
- Do not imply legal, compliance, or fiduciary advice.
- Use “supports,” “improves consistency,” or “increases decision quality” instead of absolute outcome claims.

## CTA policy
- Every long-form pillar should include a midpoint CTA and end CTA.
- CTA language should map to clear operator outcomes:
  - Template download
  - Board pack request
  - Decision workflow walkthrough/demo contact

## SEO hygiene
- Include the primary keyword in slug, H1, title tag, and meta description.
- Use clear H2/H3 hierarchy that maps to board-level operating questions.
- Add internal links to canonical parent topic and key supporting artifacts.

## Decision vocabulary (single source)
- **Regime names render as weather everywhere visible**: Freezing / Cloudy / Stormy / Sunny.
  Source is `lib/regimePresentation.ts` (`REGIME_WEATHER_LABELS`, aliased by
  `REGIME_PUBLIC_LABELS`). Concept keys (SCARCITY/DEFENSIVE/VOLATILE/EXPANSION) stay
  internal — they are engine terms, not display copy. Compass quadrant axes and the
  forecast "possible paths" strip are the two defined exceptions (axis labels and
  forecast-outcome labels, below).
- **Operating-posture descriptions are a distinct layer, not regime names**:
  Contraction, Transitional Mixed, Guarded Expansion, Expansion (`getRegimeDisplayLabel`).
  They describe the current stance; the regime name above stays separate.
- **Forecast-outcome labels are a distinct typed layer**, not regime names:
  Expansion / Mixed / Scarcity / Defensive (`lib/report/forecastModel.ts`
  `ForecastRegimeLabel`). Used for the forward estimate and the diagnostics
  "Possible paths" strip. Do not reuse them as current-regime names.
- **The stance object is the call**: "the call", with "weekly operating call" on first
  mention in cold surfaces (shares, metadata, answer pages). "Posture" stays the label for
  the operating stance; do not mint recommendation/verdict as user-facing stance synonyms
  ("verdict" is internal; answers use "Bounded calls").
- **The forward-look noun is forecast** ("why the forecast shifted", the forecast cone).
  Do not add synonyms (outlook/conditions) for the forward estimate. The command bar's
  "{regime} outlook" chip is a pass-through descriptor of current conditions, not a
  forecast synonym.
- **Bounded-decision slot labels come from `DECISION_CONTRACT_LABELS`**
  (`lib/report/reportCopy.ts`): imperative forms on screens (Do now / Pause if / Change
  course if), noun slots in exports (Action / Threshold / Reversal). Consume the export
  instead of hardcoding slot words in new components.
