# Current feature specs (as built)

This document captures the **implemented** feature set in the repo. It is an audit of what the
product does today, based on shipped UI routes, data loaders, and APIs.

Positioning summary: Whether is an operator briefing system for leadership teams answering three recurring questions: what regime are we in, what should we do now, and which decisions are misaligned with current macro conditions.

Dynamic decision copy follows the same bounded contract across weekly, evidence, trust, export, and monthly-summary surfaces: name the action, measurable pause threshold, and reversal condition. Flat-week fallbacks identify which prior calls remain in force; trust language scopes use of the data rather than substituting generic safety claims; monthly summaries expose structured operating rules instead of relying on phrases such as “use guardrails.”

## 1) Product surfaces (UI routes)

### Current reading and disclosure behavior (2026-09-24)

- The weekly brief reads in the same visual and document order on phones and desktop:
  the call, what changed, what it changes by area, what would change the call, then what to do.
- Planning's rule lists expand in place. `actions=all` preserves the expanded view in shared
  links; toggling retains the other query parameters, and Back/Forward restores the list state.
- The desktop `More` menu closes on an outside click or Escape; Escape returns focus to its trigger.
- Answer pages expose `Copy decision brief` in the header and after the decision content.
  Both copy the same answer, bounded rule, citation, and freshness line.
- Evidence and Trust use the shared `Pause if` and `Resume when` labels.

### 1.0 Rationalized IA (one screen + reachable depth)
Primary IA is now a single surface — the **Weekly Brief** — with everything else reachable
as supporting layers, deep links, or URL-driven states of `/`:
- `/` — **Weekly Brief**: the canonical posture, decision delta, and share artifact (the product)
- `/operate` (Plan), `/signals` (Evidence), `/resolve` (Resolve), `/trust` (Trust): reachable
  but **supporting**, one click from the brief — not peer routes that invite a second scan
- `/history`, `/history/compare`: supporting archive and scrub/playback

Supporting surfaces are intentionally subordinate:
- `/toolkits` is a supporting instrument library under **Resolve**
- `/learn/failure-modes` is a supporting diagnostic reference under **Trust**
- `/guides`, `/resources/*`, `/answers`, `/solutions/*`, `/concepts`, and `/startup-macro-posture*` remain secondary discovery or distribution surfaces rather than primary workflow hubs
- SEO concentration now favors a smaller authority set: the five primary workflow hubs, a curated subset of high-intent answer pages, and a curated subset of authority resource pages.
- Secondary libraries such as `/guides`, `/toolkits`, `/posture`, most resource utilities, and most answer/detail bridge pages remain available in-product but default to noindex.
- `/guides` and top-level `/toolkits` entry URLs are helper entrypoints under their parent workflow hubs rather than standalone primary destinations
- `/guides` now acts as a compatibility redirect into query-selected translation states on `/resolve`, so role and stage translation live inside the canonical Resolve workflow rather than on a parallel library page.
- `/toolkits` now also acts as a compatibility redirect into the query-selected toolkit shortlist on `/resolve`, so toolkit search and browse state live inside the canonical Resolve workflow rather than as a standalone library route.
- `/posture` now acts as a compatibility redirect back to the Weekly Brief. Live posture reference no longer ships as a standalone workflow.
- `/search` now acts as a command-only redirect into the next canonical workflow state instead of rendering its own browse surface.
- `/resources` now redirects straight back into Planning's export/artifact checkpoint; deeper governance material still lives on focused `/resources/[slug]` detail pages.
- `/answers`, `/sources`, and `/confidence` no longer ship standalone page implementations; those URLs now permanently redirect to their canonical parent workflow states
- `/guides/stage`, `/guides/[stakeholder]`, `/guides/stage/[stage]`, `/concepts/conflicts`, `/concepts/focus/[focus]`, and `/concepts/audience/[audience]` are retired as standalone implementations and now permanently redirect into canonical hub-selected states on `/guides` or `/concepts`
- `/learn/failure-modes` permanently redirects into the trust workflow rather than acting as an independently indexable content hub.
- `/concepts` is a page again (restored 2026-09-23): one list of widely read product-management writing, each entry placed on the month-end record (conditions that month, how long they had held), with the essays' share per set of conditions beside the months' share so no coincidence reads as a cause. Every entry's first-publication month was checked against its source. Sub-paths (the first version's detail, focus, audience and conflicts pages) redirect to `/concepts`. Module: `lib/productCanon.ts`; test: `tests/productCanon.test.ts`.

The homepage keeps interpretation layers optional and query-driven: the default weekly brief omits interpretation context entirely, and interpretation panels render only when a non-default `?view=` is explicitly selected.

Primary workflow pages now expose a top-of-page scroll path that explains the down-page sequence and highlights the current checkpoint as the operator moves through long surfaces.
Report-shell routes (`/signals`, `/operate`, `/resolve`, `/trust` and nested report paths) use a reduced global header mode with one intro block before page-specific content; the homepage now suppresses report-shell header chrome so the weekly card remains the first dominant surface, compact report-shell intros now merge route purpose, trust state, and the first CTA into one priority card, do not inject a default export CTA on non-home routes, and the compact global nav stays quiet by default on mobile behind a collapsed workflow picker.
Primary navigation now keeps the Weekly Brief as the only primary destination. Plan,
Evidence, Resolve, and Trust are supporting layers under the brief, reachable from the mobile
drawer, command palette, and in-flow CTAs (`Build this week's plan`) — never as equal-weight
desktop nav peers.

### 1.1 Weekly briefing (/) 
The home report is a weekly briefing view delivered through the shared `ReportShell` layout. It
includes status metadata (data freshness, confidence label, offline badges), fixed navigation
links, and section anchors used across the report experience.

The home page is now the canonical weekly workspace. The top fold keeps the `WeeklyDecisionCard`
hero plus share/copy actions, then the page continues as a compact handoff sequence:
- planning handoff,
- evidence/trust exception handoff,
- optional deeper-surface chooser.

The home top fold now separates metadata from decision contract: a compact current-outlook strip
shows posture, trend, confidence, and flip-window context, and the canonical weekly call appears
once below it with explicit `Action now`, `Pause if`, and `Change course if` fields. The share rail
now keeps the weekly operator brief and short snapshot as the only default-scan actions, while board
packaging, print/export, and company-specific exception controls sit inside a secondary disclosure.
The weekly brief now also states its primary audience assumption directly: Whether defaults to
U.S.-based operators and a U.S. market baseline, then asks the user to pressure-test that read
against company-specific demand, retention, and cash signals.
Operator-workflow telemetry still logs artifact-mode selection and route transitions across the core
weekly loop.
On phones the hero's signal readout (funding pressure / risk appetite / conditions) collapses to a
one-line summary via a native disclosure that keeps all three values visible; it opens automatically
on ≥640px viewports (DD-004 mobile-compression work, 2026-08-11).
The weekly-call module now also surfaces a compact weekly scalar block before the bounded decision strip:
- boldness budget score and weekly delta,
- hiring, expansion, and fundraising windows,
- a scan-first “What can we do this week?” ledger using `Do now`, `Stop or tighten if`, and
  `Open up again when`, with structured lane states translated into explicit action phrases,
