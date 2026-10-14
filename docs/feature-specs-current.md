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

### Responsive reading behavior (2026-10-03)

- On `/`, the call precedes the horizon selector and confidence popover, which sit beside Copy Brief before the evidence sections. A first visit uses the canonical site name as the short opening line, with the longer score explanation inside the existing reading guide.
- The header keeps all six operator tabs at tablet widths; Search becomes a labelled field only from `xl`, and the bottom navigation owns Search below `md`.
- The homepage header wraps its company controls on the smallest phones (up to 360px). The footer reserves its side-by-side brand column for `lg`, giving its link groups enough room at landscape and tablet widths.
- Desktop section outlines wrap long labels; the mobile section index uses readable shared metadata text and contains horizontal overscroll.
- The shared area table and homepage signal table stack below `md`, including landscape phone widths. Shared controls retain at least 44px touch targets on tablets; the compact 36px treatment requires a fine pointer with hover. Native text fields remain at least 16px on coarse pointers.

### Shared page spacing (2026-10-04)

The brief, report pages, answer pages and share groups use the spacing roles in `docs/agents/ui-ux-standards.md` §XXI. Page stacks own section separation; section stacks own heading/body gaps; framed cards own their insets. Report rows no longer add padding on top of an unboxed section's padding, and secondary-page titles and bodies share one left edge. The brief's company-control shelf uses aligned label columns above `sm`; phone controls stay in the header, with constraint notes retained when present. Narrative order, thresholds and export payloads are unchanged.

The share page centers its groups in a 72rem column and limits the shared copy preview to 48rem, with equal-width format tabs. Runway labels, timeline status badges and palette help use the metadata type scale; scenario explanations and the budget memo use the readable small-body scale. Timeline month/zoom controls and its drag track retain 44px targets on phones and coarse-pointer tablets, with compact controls available on desktop. These refinements preserve the copied payloads and history navigation behavior.

### 1.0a Four groups: This week, Decide, Record, Guides (2026-10-08)

The header carries four groups, each with a hub, read from one module
(`navigationGroups` and `navigationPages`, `lib/navigation/informationArchitecture.ts`):

| Group | Hub | Pages (sub-tabs, then secondary links) |
| --- | --- | --- |
| This week | `/` | Why it changed (`/signals`), How much to trust this week (`/trust`) |
| Decide | `/operate` | Runway planner (`/operate/financial`), Scenarios (`/operate/scenarios`), SaaS multiples (`/comps`) |
| Record | `/history` | Compare periods (`/history/compare`), Calibration (`/calibration`); Product writing (`/concepts`); cross-links to Sources (`/trust#source-board`) and How the scores are built (`/trust#formula-reference`) |
| Guides | `/resources` | the direct answers and guides by decision area, the frameworks and templates, and More tools |

- **One name per address.** A hub page carries its group's label: the H1 on `/operate` is "Decide"
  and on `/history` "Record". `/signals` keeps its URL; it is "Why it changed" in the tabs, the
  breadcrumb and the header sublabel.
- **Header.** From `md`: the wordmark, the four group tabs (one-key jumps `w`, `d`, `r`, `g`), then
  the utility links Use it elsewhere (`/share`), Pricing and About in lighter type, then search
  (⌘K) and theme. There is no More menu. Below `md` the bottom bar carries the four groups and
  More; More opens a sheet with Search, every group's pages and the utility links
  (`app/components/MobileTabBar.tsx`, `app/components/globalHeaderNavClient.tsx`).
- **Sub-tabs.** `SectionTabs` (`app/components/sectionTabs.tsx`) draws the group's pages above the
  intro on every page of a group with more than one (the report shell takes `page.currentPath`;
  `/comps`, `/calibration` and `/concepts` render it themselves). It replaced the planning
  switcher and the "Signals · Conditions · Plan · Share" loop strip beside the intro.
- **Breadcrumbs** come from `buildGroupBreadcrumbs` (`lib/navigation/breadcrumbs.ts`): the group,
  the page when it is not the hub, then the caller's crumbs — "This week › Why it changed",
  "Decide › Runway planner", "Record › Week of …", "Guides › <question>",
  "Guides › More tools › For CEO". A hub alone gets Home first.
- **Footer.** The brand column carries the utility links (Use it elsewhere, API & MCP, Pricing,
  About, Search, RSS); then one column per group, headed by the group's name linking its hub.
- **Resolve folded in.** `/resolve` 308s to `/operate#ops-decision-shield` (Test a decision); with
  a `stakeholder`, `stage`, `library` or `toolkitQuery` selection it goes to
  `/resources#more-tools`, where those views render (`resolveSelectionRedirects`, `next.config.js`).
  Its direct answers, with this week's standing stamped beside each, are on Guides grouped by
  decision area; Help by role, Help by situation, the role and stage guides and the toolkit library
  are Guides' More tools. `/resolve/<slug>` and `/toolkits/<slug>` keep their addresses.
  `/answers` goes to `/resources#answers`, `/guides/*` to Guides' More tools.
- **Sharing has one home.** `/share` holds every format, the slide and card clipboard buttons
  (moved from the brief), the meeting snippet (moved from `/trust`) and the links to API & MCP and
  RSS. The brief's Do and share and Trust each carry one "Share or embed this →" link
  (`app/components/shareOrEmbedLink.tsx`); Decide's Share step is gone, and its closing card to
  `/share` went in §1.1.65. Trust's one-line citation
  is served by `/share`'s Citation format. A frozen week keeps its date-pinned copy panel.
- **Discoverability.** The sitemap drops `/resolve` and ranks `/resources` as a hub; `/llms.txt`
  carries a Site section built from the same groups.

### 1.0 Rationalized IA (one screen + reachable depth)
*Superseded for navigation by §1.0a; the route notes below still hold unless §1.0a says otherwise.*
Primary IA is now a single surface — the **Weekly Brief** — with everything else reachable
as supporting layers, deep links, or URL-driven states of `/`:
- `/` — **Weekly Brief**: the canonical posture, decision delta, and share artifact (the product)
- `/operate` (Plan), `/signals` (Evidence), `/resolve` (Resolve), `/trust` (Trust): reachable
  but **supporting**, one click from the brief — not peer routes that invite a second scan
- `/history`, `/history/compare`: supporting archive and scrub/playback

Supporting surfaces are intentionally subordinate:
- `/toolkits/[slug]` pages are supporting instruments under **Resolve**
- `/resources` and `/resources/*`, `/answers/[slug]`, and `/concepts` remain secondary discovery or distribution surfaces rather than primary workflow hubs
- SEO concentration now favors a smaller authority set: the five primary workflow hubs, a curated subset of high-intent answer pages, and a curated subset of authority resource pages.
- Secondary pages such as `/toolkits/[slug]`, `/search`, most resource utilities, and most answer/detail bridge pages remain available in-product but default to noindex.
- `/guides` is a compatibility redirect into query-selected translation states on `/resolve` (`/guides/[stakeholder]` to `?stakeholder=`, `/guides/stage/[stage]` to `?stage=`), so role and stage translation live inside the canonical Resolve workflow rather than on a parallel library page.
- `/toolkits` permanently redirects to `/` (`next.config.js`). Toolkit search and browse state (`?toolkitQuery=`) live inside the Browse disclosure on `/resolve`, and each toolkit keeps its own `/toolkits/[slug]` page.
- `/posture` and `/startup-macro-posture` redirect back to the Weekly Brief (`/startup-macro-posture/index` to `/trust#formula-reference`), and `/solutions/*` redirects into `/resolve` or a toolkit page. Live posture reference no longer ships as a standalone workflow.
- `/search` renders its results on the server (`app/search/page.tsx`); the hub the top match belongs to is offered as the first action rather than redirected to.
- `/resources` is a hub page (`app/resources/page.tsx`) listing the governance frameworks and the decision guides; deeper governance material lives on focused `/resources/[slug]` detail pages.
- `/answers`, `/sources`, and `/confidence` no longer ship standalone page implementations; those URLs now permanently redirect to their canonical parent workflow states
- `/guides/stage`, `/guides/[stakeholder]`, `/guides/stage/[stage]`, `/concepts/conflicts`, `/concepts/focus/[focus]`, and `/concepts/audience/[audience]` are retired as standalone implementations and now permanently redirect into canonical hub-selected states on `/resolve` or `/concepts`
- `/learn/failure-modes` permanently redirects into the trust workflow (`/trust#revisit-call`) rather than acting as an independently indexable content hub.
- `/concepts` is a page again (restored 2026-09-23): one list of widely read product-management writing and, since 2026-10-09, capital-allocation essays and investor memos, each entry placed on the month-end record (conditions that month, how long they had held, both scores) and tagged Expand, Conserve or Craft, with each kind's share per set of conditions beside the months' share so no coincidence reads as a cause (§1.1.64). Every entry's first-publication month was checked against its source. Sub-paths (the first version's detail, focus, audience and conflicts pages) redirect to `/concepts`. Modules: `lib/productCanon.ts`, `lib/productCanonMeasures.ts`, `lib/adviceStance.ts`; test: `tests/productCanon.test.ts`.

The homepage renders no interpretation layer. A non-default `?view=` still selects one and the home assembly builds it (`buildInterpretationLayer`, called from `lib/report/homePageAssembler.ts`), but nothing reads it: its panel had no call site and was deleted on 2026-08-14, and the exports stopped receiving it on 2026-10-06 (§5.3.1).

Primary workflow pages now expose a top-of-page scroll path that explains the down-page sequence and highlights the current checkpoint as the operator moves through long surfaces.
Report-shell routes (`/signals`, `/operate`, `/resolve`, `/trust` and nested report paths) use a reduced global header mode with one intro block before page-specific content; the homepage now suppresses report-shell header chrome so the weekly card remains the first dominant surface, compact report-shell intros now merge route purpose, trust state, and the first CTA into one priority card, and do not inject a default export CTA on non-home routes.
Navigation reads the loop from one array in IA order (`navigationLayers`,
`lib/navigation/informationArchitecture.ts`). The Weekly Brief is the one `primary` layer; Plan,
Evidence, Resolve, Trust and History are `supporting` layers that name a parent. From `md` up the
header draws all six as text tabs with the active one underlined
(`app/components/globalHeaderNavClient.tsx`); below `md` a bottom tab bar carries Brief, Plan and
Evidence beside Search and More, and More opens a sheet with the rest
(`app/components/MobileTabBar.tsx`). The command palette mounts every loop layer.

### 1.1 Weekly briefing (/) 
The home page is the weekly brief. It renders in `Shell` (`app/components/Shell.tsx`), not the
report shell the other reading routes use. Since 2026-10-09 (site review) it prints one order for
every reader, with one `h1` and an `h2` per section after it (`HOME_SECTIONS` in
`lib/report/home/homeSectionModel.ts`; `app/page.tsx`; pinned by
`tests/homeRouteDecisionTransmissionContract.test.tsx`):

