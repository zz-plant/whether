# One-screen weekly leadership brief spec (v2, decision-complete)

## Product job to be done
Whether must reduce uncertainty faster than leadership debate does, in under 30 seconds.

This screen exists to make the weekly planning call legible, bounded, and shareable.

## Success definition (behavioral gravity)
This view succeeds only if it becomes:
- a **weekly ritual**,
- a **pacing authority**,
- a **meeting shorthand**,
- a **Slack screenshot product**.

If leaders start saying “we’re +1 bold this week,” the surface is working.

## Primary user and moment
- **Primary user:** VP Product / VP Engineering / GM.
- **Moment:** Monday leadership sync prep + first 10 minutes of the meeting.
- **Decision:** keep posture vs. revise hiring, roadmap, and spend tempo.

## Hard constraints (non-negotiable)
1. **10-second readability:** first viewport answers posture and action delta without scroll.
2. **30-second decisiveness:** user can state what changed and what to revisit.
3. **Single anchor metric:** Boldness Budget is the canonical scalar.
4. **Bounded downside:** explicit conditional triggers define what changes if wrong.
5. **Slack portability:** screenshot is decision-complete and clean at preview scale.

---

## Exact one-screen layout contract
Top-to-bottom order is fixed. The first four blocks must fit above the fold on desktop (1280×800).

### Block A — THIS WEEK (hero, decision header)
**Purpose:** instant posture call.

**Required copy format (exact labels):**
- `THIS WEEK`
- `Boldness budget: +1 notch`
- `Hiring window: Open`
- `Expansion window: Strong`
- `Raise window: Improving`
- `Stability: Moderate (Week 3)`
- `Net delta: Slightly more aggressive than last week.`

**Rules:**
- No explanatory paragraphs in this block.
- No links in primary scan path.
- Content must remain readable at 90% browser zoom.

### Block B — Spoken shorthand strip
**Purpose:** convert insight into reusable meeting language.

**Required line:**
- `We’re +1 bold this week.`

**Optional line (max one):**
- `Baseline posture: [posture label].`

### Block C — Boldness Budget module (single scalar)
**Purpose:** establish one numeric anchor for cross-functional alignment.

**Required structure:**
- `Boldness Budget: 63 / 100`
- `Change: +4`
- driver chips (max 3):
  - `Risk appetite +4`
  - `Tightness unchanged`
  - `Curve stable`

**Rules:**
- Score range is fixed at 0–100.
- Delta must always be shown with sign (+/-).
- Driver chip count is capped at 3 to protect scan speed.

### Block D — Revisit decisions flag (binary ritual trigger)
**Purpose:** force explicit weekly act/hold decision.

**Required prompt:**
- `Revisit last week’s roadmap/hiring decisions?`

**States:**
- `YES — Regime shift detected.`
- `NO — Hold posture.`
- Detail panel includes a sector-sensitivity overlay (`?sector=b2b-saas|consumer|infrastructure|fintech|healthcare|ai-platforms`) to show `base posture + sector sensitivity` without altering the canonical weekly posture call; fallback is `b2b-saas`.

**Rules:**
- Exactly two states: YES / NO.
- If YES, include one-line cause.
- If NO, no extra commentary.

### Block E — What changes if wrong? (conditional guardrails)
**Purpose:** bound downside and prevent overconfidence.

**Required row pattern:**
`If [trigger] → [policy consequence 1] → [policy consequence 2]`

**Minimum two rows:**
- `If tightness rises 20 points → Hiring window closes → Boldness budget drops 12 points`
- `If curve inverts → Payback tolerance tightens to ≤ 9 months`

**Rules:**
- Each row must include at least one numeric threshold.
- Avoid probabilistic prose (“might,” “could”).

### Block F — Window velocity
**Purpose:** introduce urgency via direction, not just level.

**Required format:**
- `Expansion window: Strong`
- `Trend: Cooling`

**Optional additional windows:** hiring, raise.

**Rules:**
- Trend vocabulary limited to: `Strengthening | Flat | Cooling`.

### Block G — Memory rail (last 4 weeks)
**Purpose:** create narrative continuity and ritual check-in value.

**Required content:**
- `Last 4 weeks: Boldness 58 → 61 → 59 → 63`
- `Hiring window trend: Strengthening`

**Rules:**
- Exactly four points for compactness.
- No full chart required on this screen.

### Block H — Confidence strip (trust without essays)
**Purpose:** reduce re-litigation by proving data readiness.

**Required labels:**
- `Data freshness: 0h`
- `Confidence: High`
- `Inputs complete: Yes`

**Rules:**
- Keep to one row.
- Do not append methodological footnotes here.

---


