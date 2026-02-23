# Sunset plan: user-input and per-client decision tracking

## Why this plan exists

We were asked to sunset any feature that depends on:
1. Users entering custom inputs to make guidance work.
2. Tracking or storing decisions on a per-client basis.

Important clarification for product behavior:
- One-time onboarding/FTUX can still exist (and should not be repeatedly shown after completion).
- What is being removed is ongoing user-entered operational state and client-level decision memory.

The product should move toward **default, evidence-first operational guidance** that works without user setup and does not maintain client-specific memory.

## Outcome statement

After sunset completion:
- Core guidance and briefings work without forms, sliders, presets, or assumption capture.
- No Decision Memory entries are created, stored, or exposed via API.
- No UI copy implies user-managed client state or audit trails.
- Exporting standard brief/report outputs remains supported.
- Any remaining scenario capability is non-persistent and clearly marked as temporary analysis.

## In-scope features to remove or reshape

Based on the current feature inventory, these surfaces are in scope.

### A) Remove user-input-dependent decision tooling
- Decision Shield manual inputs (lifecycle/category/action selectors).
- Assumption locking form and local persistence.
- Counterfactual sliders and URL/local storage state persistence.
- URL threshold override controls and operator tuning history in Signals.

### B) Remove per-client decision tracking
- Decision Memory save flow in Decisions UI.
- Decision Memory list/history views.
- Decision Memory JSON/CSV exports.
- `GET /api/decision-memory` and `POST /api/decision-memory` endpoints.

### C) Keep exports that are not client-memory dependent
- Keep brief/report export paths that package current public-signal guidance.
- Remove only export paths tied to stored, per-client decision trails.

### D) Update adjacent docs/copy/product framing
- Remove positioning around immutable decision logs and client audit trails.
- Reframe toward standardized regime guidance and evidence transparency.
- Keep citations/provenance for macro data, but not user/client state.

## Explicitly out of scope

- Replacing removed flows with new personalization systems in this pass.
- Building account-level storage/auth as an alternative.
- Introducing predictive models or bespoke recommendation engines.

## Future packaging note (not in this rollout)

If we later reintroduce longitudinal team workflows, treat them as a separate "coming soon" or premium track with distinct scoping, pricing, and architecture review. This sunset plan does **not** block that future option; it only removes it from the current free/default product surface.

## Rollout plan

Given there is no production dependency risk yet, prefer a direct removal path over prolonged deprecation.

## Phase 0 — Alignment + freeze (Day 0)
- Freeze any net-new work on Decision Memory, assumption forms, and saved presets.
- Add an internal note to planning docs/backlog that the retirement path is immediate.

**Exit criteria**
- Team alignment on scope and timeline.
- No new tickets expanding soon-to-be-retired features.

## Phase 1 — Direct removal of decision tracking + input dependencies (Days 1-4)
- Remove Decision Memory UI, APIs, and storage adapters.
- Remove assumption locking, presets, and counterfactual persistence paths.
- Remove threshold tuning controls; lock thresholds to product defaults.
- Keep/verify non-memory export flows for briefing outputs.

**Exit criteria**
- No persisted client decision records can be created or read.
- Guidance does not require operator inputs.
- Non-memory export flows remain functional.

## Phase 2 — Documentation + QA hardening (Days 4-5)
- Update feature specs and PRD docs to reflect sunset reality.
- Remove stale references in onboarding, operations pages, and API docs.
- Add regression tests ensuring no Decision Memory route/UI or save flows remain.
- Add smoke checks for default guidance pages and summary APIs.

**Exit criteria**
- Docs match shipped behavior.
- Regression suite fails if retired capabilities reappear.

## Engineering implementation checklist

### Frontend
- [ ] Remove Decisions UI modules tied to input capture and Decision Memory save/history.
- [ ] Remove localStorage/sessionStorage usage for assumptions/presets/decision logs.
- [ ] Remove query-param synchronization used only for retired decision tools.
- [ ] Preserve one-time onboarding completion logic (no repeated FTUX).
- [ ] Ensure empty states route users to standardized reports and briefings.

### Backend/API
- [ ] Delete Decision Memory endpoints and related types/contracts.
- [ ] Remove server-side branches expecting user-provided scenario payloads.
- [ ] Confirm only canonical summary/data endpoints remain publicly documented.

### Data/contracts
- [ ] Remove decision-log schema and fixtures no longer used.
- [ ] Keep provenance metadata for public macro data sources.
- [ ] Validate no "clientId" or equivalent decision-tracking identifiers are required anywhere.

### QA
- [ ] Route smoke: `/`, `/signals`, `/operations/plan`, `/operations/briefings`.
- [ ] Negative checks: Decisions save/history/input flows absent.
- [ ] API negative checks: decision-memory endpoints return 404/removed.
- [ ] Positive checks: briefing/report export still works.
- [ ] Accessibility pass on updated navigation after Decisions simplification.

## Risk register and mitigations

- **Risk: perceived loss of advanced functionality.**
  - Mitigation: improve default brief quality and evidence density on core pages.
- **Risk: broken deep links to retired controls.**
  - Mitigation: add redirects or safe no-op handling for known legacy query params.
- **Risk: stale docs/user confusion.**
  - Mitigation: same-release docs updates and visible release notes.

## Acceptance criteria (product-level)

1. A user can get actionable guidance without entering any custom inputs.
2. No feature stores client decision history.
3. No UI/PRD/docs claim decision memory or assumption locking is available in current product.
4. Core summary APIs and briefing surfaces remain functional after removals.
5. One-time onboarding is respected and not repeatedly shown to completed users.

## Suggested sequencing across pull requests

1. **PR 1:** Remove Decision Memory APIs + storage contracts + Decision Memory UI.
2. **PR 2:** Remove input-dependent decision/assumption/counterfactual/threshold controls.
3. **PR 3:** Docs/test cleanup + dead-code removal + verify non-memory exports.

This sequencing minimizes churn while matching current pre-production reality: remove quickly, then harden docs/tests.
