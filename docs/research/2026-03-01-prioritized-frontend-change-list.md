# whether.work prioritized front-end change list (2026-03-01)

This list consolidates recommendations from the VP Product and VP Engineering persona critiques into one execution-ready backlog.

## Prioritized changes

### P0 — Ship a single above-the-fold weekly decision surface
**Why now:** Both personas need immediate clarity on “what changed” and “what to do this week” with minimal scanning.

**Changes to make:**
- Add a unified **This Week’s Decision Card** on primary entry pages.
- Include: regime status, top 3 actions, one guardrail, confidence level, timestamp.
- Add two primary CTAs:
  - Run weekly operating sequence
  - Generate leadership brief

**Primary outcome:** Lower time-to-first-action for senior operators.

---

### P0 — Add role-aware action mapping, starting with Engineering levers
**Why now:** VP Engineering users still translate generic guidance manually.

**Changes to make:**
- Add an **Engineering Operating Posture** panel with clear states (Accelerate / Stabilize / Optimize).
- Expose concrete levers:
  - delivery scope aggressiveness
  - reliability/error-budget strictness
  - hiring/backfill pace
  - platform investment intensity
- Show owner tags on actions (Product, Engineering, GTM, Finance).

**Primary outcome:** Recommendations become immediately executable by functional leaders.

---

### P0 — Pair recommendations with compact trust + risk framing
**Why now:** Users need to defend decisions quickly and understand downside risk if guidance is wrong.

**Changes to make:**
- Add a short **Why this is credible** module near the weekly decision surface:
  - inputs
  - rule logic
  - update cadence
- Add a risk block on top actions:
  - risk if over-applied
  - risk if under-applied
  - mitigation trigger

**Primary outcome:** Faster cross-functional alignment and stronger confidence in action.

---

### P1 — Improve route continuity for legacy intent paths
**Why now:** Redirects can break context during trust and planning journeys.

**Changes to make:**
- Replace silent redirects for planning/evidence-intent routes with bridge pages.
- Preserve user intent with:
  - short explanation of route transition
  - primary next CTA
  - secondary alternate CTA

**Primary outcome:** Reduced drop-off at transition points and clearer product maturity.

---

### P1 — Add planning-ready export/copy artifacts
**Why now:** Leaders need to move from insight to internal docs quickly.

**Changes to make:**
- Add one-click copy blocks for:
  - weekly directive (short)
  - leadership update paragraph (medium)
  - risk register entry (structured)
- Place these near briefings/operations and weekly decision modules.

**Primary outcome:** Lower translation overhead into Jira/Notion/staff updates.

---

### P2 — Introduce progressive detail modes and confidence layers
**Why now:** Users vary between fast scan and deep validation; current experience can require too many route hops.

**Changes to make:**
- Add view preference toggle: **Operator view** vs **Analyst view**.
- Keep confidence layers in-page:
  - one-line rationale
  - top supporting signals
  - full methodology/source links

**Primary outcome:** Better usability for both rapid decision-makers and detail-oriented reviewers.

## Suggested implementation sequence (2 sprints)
1. **Sprint 1 (P0):** Weekly decision surface + role-aware action mapping + trust/risk blocks.
2. **Sprint 2 (P1):** Bridge pages + copy/export artifacts.
3. **Stretch/P2:** Mode toggles + progressive confidence layers.

## Metrics to track across all priorities
- Time to first action CTA click.
- Decision-to-brief conversion rate.
- Copy/export usage rate.
- Weekly return usage cadence.
- Engagement with trust/risk disclosures.