### Interpretation-layer contract (optional, URL-driven)
The homepage supports optional interpretation layers without changing the canonical weekly posture call.

- Query param: `?view=default|sector|company|financial|forecast`
- Default behavior: missing/invalid `view` resolves to `default`.
- Layer scope: interpretation layers change only explanatory bullets and do **not** change regime classification, confidence labels, or bounded-rule thresholds.
- Expected layer semantics (screenshot-safe bullets; bounded action framing):
  - `default`: `Action` (decision delta) + `Trigger` (guardrail) + `Reverse` (reversal condition)
  - `sector`: one sector-adjusted action line plus explicit tighten/reverse conditions; still translation-only
  - `company`: top-priority bounded operator rules (max 3 bullets, input-order precedence), each compressed as `Action` + `Trigger` + `Reverse`
  - `financial`: bounded runway translation as `Action` (risk now), `Trigger` (raise window), `Reverse` (burn delta range)
  - `forecast`: `Action` (most likely scenario), `Trigger` (distance + crossing risk), `Reverse` (momentum condition)
- Trust/fallback semantics:
  - Unknown/missing `view` falls back to `default` without altering canonical weekly-card semantics.
  - Missing sector/company enrichment falls back to available baseline bullets (or available top rules) without blocking render.
  - Interpretation panels never mutate posture classification, confidence labels, or top-fold instruction semantics.
  - Bullets are compact, screenshot-safe directives (short bounded clauses; no long-form methodology text).
  - Export/citation outputs include interpretation context only when the selected view is non-default, always with translation-only trust language.

### Current implementation contract (`/`, `WeeklyDecisionCard`)
Canonical top-fold order on homepage must remain:
1. **Current outlook strip** (compact posture, trend, confidence, and flip-window context only; no second operating call)
2. **This week in 15 seconds** (single canonical decision block with boldness budget, window states, `Action`, `Guardrail`, `Flip condition`)
3. **Decision support details** (delta + evidence helpers that reference the canonical decision)
4. **Decision matrix + action strip** (bounded rules with measurable `Action`, `Threshold`, `Flip condition`)
5. **Share actions + citation disclosure** (default share actions stay compact; citation remains lower emphasis)
6. **Why this call** disclosure (supporting evidence hidden behind details/summary)
7. **Planning next / exception paths** (Planning visible as the default next step; Evidence and Trust framed as exception routes)

Implementation guardrails:
- Action-strip contract requirement: every surfaced item (homepage, operations, export payload) must include non-empty `action`, `threshold`, and `reversalCondition` fields.
- Canonical bounded-decision phrasing must come from `lib/report/reportFormatting.ts` (`formatDecisionTriplet` and friends), with exact scan labels:
  - **Action**: what to do now.
  - **Threshold**: the trip line that pauses/tightens the current call.
  - **Reversal** (displayed as “Flip condition” in some surfaces): what must recover/hold before loosening or re-opening.
  - Prefix normalization (`Pause ...`, `Resume ...`) is handled centrally; consumers should pass raw rule text and avoid custom string assembly.
- Top fold uses responsive grid composition at `lg` breakpoints to preserve scan hierarchy around common screenshot widths (~1200px desktop browser).
- Decision-support details should visually explain how the current core inputs are pulling the call (`tightness`, `risk appetite`, `base rate`, `curve slope`) and keep the explanation compact enough for screenshot use.
- The current-outlook strip is metadata-only. The operator-facing call appears once, in the canonical weekly-call block.
- The canonical weekly-call block should expose a compact scalar anchor (`Boldness budget`) plus window state labels before the bounded decision triplet.
- Above the fold, trust and rationale copy must stay compressed: keep posture, action now, confidence, flip risk, and the bounded call visible; move longer explanation into disclosure content below the primary scan path.
- Trust on `/` should remain a single compact sentence inside the canonical weekly-call block; do not inject a second standalone trust panel immediately under the hero.
- Decision-matrix rows must expose the bounded rule inline at scan time as short `Action` + `Threshold` + `Flip` fragments; disclosures are for supporting rationale only.
- Share actions should remain routine-first. Company-specific override controls must stay separate from default share actions.
- Citation + provenance belong near the lower fold: `Cite this call` stays separate from the share-action rail, and compact provenance remains immediately after the weekly card on `/`.
- Trust copy should be a single compact sentence near the top fold: `state + freshness + operating implication`.
- Rendering tests should verify hierarchy order and responsive class hooks (`data-testid="weekly-top-fold"`, `lg:grid-cols-12`, `lg:grid-cols-4`) to prevent drift.

## Slack screenshot card contract
This card is the dissemination mechanism and must stand alone when pasted into Slack.