- one-line net delta shorthand.
The canonical weekly-call block now also includes:
- a compact decision-readiness verdict (`Act`, `Act with caution`, or `Hold`) inside the trust row,
- a bounded revisit queue (up to three items) when this week’s move implies specific decisions should be reopened, carrying why each lane is queued rather than restating the bounded action the ledger below already prints verbatim,
- a plain-language steady-week state (`No change` / `Last week’s calls stand.`) driven by `weeklyLeadershipSummary.steadyWeek`, replacing the repetition of “no change vs last week” across the delta widgets,
- a shared flip corridor stated once above the bounded-decision ledger when every lane clears on the same conditions, so correlated levers read as correlated,
- a delta-only brief in the share rail for repeat readers who only need the weekly change, reopen items, and current hold / reopen lines.
The current homepage hierarchy now makes the action lane dominant: `Do this now` leads the top fold, `What changed` supports it, and `Recheck now` plus readiness/trust sit in a smaller secondary lane rather than competing as equal-width cards.
The artifact rail now follows a routine-first hierarchy:
- one recommended artifact mode,
- one primary share/copy path,
- quick variants for repeat readers (`delta brief`, `call snapshot`),
- a direct handoff into Planning for board/governance repackaging and company-specific exceptions.
On the homepage, the artifact rail is now visually collapsed behind one default path: the first scan exposes one recommended share/copy action, while alternate artifact modes and heavier packaging sit behind a `More formats` disclosure.
Citation and continuity details remain adjacent but lower-emphasis, instead of repeating a second share summary around the primary artifact card.
Translation help sits beside the term it translates rather than on a separate page.
Across deeper workflow, answer, toolkit, trust, and export surfaces, the public-facing decision contract now standardizes on `Current call`, `Action now`, `Pause if`, `Resume when` and `Call changes if` as the primary scan labels.
Those four lines now come from one shared weekly-call contract rather than route-local copy assembly, so the homepage card, copy CTA, command bar, and exported operator brief stay aligned on the core call. The call-change side of that contract is `callChangesIf` (where the call changes, labelled `Call changes if`) plus, only when a stage is set, `resumeWhen` (the stage's discipline for lifting its hold, labelled `Resume when`); a stage adds the second line and never replaces the first. Shared copy/export artifacts also lead with the canonical Operating latitude from the weekly leadership summary, with tightness reserved for pause/guardrail conditions.
The weekly brief sequence now favors `Operating latitude -> current call -> operating levers -> share actions -> route handoff` rather than surfacing deep proof or team translation before the transmission surface.
The homepage global header now keeps the weekly brief calmer: it shows the direct next paths first, while the broader workspace chooser on `/` is tucked behind a collapsed `Browse workspaces` control rather than rendering as an always-open rail.
The lower homepage handoff now renders as a subordinate next-step layer instead of a second equal-weight dashboard band: one compact planning card leads, proof/trust remain visible exception checks, and replay/tool paths sit behind a collapsed optional disclosure with smaller follow-on links rather than a second open card grid.
The collapsed `Route this week's call` disclosure groups the downstream paths into Plan (capital posture, ship call), Resolve (by role, toolkits), Rule (blank decision form, reversal checklist), and Compare (past epochs, full archive), keeping them one expand away from the leading plan card.

The home page now leads with a canonical **What changed this week?** block inside the hero,
rendered by `WeeklyChangeReport` (`app/components/hero/weeklyChangeReport.tsx`). It reads as three
bands — *What changed*, *What that changes for you*, *What stays the same* — so a movement always
arrives with its consequence and a consequence always arrives with its cause. Each change opens to
its evidence: the reading, the movement, the record date, the source, and the decision areas it
drives. A week where nothing moved collapses to one sentence plus the unchanged list rather than
three headings over two empty sections.

It replaced a single revisit list that rendered `item.recheck || item.reason`, which dropped the
signal move entirely on a multi-item week — `reason` is `driver + recheck`, and `recheck` won the
`||`. `RevisitQueueItem.driver` already carried that sentence and its doc comment asks renderers
listing several items to hoist the shared driver rather than repeat it; grouping by driver is that
hoist. Movement is read from `signalIndicators`, not the queue, because `revisitDecisions` is false
whenever the direction is "stable" — a week that moved without tripping a threshold has an empty
queue and still has to say what moved. A signal whose published delta rounds to zero at the one
decimal it reports is not a change: `formatTrendArrow` returns `→` only for an exact `0`, so a
`-0.04` arrives as `↓` beside the label "-0.0 vs last week". Below-the-fold tool racks (transition
probability, regime history chart, what-if simulators, ticker, source-disagreement, evidence
drawer) were removed from `/` as surfaces that competed with the decision-attention block; their
engines stay internal (see section 8). Company context below the call is the browser-held
runway-conditioned notes panel (see section 1.1.9); the removed `CompanyMetricsPanel` "Your
numbers" widget has no successor component, only that panel and the shared operator profile.

The evidence handoff keeps trust compact on home by showing one summary plus explicit route
ownership for `/signals` and `/trust` instead of reproducing those workflows inline.
The shared report shell no longer inserts extra homepage header / command chrome ahead of the weekly card, so the canonical brief remains the first major decision block.
The planning handoff compresses the weekly action, guardrail, and finance/share summary before
deeper review in `/operate`. Historical replay now belongs to `/signals` rather than running as
an inline home interaction. Role, situation, and toolkit paths are handled as explicit downstream
surfaces after planning rather than as a parallel home workflow.
The default post-brief path is now Planning; Evidence and Trust are framed as exception checks when
the weekly call still needs proof.
Planning is now rendered as the visible next step on home, while Evidence and Trust are reduced to compact exception cards rather than a second homepage narrative.

The optional `?view=evidence` mode still renders the high-density analytical matrix with direct row
labels, embedded threshold context, and restrained accent usage for outlier conditions.

Copy strategy for briefing and onboarding surfaces favors concise, action-first language: one headline plus one support sentence before primary actions, with deeper rationale moved into expandable or secondary sections.
Route summaries and hero copy favor user-job phrasing over internal product nouns, especially on Evidence, Planning, Resolve, and Trust.

Weekly Brief URLs now emit week-specific Open Graph and Twitter preview cards. Shared links for the
current brief or a historical Time Machine selection preview the selected week’s posture, immediate
decision, flip condition, and core rate context instead of falling back to a generic site card.

Cold opens into `/` now use a share-card-aligned loading state before the full report resolves, so
social clicks land on the same action-first artifact structure rather than a generic skeleton.

### 1.1.1 Decision Hero operator shortcuts (2026-08-29)
The Decision Hero header embeds two progressive-disclosure operator shortcuts (the separate
Slack copy button and the MCP/API chip were removed on 2026-09-02: `Copy Brief` already produces
the Slack block, and developer access lives under the header's More menu):

- **PresentModeButton** (`app/components/PresentModeButton.tsx`): enters presentation mode for
  leadership syncs and Zoom meetings. Triggered by the `F` keyboard shortcut or command palette.
  `FocusModeController` restyles `[data-home-shell-main]` to a narrower column and renders
  `PresentationFrames` (`app/components/presentationFrames.tsx`) over it: the call, then the
  decisions to revisit, then what would change the call — one frame at a time, at projected type
  size, with `←`/`→` to move, `Esc` to exit, and a copyable Slack summary on the last frame. The
  frames read the published brief island rather than props, because the trigger lives in the global
  header, outside the route holding the brief; the conditions they show come from
  `briefConditionEntries`, the same list the copy formats print, so the slide and the paste cannot
  disagree. Arrow handling is registered in the capture phase — the dialog settles key events on its
  own container, so a bubble-phase listener never saw them.
- **Bounded-condition rails** (`ThresholdLadder`, fed by `buildBoundedConditionRails` in
  `lib/report/operatingCalls.ts`): one rail per composite signal in the Watch-this-week block,
  showing the current reading, the guardrail, the line that clears it, and the span where neither
  fires. Replaced `ThresholdProximityBar` on 2026-09-03, which encoded the same distance as a fill
  against an arbitrary, unstated 30-point reference and restated the counter beside it. Since
  2026-09-08 both lines come from the rule's own clause data (below) rather than being parsed back
  out of the sentences, and a numeric readout under each rail states the guardrail, the clearing
  line and the points to each; the guardrail and clears-when sentences print only when no rail
  could be drawn. The regime-flip line keeps its own row, labelled "Posture flips", because it sits
  at a different number from the rule's guardrail and used to read as a third unexplained pair.

### 1.1.1a Bounded rules are data; the sentences are derived (2026-09-08)
`BoundedDecisionRule` carries `pause` and `resume` clauses — a verb, a list of numeric
`RuleCondition`s (metric, operator, value), a join word and an optional qualifier — and
`pauseTrigger`, `resumeTrigger` and `flipConditions` are derived from them by `formatRuleClause`
(`lib/report/boundedDecisionRules.ts`). Before this the rule stored only the sentences, and three
separate regex parsers read the numbers back out of them: `parseRuleThresholdConditions` for the
rails and lane states, `parseDistance` in the CLI contracts, and the hero's rail builder. All three
are gone; `resolveDecisionLaneState`, `buildBoundedConditionRails` and the CLI's flip distances
read the conditions directly, and `WeeklyLockCommitment.flipLines` / `whatFlipsNext.thresholdLines`
carry the regime-flip lines the same way.

Every surface that printed the corridor per area now draws it once and tabulates the areas:

- **Plan, "Rules by area"** (`playbookPanel.tsx`): one rail per signal for the shared corridor
  (`buildSharedCorridorRails`), then a table of Area · Action now · Pause if · Change course if,
  where the pause and re-open cells are the lines with the distance to the nearest one
  (`formatPointsToLine`: "44 pts away", "tripped", "holds"). Five cards of three sentences each
  stated the same four numbers fifteen times.
- **Published brief** (`/brief/[week]`): records frozen from 2026-09-08 carry `scores` (both
  readings and their weekly deltas) and per-decision `pause` / `resume` lines. The page renders a
  readings row with rails and the decisions as the same table; older records fall back to the
  sentence layout. `buildPublishedBriefReadingLines` adds a `Readings:` key/value block to the
  Slack and email updates. The archive is append-only, so the 2026-w31 record keeps its prose.
- **Slack brief** (`lib/export/briefBuilders.ts`): `buildReadingLines` prints
  `Funding pressure: 32/100 · -8.0 vs last week · pause > 76 (44 pts away) · re-open < 66 (holds)`
  under the posture line, and per-area rows print lines with a distance instead of the sentence.
  `Do now` no longer falls through to `assessment.constraints[0]`, which is the operating-limits
  list printed in full further down and made the slot a verbatim copy of operating limit 1.
- **Weekly email** (`lib/email/sendWeeklyBrief.ts`): a readings row (both scores, deltas,
  confidence) in text, HTML and the Slack mirror; the regime prints as its public label, not the
  engine enum; the two static regime paragraphs are gone.
- **What-changed rows** (`weeklyChangeReport.tsx`): each moved signal is label, reading, signed
  delta with a direction glyph and a sparkline; the model's sentence survives as `sr-only` text.
- **Runway planner** (`runwayPlannerPanel.tsx`): risk, safe band, raise window and burn range are
  drawn as `RangeBar`s with the operator's own runway marked; the sentence is the caption.
- **Trust formula reference**: the regime rule is a 2x2 quadrant SVG, confidence a three-band
  ladder, and the two saturating score components small ramp plots, all from engine constants.

Three families of duplicated prose collapsed to one source each: data-state guidance
(`DATA_STATUS_GUIDANCE` in `trustStatus.ts`, read by the homepage banner, the freshness popover and
the export panel), distance-to-line (`formatBoundaryDistance` in `reportFormatting.ts`, read by the
homepage evidence list, both interpretation views and the evidence rows), and the meeting packs on
`/share`, `/operate` and the export panel, which pasted the board brief — the whole Slack brief with
the slide bullets appended — beside the Slack brief and now carry the slide bullets alone.

### 1.1.1b Wayfinding and visual weight (2026-09-08)
Every page buried its one strong graphic under text, and phones had no in-page navigation on
pages between 2,500 and 8,000px tall. The changes, per surface:

- **Shell.** `MobileSectionChips` (`app/components/mobileSectionChips.tsx`) renders the outline
  rail's anchors as a sticky, horizontally scrolling chip row below `md`, marking the section on
  screen with the same `useActiveSectionId` hook the rail uses. `regimeAccentStyle`
  (`lib/regimeAccent.ts`) sets `--regime-accent` on both shells from `REGIME_HEX_COLORS`, and
  `ReportSection`'s top rule and eyebrow, and the active chip, draw in it, so a page reads as "this
  week is Sunny" outside the hero.
- **History** leads with the phase-space plane; the month-by-month table sits inside the
  `?months=1` disclosure under the track-record tiles, and dates print as "Jul 2026" below `sm`.
- **Evidence** puts the reading-depth toggle directly under the decision summary, then the
  key-number gauges and the inversion timeline; the two twelve-month lines are a
  `SignalSparklineStrip` (current value, move over the window, series with interquartile band);
  the fossil-record table is behind a `?fossil=1` disclosure.
- **Plan** opens with the shared corridor rails (`BoundedCorridorRails`) inside the weekly plan
  step, and the rules table refers back to them; the sticky one-row strip is section navigation
  only (the checklist toggles, which did nothing but turn themselves on, were retired 2026-09-08).
- **Weekly brief** no longer carries "Decisions to reconsider" or "Close the week" (retired
  2026-09-08: each asked the reader to maintain browser-local state the product could not pay
  back). In their place, computed from data the product already holds: "Last week, in hindsight"
  (`lib/report/hindsight.ts` — last week's readings from this week's deltas, the regime lines,
  and whether either was crossed), "Since you were last here" (the call this browser last saw,
  written on every visit, compared on the next), and the five most-asked direct answers. The
  subscribe row sits directly under the hero as one promise — Monday's call, and a note the day
  it changes. The stress tester opens on three graded example plans; the cash position is an
  optional sharpener behind a disclosure. The first-visit explainer asks the stage once.
- **Trust** states system status as one five-cell strip (data, freshness, sources, confidence,
  warnings) instead of five stacked cards.
- **Resolve** renders its two link groups as divided menus with a chevron, not panels in panels.
- The Plan and published-brief rule tables carry `weather-stack-table`, which stacks rows and
  prints each cell's column heading from `data-label` below `sm`.

These sit inside the hero's action bar and secondary provenance row, following a routine-first
hierarchy: the Slack copy button is the primary visible action, while Present and developer access
are progressive disclosures. The bounded-condition rails are not — threshold distance is what the
week's call turns on, so it stays on the default screen.

### 1.1.2 Bounded decisions moved to Plan (2026-09-01)
The per-lever bounded-decision ledger no longer renders on `/`. §VIII assigns operating
guardrails to Plan, and it now ships as "Rules by area" in `app/components/appendix/playbookPanel.tsx`,
open on arrival at `/operate`. The brief keeps the call-level guardrail and reversal in the hero.

The role lens filter pills that shipped with the old homepage ledger (`All Levers | Engineering |
Hiring | Runway & Burn`) were **not** carried over and no longer exist — `/operate` lists every
area unfiltered. `ThreeWhethersCard` / `ThreeWhethersCardClient` sat unrendered from that move
until they were deleted.

### 1.1.3 Board Governance Annex export (2026-08-29)
The `/history` page now includes an `ExportBoardAnnexButton`
(`app/components/history/ExportBoardAnnexButton.tsx`) in the header action bar. One click compiles
multi-quarter regime history and bounded decisions into an auditable Markdown memo suitable for
board packets and governance documentation. Also available via `Cmd+K → Export Board Governance Annex`.

### 1.1.4 Command palette and keyboard shortcuts (2026-08-29)
The command palette (`Cmd+K`) now includes quick actions beyond navigation:
- `Copy Slack brief` (shortcut: `C`)
- `Toggle focus / present mode` (shortcut: `F`)
- `Add Monday calendar reminder`
- `Export Board Governance Annex`
- `Agent & MCP setup`
- `Share brief` (shortcut: `⇧S`)
- `View history & track record` (shortcut: `H`)

Plus navigation commands for all primary and supporting routes. The `HelpModal` (`?` shortcut)
documents the full keyboard shortcut set including section navigation (`j`/`k`), route shortcuts
(`e`/`p`/`h`/`t`/`r`), and the new action shortcuts.

### 1.1.5 Calendar ritual integration (2026-08-29)
`SubscribeForm` (`app/components/SubscribeForm.tsx`) now offers a Google Calendar Monday Ritual
Hold option alongside the email subscription. The CTA generates a recurring Monday 9:00 AM calendar
event with a link back to `https://whether.work`, giving operators a weekly ritual trigger without
requiring an email subscription.

### 1.1.6 Heading copy pass (2026-09-02)
Every h1–h4, eyebrow, and section label in `app/` was inventoried and rewritten against the six
heading rules now in `docs/editorial-guardrails.md` → Headings (reader's words, eyebrow classifies
/ heading states, no restating the host, sentence case, one name per thing, counts in a badge).
What changed for operators:
- `/`: the staleness panel's h2 is "Decisions to reconsider" with the count in a badge (was
  "N DECISIONS NEED ATTENTION", asserted even at zero); the plan tester is "Plan stress test" here
  and on `/operate` (was "Instant Plan Red-Team" / "AI Plan Stress-Tester").
- `/operate`: the Share, Rules, Test, and Brief steps pass `hideHeader` to their inner
  `ReportSection` (ids and sr-only headings kept), so each step carries one visible heading before
  its panel. Panel headings are plain English: "Pick a format and copy", "Briefs for each
  audience", "Decision check / Is this move safe right now?", "Compare two plans", "Memos by
  executive role", "What operators have asked for next". The escalation block's eyebrow and h2
  swapped ("Decision help" / "Still have one open question?"); the `decision help` smoke marker
  still renders.
- `/signals`: "Closest past cycle" with plain labels replaces the emoji-led analog block; the bare
  "Trends" eyebrow is a heading naming both series.
- `/trust`: h1 "How much to trust this week's call" (was "Forecast confidence"); the two "Source…"
  sections are "Sources and last update" and "Cite this call"; the trust board's lanes are "What
  you can approve" and "Data reliability".
- `/history`: one h1 (the shell's); "/history/compare" says period, not epoch, in sentence case,
  and reads its slot labels from `DECISION_CONTRACT_LABELS`.
- Shared: "Decision contract" → "This week's bounded call"; "Continue decision flow" → "Where to
  go next"; the mobile drawer group is "Product"; the IA label is "Compare periods".
- Guardrails: Invariant 8 (slot labels) now matches case-insensitively, which also moved the
  weekly email, decision alert, and share-image labels onto the constant; Invariant 9 fails on
  any retired heading term returning to `app/` or `lib/`.

### 1.1.7 One stage, one profile, honest empty states (2026-09-06)
An audit of every place the product asks the operator to type or choose something found the
assumptions optimistic in three ways, and this pass fixed each:

- **Stage was five vocabularies that never read each other.** The settings cookie (pre-seed …
  public), a `/api/config` route writing the same cookie from a different list, the hero's
  `?stage=`, the runway planner's own select, and the stress test's lifecycle dropdown. Now
  `lib/report/operatorStage.ts` is the one answer set (Seed / Series A / Series B+ /
  Bootstrapped, the hero's four) and the one cookie. The settings panel, the hero selector, the
  runway planner, and the Decision Shield on `/operate` all read and write it; the assembler
  uses the cookie as the brief's stage when the URL names none (`tests/homePageAssembler.test.ts`);
  the plan stress test on `/` takes the hero's stage as a prop and no longer has a select of its
  own. Legacy cookie values read as unset rather than as a guess. `/api/config` is deleted.
- **Rate sensitivity was stored and applied nowhere.** The settings panel promised it "adjusts
  operating knobs"; the two functions that would have applied it had no callers. The setting,
  the cookie field, and the functions are removed rather than given a consumer the product has
  not asked for (see AGENTS.md on speculative personalization).
- **Numbers were typed in for the reader.** The runway planner and the `/operate` stress test
  opened on fictional companies (including a 75% gross margin no control exposed, which could
  turn RISKY into SAFE). Both now start empty and say what to enter; runway, burn, revenue, and
  growth live in one browser-held profile (`lib/operatorProfile.ts`, `whether.operatorProfile`)
  that the planner and both stress tests share through `OperatorProfileNumberField`, which
  validates on blur, commits on parse, and treats blank as "not given".
- **Dead capture paths removed.** `useCrossDeviceSync` (no call sites), `useDecisionHistory` +
  the history page's "Decision archive" (nothing ever wrote the key it read),
  `lib/report/companyMetrics.ts` and `lib/sensitivityCoefficient.ts` (no product callers), and the
  unused entries in `lib/storage/keys.ts`.
- **`/api/sync` went too (2026-09-17).** It was kept at the time — "stays, tested, with no client" —
  and a tested endpoint with no client is not a dormant feature, it is a live one nobody reads. It
  accepted an unauthenticated POST, scoped by a caller-chosen id and a caller-chosen secret, and
  wrote 24KB of reader state into KV with no rate limit and no TTL. Its two permitted keys
  (`whether-company-metrics`, `whether-decision-log`) named the module deleted in the line above and
  a key nothing has ever written. `/privacy` 2.4 says everything other than recorded decisions
  "stays in your browser and is never sent", which was true only because nothing called it.
- **Subscribe no longer succeeds without mail.** Without an EMAIL binding the adapter stubbed
  `ok: true`, so production told subscribers to check their inbox for mail that never left. In
  production a missing binding is now a failed send with a named reason
  (`tests/emailDeliveryStub.test.ts`).

### 1.1.8 The base rate is named as the series that is read (2026-09-06)
`getBaseRate` falls through to the one-month bill on every render — nothing populates
`fedFunds` — and 2026-09-03 already fixed the provenance half of this (the phantom DFF endpoint
went, and `TREASURY_SOURCE_LABEL` now names the four series actually fetched). Two surfaces still
called the reading "the Fed rate":

- `buildSensorBullets` in `lib/decisionShield.ts` produced "The Fed rate is 5.20%…", and
  `buildShareText` copies those bullets verbatim into the block operators paste into a thread or a
  board doc, so the misnaming travelled past the screen it was written on.
- `buildRegimeInputs` labelled the input "Policy base rate (1M)" — a policy-rate claim that then
  admitted in parentheses it had read a bill.

`BASE_RATE_SOURCE_LABELS` (`lib/regimeEngineCore.ts`) is now the one place that names the reading,
and both surfaces use it: "The 1-month Treasury bill is 5.20%…". The `FED` entry exists so that
wiring DFF renames the surface rather than leaving it wrong in the other direction.
**Wiring DFF is deliberately not done here** — `treasury/treasuryClient.ts` says that is a live
change to the published call and belongs to whoever owns it; naming what is read is not.
Covered by `tests/baseRateNaming.test.ts`. Entries already written into
`data/posture_archive_index.json` keep the old label: the archive is never edited after
publication, so a past call reads the way it did when it was made.

### 1.1.9 Pages that were halves of one page (2026-09-06)
A route-set pass against the IA boundary rules found three consolidations worth making, and one
that looked worth making and was not.

- **`/threshold` folded into `/trust#framework` (2026-09-08)**, beside the formula its thresholds
  come from; it had no inbound link from any primary surface. Before that,
  **`/template` folded into `/threshold`.** `/threshold` explained the bounded-decision framework —
  action, threshold, reversal — and `/template` was a printable blank form asking for exactly those
  three parts. Each ended with a "next steps" row whose first suggestion was the other one. The form
  is now the `#template` section of the framework page, `/template` is a permanent redirect to that
  anchor (`iaConsolidationRedirectPairs`), and the two utility-nav rows became one. Nobody wants the
  form without the explanation, and the explanation's payoff is filling one in.
- **`/mockups/identicons` and `/mockups/visual-system` deleted.** 537 effective lines of WebGL and
  design experiments, noindex but publicly reachable and rebuilt on every deploy, referenced by no
  spec. `/mockups/operator-brief` stays: `docs/one-screen-weekly-brief-spec.md` cites it as a design
  reference.
- **`/state` now says it is a view of the brief.** It calls `assembleHomePage` — the weekly brief's
  own pipeline — and renders a subset of the hero, so presenting the call under its own H1 read as a
  second, independently-derived answer. It also credited "Yahoo Finance" as a data source; Yahoo is
  read only by `lib/saasMultiples.ts` for the SaaS comps on `/comps` and contributes nothing to the
  two scores on that page. The line now reads "U.S. Treasury · FRED".
- **`/share` was left alone**, against the first read. `ShareRail` is reachable from a visible
  control (the profile sheet's "Share brief"), so the page is not the only discoverable path — but
  `/share` is server-rendered, indexed, and already the redirect target for `/export` and
  `/export/board-packet`. Deleting it drops an indexed page and orphans two redirects for no reader
  gain. The duplication that remains is component-level: `ShareCopyControls` and `ShareRail` build
  the same artifacts from the same `lib/export/briefBuilders`. That is the smaller follow-up.

Covered by `tests/pageConsolidation.test.tsx`.

### 1.1.10 Copy controls that reported a copy that did not happen (2026-09-06)
A component-layer pass after the route consolidation. Eighteen surfaces route clipboard writes
through `useClipboardCopy`, which separates "clipboard unavailable" from "write failed" and drives
the "Clipboard blocked — select the text" fallback. Five hand-rolled `navigator.clipboard` instead,
and two of those five asserted success they had not checked:

- `shareBriefButton` — the `Copy Brief` control in `DecisionHero` and `CadenceCallCard`, i.e. the
  homepage hero — ran `void navigator.clipboard.writeText(text)` inside a try/catch and then set
  `didCopy` unconditionally. `void` discards the promise, so a rejected write is an unhandled
  rejection rather than a synchronous throw: the catch could never fire. The brief people paste into
  Slack reported "Brief Copied" whether or not anything reached the clipboard.
- `ExportBoardAnnexButton` on `/history` had the identical shape and the same unconditional
  `setCopied(true)`.

Both now go through the hook and show a failure state; `tests/clipboardFailureReporting.test.tsx`
pins the call shape, because the defect is the shape rather than the rendered output. The remaining
three hand-rollers are deliberate and listed in that test: `CopyMeetingSlideButton` writes rich HTML
via `ClipboardItem`, which the hook does not cover, and `/share` and `/embed` predate the hook and
handle their own failure paths.

### 1.1.11 The share panel copied a blurb about the product, not the brief (2026-09-07)
`ShareRail` is the format picker DD-005 names, mounted once from `app/layout.tsx` so a panel opened
anywhere is the same instance. That global mount is also why it had no brief: it sits outside the
route's props. What it copied instead:

- **"Plain text" and "Slack format"** both emitted a fixed marketing sentence plus a URL
  (`"This week's macro brief — posture, decisions, and evidence."`). No call, no record date, no
  bounded conditions, no source. The one control named for transmitting the brief transmitted none
  of it.
- **"Decision card"** read `document.querySelector('[data-share-section="decision"]')`. No component
  in this app sets that attribute, so the control only ever copied its own fallback string,
  `"Decision card not found on this page."`
- There was **no preview**: the reader chose a format blind.

`lib/report/briefArtifact.ts` now holds the week as one `BriefArtifact` with three renderings —
Slack, Slide, Citation. A format may reorder or re-mark fields but may not drop the record date, the
bounded conditions, or the provenance line; `tests/briefArtifactFormats.test.ts` asserts that
across every format rather than per format, so a fourth inherits the rule. The provenance line
carries the snapshot state too: a brief pasted during an upstream outage says
`cached snapshot, not a live read` in the channel it lands in, not only on the page it came from.

The route publishes the object as a JSON island (`BriefArtifactScript`, read by `useBriefArtifact`),
which keeps the single global mount and replaces the DOM scrape with structured fields. Routes with
no weekly call render no island, and the panel falls back to the generic blurb — which is honest
there, and is why the presets now render only in that case.

Two things the live data surfaced:
- `call` and `actionNow` hold the same sentence on a week with no stage-scoped action, so the block
  printed it twice, once as `Operating call` and once as `Do now`. `DecisionHero` already suppressed
  the second line on exactly this test; the formatters now apply it too.
- The **citation** format refuses to imply a permanent record when none exists. `/` re-renders each
  week under one URL, and `data/published_briefs.json` holds one record and is deliberately never
  backfilled, so the no-permalink branch is the common case: it cites the live page and says the
  address re-renders, rather than minting a stable-looking reference.

### 1.1.12 One weekly call, four models of it (2026-09-08)
A follow-up to 1.1.11, which fixed the share panel and in doing so added a fifth family of
formatters. The export layer holds nine modules and ~1,370 effective lines, and the weekly call
had four independent input models: `briefBuilders` takes `(assessment, treasury, sensors,
macros)`, `weeklyOperatorBrief` takes an operating-snapshot payload, `meetingSlideExport` takes a
`MeetingSlidePayload`, and `briefArtifact` takes the presentation model. Four Slack builders, two
citation builders, three board/slide builders.

**Only the presentation half was unified, deliberately.** `buildSlackBrief` feeds
`scripts/generateWeeklySlackBrief.ts`, and `buildCallCitation` feeds `weeklyBriefSnapshot` — both
write into the published, citable archive, which is append-only. Changing their output is a
product decision about published records, not a refactor, so they are pinned where they are. What
merged is the part with no such constraint:

- The share panel's "Slide" format and `CopyMeetingSlideButton` were emitting two different
  markdown blocks for the same week. The panel's carried the resume thresholds and a link; the
  button's carried neither. Both now compose `formatMeetingSlideMarkdown` through
  `briefArtifactToSlidePayload`, so the meeting slide gained the clears-when line it was missing
  and the snapshot marker. `tests/briefArtifactFormats.test.ts` asserts the two are byte-identical.
- The slide model had no field for the call, only `actionNow`. Mapping one onto the other dropped
  the headline whenever they differed, so the payload gained a `call` that renders as a stance line
  above the action — and is omitted when the two hold the same sentence.
- `DecisionHero` assembled a twelve-line `MeetingSlidePayload` literal at the call site, with its
  own fallback copy for the pause and reversal lines: a second definition of the week beside the
  route that publishes it. `CopyMeetingSlideButton` reads the island instead, and a test pins that
  the hero assembles no export payload of its own.

### 1.1.13 The week closes with a record, not a checkmark (2026-09-08)
`RitualCheck` ended the weekly review with "Mark reviewed", four dots and a flame streak.
`docs/adoption-driven-change-plan.md` had already called that weak gamification. It is replaced by
`app/components/weeklyCloseout.tsx`, which asks what the meeting answers — what did you change,
what are you watching — and stores it with the readings at the moment of closing.

The following week it reopens that record and sorts it against the queue: `flaggedAgain` is an area
the operator changed last week that the model has queued again, which is the one thing a weekly
ritual can catch that nothing else does; `settled` is one that held; `drift` says how far the
conditions have moved since. The streak became a coverage line, which still means something after a
missed week. `lib/report/weeklyCloseout.ts` owns the comparison so it is testable without a DOM.

The device-scope line is the other half. Of eleven localStorage-backed surfaces, five said where
the data lived and six did not — including this one, directly below `DecisionStalenessPanel`, which
does. Two adjacent panels, same storage, one disclosure.

### 1.1.14 Two panels that were one change from failing the budget (2026-09-08)
`exportBriefPanel.tsx` (752 effective lines) and `evidenceSections.tsx` (747) both sat within fifty
lines of the 800-line `max-lines` budget on `app/**`. A file that close to a ceiling gets its next
change made under pressure to shrink rather than to improve.

`exportBriefPanel` was one component function with no internal seams. DD-015 proposed splitting it
at "six sibling blocks"; the sibling blocks were not the repetition. The repeated pieces were, and
they are now `exportBriefFields.tsx`: the two-column `ExportTargetGrid`, the read-only
`ExportPreviewPane` (twice), the `ExportDownloadButton` (nine times, each repeating the same
forty-character class string and the same arrow wrapper), and the override form — whose four
`useState` hooks became one `OverrideDraft`, with `isOverrideComplete` naming the rule that a
partial override states a deviation without saying who owns it or what would reverse it. 752 → 650.

`evidenceSections` was seven independent exported sections sharing two helpers. Split into
`evidenceSectionShared.ts` (the label map and the bullet-chart geometry),
`evidenceDecisionSummary.tsx` (the largest section), and the remaining five. 747 → 463.

Neither is a redesign: labels, classes and copy are unchanged, which is what makes the split
reviewable.

Also collapsed, same pass:
- The summary-card chain was four links — `MonthlySummaryCard` → `CadenceSummaryCardAdapter` →
  `CadenceSummaryCard` → `SummaryCard`. `CadenceSummaryCard` forwarded three props and added
  nothing, and the adapter's two arms rendered the same card: the props the second arm passed extra
  (`companionHref`, `sectionBuilder?.(summary)`) are already `undefined` in exactly the case the
  first arm handled. The wrapper is deleted and the branch is one call.
- `app/components/ParametricGraphic.tsx` deleted — 60 lines, no reference in app, lib, tests,
  scripts, or docs.

**Method note.** A first scan for unimported components flagged four `/signals` panels
(`timeMachinePanel`, `signalVisualizationSuite`, `regimeTimelinePanel`,
`advancedThresholdsSection`, ~1,050 lines). All four are live: `evidencePagePanels.ts` loads them
through `next/dynamic`, which a filename-based import search does not see. Check by exported symbol
before deleting a component.

**Resolved 2026-09-07:** the generic cadence layer is gone. Only `monthly` ever reached
`CadenceSummaryCardAdapter` — `monthlyActionSummaryPanel` was its one caller — and the `weekly`,
`quarterly` and `yearly` entries in `summaryCardCadences.ts` were exercised only by that adapter's
own test, which made the test the sole thing keeping three unrendered cadences alive. The API routes
for those cadences serve their data without rendering this card, so the layer was scaffolding for
surfaces that do not exist. `MonthlySummaryCard` now renders `SummaryCard` directly with its
sections inline; `cadenceSummaryCardAdapter.tsx` and `summaryCardCadences.ts` are deleted, and
`tests/monthlySummaryCard.test.tsx` keeps the monthly assertions that had a surface behind them
(section order, the `/api/monthly` link, the raw copy block, provenance). The chain that began this
pass at four links is one component and one card.

### 1.1.11 Modes and settings that changed nothing (2026-09-07)
A settings-layer pass, tracing every mode and toggle in the product to whatever was supposed to
consume it. Four did not reach one.

- **TV / kiosk display mode is deleted, subsystem and all.** Settings offered "Auto" and
  "TV / Kiosk" under the promise *"Larger text and buttons for screens across the room."* It wrote
  `whether-display-mode` to `localStorage` and set `data-display-mode` on the root element, and no
  stylesheet in the repo has ever selected on that attribute or on `data-display-preference`. The
  choice persisted, the pill highlighted, "Saved" appeared, and nothing resized. The tell sits in
  the same bootstrap script: three lines after writing `data-display-mode` it injects a `<style>`
  element so `data-home-orientation-dismissed` has a reader. One attribute got its consumer; the
  other never did. Four further modules existed to serve the mode and three of them never
  executed — `displayModeManager` (~180 lines) and `displayGuardian` (~145: burn-in pixel drift,
  screen wake lock, idle auto-refresh) mount only under `ambientMode="tv"`, which no caller ever
  passed, and `displayModeToggle` renders only inside a `tv-action-rail` gated the same way. The
  `.tv-action-rail` and `.tv-rail-safe` classes had no CSS rule either. Deleted: those three
  modules, `tests/displayModeManager.test.ts` (172 lines testing a module that never mounted), the
  `ambientMode` prop chain through `pageShell` and `reportShell`, the Settings fieldset, and the
  `displayMode` entry in `lib/storage/keys.ts`, whose own doc comment promises every key has a
  reader and a writer. The layout bootstrap keeps the orientation half that always worked, and
  `tests/persistedUiBootstrap.test.ts` now pins the absence of the display half.
- **`/embed`'s company stage offered two options the API rejects.** The picker listed `seed`,
  `series-a`, `growth` and `public`; `isOperatorStage` accepts `seed`, `series-a`, `series-b` and
  `bootstrapped`. So `growth` and `public` resolved to `companyStage: null` — a stage-agnostic
  brief — while `stageLabel` carried the raw parameter through, so the widget could name a stage the
  brief had not been calibrated for. The two stages that do work were not offered at all. The picker
  now derives from `OPERATOR_STAGE_OPTIONS`, and a shared `parseOperatorStageParam` folds the legacy
  `growth`/`public` values into Series B+ so snippets already embedded in newsletters keep working.
  Label and calibration now come from one parse, and the HTML embed shows the stage in its meta line
  because it can only show one that was applied.
- **The literacy-assist key table is deleted.** `visitorStrip` read `whether.literacy.focus` to pick
  one of four heading/subtitle pairs and a set of impact links. Nothing wrote that key, and the
  `focusImpactLinks` prop the focus also selected was passed by no caller — so every visitor has
  always seen the `decision` pair and the default links. The other five keys
  (`decisionHelp`, `evidenceHelp`, `trustHelp`, `shareHelp`, `whether.artifact.mode`) were neither
  read nor written anywhere, and `artifactModeLabels` was exported and unused. `lib/literacyAssist.ts`
  is gone; the strip renders the copy it always rendered. The telemetry union went with it:
  `OperatorWorkflowEvent` carried `assist_panel_opened` and `artifact_mode_selected` variants typed
  against those modes, validated by `/api/telemetry/[stream]`, with no emitter — the one caller of
  `trackOperatorWorkflowEvent` sends `route_transition`. A validator that accepts events nothing
  produces reads as coverage of a feature that was never built.
- **Alert channel toggles kept the checkmark on a failed write.** The POST to
  `/api/alert-preferences` was fire-and-forget behind a `.catch()` that preserved the optimistic
  flip, and a 4xx or 5xx resolves rather than throwing, so it never reached that catch either. The
  panel's copy is honest about delivery ("Push delivery is not live yet… nothing is sent from here"),
  so what was at stake was only whether the channel was recorded — but it is the same shape as the
  copy buttons in §1.1.10. The request moved to `app/components/alertPreferenceRequest.ts`, which
  returns a boolean the caller must act on; a failure reverts that one channel (not the whole
  snapshot, which would undo a concurrent toggle) and says the save did not land.

Covered by `tests/persistedUiBootstrap.test.ts`, `tests/embedRoute.test.ts`,
`tests/telemetryDynamicRoute.test.ts`, and `tests/alertPreferenceRequest.test.ts`.

### 1.1.12 Alert mail that could not reach anyone (2026-09-07)
Follow-up to §1.1.11, after tracing the alert channel toggles past the UI into the delivery
path. The toggles were not merely awaiting a delivery path — they wrote to a keyspace the
existing, working one could not route.

- **The record could never resolve.** The panel keyed preferences on
  `usePersistentClientId()`, a `crypto.randomUUID()` in `localStorage`. The cron path did
  read them: `listAlertSubscribers` collected every `alert-pref:*` record with
  `email: true`. It then called `resolveRecipientEmail(clientId)`, which accepts only a
  **subscriber token** — issued at subscribe time and reaching nobody but that
  subscriber's own inbox, as the `?token=` on the verify and unsubscribe links. A device
  UUID is never a token, so every record the panel wrote was counted and then skipped.
  `alertDelivery.ts` said as much in a comment — "no surface writes these records" — which
  had stopped being true when the panel started writing them. The one test that showed
  delivery working enrolled *by token*, which no product surface could do.
- **The opt-in moved onto the subscription.** `Subscriber` gains `alerts: boolean`;
  `subscribe(email, { alerts })` records it; `listAlertSubscribers()` returns active,
  verified subscribers who opted in. Consent now lives beside the verified address, which
  is the only place the delivery path was ever willing to accept it. Records written
  before the field existed read as `false` (`hydrateSubscriber` tests `=== true`, not a
  truthy check), so the migration enrolls nobody.
- **Both subscribe surfaces ask.** `SubscribeForm` and the settings panel offer "Also
  email me when the regime changes between Mondays", default off, and
  `requestSubscription` sends `alerts` only when it is an explicit boolean — an omitted
  value leaves a standing choice alone rather than switching it off. `/api/email/subscribe`
  applies the same rule, so no non-boolean truthy value can be read as consent.
- **Every outgoing email now carries an unsubscribe link.** `/api/email/unsubscribe` has
  always worked and nothing linked to it — not the alert templates, and not the weekly
  brief, which has been sending without one. Enabling a second stream without that link is
  exactly the harm `resolveRecipientEmail`'s own doc comment warned about, so
  `buildUnsubscribeUrl` threads the token into both footers. `EmailRecipient` carries the
  token for the weekly brief; a missing token yields no link rather than a broken one.
- **Deleted:** `lib/storage/alertPreferenceRepository.ts`, `app/api/alert-preferences/route.ts`,
  `app/components/alertPreferenceRequest.ts`, and the panel's three toggles. Slack and
  webhook are not deferred — there is no adapter for either, and the panel now says so
  instead of offering them. It points at `/#subscribe`, which is a real anchor as of this
  change; it was not one when the link was first written.

Also in this pass: `lib/report/imageBriefSearchParams.ts` gated stage on `isOperatorStage`
in two places, so `?stage=growth` on `/api/image/brief` or a shared brief link serialized
through and was then dropped — the same defect §1.1.11 fixed in `/api/embed`, still live
one route over. Both now use `parseOperatorStageParam`.

Covered by `tests/alertDelivery.test.ts`, `tests/alertsPanelClaims.test.tsx`, and
`tests/imageBriefSearchParams.test.ts`.

### 1.1.13 Controls at the wrong layer of parentage (2026-09-07)
A pass over every control whose effect leaves the container it sits in. Three did.

- **A page reload was rendered eleven times, each looking panel-scoped.**
  `DataProvenanceStrip` carried a "Refresh" pill titled *"Request a fresh snapshot
  for this provenance context"*, whose implementation is `window.location.reload()`.
  The strip mounts at eleven call sites — `decisionShieldPanel`, `exportBriefPanel`,
  `executiveBriefingPanel`, `playbookPanel`, `financeStrategyPanel`, both
  `ReferencePanels`, `timeMachinePanel`, `thresholdsPanel`,
  `advancedThresholdsSection` and `TrustBlocks`, with `showProvenance = true` the
  default on six — so a single `/operate` or `/signals` view showed several of them,
  each reading as scoped to the panel around it, all reloading the document and
  discarding unsaved plan text and planner inputs elsewhere on the page. The title
  was wrong twice over: a reload re-renders the same materialized model and requests
  nothing. The strip is now what its name says, and the control lives only on
  `LiveDataFallbackAlert`, where the page is genuinely the unit being retried.
  `ManualRefreshButton` also lost a `successLabel` ("Updated just now") and its 8s
  clearing timer, neither of which could ever render: `isRefreshing` is set true in
  the handler and never cleared, so the ternary could not reach the success arm.
- **Present mode sat in the hero's artifact row.** `DecisionHero` ran
  Copy Brief · Copy Meeting Slide · Track in Memory · Present under a comment reading
  "One copy control per artifact". The first three act on the brief; the fourth
  changes the page's display mode by rewriting `[data-home-shell-main]`. Display
  modes belong beside theme and settings in the global header, which is where this
  app already puts them, so that is where it went — icon-only to match its new
  siblings, and rendered only on the home brief, because focus mode targets a
  landmark that only `Shell` renders. It stays reachable from `F` and the command
  palette, which were always the right layers.
- **The share rail had two mount points at different depths.** `GlobalShareRail` is
  mounted once from `app/layout.tsx`; `profileSheet` rendered a second `ShareRail`
  inside its own dialog — an overlay within an overlay, leaving the sheet mounted
  behind it and returning the reader to the sheet rather than the page on close. The
  sheet now closes itself and dispatches, as the command palette already did. The
  event name moved out of two string literals into `openShareRail`.

**Checked and clean**, so the list above is a result rather than a filename scan: no
nested interactive elements anywhere; no invalid block-in-`<p>` nesting (the one
`<button>` inside a `<p>` is valid — `button` is phrasing content); `FreshnessDot`'s
absolute dropdown sets `relative` on its own wrapper and mounts at page top level.
`exportBriefPanel` puts a Tailwind `shadow-lg` on a nested `weather-surface`, which
looked like a §XIII elevation violation and is not one — neither `surfaces.css` nor
`globals.css` uses `@layer`, so the depth ladder's `:is(…) :is(…)` selector (0,2,0)
outranks `.shadow-lg` (0,1,0) and zeroes it. The class is dead weight, not a floating
box. The remaining offset shadows sit on portaled popups and dialogs, or are
zero-offset halos, which §XIII allows as emphasis.

Covered by `tests/pageScopedControls.test.ts`.

### 1.1.14 Header, nav and footer, looked at rather than reasoned about (2026-09-07)
A screenshot pass over the global chrome — `bun run ui:iterate` plus header/footer crops at
430px and 1600px, before and after. Four of the five findings were only visible in a picture.

- **The route named itself twice or three times.** On a report route the header printed the
  route beside the wordmark, again on the nav trigger below `md`, and again as the active
  item in the nav row above it — "Evidence" three times inside 130px. §XI's rule against
  restating route state before the first task block. The span beside the brand is gone; the
  route is named where the navigation that sets it lives. The trigger's label, previously
  hidden below 400px because the span already carried it, now shows at every width.
- **Two adjacent buttons, one destination.** `primaryNavigationLayers` holds exactly one
  layer — the weekly brief at `/` — so `resolveReportHeaderUtilityAction` fell through on
  every report route to `{ href: "/", label: "Home" }`, rendered as a pill beside the
  `Weekly Brief` CTA that `resolveReportHeaderNextStep` also points at `/`. A matching layer
  would have been no better: it would link to the page the reader is on. The slot now returns
  null unless it names somewhere the primary action does not, and the caller renders nothing.
- **The right edge was a strip of identical squares.** Each header control carried its own
  border and fill — five of them on the home brief once Present moved up in §1.1.13 —
  competing with the cadence segmented control beside them for the same "bordered group"
  reading. One container now owns the border; the buttons are hairline-divided cells.
- **The footer had no brand and three anonymous centred rows.** Twenty-four links, ranked by
  nothing, on the second-most-common surface a reader checks to find out what a product is.
  It now opens with the wordmark and `canonicalPositioningLine` — the same sentence the
  metadata ships, so it cannot drift — beside two labelled groups derived, as before, from
  `navigationLayers` and `utilityLinks`. The lists wrap horizontally on mobile and stack on
  `sm`, which was worth measuring: a plain vertical list gives every link its own 44px row and
  took the mobile footer from ~400px to 1028px before the reflow brought it back to 664px.
- **The legal row stranded its separators.** `<span>·</span>` siblings are text nodes, so they
  wrap like any other, regularly leaving a dot at the end of a line. Moving them to a CSS
  `::before` only moved the defect — the item that lands first on a wrapped line still carries
  one, which the after-shot showed. They are gone; spacing separates six items well enough and
  cannot wrap badly.
- **The keyboard hint strip rendered after `</footer>`**, so it floated under the copyright
  attached to nothing. It sits inside the footer's bottom row now.

Two review-bot findings on the first pass, both real and both fixed in the same PR:

- **"The nav names the route" holds for six routes and no others.** Dropping the label beside
  the wordmark left `/pricing`, `/about`, `/brief/<week>` and `/resources/...` showing the
  wordmark alone on desktop: no loop link is active there, the mobile trigger is hidden from
  `md`, and a matching utility link sits inside the closed More menu. (Since 2026-09-09 the six
  loop layers render as underlined tabs at `md+` with their one-key shortcut on hover, More holds
  only the utility links, and below `md` a fixed bottom tab bar — Brief, Plan, Evidence, Search,
  More — carries the loop; the cadence control lives in the brief.) `hasVisibleActiveNavLink`
  now gates the label, so it returns for exactly the routes the navigation does not mark —
  `/history/compare` included, since `compare` is filtered out of the loop links.
- **The grouped icon cluster clipped its own focus rings.** `overflow-hidden` cut the top and
  bottom off the theme toggle's ring: `.weather-pill:focus-visible` draws an outward 2px
  outline plus a halo from unlayered CSS, which outranks any Tailwind offset utility, and
  `PresentModeButton` had no offset at all. The group rounds through its end cells instead, so
  nothing clips and a child added later cannot silently lose its ring. Verified in the browser:
  computed `outline-offset: -2px`, group `overflow: visible`.

Not changed, and worth naming: the home brief still spends a second full band on the cadence
chips, ~240px of chrome on a 430px viewport before any content. Narrowing that is an IA
question about whether monthly and quarterly deserve top-level persistence, not a styling one.

### 1.1.15 What the removal audit could not justify keeping (2026-09-14)

A justified-removal pass over the remaining UI. Four removals, two repairs:

- **`WhatCouldChangeCard` is gone from `/`.** Its first two items restated the hero's flip
  conditions and bounded-condition rails — the same two thresholds at lower fidelity — and its
  third item ("further macro deterioration raises financing costs") was evergreen. The band-02
  grid is two cards now (`KeyDriversCard`, `ActionsThisWeekCard`).
- **`ActionsThisWeekCard` stays and its copy list was repaired.** The card is the homepage's only
  per-area action surface and the only place `Do now` rows deep-link into `/operate#lever`, so it
  is not a duplicate of the hero's lane-level ledger. Its clipboard write was hand-rolled with a
  swallowed failure; it now goes through `useClipboardCopy`, shows `Copy failed`, and tells screen
  readers (pinned in `tests/clipboardFailureReporting.test.tsx`).
- **The cadence selector scrolls to the card it controls.** The selector sits below the fold by
  contract (the home render-contract test pins its position), while the monthly/quarterly call it
  renders appears above the fold in `#weekly-call` — a change moved content only where the reader
  could not see it. Selection now scrolls to that section, honoring `prefers-reduced-motion`.
  Whether monthly and quarterly deserve a slot on `/` at all stays the open IA question from
  §1.1.14; no cadence telemetry exists to settle it, so it is a product decision, not a measurement.
- **The sticky call strip's `Jump` menu is gone.** It listed the same five anchors as
  `BriefSectionNav`, on the same page, at the same widths. The strip keeps the call, the copy
  control, and the image download.
- **`CompareStrip` deleted.** It was exported with no render site anywhere in `app/`; the only
  remaining trace was a render-contract line asserting its old `autoExpand` prop, which went too.
- **`/mockups` index deleted.** One mockup remained, so the index was portal chrome around a single
  destination. `/mockups/operator-brief` stays — the one-screen weekly-brief spec cites it — behind
  the same preview-gated layout, and the UI-capture set no longer photographs the index.

### 1.1.16 Decision latency and runway-conditioned notes (2026-09-14)

Two additions that answer questions the bounded rules themselves do not: *when does acting this
week actually bite*, and *what does my own cash position change about the call*.

**Decision latency** (`lib/report/decisionLatency.ts`). Every canonical bounded rule now carries a
`latency` (`effectLandsLabel`, `reversalLabel`) — when the action is felt and what unwinding costs,
as properties of the lever rather than the regime. A hire lands in 4–6 weeks whether funding
pressure reads 40 or 80; the regime sets the call, latency states what acting on it commits you to.
`buildActionStripItems` surfaces it as `latencyLine`, and the rules-by-area table (Planning, and the
home appendix context) prints it as a sub-line under the area label. The field is optional on the
type because hand-built rules in tests and fixtures legitimately omit it; the canonical builder
always sets it.

**Runway-conditioned notes** (`lib/report/runwayConditionedNotes.ts`, `app/components/RunwayConditionedNotes.tsx`).
The weekly call on `/` was company-agnostic: the operator profile (runway, burn — browser-held,
shared with the runway planner and both stress tests) never reached the canonical surface; the
`?view=company` interpretation layer is band-based and illustrative by default. These notes close
that gap under the same translation-only contract: they render below the weekly call once the
operator has given a runway figure, never restate a threshold number, and never mutate the call,
lane states, or confidence. A note states a consequence of the corridor, never a directive and
never an alternate action or re-open condition — no "check this lane first", no "until runway
clears a year" (2026-09-14 review fix, pinned in `tests/runwayConditionedNotes.test.ts`). Band
thresholds follow the profile's existing boundaries (critical < 6, tight < 12, long ≥ 18 months);
burn-cut extension math is derived from the operator's own months (a 10% cut stretches runway by
roughly a ninth of it), not a flat claim. Blank means not given — a missing runway never reads
like zero, and readers without a figure see a canonical brief. The panel renders on live briefs
only: under a Time Machine selection it is omitted entirely, because the profile holds the
operator's runway as of today and combining it with an archived regime would date the company's
cash position to the archived week.

**Same round, follow-through.** Latency now travels into the exports: the per-lever bullets in the
Slack/board briefs and the `Decisions` section of `/brief.md` print a `Timing` line
(`DECISION_CONTRACT_LABELS.timing.latency`), omitted for rows without latency rather than printing
a placeholder. Each action-strip row also carries an `ownerLabel` (`businessAreaOwner` in
`decisionKnobs.ts` — VP Eng / CEO / CEO + Finance lead / VP Product / Finance lead), printed in the
rules-by-area table so the artifact routes the decision, not just reads it. The `?view=company`
layer keeps its band-based illustrative profile: the interpretation layers have no on-page render
site (exports only, server-built), and the browser-held profile cannot reach a server build
without a new sync surface — the runway notes panel is the sanctioned on-page path.

### 1.1.17 Sitewide declutter (2026-09-15)

A justified-removal pass over every surface, on the one rule the repo already had: when two
surfaces state the same thing, the earlier one keeps it (§XI: state gets stated once). The captures
that prompted it measured `/` at 4,244px desktop and 6,030px phone — double the 2026-08-29
facelift baseline — with the funding pressure score printed in six places, the stage selector
rendered three times (four on a first visit), two regime timelines on one page, and three CTAs
pointing at /operate; on a 430px phone the call headline sat at the bottom edge of the first
viewport. Report routes stacked up to six chrome bands before the first task block against §XI's
three, and every one of them computed hero props the shell never read. Each removal names the
restatement it resolved; the measured result is in the table at the end.

**Homepage `/`.** Above the call: `FirstVisitExplainer` keeps its sentence and Dismiss and loses
its two links (Trust and History are header tabs) and its stage fieldset (the header pill covers
phones, the hero's tablist covers `sm` and up); the meta row loses the "Data through … ·
refreshed …" line (the hero's trust line and the confidence popover carry both) and the stage
pill that overlapped the hero's tablist at every width above `sm`; `TimelineBar` and the
swipe-anywhere month gesture leave with `SwipeableWeek` (the chevrons and the calendar picker are
the period controls; `/history` keeps the scrubber); `BriefSectionNav` goes (three sections do
not need a sticky index; J/K still step the `data-page-section` ids). In the hero: the delta
caption under the sparkline repeated the badge beside the score, and the Operating latitude gloss
moved from a hover-only `title` into the Why-this-call disclosure. Below the call: the four
numbered `SectionSignpost`s (the cards carry their titles); `KeyDriversCard`'s threshold rows (the
hero's rails encode them — §XV, one encoding per concept per screen) and its rate-derivation
paragraphs (method exposition on the primary screen); `RecentPostureHistoryCard`'s prior-read
chips and comparison panel (the hero's What-changed rows) and the placeholder months it invented
for an empty history; `StressTestQuickCard` (recreated /operate's tester inline and was the
second plan CTA); the tabbed `WeeklyRetrospectiveCard` with `LastWeekInHindsight` (the hero's
revisit badge and delta — `lib/report/hindsight.ts` went with it); `DirectAnswersStrip` (the
list /resolve owns; the handoff gets a text link). `SinceLastVisit` stays, directly under the
call on live briefs. `StickyCallStrip` renders from `md` up only: on phones it stacked on the
tab bar (reverses P0 #1 in `docs/design-improvements-priority.md`).

**Global chrome.** One header band on every route — wordmark, tabs, actions — reversing the
2026-08-11 two-band note in the weekly-brief spec: the `Weekly Brief` button duplicated the Brief
tab 40px below it, and the `Toolkits` pill beside it only ever resolved for `/`, which rendered
the other shape. `AppSidebar` keeps the page outline and loses its second wordmark and the
`Workflow` group that repeated the six header tabs. Dead and deleted: `globalHeaderSearchForm`,
`globalHeaderShared`, `resolveReportHeaderNextStep`, `isReportShellRoute`.

**Report shell.** Gone, end to end: `commandBar` (rendered only for `/`, which never mounts the
shell; the home assembler built one too), `decisionBanner`, `missionSupportText`,
`trustStatusDetail` and `trustStatusAction` (accepted by the hero, never read), `trustStatusLabel`
(discarded for the readiness headline the shell derives), `stageRail`, `hideHeroChrome`,
`inlineTrustPlacement`, `provenance`, `treasurySource` and the outage props (fed a rail and two
trust blocks no route switched on), `heroVariant` and `roleSwitcher` (one kicker; one name per
thing), `pageSummaryLink`, `secondaryCta`, `currentPath` and the default `primaryCta` (every "↓"
link and secondary button targeted the block beneath the hero or the `/` the header reaches, and
the default pointed at an anchor no route renders — how /history shipped a dead button). Deleted
with them: `RegimeCommandBar`, `SidebarSequenceBlock`, `TrustBlocks`, `reportRevampElements`. The
refresh stamp no longer prints "Updated " with nothing after it.

**Routes.** `/signals` (evidence only, §VIII): the instruction strip above the summary, the h2
restating the regime the status line names one screen above, the "What founders should do this
week" playbook (the operating call — `/operate` prints the rules by area, and the directory's own
AGENTS.md forbids owning it), "What this means for your team" (`/resolve` owns role translation),
and the tail "Need more detail?" button (the reading-depth control, again); the fossil record is
a deeper-mode read. `/operate`: one index in page order (`operationsSectionLinks.plan`) instead of
three (the sidebar list, the stepper's sticky chip row, an "Other planning pages" grid that
repeated the workstream switcher); the intro paragraph under the hero; the "Decision help"
section, now the shell's next-step card; the workstream pages' banner and intro. `/resolve`: two
duplicate CTAs and a dead variable. `/trust`: the "Confidence now" bullet its status grid carries.

**Guards.** `tests/homeRouteDecisionTransmissionContract.test.tsx` pins the homepage shape;
`tests/pageConsolidation.test.tsx` fails if a retired file returns under `app/`;
`tests/reportShellSections.test.tsx` pins a hero with no default button and no empty stamp;
`tests/planningCliPage.test.tsx` pins the one plan index. Invariant 11 caught the one selector the
pass orphaned (`[data-sticky-strip-hide]`, set only by the retired quick card).

**Left alone, deliberately.** The cadence selector at the tail of `/` (§1.1.15's open product
question, unchanged). `primaryCta` and `exportCta` stay on the shell as its action API, used by
no route today. The `/history` export control stays as its own row under the hero: it is a
clipboard button, not a link, and the hero's action slot takes a link. `tests/hindsight.test.ts`
went with its module; the census floor (212) sits well under the 258 files that remain.

**Measured (2026-09-15, same day, same data; full-page captures at 1600 and 430 wide).**

| Route | Desktop before → after | Phone before → after |
| --- | --- | --- |
| `/` | 4,838 → 2,976 px | 6,352 → 3,718 px |
| `/signals` | 4,989 → 3,856 px | 7,836 → 6,065 px |
| `/operate` | 3,883 → 3,338 px | 5,418 → 4,552 px |
| `/resolve` | 1,801 → 1,737 px | 2,162 → 2,060 px |
| `/trust` | 5,614 → 5,551 px | 7,824 → 7,722 px |
| `/history` | 3,884 → 3,823 px | 4,621 → 4,571 px |

On a 430×932 phone the call, the score and the delta now sit inside the first viewport, with the
tab bar as the only fixed element. What remains below is one of each thing: the change report, the
rails, the drivers and actions, the posture stripe, subscribe, the handoff, the footer. Height is
data-dependent (a wide week prints more What-changed rows), so the guards above are the acceptance
check and these numbers are the record.

### 1.1.18 Runway as a second axis, the slide as a file, and the day a move lands (2026-09-17)

Three roadmap items from the community backlog, each built on a surface that already existed
rather than on a new one.

**Runway calibrates the rule, beside stage.** `lib/report/operatorRunway.ts` is the one answer
set for cash runway — `critical` (<6 months), `tight` (6–12), `balanced` (12–24), `abundant`
(24+) — with the same three carriers stage has: `?runway=` on the URL (a band key or a month
count), the `whether-company-runway` cookie, and `whether.operatorProfile.runwayMonths` in the
browser, kept in step by `app/components/useOperatorRunway.ts`. `scaleAdjustmentToRunway` in
`boundedDecisionRules.ts` reshapes every stage rule: below twelve months a cash gate leads the
do-now and pause lines and the reversal becomes a cash milestone (past nine months, or bridge
financing banked) rather than a macro read; above twenty-four the corridor still binds but a
counter-cyclical move is offered at the same payback bar. The balanced band is the corridor the
stage rules already assume, so it leaves them untouched — an operator who picks the default sees
the same brief as one who never picked. The hero carries a second tablist from `sm` up and the
header a second pill on phones (`RunwayPersonaSelector`, `RunwayDropdownPill`; the phone pill
reads the cookie itself, since the header has no page model in reach), and when a band has
reshaped the rule the hero prints the binding constraint under the calibration row ("Runway is
the binding constraint this week, not the regime line; the corridor sets tempo again once cash
clears nine months"). `WeeklyCallContract` carries `runwayBand` and `runwayLabel`, both absent
rather than `undefined` so a stored snapshot round-trips unchanged. `/privacy` §2.5 counts two
cookies now. `tests/runwayScaledDecisionRules.test.ts` pins the band semantics; the balanced
no-op is asserted for every stage.

**The board slide is a file.** `GET /api/export/board-slide?format=pptx|pdf&stage=<mode>`
(`lib/export/boardSlideDeck.ts`) writes the meeting slide as a native one-slide PPTX or a
one-page 16:9 PDF, from the same `MeetingSlidePayload` and at the same geometry as the SVG at
`/api/image/slide`, so the three formats cannot disagree about the week. The PPTX is hand-written
OOXML in a stored ZIP — no dependency; under 22 KB — and was validated by opening it through
LibreOffice; the PDF uses `@cantoo/pdf-lib` (already in the tree for the CLI) with the standard
fonts, mapping the few characters WinAnsi lacks rather than failing the export. Served as an
attachment named by ISO week (`whether-board-slide-2026-09-16.pptx`; the payload now carries
`recordDateIso` beside the display label). Both routes share `lib/export/exportSnapshot.ts`.
Linked as two cards under "Files and images for a deck or a thread" on `/share`, and listed on
`/api-docs`.

**The investor update.** "Investor update" on `/share` (`lib/export/investorUpdateSnippet.ts`)
copies two paragraphs for the market section of a monthly letter: the regime and the two scores'
move since the prior *month-end* in the regime history (the cadence a letter compares on, not
last Monday), then the call, guardrail and reversal, each terminated as a sentence — the
contract's clauses are written for labelled slots and carry no full stop. The runway sentence
closes the second paragraph and is composed in the browser from the cookie, because `/share` is
cached (`revalidate = 300`) and cannot read it server-side; without a band the paragraph stops at
the reversal rather than saying "band not set", and the card tells the reader where to pick one.
The stamp uses the provenance label, not `treasury.source`, which is a FRED series URL on a live
read.

**Flash alerts.** `lib/alert/flashMoves.ts` judges two raw inputs between *consecutive* reads: a
move of 0.25 points or more in the short rate (a cut between meetings, a bill-market
dislocation) or 0.20 points or more in 10Y−2Y (a spread blowout) fires the day it lands, whether
or not a score crossed anything. Consecutive means the previous snapshot, which
`refreshOperatingState` now returns — never the last alert state, which is written only when
something fires and would turn weeks of drift into a flash — and at most seven days apart,
because the size assumes a short window. It is a critical CFO alert that bypasses the weekly
cooldown like a regime change, deduplicated per input (`flash:baseRate`, `flash:curveSlope`),
mailed through `flashMoveEmail` and posted to `SLACK_WEBHOOK_URL` through the one
`postSlackAlert` helper in `checkRegimeChange`, on both crons. `/privacy` §2.1 says what the
between-Monday alerts now include.

**The flip watch.** The hero's Conditions cell states the market move that would change the
call, in the input's units: "0.07% lower on the 1-month Treasury bill would change the call to
Stormy." `lib/report/flipProximity.ts` derives it by scanning the real score functions (both are
piecewise-linear in one input each, but clipped and rounded, so a closed form would carry every
edge), carrying the published-minus-baseline macro offset across the scan so it agrees with the
published scores — the bare curve formula was eleven points off on the bundled reading — and
refusing to offer a rise in risk appetite while the volatility veto caps it. An axis it cannot
measure honestly (an imputed input, no crossing within three points) is left out rather than
reported at the scan's edge. Nearest move first; the label is `DECISION_CONTRACT_LABELS.watch.flipWatch`.

### 1.1.19 The score through its weather (2026-09-17)

A moodboard of the weather apps people keep — Weather Strip, Apple's 10-day bars, Hello Weather,
Mercury, Dark Sky — checked against the brief, and what it changed. The pattern they share is not
a look: each decides what a reader needs first, draws it rather than lists it, and puts nothing in
front of it. Six things followed.

- **The months are behind the score line.** Weather Strip draws the temperature through the sky
  it ran under; the hero's 24-month sparkline now draws the score through each month's regime,
  in the plane's hue (`SparklinePoint.ground`, built in `app/page.tsx` from `REGIME_HEX_COLORS`
  via `regimeDataAttribute`, each band titled with its month and regime). That was the
  `RecentPostureHistoryCard` stripe at the foot of the page — the same 24 months, 3,000px below
  the graphic already drawing them — so the card is gone (§XV, one encoding per concept per
  screen) and its link to the record sits in the figure's caption. The colour contract in
  `tests/regimeColourContract.test.tsx` moved with it.
- **The line states its window and range, and where the week sits in it.** The sparkline was
  autoscaled with no domain shown, which its own doc forbids; the caption carries
  `Sep 2024–Aug 2026 · 31–67`, and above it `describeWindowPosition` (`lib/report/windowPosition.ts`)
  prints the rank — "Bottom quarter since Sep 2024" — which is the answer to "is 33 low?" that a
  first-time reader cannot get from the label. Rank, not a band the product would have to invent.
- **Two points is not a trend.** The change report drew one `Sparkline` per composite signal from
  `[threshold, reading]` — a segment whose slope repeated the delta beside it, wrapping onto its
  own line on phones. `Sparkline` renders nothing below `MIN_SHAPE_POINTS` (3) and the row shares
  the constant; `tests/chartIntegrityContract.test.tsx` pins it.
- **The flip sentence leads with the distance.** "Funding pressure at or below 70 (83 today)" is
  a subtraction handed to the reader; Dark Sky's sentence was "Rain starting in 12 minutes". It
  reads "Funding pressure falls 13 pts to 70 or below (83 today) or risk appetite rises 10 pts to
  clear 50 (40 today)" — the inequality survives on each side (reaching 50 does not clear an
  "above 50" line), the boundary and the live reading stay for the archive and the embed.
- **One fewer row above the call on a phone.** The meta row wraps instead of stacking, and the
  week title is `text-lg` below `sm`, so the title and the confidence chip share a line at 430px
  (they ran 4px over at `text-xl`); the guide's disclosure sits closer under the standfirst. The
  first-visit page is 3,683px on a phone, from 3,875.
- **The boldness delta chip reads the tightening / easing tokens** rather than a rose and an
  emerald picked at the call site.

Left as decisions: making the three horizons (weekly, monthly, quarterly) headings rather than a
control, which is Hello Weather's reading order and would change the page outline; and taking
the remaining rows above the call on a first visit, which the standfirst's own comment warns about.

### 1.1.20 Slack weekly delivery, subscribed channels, and the flip (2026-09-18)

The Slack weekly brief used to post a two-line message to `SLACK_WEBHOOK_URL` and report success
for a post that never left the building; the full `buildSlackBrief` text — posture, readings,
signal check, bounded decisions, citations — sat unused in `lib/export/briefBuilders.ts`. The
cron's Slack step now posts the real brief to every delivery target and reports which of five
outcomes actually happened (`posted` / `partial` / `skipped_unconfigured` /
`refused_unpublishable` / `failed`).

- **Channels can subscribe.** The subscribe form gained a Slack channel; `POST /api/slack/subscribe`
  pings the webhook to verify it and introduce the cadence, then stores
  `webhookUrl` + `channelName` + a `token` in KV (`lib/slack/slackWebhookStore.ts`, durable
  backend with a local-fallback like the alert store). `POST /api/slack/unsubscribe` removes by
  token. Delivery targets are the env webhook plus every active stored webhook; Slack revoking a
  webhook answers 404/410 on the next Monday post, which auto-deactivates the subscription.
- **The off-ramp is the webhook.** A Slack channel has no address the site can reach, so the
  honest stop is deleting the webhook in Slack admin; the next post 404s and the subscription
  drops. The ping message and the success screen say this instead of implying a perpetual
  channel. The compact form's footer is now channel-aware: Slack promises "Monday mornings, plus
  a flash if the call flips."
- **Same call as the email, from the same read.** The Monday email builds from the operating
  snapshot the cron just materialized; the Slack step re-assembled the whole report on a second
  read, which is a second chance to disagree about the same Monday and a second assembly under
  the step deadline. `deliverSlackBrief` now takes that snapshot — its treasury already carries
  the sensor and report-dynamics derivations — so the Slack post is the email's call in Slack's
  blocks. `GET /api/brief/slack` keeps the report-read path for on-demand automation.
- **The flip reaches subscribed channels.** `checkRegimeChange` posted regime-change, flash, and
  flip-window alerts to `SLACK_WEBHOOK_URL` alone. Those now go to every subscribed webhook as
  well (never throwing, so a slow Slack post cannot fail the KV state write after it), which is
  what "a note if the call flips" promises a channel. The daily threshold-crossing mail
  (sentiment/credit lines) deliberately stays email-only, and Slack subscriptions carry no
  per-channel delivery preferences.

### 1.1.21 A first visit gets one question, not the whole brief (2026-09-23)

A first-time reader met a call about the market and roughly 3,200px of evidence for it, with
nothing connecting either to the decision they arrived with. For a browser that has never
rendered the brief, `/` now folds sections 2 to 5 away and shows `FirstVisitDecisionPicker`
under the call:

- **"What are you deciding this week?"** Five choices (hire, roadmap, raise, spend, something new),
  each answered with that area's row of the same table the full brief prints (the rule, its pause
  and resume lines, and the distance to each), plus the answer page that leads with that area.
- **"Test it against your runway"**, under the picked answer: runway, monthly burn and the monthly
  cost of the decision give the runway after it, whether that crosses a band, and the runway note this
  week's guidance already carries for the area at the new figure (`buildCommitmentImpact`). Runway
  and burn are the shared browser-only operator profile; the decision's cost is not stored.
- **"Tell me when this changes"**, an alerts-only signup (`weekly: false` on the subscriber record)
  beside the condition that would change the call. No Monday email; one note when the guidance
  changes or a score crosses its line. Records written before the flag read as weekly subscribers.
- **The last four turning points**, linked into the time machine, so a sceptical reader can check
  what the site said against what they remember.
- **"Show the full brief"**, which unfolds the page and scrolls to what changed. A link to a folded
  section's anchor unfolds it too.

First visit is decided before paint by the layout bootstrap from `whether.activation.lastWeek`,
which `ActivationTracker` writes on every visit, and the fold is a stylesheet rule keyed on the
attribute it sets. With no attribute (crawlers, no scripts, a failed bootstrap) the page is the full
brief and the picker is hidden, so indexing and returning readers are unchanged. It applies to the
live weekly view only; an archived month or a monthly horizon is reached by choosing it. Picking a
decision records the `oriented` activation step, and the `visited` step now carries a coarse arrival
bucket (direct, search, social, chat, shared-link, internal, other; never the URL) and a first-visit
flag. `/privacy` 2.6 had promised that bucket with no code behind it. The activation intake now
refuses any field a step does not carry, which `/privacy` also promised and the validator did not
enforce. Conversion cannot be attributed to a source, by design: no event carries an identity to
join on. Pinned by `tests/firstVisitFrontDoor.test.tsx` and `tests/subscriberWeeklyFlag.test.ts`.

### 1.1.22 Every copy counts, and a copy is claimed only when it happened (2026-09-23)

The activation funnel defines commitment as a copy or a subscribe, and only `/share` reported a
copy. Copy Brief, the sticky strip, the share rail, the slide button and every `/operate` export were
invisible to it, so 30 days read 554 homepage visits and zero commitments, and a product problem could
not be told from a measurement one. The shared clipboard hook now takes a `commitment` and reports it
once the write resolves; `/share` uses the same path instead of its own effect. Callers whose copy is
not the guidance (an article anchor, the blank template, the preview-only mockup) pass `null`, and
`tests/copyCommitmentCoverage.test.ts` requires every caller to say one or the other.

`CopyMeetingSlideButton` showed "Copied the slide" after a failed rich copy whether or not its
plain-text fallback worked, the 1.1.10 defect in the one control that did not use the shared hook. It
now claims and reports a copy only after a write resolves.

### 1.1.23 The runway band lives in the cookie, not the address (2026-09-23)

The runway unification itself landed on `main` separately (7f264a26, recorded in CLAUDE.md, "One
runway setting"): the band is the setting, the notes branch on its boundaries, and an exact figure
moves the band. This branch adds one thing on top.

The band selectors also wrote `?runway=` into the address, which outranks the cookie on the server.
So an exact figure typed afterwards was ignored on reload, and a pasted URL carried the reader's
runway band to its recipient and overrode theirs. The controls now write only the cookie.
`RunwayServerSync` (mounted with the global header) re-renders the page when a band is *picked*, and
drops a stale `?runway=`. A band implied by a *typed* figure only updates the cookie and strips the
parameter with `history.replaceState`: a refresh remounts the page's client components, which closed
the first-visit answer card mid-typing. The first-visit picker refreshes on "Show the full brief" if the
band moved while the rules were folded. Links that carry `?runway=` on purpose (the embed, exports)
still work.

### 1.1.24 The confidence record stopped bundling the archive (2026-09-23)

`lib/report/confidenceCalibration.ts` imported the 5MB `data/summary_archive.json` to read five fields
from 176 monthly rows. The bundler inlined it as a 4.3MB chunk on `/trust`, `/history` and
`/calibration`, compiled and validated on every fresh Worker instance; those were the three slowest
pages in the 30-day real-user timings. It reads `data/confidence_record_months.json` (13KB) now,
written with the archive by `scripts/summaryArchive.ts` and by `bun run archive:index`, and
`tests/confidenceCalibration.test.ts` fails if the extract and the archive disagree. The chunk is 17KB;
cold module evaluation measured 33ms against 1.6ms on a workstation. This undid a regression of the
rule `generatePostureArchiveIndex.ts` already stated: the full archive stays out of route bundles.

Found in the same production tail: `/comps` logged "a stalled HTTP response was canceled to prevent
deadlock" on every request where the quote source declined, because `lib/saasMultiples.ts` returned
early without reading the refused responses' bodies while fetching the basket in parallel. They are
released now.

### 1.2 Evidence report (/signals)
The evidence report is the deep evidence appendix for the weekly workspace, with sections for:
- Sensor array (live yield curve readings + derived scores)
- Macro signal snapshot (CPI, unemployment, BBB spreads)
- Time Machine (historical month selector + cached summaries) visible without advanced-mode gating
- Threshold tuning (URL-driven overrides + audit log)
- Regime timeline (24‑month sequence for quick jumps)

Advanced controls remain available for threshold tuning and diagnostics expansion, but historical
replay is no longer treated as an expert-only action.
The entry sequence now opens with a compact `what this means now` summary before the denser
diagnostic stack so cold visitors get the operating implication before the appendix depth.
`/signals` now also supports two explicit evidence modes:
- `What this means now` for action-first implication reading and compact scorecards
- `Evidence detail` for prioritized diagnostics, replay, threshold tuning, and advanced controls

The section navigation now follows the active evidence mode so implication-first visitors are not
routed toward hidden detail-only sections. The top summary also includes persisted evidence and
trust translation helpers for first-use definitions of `tightness`, `risk appetite`, `curve slope`,
`confidence`, and `freshness`.
The implication scorecards now use threshold-anchored meters with explicit distance-to-watch-line
labels instead of equal-width safe/caution/risk bands. The inversion preview now shows a labeled
zero line, time anchors, direct end labels, and visible breaks when monthly spread reads are
missing. The deeper yield-curve diagnostics now direct-label multi-series lines, preserve gaps
instead of connecting through missing data, and encode scatterplot recency through a chronological
path plus a highlighted latest point.

### 1.3 Plan overview (/operate)
Planning is the detailed execution depth page for the home workspace. The default surface is a
four-step progressive flow:
- weekly plan,
- guardrails,
- finance strategy,
- share brief.

Only one step is expanded at a time, while the other steps collapse into summary cards. The home
Planning handoff also now uses a more stateful board treatment with explicit owner, approval-state,
and change-course cues instead of sentence-only summaries. Existing
hash deep links are preserved by mapping section-level hashes into the relevant step.
The share step now also houses the operator follow-through surfaces that were previously disconnected from the core loop:
- per-profile alert delivery controls and recent send history,
- Decision Memory export and latest-entry recall,
- share artifacts, explainer mode, board/governance repackaging, company-specific exceptions, delivery controls, and audit history in one checkpoint before the brief leaves the room.
The execution stepper shows owner, approval state, and `reopen when` metadata on both the active
step and collapsed summaries. (This paragraph used to describe a mixed-literacy translation model on
`/operate` — a top-of-page router to decision, evidence, trust or share help, plus persisted assist
panels. No such router or panel existed; the only trace in the code was a table of storage keys
nothing wrote, deleted in §1.1.11.)
Shared report-shell routes now avoid stacking a separate trust summary panel ahead of the first task block; trust status stays compressed inside the intro layer unless a route explicitly promotes a deeper trust section.

### 1.4 Planning workstreams
- **Weekly plan** (`/operate`): the default execution
  path with weekly plan, guardrails, finance strategy, export brief, scoped alert delivery controls, Decision Memory recall/export, and operator requests.

### 1.5 Home, and why there is no glossary (`/`)
The homepage is the only canonical first-time and returning weekly workspace. There is no
glossary route (retired 2026-09-22; `/glossary` redirects to `/trust#formula-reference`). A
term carries its meaning where it appears instead: a 0–100 score prints with its scale
(`formatSignalReading`), the three lines have names that say what happens, weather names carry
their one-line meaning, and the instrument names only a formula needs are defined on the
formula cards. `tests/readerVocabulary.test.tsx` bans the retired names and the pointers to the
old page. `llms-full.txt` keeps a Terms block (`TERM_DEFINITIONS`) for machine readers.
See `docs/glossary-retirement-plan.md`.

### 1.5.1 About and identity framing (`/about`)
The About page explicitly frames Whether as a small independent operator tool rather than a large research institution. It now states the intended authority boundary: trust the product for weekly pacing, bounded decisions, provenance, and degradation honesty—not as bespoke company advice or a substitute for internal metrics and judgment.

### 1.6 Trust hub (/trust) and formula reference
`/trust` is the canonical trust-audit hub linked from Weekly Brief. It summarizes current
confidence, freshness, source coverage, and revisit conditions, then keeps active false-signal
warnings inside the same Trust surface before linking out to `/trust#formula-reference`. The legacy `/sources` and `/confidence`
entry URLs now redirect at the routing layer back into the canonical Trust anchors instead of acting
as parallel trust pages.
The page now opens with a binary trust verdict (`safe to use`, `use cautiously`, or historical-only)
inside the trust snapshot block so operators can decide whether a deeper audit is necessary without a separate preamble card.
The opening trust snapshot stays trust-specific: freshness, source coverage, and use boundary are shown first, while the live weekly call remains on `/`.

`/methodology` now permanently redirects to `/trust#formula-reference`, which documents the sensor methodology and the public data sources used in the report (FRED Treasury series, FRED CPI, FRED labor, FRED credit spreads, FRED VIX, and Chicago Fed NFCI).

The methodology reference also now clarifies scope: the canonical pacing model is intentionally built on a bounded macro input set (base rate, curve slope, BBB spread, CPI, unemployment), and the operating outputs are a translation layer rather than a claim of bespoke precision.
Failure-mode diagnostics are now handled through the Trust and Planning workflows rather than as a standalone indexable library. Planning now exposes compact false-signal checks before guardrail approval so operators can pressure-test the weekly plan without leaving the core loop.

### 1.7 Share-preview assets for canonical hubs
High-priority hub routes now ship dedicated static SVG social preview assets for:
- `/posture`
- `/signals`
- `/operate`
- `/resolve`
- `/resources`
- `/startup-macro-posture` and `/startup-macro-posture/index`
- `/guides`
- `/answers` and `/answers/[slug]`

Secondary hubs (`/guides`, `/resources`, `/toolkits`) now lead with immediate value and
focused next actions while reinforcing their parent workflow hub. `/answers` now redirects directly
back into the canonical Resolve quick-answer path instead of maintaining a separate hub shell.
Full helper libraries remain below the featured paths when those surfaces render a library view.
`/guides` now owns both stakeholder and stage detail states behind query-selected panels, but supporting libraries are no longer assumed to be indexable by default. Programmatic SEO scope now stays intentionally narrower than the total content footprint: curated answer pages remain indexable only when they map directly to a current operator decision and pass freshness/provenance gates, while supporting utilities, template downloads, and library index pages remain product-accessible but default to noindex and stay out of the sitemap.
`/search` remains product-accessible only as a command router URL: it forwards the query directly into the next primary workflow surface instead of acting like a browse-first library.
`/resolve/team-context` no longer operates as a standalone personalization branch; it now redirects into Planning, and the home unresolved-utility fallback is the ship checklist rather than a separate company-profile workflow. `/resolve` itself now leads with one best-next-step path, keeps alternate answers and translation paths behind a lower-emphasis disclosure by default, and uses a smaller fallback chooser after that; team/stage views and tool depth stay hidden until explicitly selected.
The active answer catalog is now intentionally narrower and keeps only the highest-signal decision-closing pages; retired long-tail slugs redirect back into the canonical Resolve answer flow. The active resource-article set is likewise reduced to a focused practical subset, with retired long-form briefs redirecting back into Planning's artifact checkpoint rather than a standalone Resources hub.

The homepage remains on live `/api/og` generation so the weekly brief preview can stay tied to current data.

Planning now opens with a weekly approval boundary before any broader monthly synthesis. The monthly action summary remains available as a secondary disclosure inside the first planning step instead of being the first primary payload.

Report-shell route intros are now compressed more aggressively on mobile so the first page-specific task block lands faster in the viewport; the route brief still orients the operator, but no longer needs a second always-visible decision panel on small screens.

Trust readiness language is now stricter on trust and planning surfaces: cached or medium-reliability states stay in staged-approval language (`use with caution` / `approvals staged`) instead of presenting as fully ready-to-use.
Trust/readiness computation now consumes structured freshness state (`fresh` / `stale` / `unknown` plus `live` / `cached` / `historical`) instead of relying on rendered freshness labels, so stale-but-present timestamps no longer pass as ready-to-use.

## 2) Data sourcing & provenance

### 2.1 Treasury yields (live + fallback)
- Canonical in-product source: FRED CSV Treasury constant-maturity series (`DGS1MO`, `DGS3MO`, `DGS2`, `DGS10`).
- Secondary/provenance source: US Treasury Fiscal Data API is used only for validation workflows and source cross-checking, not for runtime scoring.
- Data is normalized into a `TreasuryData` shape and stamped with `record_date`, `fetched_at`,
  and source metadata.
- If live fetch is unavailable, the report falls back to `data/snapshot_fallback.json` and marks the
  response as cached with a fallback reason.

### 2.2 Macro snapshot
- Core series now include CPI, unemployment, BBB OAS, HY OAS, Chicago Fed NFCI, and VIX with live fetch support where available.
- Startup/operator overlays (VC funding velocity, tech layoff trend, SaaS multiples) and structural overlays (earnings revisions, AI compute cost trend, regulatory risk tracker) are shipped via snapshot-backed series for deterministic fallback.
- Each series carries a source URL, record date, and freshness metadata.

### 2.3 Time Machine cache
- Historical Treasury snapshots are served from `data/time_machine_cache.json`.
- Each entry also carries the period's VIX reading with a trailing daily tail
  (`vixHistory`) and the resolved base-rate velocity pair
  (`baseRateVelocityWindow`), so the runtime replay evaluates the market-stress
  veto and tightening-speed term on the same daily cadence the archive
  generators use. The runtime governed walk must publish the same regime and
  scores as `data/summary_archive.json` for every month on record; the parity
  test in `tests/regimeGovernance.test.ts` pins this.
- Historical selections resolve their assessment from the governed walk
  (`findTimeMachineGovernedAssessment`), not a point evaluation against the
  live machine snapshot, so a selected month reads the same call on every
  surface — brief, compare cards, and `/history`.
- The confidence history and the analog ranking resolve each historical month
  from that same governed walk, so a stress month's confidence and distance to
  flip carry the VIX haircut and veto the record was published with. The
  current record date resolves to the live assessment instead.
- A partial generator run (`HISTORY_START_YEAR`, which
  `time-machine:update-summaries` sets to 2024) walks from the first year and
  filters only which records it writes, so a merge lands the same
  confirmations a full replay produces.
- A flip is a shock only when the one-step move is 25 points or more *and* the
  prior reading sat outside the 5-point near band; from inside the band the
  warning could have fired, so the flip confirms through the gate.
- The Time Machine UI validates available months, shows cache coverage, and uses cached
  summary archives for weekly/monthly/quarterly/yearly playback.
- Historical assessment now attempts to align macro-series history to the selected `asOf` date and records explicit coverage labels (`historical aligned`, `historical aligned partial`, or `treasury-only`) so historical vs. live comparisons stay structurally comparable when data exists and honestly degraded when it does not.

## 3) Regime engine & scoring

### 3.1 Inputs
- **Base rate**: 1‑month Treasury yield (fallback to 3‑month if missing).
- **Curve slope**: 10Y − 2Y yield spread.
- **Macro overlays (boundary calibration)**: HY OAS, Chicago Fed NFCI, VIX, VC funding velocity, and tech layoff trend adjust tightness/risk appetite before final classification and trigger multi-weak-read warnings.

### 3.2 Scores
- **Tightness score (0–100)**: adds 90 points if base rate > threshold and 25 points if the curve
  is inverted; capped at 100.
- **Risk appetite score (0–100)**: maps curve slope linearly from -1.0% to 1.5%.

### 3.3 Regime classification
Regime is determined by tightness vs. risk appetite thresholds (defaults are 70 and 50
respectively). Thresholds can be overridden via URL parameters, and the UI maintains an audit log
of operator changes.

Canonical taxonomy is the four-quadrant set only: `SCARCITY`, `DEFENSIVE`, `VOLATILE`, `EXPANSION`.
Policy pilot outputs (`RISK_ON`, `SAFETY_MODE`, `TRANSITION`) are a separate posture layer and do not replace regime keys used by Decision Shield, alerts, or UI matrix logic.

### 3.4 Outputs
Adjustment semantics:
- Macro overlays modify tightness/risk-appetite scores before classification, so they can change the resulting regime when signals are near boundaries.
- Diagnostics (`boundaryContributors`, weak-read warnings, confidence) explain *why* adjustments applied.
- Recommendations and constraints always derive from the final classified regime.

The regime assessment includes:
- Current regime label + description
- Tightness and risk appetite scores
- Constraint list for the current regime
- Data warnings when inputs are missing
- Input metadata for provenance display



### 3.4.1 Sector sensitivity overlay (decision translation layer)
### 3.4.2 Trust and fallback behavior for missing sector/company context
- Sector query fallback: unknown or empty `?sector` values resolve to canonical fallback `b2b-saas`.
- Missing company-rule payload fallback (interpretation `company` view): render available bounded rules in provided priority order and cap to the top three; if fewer than three exist, render only available rules without blocking the page.
- Trust posture: these fallbacks are translation-layer only and never mutate base regime classification, canonical confidence label, or trigger thresholds.

- Sector overlays are **secondary interpretations only** and do not mutate base regime classification.
- Canonical sector taxonomy:
  - `b2b-saas` → higher upside sensitivity (`Expansion+`, `Mixed+` when warranted)
  - `consumer` → neutral calibration (`Expansion (neutral)`, `Mixed (neutral)`, etc.)
  - `infrastructure` → higher downside sensitivity (`Mixed-`, `Defensive-` when warranted)
  - `fintech` → mixed calibration with tighter downside checks and selective upside (`Mixed (neutral)|Mixed-` in boundary weeks)
  - `healthcare` → conservative calibration favoring hold/tighten near thresholds (`Defensive (neutral)|Defensive-` as warranted)
  - `ai-platforms` → aggressive upside calibration (`Expansion+`, `Mixed+` with stronger loosen bias when warranted)
- Overlay output contract (`deriveSectorAdjustedPosture`):
  - `basePostureLabel`
  - `adjustedPostureLabel` (`+`, `-`, or `(neutral)` variant formatting)
  - `postureVariant` (`plus|neutral|minus`)
  - `adjustmentStrength` (`none|light|moderate|strong`)
  - `adjustmentDelta` (signed scalar, damped near regime boundaries)
  - `actionBias` (`tighten|hold|loosen`) and `reversalCondition` for bounded decision translation
- Calculation semantics: normalize tightness and risk-appetite distance from thresholds, apply sector multipliers + offset, then damp the resulting delta by nearest-threshold distance so overlays do not oscillate during boundary weeks.
- Boundary rule: overlays are damped as scores approach regime thresholds so route-to-route language remains stable during transition weeks.

### 3.5 Policy-spec pilot layer (new)
A policy-alignment pilot now runs **alongside** the legacy regime engine in the assessment payload:
- Versioned policy metadata (`policy-v1`) is emitted for traceability.
- Signal normalization fields include z-score, directional transform, and clipped z-score for base rate, slope, BBB spread, CPI YoY, and unemployment; Treasury signals use the local long-range archive when available, while other policy signals normalize against the available local history window.
- Composite outputs expose `cts` and `ras` values without replacing legacy tightness/risk-appetite outputs yet.
- A refusal state is included when disagreement/volatility/data-gap guards trigger, returning explicit fallback directives (`NO_POSTURE_CHANGE_RECOMMENDED`, `REVERSIBLE_BETS_ONLY`).

This pilot remains additive at the scoring layer, but refusal is now binding at the guidance layer: if the policy layer refuses a posture change, readiness is capped, operator copy shifts to reversible-only execution language, and export/share surfaces must not present the move as a clean posture upgrade or downgrade.

## 4) Decision support tooling

### 4.1 Decisions workstream status
Decisions is an active first-class workflow surface in shipped navigation (`/resolve`) with an
action-first top fold anchored to the live weekly call:
- one recommended next path derived from the live weekly call,
- direct-answer and team-translation alternatives at lower visual weight,
- then ship checklist, Planning handoff, and role/situation browsing below the primary chooser.

`/toolkits` remains available as the supporting instrument library for Resolve, but it is no longer treated as a peer primary hub in navigation.

Decision Shield logic/components remain integrated through decision and operations surfaces.

### 4.2 Decision templates
Copy-ready decision templates remain available inside operations brief/export surfaces for async
review notes and leadership discussion.

### 4.3 Export behavior
Briefing/report exports remain available where they package current signal-driven guidance.
Integration payload exports are also available through `/api/integrations/weekly-mandate` for
Slack, Notion, and Linear targets.

### 4.4 Forecast confidence + runway-risk semantics
- Forecast confidence messaging is anchored to **boundary distance + crossing risk**, not long-horizon macro prediction.
- `forecast` interpretation copy must include:
  - highest-likelihood next posture (`regimeProbabilities` top value),
  - crossing-risk label (`low|medium|high`),
  - points-to-threshold distance + momentum direction.
- Runway planner risk messaging uses bounded bands:
  - risk score is clamped to 0–100 with labels `low|moderate|high|critical`,
  - recommendations include explicit raise window, burn adjustment range, and reversal language,
  - posture/regime flips should change urgency and guardrail strictness, not just copy tone.
- Runway planner inputs are the operator's, or absent (2026-09-06). The panel used to open
  pre-filled with a fictional company (12 months, $700k burn, $450k revenue, 12% monthly growth)
  and offer to copy a board memo built from it; an emptied field became zero and read as
  "critical". Now `lib/report/runwayPlannerInputs.ts` resolves the request from the shared
  operator profile and reports which of runway, monthly burn, and monthly revenue is missing;
  the panel shows that sentence instead of a verdict until all three are entered. Growth is
  optional and blank reads as flat, which the output says. The memo lists its inputs and no
  longer claims to be "safe for board presentation".
- The `company` and `financial` interpretation views have never received a company profile
  from any caller, so they always describe the built-in default (`lib/report/companyProfile.ts`:
  Series B, $1–10M ARR, 12–18 months of runway). Their summaries now say so and point to the
  runway planner; the copy is the fix, because the assembler runs server-side and cannot see
  the browser-held profile.

## 5) Playbooks, summaries, and briefings

### 5.1 Playbook & operator requests
The playbook surfaces start/stop/fence actions based on the current regime, sourced from the
insight database and operator request catalog in `data/recommendations.ts` and
`lib/operatorRequests.ts`.

### 5.2 Weekly + monthly summaries
Weekly and monthly summaries are generated from the current assessment for use in the overview
page and APIs. These summaries are structured-first payloads (sections + provenance metadata) with
copy blocks rendered from the same structured data for sharing/export.

### 5.4 Structured summary contract (weekly/monthly)
Weekly/monthly summaries use a structured-first contract and render raw copy from that structure.

```mermaid
flowchart LR
  R[Regime + constraints] --> S[Structured fields]
  S --> U[UI sections
(climate, moves, constraints, provenance)]
  S --> C[Copy block
for sharing/export]
  S --> A[API payload
structured + copy + provenance]
```

Required weekly structure:
- `climate.label`, `climate.summary[]`
- `recommendedMoves[]`, `executionPriorities[]`, `watchouts[]`
- `planningLanguage`, `executionConstraints[]`

Required monthly structure:
- `executionConstraints[]`
- `provenance.source`, `provenance.timestamp`, `provenance.dataAge`

Archive compatibility formula for legacy records:

$$
\text{structured}_{legacy} =
\begin{cases}
\text{existing structured}, & \text{if present} \\
\text{buildStructured}(regime, constraints, provenance), & \text{otherwise}
\end{cases}
$$

### 5.5 Prioritized refactors (summary system)
- **P0 (implemented):** Shared structured→copy renderer across weekly/monthly for deterministic formatting reuse.
  - Renderer module: `lib/summary/summaryCopyRenderer.ts`
  - Shared contracts: `lib/summary/summaryTypes.ts`
  - Coverage: `tests/summaryCopyRenderer.test.ts`
- **P1 (implemented):** Offline archive materialization for historical `structured` fields, with guardrail coverage ensuring weekly/monthly entries are materialized.
- **P1 (implemented):** API contract tests for `/api/weekly` and `/api/monthly` structured payload guarantees.
- **P2 (partially implemented):** Monthly `planningLanguage` parity is now shipped across structured output, copy rendering, and cadence-card display.
- **P2 (open):** Broader monthly section expansion toward weekly parity remains open where operator value is clear. Re-review during roadmap grooming so status remains current and does not drift in this “as built” audit.

### 5.3 Briefing exports
Planning briefings support copy-ready briefs and executive narratives with sensor data and
macro context embedded for leadership consumption. `/share` owns the copy formats (Slack, email,
meeting pack, issue tracker, investor update) and the file and image artifacts (board slide as
PPTX and PDF, meeting slide as SVG, brief card as PNG); see §1.1.18.

Interpretation-context transmission contract (homepage-selected `?view=` only):
- Slack/board/call-citation builders include an optional interpretation context block when the selected layer is non-default.
- Context block includes: selected layer label + key (`default|sector|company|financial|forecast`), interpretation summary, compact bounded bullets (max 3), and an explicit trust line: translation-layer only (canonical posture/confidence/thresholds unchanged).
- Financial view may append compact runway action lines (runway risk, raise timing, burn adjustment) so the selected lens is transmissible in copy/paste artifacts.
- Fallback behavior: default view omits interpretation context entirely; invalid/missing view resolves to default and exports remain canonical.

### 5.6 Signal Ops (live)
- Regime alerts are persisted and retrievable through API (`/api/regime-alerts`).
- Alert payloads include reason codes, source URLs, and Time Machine deep links.
- Alert creation enforces trigger filtering and a 24-hour cooldown unless the regime flips again.
- Weekly digest output is available via `/api/weekly-digest`, including score deltas and dominant
  reason messages.
- Alert headlines now name the decision the alert affects rather than the raw signal move:
  `RECONSIDER HIRING` / `WATCH SPENDING` / `RECONSIDER OPERATING POSTURE`, from
  `buildDecisionVerdictHeadline` (`lib/alerts/decisionDeltaRules.ts`). Slack blocks
  (`/api/check-regime-change`) and email templates (`lib/alert/alertTemplates.ts`) lead with the
  verdict and keep the raw regime/signal detail as support.

### 5.7 Decision staleness (protect stale decisions)
- Decision Memory records an **assumption snapshot** at write time — the tightness, risk appetite,
  and regime watch lines that had to hold for the decision to make sense
  (`DecisionAssumptionSnapshot` in `lib/decisionMemory.ts`).
- `lib/report/decisionStaleness.ts` compares current conditions against a recorded snapshot and
  emits a bounded verdict: **RECONSIDER** (two supporting assumptions moved outside the recorded
  range), **WATCH** (one moved), or **No change** (all hold).
- The home page renders `DecisionStalenessPanel` below the hero: it reads the client's saved
  decision memory from localStorage, runs the staleness engine against this week's conditions,
  and surfaces "N DECISIONS NEED ATTENTION" with per-decision verdicts and a "No change" lane.
  It renders only when the operator has saved decisions; empty state is silent.
- Decision memory is scoped to one browser, and the surfaces say so (2026-09-06). Identity is a
  random id in localStorage (`whether-client-id`); clearing site data or opening a second device
  starts a new history with no recovery path, and the staleness panel reads localStorage only.
  The memory panel, the staleness empty state, and the settings panel state this scope rather
  than implying an account. Every save path — `DecisionMemoryButton`, the Decision Shield on
  `/operate`, and the plan stress test on `/` — mirrors the server's entry through one helper
  (`app/components/decisionMemoryLocalCache.ts`) and reports "Saved in this browser" when the
  API answered from its in-memory fallback (`degraded: true`), instead of "Logged to Memory".
- The plan stress test's "Track in Memory" now stores something. It used to post
  `{ kind: "plan-evaluation", … }`, a shape `/api/decision-memory` has never accepted, and set
  its own "Tracked in Memory" state without reading the 400. It posts a `decision` entry via
  `buildPlanStressTestMemoryPayload` (`lib/decisionMemory.ts`) — the same shape the Decision
  Shield writes, with the graded sentence as `decision.context` — checks `response.ok`, and
  shows "Save failed — retry" otherwise (`tests/planStressTestMemoryPayload.test.ts`).
- The Decision Shield on `/operate` now exports and records what is on screen (2026-09-26). The
  share text and the Decision Memory payload follow the active plan mode: in natural-language
  mode the share artifact is the plan stress test (plan text, model, verdict, sizing, fragile
  assumptions, guardrail, reversal trigger — bootstrapped mode prints the profile's gross margin)
  and the memory entry records the plan's detected category and action with the stress-test
  outcome; in compare mode it exports both plans, both verdicts, and the recommendation. Both
  previously exported the dropdown-mode reading even when the operator had just graded a plan,
  so the artifact could contradict the verdict beside it. The compare-mode verdict badges also
  split UNSAFE (rose) from RISKY (amber); both used to render amber
  (`tests/decisionShield.test.ts`).
- The hero's canonical revisit block now reads **What changed this week?** and renders three bands
  (change, consequence, unchanged) via `WeeklyChangeReport`. See section 2 for why the previous
  single-list form dropped the signal move on a multi-item week.

## 6) APIs (server routes)

### 6.1 Data APIs
- `GET /api/treasury` — normalized Treasury yield data with fallback support.

### 6.2 Summary APIs
- `GET /api/weekly` — weekly summary payload with structured sections, copy text, and provenance.
- `GET /api/monthly` — monthly summary payload with structured sections, copy text, and provenance.
- `GET /api/quarterly` — quarterly summary payload with provenance.
- `GET /api/yearly` — yearly summary payload with provenance.
- `GET /api/summary-delta` — difference between weekly and monthly summaries.
- `GET /api/cadence` — alignment check between weekly and monthly constraints.

### 6.3 Signal Ops APIs
- `GET /api/regime-alerts` — list logged regime alerts.
- `POST /api/regime-alerts` — create an alert when trigger/cooldown rules pass.
- `GET /api/weekly-digest` — digest summary generated from logged alerts.
- `GET /api/alert-preferences` / `POST /api/alert-preferences` — per-client delivery preferences.
- `GET /api/alert-deliveries` / `POST /api/alert-deliveries` — delivery logs and send attempts, filterable by `clientId` for per-profile audit views.

### 6.4 Decision audit APIs
- `GET /api/decision-memory` / `POST /api/decision-memory` — append-only Decision Shield audit entries, filterable by `clientId`, with CSV export support.
- Entries carry an `assumptions` snapshot (conditions that had to hold at decision time) so the
  decision-staleness engine can compare current conditions against the recorded range.

### 6.5 Integration APIs
- `GET /api/integrations/weekly-mandate?target=slack|notion|linear` — target-specific weekly
  mandate export payload.

### 6.6 Open Graph
- `GET /api/og` — SVG Open Graph image with regime metadata (supports Time Machine selection).

### 6.7 Agent access (MCP)
- `POST /api/mcp` (no `?tool` param) — **MCP streamable-HTTP transport** (JSON-RPC 2.0,
  protocol 2025-06-18): `initialize`, `ping`, `tools/list`, `tools/call` over
  `application/json` responses. Tool registry lives in `lib/mcp/httpMcpServer.ts`
  (get_brief, get_context, get_projection, get_comps, get_signals). Standard MCP clients
  can mount `https://whether.work/api/mcp` directly.
- `GET/POST /api/mcp?tool=…` — legacy REST tool API, kept for existing integrations.
- `bun run mcp:whether` — local stdio MCP server (separate tool set, official SDK).

### 6.8 Alert cadence (2026-08-11; flash 2026-09-17)
Both crons now evaluate bounded-rule tripwires after ingest: the daily 02:00 UTC run calls
`/api/check-regime-change` and `/api/alert-deliveries` in addition to the Monday run, so a
regime flip or threshold crossing pushes the day it lands instead of waiting up to six days.
Both endpoints are transition-based (KV last-known state: `regime:*`, `alert:state`), so
daily runs stay silent unless something actually crossed. Since 2026-09-17 the same two steps
also judge a flash (§1.1.18): an outsized move in the short rate or the curve between the
previous snapshot and this one, which is measured against the previous read rather than the
alert state. The brief email remains weekly-only — the cadence promise is weekly; only rule
firings break cadence.

## 7) Non-goals (as enforced in UI copy)
- The UI is framed as operational guidance, not financial advice.
- Evidence is deterministic and traceable; no predictive ML output is used.

## 8) Demo and interactive features (2026-05-23)

### 8.1 What-if simulator tools (removed Aug 2026)
`app/components/home/DecisionSimulator.tsx` and `app/components/ScenarioSimulator.tsx` rendered
below the hero on `/`. Both were removed as below-the-fold tool racks that competed with the
weekly decision-attention block. The scenario what-if still lives in the decision-attention flow
only where it changes a revisit verdict; it is no longer a standalone home surface.

### 8.2 Regime transition probability (removed Aug 2026)
`app/components/home/RegimeTransitionProbability.tsx` computed an empirical one-month exit rate
for the current regime from monthly time-machine observations. The card and the hero's
`transitionForecast` line were removed from home. `computeTransitionProbability` remains as an
internal model diagnostic at `lib/timeMachine/transitionProbability.ts`; it is not rendered as a
user surface.

### 8.3 Regime history over time (removed Aug 2026)
`app/components/RegimeHistory.tsx` rendered the trailing 24 months of `getMonthlyRegimeHistory()`
as a bar chart in the lower home band. Removed from home; the engine
(`getMonthlyRegimeHistory`, `lib/summary/monthlyRegimeHistory.ts`) stays for evidence/replay
surfaces.

### 8.4 Decision records (canonical: decision memory)
**Location**: `lib/decisionMemory.ts`, `/api/decision-memory`, `app/operate/memory/`,
`app/components/DecisionMemoryButton.tsx`, `app/components/home/DecisionStalenessPanel.tsx`.

The one system of record for "what did we decide and when": server-backed entries keyed by
client id, saved from the hero, browsed on `/operate/memory`, and checked for staleness on `/`.

Removed Aug 2026: `VisitorContext` (this section's previous subject) was deleted earlier without
a spec update, and with it the only writer of the `whether_decision_history` localStorage key.
The `DecisionArchive` table on `/history` kept reading that key, so it rendered nothing for every
visitor — it and `useDecisionHistory` are now deleted too. Do not add a second decision-record
store; extend decision memory instead.

### 8.5 Reliability score
**Location**: Computed in `app/page.tsx`, rendered in `BriefHero.tsx` next to the tightness number.

Combines confidence (HIGH=90/MED=60/LOW=30), freshness (live=100/cached=50), and source coverage into a 0-100 score. Color-coded: emerald ≥80, amber ≥60, rose <60.

### 8.6 Degraded-state decision guidance
**Location**: `BriefHero.tsx` "What to adjust" section.

When sources are degraded or the reliability score drops below 60, an amber warning appears: "Stage all irreversible decisions until the next clean refresh."

### 8.7 Print layout
**Location**: `app/styles/layout.css` @media print block.

Hides navigation, sidebar, and non-essential chrome. Converts dark theme to light (white bg, dark text). A4 page size with `break-inside: avoid` on cards.

### Demo recording guide
To record GIFs of interactive features:

```bash
bun run dev                                    # Start dev server
```

**Reliability cascade GIF**: Open `/` with simulated degraded state (set `?offline=1` or use cached data). Record the hero: emerald reliability score → amber warning in "What to adjust." ~5 seconds.

**Print layout GIF**: Open `/`, Cmd+P, show print preview with clean white layout. ~5 seconds.

For screen recording, use macOS QuickTime (File → New Screen Recording) or Kap (https://getkap.co). Convert to GIF with `ffmpeg` or gifski.

## 9) Vocabulary and trust-state consolidation (2026-09-02)

Ten product-sense fixes landed together; the semantic ones are recorded here so downstream
surfaces do not reintroduce the old words.

- **One regime vocabulary.** `getRegimeOperatorLabel` and `getRegimeDisplayLabel` both return the
  weather name (Freezing / Cloudy / Stormy / Sunny). "Expand", "Guarded Expand", "Conserve",
  "Defend", "Contraction", "Transitional Mixed", and "Guarded Expansion" are no longer rendered.
  Archived labels in `data/*.json` are translated at render time with `toWeatherLabel`
  (`lib/regimeLabels.ts`). The `modifier` field (Guarded / Transitional) survives as data.
- **One data-status vocabulary.** `DATA_STATUS_LABELS` in `lib/report/trustStatus.ts` — Live,
  Partly cached, Cached snapshot, Historical snapshot — is what the freshness pill, the hero
  provenance line, the report-shell masthead, and the Trust page status card all render. The
  masthead headline is derived from state via `resolveTrustReadinessCopy`; it no longer sniffs
  the detail string for words like "low".
- **Regime-aware weekly headline.** `buildActionNowShort` takes the regime, so a softening Sunny
  week reads "keep what is working. Don't start anything new this week" rather than "freeze new
  commitments", which contradicted every downstream page.
- **Guardrail slot is a threshold.** `reportDataLoader` fills `guardrailThreshold` from the first
  action-strip trigger instead of the playbook's first "stop" item.
- **Condition phrasing.** `formatDecisionThreshold` / `formatDecisionReversal` strip the verb and
  its object ("Pause net-new hiring if …" → "Funding pressure rises above 76 …") so slot labels
  that already carry the verb read as sentences. `formatThresholdNumber` drops the `.0` on integer
  thresholds everywhere a threshold is printed.
- **Historical analog.** The Evidence page shows the four match coordinates (then vs now) and
  names the block "Nearest reference cycle". The API field is `matchScore` (0-100, `100 / (1 + d)`
  over the spread-normalised coordinate distance). It replaced `correlationScore`, which was
  neither a correlation nor unbounded below: it was floored at 65, so the worst possible match
  reported 65% similarity to every API and MCP consumer.
- **Header.** The desktop nav renders the operator loop from `resolveGlobalHeaderLoopLinks`
  (supporting layers hidden below `lg`); the top-level API link moved under More. The live
  masthead no longer prints a "15m cadence" refresh label.

### 9.1 Reversal and resume conditions (2026-09-02, follow-up)

- **`buildFlipThreshold` returns one bounded condition.** It used to return three sentences: a
  status ("No flip condition is tripped yet.") plus two that each repeated "flips this call",
  under slot labels that already carry that verb. Because the compaction helpers cut a phrase at
  its first period, the Slack export of a frozen brief read "Re-open when: No flip condition is
  tripped yet." and carried no threshold at all. It now reads
  `Funding pressure above 70 (63 today) or risk appetite at or below 50 (56 today).`
  A boundary already crossed says "(already true at N)" and sorts first.
- **The Evidence page's "Safe again when" shows the resume trigger.** It rendered `flipThreshold`,
  the condition that *breaks* the call, which `/trust` correctly labels "This recommendation
  breaks if" — so the same string appeared under opposite meanings on two pages. It now reads
  `actionStripItems[0].reversalCondition`, symmetric with the pause trigger in "Wrong if" above it.
- **The hero's resume row is labeled `clearsWhen`, not `flipWatch`.** That row holds the resume
  thresholds (66 / 54), and sat directly under the reversal row (70 / 50) as a near-synonym
  carrying different numbers, leaving three unexplained pairs stacked in one box.
- **`sectorSensitivity` reversal copy** uses `formatThresholdNumber`, so the sector tilt no longer
  prints "above 70.0".

Archived briefs in `data/published_briefs.json` keep the wording they were published with; the
archive is append-only and its exports are expected to read as they did on the day.

### 1.1.25 The phone gets the reading, not the shell (2026-09-25)

A mobile review of `/operate`, `/signals` and the archive mode found the report routes opening
with chrome that restated the route instead of the week: a "Weekly brief" kicker above every H1,
the operating-loop glyph as a second navigation band under the bottom tab bar, a hero Share button
duplicating the page's own Share step, and a chips row that clipped its overflow with no affordance.
The intro also inverted the hierarchy the product claims — "Freezing" printed in micro type under a
display-size "Plan", on a page whose route name the bottom bar already carries. Changes, all in the
shell so every report route inherits them:

- **`CommandCenterNavBlock`: no kicker.** "Weekly brief" above every H1 restated the route the
  header tab, the sidebar and the bottom bar already name, and made distinct pages read as
  variations of one landing page.
- **The status word leads the intro.** The regime word prints first, in the regime ink, at the
  reading's own size; the trust headline and record date follow it in the meta half of the same
  line. The H1 drops to `text-fluid-base` below `lg` — the bottom bar owns the route name on a
  phone; the week's word is the fact the reader came for.
- **The operating-loop glyph is desktop-only** (`hidden lg:flex`): on a phone its four steps are
  the bottom bar's tabs, and under the intro it was a second navigation band pushing the first
  task block down.
- **`/operate` drops the hero Share button.** The Share step further down the same page owns
  sharing; on a phone both were in one viewport as "Share the brief" twice.
- **The refresh stamp reads "Signals refreshed …"**, not "Updated …" — two dates print inside one
  viewport and the reader has to be able to tell the pipeline's fetch from the reading's record
  date apart. The data-status vocabulary renames `live` to "All sources live": "Live" beside a
  dated reading claimed something about the page, when what is live is the sources.
- **`MobileSectionChips` fades its hidden edges** wherever content sits beyond them — a row that
  silently clips reads as broken labels, not as something you can scroll (the DD-001 affordance
  call, applied to the outline row).
- **Shell spacing tightens below `lg`** (`space-y-6 sm:space-y-8 lg:space-y-12`, section paddings
  `py-5 lg:py-8`): 40px between the chips row, the offline notice and the intro was unused space
  above the first task block, not separation.
- **The week checklist count is `text-sm`.** "0 of 5 done this week" is the most actionable fact
  under the intro and printed in the same micro size as the trust metadata above it.

**Command palette (`Cmd+K`).** Below `md` the palette is a bottom sheet, not a centered dialog:
touch-height rows (`min-h-11`), no keyboard-shortcut badges, no shortcut footer, no pre-selected
highlight (with no hardware keyboard the index never moves, and a permanent first-row highlight
only competes with the field above), and a neutral placeholder — the e/p/h mnemonics are for the
keyboard help, not the phone's only path to `/search`. The `.weather-kbd` badges hide behind a
wrapper span because the class is unlayered CSS and outranks the `hidden` utility.

**Archive mode.** The historical banner is one row with one action — "Archived view · Viewing
August 2026 · data as of Aug 31 · Back to this week". It was an eyebrow, a title, a paragraph and
up to three buttons, occupying half a phone screen before the historical guidance began; "Earlier
month" and "Pick a date" went with it, because the calendar picker beside the week title and the
palette's archive commands are where going deeper into the archive lives. The "Past week" tag
beside the week title is gone too — the banner is the mode's one marker, and the tag read as
another control while saying what the banner had already said. `CompactTrustPopover` renders
nothing in historical mode; its sources and dates are only truth for a live reading.

**The weather rationale is the condition, not the advice.** `REGIME_WEATHER_RATIONALES` keeps
the money fact and drops the instruction half ("Move faster", "Conserve cash"): beside a cautionary
call it read as two recommendations disagreeing, when the truth is one condition and one
constraint — the stamp states the condition, the heading owns the instruction. Consumers that
already took the fact half (the OG subtitle, the investor snippet) are unchanged.

**The trust strip's flip-risk cell answers "Not expected"**, not "No": the boolean says nothing is
near its line this reading; printed as "No" beside Medium confidence it read as a promise about
the future the confidence cell had just declined to make.

Measured at 430px after the change: no document overflow on `/`, `/operate`, `/signals`,
`/history` or archive mode; `/operate`'s first task block begins at y≈498 (intro ends at 317);
the archive banner is 123px with one action; the palette sheet spans the bottom 613px of the
viewport with 56px rows.

### 1.1.26 The confidence record grades the recent year (2026-09-25)

The calibration study's table is a whole-archive average, and nothing said whether it still
described the current year — a finding from 2012–2024 wearing a 2026 date would read the same.
`lib/report/calibrationDrift.ts` now grades the most recent twelve month-end readings from the
same extract, per band: did readings at that distance still hold more often than the percent
publishes for it? A rate-delta comparison against the historical baseline was built first and
rejected: eleven graded readings make a five-point threshold flag a two-reading band, which is
noise promoted to a claim. The published check is a direction, not a threshold. "Stable" and
"drifting" render one sentence in `ConfidenceRecordBody` (shared by `/calibration` and
`/history`, so the two cannot say different things); "unmeasured" renders nothing — a year too
thin to grade is a gap, not a guess. `tests/calibrationDrift.test.ts` pins the real archive's
current "stable" verdict, so the sentence and the data fail together.
