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
3. **Single anchor metric:** Operating latitude is the canonical scalar.
4. **Bounded downside:** explicit conditional triggers define what changes if wrong.
5. **Slack portability:** screenshot is decision-complete and clean at preview scale.

Note: "One screen" in this spec refers to the Slack screenshot card (the top-fold decision card). The full homepage scrolls below the card with workspace handoff sections (planning, evidence, trust, replay, toolkits). The screenshot card must be one viewport with no scroll; the page below it is intentionally scrollable.

---

## Exact one-screen layout contract
Top-to-bottom order is fixed. The first four blocks must fit above the fold on desktop (1280×800).

### Block A — THIS WEEK (hero, decision header)
**Purpose:** instant posture call.

**Required copy format (exact labels):**
- `THIS WEEK`
- `Operating latitude: +1 notch`
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

### Block C — Operating latitude module (single scalar)
**Purpose:** establish one numeric anchor for cross-functional alignment.

**Required structure:**
- `Operating latitude: 63 / 100`
- `Change: +4`
- driver chips (max 3):
  - `Risk appetite +4`
  - `Tightness unchanged`

**Per-driver clocks.** The three driver rows render on the clock the decision
they govern runs on, not a standardized KPI treatment: funding pressure as an
action ladder (posture boundary → pause line) with crossed state and
persistence; risk appetite as remaining cushion with its trailing pace; the
short rate as a horizon trend against the model's contribution anchor, with no
threshold bar (rates carry no posture breakpoint of their own). Views are built
in `lib/report/driverDecisionViews.ts` from data the brief already loads; a
claim the data cannot support (weekly persistence, a FOMC calendar) renders
nowhere rather than invented.
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
- `If tightness rises 20 points → Hiring window closes → Operating latitude drops 12 points`
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
- The confidence band is `resolvePublishedConfidence` (`lib/report/confidence.ts`) on every route
  and export; no surface prints the engine's `diagnostics.confidence`.
- Do not append methodological footnotes here.

---


### Interpretation-layer contract (optional, URL-driven)
Interpretation layers change explanatory copy without changing the canonical weekly posture call.
As of the 2026-09 removal audit, no on-page render site reads these layers on `/`; they surface in
the export artifacts built from the homepage assembly (board summary, call citation) and in the
share-preview URL param. On-page company conditioning is the profile-driven runway notes panel
below, not `?view=company`.

- Query param: `?view=default|sector|company|financial|forecast`
- Default behavior: missing/invalid `view` resolves to `default`.
- Layer scope: interpretation layers change only explanatory bullets and do **not** change regime classification, confidence labels, or bounded-rule thresholds.
- Profile-driven variant: the runway-conditioned notes panel (`RunwayConditionedNotes`, under the
  weekly call) follows the same translation-only contract but keys on the browser-held operator
  profile instead of a query param. It renders nothing until the operator has given a runway figure,
  never restates a threshold number, and never mutates canonical call, lane, or threshold semantics.
  Its sentences state consequences of the corridor, not directives and not alternate actions or
  re-open conditions. It renders on live briefs only — under a Time Machine selection it is omitted,
  since the profile is present-day and an archived regime must not borrow it.
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
1. **This week strip** (compact posture, trend, confidence, and flip trigger metadata only; no second operating call)
2. **Action-first weekly call** (single canonical decision block with readiness/trust chips, `Action now`, `Current call`, and the bounded `What changed` / `Pause if` / `Change course if` triplet)
3. **Compact backdrop row** (`Operating latitude` plus external market backdrops for hiring, expansion, and raise conditions)
4. **Share actions + lower-emphasis detail** (one routine-first artifact card stays visible; citation and continuity remain secondary collapsed details)
5. **Why this call** disclosure (supporting evidence hidden behind details/summary)
6. **Decision matrix + action strip** (headed “What can we do this week?” and showing bounded rules as `Do now`, `Stop or tighten if`, and `Open up again when`)
7. **Planning next / exception paths** (Planning visible as the default next step; proof stays visible and deeper paths stay behind an explicit optional disclosure)

