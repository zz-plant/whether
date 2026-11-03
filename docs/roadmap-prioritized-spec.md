# Roadmap prioritized spec (2026-09-18)

Prioritized, detailed spec for the open items in `ROADMAP.md`. The priority is tied to the
cadence strategy in the roadmap's **Engagement by cadence** section and the repo's decision
framework (one-screen brief → bounded decisions → exports/citation → trust/resilience →
lowest new-system overhead).

**Status (2026-10-29): Tiers 1–3 shipped except T3.5** — T1.1–T1.4, T2.1–T2.5, T3.1–T3.4, and the
kanban flash-as-expedite framing. T3.5 (funnel leak) is a measurement read that needs
`CLOUDFLARE_ACCOUNT_ID` and an analytics read token; Tier 4 stays behind its decisions.

Tier 1 ships next because each item reuses a shipped surface, closes a return loop, and adds no
new product category. Tier 4 is deferred behind a product decision or a stored-secret decision.

## Prioritization

| Tier | Items | Gate |
| --- | --- | --- |
| 1 — Ship next | Quiet-day read, guardrail tags, commitment lint, month-end pulse | Reuses shipped surface; no new category |
| 2 — Next | Board-deck return, pull-policy pause/resume, WIP caps, sharpen delta, planning-window return | Sharper version of a shipped surface |
| 3 — Structural | Standup flip line, sprint-posture recap, board embed, history lapsed magnet, funnel fix | Needs a light new surface or measurement decision |
| 4 — Deferred | Linear/Jira token sync, Notion/Coda embed, M13/M14/M15 expansion | Needs stored-secret or product decision |

## Tier 1 — ship next

### T1.1 Productize the quiet day (DAU)

**Why**: the daily cron already reads inputs daily, but on non-Monday mornings a returning operator
has no reason to open `/` — the flip watch lives only in the hero's Conditions cell. A live "is the
call still standing?" read turns existing cron work into a daily-visit reason without adding
cadence-synced notifications.

**Scope**
- On `/`, render a compact non-Monday state line driven by the daily cron's last read:
  flip distance as a number in the input's units (`lib/report/flipProximity.ts` already computes
  `inputMove`, `pointsToBoundary`, and a `sentence`), plus a `call-unchanged` verdict.
- Only appears when the call has not changed since the last weekly brief; when it has, the existing
  flip-change path already leads.
- Wire it from the same snapshot the hero uses; no new fetch, no new route state.

**Acceptance**: a returning reader on a Tuesday sees "Call unchanged — 0.15% flatter on 10Y−2Y would
change it" without opening any disclosure; the state derives from the hero's existing snapshot.

**Verification**: unit test that the quiet-day line renders from a snapshot whose call equals last
week's and is absent when the call moved; render test on `/`.

### T1.2 Credential-free guardrail tags (sprint grooming + kanban cards)

**Why**: the Linear/Jira sync is deferred on the stored-secret decision. The credential-free fallback
(spec'd in ROADMAP's Active focus item 4) delivers the operator value — posture attached to a work
item — with zero secrets and touches every sprint and every kanban board.

**Scope**
- Extend `lib/export/issueTrackerBrief.ts` (already builds Jira/Linear markdown) with a per-epic
  guardrail block: current posture, `Action now` / `Pause if` / `Change course if` lines for the
  relevant business area, and the numeric flip condition.
- Surface it as a copyable block from `/share`, one per business area, marked "paste into the
  work item description".
- Keep it text-only; no API calls, no stored tokens.

**Acceptance**: an operator copies one block from `/share`, pastes it into a Linear/Jira card, and
the card now carries posture + pause trigger + flip condition with no server-side integration.

**Verification**: unit tests on the block builder; `tests/issueTrackerBrief*`-style coverage.

### T1.3 Commitment lint in planning (sprint ceremonies)

**Why**: `stress_test_plan` and `lint_commitment` already exist in `lib/mcp/httpMcpServer.ts`.
A sprint-goal variant is the same engine at a different granularity: "does this sprint's commitment
hold, pause, or need a reversal guardrail under the current regime?"

**Scope**
- Add an MCP tool (e.g. `lint_sprint_goal`) that takes a sprint goal or story-level plan and returns
  `holds | pauses | needs_reversal_guardrail` plus the specific `boundedDecisionRules.ts` trigger
  that would fire.
- Reuse `stressTestDecisionPlan` internals; no new regime logic.

**Acceptance**: the tool returns a verdict and cites the exact pause/resume condition from
`boundedDecisionRules.ts` for the current regime.

**Verification**: MCP tool test in the existing MCP test file; contract test for the new tool's
schema.

### T1.4 Month-end pulse + investor update regeneration (QAU)

