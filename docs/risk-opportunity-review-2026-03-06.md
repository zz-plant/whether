# Risk & opportunity review (10 items)

This review flags product and engineering risks paired with concrete opportunities to improve decision transmission in the core loop (`signals → posture → decision → artifact`).

## 1) Route sprawl can dilute the weekly brief as the canonical surface
- **Risk:** The app currently exposes a large number of page routes (`app/**/page.tsx`), increasing maintenance load and creating discovery friction versus the one-screen brief priority.
- **Opportunity:** Consolidate low-traffic explanatory routes into stronger content blocks on `/` or a smaller set of canonical hubs, then route long-tail pages to concise artifact-first summaries that link back to the weekly brief.

## 2) Spec says “as built,” but includes known P1/P2 backlog in the same contract doc
- **Risk:** `docs/feature-specs-current.md` mixes shipped behavior with pending priorities (P1/P2), which can blur what is guaranteed versus aspirational.
- **Opportunity:** Split “implemented contract” from “next improvements” into separate docs, and keep `feature-specs-current.md` strictly release-accurate.

## 3) Decision tooling exists in code but is de-emphasized in primary runtime navigation
- **Risk:** The feature spec notes Decision Shield logic is present but no longer first-class in navigation, which may reduce operator adoption of bounded decision checks.
- **Opportunity:** Reintroduce a lightweight decision checkpoint module directly inside the homepage weekly flow instead of adding a separate surface.

## 4) Summary system still has contract-test gaps for critical API guarantees
- **Risk:** The current spec explicitly calls out missing API contract tests for `/api/weekly` and `/api/monthly`, leaving structured payload regressions easier to miss.
- **Opportunity:** Add schema-level contract tests that assert required structured fields and provenance metadata on both endpoints.

## 5) Runtime hydration for legacy archives may hide data-shape drift
- **Risk:** The spec documents runtime hydration for legacy `structured` summary fields, meaning malformed historical records can pass silently until runtime.
- **Opportunity:** Materialize and validate historical structured fields offline (the existing P1 item), then fail CI on archive contract violations.

## 6) Many SEO-oriented surfaces increase content freshness risk
- **Risk:** The repo contains numerous resource/concept/solution pages, which can drift from current posture language and reduce trust if stale.
- **Opportunity:** Add an automated freshness stamp and “last reviewed against weekly posture” check for SEO pages, with a lightweight stale-content warning in generation workflows.

## 7) Two methodology routes (`/method` and `/methodology`) can create IA ambiguity
- **Risk:** Duplicate naming for closely related methodology content can confuse users and fragment inbound links.
- **Opportunity:** Pick one canonical route, redirect the other permanently, and normalize internal links/site metadata to reduce routing ambiguity.

## 8) Rich fallback behavior exists, but degraded-state UX can still become cognitively heavy
- **Risk:** The product intentionally carries provenance/fallback metadata; if too many trust markers appear at once, operators may spend time re-litigating state rather than deciding.
- **Opportunity:** Introduce severity tiers for trust indicators (critical/warn/info) so only decision-changing degradations interrupt primary reading flow.

## 9) Check pipeline is robust but potentially expensive for rapid iteration loops
- **Risk:** `bun run check` chains preflight + lint + typecheck + tests; teams may skip it locally when speed pressure is high, increasing “works on my branch” risk.
- **Opportunity:** Add documented “fast-path” scoped validation recipes (by subsystem) and enforce full checks in CI while keeping local feedback quick.

## 10) Product positioning is crisp, but README scope is broad for first-time operator onboarding
- **Risk:** The README includes extensive positioning and career framing, which can obscure the fastest “how to use this week” path for operators.
- **Opportunity:** Add a short “10-minute weekly ritual” quickstart block near the top that emphasizes delta, decision changes, and shareable artifact steps.