Implementation guardrails:
- Canonical weekly-call semantics must come from one shared structured payload (`weeklyCall`) before any route-specific rendering. The homepage card, copy CTA, command bar, and exported operator brief must agree on the four core lines: `Current call`, `Action now`, `Pause if`, and `Change course if`. Shared artifacts should lead with the weekly leadership `Operating latitude`; tightness belongs in `Pause if` / bounded-condition copy rather than as the primary scalar.
- The weekly call's reversal side is two fields, printed under two labels (2026-09-22). `weeklyCall.callChangesIf` is where the call itself changes — the regime flip trigger — under `Call changes if`; a stage never replaces it. `weeklyCall.resumeWhen` is set only when a stage or runway is calibrated and carries that stage's `reversalTriggerDiscipline` under `Resume when`, beside the call-change line. They used to share one field (`changeCourseIf`), so choosing a stage swapped the flip trigger out for a resume condition while every surface still labelled it `Call changes if`. Surfaces print both through `weeklyCallChangeLines`. A read that projects the stored `OperatingSnapshot` lays the reader's stage over the stored (stage-agnostic) call with `applyStageToWeeklyCall`; before that, a chosen stage reached the brief only when the store was empty.
- Action-strip contract requirement: every surfaced item (homepage, operations, export payload) must include non-empty `action`, `threshold`, and `reversalCondition` fields.
- The homepage action strip translates structured lane states into explicit action phrases (`Keep this closed`, `Proceed with guardrails`, `Stage the next move`, `Move ahead now`). The underlying `Closed` / `Guarded` / `Staged` / `Open` values remain stable for model consumers.
- Canonical bounded-decision phrasing must come from `lib/report/reportFormatting.ts` (`formatDecisionTriplet` and friends), with exact scan labels:
  - **Action**: what to do now.
  - **Threshold**: the trip line that pauses/tightens the current call.
  - **Reversal** (displayed as “Flip condition” in some surfaces): what must recover/hold before loosening or re-opening.
  - Prefix normalization (`Pause ...`, `Resume ...`) is handled centrally; consumers should pass raw rule text and avoid custom string assembly.
