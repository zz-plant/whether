<!-- Part of the feature log. Index: ./README.md -->

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
block went with it (§5.3.1). The layer itself, which the home assembly kept building for no
reader, went on 2026-10-27 (§1.0).

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
if, Restart when, Conditions change if) were derived from the lead area row and
`assessment.description`, while the email read the snapshot's `WeeklyCallContract`, which swaps
in `POLICY_OVERRIDE_CALL` (keyed by refusal reason since §1.1.51) on a held week. So a held week mailed "the guidance is not changing this
week" and posted the lead area's own action and pause line, and an ordinary week posted a
different change line from the one mailed. The post reads the contract now, on the Monday path,
the manual `POST /api/brief/slack/deliver` path and `GET /api/brief/slack`: the pause line as its
condition only (`pauseConditionOnly`, as the email prints it), the lead area's restart line plus a
stage's when one is set, and no restart line on a held call, whose change line is its one resume
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
the scores against the engine's default lines, and printed the flip conditions as the restart line,
which on a held week put "why the guidance is held" under "Restart when". The server's way never
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
as "- Restart when:" bullets, one of which ended "tighten again". The markdown now prints the brief's
change line, the restart line the Slack post prints (none on a held week), and the flip conditions as
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
- **Review responses** (`lib/decisionFollowUp.ts`, 2026-10-23). A WATCH or RECONSIDER row on
  `/decisions` offers "Record your review": the operator records whether they **continued**,
  **changed**, or **deferred** the commitment, with an optional note, against the reading being
  reviewed. Each response is its own per-client, append-only record (`df:` keyspace beside the
  ledger's `dm:`) carrying the current scores at response time, so the review trail is a time
  series of its own — decision conditions, response conditions, the next check. The row shows the
  newest response ("Reviewed against the {date} reading") and re-offers the form until the
  commitment is reviewed against the current reading. A follow-up must name one of the browser's
  own entries or the route refuses it (`unknown-entry`), so an orphan review can never render
  invisibly. The response vocabulary (Continued / Changed / Deferred, with plain sentences) is
  defined once in `decisionRecordView.ts` (`RESPONSE_OPTIONS` / `RESPONSE_SENTENCES`).
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
  outcome; in compare mode it exports both plans, both verdicts, and the recommendation, and
  `Record this decision` is suppressed there — two plans are not one decision, and the ledger
  payload would have been the hidden list mode's verdict, so a plan is recorded by testing it
  on its own (`decisionShieldPanel.tsx`). Both
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
