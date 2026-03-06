# Additional risk & opportunity review (10 more items)

This addendum captures 10 **additional** risks/opportunities beyond the first review, with emphasis on decisions that improve weekly operator speed, bounded calls, and shareable artifacts.

## 1) URL-only threshold overrides can reduce continuity across weekly rituals
- **Risk:** Threshold tuning currently depends on URL parameters, so operator calibrations may not persist across sessions or teammates unless links are manually shared.
- **Opportunity:** Add optional saved threshold presets (team-level + personal) with explicit “active override” chips and one-click reset to defaults.

## 2) Legacy and policy pilot outputs may create interpretation drift
- **Risk:** The additive policy layer (`cts`/`ras` + refusal state) coexists with legacy regime scoring, which can cause disagreement without a clear operator-facing tie-break rule.
- **Opportunity:** Add a compact “why this call wins” reconciliation block whenever pilot and legacy posture diverge.

## 3) Refusal-state semantics may be underused without explicit action pathways
- **Risk:** Refusal outputs (e.g., `NO_POSTURE_CHANGE_RECOMMENDED`) can become passive labels if not tied to concrete hold/revisit actions.
- **Opportunity:** Bind each refusal state to a bounded action card: what to hold, what threshold would flip the call, and when to re-check.

## 4) Alert cooldown protects noise but can hide urgency during fast shifts
- **Risk:** The 24-hour cooldown policy can suppress repeat alerts in turbulent periods where decision urgency changes within hours.
- **Opportunity:** Add severity-aware cooldown bypass rules (e.g., score delta > X or regime flip + confidence jump) to preserve signal quality without spam.

## 5) Time Machine cache coverage may feel binary without confidence gradation
- **Risk:** Cached historical playback can be interpreted as equally reliable across all periods even when source completeness varies.
- **Opportunity:** Surface confidence bands for historical months (full/partial/degraded) and expose missing-series impact inline.

## 6) Integration exports can drift in terminology across targets
- **Risk:** Slack, Notion, and Linear mandate payloads may diverge in language details over time, weakening cross-team alignment.
- **Opportunity:** Introduce a shared export lexicon snapshot test that enforces regime labels, bounded-rule phrasing, and provenance formatting parity.

## 7) Monthly summary contract lag may weaken executive rollup utility
- **Risk:** The spec highlights monthly section expansion as pending, which can leave month-level artifacts less decision-ready than weekly outputs.
- **Opportunity:** Prioritize monthly parity for decision-critical fields (delta, top reversals, and bounded next actions) before adding new surfaces.

## 8) Fallback metadata may be present but not consistently decision-ranked
- **Risk:** Operators can see freshness and fallback context, but may still need to infer whether to trust/act/hold.
- **Opportunity:** Add a single decision-readiness badge (Act / Act with caution / Hold) computed from freshness, confidence, and missing-input severity.

## 9) Onboarding glossary may not guarantee rapid first artifact creation
- **Risk:** New users can understand terms yet still fail to produce a usable Slack/meeting artifact in their first session.
- **Opportunity:** Add a first-run checklist that ends with “generate and copy weekly brief artifact” in under 5 minutes.

## 10) Hotspot preflight exists, but governance could miss semantic drift in copy outputs
- **Risk:** Logic checks can pass while decision language in summaries/exports gradually shifts toward generic advice.
- **Opportunity:** Add golden-text assertions for bounded-rule wording (action + threshold + reversal condition) in key weekly/export sections.