- Dynamic fallback copy must remain decision-complete. Do not emit placeholders such as `Stay the course`, `current track`, `standard guardrails`, or `trigger confirmation` without naming the held decision, measurable threshold, and reversal condition.
- Flat-week and returning-user summaries must state `No change. Last week's calls stand.`, name at least one decision that remains in force, and include the nearest recheck condition.
- Boundary commentary must name the signal, current distance, threshold direction, and decision consequence. Qualitative watch language alone (`worth watching`, `next release`) does not satisfy the bounded-decision contract.
- Trust readiness describes whether the current read can support this week's approvals; it must point operators back to the thresholds in the current call rather than independently declaring decisions safe.
- Decision readiness and trust must use structured freshness state, not display copy. Consumers should gate on machine-readable staleness (`fresh`, `stale`, `unknown`) and source mode (`live`, `cached`, `historical`) rather than inferring trust from a rendered timestamp string.
- When the policy layer refuses a posture change, the canonical weekly-call payload must override the default regime phrasing with reversible-only execution language. Refusal is not decorative metadata; it constrains readiness, share copy, and exported brief text.
- Historical playback should run through the same assessment path as live mode whenever aligned macro history exists. If macro history is partial or unavailable, the brief should explicitly label that degraded coverage rather than silently switching to a Treasury-only interpretation model.
- Top fold uses responsive grid composition at `lg` breakpoints to preserve scan hierarchy around common screenshot widths (~1200px desktop browser).
- Top fold should visually prioritize one dominant action lane first, then a smaller secondary lane for `Revisit now` and `Decision readiness`. Avoid giving every summary block equal visual weight.
- Decision-support details should visually explain how the current core inputs are pulling the call (`tightness`, `risk appetite`, `base rate`, `curve slope`) and keep the explanation compact enough for screenshot use.
- The top strip is metadata-only. The operator-facing call appears once, in the canonical weekly-call block.
- The canonical weekly-call block should expose one dominant action lane first, then the smaller `Revisit now` lane, before any backdrop summaries.
- The homepage shell above the weekly call should stay compressed: one slim brand/status row, one quiet workspace rail, and no large search field in the first scan path.
- Search has one visible global entry point per viewport: the header launcher at `md` and above, and the bottom navigation Search control below `md`. Both open the single global command palette, which also handles free-text guidance queries; informational pages do not add a second header search form.
- The compact backdrop row should expose the scalar anchor (`Operating latitude`) plus external market labels (`Hiring market`, `Expansion market`, `Raise market`) so it does not read like company stance guidance. V2 homepage variants should keep that same scalar hierarchy in the hero: Operating latitude first, tightness only as a supporting driver or guardrail input.
- The compact backdrop row should also make the audience default explicit: the external backdrop is calibrated to U.S. Treasury, labor, inflation, credit, and funding conditions unless a downstream surface says otherwise.
- The canonical weekly-call block should expose a compact `Decision readiness` verdict (`Act`, `Act with caution`, or `Hold`) in the first scan path; extra trust explanation should appear only when trust is degraded or historical.
- When `revisitDecisions` is true, the canonical weekly-call block should surface a compact `Revisit queue` (max 3 items) with the lane and **why that lane is queued this week** — not the bounded action. The action is already stated verbatim in the bounded-decisions ledger below, and rendering it twice made the queue pure duplication. Each item carries `driver` (the signal move) and `recheck` (the area-specific instruction); because one signal can queue up to three lanes, a `driver` shared by every visible item is hoisted above the list instead of repeated per row.
- A flat week is a first-class state, not an empty delta. When `weeklyLeadershipSummary.steadyWeek` is true, state it once in plain language with its consequence (`No change` / `Last week's calls stand.`) rather than repeating "no change vs last week" across every delta widget. The score block keeps the delta label next to the number it describes; the direction word stands alone beside the call.
- When every bounded rule clears on the same conditions, state that corridor once above the ledger (`sharedFlipCorridor`). The per-lane `Pause if` / `Clears when` logic stays — it is non-negotiable top-fold content — but the shared corridor tells the operator these lanes flip together, which no single row can. Suppress the line when the rules genuinely diverge.
- The weekly call and the score that grades it must share the first viewport at 375px. The hero orders call → score → supporting detail when stacked, and restores the two-column grid at `sm` and above.
- Above the fold, trust and rationale copy must stay compressed: keep posture, action now, confidence, flip risk, and the bounded call visible; move trajectory, continuity, and longer explanation into disclosure content below the primary scan path.
- Trust on `/` should remain compact: keep one inline verdict in the action lane and avoid duplicating trust as a separate summary card.
- On `/`, the first scan should read as one dominant weekly decision card. Detailed per-area rules should stay available, but behind a closed-by-default disclosure instead of an always-open matrix.
- On `/`, the share rail should default to one recommended artifact path first. Alternate artifact modes, shorter variants, and heavier packaging should live behind secondary disclosure UI.
- On `/`, avoid double-wrapping share UI. The homepage should show one visible routine-first artifact card, with citation and confidence continuity as separate lower-emphasis details beside it.
- On `/`, the secondary lane should focus on `Revisit now` and flip watch. Do not repeat backdrop or shorthand summaries there if those already appear in the main lane or compact backdrop row.
- On `/`, workspace navigation should stay de-emphasized. The homepage can expose a collapsed workspace chooser, but it should not compete visually with the weekly decision card.
- On `/`, deeper route choices after the weekly card should remain collapsed by default. Evidence and trust can stay visible as exception checks, but replay/tool links should not render as a second open dashboard row.
- Decision-matrix rows must expose the bounded rule inline at scan time as short `Action` + `Threshold` + `Flip` fragments; disclosures are for supporting rationale only.
- Share actions should remain routine-first. Company-specific override controls must stay separate from default share actions.
- Share actions should keep the operator brief primary, while also exposing a `delta-only brief` for repeat readers who only need this week’s change, reopen queue, and current guardrails.
- Share flow should present one recommended routine path first (`share` or `copy` the selected brief), keep quick variants lightweight, and push board/governance packaging plus company-specific exceptions behind clearly separate disclosures.
- Citation + provenance belong near the lower fold: `Cite this call` stays separate from the share-action rail, and compact provenance remains immediately after the weekly card on `/`.
- Trust copy should be a single compact sentence near the top fold: `state + freshness + operating implication`.
- The homepage should make the primary audience assumption explicit without adding a second explainer block: Whether defaults to U.S.-based operators and a U.S. market baseline, while still telling the operator to pressure-test the call against company-specific data.
- Rendering tests should verify that `data-testid="weekly-top-fold"` remains inside the decision hero and that the homepage does not restore a competing sticky history rail.

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