**Why**: the cron already writes `summary:monthly-regime-history`, and
`lib/export/investorUpdateSnippet.ts` already compares against the prior month-end. The missing
piece is a month-end deliverable + notification that returns the operator on their investor letter's
deadline rather than the app's.

**Scope**
- Month-end trigger in the cron that fires the flash pipeline on a month-end cadence instead of an
  intraday one: "call moved vs last month" with the delta.
- Regenerate the investor update at month-end with the prior-month-end comparison (the function
  already exists) and deliver it by email/Slack to subscribers, reusing `subscriberStore` and
  `deliverSlackBrief`.
- The month-end read is not a cadence-synced nag: it fires only when the month-end reading differs
  from the prior month-end, and its payload is the investor update block, not a re-broadcast of the
  Monday brief.

**Acceptance**: a subscriber receives one month-end message containing the investor update block
with the "since prior month-end" delta; no message when the month-end reading matches the prior one.

**Verification**: month-end trigger unit test (fires on month boundary, silent otherwise); investor
update regeneration test against `monthlyRegimeHistory`.

## Tier 2 — next

### T2.1 Board-deck return (QAU)

**Why**: `lib/export/boardSlideDeck.ts` ships, and `classifyReturnGap` (`lib/activationFunnel.ts`)
already buckets return gaps. The missing surface is a return path for a lapsed user that leads with
"your last read was N weeks ago; here's what changed since" plus a fresh board deck.

**Scope**
- When a return is classified `within_month` or `lapsed`, lead the home surface with a
  since-last-visit delta (regime, scores, call, flip proximity) rather than the default hero.
- Offer the board deck download from that same return path.
- No identity joins: the return gap is the existing localStorage week slug, bucketed.

**Acceptance**: a returning reader after 30+ days sees the since-last-visit delta and a one-click
board deck; the view is driven purely by the existing localStorage bucket.

**Verification**: return-gap routing test; render test for the delta-first state.

### T2.2 Pull-policy pause/resume language (kanban)

**Why**: `operatingCalls.ts` already holds pause/resume conditions as structured data
(`pauseConditions`, `resumeConditions`). Kanban teams pull continuously; the same data re-verbed as
pull rules is the kanban-native form.

**Scope**
- Add a kanban-pull rendering of the bounded rules: "stop pulling speculative-class cards when X;
  restart when Y", derived from the existing conditions without new regime logic.
- Surface on `/operate` and as a copyable block on `/share`.

**Acceptance**: a kanban team can copy a pull-policy block whose pause and resume conditions match
`operatingCalls.ts` conditions verbatim.

**Verification**: unit test asserting the pull-policy lines are the same conditions as the pause/
restart lines, reformatted.

### T2.3 WIP caps derived from the regime (kanban)

**Why**: bounded rules already say "avoid parallel expansion programs"
(`boundedDecisionRules.ts:500`). Making it numeric turns the regime into a pull policy.

**Scope**
- A per-regime WIP-cap table (tight regimes lower, expansion regimes higher), expressed as guidance
  ("cap parallel bets at N during DEFENSIVE"), derived from `scaleAdjustmentToRunway`'s banding
  approach.
- Present as copyable guidance on `/share`; no board integration, no WIP tracking.

**Acceptance**: the WIP guidance changes with regime and runway band, and is stated in numeric terms.

**Verification**: unit test across regime × runway band.

### T2.4 Sharpen the delta so the return pays (WAU)

**Why**: `SinceLastVisit`, flip watch, and `ActionsThisWeekCard` are the return-reason stack. The
next step is making "what changed" undeniable on first scan.

**Scope**
- Ensure the score is drawn through its weather and distance-to-flip is stated in the input's units
  on every surface that already carries the call (hero, cadence card, export).
- No new routes; work is in `lib/report/*` formatters and their consumers.

**Acceptance**: a reader can state this week's delta and the flip condition from the first screen.

**Verification**: existing home-brief render tests, extended for any changed copy.

### T2.5 Planning-window returns (QAU)

**Why**: runway bands (<6/6–12/12–24/24+) are quarterly decisions. On a return after a long gap,
re-ask runway and re-derive bounded rules so the planning session gets fresh guardrails.

**Scope**
- On `within_month`/`lapsed` return, re-prompt the runway band (`lib/report/operatorRunway.ts`
  already re-checks the `whether-company-runway` cookie) and show the re-derived bounded rules.

**Acceptance**: a returning user who changes their runway sees the scaled do-now/pause/reversal lines
update without a reload.

**Verification**: runway re-derivation test with the return-path state.

## Tier 3 — structural

### T3.1 Standup flip line (sprint ceremonies)