0. **The conditions legend** (`home/ConditionsLegend.tsx`), one line above the week, below `md`
   only: Sunny, Cloudy, Stormy and Freezing by funding pressure above or below its change line and
   risk appetite above or below its, linked to the method. From `md` up the card's conditions map is
   the definition (each change line's value at its end, "How they are set" under it), so the legend
   gives way to it (§1.1.63). It replaced the standfirst and the folded "How to read this page".
   Dismissible; the layout hides it for a browser that has rendered the brief before. The week
   picker above the card names the week by its Monday and is a label, not a heading.
1. **The verdict** (`#weekly-call`). `DecisionHero` is the card a reader screenshots: the conditions
   stamp with the week's direction and, when conditions changed, what they were; the week's
   headline action as the `h1` (`weeklyHeadline`, §1.1.60); what the conditions mean; one line on
   why (`describeMovementCause`: the lines the scores crossed, "Risk appetite fell through 54."); the
   trust strip ("Data as of", Sources, and Margin, which says after the points whether the call could
   change next week, by `couldCallChangeNextWeek`, §1.1.31a); and from `md` up the conditions map
   with the trail's caption under it. A monthly or quarterly horizon adds `CadenceCallCard` above it
   with the `h1`. Under the card sit
   `SinceLastVisit` (only when the conditions or the call differ from what this browser last saw,
   and not when the difference is the earlier conditions the stamp line names) and `YourRecordNote`
   (live briefs only), then Copy Brief (DD-005's one primary action) and the Plan horizon control.
   `CadenceCallCard` states the horizon's guidance and its Pause if / Resume when pair, and under the
   pair draws one `ThresholdLadder` for funding pressure and one for risk appetite
   (`cadenceCallModel.boundedBands`, built by `buildHorizonSignalBands` in
   `lib/summary/horizonOperatingRules.ts` from the thresholds the pair's sentences use): the score,
   its move since the comparison reading, and how far it sits from the pause line and the resume
   line. When the guidance is held the card prints neither the pair nor the ladders; the weekly card
   below states the hold's lines.
2. **Stage and runway** (`home/CompanyCalibration.tsx`, `#company-calibration`, live weekly brief
   only): the stage and runway tablists from `sm` up (the header's pills on a phone), each marking
   its default choice, a chosen stage's own action as a stage line, and the runway emphasis once a
   band reshaped a rule. No sentence restates the selection; on a phone the section prints only
   with a stage line or a runway note. Nothing lower on the page repeats the control.
3. **The five areas** (`DecisionPicker`, `#what-it-changes`, "What are you deciding?"): each area
   by its name with its standing against its pause line; a choice opens its rule, lines and the
   runway test. All five side by side fold under it (`AllAreaRules`: the area table, the runway
   notes and the commitment test), then the one plan button. No "This week's scores" list: the map
   and the bars in section 6 print the scores at every width.
4. **What would change this guidance** (`WhatWouldChangeSection`): the pause line, the resume line
   (a chosen stage's, else the lead area's), the line where conditions change, the market move in
   rate terms (folded), and below `md` the conditions map (no distance caption: the trust strip's
   margin states it).
5. **Get an email the day a line is crossed** (`AlertSection`, `#subscribe`): the one subscribe
   form, starting on alerts only with the Monday email one choice away, and the push toggle.
6. **What changed this week** (`WhatChangedSection`): one row per signal, the earlier reading →
   this week's with the comparison dated (§1.1.26), each composite score on its ladder with what
   moved it (§1.1.27). It opens on the table: the movement sentence (§1.1.28) restated the card, and
   each area's row says which of its lines moved. A read with no comparison says so over it.
7. **Has this happened before?** (`RecordSection`): on a week conditions changed, the last time
   they moved the same way and where the scores stood three months on; on every week, how long
   these conditions lasted before (§1.1.76); the last turns as links.
8. **The closing line** (`ShareLinks`), with no heading: "Share or embed this →" to `/share`, which
   holds the slide and image copies and every other format since 2026-10-08, and the week's
   published brief named by its week ("Published brief for the week of Oct 5, 2026 →").

There is no first-visit fold since 2026-10-09: the order puts the areas, the lines and the alert
before the evidence for every reader, so the fold (§1.1.21, §1.1.42) and its "Show the full brief"
button are gone, and the bootstrap no longer marks a first visit. `StickyCallStrip` carries the
guidance from `md` up once the card has left the screen, with a "By area" link to section 3. An archived month drops the trust strip
for an archive caption and leaves out `SinceLastVisit`, `YourRecordNote`, the stage and runway
section and the runway notes. `/` mounts `ActivationTracker` and `OperatorWorkflowRouteTracker`;
the workflow stream records route transitions (§1.1.30).

The decision contract's labels come from `DECISION_CONTRACT_LABELS` (`lib/report/reportCopy.ts`):
`Do now` / `Action now`, `Pause if`, `Resume when`, and `Conditions change if`. The lines are built in
one weekly-call contract (`WeeklyCallContract`, `lib/report/weeklyCallContract.ts`) rather than
route-local copy assembly, so the card, Copy Brief and the exported briefs agree. Its change side is
`callChangesIf` (where the conditions change) plus, only when a stage is set, `resumeWhen` (the
stage's discipline for lifting its hold); a stage adds the second line and never replaces the first.
A term carries its meaning where it appears (§1.5).

`WeeklyChangeReport` (`app/components/hero/weeklyChangeReport.tsx`), the hero block whose three
bands (*What changed*, *What that changes for you*, *What stays the same*) this order grew from, was
deleted on 2026-09-22 with the hero cards beside it. The tool racks removed from `/` before that
(transition probability, regime history chart, what-if simulators) are recorded in section 8.

Copy strategy for briefing and onboarding surfaces favors concise, action-first language: one headline plus one support sentence before primary actions, with deeper rationale moved into expandable or secondary sections.
Route summaries and hero copy favor user-job phrasing over internal product nouns, especially on Evidence, Planning, Resolve, and Trust.

Weekly Brief URLs now emit week-specific Open Graph and Twitter preview cards. Shared links for the
current brief or a historical Time Machine selection preview the selected week’s posture, immediate
decision, flip condition, and core rate context instead of falling back to a generic site card.

Cold opens into `/` show the shared route loading shell (`app/loading.tsx`, `RouteLoadingShell`)
until the report resolves.

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

### 1.1.1c A reading follows the rule; it does not sit in parentheses inside it (2026-10-09)
The rule-line builders stapled a gloss onto every line that carried a reading: a met pause or
resume line read "funding pressure is above 76 (already true at 90)", and the change line put
"(90 today)" after one score and "(49 today)" after the other, two parentheses of one kind in one
sentence, on every page, paste, email and alert that prints the rule.

- **Pause and resume lines** (`formatRuleClause`, the stage lines in
  `buildScopedVariantDecisionAdjustment`): a met line states where the score is ("is above 76"),
  and the reading follows the rule as its own sentence, `formatReadingsNow`
  (`lib/report/reportFormatting.ts`): "Pause net-new hiring if funding pressure is above 76 or risk
  appetite falls below 44. Funding pressure is 90 now." Compaction (`extractCompactClause`, behind
  every "Pause if" slot) keeps that sentence with its rule, so a compact slot still says the line
  is met. An alert that names the crossing itself drops it (`withoutReadingsNow`).
- **The change line** (`buildCallChangeLines`, `buildFlipThreshold`): the reading rides in the
  move, "Funding pressure falls 20 pts from 90 to 70 or below, or risk appetite rises 1 pt from 49
  to clear 50." A crossed line is stated like a met pause line.
- **Frozen records** w38 to w41 stored the old forms; `publishedBriefs` restates them at display
  in the new one, as it already restated retired signal names: same lines, same readings.

`tests/readerClauseShapes.test.tsx` holds it: no rule, stage or change line carries a parenthesis,
and no frozen record's update prints a stored "(already true at N)" or "(N today)". The same file
fails reader copy on two clause shapes found in the same pass — a wh-clause stapled onto a list
("Look up what the guidance said in any past month, and how it held up.") and one gloss printed
twice in a sentence — across the offline pages, all 74 `/history/[period]` pages, the page
descriptions, the navigation, every golden paste, the frozen records' updates and `/llms.txt`.
`docs/editorial-guardrails.md` → Sentence shape has the rules.

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
- **Plan** opens with "This week's rule for each area" (§1.1.46; it opened with "Test a decision"
  from §1.1.36 until 2026-10-07); the sticky one-row strip is section navigation
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
The palette printed `⇧S` from the day it shipped while nothing bound it; since 2026-10-06
`KeyboardShortcuts` binds it to the share rail (Shift alone: `⌘⇧S` is focus mode's) and the help
dialog lists it.
`F` acts only with no `⌘`, `Ctrl` or `Alt` held, and never from a text field, select or
contenteditable (`isFocusModeShortcut`, since 2026-10-07). It used to ignore the modifiers, so
`⌘F`/`Ctrl+F` opened the presentation and blocked the browser's find-in-page.

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
  swapped ("Decision help" / "Still have one open question?"). That block left on 2026-09-15, and
  the production smoke now asks `/operate` for "Set this plan's lines" instead.
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
  validates on blur, commits on parse, and treats blank as "not given". Gross margin came back on
  2026-09-26 as a figure the operator enters, not a default: `grossMarginPct` (0–100) is on the same
  profile, asked for only when the Decision Shield's Model is Bootstrapped, and able to turn RISKY
  into SAFE from there (§5.7).
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

`BASE_RATE_SOURCE_LABELS` (`lib/report/regimeDescription.ts`, moved from the engine core with the rest of the engine's copy) is now the one place that names the reading,
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

- **The method moved to `/about#method` (2026-10-09)**, beside "What is new here", as "How to use
  the pause and resume lines", in the screen vocabulary (pause and resume lines, not threshold and
  reversal). It is the product's thesis, and as the last section of `/trust` it read as an appendix
  to a page a reader opens to check this week's reading; `/trust` keeps a one-line link.
  `/threshold` redirects to `/about#method` and `/template` to `/about#template`.
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

**Only the presentation half was unified, deliberately.** `buildSlackBrief` feeds the Monday
Slack post (`lib/slack/deliverSlackBrief.ts`), and `buildCallCitation` feeds `weeklyBriefSnapshot` —
both publish text that cannot be quietly changed afterwards: a sent post, a cited call. Changing
their output is a product decision about published records, not a refactor, so they are pinned
where they are. What
merged is the part with no such constraint:

- The share panel's "Slide" format and `CopyMeetingSlideButton` were emitting two different
  markdown blocks for the same week. The panel's carried the resume thresholds and a link; the
  button's carried neither. Both now compose `formatMeetingSlideMarkdown` through
  `briefArtifactToSlidePayload`, so the meeting slide gained the clears-when line it was missing
  and the snapshot marker. `tests/briefArtifactFormats.test.ts` asserts the two are byte-identical.
  (2026-10-06: the "clears-when line" was the flip conditions, printed as the resume line; it prints
  as "Watch this week" now, and the slide routes go through the same adapter. §5.3.1.)
  (2026-10-06: `buildSlackBrief` and `buildCallCitation` render the brief document now. The
  archive keeps every record it wrote; the records written after it carry the contract's call,
  and the stand-ins the script printed on live weeks are gone. §5.3.1.)
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

### 1.1.14a Modes and settings that changed nothing (2026-09-07)
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

### 1.1.14b Alert mail that could not reach anyone (2026-09-07)
Follow-up to §1.1.14a, after tracing the alert channel toggles past the UI into the delivery
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
through and was then dropped — the same defect §1.1.14a fixed in `/api/embed`, still live
one route over. Both now use `parseOperatorStageParam`.

Covered by `tests/alertDelivery.test.ts`, `tests/alertsPanelClaims.test.tsx`, and
`tests/imageBriefSearchParams.test.ts`.

### 1.1.14c Controls at the wrong layer of parentage (2026-09-07)
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

### 1.1.14d Header, nav and footer, looked at rather than reasoned about (2026-09-07)
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
  border and fill — five of them on the home brief once Present moved up in §1.1.14c —
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
  §1.1.14d; no cadence telemetry exists to settle it, so it is a product decision, not a measurement.
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

**Screenshot-ready blocks (2026-09-29).** The homepage card and every report intro end in a
`ScreenshotCaption` (name and host, inside the border), because a phone screenshot is cropped to the
box before it is pasted. On phones, `FirstVisitExplainer` is hidden for a browser that has rendered
the brief before (`data-home-returning`, set pre-paint), which puts the call in the top quarter of
the first screen; the bottom tab bar hides on scroll down. Mobile UI captures render at 3x and save
the first screen on its own (`*-screen.png`).

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
tab bar (reverses P0 #1 of the design-improvements tracker, retired 2026-10-05).

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

**The portfolio note (2026-10-01).** "Portfolio note" on `/share` (`lib/export/portfolioNote.ts`)
runs the other way from the investor update: one investor platform team or accelerator writing to
the companies it backs. Their runways differ, so it carries no runway sentence of its own reader;
it prints the conditions and confidence, each area's rule with its pause and resume lines (the
same `buildAreaRows` strings as the plan page), and what the week means at all four runway bands
from `buildRunwayConditionedNotes`, with the band named once rather than in every note. It ends
with the link to `/operate#ops-plan-lines`, where each company can move the lines for its own plan
(§1.1.31), the source stamp (with the saved-copy note on a fallback) and the dated permalink. Built
on the server; nothing from the reader's browser.

**Flash alerts.** `lib/alert/flashMoves.ts` judges two raw inputs between *consecutive* reads: a
move of 0.25 points or more in the short rate (a cut between meetings, a bill-market
dislocation) or 0.20 points or more in 10Y−2Y (a spread blowout) fires the day it lands, whether
or not a score crossed anything. Consecutive means the previous snapshot, which
`refreshOperatingState` now returns — never the last alert state, which is written only when
something fires and would turn weeks of drift into a flash — and at most seven days apart,
because the size assumes a short window. It is a critical CFO alert that bypasses the weekly
cooldown like a regime change, deduplicated per input (`flash:baseRate`, `flash:curveSlope`),
mailed through `flashMoveEmail` and posted to every Slack target through the shared
`slackChannel` (`lib/delivery/slack.ts`, §1.1.43), on both crons. `/privacy` §2.1 says what the
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
(Changed 2026-10-07, §1.1.55: the moves translate the "Conditions change if" sentence's own lines, in its
order and in percentage points, none for a line it calls already crossed and none on a held week; they print
only in the "In interest-rate terms" fold under that sentence, and every one-line surface states the sentence's
nearer line in points instead.)

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
  (2026-10-09: the reading moved into the move, "Funding pressure falls 13 pts from 83 to 70 or
  below, or risk appetite rises 10 pts from 40 to clear 50"; see §1.1.1c.)
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
`refused_unpublishable` / `failed`; §1.1.43 adds `skipped_already_posted` when every target already has the week's post).

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
  Until 2026-10-06 that last claim held for the reading but not for the call: the post re-derived
  its call slots from the lead area row and the assessment's description, with no
  policy-override branch, while the email read the snapshot's `WeeklyCallContract`. The post's
  call slots are the contract's now (§5.3.1).
- **The flip reaches subscribed channels.** `checkRegimeChange` posted regime-change, flash, and
  flip-window alerts to `SLACK_WEBHOOK_URL` alone. Those now go to every subscribed webhook as
  well (never throwing, so a slow Slack post cannot fail the KV state write after it), which is
  what "a note if the call flips" promises a channel. The daily threshold-crossing mail
  (sentiment/credit lines) deliberately stays email-only, and Slack subscriptions carry no
  per-channel delivery preferences.

### 1.1.21 A first visit gets one question, not the whole brief (2026-09-23)

A first-time reader met a call about the market and roughly 3,200px of evidence for it, with
nothing connecting either to the decision they arrived with. For a browser that has never
rendered the brief, `/` now folds sections 2 to 5 away and shows `DecisionPicker`
under the call:

- **"What are you deciding?"** Five choices (hire, roadmap, raise, spend, something new),
  each answered with that area's row of the same table the full brief prints (the rule, its pause
  and resume lines, and the distance to each), plus the answer page that leads with that area.
  Since 2026-10-01 the question drops "this week" and says the answer holds until a score crosses
  one of its lines, which most weeks none does; the category line (`canonicalPositioningLine`)
  leads with the lines and the crossing email rather than with Monday, for the same reason.
- **"Test it against your runway"**, under the picked answer: cash in the bank, monthly spend,
  monthly revenue (optional; blank counts as none) and the monthly cost of the decision. The box
  states net burn, how long the cash lasts and the month it runs out (`describeProfileRunway`), then
  the runway after the decision, whether that crosses a band, and the runway note this week's
  guidance already carries for the area at the new figure (`buildCommitmentImpact`). A company
  whose revenue covers its spending is told whether the decision still leaves it covered, and if
  not, how long its cash lasts at the burn it starts. Cash, spend and revenue are the shared
  browser-only operator profile; a runway typed on `/operate` still counts until cash replaces it.
  The decision's cost is not stored. It asked for runway and burn until 2026-10-01, which assumed
  a finance lead to work runway out, and divided by spend as if it were net burn (below).
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

The runway unification itself landed on `main` separately (7f264a26, recorded in docs/agents/lessons/dead-features-and-honesty.md, "One
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

### 1.1.24a The phone gets the reading, not the shell (2026-09-25)

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
  sharing; on a phone both were in one viewport as "Share the brief" twice. With no route left
  setting it, the shell's `showShare` slot and `ShareRailButton` were deleted on 2026-10-06; the
  global share rail opens from the command palette and `⇧S`.
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
  under the intro and printed in the same micro size as the trust metadata above it. Since
  2026-10-02 it heads the checklist ("Steps for this week", the count at the right over the Done
  boxes, a rule under both) with 24px above, instead of sitting directly under the trust strip as
  if it were one of its facts (DD-037).

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

### 1.1.24b The confidence record grades the recent year (2026-09-25)

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

### 1.1.25 The brief card says what the exports say (2026-09-29)

`/api/image/brief` — the PNG `/share` lists and the card a Slack channel or link unfurl shows — set its
confidence chip and its data line at 12–13px (about 5px in a feed) and spent its middle on one of the
two scores, beside a gauge whose end labels were bare numbers. It never said where either score sat
against the line that changes the call, so the number could not be acted on. It now draws both readings
the way `/share` and every paste print them: the value, the pause line and the distance to it, the resume
line and the distance to that. `buildScoreReadings` (`lib/export/scoreReference.ts`) returns those parts
and `buildScoreReferenceLines` joins the same parts, so the card and the paste share one derivation;
`tests/briefImageRoute.test.ts` fails if they drift. Nothing on the card is under 22px (the weekly card's
floor), and the call is sized by the wrap estimate the weekly card uses (`lib/image/textFit.ts`, shared by
both now) instead of being cut at 80 characters.

Also fixed on the card:

- **The weather word printed twice** ("FREEZING · FREEZING"): the regime's weather label and the posture
  label, which is the same word, both printed. It is one stamp in the regime's own colour now, as on the
  weekly card.
- **A direction arrow picked by substring.** "tighten" drew an up arrow and "ease" a down arrow, and
  "increase" contains "ease". Gone; the top bar and the stamp carry the tone.
- **"Data: FRED · Treasury · Yahoo Finance".** Yahoo Finance feeds only the SaaS comps and contributes
  nothing to either score (§1.1.9 corrected the same credit on `/state`). The line now names what the
  scores are built from, through one label both share (`readerSourceLabel`): Treasury rates and FRED
  (credit spreads, volatility, financial conditions), plus the curated startup-market snapshot that
  `/about` says every surface using it should disclose. The weekly card's line said "US Treasury rates"
  alone, which reads as rates-only; a review of this change caught that, and the shared label fixes both.
- **A saved or historical reading looked live.** The card gave no sign that a fallback snapshot or `?month=`
  was behind it. It prints the weekly card's label for that (`notLiveReadingLabel`, one function for both).

**Found: "last week" was not last week.** Every export printed `last week 63` beside the funding-pressure
reading, and the homepage said "rose 27 since last week to 90". The comparison behind both is
`reportDynamics`, built against `getPreviousTimeMachineSnapshot(record_date)`, the latest snapshot
strictly before the record date, and the bundled Time Machine cache is monthly (176 month-end rows, the
last 2026-08-31). The reads of Sep 18 and Sep 25 both compare with Aug 31, and 63 and 56 are that
snapshot's scores. So the figure is the change since the last month-end, up to five weeks, under a
one-week label — on the page, on `/share`, in the Slack post and in every paste. This change left the
card without it, and `tests/briefImageRoute.test.ts` pinned the precondition. §1.1.26 names the date
instead, everywhere, and the card prints it again.

**Found, not changed: "Conditions change if" has three answers for one week.** The homepage prints the
regime lines ("Funding pressure falls 20 pts to 70 or below (90 today) or risk appetite rises 7 pts to
clear 50", `buildFlipThreshold`). The weekly card and the `/share` paste print `weeklyCall.callChangesIf`,
the confirmation rule ("Funding pressure at or below 66 for two readings in a row",
`buildWeeklyLockCommitment().flipConditions[0]`). The `/share` panel lists two rate conditions under the
same label. Each is defended where it is written, and `tests/stageResumeLineIsNotTheCallChange.test.tsx`
pins the second, so which of them is the line where the call changes is the owner's decision. The brief
card prints none of them.

### 1.1.26 Every comparison names what it is against (2026-09-29)

§1.1.25 found that "last week" is the previous Time Machine snapshot, which is the last month-end. The
weekly comparison itself is a product call and is unchanged; what changed is that no surface calls it a
week any more.

- **The loader records the date.** `ReportDynamics.comparedWith` is `{ recordDate, label }`, set in
  `reportDataLoader.ts` from `previousSnapshot.record_date` by `buildComparedWith`
  (`lib/report/comparisonBasis.ts`). The label is "Aug 31", with the year when the earlier reading is from
  another calendar year ("Dec 31, 2025"), so a January read never prints a date that reads as this year's.
  It is absent when there was no comparison, and where a source did not say which reading it compared with.
- **One function names it.** `comparisonBasis(comparedWith)` returns the phrase each place needs: the
  column head ("Aug 31 → this week"), "since Aug 31", "vs Aug 31", "on Aug 31". Given no date it returns
  the wording each surface always had, so a source that cannot name its reading does not invent one. The
  date rides on `PreviousReading` (`previousScoresFromDynamics`, `lib/export/scoreReference.ts`), the one
  object every export and page already receives its earlier scores in.
- **Where it prints.** The homepage table's column head, caption, the sentence over it ("The scores moved
  toward tighter money since Aug 31.") and both ladders' hollow dot; `/signals` (table head, each row's move,
  score cells, call-line ladders); `/trust` ladders; `/share`, Slack and every paste ("… · 14 pts above ·
  was 63 on Aug 31 · resume line 66 (24 pts away)"), the "• vs Aug 31: worse" direction line and the
  Operating latitude line; the `/api/posture/current` summary; the agent payload's `decision_delta`
  (`compared_with: { record_date, label }` beside `from` and `delta`, and a summary that says "since Aug 31");
  the home brief's own labels (posture delta, indicator deltas, net delta, and the weekly-movement sentence the
  published-brief record freezes).
- **The brief card has the earlier reading back.** `pause line 76 · 14 pts above · was 63 on Aug 31` is
  one row at the card's 24px type; `tests/briefImageRoute.test.ts` holds the longest dated detail line
  ("Dec 31, 2025") to one row, because a wrapped row is a fourth line and the 800px budget (769px with
  three) has no room for one.
- **A date reads as a date.** In text the earlier reading is "was 63 on Aug 31" rather than "aug 31 63",
  which reads as two numbers. A ladder's hollow-dot caption gained a colon for the same reason ("Aug 31: 63";
  "Last week: 63" undated; "Period B: 61" on `/history/compare`).

Deliberately not renamed: "last week's plan", "last week's approvals" and the like, which are about the
plan the reader is running rather than a comparison; the two market inputs' "vs last week", which move
against their own previous observation; and the published archive's "vs prior week" on `/brief/[week]`,
which prints deltas frozen into append-only records that do not say what they were measured against. The
follow-up for that is to freeze `comparedWith` into newly published records.

**Found, not changed: Operating latitude's move is zero on any week that crossed no line.**
`buildHomeBriefModel` builds the previous assessment behind `weeklyLeadershipSummary` only when a regime
alert exists, which needs a regime change or a crossed line. With the same movement (funding pressure +12,
risk appetite −6) it reports −8, "More defensive since Aug 31.", and `steadyWeek: false` when a line was
crossed, and `0`, "The guidance is holding where it was on Aug 31.", `steadyWeek: true` when none was, so the
exports' "Operating latitude … · vs Aug 31: no change" can be printed over a week the scores moved. The
guidance is the same on that week, which is what the sentence claims; the number is the open question.
Building the previous assessment from the dynamics whenever a comparison exists would change `steadyWeek`,
and with it the quiet-day line, so it is recorded here and not changed. (Changed 2026-10-07, §1.1.52: the
move is measured whenever a comparison exists, and "nothing changed" lines no longer read it.)

### 1.1.27 Say what moved the score (2026-09-29)

The page said funding pressure went from 63 to 90 and never said which inputs account for the 27.

**Found: the two readings are not built from the same inputs.** `reportDataLoader.ts` scores the earlier
reading with `evaluateRegime(previousSnapshot, thresholds)`, which is rates alone: no market series and no
rate-speed history. Today's reading carries both. On the Sep 25 read the earlier scores are 63 and 56; today's
inputs score 90 and 54 from rates alone, 90 and 54 with the rate-speed history (its term is 0), and 90 and 43
in full. So funding pressure's +27 is all interest rates, and risk appetite's −13 is −2 from the yield curve
and −11 from the startup-market inputs (the VC funding slowdown and tech layoff pressure), which the Aug 31
score was never built from. The risk-appetite "pause line crossed" (43 against 44) is caused entirely by
those inputs. The Time Machine's monthly walk is not like-for-like either: it scores months with volatility
and rate speed but no other market series (`buildThreadedRegimeWalk`).

**What ships.** `ReportDynamics.movement` says what each score's move is made of, built by
`explainScoreMovement` (`lib/report/scoreMovement.ts`), which scores today's inputs in stages through the
engine itself (the loader's `evaluateRegime`, not a second copy of its arithmetic): rates alone, with the
rate-speed history, with the market inputs except volatility, and in full. The parts are the differences
between stages, so they add up to the move exactly (every stage's score is a whole number):

| Score | Parts, in the order they are named |
| --- | --- |
| Funding pressure | interest rates · the recent pace of rate rises · credit-market and financial-conditions stress |
| Risk appetite | the yield curve · startup-market inputs · stock-market volatility |

Startup inputs count as if volatility were absent, and volatility for what it adds on top, because the
volatility veto caps the score and the two do not add on their own
(`tests/scoreMovement.test.ts` holds it). Nothing is printed unless the stages rebuild the score the page
shows, so a replay or a stored snapshot the loader cannot rebuild carries no split instead of one that does
not add up (`tests/comparisonBasis.test.ts` holds the sum against the real loader).

**Where it prints.** Under each score on the homepage table ("What moved it: -2 from the yield curve and -11
from startup-market inputs. The Aug 31 score was built from interest rates alone."), under the move on
`/signals`, and as one line under the two readings in every paste: `What moved the scores since Aug 31:
funding pressure +27 (all from interest rates); risk appetite -13 (-2 from the yield curve and -11 from
startup-market inputs). The Aug 31 scores were built from interest rates alone.` (`/share`, Slack, the board
and issue-tracker forms). The caveat sentence is the point of stating the split: a −11 that is an input the
earlier score never had is not the market moving, and a reader told only the total takes it for that. It is
left off when every part is rates or the curve. Not on the brief card, which is at 769px of its 800 with three
lines to a reading, so a fourth line in each would run off the bottom (`lib/image/briefImageTemplate.tsx`).

**Found, not changed: the earlier reading is scored without the inputs today's has.** Making the comparison
like-for-like means scoring the earlier reading with the market series as they stood on its date
(`alignMacroSeriesToAsOf` exists for replays) or leaving the inputs out of the delta. Either changes every
published delta, the regime alert, and comparability with the archive, so it is a product call and is
recorded here, with the real numbers, rather than made.

### 1.1.28 Say what the move did to the decisions (2026-09-29)

The archive's account of two consecutive weeks was the same sentence: `data/published_briefs.json` w38 and
w39 both say "Pressure increased by +3.0 this week. Slow new commitments until conditions stabilize.",
beside the guidance "freeze new commitments". Three things were wrong with it. "+3.0" is a figure in a unit
nothing else uses (`buildWeeklyMovementMetric` sums a regime step and per-signal moves and clips them at ±3).
"Slow new commitments" is an instruction of its own, printed whenever pressure rose, over guidance that had
already said something stronger. And "this week" was not the comparison: both weeks were measured against
Aug 31 (§1.1.26). Nothing said what a reader who acts on lines needs to know, which is whether anything
*crossed* one. Against Aug 31 (63 and 56) both weeks did, and against each other (w38 77 and 42, w39 85 and
39) neither did.

**What ships.** One derivation, `buildDecisionMovement` (`lib/report/decisionMovement.ts`), read by every
surface below. Each area is a small state against its own lines, taken from the same conditions the rules
table prints through the same `isRuleConditionMet`: *paused* when any pause line holds, *resumable* when
every numeric resume line holds, *holding* otherwise. It compares the state at the earlier reading with the
state now and names the lines that decided it. Five movements: `paused`, `lifted`, `resumable`,
`resumeLost`, `held`. Coming out of a pause into resumable names the resume line, the further one a score
has passed. The sentence, for the Sep 25 read:

> Since Aug 31, conditions changed from Sunny to Freezing and the pause now applies to every area: funding
> pressure rose through 76 and risk appetite fell through 44.

A week nothing crossed says so and stops: `Conditions held steady since Sep 15; no pause or resume line was
crossed. Last week's guidance stands.` A change of conditions with no line crossed says that
(`tests/decisionMovement.test.ts` holds the shapes). It claims nothing without an earlier reading, nothing
about the market state when the assessed state is not what the scores classify into (a change waiting on
confirmation), and reads "this week" where the source did not date the earlier reading.

**Where it prints.** The lead over "What changed this week" (followed by the nearest line on a quiet week,
`buildChangedLead`); the by-area table's **Changed** column, which used to carry a fixed re-check sentence for
whichever three areas the largest moves pointed at whether or not the rule had anything to re-check, and now
says what happened to that area's own lines ("Pause now applies: risk appetite fell through 44."), names
the side of its lines an area a move did not touch held on ("Pause still applies: no line crossed since Aug
31.", §1.1.56), and draws no column on a week nothing
crossed; the first-visit picker's amber note for the chosen area; `weeklyMovement.summary`, and so the frozen
record's `whatChanged` (new freezes only: the archive is append-only, and w38 and w39 keep the sentence they
were frozen with); `decisionShiftSummary` and `decisionShiftHeadline`, which are the "Changed:" line in the
share artifact, `/api/decision` and the read-this card; the lead line of "What changed this week" in every
paste (`buildReadingLines`, which the issue-tracker form now shares instead of keeping a private copy); the
agent state (`change.summary`, and `change.crossed`, grouped by how the areas moved with the lines that
decided it); and `whether changes` (`decision`). `weeklyMovement.score` and `.direction` are unchanged.
**Not on the brief card**, which is at 769px of its 800 in the worst case (§1.1.27); it already prints each
score against the line and the earlier reading.

**On the share card, whole (2026-10-01).** The weekly share card's "What changed" box and the link preview
print `headline`, the sentence without its evidence, and the box holds 140 characters. The Oct 1 reading
(90 and 44 against Aug 31's 63 and 56) changed conditions and moved areas two ways, and its headline ran to
174, so the card printed "…Spending and New bets; the…". `headlines` now carries the headline and then
whole sentences that say less, and `fitMovementHeadline` takes the first that fits: the conditions clause
goes first, because the card prints the conditions now in its own label ("Since Aug 31, the pause now
applies to Hiring, Fundraising, Spending and New bets; the resume line is no longer met for Roadmap."),
then the areas go to a count ("…and every area crossed a pause or resume line."). `tests/decisionMovement.test.ts`
holds every reading on a grid to the box.

**Your record, on the brief.** `/decisions` was reachable from the footer, the command palette and the confirmation under the Decision Shield's record button, and nothing in the brief connected the two halves of one question (which of my commitments rest on what moved?). A
browser that has recorded a decision now gets one line under the returning-visitor strip, in the record's own
headline ("1 decision rests on conditions that have moved since it was recorded." / "All 3 decisions on this
browser still rest on conditions that hold.") and a link to the rows (`YourRecordNote`,
`app/components/home/YourRecordNote.tsx`). Nothing renders for a browser with no record, on a failed read, or
on an archived week. Nearly every browser on `/` has an id (the alert toggle mints one), so the page asks
the server only when the browser remembers having recorded something: `whether.decisionMemory:<id>` (a key
the registry already accounted for and nothing used) holds the count, kept by `fetchDecisionLedger` and
`logDecisionToLedger`. A browser that recorded before this shipped sees the note after it next opens
`/decisions`. `/privacy` 2.4 says so.

**The analogue says how it differed.** "The last time conditions moved this way" printed Sep 2022 and where the
scores stood three months on, which reads as a forecast to anyone who is not told where that month started.
On the Sep 25 read it found Stormy to Freezing at funding pressure 79 and risk appetite 7; this week is Sunny
to Freezing at 90 and 43. The card now adds `Against this week:` (`describeAgainstToday`): the change it was
and this week's when they differ, each score then and now with what it means (`signalReadingMeaning`), and
"One earlier outcome, not a forecast." unless it is the same change with both scores within 5 points.
(Reworded 2026-10-08: each score reads "was 79 then and is 90 now", not "Then, … ; now they are …".
Reworded 2026-10-09: one sentence per score, and a meaning both readings share printed once —
"Funding pressure was 79 then and is 90 now; at both readings, money is hard to raise.")

**Found, not changed (decided in §1.1.51: the basis is last week's published brief).** The comparison is the previous month-end snapshot (§1.1.26), so every brief in a month
restates the same crossing: w40 would say what w38 said. A weekly basis for the archive is the previous
*published record* (its `scores` and `decisions[].pause/resume` are enough to run the same derivation), which
means both freeze writers (`scripts/freezeWeeklyBrief.ts`, `worker/workflows/weeklyBriefFreeze.ts`) supply
the earlier record to `buildPublishedBriefRecord`, and the archive page would then name a different basis
from the live one. Not done: it is a change to what the archive says about a week, which is an owner
decision.

### 1.1.29 Put the call where the eye lands first (2026-09-30)

A predicted-attention pass (DOM saliency: type size, weight, contrast, numbers, depth and F-pattern
reading, scored per element at 1440×900 and 390×844; no real sessions) over eight routes ranked twelve
changes. What shipped:

- **`/brief/[week]`** leads with *What changed* and *What would change this guidance*; the share panel
  follows, its preview folded to a few lines behind "Show the whole preview". Every shared paste links here,
  and the Slack preview used to fill the first desktop screen with the delta on the fold. The panel's primary
  "Copy Slack update" also rendered white on white in the light theme: `ClipboardActionRow` stacked
  `weather-button` and `weather-button-primary`, and the light `.weather-button` background won. It has a
  `primary` variant now. Slack/Email toggles are 44px.
- **2026-w31 correction.** The record carries a correction: its Do-now line was the Cloudy "freeze new
  commitments" line on a Sunny week, from before `buildActionNowShort` keyed on the state.
  `tests/publishedBriefCallAgreement.test.ts` fails any record whose Do-now line its own state could not print
  unless it carries a correction.
- **Home.** The explainer is hidden for returning readers at every width (it was phone-only). Copy Brief
  (DD-005's one primary action) moved from *Do and share* to directly under the call card, outside the
  screenshot; on a first visit it folds with the brief, because on a phone it pushed the decision picker under
  the tab bar.
- **`/pricing`.** "Cannot be bought yet" sits under each paid price instead of after the buttons; the free list
  shows four items and folds the rest, which brings every plan button above a 900px fold. The closing section
  says what a request does.
- **`/history`** names the newest published week above the month strip when it is newer than the strip, so the
  month-end "Sunny, held 9 months" no longer reads as a contradiction of the week's call.
- **`/trust`** folds the four formula cards behind "Show the exact arithmetic"; the ladders and the plain steps
  stay open. Phone length 9.2 → 6.4 screens.
- **`/signals`** hides the unfiltered focus pills on phones; a filtered link still shows them.
- **Touch targets.** `.weather-hit` (and `.weather-hit-box`) grow an inline link's hit area to 44px with a
  pseudo-element: "How this is judged", area names in the rules table, the turning-point links, the week
  chevrons, and small inline links on `/pricing` and `/history`. The explainer's Dismiss is 44px.

Not changed, on purpose: the `/operate` done counter (its heat is the model's bias toward digits, and it was
enlarged deliberately), the `/operate` workstream tabs (a different axis from the section rail, not a second
index), and the header search box (no click data to judge it by). The first-visit phone picker's second row
still sits under the tab bar at 844px.

### 1.1.30 A visit that touched nothing can be counted, and a first visit sees its question (2026-09-30)

Thirty days of the `activation` stream read 603 visits to `/`, 3 `oriented`, 0 `committed` and 8
`returned`. Of the 85 visits that carried an arrival bucket, 81 were returning browsers arriving
direct, and 89 of the 147 web-vitals rows for `/` were reloads. Most of what looked like readers
leaving was the measurement and the owner's own checks:

- **`oriented` is the first deliberate act of a visit**, recorded once per `visited` by
  `ActivationTracker`: any control pressed, section opened or link followed, on any visit. It came
  only from the first-visit picker and the explainer's Dismiss, both hidden from a returning browser,
  so a returning reader could only ever count as leaving. `visited` minus `oriented` is the visits
  that touched nothing. The picker and the explainer no longer send it themselves.
- **`/` mounts `OperatorWorkflowRouteTracker`.** `/` was always an accepted route and the tracker was
  never on it, so a move from the brief to `/signals`, `/operate` or `/resolve` went unrecorded.
- **A browser can turn measurement off** from `/privacy` section 5. Every browser emitter goes through
  `lib/telemetry/sendTelemetry.ts`, which sends nothing while `whether.measurement.off` holds "1";
  `tests/sendTelemetry.test.ts` fails if anything in `app/` or `lib/` queues a beacon around it.
  `/privacy` 2.6 now also lists what a visit to the brief reports about itself.
- **The first-visit fold takes two more rows off a phone.** The horizon switcher and the confidence
  chip fold with the brief (the call card's trust line already carries confidence), and the phone
  header's stage and runway pills hide on a first visit to a page that offers the fold
  (`html[data-home-first-visit="true"]:has([data-first-visit-only="true"])`). At 375×812 the
  question's heading moved from y=744 to y=617 and its first row of answers (681–725) now clears the
  tab bar at 759. Above `sm` the same stage and runway choices sat in a folded section already, so the
  two widths now agree; "Show the full brief" brings everything back.
- **The first-visit question says what its numbers mean.** Under the choices, both scores print through
  `SignalReading` ("Funding pressure 90/100: money is hard to raise"), above every line that quotes a
  score: the answer's pause and resume lines and the alert box's "(90 today)". What 100 meant was
  printed only in the folded *What changed* table.
- **"Has this happened before" is answered on the page.** On a week the guidance changed, one sentence
  from `summarizeLastTimeCallChanged` sits above the turning-point links: the month it last moved this
  way, where both scores started and stood three months on, and the card's "One earlier outcome, not a
  forecast" on the same condition. Other weeks print nothing, as the card does, rather than reach for the
  nearest analogue.


### 1.1.31 Alerts on the lines the rules use, and a plan's own lines (2026-10-01)

The record moves a few times a year (22 line-crossing months in 176), so the use that fits it
is lines agreed when a plan is made and an email the day one is crossed. Two changes make that
true.

- **Published-line alerts watch the published lines.** `evaluateAlert` crossed fixed marks at
  50 and 75 on both scores, which no rule uses, and the email called 75 "the pause line". It now
  reads `publishedScoreLines(thresholds)`: pause and resume at 76 / 66 on funding pressure and
  44 / 54 on risk appetite (`sharedDecisionLines`), and the change lines at 70 and 50. A move
  that passes several lines sends one letter per score, naming the most significant (pause,
  then change, then resume), and the dedupe key is per score (`threshold:<metric>`), so a
  funding-pressure crossing no longer silences a risk-appetite one in the same week.
- **A plan's own lines.** `/operate` has a step, "Set this plan's lines" (`ops-plan-lines`,
  after the rules, live weeks only), that starts from the published rules
  (`planLinesFromRules`) and lets a reader move each number and untick areas. The lines go with
  an email address to `/api/email/subscribe` (`planLines`, parsed whole by `parsePlanLines`;
  malformed lines are refused, not trimmed) and are held as `pendingPlanLines` until the
  confirmation link is clicked, because a request can name any inbox. A record created only to
  watch lines gets no Monday brief. Delivery judges each subscriber's lines reading against
  reading (`evaluatePlanLineCrossings` over `previousSnapshot`), so it runs on a day no
  published alert fired; a pause fires on any of its conditions, a resume on all of them, and
  each area and side mails at most once a week (`plan:<area>:<side>`).
- `/privacy` 2.1 lists the lines among what a subscription stores. `/pricing` moves the
  line-crossing alert from Pro to Free: it was promised free on the homepage already, and a
  plan nobody can buy would have made plan lines unreachable.

### 1.1.31a One rule for "could change next week" (2026-10-01)

On the week of Sep 29, 2026 the homepage trust strip said "Not expected" and `/brief.md` said
"Conditions could change next week" about the same reading. The strip read the engine; the brief
read a second flag on the home model (8 points on the one-scale distance, or any change since the
month-end comparison), which stayed on for a month after a change that had already passed its
confirming reading.

- **The rule.** `couldCallChangeNextWeek` (`lib/report/trustStatus.ts`) is yes when a score sits
  inside the engine's 5-point near band (`diagnostics.transitionWatch`) or the engine is holding a
  change for its confirming reading (`regimeTransition.pending`), and no otherwise.
- **Its readers.** The trust strip reads it (`buildTrustStripProps`, with the reason beside it).
  The home model's `transitionWatch` is computed from it (`lib/report/homeBrief/builders.ts`), so
  `/brief.md`'s trust line, the memo lines, the change-watch row and the exports that read the
  model print the strip's answer. No surface keeps a rule of its own.
- **Data caveat.** `/brief.md`'s provenance line about the state of the data was labelled
  "Action", the decision contract's word for the operating action, so a week whose guidance was to
  freeze new commitments printed "Action: Safe to use for near-term planning; proceed with normal
  approval flow". It is labelled "Data caveat" (`DATA_CAVEAT_LABEL`) and reads "None." on live data;
  an archived, cached or held reading prints what that state asks of the reader.
- Tests: `tests/homeBriefModel.test.ts`, `tests/pageReaderContradictions.test.tsx`,
  `tests/trustStatusTones.test.ts`. The lesson: docs/agents/lessons/tests-and-copy-rules.md
  ("Two flags for one claim").

### 1.1.32 Consent for changes, and paid plans that sell what free does not (2026-10-01)

- **A confirmed address changes only when its inbox says so.** `subscribe()` used to apply
  `alerts`, `weekly` and reactivation on the request, and `/api/email/subscribe` takes any address,
  so anyone could switch off someone's Monday brief or re-enroll a reader who had unsubscribed.
  For a verified record the request is held as `pendingFlags` (latest request wins; a choice that
  matches the standing one clears its pending change) and applied by `verifyEmail` with the plan
  lines (`withPendingApplied`); the confirmation email describes the record as it will read once
  confirmed. An unverified record takes a request directly, as before: it receives nothing yet.
  `/privacy` 2.1 says so.
- **Corrected 2026-10-02: who can confirm.** The link above carried the subscriber's permanent
  `token`, which every brief and alert footer carries for unsubscribing, so anyone holding one
  forwarded email could request a change and confirm it; the email described only the lines when a
  request also turned the Monday brief off; a request that omitted a flag kept an earlier stranger's
  pending value; held changes never expired and survived unsubscribing; and opening the link applied
  the change, which mail filters that open every link do on their own. Now every request (for any
  record, confirmed or not) replaces what an earlier one left waiting and issues its own
  `confirmToken`, indexed under `email:confirm:` with a 7-day TTL and checked against
  `confirmRequestedAt`; `verifyEmail` takes only that, once. A record that never confirmed and has
  no `confirmToken` (mailed before this) still confirms with its permanent token. `GET
  /api/email/verify` shows `describeConfirmation` (each change, named as a change, for a confirmed
  address, with each area's pause and resume numbers so a reader can tell their own lines from
  someone else's) and a button; `POST` applies it. A link is judged by the record in KV, never an
  isolate's in-memory copy, which can predate the request or unsubscribe that retired it.
  Unsubscribing drops the waiting request. A request that asks a confirmed address for nothing new
  (lines included) gets an email saying so, with no link. Tests:
  `tests/subscriberWeeklyFlag.test.ts` ("who can confirm a change"), `tests/emailVerifyRoute.test.ts`.
- **The rest of the review, 2026-10-02.** `GET /api/email/unsubscribe` unsubscribed on open, and
  every brief and alert carries it, so a link-scanning mail filter could stop a reader's brief on
  delivery; it now shows what stops and a button, and `POST` acts, taking the token from the form or,
  for a mail client's RFC 8058 one-click, from the query. The two pages share `lib/email/actionPage.ts`.
  Confirmation mail had only an IP rate limit; the record now keeps `confirmMailSentAt` (the last
  day's sends) and `confirmationMailCapped` holds a request past three an hour or six a day without
  changing the record or sending, answering the caller the same. Confirm links took the request's
  host as given; they now use it only when it is the site, this worker's own `workers.dev` host
  (production or a preview version, whose subscribers live in its own KV) or localhost, and fall
  back to `siteUrl`. Tests: `tests/emailUnsubscribeRoute.test.ts`, "how much confirmation mail one
  address gets" in `tests/subscriberWeeklyFlag.test.ts`, and the host cases in
  `tests/subscriptionAndCronSecurity.test.ts`. `/privacy` 2.1 says so.
- **Paid plans list only what the free plan lacks.** Pro sold "Monday delivery to your inbox" and
  Team a Slack channel feed and briefs for boards and investors; the free subscribe form and `/share`
  deliver all three, so the demand test priced free things. Pro now offers more than one set of plan
  lines and cross-device decision memory; Team, plan lines a team shares and a shared decision log.
  The free plan lists the Monday email and Slack feed. `tests/pricing.test.ts` holds paid features
  off delivery words.
- **The picker points at plan lines.** Under a picked area's published lines, "Move these lines for
  your plan →" opens `/operate#ops-plan-lines`. The alert form names everything it sends: the
  guidance changing, a score crossing one of its lines, an outsized move in a market input.
- **So does the Monday email.** Under the published lines, text and HTML both link "Move these lines
  for your own plan" to `/operate#ops-plan-lines`. `tests/weeklyBriefPublishReadiness.test.ts` reads
  the sent bodies through a fake `EMAIL` binding, since the stub keeps only the subject.
- `/trust`'s worked example quotes the published lines (`sharedDecisionLines`): resume below 66,
  not 64, which no rule used.

### 1.1.32a Visual relationship and causal navigation across weekly brief sections (2026-10-02)

Visual navigation upgrades across the five homepage sections to sharpen decision transmission without adding framework bloat or novel taxonomies:
1. **2D Regime Climate Radar (`RegimeRadar.tsx`) in Section 4 (`WhatWouldChangeSection.tsx`):** A lightweight, pure-SVG 2D coordinate plane mapping the macro environment across the 4 weather quadrants (Freezing, Cloudy, Stormy, Sunny) defined by Funding pressure and Risk appetite relative to the call-change boundary lines supplied by the active thresholds. Renders the current reading $(R, T)$, previous reading with trailing vector, and a dashed projection guide to the nearest boundary. The caption measures the score distance to that plotted call-change line; company-specific pause-line distances stay in the section heading and ladders. Radar labels use theme-aware semantic ink.
2. **Visual Bounded Rails & Proximity Highlights in Section 3 (`WhatItChangesSection.tsx`):** Integrated `BoundedCorridorRails.tsx` directly above the operating rules table, rendering visual stop/caution/resume rails (removed from the homepage on 2026-10-05, §1.1.33, and from `/operate` on 2026-10-06, §1.1.36). Upgraded `AreaTable.tsx` with distance-aware visual cues: crossed lines display in rose (`text-rose-300 font-medium`), near-threshold lines (≤5 pts) display in amber (`text-amber-300 font-medium`), and clear distances display in muted slate.
3. **High-Contrast Monday Delta & Decision Staleness Badges:** Upgraded `SinceLastVisit.tsx` to surface `linesCrossedLead` (`movementSentence`) for returning operators. Upgraded `YourRecordNote.tsx` with high-visibility badges (`Reconsider` in rose, `Watch` in amber) when an operator's active assumptions in `/decisions` have had their macro conditions breached.
4. **Interlinked Causal Navigation & Target Highlighting:** Added anchor targets (`#signal-funding-pressure`, `#signal-risk-appetite`) and direct links from each signal to the operating areas it governs in Section 2 (`WhatChangedSection.tsx`). Added row IDs (`id="area-${row.area}"`) and reverse citation anchor links in `AreaTable.tsx`. Added CSS `:target` styling (`tr:target`) to illuminate rows when jumped to via anchor links.

### 1.1.33 One drawing of the score ladders on the homepage (2026-10-05)

The first capture of the returning reader's homepage (`ui:iterate --visitor returning`) showed the two
score ladders drawn three times in three sections: per row in *What changed* (all three lines and the
earlier reading's dot), as the pause/resume rails above the rules table in *What that changes*, and as
a pair again beside the radar in *What would change this guidance* (DD-039).

- *What changed* keeps them. Each row carries where the score is, where it was, and where its lines
  are (`tests/whatChangedSignalRows.test.tsx`).
- *What that changes* drops the rails. Each area row prints its pause and resume lines and the distance
  to each, which refers up to the ladders. `/operate` keeps the rails over its own rules table, where no
  ladder sits above it.
- *What would change this guidance* keeps the radar (the second dimension) and lists the market move
  that would cross each call line under the score it moves, without redrawing either ladder.
- The recession gauge's relationship line now says what the engine does: it sets risk appetite and
  adds to funding pressure only once inverted (`computeRiskAppetiteScore`, the inversion points in
  `regimeEngineCore.ts`). The homepage said risk appetite alone, `/signals` funding pressure alone.

Still open under DD-039: the *Changed* column repeats one sentence ("Pause now applies: funding
pressure rose through 76.") in each area whose pause line is the same score's.

### 1.1.34 One trust line per report route, drawn in the intro (2026-10-05)

`/operate`, `/signals` and `/trust` printed the sources and the record date twice: beside the status
word in the intro ("All sources live • As of Oct 2"), and again in the `TrustStrip` a row below (DD-040).

- `ReportShellModel.trust.strip` hands the shell the route's strip. `CommandCenterNavBlock` draws it
  under the h1, in place of the intro's own sources-and-date line, which keeps only the status word
  (and the offline badge when one applies). A route that passes a strip renders no copy in its body.
- On a phone those routes hide the intro's summary sentence. The bottom bar names the page, and the
  strip is the line a reader needs before the first task block.
- Routes without a strip (`/resolve`, `/history`, `/share`) keep the intro line as it was.
- `/trust` keeps `#trust-snapshot` ("System status"), which the rail and search link to. It now holds
  the caveat directly under the strip.
- `/signals` sections are divided. `SignalsEvidenceBody` returned a fragment, but `Children.toArray`
  treats a component's output as one child, so the shell gave all four sections one row with no rule
  or padding between them. `signalsEvidenceSections()` returns a keyed array the page spreads into the
  shell.

### 1.1.35 `/share`: one format picker instead of a wall of sections (2026-10-06)

`/share` stacked every format as its own section: the share rail's four-format picker, a grid of
eight "longer format" cards with a preview that showed only what had already been copied, the
work-item tags, the pull policies and the role memos. That was about 5,700px on desktop and
10,000px on a phone, and the Slack text was drawn three times (DD-041).

- **One picker** (`app/share/sharePageFormats.tsx`). Formats are grouped by destination — Chat
  (Slack post, Full brief, Standup line), Meetings (Meeting pack, Monday agenda, Slide text), Docs
  and email (Email, Investor update, Portfolio note, Citation), Tickets and boards (Ticket brief,
  Work-item tags, Pull policies), Team (Role memos). It is a list from `md` up and the platform's
  grouped `<select>` below it. There is one preview (`BriefPreview`, shared with the share rail; the Chat formats draw through `ChatPreview` since §1.1.48)
  and one copy action, so a reader reads exactly what they will paste before copying it.
- **Two Slack texts, kept on purpose.** *Slack post* is the rail's short block, the shape a
  channel skims. *Full brief* is the weekly operator brief, every area's rule and lines. Each is
  drawn once.
- **Sets of blocks** (a tag per area, a pull policy per area plus the WIP cap, the role memo and
  checklist) render their own per-block copy controls in the preview's place.
  `GuardrailTagControls` and `PullPolicyControls` are bodies now; the picker names them.
- **Canonical links.** The rail's four formats are built on the server against `siteUrl`, so the
  brief link a reader pastes points at the brief rather than at a preview host, and the server
  renders the preview the page opens on.
- **URL state.** The selection is the hash (`/share#investor-update`), written with
  `replaceState` so switching formats adds no history entries. The old section anchors still
  land: `#meeting-slack` opens the Slack post, `#tickets-kanban` the work-item tags,
  `#role-memos` the role memos. `#image-artifacts` and `#embed` stay real sections.
- **Embed folded.** The embed builder is a disclosure, open only when the hash is `#embed` (the
  retired `/embed` route redirects there).
- **Calendar link built in the browser.** "Add a Monday review" is computed from the reader's
  next Monday after hydration, under the meeting pack and the agenda. Building it during server
  render was the page's one hydration mismatch.
- `/operate` has no share step since 2026-10-08 (§1.0a); it links to `/share` once.

### 1.1.36 `/operate` opens on the reader's decision, not a copy of the brief (2026-10-06)

The plan page opened on a "Weekly plan" step that restated the brief: the score rails, an Action now
/ Pause if / Conditions change if list, and the same five-area rules table the homepage prints.
Under it sat six accordion steps, each with a Done box and a "0 of 6 done this week" count, though
most steps were reading, not tasks. The parts that make it a plan — testing a move, setting your
own lines — were closed, two and three sections down.

- **Order.** Test a decision (open), Rules before you commit (open), This week's rule for each area,
  Set this plan's lines, Finance strategy, Share the brief, then Risk checks. The section index
  (`operationsSectionLinks.plan`) follows the page.
- **The area step keeps the table only.** The rails and the restated call lines are gone; they are
  on the brief one click away. `BoundedCorridorRails` had no caller left and was deleted.
- **No checklist.** The Done boxes, the weekly count and the browser record behind them
  (`app/operate/weekChecklist.ts`, `STORAGE_KEYS.weekChecklist`) are removed, and `/privacy` 2.4
  no longer lists them.
- **Test a decision is a body, not a second page.** `DecisionShieldPanel` drops its own header
  (the step asks the question), drops the provenance block (the page's trust line states it), and
  moves Copy verdict, Copy link and Record this decision below the verdict they act on.
- Step ids are unchanged, so every deep link — `#ops-monthly-action-summary` from the brief, the
  portfolio note, the CLI — still opens its section.

### 1.1.37 Pages reached from search open on the brief's card (2026-10-06)

Answer pages (`/answers/*`) and signal watch pages (`/signals/[cluster]`) are where most strangers
meet the product, and each opened in its own frame. Answer pages led with a generic header and a
"Short answer" box of advice that holds in any week, with the week's conditions in small print further
down. Signal watch pages led with a bare heading, then a bulleted block that put the call-change line
under an area's resume label.

- **One card.** Both open on `DecisionHero`, the card the brief opens on, with two optional props:
  `question` (the page's question or signal, set as the heading above the call) and `lines` (the
  lines the answer holds between). The stamp, the trust strip and the screenshot caption come with it.
- **Answer pages.** The card shows this week's answer for the page's decision areas
  (`payload.currentCall`), its Do now / Pause if / Resume when lines, and the page's enduring
  `shortAnswer` under the call. Copy decision brief and the related questions follow the card.
- **Signal watch pages.** The card shows the week's call with its Pause if and Conditions change if
  lines; the signal's own reading follows it. `DecisionContractBlock` had no caller left and was
  deleted, along with the unused `ResolutionCompassGlyph`.
- **Scenario and toolkit pages** keep their frames. Scenario pages read build-time payloads that can
  lag the live week, so a live stamp beside them could disagree with the text. Both lose the
  button-shaped pills and capitalised badges they used for plain facts (freshness, trust, time,
  participants), and toolkit pages lose the back link that repeated the breadcrumb.

### 1.1.38 A published week opens on the brief's card (2026-10-06)

Every shared paste links to `/brief/[week]`, so the record is the page a stranger cites. It opened on
a panel of tags (conditions, confidence, "Permanent Record") above a generic title, with the call as
body text, then gave the action and its two lines a section each. A screenshot of a cited week looked
like nothing the reader had seen on Monday.

- **The card.** The record opens on `DecisionHero`: the week's stamp, its title as `question`, the
  call, then Do now (when it differs from the call), Pause if and Conditions change if as `lines`.
  `captionDetail` puts the week and the confidence in the card's own caption, so a crop carries its
  date; there is no trust strip, because the record is not live.
- **Corrections ride inside it.** A record's correction prints as the card's detail, under the lines
  it corrects, so a crop cannot carry an uncorrected line without its note. The Slack and email
  texts carry the correction on their own.
- **One statement each.** "What changed this week" carries only the delta; the separate Do now line
  and the flip-watch section are gone, since the card states both. The share panel is titled for the
  record's week ("Share the week of Jul 30, 2026"), not "this week's guidance".
- Tests: `tests/publishedBriefPageOrder.test.tsx` (the card, one `h1`, one call-change label, the
  correction inside the card).

### 1.1.39 `/history` answers its two questions in order (2026-10-06)

The page summary names two jobs: look up what the guidance said in any past month, and how it held
up. The sections ran in neither order. The published weeks, the record a reader cites, sat fifth,
under a phase map that was the tallest block on the page. "Conditions by year" was a section of its
own near the foot, ten screens from the strip that draws the same months.

- **What the guidance said.** The month strip, with each closed year's link under it, then the
  published weeks.
- **How it held up.** The track record tiles with the confidence record, then the grading table
  ("How the record held up"), which used to sit two sections away. The grading table stays open: it
  lists the changes nothing signaled, and that is its point.
- **The mechanism, folded.** The phase map is a closed disclosure whose summary is its heading, so
  the outline and the rail still name it. `?map=1` opens it, and so does a window link (`?span=`),
  which lands on the chart it changed. Monthly readings and the explorer stay folded.
- Measured: 3,964 → 3,160 px desktop, about 6,160 → 4,990 px phone. Tests:
  `tests/recordRoutesReadingOrder.test.tsx`.

### 1.1.40 The governance guides: one copy of each section, the reference folded (2026-10-06)

The three `/resources/*` governance guides ran to about 12,000px on a desktop and 18,700 on a phone.
Four reference sections (the board Q&A, the anti-patterns, the 12-month cadence, the director
checklist) were the same 945 words on all three URLs. A sentence splitter re-cut every paragraph into
two-sentence chunks on ".", "!" and "?", so a quoted question printed a lone "," or "'" as its own
paragraph. The parent guide listed itself under "Related pages". None of the three said what
conditions were.

- **One copy.** The four shared sections live on the parent guide; the framework and reversibility
  guides link to them (`updatedAt` 2026-10-06 on both).
- **Reference folded.** A section can carry `reference: true` (`lib/resourceContentSource.ts`). The
  argument reads open, then its closing note, then the template CTA, then a Reference section of
  closed disclosures. The index lists the argument, then the reference on one line.
- **As written.** Paragraphs render as authored. "Back to top" (eleven per page) is gone.
- **This week.** The header states the week's conditions and what they mean for last week's decisions
  (the sentence the articles already print), with the record date and a link to the brief. It
  replaces the "Start from Weekly Brief" and "Return to Planning" pills (AGENTS.md, "Thin SEO page").
- Measured on the parent guide: 12,013 → 7,034 px desktop, 18,762 → 11,139 px phone. Tests:
  `tests/resourcePillarPage.test.tsx`.

### 1.1.41 Two page frames: report and reading (2026-10-06)

Report routes (`/signals`, `/trust`, `/operate`, `/resolve`, `/history`) use `ReportShell`, which builds
on `PageShell`; the utility pages (`/share`, `/pricing`, `/search`, the API docs, the legal pages) use
`PageShell` directly, without the status-led intro. Every page that is read rather than operated uses
`ContentPageShell` (`app/components/ui/contentPageShell.tsx`) with one of three measures: `prose`
(48rem), `content` (56rem) or `wide` (72rem, new).

Before, the reading pages had three frames. `SecondaryPageShell` (answers, calibration, concepts,
decisions, the 404) had its own widths and a navy backdrop, so an answer page and a signal-watch page
opened on the same card at different widths. Five routes hand-rolled a `<main>` with no `id`: the
published brief record, `/about`, `/contact`, the decision-shield overview and every resource
article. On those the layout's "Skip to content" link went nowhere. The landmark audit passed them,
because its streamed-route fallback found the 404 boundary's `<main>` in every flight payload.

- Answers and the 404 take `content`; calibration, concepts, decisions and the articles (with their
  rail) take `wide`; the brief record, about, contact and the overview take `prose`.
- `SecondaryPageShell` and its CSS (`.weather-secondary-shell*`, the compact and narrow widths) are
  deleted; `SecondaryPageHeader` and `SecondaryPageSection` stay as section components.
- Resource articles lose the "Start from Weekly Brief" and "Return to Planning" pills that rendered
  above their `<main>`. The link back to the brief is in the live-guidance block, under a dated line
  ("As of Oct 2, 2026 · signals refreshed …") that replaces the paste-ready citation and its URLs.
- `tests/readingFrameRoutes.test.tsx` renders each reading route and holds it to one
  `<main id="main-content">`, and the article to nothing before it.

### 1.1.42 The homepage, after a product-design critique (2026-10-06)

- **Card:** the headline is the action ("Freeze new commitments and protect runway."); the week's direction rides on the stamp line ("· Tightening this week", `splitWeeklyCall` in `lib/report/reportEvidence.ts`). Pastes and the sticky strip keep the composed call.
- **One structure:** "What are you deciding?" (`home/DecisionPicker.tsx`) shows for every reader; only the alert form, the record line and "Show the full brief" are first-visit only. It says whose lines the answers use ("Lines set for Series A with 12–24 months of runway") and links to `#company-calibration`.
- **One subscribe form:** `SubscribeForm` offers "Only when it changes" or "Every Monday too"; the first visit starts on alerts. `FlipAlertForm` is gone.
- **Lines stated once in points:** "What would change" drops the red "0 points — … crossed" counter and the boxed rules panel; the call-change line sits beside the quadrant, with the market move folded under "In interest-rate terms". `thresholdBusinessConsequence` had no other reader and is removed.
- **Colour:** the ladders' change line is neutral, not the regime accent; a crossed pause line is caution amber, not red.
- **Dates:** when the frozen record is not today's reading, the footer says so ("The reading above is from Oct 2. The last frozen record is dated Sep 29.") instead of "Citable permalink".
- **Controls row:** the duplicate confidence chip (`CompactTrustPopover`) is gone; the cadence control is labelled "Plan horizon"; the trust strip's "Could change next week" gives its reason on every route.
- **What changed:** each signal shows its name, what it governs and what moved it; the scale and meaning fold under "What the score means".
- **Do and share:** the plan is the one primary button; the four arrow links are in the footer and header.
- **Copy:** the movement lead is short sentences, one cause each; "the last time conditions moved this way" now says "tightened"/"eased" and names both moves when they differ.

### 1.1.43 Delivery channels: one Slack poster, one email shell, one tally, one send record (2026-10-06)

Every send — the weekly email, the weekly Slack post, the between-Monday alerts, the month-end
pulse and the regime-change push — now goes through `lib/delivery/`.

- **One Slack channel** (`lib/delivery/slack.ts`, `slackChannel`). The targets (the
  `SLACK_WEBHOOK_URL` webhook plus every active stored one) were resolved in three places; they are
  resolved in one. Every post is bounded (10s; the alert and pulse posts had no timeout, so an edge
  that never answered held the cron step to its 60s deadline), and every post retires a webhook
  Slack answers 404/410 for. The month-end pulse never did, so a channel that deleted its webhook
  stayed a target of every pulse. Alerts and the pulse share one block shape
  (`slackAlertBlocks`: header, body, "View brief"); every post now carries
  `Content-Type: application/json`, which only the weekly post set before. The blocks and text
  are unchanged.
- **One tally** (`lib/delivery/fanOut.ts`). A target is sent to, gone (and retired), failed, or
  skipped; the five senders counted those in five shapes. Each route keeps the shape it already
  publishes — the weekly Slack post counts a retired webhook as a failed one, the push result's
  `pruned` is the tally's `retired` — so no response changed.
- **One email shell** (`lib/email/emailShell.ts`, `renderEmailShell`). The alert templates'
  `baseHtml`, the copy of it inline in the weekly brief, and the month-end pulse's own shell are
  one. The copy is why the 2026-09-17 `siteUrl` fix missed the alerts: their links, their
  unsubscribe URL and their plain-text "View full brief" / "Your lines" lines still wrote
  `https://whether.work`, so a preview deployment mailed production links. Every origin in a
  sent email now comes from `lib/siteUrl`. On production that is the same string, and the alert
  and weekly mail are byte-for-byte what they were. The month-end pulse is the one email whose
  HTML changed: it gains the shared footer and the unsubscribe link its HTML part never carried,
  its title is the shell's, and its block is fully escaped (it escaped `<` only, so an `&` or a
  quote in the pasted block went out raw); its plain-text part is unchanged. One `escapeHtml`
  serves every email and the subscription action pages.
- **One answer to "the current snapshot"** (`lib/operatingState/resolveSnapshot.ts`,
  `resolveOperatingSnapshot({ given, onMiss })`). A given snapshot is used as given, with its own
  weekly call unless one is passed; otherwise the stored one; otherwise the caller's named miss
  policy — `"refuse"` (weekly email, month-end pulse) or `"report"`, a report read that serves the
  bundled copy on an outage (alert delivery, the regime check, and the Slack post, which skips the
  store because its report read is `GET /api/brief/slack`'s path and already projects the stored
  snapshot). `lib/export/exportSnapshot.ts` keeps its own resolution on purpose: an export builds
  from the materialized inputs, which is a read, not a send.
- **One readiness check for a send** (`assessSnapshotReadiness`, `assessReadingReadiness`). The
  email judged a snapshot's own flags (`freshness.status`, `provenance.isLive`) and the Slack post
  the treasury's fallback stamp, so a reading marked one way and not the other was sent by one and
  refused by the other. Both read both now, and the email's refusal names the fallback reason when
  there is one.
- **The weekly sends go out once a week per recipient** (`lib/delivery/onceFor.ts`). Repeat
  protection came in four schemes — per-inbox markers for alert mail (`alert:delivered:*`, a
  seven-day window), one key per month for the month-end pulse (`month-end:last-pulsed`), the
  regime check's `regime:*` last-known state — and none for the weekly email or the weekly Slack
  post, so a manual `POST /api/email/send-weekly` or `POST /api/brief/slack/deliver` after the
  Monday cron sent every subscriber and every channel the same brief again. `onceFor(periodKey)`
  writes one KV key per recipient after that recipient's send succeeds:
  `delivery:once:<period>:<sha256 of the recipient>`, where the period is
  `weekly-email:<ISO week>` or `weekly-slack:<ISO week>` of the send (`2026-w41`), kept 14 days
  (`expirationTtl`). Nothing else in the namespace starts with `delivery:`, and the recipient is
  hashed because a webhook URL is a credential. Per recipient rather than per run, so a run that
  failed part-way can be re-run and reaches only the ones it missed. The cron path respects the
  markers; the two manual routes take `?force=1` (or `?force=true`) to send again on purpose,
  which still writes markers and never overrides the readiness refusal. A skipped recipient is
  reported as `skipped` (absent when zero); an email run where everyone was skipped says so in
  `message`, and a Slack run where every channel was skipped reports
  `status: "skipped_already_posted"`, `ok: true`. A stub email send (no `EMAIL` binding outside
  production) delivered nothing and records nothing, and without a KV binding nothing is recorded
  or skipped, as before. The alert mail's markers are the same store (`sentMarkers`) with its
  seven-day window and its existing keys; the month-end key and the regime state are left as they
  are — one is a whole-run gate the pulse's own comment explains, the other a transition detector,
  not a record of a send.
- **The manual alert runs refuse a saved copy** (fix). `POST /api/check-regime-change` and
  `POST /api/alert-deliveries` pass no snapshot, and with nothing stored both fell back to a report
  read and acted on it unchecked. Offline that read is the bundled 2026-06-17 copy: a manual regime
  check posted "Conditions changed" (Sunny → Stormy) to every Slack target and wrote
  `regime:last-known`, `regime:weeks-to-flip` and `regime:confidence` from it, and a manual alert
  run mailed every opted-in subscriber a regime change and wrote `alert:state` — so the next real
  reading was judged against the copy. Both now ask the weekly sends' readiness question of a
  report read and, when it fails, judge, send and write nothing; the routes answer 503 with
  `ok: false` and `error: "refused_unpublishable: …"` (the alert route keeps its `sent` / `skipped`
  / `alerts` / `errors` fields at zero). A given or stored snapshot is judged as before: the cron
  hands one over on every run, and the stored one is what the cron last judged.
- Tests: `tests/deliveryChannels.test.ts`, `tests/emailShell.test.ts` (production output pinned
  byte for byte; the no-literal-origin rule is a source read, because on production the two are
  the same string), `tests/operatingSnapshotResolution.test.ts`, `tests/alertFallbackReadiness.test.ts`, `tests/deliveryOnceMarkers.test.ts`.

### 1.1.44 The homepage's first screen carries the news (2026-10-06)

A screenshot review of `/` found it accurate and dull: the week's change ("this week they went
from Sunny to Freezing") sat in a paragraph below the fold, the one line with suspense ("Could
change next week: Yes, risk appetite is 2 pts from its line"; since 2026-10-08 the value is the reason
alone, "Risk appetite is 2 pts from its line") was styled as metadata, the only
picture (the conditions quadrant) was about 200px wide two-thirds of the way down, the decision
picker asked before it answered, and a first visit opened on the category tagline. Every change
below moves data the page already computed to where the eye lands first; nothing new is derived.

- **What conditions were.** On a reading whose conditions differ from the earlier one, the card's
  stamp line ends "Was Sunny on Aug 31" in the regime ink (`describeEarlierConditions`,
  `lib/report/home/homeSectionModel.ts`). It is dated by the comparison's own basis, because the
  earlier reading is a month-end snapshot and "this week" would claim a change the reading cannot
  date. Archived weeks carry none.
- **The map in the card, from `md` up.** `DecisionHero` takes an `aside`, drawn in a right-hand
  column from `md` and hidden below it, where the card must leave the picker on the first phone
  screen. On `/` it is `RegimeRadar` with a **path**: the last six month-ends before the
  reading's month (the month in progress is left out, because the cron writes it from the same
  week the current point draws), joined to the current point, older dots fainter. The path's
  domain ("Trail: month-ends Mar–Aug 2026, then this week.", `describeConditionsTrail`) and, when the
  earlier scores were built from fewer inputs, the like-for-like note (`describeScoreMovementCaveat`)
  sit under the trust row as `asideNote`, so the map stays compact; its distance caption is off
  there because the trust row already says it. The left column stretches to the map's height and
  the trust row sits at its foot. "What would change this guidance" stops drawing the quadrant from
  `md` up (one picture of where the reading sits per screen) and keeps it, with the same path,
  below `md`.
- **The answers before the click.** Each "What are you deciding?" choice carries a second line:
  "Pause line crossed" in the caution ink, or "4 pts from its pause line"
  (`describeAreaPauseStatus`), from the same row the answer and the area table print, now carrying
  `points` and `met` beside its words. Over the choices, the count: "Pause lines crossed in 4 of 5
  areas this week." (`describePauseLineCount`). `SegmentedControl`'s "choices" layout prints a
  sublabel as the option's second line at every width.
- **First visit.** The standfirst is `canonicalPositioningLine` (the stakes: the lines that pause or
  resume hiring, spend and raise) instead of `websiteName` (the category). "Has this happened
  before?" opens on `LastTimeCallChangedCard` — the two earlier scores as tiles and the comparison
  with this week — rather than a one-sentence summary; `summarizeLastTimeCallChanged` went with it.
- Not done, deliberately: no animation, illustration or new section, and no second encoding of the
  score lines on the fold (the rails stay in "What changed").
- Tests: `tests/homeFoldNews.test.tsx`, `tests/regimeRadar.test.tsx` (path),
  `tests/homeDecisionPicker.test.tsx` (choices and count), `tests/firstRunOrientationGuide.test.tsx`
  (standfirst).

### 1.1.45 Resolve answers, and Evidence's questions carry their answers (2026-10-07)

A screenshot review of `/resolve` and `/signals` in both themes, returning reader, phone and desktop.

- **`/resolve` answers before the click.** The intro promises "one yes-or-no answer per open
  decision" and the list printed eleven questions with a sentence of enduring advice each. Every
  decision answer now carries its lead area's standing (the first area it maps, the one whose rule
  its page's card prints) as a stamp: "Pause line crossed" in the caution ink, or "4 pts from its
  pause line" (`describeAnswerStanding` in `lib/report/answerStanding.ts`, over
  `describeAreaPauseStatus`). The rows are `buildHomeAreaRows`, fed from the snapshot the page
  already loads exactly as `app/page.tsx` feeds the homepage's "What are you deciding?" choices,
  so the two print the same words. Climate answers ("Startup funding climate this week", "Is it
  risk-on or risk-off…") carry the week's weather word in the regime ink; the explanation ("How to
  brief executives…") carries nothing. The count sits over the list ("Pause lines crossed in 4 of 5
  areas this week.", `describePauseLineCount`). No reader calibration is applied: the answer page
  a row opens reads the published lines too, so a row and its page agree; a reader with a stage
  cookie can see a different distance on `/`, which is scaled to them.
- **Stamps are sharp** (§XIV): `rounded-sm`, a column of their own from `sm`, under the title on a
  phone.
- **The browse disclosure is a row.** It was a `weather-surface` whose padding the report row
  zeroes, so the closed state drew a 16px-radius bar with its text against the border. It is a
  native `<details>` under `weather-auto-chevron`, ruled off like `/signals`' instruments. The two
  chip-boxed links under the list (SaaS valuation context, historical comparison) are inline links.
- **`/signals` "Deeper evidence" answers in its summaries** (§XII): rates ("1-month rate 4.05%, up
  from 3.85% on Aug 31"), inversion ("Yes: 2Y−3M below zero in 6 of 12 months, 10Y−2Y in none"),
  score trends ("Funding pressure down 27 to 63, risk appetite down 6 to 56 (12 month-ends to Aug
  2026)"), the lines in force, the change count of the month-by-month timeline, the reference
  cycle (unchanged), and the zero-rate habit areas. Builders in
  `lib/report/evidenceInstrumentSummaries.ts`; where a panel computes the value (the sparkline
  window, the runs of conditions) the panel and the summary call the same function (§XV). The
  rates panel's "Latest" line named this week's date over charts that end at the last month-end
  and printed no rate; it prints this week's four rates and says the charts are month-ends. The
  line-settings question says "conditions" instead of the retired "the call". The rows drop their
  side inset on a phone so the questions align with the section title.
- **"What changed"**: the short-term rate's "Why it matters" was a bare dash in the unfiltered
  table; it carries the sentence the Inflation filter already had. The focus filters were checked
  and kept: each shows a different subset of the four rows with its own notes and follow-up links.
- **"What would change this guidance"**: each score ladder is capped at 28rem, the wide track its
  labels are laid out for (§XVII, §XVIII); the two had stretched to about 620px each on a desktop.
- Seen, not changed: `ScoreCell` prints the short-term rate as "4.0%" beside the chip's "4.05%"
  (and the gauge "0.5pp" beside "0.47pp") — one figure at two precisions in one row, in a shared
  primitive the answer pages also draw. The timeline's "Current: Aug 2026" names the last month-end
  on a live October reading.
- Tests: `tests/resolveAnswerStanding.test.tsx`, `tests/evidenceInstrumentSummaries.test.ts`,
  `tests/signalsPageFold.test.tsx` (renamed question pinned on purpose; every answer checked against
  its opened panel; the base-rate note; the ladder cap).

### 1.1.46 `/operate` leads with this week's rules (2026-10-07)

A screenshot review of the plan page found it opening on the least informative thing it has: under
the tabs, "Test a decision" with the full stress-test form (runway, monthly spend, a model select, a
three-line box, example chips) above a "Decision verdict" panel that said there was no verdict. On a
phone that form was everything below the intro. The page's job (`docs/agents/ui-ux-standards.md`
§VIII: operating guardrails) was behind it, and the area table — the pause and resume lines, which
§XII says are never collapsed — sat closed three steps down as a title and one sentence.

- **Order.** This week's rule for each area (open), Rules before you commit (open), Test a decision
  (open, compact), Set this plan's lines, Finance strategy, Share the brief, then Risk checks. The
  section index (`operationsSectionLinks.plan`, the sidebar and the phone chip row) follows. The
  area table is the same `AreaTable` the brief prints, from the same rows (`buildAreaRows`), not a
  second build. This reverses §1.1.36's lead, which put the reader's own decision first; the test
  keeps its open state and moves after the lines it checks against.
- Step ids are unchanged, so `#ops-monthly-action-summary` (the brief, the portfolio note, the
  redirects in `next.config.js`), `#ops-playbook`, `#ops-decision-shield` and `#ops-plan-lines`
  still open their sections.
- **Test a decision opens as one field.** The mode switch and the plan box with its examples; the
  runway, spend and model fields join once a plan is typed (and stay while it is edited), and the
  verdict panel exists only once there is a plan to grade (`PlanStressTestMode`). Compare mode
  draws no recommendation box until a plan is typed. Copy verdict, Copy link and Record this
  decision render only once the mode on screen has a verdict: before, Copy verdict on an empty box
  copied the list mode's default verdict, one the reader had never seen. The stress-test and
  compare modes no longer draw a surface inside the step, so the verdict sits two frames deep and
  its sizing note three (§XIII). The example buttons are `weather-pill` controls (44px on touch)
  rather than 20px chips, with their label on its own line on a phone so they pair up.
- **Closed steps say what is behind them** (§XII, "a summary that shows the current values"). Set
  this plan's lines names the areas its form starts from ("Start from the published pause and
  resume lines for Hiring, Roadmap, Fundraising, Spending and New bets, …"); Finance strategy prints
  the quarter's runway target ("Target 24+ months of runway; freeze non-essential spend.",
  `financeStrategyFor`); Share the brief names its four formats from `BRIEF_FORMATS`. They used to
  read as a title and a sentence about the gesture, which is what made them look like empty boxes.
  The lines step is left out when no rule has a numeric line, rather than opening on nothing.
- **Finance strategy is flat.** `FinanceStrategyPanel` drops its own header ("Finance Strategy
  Mode", a subtitle and a method sentence), the "Executive summary" surface and the "Deep dive"
  disclosure, which between them printed the runway target three times four frames deep; it is
  one definition list (hiring throttle, budget focus, signals to watch) under the step's line. The
  undrawn `title`/`subtitle`/`description` left `data/recommendations.ts` with it.
- Tests: `tests/planPageLead.test.ts` (order, open state, closed-step lines),
  `tests/decisionShieldPanel.test.tsx` (compact and typed states), `tests/planningCliPage.test.tsx`
  (index order).
- **Risk checks and the resources disclosure have their padding back.** Both carried
  `weather-panel`, whose padding the report row zeroes for an unboxed section
  (`.weather-report-section-row > .weather-panel`), so each drew its border against its own text.
  A week with no warning is one line under the heading, without the `weather-surface` slab, the
  "each one names an assumption" sentence, or "Recheck the rules" (kept for weeks that have a
  warning, which now draw as amber-ruled segments rather than lifted surfaces). The resources
  summary says what it holds ("3 operating guides and 4 templates you can fill in and share.") and
  its guide cards are plain bordered links rather than surfaces lifted inside a frame the depth
  ladder cannot see.
- **No "Execution asks" under Share.** The section under the share picker ("Current asks for the
  people driving execution") was `lib/operatorRequests.ts`, a product backlog of "expansion
  requests expected after launch" that listed API access and historical comparisons as not yet
  built, though both ship. It is removed with its panel (`app/components/appendix/ReferencePanels.tsx`);
  its two ids stay as aliases of the Share step. That left `DataProvenanceStrip` with no caller —
  every caller had passed `showProvenance: false`, so it had rendered nowhere — and it is deleted
  with its test and the two status icons only it drew. Still open: `reportData.internalProvenance`
  (`lib/report/reportDataLoader.ts`) is now computed and drawn nowhere.
- **The lead table's "Line set by" links leave for the brief.** `AreaTable` takes
  `signalLinkBase`; `/operate` passes "/", so "Funding pressure" and "Risk appetite" open
  `/#signal-funding-pressure` and `/#signal-risk-appetite` rather than in-page anchors this page
  never draws. `/share` and the answer pages carry the same dead in-page links and are not changed
  here.
- **Rules before you commit opens on the rules.** "Show all rules" and its count follow the three
  lists they change instead of sitting above the heading, and the count says what it counts ("The
  top 3 of each list." — since 2026-10-08 "Showing the top 3 of each list." — where it said "per area"). Risk checks and the resources disclosure take the
  closed steps' fill, so the page's frames read as one set in the light theme too.

### 1.1.47 Shared chrome: the report intro on a phone, the footer, /pricing and /concepts (2026-10-07)

A screenshot review of the shared chrome found the report intro restating the homepage's trust
strip across a phone's first screen, a footer set louder than the pages above it, a plain fact on
`/pricing` drawn in the warning ink, and `/concepts` as about 6,000px of one small-text column.

- **The report intro on a phone** (`CommandCenterNavBlock`, every `ReportShell` route). Below `sm`
  a route with a trust strip draws three lines: the status word in the regime ink with the
  screenshot caption beside it (the caption left the intro in §1.1.65), the title, and the strip
  as one wrapped meta line
  (`TrustStrip` `phoneLayout="line"`). The line always carries the record date and "Could change
  next week"; it leaves out "Sources" and "Confidence" while they are routine (every source live,
  confidence not Low) and the strip links to `/trust`, and prints them whenever they are not. On
  `/trust`, where the strip is the page's System status and has no link, all four facts print. The
  refresh stamp ("Signals refreshed …") is a desktop line; a route whose status line carries
  "sources • as of" (`/resolve`, `/history`) keeps the caption at the foot of the block, where it
  does not wrap under the status line. Measured at 430×932 with touch: the intro on `/operate`
  and `/signals` 259 → 127px (the first section starts at 282px instead of 414px), `/trust`
  235 → 147px, `/resolve` 180 → 153px. From `sm` up nothing changed. Tests: `tests/visualPrimitives.test.tsx` (what folds), `tests/screenshotCaption.test.tsx`
  (where the caption sits on a phone).
- **The footer** (`app/layout.tsx`). Its seventeen links were `text-fluid-sm` in 44px rows at
  every width, larger than most body copy on the pages above, and each group was split into two
  equal halves of an equal half, so short words sat about 100px apart. Links are `text-fluid-xs`
  now and take `.weather-list-link` (`controls.css`): a 44px row on a touch screen, a 28px row with
  a fine pointer and hover from `sm`, the same condition the compact controls use. From `sm` each
  group is as wide as its links, 48px from the next. The Shortcuts button is hidden on a screen
  with no hover, where it listed keys for a keyboard the phone does not have. Measured with a
  mouse at 1280px: 439 → 359px tall; on a 430px touch phone 679 → 587px, the rows keeping 44px.
- **`/pricing`.** "Cannot be bought yet. A request records that you want it." prints in the price's
  qualifier ink (`text-slate-400`), not the caution amber: it is a plain fact about the offer, and
  amber read it as a warning about the product. The "What a request does" section lost its 20px
  side inset from `sm`, which set it out of line with the title and the cards (§XXI: an unboxed
  section sits on the page column), and "What that means in practice" takes `.weather-hit`, the
  44px target every inline link in a sentence has. `tests/pricing.test.ts` holds the ink.
- **`/concepts` (Product writing).** Each entry's conditions were 14px grey text after "Conditions
  that month:", the smallest thing in the entry and the one fact the page adds. They are the
  regime's stamp now: `Tag` takes a `regime` and draws `.weather-tag-regime` with `.type-stamp`,
  its wash, edge and ink from the `data-regime` tokens (§XVI), followed by how long the conditions
  had held. From `sm` each entry has a 10rem rail (date, stamp, run) beside the title, authors and
  argument, so the rail reads down the page as a timeline; on a phone the rail is the entry's first
  line. The date, not the conditions word, opens that year in the archive (the stamp is not a link:
  nothing capitalised is clickable, §XVIII). Above the list, a year strip draws one square per
  essay from the oldest year to the newest, filled in the conditions that month and hollow before
  the record, with a key of only the conditions it draws; it reads the timeline the entries print
  and adds no data or claim. Measured: 6,293 → 5,455px desktop, about 8,220 → 7,680px phone.
  `tests/productCanon.test.ts` holds the stamps and one square per essay.

### 1.1.48 `/trust` leads with its sources; `/share` shows what it hands over (2026-10-07)

A screenshot review found both pages describing the thing a reader came for instead of showing it.

**`/trust`.** The page's open content was the thresholds essay ("Why it works", the editor's
healthcare background) and a blank five-prompt form that read as unfinished, while the sources —
the rail's second entry, and what the page exists to check — sat folded at the foot under
"Detailed verification & sources" as two timestamps. The per-source health rows
(`reportData.sourceHealth`) were built for every reading and drawn nowhere but as the strip's count.

- **Source board, open, under "How the scores are built"** (`app/trust/sourceBoard.tsx`). One row
  per source — Treasury, Market stress, Inflation, Labor, Startup/private markets — with its state
  in the strip's words (Live, Current, Cached copy, Stale · 2mo old, Not confirmed), its cadence
  and when it last answered (UTC), then the two source links. `buildSourceBoardRows`
  (`lib/report/sourceHealth.ts`) judges "as intended" with the predicate `buildDegradedSourceRows`
  uses, so the board and the strip's "All sources live" / "Partly cached" count the same rows.
  Raw fallback reasons stay off the board: they are diagnostic strings, some naming series ids.
  `#source-board` is unchanged (`DATA_CURRENCY_ACTION_HREF` points at it).
- **The rest of the verification stays folded on a healthy week**, under "Citation, limits and
  revisit triggers" (citation, limits, calibration link, warnings, snippet). The `?sources=1` key
  still opens it, so shared links keep working.
- **The method is on `/about` since 2026-10-09** (`app/about/methodSection.tsx`); `/trust` ends on a
  one-line link to it. Its worked example stays open; the three definitions with the essay, and the
  blank form, are native `<details>`. `#template` is on the form's own `<details>`, so `/template`
  lands on it and the shell's anchor handler opens it.
- **Rail in page order** (§XI): status, formula, sources, the four folded sections.
- This opens a source board, which §XII lists among things to collapse. On `/trust` the check is
  the page's job, so the compact board is its content; the detail behind it is what folds.
  Recorded in §XII.
- Desktop 3,622 → 2,547px, phone 4,983 → 3,491px (same day's data, returning reader).
- Tests: `tests/trustSourceBoard.test.tsx` (board open after the formula and before anything
  folded, every source drawn, rail in page order, method and form folded, `#template` on the
  form's disclosure), `tests/sourceHealth.test.ts` (board rows and the strip agree).

**`/share`.**

- **Chat formats are drawn as the channel shows them.** The Slack post previewed as raw markup
  in monospace. `parseSlackMrkdwn` (`lib/export/slackMrkdwn.ts`) reads the subset the chat formats
  write (`*bold*`, `_italic_`, `>` quote lines, bare http(s) URLs) into data, and `ChatPreview`
  (`app/share/chatPreview.tsx`) builds React nodes from it: bold, one quote bar per quoted run,
  links. Nothing is injected as HTML; unrecognised text stays text. When the drawing differs from
  the text, "Show the text that copies" holds the exact text. Per format (`preview: "chat"`): the
  Slack post, full brief and standup line draw as chat. The meeting pack, agenda, slide text,
  email, investor update, portfolio note, citation and ticket keep the plain preview
  (`BriefPreview`), because there the text is the artifact. The copy button copies the same
  text; `tests/briefFormatsPinned.test.ts` is unchanged.
- **The images are shown.** "Files and images for a deck or a thread" was four cards that
  described a slide and a card and showed neither. The PPTX, PDF and SVG draw one slide from one
  payload (`lib/export/boardSlideDeck.ts`), so they are one card with the slide's picture
  (`/api/image/slide?stage=seed`) and three captioned files; the brief card shows
  `/api/image/brief`. This reverses the component's "deliberately links rather than thumbnails"
  on cost grounds that no longer hold: two pictures, not four; both routes answer with
  `s-maxage=3600`; both load lazily below the copy formats. `next/image` with `unoptimized` (the
  worker's `/_vinext/image` resizes static assets only) sets the size attributes, lazy loading
  and async decoding; a scrolled capture measured CLS 0 at 430px and 1280px. From `sm` both
  pictures sit in a 3:2 frame so the cards' titles align; the slide letterboxes rather than crops.
- **This week's readings** above the picker were 12px across the 72rem column (~150 characters a
  line). They are `text-fluid-xs` (the §VI floor for explanatory text) capped at 48rem.
- Seen, not changed: the seed-stage slide prints a stage-specific action and a "Conditions change
  if" line ("Risk appetite rises above 50 … Conditions then turn Cloudy") that differs from the
  Slack post's on the same page, now that both are visible together. The slide payload comes from
  `lib/export/exportSnapshot.ts`; whether the two should agree is for that module's owner.
- Tests: `tests/slackMrkdwn.test.ts`, `tests/sharePageCurrentBrief.test.tsx` (chat drawing and
  raw text, per-format preview choice, markup-looking text stays escaped, two sized lazy images).

### 1.1.49 One sentence per slot: the template copy that filled in the wrong value (2026-10-07)

A read of every reader-facing output for one week (pages, the Monday Slack post, the slide, brief.md,
the mandate, the agent views) found sentences assembled from templates whose filled-in values
contradicted another surface, or the reading itself.

- **Where conditions change.** The posture state's lines (`buildWeeklyLockCommitment`,
  `lib/report/decisionKnobs.ts`) were the same three in every regime — "Funding pressure ≤ 66 for
  two readings in a row", "Risk appetite ≥ 54 for two readings in a row", "Funding pressure > 76
  or risk appetite < 44: tighten again" — the default stage's resume and pause lines under the
  change line's label. The Monday post, the mandate, `/api/agent`, the CLI and the embed printed
  them, so a Freezing week was told conditions change at 66 when the homepage said 70, and to
  "tighten again" past a line it had already crossed. They are the edges of the reading's quadrant
  now, and the posture state's trigger is the brief's own sentence (`buildFlipThreshold`). A read
  built without that sentence (the stored snapshot the slide prints) gets both lines rather than
  the nearest alone; the answer pages print it for the score they are about, where they said
  "Trigger tighter mode if …" in every regime.
- **The guidance.** "Guidance:" printed the operating stance in the Monday post, brief.md and the
  operator brief, and the do-now line on the homepage, the email and the post `/share` copies.
  Every paste now leads with the do-now line, then the stance when it says more
  (`formatGuidance`, `lib/export/briefBuilders.ts`), and no "Do now" line repeats it.
- **Rule lines.** A line the reading already meets says so — "Pause if funding pressure is above 76
  (already true at 90)" — where every rule read as a move still to come. (Since 2026-10-09 the
  reading follows the rule as its own sentence, "… is above 76 or …. Funding pressure is 90
  now."; §1.1.1c.) An area's resume distance
  is the line holding it back (`bindingResume`), not the nearest of its AND-ed lines ("6 pts away"
  while funding pressure was 24 away), and "Line set by" names the scores the printed lines are
  drawn on, where it was fixed per area.
- **Figures and dates.** Rates print as quoted (4.05%), where the brief's chip read "3.9 → 4.0"
  beside a sentence saying the rate rose 0.2 to 4.1; index values print without ".00". brief.md and
  the operator brief are headed with the reading's date, not the Friday of its week. The evidence
  timeline's month reads "Showing:", where "Current: Aug 2026" sat under an October reading.
- **Labels.** `/trust`'s "Resume when" is the plan's resume line, not a second one about
  confidence; the last-time card's value label is "Change line"
  (`DECISION_CONTRACT_LABELS.watch.changeLine`); the Slack post's "Why this could be wrong" reads
  the confidence instead of telling every week "the scores sit near a line", and no longer opens a
  line "If it is:"; the mandate drops "No committed transition event in store."; refusal reasons
  say "guidance", not "posture".

`tests/fixtures/briefFormats.golden.json` was regenerated in the commits that moved these strings.

### 1.1.50 The rest of the sweep: evidence cards, summaries, embed and alerts, replayed months (2026-10-07)

The read in §1.1.49 went on to the other surfaces that assemble sentences from a reading.

- **Evidence cards** (`/signals/<watch>/<decision>`, `/api/cli/diagnostics`, newly frozen briefs).
  Each signal's label describes how far that signal sits from its own line, with the bands the
  published confidence uses (`resolveLineDistanceLabel`, `lib/report/confidence.ts`); it described
  the size of the week's move, so a score 2 points from its line read "well clear". Direction says
  whether the move made conditions tighter or easier for that signal (`isImprovingSignalDelta`), so
  falling risk appetite is "Tightening" and a rising recession warning gauge "Easing"; funding
  pressure is titled "Funding pressure", not "Capital conditions". The gauge's line repeats the
  Spending rule's 6-month payback bar (`SPENDING_PAYBACK_BAR_MONTHS`) instead of setting its own 12-
  or 9-month cap beside conditions the reading contradicted.
- **Cadence summaries** (`/api/weekly`, `/api/monthly`, `/api/quarterly`, `/api/yearly`,
  `/api/summary-delta`, `/api/cadence`, the agent interface, the RSS live item, `/api/scores`). Dated
  by the reading's record date, never the week-ending Friday, which printed "Updated Oct 9" on Oct
  7. Each states the published confidence word and then "Conditions change if:" with the canonical
  sentence; "the signals behind it are barely moving" is gone, because the number behind it was a
  distance, not a speed. The weekly paste's confidence line is the published word, not the data
  tier, and it no longer lists the engine's governance settings as raw keys. The monthly reversal
  names the resume lines that re-open paused work. `/api/summary-delta` says "Conditions held at …"
  and reads an age label's unit, where "6m." became six hours.
- **Embed and alerts.** The embed's "Watch" line was Hiring's resume condition; it prints the
  weekly call's "Conditions change if" (and a calibrated stage's "Resume when"), the published
  confidence word in place of "MED", the record date, and one do-now item per line. The
  regime-change email prints the do-now line under "Action now" (it carried the regime's
  description) and the brief's change line (it said "the readings return to the previous
  conditions", the wrong way out). The decision deltas behind `/api/regime-alerts` and the digest
  fire on each area's published pause and resume lines, not the change lines. Threshold alerts print
  whole points; the weekly email says "1 point". The week's direction is judged on the two scores
  whenever either moved, so `/api/posture/current` reads "Since Aug 31: worse." where the gauge's
  0.06 rise had made a 27-point tightening "mixed".
- **Replayed months** (`/history/compare`, every `?month=&year=` read). The loader returns the macro
  series as of the selected month-end (`assessmentMacroSeries`) and null where a series' history
  does not reach; the compare page printed today's credit premium, inflation and unemployment under
  March 2020 and called the difference 0.00%. A missing value says "Not on record for this month".
  Each period column lists the five areas against that period's published pause lines, replacing
  hiring, expansion and fundraising "windows" graded on cutoffs no rule publishes ("Expansion pace:
  Open" under Freezing). A replayed month's caption is its move against the earlier month-end, not
  "This week's guidance …", and a held week's "Pause if" reads as a condition: "The decision can't
  be undone while the guidance is held."
- **Charts that draw the month-end archive** (`/signals`, `/history`). Rate moves are "Biggest
  monthly rate moves", dated by month in whole basis points; the weekly cadence option, which redrew
  month-end points under day labels, is gone. The recession warning gauge ribbon draws 10Y−2Y (it
  drew an unnamed blend, so it read 0.42 beside the row's 0.41pp) and every spread on `/signals` is
  in pp. A "12-month" change is measured across 13 month-ends, where 12 points spanned 11 months
  (risk appetite "fell 6" was a fall of 10). "Earlier months" names its own range; the phase map's
  count is "Months under each set of conditions" and says how many plotted months sit in another
  quadrant. Cluster and answer pages name the reading they compare against ("since Aug 31", not
  "Week over week" or "last week") and take their direction word from the two scores.
- **Frozen records and archive periods.** `/brief/[week]` shows its stored record through one
  translation layer (`publishedBriefDisplay`) that the page, the feed and both copy formats read;
  the records are not rewritten. Each move names the reading it is measured against — the record's
  stored `scores.comparedWith`, or the frozen week before it — where w40 printed "+27.0 vs prior
  week" against an Aug 31 reading five weeks earlier; future records store the comparison. Retired
  names and phrasing ("cash availability", "flips this call", "70.0") are restated in today's words,
  and a stored "Pause if" with no number is left out. `/history/[period]` pages are headlined with
  the conditions most of the period's readings held (a tie goes to the close), where 2022-Q3 read
  "Stormy" over a split that was 9 of 14 weeks Freezing; "held for the whole period" prints only
  when it is true. Periods ending before the record's first month-end are not generated, and their
  URLs redirect to `/history` (`next.config.js`).

### 1.1.51 Two owner calls: replays judged on their own inputs; "this week" against last week (2026-10-07)

The sweeps in §1.1.49–§1.1.50 left two decisions open. Both are decided here.

- **Replayed months are judged on the inputs the archive carries.** The archive has no credit-spread,
  inflation or unemployment history for most months, so the policy layer held every replayed month for
  missing inputs while `/history`'s strip showed that month's conditions unheld. The replay walk now
  passes `inputsNotOnRecord` (`buildReplayContext`, `lib/timeMachine/regimeReplay.ts`, worked out per
  step from what the step carries): those inputs still score 0 in the policy composites but no longer
  count toward the missing-input hold. A live read whose feeds are absent or answer with no value is
  still held — that is a feed failure, not an archive gap. `ENGINE_VERSION` is unchanged: with the
  option omitted the scorer answers the same. Of 176 replayed months, 154 now print their conditions'
  guidance and match the strip; 21 are held because the two scores disagree (March 2020 among them)
  and one because the signals are spread too far apart.
- **A held week says why.** `POLICY_OVERRIDE_CALL` is keyed by refusal code; each reason has its own
  call, action, change line and "why this could be wrong", read through `describePolicyHold`
  (`lib/report/regimeDescription.ts`) on the guidance, every share format, the home headline, the
  cadence cards and the trust strip. It said "The two scores point in different directions" whatever
  the reason. A stored record whose reason cannot be read gets a hold that names none.
- **"What changed this week" is against last week's published brief.** `findWeeklyComparisonReading`
  (`lib/report/comparisonReading.ts`) takes the most recent published record dated 5–14 days before
  the reading, never one on or after it; with none, and always on a replay or a threshold override,
  the previous month-end is the fallback and is named by its date as before. The month-end basis made
  every Monday in a month repeat one crossing: the Oct 5 brief still led "Since Aug 31, conditions
  changed from Sunny to Freezing" three weeks after the change. A record counts only if the engine
  that scored it is this reading's: new records store `scores.engineVersion`, and one scored by
  another `ENGINE_VERSION`, or by one it did not record, is passed over, since across a scoring change
  the move would be the code's, printed as the market's (Codex review on #1534). Against a counted
  record there is no rates-versus-inputs split and no "built from interest rates alone" note; the
  conditions map still draws month-ends and keeps that note. Records before w41 stored only the two
  scores, so the base rate and curve rows print "—" until new records, which now store
  `scores.baseRate` and `scores.curveSlope`, are in range. A short-term rate the engine scored as
  missing (`baseRateUsed: "MISSING"`, scored as 0) is not compared on either side
  (`observedBaseRate`), and a held week with low confidence names the hold's reason, not "close to a
  line".
- **An improving week holds while a pause applies.** Against a week, small moves now set the tone,
  and a four-point rise in risk appetite turned the Oct 5 headline into "Conditions are easing. Resume
  paused work with clear milestones." with funding pressure fourteen points past the pause line for
  four areas. `buildActionNowShort` reads an improving week as holding while any area's pause line is
  met.
- **Stage lines name the published lines.** A stage's watch line, its "Pause if" once the stage is
  chosen, read "tighten if funding pressure moves within 20.0 points of the line", with today's gap
  as the number; it names the area rules' pause line now, and the resume discipline their resume
  lines. The tight-runway bar is the Spending rule's 6 months rather than a looser 9.
- **Leftover wording.** Cadence summaries open on the conditions word and head their sections in
  reader terms; the source is "Federal Reserve Economic Data (FRED)" and provenance labels no longer
  claim a confidence; alert reasons and the digest print whole points against a named line and the
  conditions word; the recession warning gauge on cluster pages is in percentage points.

w38–w40 did not record their engine, and `ENGINE_VERSION` changed on 2026-10-06, so no record in the
archive counts yet: the week compares with the month-end, as before, until the first record frozen
after this change is 5–14 days old.

### 1.1.52 Contradictions left from the sweeps (2026-10-07)

Four facts were still stated two ways on one page or paste.

- **The payback bar.** A chosen stage said "fund the channels that convert repeatably and pay back
  inside 12 months" (Series A) and "only where the cash comes back inside the year" (Bootstrapped)
  under a Spending rule that approves new spend only inside 6 months. Both read
  `SPENDING_PAYBACK_BAR_MONTHS` now (`lib/report/boundedDecisionRules.ts`): a stage adds emphasis and
  never relaxes the Spending bar, the precedent the tight-runway bar set in §1.1.51.
- **Operating latitude and the guidance.** The latitude blends the two scores, so it stays flat on a
  week one score crosses a pause line, and every "nothing changed" line read it: a week that paused
  four areas printed "This week's guidance is unchanged." (operator paste, `/history/compare`), "Call
  unchanged" (`/share` standup) and "The guidance is holding where it was on Aug 31." The latitude's
  line now speaks about the number ("Operating latitude unchanged since Sep 29.", `getNetDeltaLabel`),
  measured whenever a comparison exists rather than only on a regime alert (closing §1.1.26's "found,
  not changed"), and the quiet-day and standup lines read `describeGuidanceChange`
  (`lib/report/decisionMovement.ts`: `regimeChanged` or the movement's conditions change, then a crossed
  pause or resume line, else held). `steadyWeek`, `notchShiftLabel` and `netDeltaLabel` are gone; the
  last two were read nowhere.
- **Line precision.** The home model's "how close conditions are" line, the flip meter, the
  signal-influence rows and the regime-alert reasons printed the change line as "70.0"; the canonical
  "Conditions change if" sentence and the answer pages rounded it with `toFixed(0)`. All of them print
  through `formatThresholdNumber` (lib/formatters.ts), as the area rules do: whole points unless the
  line carries a decimal.
- **The week's direction beside the guidance.** The headline's rule (an improving week holds while a
  pause line is met, §1.1.51) is `resolveWeeklyTone` (`lib/report/reportEvidence.ts`), and every
  `directionLabel` reader was audited against it: `/api/decision`'s memo said "Conditions loosened this
  week." beside "Conditions are holding.", and the homepage sticky strip's badge read "Steady" every
  week, because it searched the trend label for words no label contains; both take the headline's tone
  now. A week with nothing to compare states no direction: the headline is the action alone (it said
  "Conditions are holding." beside "No previous reading to compare this week against."), the memo says
  so (it said "No material signal shift this week."), and the strip draws no badge.

### 1.1.53 The weekly basis survives a scoring change (2026-10-07)

§1.1.51 compares a week with last week's brief only when the same `ENGINE_VERSION` scored both, so
every scoring change dropped the weekly basis to the month-end for a week or two, until a record frozen
by the new engine was five days old. A record now stores what the engine scored, and a later engine
scores it again.

- **What a record stores.** `inputs` on the published record (`PublishedBriefSchema`,
  `lib/report/publishedBriefs.ts`, validated with zod on read), built by `buildStoredInputs`
  (`lib/report/comparisonReading.ts`) inside `buildPublishedBriefRecord`, which both freeze writers
  share. Only what the scorer reads for the two scores and the conditions: the Treasury yields the
  short-term rate and the curve come from; the two one-month-bill prints the tightening-speed term
  measures between (`resolveBaseRateVelocityPair`, the pair the Time Machine cache also stores, not the
  92 days of history it was found in); the values of the five market series that adjust the scores
  (high-yield spread, Chicago financial conditions, VIX, venture funding, tech layoffs); and the last
  ten VIX closes, which the market-stress veto means. Not stored: sparkline histories, provenance, and
  the BBB spread, inflation and unemployment the policy layer reads, since nothing the policy layer
  computes reaches the scores or the conditions. About 380 bytes, or 680 in the file's indented form,
  on a record of about 7.7KB. Absent on every record frozen before.
- **Stored only when it reproduces the record.** The builder scores the inputs again through the path
  next week takes and keeps them only if that reproduces the week's funding pressure, risk appetite,
  short-term rate and curve exactly. On a mismatch the record stores none, and a later engine passes it
  over like a record frozen before inputs were stored: inputs that did not produce a citable record's
  scores would print a move no market made.
- **The re-score.** `findWeeklyComparisonReading` reads a record scored by today's engine as stored. One
  scored by another engine, or by one it did not record, is scored again from its inputs by the
  re-scorer the loader passes in, `rescoreStoredInputs(deps.evaluateRegime, thresholds)`: the current
  engine under the reading's thresholds. A record with no inputs is passed over, as before. The finder
  stays pure and calls the re-scorer once, for the record it chose. `observedBaseRate` applies to a
  re-scored reading as to a stored one, so a rate the engine scored as missing is not compared. The
  engine is untouched; the re-score is in `lib/report`. The re-scored reading was scored from the same
  inputs by the same engine as this week's, so there is no rates-versus-inputs split to make.
- **No machine state, as for the month-end.** The month-end comparison re-scores its snapshot with no
  machine state (`evaluateRegime(previousSnapshot, thresholds)`), and so does this: the conditions are
  the quadrant the re-scored scores sit in. Where the confirmation gate was holding a flip, they differ
  from the ones published. Risk appetite one point over its line, published Stormy while the gate held,
  re-scores as Sunny. The machine moves the conditions, never the scores, and threading it would mean
  storing its state from an engine that is no longer scoring.
- **Limits.** A re-score is like-for-like as far as the new engine reads what the record stored. An
  engine that reads another input, a longer VIX window or a different speed-term lookback scores an old
  record on what it has: ten closes and the pair the old lookback chose. `tests/weeklyComparison.test.tsx`
  moves every market series the engine knows and fails if the set that moves a score stops being the
  set records store, so a scoring change that starts reading a new series is caught in the change that
  makes it.

No record in the archive stores inputs yet: the first is the next freeze.

### 1.1.54 One week's guidance, said once on every surface (2026-10-07)

A parity test that renders one week through every surface (`tests/weeklyClaimParity.test.tsx`, against
the claims in `docs/claims-ledger.md`) found the week's action built three ways.

- **Ordinary week.** The pastes, the Monday send and `/brief.md` led with the lead area's rule ("Limit
  hiring to backfills and mission-critical roles…"). The page, the embed and the share card led with the
  week's headline ("Conditions are tightening. Keep only the bets you can stop…"). The cause was the
  stored operating snapshot: it built its weekly call with no comparison, so it could not know the week's
  direction. It now compares the week as the page does (`resolveWeekComparison`), and the weekly call
  leads with the headline. The lead area's rule stays first among the Do now lines.
- **Held week.** The agent state and `/signals` read a week action that ignored the hold, and said
  "Conditions are easing. Grow what is working" beside a hold. The page held in its own words ("Slow
  approvals, require reversible bets…") while the pastes used the hold reason's. Every surface now prints
  the hold reason's action (`describePolicyHold`).
- **One builder.** `buildWeekActionNow` (`reportEvidence.ts`) is the week's action for the loader and
  the snapshot alike. The page card, the share card and the contract read that value first.

A routine reads the live surfaces early each Tuesday, after the Monday send, and reports any claim that disagrees across them
(`docs/agents/lessons/automation-and-deploy-gate.md`).

### 1.1.55 The rest of the ledger, held on every surface (2026-10-07)

`tests/weeklyClaimParity.test.tsx` now holds every claim in `docs/claims-ledger.md` on the ordinary and the
held week: the call, the week's direction, the comparison date, the two scores, what would change the
guidance and why a held week holds, beside the conditions, guidance, record date and confidence it held
before. It added the surfaces that print them: the Monday Slack post and email, the `/api/decision` memo
(`buildDecisionMemo`), the `/share` standup line, the homepage quiet-day line (`buildHomeQuietDayRead`) and
the frozen archive record. A surface that does not print a claim is not held to it. What it found:

- **What would change the guidance had two builders.** The contract's "Conditions change if" is in score
  points; `lib/report/flipProximity.ts` answered in interest rates, and four one-line surfaces printed its
  first move alone as the nearest. On the ordinary week the standup read "Conditions changed to Stormy,
  0.22% from flip; review pace." while every other surface said the nearer line was risk appetite's, 9
  points away; on the held week, "Guidance unchanged, 0.15% from flip; no pace change." beside guidance that
  changes when the two scores agree. They now read one builder. `buildCallChangeLines`
  (`lib/report/reportEvidence.ts`) is the sentence's clauses as values, and `buildFlipThreshold` joins them;
  `buildCallChangeLine` reshapes them for a line with room for one clause: the nearer line in points, or a
  held week's own condition. The standup reads "Conditions changed to Stormy; review pace. Conditions change
  if: Risk appetite rises 9 pts to clear 50 (41 today)." and, held, "Guidance on hold this week; no pace
  change. Conditions change if: The two scores point the same way for a second reading; until then the
  guidance is not changing." (`buildStandupLine`, `lib/report/decisionMovement.ts`). The quiet-day line,
  which read "Conditions unchanged — If the 1-month Treasury bill rate rises 0.15%, conditions turn
  Cloudy.", closes the what-changed lead with the same line ("…Last week's guidance stands. Conditions change
  if: …"); the lapsed-return panel prints it, and the `/share` work-item blocks print the contract's whole
  sentence under "What would change this guidance".
- **The interest-rate moves, kept as a translation.** Read against the code, each move crossed the same line
  as the sentence's clause on its axis, but the set was a different answer: sorted by the size of a move in
  two different rates (a 0.22-point bill-rate move to a line 38 points away led a 0.25-point curve move to one
  9 points away); scanning for any change of quadrant, so while the machine held a crossing it reported a 0.01
  move toward conditions the scores were already in, beside "(already true at 41)"; and on a held week it said
  what market move turns the conditions under a sentence whose condition is the scores agreeing. It now
  translates the sentence's lines, in its order, scanning for the line itself; a line already crossed and a
  held week get none. It prints only in the "In interest-rate terms" fold under "Conditions change if",
  labelled by score, because it is the one place the page says what has to happen in the market. The move is
  in percentage points ("rises 0.22 percentage points"), not "0.22%" (`formatPointsMove`, now in
  `lib/formatters.ts` with the flash alert's), and "flip" is gone from the copy.
- **A held week's "Conditions change if" was the score lines off the contract.** The report loader's
  `flipThreshold`, the posture state's `whatFlipsNext.flipTrigger` and the home model said the two lines on a
  held week, so `/api/decision`'s memo and shift summary ended "Conditions change if: Funding pressure rises
  25 pts to clear 70 (45 today) or risk appetite falls 12 pts to 50 or below (62 today)." beside a trigger
  that said the scores had to agree, the weekly mandate's `nextFlip` said the same, and the agent state and
  `/api/cli/status` listed "Funding pressure above 70" and "Risk appetite at or below 50" as what would change
  held guidance. All read `buildWeekCallChangesIf` now, the hold's condition on a held week; so do `/trust`,
  `/signals/[cluster]`, `/resolve` and the frozen record, which print the loader's.
- **The call was composed twice.** The operating snapshot compared the week (§1.1.54) but passed no regime
  alert, so the stored call took the stance rule's no-change branch on a week the conditions changed:
  "Favour releases that pay back quickly and can be rolled back." in every paste, the embed and the Monday
  sends, where the page's own model, the `/api/decision` memo and the frozen record's summary said "Ship
  fixes and releases that pay back quickly; hold anything you could not reverse." The snapshot builds the
  alert from its comparison as the loader does, the memo is built around the contract's call, pause line and
  sentence, and the frozen record's summary is the contract's `currentCall`.
- **Every change of conditions read "tightening".** `resolveWeeklyTone` now reads which way the conditions
  moved (`REGIME_SEVERITY_RANK`, from `ReportDynamics.previousRegime`): harsher tightens, milder eases, or
  holds while a pause line is met. A week the machine confirmed Sunny over a Stormy brief on the same scores
  had headlined "Conditions are tightening. Keep what is working, and don't start anything new this week.",
  with "Conditions tightened this week." in the memo; it reads "Conditions are easing. Grow what is working,
  one milestone at a time." Without the earlier conditions the old rule stands.
- **A card detail that could not render** (`cardCallDetail`, `app/page.tsx`) is gone: the card's call is
  the week's action, so the detail always equalled it.

Left as they are, and named in the test: the agent state's `change.direction` is the comparison's own label
("mixed" on the ordinary week beside "Conditions are tightening."), not the headline's tone; changing it is an
API decision. (Two more were left here and are fixed below: the Monday sends printed no comparison date, and the
Monday post was cut at Slack's section limit.)

The last four places that printed "Conditions change if" from the raw lines read `buildWeekCallChangesIf`
too: the archive summaries' change line (`formatConditionsChangeLine`), the regime-change alert's reversal
line, the answer pages' trigger (still for the score the page is about), and the CLI's expanded view
(`reversalTrigger`, `flipConditionsCompact`). On a held week each named a line beside a hold.

A frozen record names the engine that scored it only when this engine reproduces its scores from the record's
own inputs, the check that already decides whether the inputs are kept; it named `ENGINE_VERSION` on every
record, though the scores can come from an operating snapshot an earlier deploy stored. The report loader and
the operating snapshot choose the comparison reading through one rule (`selectWeekComparison`,
`monthEndComparisonReading`, `lib/report/weekComparison.ts`).


A shared brief's "Full brief" link and its "Permanent record" line cite the newest week frozen at or
before the reading (`selectCitablePermalinkBrief`). They cited the newest frozen week whatever the
reading's date, so a replayed or saved reading pointed at a week frozen after it.

The Monday sends name what the week is compared with. They render the stored operating snapshot, which kept no
earlier reading, so the email and Slack post said "Conditions are tightening" against nothing named; the
snapshot's document now reads the comparison its weekly call was built from (`resolveWeekDynamics`,
`lib/report/weekComparison.ts`), and the email prints the "What changed this week" line every paste opens that
section with (`briefWeekChangeLine`). The Monday Slack post is carried whole across sections split between
lines: it had outgrown Slack's 3,000-character section and was cut mid-word ("Put a payback figure on every
discretionar… (truncated — full brief on the site)").

### 1.1.56 The newcomer's guide uses the page's words; each tab says what it is for (2026-10-08)

A first visit met "Freezing", a four-corner chart, "2 pts from its line", "Pause line crossed" and "Change
line 70" within one screen, and nothing on `/` said what the other three weather words meant or that the
change line and an area's pause and resume lines are different lines. The one element addressed to a
newcomer, "How to read this page" in `FirstVisitExplainer`, did not help: its steps were named "Summary",
"Proof" and "Actions", which no section is called; it sent the reader to "the score details" and "the
planning page"; it linked "Past snapshots" for the tab called History; and it said a stage and runway
changed "the notes under the guidance and nothing else" above a picker that says they set the lines.

- **The guide** (`FIRST_TIME_GUIDE_STEPS`, `FIRST_TIME_GUIDE_LINES` in `lib/report/reportCopy.ts`) now
  names the scores by their labels, gives three steps named for what they point at ("Read the guidance",
  "Pick what you're deciding", "Act on it"), lists the four conditions with their meanings
  (`getOrderedRegimeLegend`, laid out in the chart's corners and marking this week's on a live reading),
  tells the change line (with `CALL_CHANGE_RULE`, which `/` did not otherwise print) from each area's pause
  and resume lines, and ends on Plan, Evidence and History with the IA's own names and descriptions.
  `FIRST_TIME_GUIDE_HIGHLIGHTS` and `FIRST_TIME_GUIDE_NEXT_LINKS` are deleted; the second was a third copy
  of the IA. It stays folded, and hidden for a returning browser.
- **A held area names its side of the lines.** "No line crossed since Sep 30." printed alone beside "Pause
  if Funding pressure > 76 · crossed" read as the row contradicting itself. An area held past its pause
  line now reads "Pause still applies: no line crossed since Sep 30.", one held past its resume line
  "Resume line still met: …", and one between its lines keeps the plain sentence (`describeHeld`,
  `lib/report/decisionMovement.ts`). This prints in the picker's note and the by-area **Changed** column.
- **Tabs say what they are for.** The desktop tabs' hover title is the IA description (with the one-key
  jump after it), where it was the tab's own name. The phone's More sheet lists every page under "Pages"
  with the same line, where it listed bare names under "Operator loop" with keycaps a phone cannot press;
  the utility links carry their descriptions there too, as they already did on desktop. Evidence's
  description says "lines", not "thresholds".

`tests/firstRunOrientationGuide.test.tsx` rendered the guide and failed on any of its retired nouns; the
guide gave way to the conditions legend on 2026-10-09, held by `tests/conditionsLegend.test.tsx` (§1.1.60).

### 1.1.57 Titles in the words people search, dated by the data (2026-10-08)

A crawl and a round of search research found the pages that answer high-demand questions titled in
the product's words: "Public SaaS Valuation Multiples", "Runway planner", "How much runway do we
need…", and eleven answers ending in "(Live operator answer)", which no one searches for.

- **A month in a title is a claim about the data** (`formatTitleMonth`, `withUpdatedMarker` in
  `lib/seo.ts`). It comes from the date of what the page prints, never the clock or a literal, and a
  page with no date gets no marker.
- **`/comps`** is "SaaS Valuation Multiples, October 2026", the month from the basket's `fetchedAt`.
  The heading carries the same month and the figures an "As of" line with that date and the source
  that answered (`MARKET_DATA_PROVIDER_LABELS`; the page said "Yahoo Finance" whichever did): "SEC
  EDGAR filings and Cboe delayed prices" by default, "Yahoo Finance" when the fallback answered. With
  no basket the title is "SaaS Valuation Multiples: Public SaaS EV/Revenue" and no month appears.
  Production served no basket from 2026-10-08, when Yahoo began requiring a cookie and crumb; EDGAR
  replaced it as the default source (`docs/agents/data-and-platform.md` → Market data provider).
- **Answers** end in "(updated Oct 2026)", the month of the reading they state
  (`reportData.treasury.record_date`).
- **Guides** end in "(updated …)" from their own `updatedAt` and print it under the heading, so the
  title, the page, `dateModified` and the sitemap name one date. The runway guide leads with "How much
  runway should a startup have?".
- **`/operate/financial`** is titled "Startup runway calculator: burn, raise timing and a memo". The
  heading keeps "Runway planner", the name the nav, breadcrumb and links use.
- **The hiring-freeze pair stays two pages.** "Should we freeze hiring this week?" is the answer, with
  this week's guidance; "Hiring freeze policy for high interest rates" is the guide, the standing
  policy for which roles to keep, gate behind milestones or pause. A canonical would drop one of two
  different questions from search. The answer already cited the guide; the guide now links back from
  its guidance block to every indexable answer that cites it (`selectAnswersCiting`,
  `lib/seo/relatedAnswers.ts`).
- **Published weeks describe themselves differently** (`buildPublishedBriefDescription`,
  `lib/report/publishedBriefs.ts`). The summary belongs to the conditions, so w40 and w41 shared one
  description; a week's description is now the guidance and what changed, or its first sentence, and
  the week's date leads when that would still be too long or match another week.

`tests/searchTitles.test.tsx`, `tests/compsAsOf.test.tsx` and `tests/snippetLength.test.ts` hold them.

### 1.1.58 The homepage facelift: a quiet ground and a louder call (2026-10-08)

A visual pass on `/`, from a mockup reviewed before it was built. Nothing new is derived and no
reader-facing sentence changed; every change is where a value sits or how it is drawn.

- **The ground.** `--atmosphere-*` is about a third of its old strength (dark 0.28–0.34 → 0.10–0.12,
  light 0.09–0.10 → 0.045–0.05), still painted by `.weather-regime-ground` on both shells (§XVI). A
  Freezing week no longer dyes the first screen maroon, so the card's own rose reads as the signal.
- **The card** (`.weather-hero-card`, `DecisionHero`). The regime is a solid 3px rule across the top
  edge; the fill and border keep a trace of the hue (5% and 12%). The stamp line is the stamp and
  what the week did ("Tightening this week · Was Cloudy on Sep 30"); the weather word's meaning
  ("Money is expensive and hard to raise.") is the line under the call, so the eye goes stamp →
  call → why. `--text-display` tops out at 3.25rem instead of 2.5rem (floor 1.75rem); the call still
  holds two lines in the 42rem measure. The trust strip sits over a hairline, and a cell in a caution
  or easing state carries a dot (a pseudo-element, so the cell's text is only its value). The map's
  plot is capped at 256px instead of 200px, in an 18rem column.
- **Sections.** `HomeSection` and the picker set their headings at `text-fluid-xl` (20–26px) instead
  of 16–18px, leads at `text-fluid-sm`, with `--layout-section-gap` above each hairline from `md`.
- **The picker's answer** is a card instead of a sky rule down its left edge, the rule at
  `text-fluid-lg`, and each line's distance a stamp: caution when a pause line is in force, easing
  when a resume line is met, neutral otherwise.
- **The area table.** The row whose lines the week crossed (`changedKind` other than `held`) takes a
  caution tint and its "Changed" cell the caution ink (`AreaRowData.moved`). A line in force is drawn
  as a stamp; a distance still to go stays text.
- **Every `ScoreLadder`** shades the range each line guards — amber beyond the pause line, green
  beyond the resume line, each on the side it faces, judged from the other lines on the track, and
  none where there is nothing to judge by — and draws the move between the earlier dot and this
  week's. This reaches `/signals`, `/trust`, the answer pages and `/history/compare` too.

Considered and not built, because they break a rule here: a distance meter on each picker choice (a
third drawing of the distance the ladders and the second line already state, §XV), "+2 pts → Cloudy"
cards in "What would change" (a second derivation of the "Conditions change if" sentence, §XV), and
boxed share cards (a frame inside the section's hairline, §XIII).

`tests/visualPrimitives.test.tsx` (zones, the move, the moved row, the in-force stamp) and
`tests/homePageHeading.test.tsx` (the meaning under the call) hold them.

### 1.1.59 The brief remembers the decision, and the facelift's loose ends (2026-10-08)

- **A link carries the decision.** Picking a choice under "What are you deciding?" writes
  `?decision=<area>` into the URL (`HOME_DECISION_PARAM`, `lib/report/home/homeSectionModel.ts`)
  with `history.replaceState`, so a link copied after picking opens on that answer, and Back does
  not retrace each pick. The page reads the parameter on the server (`parseHomeDecision`, areas
  only), so the answer is in the first paint. The canonical stays `/`.
- **The map names its dots.** Each month-end on the card's conditions path carries a hover title
  ("Aug 31, 2026: Funding pressure 63, Risk appetite 56"), in the words the current marker already
  used, with a 7-unit transparent target around the 2.4-unit dot.
- **One intro across the routes.** `.weather-page-intro` (`/signals`, `/operate`, `/trust`) takes
  the hero's treatment from §1.1.58: the regime as a 3px top rule, a trace of it in the fill and
  border. It had kept the tinted slab the hero dropped.
- **One type size for a row of controls.** `ActionLink` and the subscribe button are set at
  `text-fluid-xs`, the size of the clipboard buttons beside them. "Build this week's plan" printed
  2px smaller than the two copy buttons it leads.
- **A class glued to an interpolation is never generated.** §1.1.58 wrote
  `max-md:py-3${row.moved ? …}`; Tailwind scans that as one token it cannot parse, so the area
  table's phone rows lost their padding and ran into each other. Four more sites had the same shape
  and were saved only by the class appearing elsewhere. All five have a space before `${` now, and
  `tests/tailwindClassBoundaries.test.ts` fails on the shape anywhere under `app/`. On a phone the
  moved row's tint is inset from its text, and the other rows' "Changed" cells sit in the muted ink.

`tests/homeDecisionPicker.test.tsx` holds the parameter, its parse and the replace.

### 1.1.60 One vocabulary, one headline, one count (site review, 2026-10-09)

A live review of every route found the same few things said several ways. Each is now said once:

- **Areas, lines, signals.** Areas print as Hiring, Roadmap, Fundraising, Spending and New bets
  (`decisionAreaLabel`, which the `/operate` levers now read too); lines as the pause line, the
  resume line and the change line (export noun slots Action / Pause line / Resume line); signals as
  Funding pressure, Risk appetite and Recession warning gauge, in full on charts. Slugs and JSON
  fields are unchanged. `tests/readerVocabulary.test.tsx` bans the retired names.
- **The margin.** What the API calls `confidence` prints as the margin: "Clear of / Within reach of /
  Close to the line", with the nearer score's points where a surface holds the scores
  (`resolveNearestLineMargin`; mapping in `docs/developer/api-reference.md`). "Confidence: Low" beside
  "Freeze new commitments" read as a contradiction; `/calibration` shows the number is a distance.
- **The headline action.** `weeklyHeadline` (`lib/report/reportEvidence.ts`) is the one source for the
  homepage `h1`, the frozen brief's lead, answer pages, every paste, the Monday post and email and the
  share and OG cards. It is the contract's call (`currentCall`; `PublishedBrief.summary` frozen), the
  more concrete of the two week-level sentences; the action's first sentence (the direction) rides
  on the stamp or opens a paste, and on a held week the hold's action leads. Per-area "Do now" lines
  stay area lines. `tests/weeklyHeadline.test.tsx`.
- **Weeks and dates.** A week is named by its Monday (`formatWeekMondayUTC`); the strip says "Data as
  of" and the intro "Checked" for the two dates it prints.
- **The record.** `countRecord` (`lib/report/trackRecord.ts`) counts readings, comparisons
  (readings − 1) and changes, for the whole record or a trailing window, and every count prints with
  its window. Seven changes since Jan 2012; `/calibration`'s "six" predated September 2026.
  `tests/recordCounts.test.tsx` holds the calibration study's own extract to the same counts.
- **Elsewhere:** `/resources` is "Guides"; the method moved from `/trust` to `/about#method` (§1.1.9);
  `/history/<period>` says the reading is reconstructed by today's formula and when publication began;
  report-route loading fallbacks ship no sentence in server HTML.

### 1.1.61 Glyphs beside the words: conditions, areas and line states (2026-10-09)

Three concepts carry a glyph, each from one mapping through one component
(`app/components/ui/conceptIcons.tsx`; the rules are `docs/agents/ui-ux-standards.md` §XXIV). A glyph
sits beside its words, never in place of them, and is `aria-hidden`.

| Concept | Glyphs | Mapping |
| --- | --- | --- |
| Conditions | Sunny `Sun`, Cloudy `Cloud`, Stormy `CloudLightning`, Freezing `Snowflake` | `REGIME_ICONS`, `lib/regimePresentation.ts` |
| Areas | Hiring `Users`, Roadmap `Route`, Fundraising `Landmark`, Spending `Wallet`, New bets `Sprout` | `DECISION_AREA_ICONS`, `lib/report/boundedDecisionRules.ts` |
| Pause line crossed / close / clear or resume met | `Pause` / `CircleDashed` / `Play` | `LINE_STATE_ICONS` and `resolveLineState`, `lib/report/operatingCalls.ts` |

- **Conditions.** The hero's stamp (homepage, published weeks, answer pages) draws the weather glyph
  where `RegimeGlyph`'s abstract strokes were; the component is gone. Also: the conditions chart's
  four corners (glyphs just outside the frame, beside each word), the homepage conditions legend,
  `/history`'s key (the glyph is the swatch), its band (each run wide enough for a 16px glyph:
  8% of the band on a phone, 3% from `sm`), the "Each closed year" chips and the published-week
  stamps, the year and quarter pages (stamp, split, changes, quarters), `/history/compare`'s period
  headings, `/concepts`' stamps, and the Guides climate stamp. `Tag regime` draws the glyph itself;
  the period page's own tone table (Cloudy in sky, Stormy in amber) is gone, and the published-week
  stamp takes the regime's hue instead of slate.
- **Line states.** One badge (`LineStateBadge`): "Pause line crossed" with pause, "N pts from its
  pause line" with the dashed circle when the reading is within 5 points of the line (the margin's
  `REGIME_CONFIDENCE_NEAR_THRESHOLD`, the same distance the area table tinted as near), and the
  clear or "already met" text with play. The dashed circle, not the warning triangle: the triangle
  is the toast's error mark. On the picker's choices and its answer card, the area table (Decide,
  the brief's folded table, `/share`, the answer pages, which now print the distance under each
  line), Guides' stamps, the published week's "Guidance by area", and `/history/compare`'s rules.
  The area table takes the state as data (`AreaRowData.pause.state`) instead of parsing its
  distance string. The signal bars' keys draw pause beside "Pause NN" and play beside "Resume NN";
  the change line keeps its tick. The published week's two rails do the same beside "Pause if" and
  "Resume when".
- **Areas.** On the picker's choices (20px), Guides' area headings, every area table row, the
  published week's "Guidance by area", `/history/compare`, and the "Governs:" line under each score
  on `/` and, new, on `/signals` (it said "Sets the pause and resume lines" without saying whose;
  its links open the brief on that area's answer). Both read `areasGovernedBy`, the inverse of the
  table the area rows name their score from (`decisionAreaUsualMetrics`, moved from the area
  table). The runway note on `/` draws an hourglass, since the wallet is Spending's.
- **Removed.** The "Governance Pillars" emblem on `/resources` (`GovernancePillarsGlyph`) and
  `RegimeGlyph`, with its test.
- **Not drawn.** Plain-text artifacts (Slack and email pastes, citations, RSS, `llms.txt`,
  `/brief.md`) carry no glyph. Neither do the Satori share cards: lucide's components are client
  components that read a React context, which Satori cannot render, and a hand-copied vector
  table would be a second mapping. The report routes' status word and the sticky strips keep the
  word alone.

`tests/conceptIcons.test.tsx` holds every mapping, the 5-point line, `aria-hidden` and a label
beside every glyph on the shared components and the routes that render offline, that no page
imports a concept glyph or reads a mapping outside the shared components, and that the text
artifacts carry no icon markup.

### 1.1.62 The meeting slide's cards wrap their text (2026-10-09)

The SVG meeting slide (`formatMeetingSlideSvg`, `lib/export/meetingSlideExport.ts`) drew each
decision card's line as one SVG `<text>`, which does not wrap. After §1.1.60 made the headline the
week's concrete call, the 92-character call ran past its card ("…hires that bring in revenu"), and
the rule lines' new reading sentence put "Pause if" near the edge too. Each card's text now wraps
onto at most two lines with `wrappedLines` from `lib/image/textFit.ts`, steps down one size at a time
(up to three) before anything is cut, and cuts at a word with an ellipsis as a last resort. The
slide's system sans runs wider than the Archivo faces `textFit` was measured on, so the slide uses
its own, higher per-character widths (0.56em bold, 0.53em regular). The PPTX deck's text boxes wrap
natively and are unchanged. `tests/meetingSlideExport.test.ts` pins a two-line call, a one-line
call and the cut.

### 1.1.63 One place per fact (2026-10-09)

Each fact prints once per page, in its most useful form: a chart or a bar over a sentence that
restates it, a control over a sentence describing its state. A summary followed by its detail stays
("Pause lines crossed in 4 of 5 areas" over the five choices), and so do sr-only text alternatives,
labels beside glyphs, and the same fact on another page. Two elements are duplicates only at a width
where both show. `tests/onePlacePerFact.test.tsx` pins the homepage and `/history` decisions.

**Homepage.**

- **The four conditions.** The legend above the week shows below `md` only; from `md` up the card's
  map defines them, with each change line's value at its end ("70", "50"), an sr-only statement of
  the four sides, and "How they are set" under it. A share arrival's greeting shows at every width.
- **Cloudy → Freezing.** Said once, on the card's stamp line ("Was Cloudy on Sep 30") with the line
  under the call. `SinceLastVisit` renders only when the conditions or the call differ from what
  this browser last saw, and not when the difference is the earlier conditions the card names
  (`sinceLastVisitDelta`); it no longer carries what would change the guidance or the
  lines-crossed sentence. "What changed this week" opens on its table; `buildChangedLead`,
  `buildQuietDayRead` and `buildHomeQuietDayRead`, which built the lead and the quiet-day line, are
  deleted.
- **The two scores.** On the map's header (the card from `md`, "What would change" below it) and the
  bars in "What changed", at both widths. The picker's "This week's scores" list is gone.
- **The margin.** One trust-strip cell on every reading route: "Margin · Risk appetite 1 pt from
  its change line · Could change next week" (or "Not expected to change next week"), where a fourth
  cell answered "Yes" beside the distance. It always prints on the report intros' phone line. The
  map's "1 point to the nearest change line" caption is gone (`showDistance`).
- **Stage and runway.** The sentence over the controls is gone; each control marks its default
  (`choiceSublabel`, "(default)"), in the tablists from `sm` and the header pills' lists below it.
- **Dates.** The week stays on the picker and "Data as of" on the strip; the trail's caption sits
  under the map. The closing line names the published brief by its week, where "The reading above
  is from Oct 7, 2026. The last frozen record is dated Oct 6, 2026." printed two more dates.
- **Share.** The "Share" section (a heading over one link) is the page's closing line,
  `ShareLinks`; Copy Brief stays under the card. The desktop sticky strip waits for the card to
  leave the screen, as the phone line does.
- **Kept on purpose.** The "Whether · whether.work" caption inside the card: it is what a cropped
  phone screenshot of the live page keeps (the Monday Browser Rendering capture uses the live page
  too, `?screenshot=1`), and the copy-as-image buttons draw their own Satori cards. The "Against
  this week" sentence in "Has this happened before?": it compares two readings and needs both.

**`/history`.** "Cloudy, held 1 month" stays on the intro's stamp and the "Current conditions held"
tile: the band's caption is its date range, and the sentence under the tiles ("Through Sep 30,
2026, month-end conditions had been Cloudy since Sep 30, 2026") is gone. The change count is its
tile's, the reading count its tile's (the published-briefs line no longer prints "177 month-end
readings, Jan 2012 to Sep 2026"), and a "Record starts" tile that repeated the count tiles' window
is gone. "What the margin has been worth" is the study's first sentence (96%) and the link to
`/calibration`, which owns the band table (`ConfidenceRecordSummary`). The intro no longer prints
"Fixed historical snapshot" beside "Historical snapshot" (`nextRefreshLabel` removed).

**Elsewhere.**

| Page | Repeated | Kept |
| --- | --- | --- |
| `/operate/financial`, `/operate/scenarios` | breadcrumb "Decide / Runway planner" under the sub-tab row | sub-tabs; the trail stays as structured data |
| `/operate/financial` | "Runway and burn" paragraph restating the intro | the intro |
| `/operate/scenarios` | "Move either slider…" under the intro that says to move the sliders | the intro |
| `/operate` | "Rules for this week" and an h3 naming the conditions, inside "Rules before you commit" | the step title and the intro's stamp |
| `/comps` | how to use the median, beside the section that says it in full | "Use public multiples in a fundraising discussion" |
| `/signals` | each row's earlier reading under "This week", beside the "56 → 49" chip | the chip |
| `/trust` | the summary under the title; pills to two sections the index names; a revisit row that only linked back up; a second link to `/about#method` | the title, the index, the closing line |
| `/brief/<week>` | "Freezing:" in the heading under the stamp; the week in the caption under the heading; "(week of …)" and "Date-pinned record" over the preview | the stamp, the heading, the share heading |
| `/share` | "PPTX · PDF · SVG" over the three file buttons | the buttons |
| `/answers/*` | the related links beside the top copy button; "Market guidance as of" under the strip's "Data as of" | "Next for…", the strip |
| `/resources` | each answer row's stamp, the same for every row in an area | one stamp beside the area's name |
| `/history/compare` | the intro's status word, Period A's conditions on a two-period page | the period headings |
| `/calibration` | "The record" kicker; the study section's intro restating the page's | the tabs, the page intro |
| `/pricing` | "Cannot be bought yet. A request records…" on each paid card, and again in a "What a request does" section after the buttons that also restated the free promise | one line in the header for Pro and Team together, before any request button |
| `/trust` | "The exact arithmetic is below." over the "Show the exact arithmetic" control | the control |
| `/about` | the structure's healthcare origin in "Who writes it" and again in the folded "Why it works", behind a link to `/about` itself | "Who writes it"; "Why it works" keeps the stakes |
| `/brief/<week>` | "This record is frozen." in the footer, under the header's "This is a frozen record of one week." | the header line; the footer keeps the corrections rule |
| `/history/compare` | the borrowing premium's definition under the difference tile and in both columns, the tile also repeating both columns' values | the definition under the tile; each column prints its value |

### 1.1.64 `/concepts` tests whether advice moves with the conditions (2026-10-09)

The owner's question: advice presented as timeless often changes with the factors Whether measures.
The page now tests one form of it, in its H1 ("Does startup advice follow the market?"): advice on
hiring, raising and spending should track the conditions, and method advice should not. The SEO
title stays "Product Management Reading List, Dated by Market", the phrase people search.

- **One tag per entry.** `stance` is `expand`, `conserve` or `craft`, defined once in
  `lib/adviceStance.ts` with a one-line rubric, so a larger corpus classified on another branch can
  import the same definitions. `stanceBasis` is the line of the argument the tag rests on, quoted
  (15 words at most) or paraphrased, and each entry prints it. The reader's word is "advice" or the
  tag's label; "stance" stays out of reader text (`tests/readerVocabulary.test.tsx`).
- **Eleven capital texts and a second source kind.** `kind: "canon" | "investorMemo"`; a memo meets
  five criteria written in the module comment (public primary source, dated to the month, from a
  venture firm or its founders or partners to founders, a capital prescription, shown to have
  circulated). Memos are described by what they say, with no motive attributed. Added: Graham's
  "Startup = Growth" and "Default Alive or Default Dead?", Agrawal's "The SaaS Adventure" (T2D3),
  Gurley's "On the Road to Recap", Hoffman and Yeh's Blitzscaling, Sequoia's "Coronavirus: The
  Black Swan of 2020" and "Adapting to Endure", Sacks's "The Burn Multiple", Andreessen's "It's Time
  to Build", Lightspeed's "The Upside of a Downturn" and Meta's "Update on Meta's Year of
  Efficiency". Left out, with the reason in the module comment: Sequoia's "R.I.P. Good Times" (no
  primary copy of the slides), YC's 2022 letter (public only as TechCrunch's reproduction), Feld's
  Rule of 40 post (argues both ways), Gurley's "Investors Beware" (addressed to investors), Graham's
  "Founder Mode" (not about capital) and Craft's 2022 slides (no dated primary copy).
- **What the record shows.** The section lead is `describeCanonBaseRate`: the share of Sunny months
  and of Freezing or Stormy months, then the share of Expand texts in Sunny months, of Conserve
  texts in Freezing or Stormy months and of Craft texts in each, a verdict that needs a ten-point
  lean, and how far one text moves a share. On 2026-10-09: Sunny months 59%, Freezing or Stormy
  37%; Expand 3 of 4 in Sunny months (75%); Conserve 5 of 7 in Freezing or Stormy months (71%);
  Craft 55% and 40%. The plane (`app/concepts/advicePlane.tsx`) draws every placed text at its
  scores on /history's plane, with shape for the advice and an sr-only table; the base-rate table
  has one column per tag.
- **Lag and which score** (`lib/productCanonMeasures.ts`). Months from the latest change in
  conditions (median 10.5, range 2–16, 6 of 11 capital texts), from risk appetite's last crossing of
  50 (median 3, range 2–13, 7 of 11) and from funding pressure's last crossing of 70 (8 months, 1 of
  11), each saying why the rest are out. Risk appetite alone sits on the advice's side for 7 of 11
  capital texts and funding pressure alone for 5, printed beside each score's share of all months
  and flagged as too few to rank the two.
- **Same decision, opposite advice.** Four pairs, chosen in both directions: two where the
  conditions differed (T2D3 and Lightspeed on hiring; Blitzscaling and Meta on speed or efficiency)
  and two where they did not (Graham's two essays, both Sunny; Andreessen and Sacks, both April
  2020).
- **What this does not show.** A small, chosen sample; publication is not adoption; memos from the
  same weeks are not independent; co-occurrence is not cause; nothing before the record; tags are
  judgment calls, with the rubric printed. "A reading list, not evidence for the guidance" stays in
  the intro.

The archive's year pages head the section "From the reading list, published in {year}", since a
memo is not product writing. `tests/productCanon.test.ts` holds the tags and bases, the computed
shares against an independent count over the record, the copy against the builders' sentences with
no count typed into the route, the pairs against the list, one H1 and the plane's sr-only table.

### 1.1.65 Decoration that encodes something: generated-design tropes removed (2026-10-09)

The owner approved ten removals after a design audit. The rule (`docs/agents/ui-ux-standards.md`
§XXV): structure and decoration encode something true about the content, and the site spends its
boldness on the conditions chart, the weather glyphs and the line-state glyphs.

| Item | Removed | In its place |
| --- | --- | --- |
| Header emblems | `CalibrationCurveGlyph`, `OperatingLoopGlyph`, `EditorialDeskGlyph`, `SearchRadarGlyph`, `DecisionShieldGlyph`, `ToolkitPlaybookGlyph`, `ValuationMultiplesGlyph`, the operating-loop CSS and `SecondaryPageHeader`'s `aside` slot | the heading alone; `TrendGlyph` and `ThresholdLadder` stay |
| Stat tiles | `/comps`' three tiles; `/history`'s record and grading tiles; the phase map's month tile; the compare premium tile (`StatTile`) | `/comps` leads with the median multiple as one line ("Median EV/revenue: …x") and one sentence for growth, the basket count and the as-of date; elsewhere `FactList` |
| Emoji | 🎯 ⚠️ ✅ 🔄 in the slide paste; ⚠️ ⚡ 👀 in the alert Slack posts; 📬 in the month-end pulse; ✅ 🔄 📦 in the Slack action replies; ⚠️ ✅ on the weekly paste's climate line | the labels alone |
| Ambient decoration | the page's white sheen and emerald-sky-amber wash; gradients, specular and sky inner ring on pills, buttons, inputs and the primary CTA (`--cta-gradient`); the hover halo (`--glow-soft`, `--accent-glow*`); the report intro's regime tint and 3px top rule (`.weather-page-intro`); `ReportSection`'s gradient hairline; the slide's gradients, accent discs and tracked capitals | flat fills from `--bg-raised`, `--bg-nested` and `--cta-fill`; the status word keeps the regime ink; the hero keeps its rule |
| Kickers | "Governance guide", "Operating brief", "For VC firms", "This week's guidance", "Next step", "Governance lexicon", "Team view", "Stage view", "Deeper evidence", "Risk checks", "Whether Legal", "Reading list", "Your decisions" and the unused eyebrow props | facts that were in a kicker move into the heading line: the share page's week, the compare columns' period, "since your last review", Pro as a stamp, "Page not found" |
| Next card | `NextStepCard` on `/signals`, `/operate` and `/trust` (and `InternalAwareLink`) | nothing: each pointed at a header tab or at `/share` |
| Decide's trio | tinted Stop, Start and Keep limited boxes with coloured edges | three plain columns, stacked on a phone, colour on the names |
| Decide's cards | every step a bordered card behind a chevron; the warnings card and the box around each warning | sections under h2s, a rule between; area rules, lists and test open; lines form and finance folded |
| Slide numbering | "1. 2. 3." on Action now, Pause if, Conditions change if | unnumbered sentence-case labels; `cardBody` wrapping unchanged |
| Watermark | "Whether · whether.work" in every report intro | the call card keeps it (§1.1.63), on `/` and on a published week's card, which is the same card for a frozen week |

Card-in-card elsewhere: `/trust`'s watch, escalation, warning and checklist cards and the boxes
inside them are columns under h3s; `/signals` drops the frame around its chart panels; `/history`
drops the frame around the explorer's timeline. The scenario page's Stop and Start lists follow
Decide's.

Measured on the local dev server at 390 and 1280px: the deepest chain of framed or filled boxes in
`<main>`, with colours normalised through a canvas and controls excluded. `/operate` 2 → 1 (the
page intro; 13 boxes → 2 at 390px), `/trust` 2 → 1, `/history` 2 → 1, `/signals` 3 → 2 (a chart
panel and the gauge band inside it), `/` unchanged at 2 from 1280px (the call card and its chart).
`type-eyebrow` went from 150 uses in 65 files to 118 in 55; the rest label table columns, `<dt>`s,
controls, chart panels and navigation, or are headings set in the label style. Gradient
declarations went from 26 to 13: 16 to 8 in `app/styles/` (the skeleton shimmer, the regime
ground, the card sheens and the hub backdrop remain) and 10 to 5 in components and builders (the
scroll and legibility fades remain). Emoji in builder code went from 17 to 0.
`tests/conceptIcons.test.tsx` now fails on any emoji in a share format, the slide, the operator
brief, the investor update, the weekly paste, or the source of any paste, slide, Slack or email
builder. Golden pins moved for slide entries only.

### 1.1.66 The call is scored on the record's inputs (2026-10-09)

The owner's call, after a review: the live weekly call and the historical record must use the same
basis. They did not. The month-end archive behind `/history`, the track record and `/calibration`
scores interest rates, the yield curve, the pace of rate rises and stock-market volatility (its
cache stores a VIX close, the ten daily closes the veto means and the rate-speed pair for every
month). The live call also counted four inputs the archive does not hold: the venture funding pace
and the tech-layoff trend (curated snapshots, `supportsLive: false`), the high-yield spread and the
Chicago Fed index. On the record's inputs September 2026 closed Cloudy; the weekly briefs w38–w41
all read Freezing, and on Oct 7 risk appetite read 49 = 60 on the record's inputs − 11 from the
startup-market inputs. The current Freezing call existed only because of inputs the record cannot
test, while the calibration study's "96% held" and the track record vouched for the other score.

- **The gate** (`engine-2026-10-09`). Only `RECORD_BASIS_MARKET_INPUTS`
  (`lib/regimeEngineDiagnostics.ts`, VIX today) adjust the published scores, so the conditions, the
  machine, the margin, the policy layer's inputs and every area's pause and resume state are
  judged on the record's inputs. Every other market input is still scored, into
  `RegimeScores.offRecord` (the scores with everything counted, which are exactly the previous
  engine's, and which inputs moved them), and moves nothing. `boundaryContributors` and the weak-read
  count list the record's reads only. The audit of every input the engine reads: the BBB spread,
  inflation and unemployment feed only the policy layer's composites, never the scores, the
  conditions or a line, and stay as they were; the four other curated series
  (`SAAS_VALUATION_MULTIPLE`, `EARNINGS_REVISION_INDEX`, `AI_COMPUTE_COST_TREND`,
  `REGULATORY_RISK_TRACKER`) move no score and feed only the forecast and context lines. FRED's
  high-yield series (`BAMLH0A0HYM2`) starts on 2023-10-10, so it can never be backfilled across the
  record; the Chicago Fed index (`NFCI`, from 1971) joined the basis with its backfill (§1.1.67).
  `tests/recordBasis.test.ts` fails if an input on the basis has no value in a cached month.
- **What is still shown.** Each score the inputs left out would move is `ScoringBasis.notCounted`
  (`lib/report/scoringBasis.ts`): under its row in the homepage's "What changed" and on `/signals`
  ("Not counted: -11 from startup-market inputs."), whichever reading the week compares with; under
  "What moved the scores" in the Slack brief; on `/trust`. When they would carry a score past a line
  the published score is not past, that is the warning, in the status strip's basis cell and in the
  Slack brief's "Why this could be wrong": "Startup-market inputs would put risk appetite at 49,
  below its change line." (the Oct 7 reading). The change line is named first, then an area's pause line, then its
  resume line. The score breakdown no longer counts them as a part of any move: the parts are
  rates, the pace of rate rises and volatility, and still add up to the move exactly.
- **The basis label.** One phrase, "Scored on the record's inputs." A reading scored by an earlier
  engine says "Scored on more inputs than the record." (`scoringBasisForEngine`: `engine-2026-10-06`
  and records that name no engine). It is the strip's fourth cell ("Scored on · The record's
  inputs"; routine, so the phone line folds it unless it carries a warning or the extended basis);
  the published brief's card caption and its two pastes, from the engine its record names, so no
  frozen field is edited; `/trust`'s "How the scores are built" (step 3, "Count only what the record
  can test", with what this week's left-out inputs would make the scores, and each formula card
  naming the reads shown and not counted); every paste's provenance line, the slide and deck
  footer, the investor update and portfolio note footer, the operator brief, the Slack brief's
  stamp and the weekly email; and `scoringBasis` in `/api/agent?view=state`, MCP `get_state` and
  `get_brief`, and `/api/scores`, additive, with `key` (`record` | `extended`), `label`, `warning`
  and `notCounted`. A stored operating snapshot names its engine (`engineVersion`); one written
  before has none and reads as the extended basis until the next refresh replaces it.
- **Timing.** The gate takes effect at the next weekly freeze: w42 is the first published week
  scored on the record's inputs, and w31–w41 are never edited (`tests/recordBasis.test.ts` pins
  each byte for byte). The homepage says once, in the strip's basis cell, why its conditions differ
  from the citable published week's when the basis is why (`describeCitableBriefBasis`): the week's
  stored inputs, scored by today's engine, land in other conditions only because of the inputs it
  counted. A conditions-change alert says the same when those inputs would have kept the earlier
  conditions (`describeChangeTheRecordMade`).
- **The live call on current data** (the Oct 7 reading): funding pressure 90, risk appetite 60,
  Cloudy, where the previous engine published Freezing at 49. The machine's state still says
  Freezing, and the nearer line is 10 points away (its Medium gate band), so the first daily
  refresh after deploy holds Freezing with the change waiting on a second reading, and the second
  commits Cloudy. A snapshot is stored per engine (the input hash carries the version), so the
  previous engine's stays readable under its own key.
- **The record does not move in this change.** The archive never scored the four inputs, so no
  archived month, change count or calibration figure changes; the regenerated archive with the
  Chicago Fed index is its own change.

### 1.1.67 The archive scores the Chicago Fed index too (2026-10-09)

The second half of §1.1.66: backfill into the month-end archive every market input the live call
reads that has a long public series, so the record is scored on the same basis as the call
(`engine-2026-10-09b`, `RECORD_BASIS_MARKET_INPUTS` = VIX and `CHICAGO_FCI`).

- **What was backfilled, and from where.** The live engine reads FRED's `NFCI` (weekly, 1971 on;
  `lib/macroSnapshot.ts`, `lib/ingestion/families.ts`), and so does the archive now:
  `fetchArchiveDatasets` fetches it through the shared parser (`parseSeries`, every value through
  `isMissingFredValue`), and `resolveChicagoFciReading` (`scripts/regimeArchiveContext.ts`) gives
  each period the newest observation a reader had then. An observation is dated the Friday its week
  ends and published the Wednesday after, so a period takes the last one dated five or more days
  before it (Mar 31, 2020 reads Mar 20's 0.175, not Mar 27's, published Apr 1); three missed
  releases is an absence. Each Time Machine cache entry stores the value (`chicagoFci`) and the
  observations a reader had in the 60 days before (`chicagoFciHistory`), so the weekly, monthly and
  quarterly archives replay offline from the bundle (`tests/regimeArchiveReplay.test.ts`, which also
  replays twice to the same bytes), and the runtime walk scores it like the live read. A run that
  cannot fetch it fails before writing: an archive without it would be on another basis.
- **Already in the archive before this change**, and verified rather than re-fetched: VIX
  (`VIXCLS`, the close and ten daily closes for every month since 2012) and the rate-speed term
  (the `DGS1MO` pair the engine's own search picks, every month).
- **Not backfillable.** FRED's high-yield series (`BAMLH0A0HYM2`) begins 2023-10-10 under ICE's
  licensing, 36 of 177 month-ends; it stays off the record basis, scored and shown only. The venture
  funding pace and the tech-layoff trend are curated snapshots with no history.
- **Limit.** FRED serves the index's current vintage, and the Chicago Fed re-estimates the whole
  series each week, so a backfilled value can differ slightly from what was printed at the time.
  Above zero is the only range that moves a score, and since 2012 the index was above zero only in
  March to May 2020.
- **Regenerated.** `generateMonthlySummaries.ts`, `generateWeeklySummaries.ts` and
  `generateQuarterlyYearlySummaries.ts`, then `bun run archive:index`: the Time Machine cache, the
  summary archive (all four cadences), the monthly and weekly summary files, the month-rail and
  memory-rail histories, the confidence-record months and the `/history/[period]` index. Two
  independent runs matched except for their generation timestamps. Published briefs are untouched
  (`tests/recordBasis.test.ts` pins w31–w41 byte for byte).

**The diff, honestly.**

| Figure | Before (`engine-2026-10-06` archive) | After (`engine-2026-10-09b`) |
| --- | --- | --- |
| Months whose conditions changed | — | none |
| Months whose scores changed | — | Mar 2020 and Apr 2020: funding pressure 0 → 2 (the index at 0.175 and 0.159); risk appetite unchanged |
| Changes in conditions since Jan 2012 | 7 | 7 |
| Calibration: held / comparisons | 169 / 176 (96%) | 169 / 176 (96%); every band unchanged |
| Signaled in advance (last 60 months) | 2 of 5 | 2 of 5 |
| September 2026 month-end | Cloudy (90 / 56) | Cloudy (90 / 56) |

The September month-end still disagrees with the published weeks w38–w41, which read Freezing:
those were scored on more inputs than the record, and frozen weeks are never edited. On the record's
basis the one of them that stored its inputs, w41, reads Cloudy (90 / 59) and agrees; w38–w40 stored
no inputs to re-score. Every other line of the archive diff is the regeneration itself: fetch
timestamps, the engine stamp, the reader copy merged since the last regeneration on 2026-10-07 (the
margin vocabulary, "Pause line" and "Resume line"), Q3 2026 added to the period index and the OG
timeline, and the week ending Oct 9, 2026 added to the weekly archive (Cloudy, record date Oct 7).

`/calibration` and `/history`'s "How the record held up" each say when the record was re-scored and
with what, and point at their figures as the ones published before it while those are unchanged
(`describeCalibrationRescore`, `describeTrackRecordRescore` in `lib/report/trackRecordCopy.ts`);
once a figure differs, the line prints the old one.

### 1.1.68 Candidate rate ramps, scored beside each reading and used for nothing (2026-10-09)

The funding-pressure rate component spends its 0–90 points across 3.5% to 4.0% on the one-month
bill. `docs/research/premise-test-preregistration.md` registered three alternatives and the rule
that would replace the current ramp with one of them; `docs/research/premise-test-results.md`
reports the test, and the rule kept the current ramp.

- **Shadow scoring.** `refreshOperatingState` builds the reading, then scores the three candidates
  (`scoreShadowRamps`, `lib/research/shadowRamps.ts`, on `lib/research/candidateRamps.ts`) and
  stores them on the snapshot as `shadowRamps`: per candidate, the input it read, its rate points,
  funding pressure, risk appetite, conditions, the registered tight flag and its own state-machine
  snapshot, with `usedForGuidance: false` and the registration's path. The assessment and the
  weekly call are built before it and never read it, so no page, paste, send, export or frozen
  brief changes. A scoring failure stores the reading without the field. An export's cold-read
  snapshot (`lib/export/exportSnapshot.ts`) carries none.
- **Threading.** Each candidate's machine state comes from the previous stored snapshot's record.
  With none, it is seeded by replaying the candidate over the bundled month-ends from January 2022
  (the first month whose ten-year percentile window the bundle holds), which reaches the same state
  as the full 2012 replay (`tests/shadowRamps.test.ts`).
- **Parity.** With the current ramp, `candidateRamps` reproduces the published month-end record for
  every month (`tests/candidateRamps.test.ts`); Invariant 12 lists it with the engine modules.
- **On `/trust`.** One line under "How the scores are built" says the alternatives are being
  tested and set no guidance, linking the registration and the results
  (`tests/trustRampTestNote.test.tsx`). Both are served from this site as plain text, at
  `/research/premise-test-registration.md` and `/research/premise-test-results.md`, because the
  repository is private and its GitHub copies are a 404 for readers. The routes serve
  `lib/research/premiseTestDocs.ts`, which `scripts/research/publishResearchDocs.ts` builds from
  `docs/research/`; `tests/premiseTestDocs.test.ts` fails when the two differ.

### 1.1.69 The Synoptic palette (2026-10-09)

The owner chose Synoptic from the three directions in `docs/design/palette-directions.md` (PR
#1566). This applies its colours and keeps the shipped type (Archivo, Chivo Mono). The rules are in
`docs/agents/ui-ux-standards.md` §XVI; the values live in `app/styles/tokens.css`.

**What colour means.** Two things and nothing else: the four conditions, and where a line stands.
Everything else is ink, including links, buttons and focus rings (links keep their underline).

| Role | Dark (default) | Light |
| --- | --- | --- |
| Ground / panel | night chart `#0f1316` / `#171c20` | chart paper `#f1f4f3` / `#ffffff` |
| Ink / secondary / muted | `#edf0ee` / `#cdd3d1` / `#a0a9a7` | `#121719` / `#384145` / `#525c60` |
| Line crossed or close: text / mark | `#f2685c` / `#e5484d` | `#b4232a` / `#d13b37` |
| Line clear | the ink | the ink |
| Condition fill (both themes) | Sunny `#d9a82c`, Cloudy `#9d7a4a`, Stormy `#8f96e0`, Freezing `#3a6fa3` | the same |
| Condition ink | `#f5cf5a`, `#d6b98a`, `#b9bfff`, `#8cc0ec` | `#7a5800`, `#74552a`, `#4a4fc0`, `#1d5585` |

**Conditions.** Warm is risk appetite on (Sunny, Cloudy) and cool is off (Stormy, Freezing); light
is cheap money (Sunny, Stormy) and dense is dear (Cloudy, Freezing). One set of four fills serves
both themes: `REGIME_HEX_COLORS`, the data-regime map and the `bg-condition-*` utilities, which
`tests/regimeColourContract.test.tsx` holds together. Each fill sits midway between the direction's
light and dark values. Sunny and Freezing, the best and worst conditions, were emerald and rose,
5.6 apart for a deuteranope (OKLab ×100, Machado 2009 at full severity); they are 34.6 apart now,
and the closest pair under either red-green deficiency is Stormy–Freezing at 16.8 and 15.4.

**Line states are their own tokens** (`--line-*`, `text-line-crossed-fg`, `text-line-clear-fg`). A
cleared line printed in Sunny's green and a crossed one in Cloudy's amber, so a state read as a
condition. The caution, tightening and easing families now alias the line states, so every consumer
of them moved at once: Stop and a pause line are the front red, Start and a resume line the ink,
Keep limited the secondary ink. The radar's corner words read the condition inks.

**The stock hue ramps are folded onto roles.** About 630 class names say emerald, amber, rose, sky or
cyan, and none meant the hue. In `tokens.css` emerald is the clear ink, amber and rose the front red
(amber at half strength as a fill, so a two-step scale keeps two steps), and sky and cyan the action
ink. Conditions never draw from these. The light theme's per-hue `!important` patches are gone,
because the roles carry their own light values.

**Hard-coded surfaces.** The OG cards, the image card, the meeting slide (SVG and HTML), the board
deck, the weekly email, the alert and month-end emails, the embed and its loader read
`lib/image/ogTheme.ts`, which mirrors the dark theme and adds the line-state reds and the condition
inks (`OG_CONDITION_INK`). The slide's and the deck's condition badge was rose for Cloudy and
Freezing and green otherwise, so a Stormy slide wore Sunny's badge; it is the condition's own
colour now. The static OG templates' six category hues are the ink. The rates chart on `/signals`
tells its four terms apart by ink and dash. Print rules take the light theme's values.

**Default theme.** Unchanged: dark, as the direction's recommendation says for the first
application. The bootstrap reads only the stored preference (no system preference is consulted), and
the toggle is unchanged. Making light the default is one line in `buildThemeBootstrapScript`.

**Measured.** Every text role, condition ink and line-state ink clears 4.5:1 on its ground and panel
in both themes; the lowest is the light muted ink at 6.2:1. The band's glyph (black at 70%) clears
3:1 on every fill, Freezing lowest at 3.1. As marks on the light ground, Sunny's fill is 2.0:1 and
Stormy's 2.5:1, as Sunny's (2.4) and Cloudy's (2.0) were before: no condition fill carries meaning
alone, since each sits beside its glyph and its word. The golden pins moved for the slide HTML, the
slide SVG and the deck's hash only.

Before and after, at 390 and 1280px, in both themes and in greyscale, with the OG card, the slide
and the weekly email: `docs/assets/palette-directions/applied-*.jpg`. The week differs between the
two captures because §1.1.66 re-scored it in between (Freezing before, Cloudy after).

Left on the old palette: the brand mark (`public/favicon*.svg`, `icon*.svg`, `whether-logo.svg`,
`app/brandAssets.ts` and the raster icons), which is its own decision, and
`scripts/generate-scenes.ts`, which renders marketing scenes and nothing on the site.

### 1.1.70 The record's charts and sentences state what the data shows (2026-10-09)

The first PR of the copy and data-viz plan. Two of its four items had already shipped by the time it
was built: #1569 gave the slide exports one colour per condition, and #1567 removed the calibration
curve drawn from four hard-coded points.

- **The margin's reliability chart** (`MarginReliabilityChart`, `app/components/history/confidenceRecord.tsx`).
  `/calibration` stated its finding ("every band below held more often than the percent published")
  in prose and a table. The chart draws each band's published percent against how often conditions
  held, one dot per band sized by its months, on the line where the two are equal, so the finding is
  every dot above the line. It reads the rows the table prints (`toRows`, one derivation for both),
  draws nothing without them, and names each dot on hover; the table stays the accessible form.
  `tests/marginReliabilityChart.test.tsx` holds dots to rows, and fails the day the archive stops
  bearing out the paragraph's fixed claim.
- **One orientation for the conditions map.** `/trust`'s quadrant (`RegimeQuadrant`,
  `app/trust/formulaReference.tsx`) put funding pressure across and risk appetite up, so its Sunny sat
  where the brief's map has Freezing. It now runs risk appetite across and funding pressure up, as
  `RegimeRadar` and `/history`'s phase map do; `tests/formulaReferenceVisuals.test.tsx` renders both
  maps and checks Freezing sits left of and above Sunny in each.
- **A held week names no week it did not compare.** "Last week's guidance stands." closed every held
  week, including one compared with a month-end weeks back. `describeGuidanceStands`
  (`lib/report/comparisonBasis.ts`) says "The guidance stands." after a dated "since Sep 15", and keeps
  "Last week's guidance stands." where the comparison is undated. It closes the movement sentence
  (`decisionMovement.ts`), the narrative summary (`decisionNarrative.ts`) and the returning-reader
  fallback (`historyAndContext.ts`); seven pinned pastes in `briefFormats.golden.json` changed by that
  sentence alone.

### 1.1.71 Generated sentences say each thing once, in order of weight (2026-10-12)

The second PR of the copy and data-viz plan.

- **Held areas share one sentence.** `buildDecisionMovement` returns `heldGroups`: the areas that
  held, grouped by the side of their lines they held on, each group one sentence ("Pause still
  applies to Hiring, Fundraising, Spending and New bets: no line crossed since Sep 30."). The folded
  "All five areas" table (`AllAreaRules`) prints a group of two or more once over the table and drops
  it from those rows, so the area the week moved is the one "Changed" cell left. The picker, which
  shows one area at a time, keeps each area's own sentence. Closes DD-039's open item.
- **A score's move reads largest part first** (`clausesFor`, `lib/report/scoreMovement.ts`): "-11
  from startup-market inputs and -2 from the yield curve", not the scoring stages' order. The net
  move is the delta chip beside the row, so the sentence does not repeat it.
- **Drift and a dead field.** `whyItMattersLine` was computed on every card model and rendered
  nowhere; it is deleted with `buildWhyItMattersLine`. The share preview's fallback no longer says
  "posture", and `docs/editorial-guardrails.md` names `REGIME_LABELS`, the one label table, instead
  of an alias that no longer exists.

The planned sentence-quality gate is not added: `tests/onePlacePerFact.test.tsx` and
`tests/readerClauseShapes.test.tsx` (2026-10-09) already hold the repetition and clause shapes it
would have checked, and a prototype over the pinned pastes found its "same sentence twice" rule
mostly flagged rows for different areas that rightly share a line.

`tests/decisionMovement.test.ts` and `tests/allAreaRulesHeldGroups.test.tsx` hold the grouping.

### 1.1.72 /history's charts say where the line is (2026-10-12)

- **The trend charts draw the change line.** `HistoricalTrendChart` takes `changeLine`: the chart
  then draws on the score's own 0–100 scale with the line dashed across it, 80px tall instead of
  32px. Autoscaled, a 4-point wobble near the line and a 40-point swing far from it filled the same
  height, so the shape could not say how close a score had come to changing conditions. Without
  `changeLine` the chart autoscales as before.
- **The month stripe names both scores.** `MonthStrip` entries may carry the two scores; a month's
  hover title then reads "Sep 2026: Cloudy · Funding pressure 90, Risk appetite 56".

`tests/chartIntegrityContract.test.tsx` and `tests/visualPrimitives.test.tsx` hold them.

### 1.1.73 Engineering work against the payback bar, in the runway planner (2026-10-13)

The runway planner (`/operate/financial`) checks the reader's own engineering projects against the
payback bar the published rules already set. It does not add a bar of its own
(`lib/report/projectPayback.ts`):

- **The bar.**
  - Under six months of runway, the cash gate holds every new commitment.
  - With 6–12 months, every commitment needs a payback inside `TIGHT_RUNWAY_PAYBACK_BAR_MONTHS` (6).
  - Otherwise, outside Sunny, the Product tempo rule slows work that pays back in more than a year
    (`ROADMAP_PAYBACK_BAR_MONTHS`, 12; `tests/projectPayback.test.tsx` holds the number to the rule's
    sentence).
  - In Sunny, with a year or more of runway, there is no bar on roadmap work.
- **A project.**
  - Cost: weeks to ship × engineers × what an engineer-week costs.
  - Saving: hours it saves a month × what one of those hours costs, plus bills it cuts.
  - Each row prints a sentence: the break-even month, the bar it clears or misses, and what lifts
    that bar. Work that saves no cash is told it has no payback to check and has to be argued on
    revenue or retention.
  - Once the work ships, the saving lowers net burn. The sentence says how much runway that adds, at
    today's net burn with revenue flat. When the added runway moves the reader into a band with a
    different bar, it says that too.
  - Engineer time counts toward the payback but not the runway, because the engineers are paid
    either way.
- **The chart.**
  - One strip per project on one month scale: building, paying back, and a dot at the break-even,
    filled when it clears the bar (`app/operate/components/projectPaybackChart.tsx`).
  - The bar and the cash-out month cross every strip.
  - HTML positioned by percent, like the planner's `RangeBar`, so the labels stay page text at
    phone width.
- **Where it lives.**
  - The engineer-week cost and up to four project rows are in the operator profile.
  - They travel with the plan link as `engWeek` and one `project=weeks_engineers_hours_hourly_other_name`
    per row (`app/operate/components/runwayPlanLink.ts`).
  - The bar sentence and each project's sentence go into the copy block and the budget memo.
- **Edits stand until the address bar catches up.**
  - The panel reads its plan back from the link, and `router.replace` lands a server round trip
    after each edit. A second field typed inside that trip was built on the older link and wrote
    the first field back to its old value.
  - The panel now keeps its own last edit until the bar shows that edit's address
    (`plannerEditStands`). An address it never wrote is someone else's link, which wins as before.

Why: a set of essays argued that "product craft" has to be justified as cost removed once the
person who pays is not the person who uses the product, and priced that with a discount rate. At a
22% hurdle, a project that breaks even inside two years does so about a month later than
undiscounted. The rules' bars move by six months with runway and conditions, so the planner draws
the bar.

### 1.1.75 `/concepts` counts every post, not only the famous ones (2026-10-13)

The curated list in §1.1.64 tags texts chosen for being widely read, and its own limits say a
systematic sample could lean differently. This is that sample: a pre-registered corpus study of
every dated post in twelve archives from ten venture firms, January 2012 to September 2026, asking
whether advice to founders moves with funding pressure and risk appetite.

- **Registered first.** `docs/research/advice-corpus-preregistration.md` was the branch's first
  commit, before any post was fetched for its text: hypotheses H1–H5, sources and exclusions, the
  rubric (the prompt's SHA-256, which `tests/adviceCorpusRubric.test.ts` holds the code to), the
  analysis plan, and what would count against each hypothesis. Seven deviations are recorded in its
  §11, among them the rubric revision the validation forced (D4).
- **Pipeline** (`scripts/advice-corpus/`, `bun run advice-corpus:*`). robots.txt first, one queue
  per host at most once a second, a descriptive User-Agent; raw pages and text cached in the
  gitignored `.cache/advice-corpus/`. A keyword-and-embedding prefilter picks what the local model
  reads, plus a seeded 10% of the rest to measure what it misses. Labels come from the local model
  (named in the documents); the hand labels that validate them and the analysis are frontier work.
- **Data.** `data/advice-corpus/posts.json` holds derived metadata for every classified post (no
  text; quotes of 15 words at most). `monthly.json` is generated from it alone (firm-weighted shares
  by month, quarter and funding-pressure era); `tests/adviceCorpusData.test.ts` runs
  `bun run advice-corpus:check`, so the two cannot drift.
- **The section** (`app/concepts/adviceCorpusSection.tsx`), after "What the record shows" on `/concepts`: quarterly
  expand and conserve shares under quarterly funding pressure, two panels on one time axis, the seven
  changes in conditions as vertical rules named in the caption, an sr-only table of every quarter,
  and a native tooltip per quarter. Shares come from `monthly.json`; funding pressure and the
  changes come from the month-end record at render, so the chart cannot disagree with `/history`.
  The two series are ink and dashed ink, not hues: every hue on the site already names a set of
  conditions or a line state.
- **Documents served from the site.** The repository is private, so the pre-registration and the
  results are served as plain text at `/research/advice-corpus-preregistration.md` and
  `/research/advice-corpus-results.md`, from `lib/research/adviceCorpusDocs.ts`.
  `scripts/research/publishResearchDocs.ts` (renamed from `publishPremiseTestDocs.ts`, now one
  registry for both studies) builds it; `tests/adviceCorpusDocs.test.ts` fails when it and
  `docs/research/` differ.
- **One stance vocabulary.** `lib/adviceStance.ts` keeps the reading list's one-liners and adds each
  stance's registered corpus wording (`corpusDefinition`), so both import one module. The known
  difference is written there: the one-liner puts "focus" under conserve; the corpus has no word
  for it.
- **What it found** (`docs/research/advice-corpus-results.md`). 8,777 posts in the corpus, 2,598
  classified, 407 capital-relevant and addressed to founders. H1 (less expansion advice when funding
  pressure is above its line), H2 (more conservation advice after the July 2022 crossing) and H3
  (stance follows funding pressure more than risk appetite) count against; H4 (craft does not move)
  is inconclusive; H5 (metrics) shows no shift. Stance labels agree with the reviewer at kappa 0.523,
  below the registered 0.6, so every verdict is stated as resting on them. The section prints the
  era shares from `monthly.json` and those limits; the curated list's "A small, chosen sample" limit
  now points at it.
### 1.1.76 What a market move means at the reader's scale (2026-10-13)

A reader who hears "the Fed cut rates" or "the curve flattened" has nothing on the page to hold the
headline against: the change lines are exact and, to most readers, unreadable sizes. Three sentences
answer the questions that headline raises in the reader's own terms. None adds a vocabulary, a
popover or a forecast.

- **How big the move is** (`lib/report/marketMoveScale.ts`). Each market move in the "In
  interest-rate terms" fold gets a second line: for the short rate, how it compares with a
  quarter-point Fed move ("Less than one quarter-point Fed move."), and for both inputs, how many of
  the month-to-month changes since 2012 moved that far ("The rate moved that far in one month in 18
  of the 176 months on record."). A count, not a median: the bill sat at zero from 2012 to 2015 and
  moves in Fed steps since, so its median month was 0.03 and every distance read as many months.
  The federal funds rate has no month-end series and gets the Fed comparison alone; the curve, which
  the Fed does not set, gets the count alone.
- **How long these conditions lasted before** (`describeSpellLengths`, `lib/report/lastTimeCallChanged.ts`),
  under "Has this happened before?" on every live week. The earlier spells of this week's conditions
  and their length in month-ends ("The one earlier Freezing spell on record ran 32 month-ends, Sep
  2022 to Apr 2025."), the shortest spell of any conditions, and, with a chosen runway band whose
  top every earlier spell outlasted, that it did. The spell the record ends in is left out while it
  is still running. The record has seven spells, so it counts them and says it is not a forecast.
- **Whether the market can move the payback bar** (`describeWhatMovesPaybackBar`,
  `lib/report/projectPayback.ts`), under the bar's sentence in the runway planner. Under a year of
  runway the bar is cash's, and the sentence says no rate move or headline lifts it. Otherwise it is
  the roadmap rule's, and the sentence names the score moves still needed for Sunny in the change
  lines' numbers, with today's scores, and how many of the reader's projects that would stop slowing.
  In Sunny it says what would bring the 12-month bar back and how many projects would then miss it.

`tests/marketMoveScale.test.ts`, `tests/spellLengths.test.ts` and `tests/projectPayback.test.tsx`
hold them.

### 1.2 Evidence report (/signals)
The evidence report is the appendix behind the weekly brief. Since 2026-10-06 it has three sections,
in the order a reader asks:

- **What changed.** One table of every signal: from → to, its line, and why it matters. The focus
  filters narrow it and travel in the URL.
- **What would change this guidance.** The two score ladders with their Pause if and Resume when lines.
- **Deeper evidence.** Seven instruments, each a closed disclosure titled with its question: What are
  interest rates doing? · Has the yield curve inverted in the last year? · How have the two scores
  moved this year? · What would conditions be with different lines? · What did the brief say in an
  earlier month? · Which past cycle looks most like this one? · Which habits from the zero-rate
  years still shape your company? Since 2026-10-07 each summary carries its answer after the
  question (§1.1.45).

The page used to open on "What this means now", the brief's call restated under the shell's own
stamp, and the charts disclosure opened by default: about 2,000px of charts before the other five
instruments. The call stays on the brief. Links that targeted `#decision-summary` (search, and the
month picker's "Back to this week") land on `#what-changed`. `?advanced=1` still opens the month
picker, `?fossil=1` the fossil record, and threshold parameters the line settings.

The inversion preview shows a labeled zero line, time anchors, direct end labels, and visible
breaks when monthly spread reads are missing. The deeper yield-curve diagnostics now direct-label multi-series lines, preserve gaps
instead of connecting through missing data, and encode scatterplot recency through a chronological
path plus a highlighted latest point.

### 1.3 Plan overview (/operate)
Planning is the detailed execution page behind the brief (`app/operate/planningPageModel.ts`).
Since 2026-10-07 (§1.1.46) its steps run: This week's rule for each area, Rules before you commit
and Test a decision (the three always open, with no toggle), Set this plan's lines (§1.1.31; live
weeks only, and left out when no rule has a numeric line) and Finance strategy (both folded), with
"Warnings to read before you approve" after them; the Share step left on 2026-10-08 (§1.0a). Since
§1.1.65 the steps are sections under h2s with a rule between them, not cards. A deep link opens its
step without closing the others, and retired section hashes map onto the step that replaced them
(`hashAliases`).

The page ends on its warnings; `/share` is the header's "Use it elsewhere" and the footer's (the
next-step card went in §1.1.65). It no longer carries a share step, alert delivery controls, Decision
Memory recall (§8.4) or the operator-request list (§1.1.46). The stepper accepts owner and
approval-state fields, and no step sets them (DD-045). (This paragraph used to describe a
mixed-literacy translation model on `/operate` — a top-of-page router to decision, evidence, trust
or share help, plus persisted assist panels. No such router or panel existed; the only trace in the
code was a table of storage keys nothing wrote, deleted in §1.1.14a.)
Shared report-shell routes now avoid stacking a separate trust summary panel ahead of the first task block; trust status stays compressed inside the intro layer unless a route explicitly promotes a deeper trust section.

### 1.4 Planning workstreams
- **Weekly plan** (`/operate`): the steps in §1.3.
- **Runway planner** (`/operate/financial`): burn, raise timing and a memo from the reader's own
  figures (§4.4).
- **Scenario studio** (`/operate/scenarios`): what the plan looks like if the numbers were
  different.

Both render from `app/operate/[workstream]/page.tsx`, which reads `WORKSTREAMS` in
`app/operate/workstreams.ts`.

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
The About page is where the product says what it claims. Since 2026-10-01 it carries, in order:
- **What is new here**: two claims and no more — lines decided before they are needed (each area's
  action, pause line and resume line, set apart), and a record that grades itself (`/history` track
  record, `/calibration`). It says the inputs are not new.
- **Where it fits, and where it does not**: a cadence sentence derived from the archive
  (`describeRecordCadence` over `buildTrackRecord`: conditions changed, and months a pause or resume
  line was crossed, `lineCrossingMonths`), then the decisions it fits (multi-quarter commitments,
  plans a group approves once, venture-backed U.S. companies with one to two years of runway) and
  the ones it does not (single decisions, under six months of runway, funding that does not follow
  U.S. rates, what to build).
- **Who writes it**, with the method's healthcare origin attributed to the editor and linked.
- **What it is built from**, naming only what enters the two scores; inflation and unemployment are
  stated as tracked but unscored.

### 1.6 Trust hub (/trust) and formula reference
`/trust` is the canonical trust-audit hub linked from the Weekly Brief. Its intro carries the trust
strip (record date, sources, confidence, and whether the guidance could change next week). The page
then runs, in order (`app/trust/page.tsx`, §1.1.48): System status (`#trust-snapshot`: the U.S.
baseline the brief starts from and the use boundary), the pipeline's run history when one is
configured, How the scores are built (`#formula-reference`), the source board (`#source-board`),
then the citation, confidence limits, confidence record, revisit triggers and meeting snippet, and
last the thresholds method. Those five sections fold under "Citation, limits and revisit triggers"
on a week with live data and no warning, and are open otherwise. The legacy `/sources` and
`/confidence` entry URLs redirect at the routing layer to `#source-board` and
`#confidence-limits` instead of acting as parallel trust pages. The live weekly call stays on `/`.

`/methodology` now permanently redirects to `/trust#formula-reference`, which documents the sensor methodology and the public data sources used in the report (FRED Treasury series, FRED CPI, FRED labor, FRED credit spreads, FRED VIX, and Chicago Fed NFCI).

The methodology reference also now clarifies scope: the two scores are built from Treasury rates (the one-month bill and the 10Y−2Y slope) with capped stress adjustments (high-yield spread, Chicago Fed index, VIX, venture pace, layoffs). CPI, unemployment and the BBB spread feed the separate policy assessment, not the scores or the conditions. The operating outputs are a translation layer rather than a claim of bespoke precision.
Failure-mode diagnostics are now handled through the Trust and Planning workflows rather than as a standalone indexable library. Planning now exposes compact false-signal checks before guardrail approval so operators can pressure-test the weekly plan without leaving the core loop.

### 1.7 Share-preview assets for canonical hubs
Every route's share preview is a PNG that `/api/og` draws from a template the page names
(`imageParams` in `buildPageMetadata`, `lib/seo.ts`): `signals`, `operations`, `solutions`,
`answers`, `guides`, `method`, `record`, `compare`, `reading` and `report`. A page that names none
gets the `plain` card with its own title and description. The static SVG cards
under `public/social/` were deleted on 2026-09-10, because social unfurlers refuse `image/svg+xml`;
`tests/hubRouteSocialAssets.test.ts` fails if a route declares an SVG `og:image`.

`/resources` is the one secondary hub with a page of its own, listing the governance frameworks and
the decision guides. `/guides` and `/toolkits` redirect (§1.0), and `/answers`
redirects to the direct answers on `/resolve` (`/resolve#direct-answers`) instead of maintaining a
separate hub shell.
`/resolve` owns the stakeholder and stage states behind query-selected panels (`?stakeholder=`, `?stage=`, `?library=`), and supporting libraries are no longer assumed to be indexable by default. Programmatic SEO scope now stays intentionally narrower than the total content footprint: curated answer pages remain indexable only when they map directly to a current operator decision and pass freshness/provenance gates, while supporting utilities, template downloads, and library index pages remain product-accessible but default to noindex and stay out of the sitemap.
`/search` is product-accessible and noindex. It renders the matches on the server and offers the hub the top match belongs to as the first action, rather than forwarding the query there.
`/resolve/team-context` no longer operates as a standalone personalization branch; it redirects into Planning (`/operate#ops-monthly-action-summary`). `/resolve` itself is described in §4.1.
The active answer catalog is now intentionally narrower and keeps only the highest-signal decision-closing pages; retired long-tail slugs redirect to `/resolve#direct-answers`. The active resource-article set is likewise reduced to a focused practical subset: retired long-form briefs redirect to Planning's Share step (`/planning#ops-export-briefs`, which lands on `/operate`), and the remaining guides are listed on `/resources`.

The homepage remains on live `/api/og` generation so the weekly brief preview can stay tied to current data.

The monthly guidance has one home, the Monthly horizon on the brief (`/?cadence=monthly`); the plan's first step links to it rather than carrying a second copy.

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
- One walk (2026-10-06): the runtime replay and all three generators thread the
  engine through `replayRegimeWalk` (`lib/timeMachine/regimeReplay.ts`), and the
  generators' period logic is `scripts/regimeArchiveReplay.ts`.
  `tests/regimeArchiveReplay.test.ts` replays every cadence offline from series
  rebuilt out of the bundled data and holds it to the archive on record.
- Every entry a generator writes carries `engineVersion` (`ENGINE_VERSION`, the
  engine calibration that scored it). It is additive: entries written earlier have
  none, and the archive reader ignores it.
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
- **Macro overlays (boundary calibration)**: the overlays on the record basis
  (`RECORD_BASIS_MARKET_INPUTS`: VIX with its haircut and veto, and the Chicago Fed NFCI) adjust
  tightness/risk appetite before final classification and trigger multi-weak-read warnings. HY OAS,
  VC funding velocity and the tech layoff trend are scored into `scores.offRecord` and move nothing
  published, because the archive holds no month-end history for them (§1.1.66, §1.1.67).

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
- Macro overlays on the record basis modify tightness/risk-appetite scores before classification, so they can change the resulting regime when signals are near boundaries. Overlays off it change only `scores.offRecord` (§1.1.66).
- Diagnostics (`boundaryContributors`, weak-read warnings, confidence) explain *why* adjustments applied.
- Recommendations and constraints always derive from the final classified regime.

The regime assessment includes:
- Current regime label + description
- Tightness and risk appetite scores
- Constraint list for the current regime
- Data warnings when inputs are missing
- Input metadata for provenance display



### 3.4.1 Sector sensitivity overlay (decision translation layer)
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

### 3.4.2 Trust and fallback behavior for missing sector/company context
- Sector query fallback: unknown or empty `?sector` values resolve to canonical fallback `b2b-saas`.
- Missing company-rule payload fallback (interpretation `company` view): render available bounded rules in provided priority order and cap to the top three; if fewer than three exist, render only available rules without blocking the page.
- Trust posture: these fallbacks are translation-layer only and never mutate base regime classification, canonical confidence label, or trigger thresholds.

### 3.5 Policy-spec pilot layer (new)
A policy-alignment pilot now runs **alongside** the legacy regime engine in the assessment payload:
- Versioned policy metadata (`policy-v1`) is emitted for traceability.
- Signal normalization fields include z-score, directional transform, and clipped z-score for base rate, slope, BBB spread, CPI YoY, and unemployment; Treasury signals use the local long-range archive when available, while other policy signals normalize against the available local history window.
- Composite outputs expose `cts` and `ras` values without replacing legacy tightness/risk-appetite outputs yet.
- A refusal state is included when disagreement/volatility/data-gap guards trigger, returning explicit fallback directives (`NO_POSTURE_CHANGE_RECOMMENDED`, `REVERSIBLE_BETS_ONLY`).

This pilot remains additive at the scoring layer, but refusal is now binding at the guidance layer: if the policy layer refuses a posture change, readiness is capped, operator copy shifts to reversible-only execution language, and export/share surfaces must not present the move as a clean posture upgrade or downgrade.

## 4) Decision support tooling

### 4.1 Decisions workstream status
Decisions is an active first-class workflow surface in shipped navigation (`/resolve`,
`app/resolve/page.tsx`). It leads with the direct answers under this week's guidance, each carrying
its lead area's standing and the pause-line count over the list (§1.1.45); two context links
follow, then role, stage, situation and toolkit browsing behind one disclosure. Its next step is the
plan.

The toolkit library is a panel inside that disclosure, filtered by `?toolkitQuery=`
(`app/resolve/components/toolkitLibraryPanels.tsx`). Top-level `/toolkits` redirects to `/`, and
each toolkit keeps its own `/toolkits/[slug]` page.

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
  - highest-likelihood next posture (the top `next90DayProbabilities` value, `lib/report/forecastModel.ts`),
  - crossing-risk label (`low|medium|high`),
  - points-to-threshold distance + momentum direction.
- Runway planner risk messaging uses bounded bands:
  - risk score is clamped to 0–100 with labels `low|moderate|high|critical`,
  - recommendations include explicit raise window, burn adjustment range, and reversal language,
  - posture/regime flips should change urgency and guardrail strictness, not just copy tone.
- Cash, net burn and dates (2026-10-01), for a founder without a finance lead:
  - **Cash in the bank** is a profile figure (`cashUsd`). With spend in, runway is worked out as
    cash ÷ (spend − revenue) by `resolveProfileRunway`, which every reader of runway now goes
    through: the planner, the commitment test, the runway notes, the plan stress test and the band
    cookie. Cash and a typed runway replace each other (`setOperatorProfileField`), a band pick that
    excludes the runway clears whichever stated it, and a shared plan link carries `?cash=` and
    replaces both of the recipient's when it carries either. A link's figure is read whole or not at
    all (money also takes the k/M/B shorthand): `parseFloat` read a hand-edited `?cash=2.1M` as $2.10
    and `?runway=14months` as 14. Revenue at or above spend reads as
    cash-flow positive: no runway, and the planner says so instead of asking for one. That holds
    whichever way the runway was given: a typed runway beside revenue that covers spend used to size
    a full plan and date a cash-out month while the same company with its cash entered was told there
    was no runway to plan against. A cash-flow-positive company sits in the open-ended band (24+ mo,
    `runwayBandForProfileRunway`), and revenue coming to cover spend moves the band cookie there. It
    used to leave the cookie wherever the last burning figure had put it, so cash $600k, then spend
    $200k, then revenue $250k kept `/` saying "With less than 6 months of runway, cash is what limits
    you" and the server scaling the rules to that band, beside "cash is not running down".
  - **One meaning of burn.** `monthlyBurnUsd` is total spend (the planner subtracts revenue from
    it, and its field now says "Monthly spend"). The commitment test, the runway notes' 10%-cut
    arithmetic and the stress test's cash estimate used it as net burn, which overstated runway
    whenever revenue was coming in: 12 months, $200k spend, $150k revenue and a $20k hire printed
    10.9 months left for 8.6. They read `netMonthlyBurnUsd` now, and the stress test receives the
    cash balance it always accepted and was never given. The stress test's form has no revenue box,
    so its sizing line names net burn with both figures ("$50k a month of net burn ($200k spend less
    $150k revenue) × 12 months of runway"); it printed "$50k a month" with $50k on no screen. When
    revenue covers spending it says so and asks for cash in the bank (`companyFinancialProfileFor`
    passes a net burn at or below zero through), where it said "sizing it needs your cash or monthly
    burn" with runway and spend both filled.
  - **Dates and dollars.** `describeRunwayPlanInYourNumbers` restates the plan in calendar months
    and dollars on the planner's cards, its copy block and the budget memo: the month cash runs out,
    the raise window as months, the burn adjustment as dollars of spend and the runway it buys, and
    the gap to the safe band's floor as cash or as a net-burn target. Arithmetic on the plan and the
    reader's figures only; dates wait for hydration so a server render cannot print another month.
    The raise window closes by the month cash runs out at the latest, and opens now when that
    leaves nothing before it (critical risk opened it at months 0–2 whatever the runway, so 1.5
    months of cash read "the window closes around Dec 2026. Cash runs out around Nov 2026."). The
    plan scores the same runway the dated lines print: its floor is a tenth of a month, the
    profile's own, where it was one month, so 0.3 months was scored as 1 and printed as 0.3.
    Months count on the reader's calendar (`formatMonthAfter`): whole months are calendar months,
    with a late day held at the end of a short month, and a fraction is that share of the month
    after by days. It added 30.44-day months in UTC, so Oct 1 plus one month printed "Oct 2026", a
    raise window at months 1–3 printed Oct–Dec, and Jan 30 plus one printed "Mar".
- Own lines, a reachable test, and crossings at the reader's runway (2026-10-02):
  - **Your own runway lines** (`#ops-runway-lines` on the planner): "start raising at" and "pause
    hiring at" a number of months of runway (`raiseAtRunwayMonths`, `hiringPauseAtRunwayMonths` in
    the profile, `?raiseAt=` / `?hirePauseAt=` on the link). Each prints the month it arrives at
    today's net burn, or that it is already here, and travels in the copy block and the memo.
    The company's lines beside the published ones, never in place of them.
  - **The commitment test for a returning reader.** "Test a decision against your runway" is a
    folded disclosure under the area table in "What it changes" (`CommitmentTestDisclosure`), with
    an area select for the runway note. The section folds on a first visit and the picker hides
    once the brief is open, so the two copies are never on screen together.
  - **Burn multiple capped.** The planner's risk score read spend ÷ revenue uncapped, so $1k of
    revenue against $150k of spend scored critical (150x) where the same company with no revenue
    scored moderate (4x). It is capped at the no-revenue 4x now; earning something never scores
    worse than earning nothing, and 20 months at $150k spend and $20k revenue reads a raise in
    months 2–5 rather than "now".
  - **Crossing emails at the reader's runway.** Every company on the published lines is emailed the
    same day a line is crossed. The plan-lines form can send the reader's runway band (a checkbox,
    on by default when a band is set; the band, never a figure), held as `pendingPlanRunway` with
    the lines and promoted with them on confirmation. A crossing email then adds the note this
    guidance carries for that area at that band, or the band's own stance where it has none, and
    dates the band (`describePlanLineCrossing`). New lines without a band clear the old one; the
    confirmation email names the band; `/privacy` 2.1 lists it.
  - **Outcome claims removed.** The analog playbook stated two competitor outcomes with no source
    ("burned 35% of the cash buffer", "shipped faster while competitors stalled"); the agent tool
    description in `/llms.txt` promised "what the winners did" and listed three of the four periods;
    two stakeholder-guide lines promised fewer surprises and avoided cuts. Each now states what was
    done or how to judge, not a result the record cannot show.
- Runway planner inputs are the operator's, or absent (2026-09-06). The panel used to open
  pre-filled with a fictional company (12 months, $700k burn, $450k revenue, 12% monthly growth)
  and offer to copy a board memo built from it; an emptied field became zero and read as
  "critical". Now `lib/report/runwayPlannerInputs.ts` resolves the request from the shared
  operator profile and reports which of runway (or cash), monthly spend, and monthly revenue is missing;
  the panel shows that sentence instead of a verdict until all three are entered. Growth is
  optional and blank reads as flat, which the output says. The memo lists its inputs and no
  longer claims to be "safe for board presentation".
- The `company` and `financial` interpretation views have never received a company profile
  from any caller, so they always describe the built-in default (`lib/report/companyProfile.ts`:
  Series B, $1–10M ARR, 12–18 months of runway). Their summaries now say so and point to the
  runway planner; the copy is the fix, because the assembler runs server-side and cannot see
  the browser-held profile.

## 5) Playbooks, summaries, and briefings

### 5.1 Playbook
The playbook surfaces start/stop/fence actions based on the current regime, sourced from the
insight database in `data/recommendations.ts`. The operator request catalog
(`lib/operatorRequests.ts`), drawn as "Execution asks" under `/operate`'s Share step, was removed
on 2026-10-07 (§1.1.46): it was a product backlog that listed shipped features as not yet built.

### 5.2 Weekly + monthly summaries
Weekly and monthly summaries are generated from the current assessment for use in the overview
page and APIs. These summaries are structured-first payloads (sections + provenance metadata) with
copy blocks rendered from the same structured data for sharing/export.

### 5.3 Briefing exports
Planning briefings support copy-ready briefs and executive narratives with sensor data and
macro context embedded for leadership consumption. `/share` owns the copy formats (Slack, email,
meeting pack, issue tracker, investor update) and the file and image artifacts (board slide as
PPTX and PDF, meeting slide as SVG, brief card as PNG); see §1.1.18.

Interpretation context (homepage-selected `?view=`) no longer travels into the exports. The
Slack, board and citation builders took an optional interpretation block, and the only caller that
passed one was the home assembly's `leadershipArtifactPayloadPromise`, which nothing rendered; the
block went with it (§5.3.1). Nothing renders the selected layer now: the home assembly still
builds it, and no component reads it (§1.0).

#### 5.3.1 One brief document every format renders from (2026-10-06)

Parallel builds of the week that only tests reached were deleted rather than kept for a consumer
that never came:

- `leadershipArtifactPayloadPromise` on the home assembly (`lib/report/home/artifactPayload.ts`),
  which built a second meeting pack, a board note, a "guidance snapshot" and a delta-only brief
  beside the ones `/share` serves. It was the only caller of `buildBoardBrief`,
  `buildWeeklyBoardSnippetPlainText` and `buildWeeklyCallSnapshotPlainText`, which went with it. The
  "delta-only brief in the share rail" in §1.1 was this payload and never rendered.
- `buildWeeklyOperatorBriefPayload` no longer takes the `WeeklyCallContract` as optional. Without one it
  re-derived every slot from the action strip, the posture state and the canonical copy in a
  fallback chain of its own; every production caller passes the contract. Its `flipWatchLine`
  (the nearest crossing in market units) was set only on that branch, so it never printed in a
  production paste; it was removed with the branch.
- `buildWeeklyOperatorBriefSlackBlocks` and `buildWeeklyOperatorBriefCardText`, called only from
  tests.

**The Monday post and the email print one call.** The post's call slots (Guidance, Do now, Pause
if, Resume when, Conditions change if) were derived from the lead area row and
`assessment.description`, while the email read the snapshot's `WeeklyCallContract`, which swaps
in `POLICY_OVERRIDE_CALL` (keyed by refusal reason since §1.1.51) on a held week. So a held week mailed "the guidance is not changing this
week" and posted the lead area's own action and pause line, and an ordinary week posted a
different change line from the one mailed. The post reads the contract now, on the Monday path,
the manual `POST /api/brief/slack/deliver` path and `GET /api/brief/slack`: the pause line as its
condition only (`pauseConditionOnly`, as the email prints it), the lead area's resume line plus a
stage's when one is set, and no resume line on a held call, whose change line is its one resume
line. `tests/mondaySlackMatchesEmail.test.ts` holds the two to the same lines on a held and an
ordinary week.

Every format's output is pinned on four weeks (ordinary, saved copy, held, a stage-and-runway
reader) through its production entry point in `tests/briefFormatsPinned.test.ts`; a change that
means to move a string regenerates `tests/fixtures/briefFormats.golden.json` with
`WHETHER_UPDATE_BRIEF_GOLDEN=1` in the same commit.

**`BriefDocument`** (`lib/report/briefArtifact.ts`) is the week as one object, built once by
`buildBriefDocument(source, weeklyCall, { stage? })` (`lib/report/briefDocument.ts`) from a reading
(`briefSourceFromSnapshot` for the cron's `OperatingSnapshot`, `briefSourceFromReportData` for the
read path) and its `WeeklyCallContract`. It extends `BriefArtifact`, the share rail's object, rather
than sitting beside it; the island a page publishes is its artifact half (`briefArtifactOf`), and
`buildBriefArtifactFromSnapshot` is that half, so /share and /operate publish one derivation. It
carries:

- the call slots from the contract, the pause line as its condition only (`pauseConditionOnly`),
  `resumeWhen` and `callChangesIf` apart, and the policy-override flag;
- the conditions under one label, the contract's `regimeStage` (the weather word, with how long it
  has held when the read path knows);
- the published confidence, resolved once (`resolvePublishedConfidence`);
- provenance: the source as a reader names it, the record date, whether it is a saved copy, and the
  permalink. "Canonical snapshot (FRED)" and "Canonical ingestion (FRED)" name the pipeline; the
  document names the publisher (`publisherSourceLabel`), and the saved-copy marker says the rest;
- the readings, the area rows as the page derives them (each line with its distance), the operating
  limits, and the every-band runway framing the portfolio note prints. The reader's own band is a
  cookie, which a cached page cannot read, so the investor update composes it in the browser.

A `stage` lays that stage over the call as the homepage does (`applyStageToWeeklyCall`), so a held
call stays held whatever the stage.

**The slide is built one way.** It was built from the island in the browser (the share panel's
"Slide" format and "Copy as a slide") and from the operating snapshot on the server (the SVG, PPTX
and PDF routes). The browser's way stood 50 in for a missing risk appetite and "MED" for a missing
confidence, printed the conditions label as the reader's stage ("Stage: Stormy"), handed the weather
word to the badge as if it were the engine key (so a Freezing slide wore Sunny's colour), judged
the scores against the engine's default lines, and printed the flip conditions as the resume line,
which on a held week put "why the guidance is held" under "Resume when". The server's way never
said a reading was a saved copy, and printed a stage's action over a held call. Both now go through
`briefArtifactToSlidePayload`; the routes pass a `BriefDocument` (`buildExportSlidePayload`), and
the island carries the fields the slide reads (`regime`, `recordDate`, `lines`, `stageLabel`,
`sourceLabel`). The island's two scores and its confidence are required: a malformed island
yields no slide rather than a stand-in. The flip conditions print as "Watch this week". §1.1.12's
reading of them as "the resume thresholds" was the mislabel.

**The Slack brief, the board slide bullets and the ticket brief render the document**
(`buildSlackBrief(document)`, `buildBoardSlideBullets(document)`,
`buildIssueTrackerMarkdownBrief(document, format)`), and `ExportLayerOptions` /
`ModeledExportDecisionPayload` are gone. Every Slack caller builds the same document: the Monday
post from the snapshot, and `GET /api/brief/slack`, the manual deliver and
`scripts/generateWeeklySlackBrief.ts` through `buildBriefDocumentFromReport`, under the call the
read path serves every page. The script had passed no options, so `docs/briefs/` printed stand-ins
every week: "Keep last week's approvals as they are; start nothing new." as the action, the no-
reading pause line, and "Live data is back and conditions have held for a week." as the resume
line, on live data. The area rows carry their distances on every path ("(crossed)", "(44 pts
away)", "(already met)"): the snapshot path built them without the scores. Blocks no production
caller reached went with the options: the "This week's guidance" recap (whose "Points from the
change line: 0.0", "Could conditions change next week: no" and "no live reading this week" were
stand-ins on /share's meeting pack, the one place it printed), the historical-analogs block, the
failure-mode warning and the interpretation block.

**The weekly email reads the same document** (`sendWeeklyBrief`): its action, pause line, change
lines, conditions line and readings row come from the snapshot's document, and the readings row
takes the document's confidence instead of resolving its own. Its text did not change.

**The investor update and the portfolio note render the document**
(`buildInvestorUpdateSnippetParts(document, monthlyHistory)`, `buildPortfolioNote(document, areas)`),
and keep their two runway framings: the investor update is one founder's letter, so the browser
composes the reader's band into it (`formatInvestorUpdateSnippet`); the portfolio note goes from one
sender to many companies, so it prints the document's every-band runway. The month-end history
stays the investor update's own input (a letter compares itself with the last one), and the area
lines stay the portfolio note's (the area tables' joined lines). Both close with
`formatSourceFooter`; the month-end pulse mail (`lib/alert/monthEndPulse.ts`) builds the same
document for its block. On a saved-copy week the footer names the publisher, not "Canonical snapshot
(FRED)".

**The integration mandate renders the document** (`buildWeeklyMandatePayload(target, document,
postureState)`, `/api/integrations/weekly-mandate`). It printed the posture state's lock-commitment
line as "Conditions change if" — a different line from the brief's — and its other flip conditions
as "- Resume when:" bullets, one of which ended "tighten again". The markdown now prints the brief's
change line, the resume line the Slack post prints (none on a held week), and the flip conditions as
"Watch this week". The posture state still supplies the last change in conditions and the JSON's
structured `metadata.nextFlip`, which is the posture state's own and can name a different line from
the markdown's. Its invented fallback ("Check again after the next update.") went: the route always
builds a posture state, so the parameter is required.

**/share offers one Slack text and the meeting pack carries it.** The pack pasted the long Monday
post beside the picker's Slack post, under a different call on a held week. Its "SLACK POST"
section is the picker's post now.

**One provenance footer.** `formatSourceFooter` (`lib/export/exportTerms.ts`) prints "Source:
{publisher}, {date}, via whether.work" and "(saved copy, not a live reading)" when it is one. Every
slide format closes with confidence and that footer; the SVG and the deck carry the conditions in
the subtitle instead of the source, and the right-aligned "whether.work" went, since the footer
names it.

**The operator brief and the citations read the document.** `buildWeeklyOperatorBriefPayload(document,
{ date?, weeklyLeadershipSummary?, customTeamNote? })` takes the slots, the conditions line and the
published confidence from the document instead of resolving its own; its payload's `pauseIf` is the
condition only, which is what its plain text already printed. `buildCallCitation` takes the
document's conditions line, confidence and provenance. The answer pages pass the call's
`regimeStage` and the home model's published band, so on a held week their citation names "Sunny",
as every other format does, where it named the home model's "Sunny for 9 months". /share offers one
citation, the picker's (`formatBriefArtifact(document, "citation")`), and the meeting pack's
CITATION section is that one; it carried the answer pages' beside it. The email closes with the
document's source footer and the permanent link instead: the picker's citation prints the island's
call (the do-now line) as "Guidance", under the brief's own "Guidance". `buildBriefPermalinkLine`
went with its last caller.

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

### 5.6 Signal Ops (live)
- Regime alerts are persisted and retrievable through API (`/api/regime-alerts`).
- Alert payloads include reason codes, source URLs, and Time Machine deep links.
- Alert creation enforces trigger filtering and a 24-hour cooldown unless the regime flips again.
- Weekly digest output is available via `/api/weekly-digest`, including score deltas and dominant
  reason messages.
- Alert headlines now name the decision the alert affects rather than the raw signal move:
  `RECONSIDER HIRING` / `WATCH SPENDING` / `RECONSIDER OPERATING POSTURE`, from
  `buildDecisionVerdictHeadline` (`lib/alert/decisionDeltaRules.ts`). Slack blocks
  (`/api/check-regime-change`) and email templates (`lib/alert/alertTemplates.ts`) lead with the
  verdict and keep the raw regime/signal detail as support.

### 5.7 Decision staleness (protect stale decisions)
- Decision Memory records an **assumption snapshot** at write time — the tightness, risk appetite,
  and regime watch lines that had to hold for the decision to make sense
  (`DecisionAssumptionSnapshot` in `lib/decisionMemory.ts`).
- `assessDecisionStaleness` (`lib/report/decisionStaleness.ts`) compares current conditions
  against a recorded snapshot and emits a bounded verdict: **RECONSIDER** (two supporting
  assumptions moved outside the recorded range), **WATCH** (one moved), or **STAND** (all hold).
- The verdicts render on `/decisions` (`app/decisions/page.tsx`, noindex): every entry this browser
  recorded, checked against this week's reading. The brief carries one line for a browser that has
  recorded something (`YourRecordNote`, §1.1.28). `DecisionStalenessPanel`, which ran the same check
  from localStorage below the hero, was retired on 2026-09-08 with the other features that asked the
  reader to keep browser state.
- Decision memory is scoped to one browser, and the surfaces say so (2026-09-06). Identity is a
  random id in localStorage (`whether-client-id`); clearing site data or opening a second device
  starts a new history with no recovery path, and `/decisions` states that scope rather than
  implying an account. The one writer in the app is the Decision Shield's "Record this decision" on
  `/operate` (`app/operate/components/recordDecisionButton.tsx`), through `logDecisionToLedger`
  (`app/components/decisionLedgerClient.ts`); a failed write says so and names the reason.
  `DecisionMemoryButton` and the local mirror (`app/components/decisionMemoryLocalCache.ts`) went
  on 2026-09-08.
- The plan stress test's "Track in Memory" posted `{ kind: "plan-evaluation", … }`, a shape
  `/api/decision-memory` has never accepted, until 2026-09-06, when it moved to a `decision` entry
  built by `buildPlanStressTestMemoryPayload` (`lib/decisionMemory.ts`). The control went on
  2026-09-08; the builder is now reached only from `tests/planStressTestMemoryPayload.test.ts`, and
  the Decision Shield records the plan mode itself (below).
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
- Bootstrapped mode reads the operator's own gross margin (2026-09-26). With the Decision Shield's
  Model set to Bootstrapped (`?model=BOOTSTRAPPED`), the plan stress test shows a "Gross margin (%)"
  field bound to the profile's `grossMarginPct` (optional, 0–100; blank is "not given" and changes
  nothing). At 70% or more a RISKY verdict becomes SAFE and the line beside the verdict
  (`financialImpactSummary`) reads "Bootstrapped with N% gross margin, so tighter funding matters
  less."; under 50% the fragile assumptions add "Gross margin (N%) provides limited buffer if
  customer demand slows." The under-12-months runway rule in Cloudy and Freezing conditions is
  checked first and outranks the margin. Bootstrapped mode also drops the two assumptions about
  outside capital (capital and refinancing staying cheap under elevated funding pressure, investors
  funding fast burn under low risk appetite) (`stressTestDecisionPlan`, `lib/decisionShield.ts`;
  `tests/decisionShield.test.ts`).

## 6) APIs (server routes)

### 6.1 Data APIs
- `GET /api/treasury` — normalized Treasury yield data with fallback support.
- `GET /api/comps` — the SaaS basket's median EV/Revenue and revenue growth, its company count, the
  read's `fetchedAt` and the `source` that answered (`sec-cboe`, `yahoo` or `alpha-vantage`). Cached
  in KV for an hour. 503 `quote_source_unavailable`, with every provider's reason in `detail`, when
  none answers.

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
- Alert email consent is a field on the subscription: `alerts` on `POST /api/email/subscribe`, applied to a confirmed address only once its inbox confirms (§1.1.32). `/api/alert-preferences` was deleted on 2026-09-07 (§1.1.14b).
- `GET /api/alert-deliveries` / `POST /api/alert-deliveries` — delivery logs and send attempts, filterable by `clientId` for per-profile audit views.

### 6.4 Decision audit APIs
- `GET /api/decision-memory` / `POST /api/decision-memory` — append-only Decision Shield audit entries, filterable by `clientId`, with CSV export support.
- Entries carry an `assumptions` snapshot (conditions that had to hold at decision time) so the
  decision-staleness engine can compare current conditions against the recorded range.

### 6.5 Integration APIs
- `GET /api/integrations/weekly-mandate?target=slack|notion|linear` — target-specific weekly
  mandate export payload.

### 6.6 Open Graph
- `GET /api/og` — PNG Open Graph image with regime metadata (supports Time Machine selection); `template=report` is the weekly card.
- `GET /api/image/brief` — the brief card as a 1200×800 PNG: the call, both scores against their pause and resume lines, confidence and source (§1.1.25). Takes the page's `?month=`, `?year=`, `?sector=`, `?stage=` and `?cadence=` context.

### 6.7 Agent access (MCP)
- `GET /api/agent?view=state` — the compact state to decide from (§6.9); `?view=full` (the default) is the whole brief.
- `POST /api/mcp` (no `?tool` param) — **MCP streamable-HTTP transport** (JSON-RPC 2.0,
  protocol 2025-06-18): `initialize`, `ping`, `tools/list`, `tools/call` over
  `application/json` responses. Standard MCP clients can mount `https://whether.work/api/mcp`
  directly. The tools are defined once in `lib/agent/tools.ts`; the transport is `lib/mcp/httpMcpServer.ts`.
- `GET /api/mcp?tool=<name>` — every tool as a plain GET (§6.9); `POST /api/mcp?tool=subscribe` unchanged.
- `bun run mcp:whether` — the local stdio MCP server (`lib/mcp/server.ts`, the one `/api/mcp` runs): the same tools, plus
  `pull_recent_site_info`.

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

### 6.9 One state, one tool registry (2026-09-29)
Agents met the product through four surfaces that disagreed about what Whether says and how to ask.
Changes, all additive except where noted:

- **One confidence.** The full agent payload, the legacy `?tool=get_brief` answer and the RSS item said
  MEDIUM (the engine's confirmation gate) on a week the page, `/api/scores` and the CLI called High. They
  carry the published confidence now. `/api/weekly` and `/api/monthly` (and `/api/cadence`,
  `/api/summary-delta`) followed on 2026-10-06: the summary builders read `resolveSummaryConfidence`
  (`lib/summary/summaryFormatting.ts`, the published label in the stored LOW / MEDIUM / HIGH spelling) for
  both `summary.confidence` and the prose sentence, and the routes pass the record so a stale fallback
  lowers it as it does on the page. The archives regenerate from the same builders, so the next run rewrites
  `summary.confidence`, the confidence sentence in `summary.summary`, `structured.posture.summary[0]`
  (monthly) and `copy` wherever the two ladders disagree: 55 of the 176 monthly entries on record (23 LOW
  and 25 MEDIUM to HIGH, 7 LOW to MEDIUM); the weekly count is not computable offline because weekly
  entries store no scores. One consequence to know: the published ladder ignores the engine's shock
  downgrade, so a shock week's summary now says what the page says (Dec 2025: HIGH, not LOW) and the shock
  sentence beside it carries the warning.
- **The state** (`lib/agentState.ts`, `agentStateSchema`): about a tenth of the full brief. `automation.ready`
  first; each score against its pause, resume and change lines; `perWeek`, and what the move is made of.
  Served at `?view=state`, as MCP `get_state` (with an `outputSchema`) and as `whether state`.
- **One registry** (`lib/agent/tools.ts`) for the remote server, the local server and the GET shim: five
  tools on the local server against twelve remote, under two names, is one list of 13 (plus the local-only
  `pull_recent_site_info`). Read-only annotations on every tool; compact JSON in `content`, the same object
  in `structuredContent` (always an object: `get_decision_rules` for one regime is now `{ "DEFENSIVE": [...] }`
  and was an array, which the SDK client rejected; **breaking** for a caller that read the array).
- **Inputs** (`lib/agent/inputs.ts`, parsed and refused by the generic `lib/agent/registry.ts`): a regime by key or by the site's weather word in any case; empty
  arguments are absent; numbers may be text and zero is a value; unknown arguments and values are refused
  with what would have worked. `get_context` with `SUNNY` answered zero weeks as a success; `?tool=` with
  an unknown name answered the brief with a 200 (now a 400); a cadence the server did not know became
  weekly (now refused). `get_context` and `get_projection` fill what is left out from today's reading and
  say so in `inputs`.
- **Discovery from the registry**: the manifest lists `mcp.tools`, `start` pointers, `views` and the
  `automation` check (it promised "MCP tools" and listed none); `/llms.txt` and `/api-docs` name every tool;
  `tests/agentDiscoveryParity.test.ts` holds each place that names a tool to the registry.
- **`get_context` counts months.** Its counts came from the Time Machine's regime series, one entry per month-end, and were named `weeksActive` / `historicalAvgWeeks`: "8 weeks" was 8 months (§1.1.26, the same period-word defect). They are `monthsActive` / `historicalAvgMonths` now (**breaking** for a caller reading the old names; its only caller in the repo is the tool), with the `latestSnapshot` they run to, and a `note` when the count is 0 because the regime is newer than the last month-end.
- **`get_projection` is direction-aware** (`projectRegimeFromPace`, `lib/report/regimeContext.ts`): it steps
  the scores by their weekly pace and classifies each step with the engine's own quadrant table, so a score
  moving away from its line does not cross it and the regime it lands in is the table's, not a guess. Called
  with no arguments (today's scores at today's pace) the old function reported a crossing within a week
  on the Sep 25 read, when both scores were moving deeper into the regime.
  **Found, not changed:** `getRegimeProjection`, the function it replaced for the tool, still drives the
  alert path (`lib/alert/checkRegimeChange.ts`, "Conditions could change soon" to Slack, and the
  `regime:weeks-to-flip` state), and that path has two defects of its own. The function divides the nearest
  line's distance by the fastest pace whichever way either score moves, and the caller passes it
  `reportDynamics.changedSignals[].delta`, which is the change since the previous *month-end* snapshot
  (§1.1.26), as if it were a weekly pace. Both make the alert early or spurious. What Slack subscribers are
  sent is an owner decision; the fix is to call `projectRegimeFromPace` with the pace `get_state` publishes
  as `perWeek`.
- **Browsers.** `/api/mcp` answers its CORS preflight and carries `Access-Control-Allow-Origin: *` on the JSON-RPC transport and the reads; `?tool=subscribe` stays closed.
- **CLI**: `whether state` (and `--require-ready`, which exits 8 when the data is not live and current); a mistyped command is refused as one (it was answered "too many arguments for 'status'"); `changes` names the dated reading it compares with, uses reader names and says what moved a score.
- **What the change did to the decisions** (§1.1.28): the state carries `change.summary` (one sentence) and `change.crossed` (the areas whose pause or resume state changed since `comparedWith`, grouped by how they moved, with the lines that decided it; empty when none did); `whether changes` prints the same sentence under `DECISIONS`, and the changes contract carries it as `decision`. Additive.

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
`transitionForecast` line were removed from home. `computeTransitionProbability`
(`lib/timeMachine/transitionProbability.ts`) stayed as an internal diagnostic until 2026-09-16,
when it was deleted because only its own test imported it.

### 8.3 Regime history over time (removed Aug 2026)
`app/components/RegimeHistory.tsx` rendered the trailing 24 months of `getMonthlyRegimeHistory()`
as a bar chart in the lower home band. Removed from home; the engine
(`getMonthlyRegimeHistory`, `lib/summary/monthlyRegimeHistory.ts`) stays for evidence/replay
surfaces.

### 8.4 Decision records (canonical: decision memory)
**Location**: `lib/decisionMemory.ts`, `/api/decision-memory`, `app/decisions/page.tsx`,
`app/operate/components/recordDecisionButton.tsx`, `app/components/home/YourRecordNote.tsx`.

The one system of record for "what did we decide and when": server-backed entries keyed by
client id, recorded from the Decision Shield on `/operate`, and listed with their staleness
verdicts on `/decisions` (§5.7). The brief says how many of a browser's decisions rest on conditions
that moved (`YourRecordNote`, §1.1.28). `/operate/memory` redirects to `/history`
(`next.config.js`).

Removed Aug 2026: `VisitorContext` (this section's previous subject) was deleted earlier without
a spec update, and with it the only writer of the `whether_decision_history` localStorage key.
The `DecisionArchive` table on `/history` kept reading that key, so it rendered nothing for every
visitor — it and `useDecisionHistory` are now deleted too. Do not add a second decision-record
store; extend decision memory instead.

### 8.5 Reliability score (removed Aug 2026)
A 0–100 score combining confidence (HIGH=90/MED=60/LOW=30), freshness (live=100/cached=50) and
source coverage, colour-coded emerald ≥80, amber ≥60, rose <60. It was drawn in `BriefHero.tsx`
(deleted 2026-06-10) and later in `DeltaTrustStrip`, and left the product on 2026-08-01. The trust
strip's sources, confidence and record date carry what it summarized.

### 8.6 Degraded-state decision guidance
**Location**: `app/page.tsx`, `resolveDataStatusGuidance` in `lib/report/trustStatus.ts`.

When the reading is a fallback snapshot or a source is degraded, an amber line above the brief
states that data state's guidance, for example "Live data is late. Keep last week's plan; hold new
hires, spend and vendor contracts until it returns." The reliability-score warning this section
first described ("Stage all irreversible decisions until the next clean refresh.") left
`BriefHero.tsx` on 2026-05-23.

### 8.7 Print layout
**Location**: the `@media print` blocks in `app/styles/layout-effects.css` (imported by
`app/styles/layout.css`) and `app/styles/surfaces.css`.

Hides navigation, sidebar, and non-essential chrome. Converts dark theme to light (white bg, dark text). A4 page size with `break-inside: avoid` on cards.

### Demo recording guide
To record GIFs of interactive features:

```bash
bun run dev                                    # Start dev server
```

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
  tripped yet." and carried no threshold at all. It read
  `Funding pressure above 70 (63 today) or risk appetite at or below 50 (56 today).`, and a
  boundary already crossed said "(already true at N)" and sorted first. Since 2026-10-09 it reads
  `Funding pressure rises 7 pts from 63 to clear 70, or risk appetite falls 6 pts from 56 to 50 or below.`;
  a crossed boundary still sorts first, states where the score is, and is followed by its
  reading ("Funding pressure is 75 now.") — §1.1.1c.
- **The Evidence page's "Safe again when" shows the resume trigger.** It rendered `flipThreshold`,
  the condition that *breaks* the call, which `/trust` correctly labels "This recommendation
  breaks if" — so the same string appeared under opposite meanings on two pages. It now reads
  `actionStripItems[0].reversalCondition`, symmetric with the pause trigger in "Wrong if" above it.
  (2026-09-29: both rows now print the canonical slot labels, "Pause if" and "Resume when";
  "Wrong if" / "Safe again when" were a third name for the pair.)
- **The hero's resume row is labeled `clearsWhen`, not `flipWatch`.** That row holds the resume
  thresholds (66 / 54), and sat directly under the reversal row (70 / 50) as a near-synonym
  carrying different numbers, leaving three unexplained pairs stacked in one box.
- **`sectorSensitivity` reversal copy** uses `formatThresholdNumber`, so the sector tilt no longer
  prints "above 70.0".

Archived briefs in `data/published_briefs.json` keep the wording they were published with; the
archive is append-only and its exports are expected to read as they did on the day.

### 1.1.73 Controls read as instrument parts (2026-10-13)

Every segmented control — plan horizon, stage, cash runway, the decision picker, and the ones on
/signals, /operate, /share and the subscribe form — is a recessed well with keys in it
(`docs/agents/ui-ux-standards.md` §XXVI). The chosen key stands proud and lights its lamp, and a
pressed key sinks. Stage and cash runway are ordered scales: a rule with a tick under each key and
a pointer under the chosen one, with Bootstrapped set apart from the funded stages. The company
controls are four equal keys on one row from `sm` up, each label over its sublabel, where they
used to break 2 + 2 and wrap each sublabel mid-phrase. No gradient or specular: §XXV stands.

### 1.1.74 The week stepper and the pickers use the same parts (2026-10-13)

The week stepper on `/` is one well: the earlier and later week are keys at either end of the
calendar picker, and the end with no week beyond it sinks flat instead of drawing a faded box. The
header's stage and runway pickers mark the chosen option with a lit lamp instead of a check over an
action-ink wash, and the calendar's months and known periods are keys that stand proud when chosen.
The three pickers that drew at 95% opacity with nothing blurred behind them are opaque: the page's
text read through them (`docs/agents/ui-ux-standards.md` §XXVI).