### Visual and copy constraints (applies to Slack screenshot card only)
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
- Replicating deep evidence/trust pages in-line.
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
  - reversal condition discipline (`reversalTriggerDiscipline`), which reaches readers as `weeklyCall.resumeWhen` under `Resume when` — never as the call-change line.
- Reversal language should remain trigger-based (clear condition + resume rule), not narrative advice.
- If mode copy changes, update both the bounded rules source and this contract in the same PR.

## Homepage consolidation notes (2026-08-15)

The homepage now renders one dominant weekly decision block instead of several equal-weight posture cards, per the `lg:grid-cols-12` single-card guardrail.

- **Flip watch moved into the hero.** The standalone `FlipMeter` barometer card was removed. Its `compactFlipConditionLabels` now render as a compact `Flip watch:` line inside `DecisionHero`. The distinct transition forecast follows as subordinate text with its modeled event and monthly horizon; it is never appended to the decision-reversal sentence. The tightness barometer visual duplicated hero metrics and was cut.
- **Trust is inline, not a separate summary card.** `DeltaTrustStrip` was removed from the right rail; the hero already carried confidence, source mode, freshness, and record date. Confidence is now surfaced in the hero's compact trust line (`Source · record date · Confidence · trust status`).
- **The revisit ritual now lives in the hero.** The adjacent `WeeklyTopFoldContract` was removed instead of restating posture delta and continuity. `DecisionHero` owns the binary revisit verdict plus at most two queued decision areas; comparison and history remain lower-emphasis continuity tools.
- **Diagnostics are progressive.** The detailed signal cells sit behind one `Why this call` disclosure while the call, Operating latitude, delta, and pause/reversal conditions remain visible.
- **Threshold distance names the decision consequence.** The hero preserves the nearest bounded-rule distance but labels it with one associated surfaced decision (for example, `3 points until hiring review`). Shared thresholds use revisit priority rather than listing every affected lever; crossed lines render as crossed instead of implying distance remains.
- **History no longer competes in a sticky rail.** Regime history, subscription, and the citable permalink now sit in a lower continuity-and-delivery section after the operating workflow.

## Shape register pass (2026-09-02)

Settled the bouba/kiki balance as a role assignment — sharp asserts, soft holds — and wrote it
down as `docs/agents/ui-ux-standards.md` §XIV, with `tests/shapeRegister.test.ts` keeping it.

- **One badge shape.** Status, verdict, regime, confidence and analog badges were the only
  `rounded-full` text on the page, so the most assertive content sat in the softest shape while
  metadata chips were 2px. They are 2px stamps now (`3 NEED ATTENTION`, `HOLD`, `Q4 2018 analog`,
  `LOW` confidence). Round is reserved for what is round: dots, spinners, switches, progress bars,
  icon wells, seals.
- **One control shape.** This reverses the 2026-08-11 "quiet pill" decision below. The hero's
  secondary actions (`Copy Brief`, `Log to Memory`, the freshness trigger, `Mark reviewed`), the
  header's `Weekly Brief` / `Home` actions, and the theme toggle drop their `rounded-full` and
  take the shared control radius (6px). Quietness is carried by their low-contrast fill and
  border, which they already had; the round corners were a second hierarchy signal that made one
  action row show two button shapes.
- **Containers off the control radius.** `--radius-xl` 8px → 10px and `--radius-2xl` 12px →
  16px, so a card is never on the button radius; the hub hero/section/card shells move from `lg`
  to `xl`. Stamps (2px), data tiles (4px) and controls (6px) are unchanged.
- **Not changed, deliberately.** Uppercase eyebrows, mono numerals, and the serif display face
  keep their register; §XIV records why sentence-casing the eyebrows was rejected.

## Controls & nav pass (2026-08-11)

Compressed the shell chrome and unified control vocabulary on `/`.

- **Interpretation controls follow the call.** `ViewSelector` and company stage selection now live
  together behind `Interpret this call for your company` below the weekly decision modules rather
  than competing with current conditions in the header or hero.
- **One header band on `lg+` home.** Brand · nav · cadence · icons stay in a single row;
  below `lg`, cadence drops to a second rail; below `md` the nav collapses to the drawer trigger.
  Report sub-routes keep the two-band layout with the next-step CTA. *(Reversed 2026-09-15 —
  see "Declutter pass" below: one band everywhere.)*
