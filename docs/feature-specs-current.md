# Current feature specs (as built)

This document captures the **implemented** feature set in the repo. It is an audit of what the
product does today, based on shipped UI routes, data loaders, and APIs.

Positioning summary: Whether is an operator briefing system for leadership teams answering three recurring questions: what regime are we in, what should we do now, and which decisions are misaligned with current macro conditions.

Dynamic decision copy follows the same bounded contract across weekly, evidence, trust, export, and monthly-summary surfaces: name the action, measurable pause threshold, and reversal condition. Flat-week fallbacks identify which prior calls remain in force; trust language scopes use of the data rather than substituting generic safety claims; monthly summaries expose structured operating rules instead of relying on phrases such as “use guardrails.”

## 1) Product surfaces (UI routes)

### 1.0 Rationalized IA (one screen + reachable depth)
Primary IA is now a single surface — the **Weekly Brief** — with everything else reachable
as supporting layers, deep links, or URL-driven states of `/`:
- `/` — **Weekly Brief**: the canonical posture, decision delta, and share artifact (the product)
- `/operate` (Plan), `/signals` (Evidence), `/answer` (Resolve), `/trust` (Trust): reachable
  but **supporting**, one click from the brief — not peer routes that invite a second scan
- `/history`, `/history/compare`: supporting archive and scrub/playback

Supporting surfaces are intentionally subordinate:
- `/toolkits` is a supporting instrument library under **Resolve**
- `/learn/failure-modes` is a supporting diagnostic reference under **Trust**
- `/guides`, `/resources/*`, `/answers`, `/solutions/*`, `/concepts`, and `/startup-macro-posture*` remain secondary discovery or distribution surfaces rather than primary workflow hubs
- SEO concentration now favors a smaller authority set: the five primary workflow hubs, a curated subset of high-intent answer pages, and a curated subset of authority resource pages.
- Secondary libraries such as `/guides`, `/toolkits`, `/posture`, most resource utilities, and most answer/detail bridge pages remain available in-product but default to noindex.
- `/guides` and top-level `/toolkits` entry URLs are helper entrypoints under their parent workflow hubs rather than standalone primary destinations
- `/guides` now acts as a compatibility redirect into query-selected translation states on `/answer`, so role and stage translation live inside the canonical Resolve workflow rather than on a parallel library page.
- `/toolkits` now also acts as a compatibility redirect into the query-selected toolkit shortlist on `/answer`, so toolkit search and browse state live inside the canonical Resolve workflow rather than as a standalone library route.
- `/posture` now acts as a compatibility redirect back to the Weekly Brief. Live posture reference no longer ships as a standalone workflow.
- `/search` now acts as a command-only redirect into the next canonical workflow state instead of rendering its own browse surface.
- `/resources` now redirects straight back into Planning's export/artifact checkpoint; deeper governance material still lives on focused `/resources/[slug]` detail pages.
- `/answers`, `/sources`, and `/confidence` no longer ship standalone page implementations; those URLs now permanently redirect to their canonical parent workflow states
- `/guides/stage`, `/guides/[stakeholder]`, `/guides/stage/[stage]`, `/concepts/conflicts`, `/concepts/focus/[focus]`, and `/concepts/audience/[audience]` are retired as standalone implementations and now permanently redirect into canonical hub-selected states on `/guides` or `/concepts`
- `/concepts` and `/learn/failure-modes` now permanently redirect into canonical decision/trust workflows rather than acting as independently indexable content hubs.

The homepage keeps interpretation layers optional and query-driven: the default weekly brief omits interpretation context entirely, and interpretation panels render only when a non-default `?view=` is explicitly selected.

Primary workflow pages now expose a top-of-page scroll path that explains the down-page sequence and highlights the current checkpoint as the operator moves through long surfaces.
Report-shell routes (`/signals`, `/operate`, `/answer`, `/trust` and nested report paths) use a reduced global header mode with one intro block before page-specific content; the homepage now suppresses report-shell header chrome so the weekly card remains the first dominant surface, compact report-shell intros now merge route purpose, trust state, and the first CTA into one priority card, do not inject a default export CTA on non-home routes, and the compact global nav stays quiet by default on mobile behind a collapsed workflow picker.
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
Translation and glossary help remain available, but they now sit behind supporting disclosures instead of occupying the first scan path.
Across deeper workflow, answer, toolkit, trust, and export surfaces, the public-facing decision contract now standardizes on `Current call`, `Action now`, `Pause if`, and `Change course if` as the primary scan labels.
Those four lines now come from one shared weekly-call contract rather than route-local copy assembly, so the homepage card, copy CTA, command bar, and exported operator brief stay aligned on the core call. Shared copy/export artifacts also lead with the canonical Boldness Budget from the weekly leadership summary, with tightness reserved for pause/guardrail conditions.
The weekly brief sequence now favors `Boldness Budget -> current call -> operating levers -> share actions -> route handoff` rather than surfacing deep proof or team translation before the transmission surface.
The homepage global header now keeps the weekly brief calmer: it shows the direct next paths first, while the broader workspace chooser on `/` is tucked behind a collapsed `Browse workspaces` control rather than rendering as an always-open rail.
The lower homepage handoff now renders as a subordinate next-step layer instead of a second equal-weight dashboard band: one compact planning card leads, proof/trust remain visible exception checks, and replay/tool paths sit behind a collapsed optional disclosure with smaller follow-on links rather than a second open card grid.
The collapsed `Route this week's call` disclosure groups the downstream paths into Plan (capital posture, ship call), Resolve (by role, toolkits), Rule (blank decision form, reversal checklist), and Compare (past epochs, full archive), keeping them one expand away from the leading plan card.