### 5-second viral artifact contract (top-half)
The first visible card block should be enough for a founder to answer, in one glance:

- what regime we are in,
- how stable/confident the call is,
- what to do differently now.

Required top-half fields:
- `STARTUP CLIMATE — WEEKLY CALL`
- `{REGIME} — {STAGE}`
- `Confidence: [LOW|MED|HIGH]`
- `Trend: [IMPROVING|STABLE|MIXED|DETERIORATING]`
- `Operating stance: [single imperative sentence]`

Required compression rules:
- No explanatory paragraph above the operating stance sentence.
- Operating stance sentence should be compact and quoteable in chat.
- Top-half screenshot must remain decision-complete without scroll.

### Required fields (exact)
- `Macro: Risk-On / Capital-Loose`
- `Boldness: 63 (+4)`
- `Hiring: Open`
- `Expansion: Strong`
- `Stability: Week 3 / Avg 8`
- `Net: Slightly more aggressive.`

### Visual and copy constraints
- One card, one viewport, no scroll.
- No footnotes.
- No methodology callouts.
- No secondary nav chrome.
- Line lengths must avoid wrapping at typical Slack preview widths.

### Pass/fail check
A VP should be able to paste the screenshot and write only:
`Use this as planning baseline.`

If additional explanation is needed, the card fails spec.

---

## Language and compression rules
- Lead with **decision deltas**, not macro definitions.
- Use **operational nouns** (hiring, expansion, payback, stability).
- Minimize adjectives; maximize bounded numbers.
- Default to sentence fragments over paragraphs.

## Data contract (minimum viable)
Per weekly snapshot, the system must provide:
- Boldness score (0–100) and WoW delta.
- Window states: hiring, expansion, raise.
- Stability index: current week + rolling average.
- Counterfactual thresholds with mapped policy impact.
- Last-4-week boldness series + hiring trend direction.
- Freshness, confidence, and completeness metadata.

## Instrumentation and evaluation
Track adoption signals tied to ritualization:
- time to first decision statement,
- percentage of sessions with Slack export/share,
- Monday return rate,
- frequency of “Revisit decisions?” = YES,
- meeting transcript mentions of boldness scalar.

## Acceptance criteria
1. In ≤10 seconds, user can answer:
   - “How bold are we this week?”
   - “Should we revisit last week’s decisions?”
2. In ≤30 seconds, user can state:
   - current net posture delta,
   - one boundary condition that changes plan,
   - whether key windows are opening or cooling.
3. Screenshot card is share-ready with zero editing.
4. Teams naturally reference a scalar (“we’re at 63”) in planning discussions.

## Non-goals
- Teaching macro frameworks on this surface.
- Replicating deep evidence/method pages in-line.
- Adding new upstream datasets before improving compression and legibility.

## Contract note: `/` ↔ canonical rules ↔ `/answers`

Homepage weekly brief and answer pages now share one canonical bounded-rule policy model (`lib/report/boundedDecisionRules.ts`). `buildHomeBriefModel` exposes `decisionRules` and `revisitDecisions`; `/` renders the weekly artifact view, and `/answers/[slug]` maps relevant decision areas into direct-answer pages with shared pause/resume triggers and citation continuity.

- Canonical bounded rules now include threshold-aware pause/resume triggers (risk appetite + tightness) and power both homepage cards and /answers page recommendations.

### Startup variant selector contract (homepage weekly call)

To preserve semantic consistency while allowing company-stage tuning, the weekly call card includes a non-routing selector with four modes:

- `Seed`
- `Series A`
- `Series B`
- `Bootstrapped`

Implementation scope:

- Data shaping and mode payload construction live in `lib/report/homeBriefModel.ts`.
- Bounded mode adjustments and reversal-trigger discipline live in `lib/report/boundedDecisionRules.ts`.
- Server rendering for the weekly artifact lives in `app/components/weeklyDecisionCard.tsx`; mode-chip interactivity lives in `app/components/startupModeSelector.tsx`.

Behavior contract:

- The selector must not create a route change or new page.
- Mode changes are translation-only and must not alter:
  - regime classification,
  - confidence label,
  - baseline boundary thresholds.
- Mode changes may adjust only:
  - `Do now` bullets,
  - `Avoid` bullets,
  - `Watch` bullets,
  - threshold emphasis language,
  - reversal-trigger discipline text.

Drift guardrails:

- Each mode must provide explicit bounded language for both:
  - action emphasis (`doNowAdjustments` / `avoidAdjustments` / `watchAdjustments`), and
  - reversal condition discipline (`reversalTriggerDiscipline`).
- Reversal language should remain trigger-based (clear condition + resume rule), not narrative advice.
- If mode copy changes, update both the bounded rules source and this contract in the same PR.