- **Nav de-glowed.** Active links lost the glow shadow and status dot (filled state carries it);
  the mobile drawer trigger swapped its pulsing dot + glow for a menu icon — it read as a status
  chip, not a button. No perpetual motion remains in the header.
- **Week browser is labeled.** The carousel dots above the hero now sit beside a
  `Mon YYYY · current` label, so the browsed position is named instead of implied.
- **Hero control row unified.** `StageSwitcher` joined the rounded-full quiet-pill family
  (label tightened to `Stage`, drop shadow removed); `DecisionMemoryButton` gained the 44px
  target size and matching text scale.
- **Compare is a disclosure.** The `Compare to last week` switch became a chevron disclosure
  matching the evidence drawer — it reveals static content, so a toggle implied persistent
  state it doesn't have.
- **History icon fixed.** The header's `History & export` action used a person icon (promising
  account/profile); now a history glyph.
- **Week-browser chevrons corrected.** `sortedMonths` is newest-first, but `goToPrevious`
  stepped toward index 0 — so `‹ Previous month` navigated *newer*, and on the live (no
  `?month`) view the back chevron was dead while the forward one was live. The default view now
  maps to index 0: back steps older (`effectiveIndex + 1`), forward is disabled at current, and
  returning forward pushes `/` (the live brief) instead of the latest month's permalink.

## Layout pass (2026-08-10)

Restructured `/` around scan speed and CTA hierarchy; desktop page height dropped ~570px.

- **Hero metadata is cells, not prose.** The wrap-dependent metadata sentence (funding pressure,
  risk appetite, deltas, regime in one flowing `<p>`) became three fixed signal cells with the delta
  glyph inside each cell. The 48px posture compass — 6px axis labels, unreadable at rendered size,
  duplicating the ThresholdLadder — was cut; its `pts to pause` counter moved into the
  `Watch this week` box header.
- **Bounded conditions own one box.** ThresholdLadder + `Guardrail` / `Reversal` / `Flip watch` rows
  render as a single bordered `<dl>` block instead of loose paragraphs. The block now renders when any
  bound exists (previously gated on flip conditions only).
- **One primary CTA in the handoff.** `Build this week's plan →` is now the `primary` ActionLink
  variant paired with `Mark reviewed`; `SubscribeForm` and the citable-permalink card moved to the
  right rail under `Conditions over time`, filling the previously empty sticky column. Hero action
  rows merged into one (Copy Brief first, per DD-005), trust line beneath.
- **Verdict badges carry state.** `ThreeWhethersCard` HOLD/TIGHTEN/EXPAND chips gained semantic
  fills/borders; `Pause if: Tighten:` double prefixes stripped from bound strings; box-in-box footer
  flattened to a `<dl>`. Top-fold contract rebalanced to 5/7 columns (revisit queue gets the room).

## Declutter pass (2026-08-07)

Removed four duplications on `/` found by screenshot review. The rule applied: when two surfaces state the
same thing, the earlier one keeps it.

- **One `Copy Brief` on the page.** `ShareBriefButton` rendered in both `DecisionHero` and
  `ThreeWhethersCard` — two buttons with the same `aria-label` about 260px apart. The
  `ThreeWhethersCard` copy was dropped; the hero button is the canonical one-tap action, the header
  `Export` menu remains the format picker, and `StickyCallStrip` remains the on-scroll persistence of
  the same call. `ThreeWhethersCard` lost its now-unused `regime` / `boldnessScore` / `actionNow` /
  `shareLines` props.
- **Top-fold `Watch:` row removed.** It restated `decision.guardrail` verbatim (truncated to 84 chars)
  under the heading `Watch:`, while `DecisionHero` already renders that same string as `Guardrail:`
  inside a block titled `Watch this week` — so it supersedes the 2026-08-01 note above, which kept
  `Watch` when the hero did not yet carry it. `guardrailRows` in `app/page.tsx` went with it.
- **`Revisit` heading dropped.** The heading sat beside a status badge that renders `REVISIT` /
  `ON TRACK`, so the amber state read `Revisit REVISIT`. The badge alone carries the state; the
  section `aria-label` is now `Revisit queue` rather than `Revisit and watch`.
