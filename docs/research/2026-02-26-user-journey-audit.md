# whether.work journey audit (2026-02-26)

## Scope
Three typical user journeys were traversed on the production site (`https://whether.work`) with five steps each, focusing on discoverability, trust, and weekly execution.

## Journey 1 — New visitor onboarding (5 steps)
1. Home (`/`)
2. Onboarding (`/onboarding`)
3. Methodology (`/methodology`)
4. Signals (`/signals`)
5. Operations (`/operations`)

### What worked
- Clear top-level intent on home (“How should your company operate right now?”).
- Onboarding is reachable quickly from home.
- Core IA (Method, Signals, Playbook) is consistently available.

### Friction observed
- Onboarding handoff to execution feels indirect because users are sent across multiple dense pages before they see one concrete “do this now” sequence.
- Methodology page reads as source-heavy; novice users can lose the narrative thread before reaching confidence.

## Journey 2 — Weekly operator flow (5 steps)
1. Home weekly action section (`/#weekly-action-summary`)
2. Action playbook (`/operations`)
3. Briefings (`/operations/briefings`)
4. Plan (`/plan`)
5. Weekly API (`/api/weekly`)

### What worked
- Home and Operations pages both expose decision-first language.
- Briefings page is a strong artifact destination for leadership comms.

### Friction observed
- `/plan` is a legacy redirect to `/operations`, so users expecting a distinct planning surface can lose context mid-flow.
- `/api/weekly` is API-shaped content (good for machines) but has no human bridge affordance (title/H1/next action) for operators who arrive there from UI exploration.

## Journey 3 — Trust validation flow (5 steps)
1. Home (`/`)
2. Signals thresholds (`/signals#thresholds`)
3. Methodology (`/methodology`)
4. Evidence (`/evidence`)
5. Concepts (`/concepts`)

### What worked
- Threshold and methodology content exists and is discoverable.
- Concepts library is rich and useful once users arrive.

### Friction observed
- `/evidence` is a legacy redirect to `/signals`; users looking for dedicated proof/evidence context can interpret this as “missing depth”.
- Trust-building flow is split across several pages without a compact “proof bundle” narrative entrypoint.

---

## Prioritized codebase changes

### P0 — Add explicit legacy-route bridge surfaces (highest impact, low-to-medium effort)
**Why:** Two journey interruptions came from legacy redirects that hide user intent (`/plan`, `/evidence`).

**Changes to make:**
- Replace silent redirects in `app/plan/page.tsx` and `app/evidence/page.tsx` with lightweight bridge pages that:
  - explain the route move,
  - preserve intent-specific context (Planning vs Evidence), and
  - provide one primary CTA + one secondary CTA.
- Keep optional auto-forward behavior behind a short delay, but make destination explicit.

**Expected outcome:** Fewer context drops, higher completion for planning and trust-validation journeys.

### P1 — Introduce a human-friendly API companion page for weekly data
**Why:** `/api/weekly` currently serves machine consumers well, but operators can land there and bounce.

**Changes to make:**
- Add `app/operations/data/page.tsx` (or equivalent) as a “Weekly Data Access” companion page with:
  - what the endpoint is for,
  - copyable endpoint URL,
  - example request/response snippet,
  - links back to Operations and Briefings.
- Add links from relevant UI surfaces (home command center + operations).

**Expected outcome:** Better self-serve adoption by technical operators without harming API ergonomics.

### P1 — Build a compact trust path entrypoint
**Why:** Users currently stitch together thresholds, method, and provenance manually.

**Changes to make:**
- Add a concise “Why this call is credible” module (home and/or signals) that links to:
  - thresholds,
  - methodology summary,
  - provenance/evidence section.
- Ensure module language is executive-readable (<60 second scan).

**Expected outcome:** Faster confidence formation and improved conversion to action surfaces.

### P2 — Tighten onboarding-to-action handoff
**Why:** New users can complete onboarding without a crisp “next operational step” commitment.

**Changes to make:**
- Strengthen final onboarding state with a single forced-choice CTA:
  - “Run this week’s decision sequence”
  - “Generate leadership brief now”
- Add progress-aware confirmation copy when onboarding checklist is complete.

**Expected outcome:** Higher movement from orientation into repeated weekly use.

### P2 — Reduce cognitive load on Methodology for first-time readers
**Why:** Source-heavy presentation can overwhelm before trust is established.

**Changes to make:**
- Add a top summary block with three bullets:
  - model inputs,
  - decision rules,
  - refresh cadence.
- Move deeper source listings behind progressive disclosure where possible.

**Expected outcome:** Better comprehension without losing transparency.