**Why**: a one-sentence standup input ("Guidance unchanged, 0.08% from flip; no pace change") reuses the
daily cron + `flipProximity.ts` and puts the call at the top of the most frequent ceremony.

**Scope**
- A copyable one-liner from `/` (and optionally the MCP server) derived from the current snapshot
  and flip proximity.

**Acceptance**: the line is true at copy time (not at cron time) and carries the flip distance.

**Verification**: flipProximity-based line test.

### T3.2 Sprint-posture recap + retro violation report

**Status (2026-10-22): Shipped** — `lib/report/sprintRetro.ts` audits logged decisions or candidate commitments against `boundedDecisionRules.ts` pause lines; exposed via MCP tool `audit_sprint_retro`; verified in `tests/sprintRetro.test.ts` and `tests/mcpCommitmentLinter.test.ts`.

**Why**: `lib/events/decisionEventStore.ts` logs decisions. Comparing the sprint's decisions against
the regime's bounded rules surfaces violations ("committed to a speculative build in a DEFENSIVE
regime").

**Scope**
- A comparison view over logged decisions vs the regime's bounded rules, returning mismatches.
- Read-only; no new decision entry surface.

**Acceptance**: a user can see which logged decisions violated the regime's pause conditions.

**Verification**: comparison test over `decisionEventStore` records.

### T3.3 Persistent board embed

**Status**: Shipped (`data-whether-embed="call-strip"` mode in `public/embed.js`, `buildCallStripEmbedHtml` and `buildCallStripEmbedText` in `app/api/embed/route.ts`, format toggle in `app/share/embedBuilder.tsx`, verified in `tests/embedRoute.test.ts`).

**Why**: `embedBuilder.tsx` ships a widget. A compact always-on strip (regime + call + flip distance)
above a board, updating daily from the cron, is the continuous analog of the standup line.

**Scope**
- Extend `public/embed.js` with a `data-whether-embed="call-strip"` mode rendering the call + flip
  distance, refreshed from the same snapshot the hero uses.

**Acceptance**: pasting the snippet into a board header shows a live call strip that updates when the
cron writes a new snapshot.

**Verification**: embed route test for the new mode.

### T3.4 History/compare as the lapsed-user magnet (QAU)

**Status**: Shipped (`SinceLastVisit.tsx` links lapsed visitors to `/history/compare?yearB=...&monthB=...` comparing current conditions against their last visit date; verified in `tests/SinceLastVisit.test.tsx`).

**Why**: `/history/[period]` and Time Machine are pure QAU surfaces (regime at last visit vs today,
score deltas, flip proximity) but are not the return path.

**Scope**
- Link the `within_month`/`lapsed` return state directly to `/history/compare` with the last-visit
  date pre-selected from the localStorage week slug.

**Acceptance**: a lapsed returner lands on a compare view against their last visit without picking a
date.

**Verification**: route/redirect test.

### T3.5 Fix the funnel leak

**Why**: `visited → oriented → committed → returned` is measured
(`lib/activationFunnel.ts`). The biggest WAU win is whichever step is leaking — a measurement
decision, not a feature.

**Scope**
- Query the activation telemetry to find the leaking step, then fund the smallest change that closes
  it. No new surface until the leak is identified.

**Acceptance**: the funnel query identifies one step as the leak with evidence.

**Verification**: analytics query on the activation events.

## Tier 4 — deferred behind a decision

- **Linear/Jira token sync** (ROADMAP Active focus item 4) — superseded for operator value by T1.2;
  the token-bearing path stays deferred on the stored-secret decision.
- **Notion/Coda live embed** (Milestone 12) — defer behind T3.3; a board embed proves the pattern
  before a second embed surface.
- **Milestone 13**: sector overlays, bootstrapped mode, ARR/efficiency benchmarks, talent heat index
  — each is a new calibration axis needing new data; ship T1–T2 return loops before adding axes.
- **Milestone 14**: white-label exports, board pre-read memo, audit-proof export — board-deck return
  (T2.1) is the export proof; the rest follows.
- **Milestone 15**: MCP SDK, Zapier/Make, GitHub Action, VC health matrix, bulk broadcast — platform
  breadth; do not build before the return loops that justify them.

## Drift noted

- **Milestone 7 leftovers** ("Decision Shield expansion not exposed as a primary live route",
  "Saved Decision Shield scenarios/presets not surfaced") are stale: Milestone 10 shipped
  `/operate/scenarios` with presets and the counterfactual studio. *Resolved: both lines in ROADMAP
  Milestone 7 now name the shipped `DecisionShieldPanel` surfaces on `/operate`.*
- **Reforge "Insight Database precedent case studies"** is a content item, not a code item; gate it
  behind the same return-loop proof as Tier 2.