- **Global header is opaque.** `globalHeaderRouteGate` used `bg-[var(--bg-body)]/95` with no
  `backdrop-blur`, so page text stayed legible through the sticky header while scrolling. Now
  `bg-[var(--bg-body)]`. Translucent overlays elsewhere (`StickyCallStrip`) pair opacity with
  `backdrop-blur`; the header did not.
- **Bounded rules stay full-width.** Reversal conditions in `ThreeWhethersCard` render unwrapped on their own line instead of truncating at 170px with a hover-only tooltip.
- **Sticky strip consolidated and cross-viewport.** The mobile bottom bar dropped the redundant native-share button (copy + image download remain) and renders as a bottom-right floating pill on desktop.
- **Mockup is deduplicated.** `app/mockups/operator-brief` states the action once (the `Do now / Pause if / Re-open when` spine), shows proof inline, and exposes one primary CTA (`Open planning handoff`) with a working `Copy operator brief` secondary.

## Contrast & mobile compression pass (2026-08-11)

- **Dark-theme legibility tokens raised (DD-006 completed).** `--app-text-muted` `#94a3b8 → #a7b3c4`
  and `--app-text-secondary` `#cbd5e1 → #d7dee8` — these are the majority inks on the page (574
  `text-slate-400/500` call sites alias to muted). Border alphas stepped up
  (`subtle 0.065 → 0.10`, `default 0.085 → 0.13`, `strong 0.14 → 0.19`) and the surface ladder
  widened (`panel #13161b`, `surface #181b21`, `raised #1f232a` over an unchanged `#08090b` body) so
  cards separate by luminance again instead of relying on sub-threshold hairlines. A dark-theme
  remap floors `text-white/30–55` at the muted role (the /40 tier measured ~3.7:1, under AA);
  `/25` and below stay decorative. Light theme unaffected — it keeps its own earlier remap.
- **Mobile signal readout collapses (DD-004).** The hero's three-cell readout renders twice behind a
  CSS split: a static grid on ≥640px, and on <640px a native `<details>` whose summary is one
  tappable line carrying all three values (`Funding pressure 52 · Risk appetite 59 · Sunny`,
  ≥44px target, explicit chevron). Pure CSS on purpose: `<details>` toggles without JS and neither
  viewport shifts layout after hydration (an effect-driven open was tried and rejected for
  desktop pop-in). Glyph SVG ids are suffixed per render to stay unique. Nothing in the do-not-cut
  list moved; the collapse hides only deltas and descriptors (~115px of hero height at 430w).

### Home cadence placement (2026-09-12)

The weekly call precedes horizon selection on mobile and desktop. Weekly / Monthly / Quarterly stays available under the lower plan-and-evidence handoff, using the existing selector. Direct `/?cadence=monthly` and `/?cadence=quarterly` links still render their selected call; API cadence semantics are unchanged. No cadence rail belongs above the call or in the global header. This completes the home-fold work deferred in PR #1351.

### Declutter pass (2026-09-15)

The sitewide pass recorded in `docs/feature-specs-current.md` §1.1.17. What it changes in this
contract:

- **One header band on every route.** The 2026-08-11 note above ("report sub-routes keep the
  two-band layout with the next-step CTA") is reversed: the CTA duplicated the Brief tab directly
  under it. Wordmark · tabs · actions, everywhere.
- **Block C's per-driver clocks stay; the threshold rows and rate prose go.** `KeyDriversCard`
  prints each driver's value, its pace or persistence, and the rate's horizon move. The
  posture-boundary and pause-line rows re-encoded the hero's bounded rails (§XV: one encoding per
  concept per screen), and the paragraphs explaining how the rate feeds the score were
  methodology on the primary screen.
- **One stage control at every width.** The header pill below `sm`, the hero's tablist from `sm`
  up. The first-run line no longer asks a third time.
- **One period control set.** The chevrons and the calendar picker in the meta row. The timeline
  scrubber and the swipe-anywhere month gesture left `/`; `/history` keeps the scrubber.
- **The phone sticky strip is gone; the desktop pill stays.** The bottom tab bar owns the thumb
  zone, and with the brief at about three phone screens the hero's Copy Brief is one flick away.
- **Below the call:** drivers and actions, the posture stripe, subscribe, the since-last-visit
  line when there is one, and the plan handoff with a text link to the direct answers. The
  stress-test card, the retrospective card and the direct-answers band restated the hero or
  recreated another route inline.
