# Frontend v2 specification

## 1) Purpose
Frontend v2 turns Whether into a workflow-first operating surface for product and engineering leaders.

This spec defines:
- target user flows,
- information architecture,
- route-level UX requirements,
- component and state standards,
- API/UI contracts,
- delivery and acceptance criteria.

It does **not** change macro scoring logic, regime methodology, or source-data policy.

## 2) Product objectives

### 2.1 Primary outcomes
- A returning operator can understand current posture and top actions in under 30 seconds.
- A leadership stakeholder can create/share a briefing artifact in under 3 minutes.
- A trust-oriented user can validate the call through evidence + method in under 2 minutes.

### 2.2 KPI targets
- Task completion (`posture → action → evidence`) ≥ 80% in <2 minutes.
- Interaction feedback shown within 100ms for all primary actions.
- CLS = 0 on Briefing, Signals, and Playbook.
- 90%+ user agreement that freshness/provenance is clear.

## 3) Frontend v2 principles
- **Workflow over pages:** optimize for decisions, not document browsing.
- **Evidence-linked guidance:** every recommendation links to underlying evidence.
- **URL-deterministic state:** critical UI states are back/forward reproducible.
- **Trust-visible by default:** freshness, fallback, and confidence are always surfaced.
- **Accessibility as baseline:** keyboard, focus, semantics, and touch targets are non-negotiable.

## 4) Information architecture

### 4.1 Primary navigation
1. `/briefing` (default)
2. `/signals`
3. `/playbook`
4. `/scenarios`
5. `/history`
6. `/method`

### 4.2 Legacy route posture
This project is pre-production, so frontend v2 does not need legacy-route preservation.

Deprecated routes (`/plan`, `/evidence`, and similar aliases) may be removed instead of redirected.

### 4.3 URL-as-state contract
- Tab: `?tab=`
- Filter: `?filter=`
- Open panel/drawer: `?panel=`
- Scenario controls: `?rate=` and `?slope=`
- Period granularity: `?period=weekly|monthly|quarterly`
- Compare points: `?compare=a,b`
- Modal state: `?modal=`

Back-button behavior must undo the last UI state transition before leaving the route.

## 5) Route-level requirements

### 5.1 `/briefing`
Required sections (top-to-bottom):
1. Posture banner (label, confidence, timestamp, freshness).
2. Since-last-review delta strip.
3. What changed (evidence-linked deltas).
4. Top moves (do now / hold / monitor).
5. Constraint watchouts.
6. Evidence strip (source/date/freshness chips).
7. Export tray (copy/email/markdown/pdf).

### 5.2 `/signals`
Required sections:
- Signal family cards (rates, inflation, labor, credit).
- Threshold + breach status per signal.
- Reason-code expansion.
- Provenance/fallback visibility per series.
- “Why this call is credible” trust module linking to `/method`.

### 5.3 `/playbook`
Required sections:
- Role switcher (Founder/Product/Finance/Strategy).
- Guardrail blocks (hiring, spend, portfolio, cadence).
- “Why this guidance” evidence links.
- Copy/exportable weekly checklist bound to posture timestamp.

### 5.4 `/scenarios`
Required sections:
- Base-rate and slope controls.
- Persistent simulated-state banner.
- Delta view vs live posture.
- Reset-to-live control.
- Non-exportability marking for simulated outputs.

### 5.5 `/history`
Required sections:
- Chronological posture timeline.
- Weekly/monthly/quarterly pivot.
- Two-point compare mode.
- Cache coverage visibility.
- Deep links into matching briefing/signals states.

### 5.6 `/method`
Required sections:
- Inputs/rules/cadence summary block.
- Formula and threshold references.
- Provenance registry (sources + timestamps).
- Limitations and fallback disclosures.

## 6) Design system and primitives

### 6.1 v2 surface primitives
- `PageShell`
- `PostureBanner`
- `MetricCard`
- `ReasonCodeList`
- `FreshnessBadge`
- `DeltaList`
- `RoleSwitcher`
- `ExportTray`
- `EvidenceTable`

Each primitive must support keyboard navigation, loading skeletons, and empty/error states.