The home page now leads with a canonical **What needs reconsideration this week?** block inside
the hero: when signals moved, it lists the bounded decision areas queued for revisit with why each
is queued; it always shows an explicit `No change` lane for the decision areas that are on track,
so the steady state is stated rather than implied. Below-the-fold tool racks (transition
probability, regime history chart, what-if simulators, ticker, source-disagreement, evidence
drawer) were removed from `/` as surfaces that competed with the decision-attention block; their
engines stay internal (see section 8). The only remaining below-fold company context is the
`Your numbers` panel (`CompanyMetricsPanel`) feeding company-adjusted guidance.

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

- **PresentModeButton** (`app/components/PresentModeButton.tsx`): fullscreen focus mode for
  leadership syncs and Zoom meetings. Triggered by the `F` keyboard shortcut or command palette.
  Strips navigation and secondary chrome so the Decision Hero fills the viewport.
- **Bounded-condition rails** (`ThresholdLadder`, fed by `buildBoundedConditionRails` in
  `lib/report/operatingCalls.ts`): one rail per composite signal in the Watch-this-week block,
  showing the current reading, the guardrail, the line that clears it, and the span where neither
  fires. Replaced `ThresholdProximityBar` on 2026-09-03, which encoded the same distance as a fill
  against an arbitrary, unstated 30-point reference and restated the counter beside it. Both lines
  are parsed back out of the guardrail and clears-when copy the block prints, so a rail cannot
  state a threshold the sentence under it does not; copy that will not parse renders no rail.

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
- **Dead capture paths removed.** `useCrossDeviceSync` (no call sites; `/api/sync` stays,
  tested, with no client), `useDecisionHistory` + the history page's "Decision archive" (nothing
  ever wrote the key it read), `lib/report/companyMetrics.ts` and `lib/sensitivityCoefficient.ts`
  (no product callers), and the unused entries in `lib/storage/keys.ts`.
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

- **`/template` folded into `/threshold`.** `/threshold` explained the bounded-decision framework —
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

### 1.5 Home and glossary support (`/`, `/trust#beginner-glossary`)
The homepage is the only canonical first-time and returning weekly workspace. Plain-English
glossary support lives under the Trust hub so operators can pull term translation without leaving
the weekly brief flow. The glossary now explicitly translates U.S. market and Treasury language for
the product's primary user base instead of assuming macro fluency.

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
- `/answer`
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
`/answer/team-context` no longer operates as a standalone personalization branch; it now redirects into Planning, and the home unresolved-utility fallback is the ship checklist rather than a separate company-profile workflow. `/answer` itself now leads with one best-next-step path, keeps alternate answers and translation paths behind a lower-emphasis disclosure by default, and uses a smaller fallback chooser after that; team/stage views and tool depth stay hidden until explicitly selected.
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
Decisions is an active first-class workflow surface in shipped navigation (`/answer`) with an
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
macro context embedded for leadership consumption.

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
- The hero's canonical revisit block now reads **What needs reconsideration this week?** with an
  explicit `No change` lane listing decision areas that are on track.

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

### 6.8 Alert cadence (2026-08-11)
Both crons now evaluate bounded-rule tripwires after ingest: the daily 02:00 UTC run calls
`/api/check-regime-change` and `/api/alert-deliveries` in addition to the Monday run, so a
regime flip or threshold crossing pushes the day it lands instead of waiting up to six days.
Both endpoints are transition-based (KV last-known state: `regime:*`, `alert:state`), so
daily runs stay silent unless something actually crossed. The brief email remains
weekly-only — the cadence promise is weekly; only rule firings break cadence.

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

### 8.4 Decision journal and visitor context
**Location**: `app/components/home/VisitorContext.tsx`, rendered on `/` below the hero.

Stores weekly decisions in localStorage on each visit. On return visits, shows "It's been a few days" or "Last visit: X posture · This week: Y posture" when posture has changed.

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
  week reads "keep proven bets moving, but stage anything new" rather than "freeze new
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