### 6.2 Base UI adoption (`@base-ui/react`)
| Need | Primitive(s) |
| --- | --- |
| Navigation patterns | `NavigationMenu`, `Tabs` |
| Modal flows | `Dialog` |
| Disclosure/expandable content | `Accordion`, `Collapsible` |
| Filters/forms | `Select`, `Field`, `Input` |
| Scenario controls | `Slider`, `NumberField` |
| Toggles/chips | `Toggle`, `ToggleGroup` |
| Context hints | `Tooltip` |
| Mutation feedback | `Toast` |
| CTA controls | `Button` |

Guardrails:
- Do not introduce parallel primitive systems for the same interaction pattern.
- Wrap Base UI primitives in repo-level components for consistent styling and behavior.

## 7) Accessibility and interaction requirements
- Full keyboard support for all route-critical flows.
- Modal focus trap + focus return to trigger on close.
- Minimum target size: 44x44 CSS px.
- Use semantic elements (`button`, `a`, `label`) for interactive controls.
- Validate forms on blur; on submit, focus first invalid field.
- Use `touch-action: manipulation` on interactive controls.
- Keep mobile input font-size at least 16px.

## 8) Data loading and resilience

### 8.1 Loading
- Progressive hydration: posture shell first, secondary sections next.
- Deterministic skeletons to prevent layout shift.
- Stale-data indicators when freshness exceeds configured thresholds.

### 8.2 Failure behavior
- Signal-fetch failure: show last-known-good with explicit fallback reason.
- Export failure: preserve generated output in session and allow retry.
- Partial route failure: keep unaffected modules interactive.
- Missing method/provenance payload: show trust-warning state.

## 9) API → UI contract expectations
- Weekly/monthly endpoints must include structured sections + provenance metadata.
- Signal payloads must include `source`, `record_date`, and `fetched_at`.
- Scenario responses must include simulated/live discriminator.
- History responses must include period key, timestamp, and confidence metadata.

Missing required fields must render an explicit unknown-state UI (never silent omission).

## 10) Instrumentation requirements
Required events:
- `briefing_view_loaded`
- `posture_delta_opened`
- `evidence_anchor_clicked`
- `playbook_role_changed`
- `scenario_assumption_changed`
- `scenario_reset_to_live`
- `brief_export_started`
- `brief_export_succeeded`
- `brief_export_failed`

Event payload baseline: route, posture label, freshness class, and timestamp.

## 11) Delivery plan

### Phase 1 — Foundation
- Ship `/briefing` in parallel.
- Introduce shared primitives and tokenized layout.
- Remove legacy `/plan` and `/evidence` route handlers.

### Phase 2 — Workflow migration
- Move Signals + Playbook to v2 primitives.
- Add URL-backed panel/filter/modal state.
- Ship trust module and return-visitor delta strip.

### Phase 3 — Scenario/history hardening
- Finalize scenario guardrails.
- Ship compare mode in History.
- Add progressive disclosure on Method.

### Phase 4 — Cutover
- Make v2 navigation default.
- Remove redundant v1 components/routes.
- Remove any temporary compatibility routes/aliases.

## 12) Acceptance criteria
- Navigation + route map are available behind a controlled release flag.
- Keyboard-only walkthrough succeeds for Briefing, Signals, and export flows.
- Freshness/fallback are visible in all evidence-bearing modules.
- Scenario state cannot be mistaken for live outputs.
- Legacy aliases are removed or explicitly deprecated without user-facing guarantees.
- Core route web vitals meet CLS/LCP targets.
- Required instrumentation events are emitted.

## 13) Validation checklist
- Route QA for all v2 routes and removal of deprecated aliases.
- Accessibility audit (focus, semantics, keyboard path).
- Contract tests for required fields from summary/signals/scenario/history APIs.
- Smoke test of briefing export success + failure behavior.

## 14) Risks and open questions

### Risks
- Removing deprecated aliases may break stale bookmarks during active rollout.
- Contract gaps in scenario/history payloads may block complete UI states.
- Above-the-fold density may regress first-load performance without sequencing.

### Open questions
- Long-term canonical home: `/start` vs `/briefing`?
- Timeline for preserving `/operations/*` compatibility paths?
- Default role selection strategy for first-time playbook users?

## 15) Non-goals
- Changing macro model or regime logic.
- Adding free-form AI chat experience in v2.
- Building external collaboration/multi-tenant workflows in v2.
