# Claims ledger: what a week says, said once

Added 2026-10-07. Every defect the September and October template sweeps fixed (§1.1.49–§1.1.52 of
`docs/feature-specs-current.md`) was one claim built twice: the same week's change line, guidance, line
distance or comparison date, derived by a second function on a second surface, which then disagreed.
This page lists the claims a week makes. Each has one meaning, one builder and the surfaces that print
it. A test holds the surfaces to the builder.

The product's promise is the category line (`canonicalPositioningLine`, `lib/seo.ts`): *the
interest-rate and credit lines that pause or resume your hiring, spend and raise, checked every
Monday*. Each claim below backs a part of it. A claim no part of the promise needs is a candidate to
remove, not to fix.

## The claims

| Claim | What it means | Its one builder | Backs | Printed by | Held by |
| --- | --- | --- | --- | --- | --- |
| **Conditions** | Which of four quadrants the two scores sit in: Sunny, Cloudy, Stormy, Freezing. | `getRegimePublicLabel` (`lib/regimePresentation.ts`) over the assessment's regime | "the lines" — the quadrant is where the lines put you | hero stamp, sticky strip, every paste, share card, embed, agent state, `/brief.md`, frozen briefs | `regimePublicLabelContract`, `weeklyClaimParity` |
| **The week's action** | What to do this week as a slogan of the week's direction applied to the conditions; on a held week, the hold's action. Not printed as a headline since 2026-10-09: its first sentence (the direction) opens the headline, and on a held week the action is the headline. A calibrated stage replaces it with the stage's action. | `buildActionNowShort` (`reportEvidence.ts`), or `describePolicyHold(…).actionNow` on a hold; the loader's `actionNowShort`, the home model's, and `WeeklyCallContract.actionNow` | "pause or resume" | agent state (`guidance.call`), `/api/decision` memo, frozen record (`actionNow`): API fields, values unchanged | `weeklyClaimParity`, `weeklyHeadline` |
| **The call (the headline action)** | The week's one headline action (2026-10-09): the more concrete of the two week-level sentences, a filter a request can be held against, the same for every reader. | `WeeklyCallContract.currentCall` (`weeklyCallContract.ts`), read through `weeklyHeadline` (`reportEvidence.ts`); `PublishedBrief.summary` through `publishedBriefHeadline` | "your hiring, spend and raise" | homepage h1, sticky strip, Copy Brief, frozen brief's lead, answer pages' lead, share card, OG card, `/resolve` | `weeklyHeadline`, `weeklyClaimParity`, `canonicalDecisionCopyContract` |
| **The guidance** | The headline action opened by the week's direction ("Conditions are tightening. Approve only renewals…"); on a held week, the hold's action then why it holds. Area "Do now" lines stay as area lines under it. | `weeklyHeadline(…).composed`, via `formatGuidance` (`lib/export/briefBuilders.ts`) | the whole line | every paste, embed, `/brief.md`, Monday Slack post and email, frozen record's Slack and email, `/trust` snippet | `weeklyClaimParity`, `mondaySlackMatchesEmail`, `briefFormatsPinned` |
| **Direction this week** | Tightening, easing or holding, against the comparison reading. A change of conditions reads the way they moved: harsher tightens, milder eases. An improving week holds while any pause line is met. | `resolveWeeklyTone` (`reportEvidence.ts`, with `ReportDynamics.previousRegime`), the tone inside `buildActionNowShort`, read through `splitWeeklyCall` | "checked every Monday" | the stamp line beside the hero, the headline, the sticky strip's badge, the `/api/decision` memo's first line | `weeklyComparison`, `weeklyToneConsumers`, `weeklyClaimParity` |
| **What it is compared with** | The earlier reading every move is measured against, named by its date: last week's brief when one scored by this engine is 5–14 days old, else the month-end. | `findWeeklyComparisonReading` (`comparisonReading.ts`) and `comparisonBasis` | "checked every Monday" | what-changed table, movement lines, evidence page, pastes, share card, agent state, `/api/decision` memo, frozen record, Monday Slack post and email | `comparisonBasisSurfaces`, `weeklyComparison`, `weeklyClaimParity` |
| **The scores and their moves** | Funding pressure and risk appetite, 0–100, whole numbers, with what each move is made of. | the assessment's scores, `formatScoreValue`, `explainScoreMovement` | "interest-rate and credit" | hero map, what-changed table, evidence page, pastes, share card, agent state, frozen record, Monday Slack post and email | `scoreMovementSurfaces`, `weeklyClaimParity` |
| **Each area's lines** | For hiring, spend, raise, roadmap and experiments: the score values that pause and resume it, and whether each is met today. | `sharedDecisionLines` and `describeRuleCondition` (`boundedDecisionRules.ts`) | "pause or resume your hiring, spend and raise" | by-area table, plan page, pastes, `/brief.md` | `decisionMovementSurfaces`, `boundedConditionRails` |
| **What would change the guidance** | The lines that would move the conditions and how far each is; on a held week, what ends the hold. | `buildCallChangeLines` and `buildFlipThreshold` (`reportEvidence.ts`), `buildWeekCallChangesIf` (the hold's condition on a held week), `WeeklyCallContract.callChangesIf`. Reshaped, never rebuilt: `buildCallChangeLine` (the nearer line in points, or the hold's, for a one-line surface), `buildFlipProximity` (each line in interest-rate terms, none on a held week) | "the day one is crossed" | hero, evidence page, every paste, `/brief.md`, embed, Monday Slack post and email, `/api/decision` memo, `/share` standup and work-item blocks, agent state, `/api/cli/status` (both views), weekly mandate, `/trust`, `/resolve`, answer pages, archive summaries, the regime-change alert, frozen record | `weeklyClaimParity`, `flipProximity`, `canonicalDecisionCopyContract`, `postureStateContract` |
| **Confidence** | How settled the reading is: the published band, high, medium or low. | the published band, said through `formatConfidenceChipLabel` | trust in the reading | trust strip, every paste, embed, agent state, `/api/decision` memo, frozen record | `trustStripAgreement`, `weeklyClaimParity` |
| **The reading's date** | The record date of the data the week was scored on. | `treasury.record_date` | "checked every Monday" | every surface | `weeklyClaimParity` |
| **Why a held week holds** | The reason the guidance is not changing: scores disagree, signals spread, or inputs missing. | `describePolicyHold` (`regimeDescription.ts`) | trust in the reading | hero, every paste, trust strip, readiness state, share card, agent state, `/api/decision` memo, `/share` standup, frozen record, Monday Slack post and email | `heldGuidanceReason`, `weeklyClaimParity` |

## The rules

- **A surface prints a claim through its builder, never its own derivation.** A second derivation is
  how every row above came to disagree once. If a surface needs the claim in another shape (the card
  prints the action without its direction sentence), it reshapes the builder's value (`splitWeeklyCall`),
  it does not rebuild it.
- **A new surface adds itself to the claim's row and to `tests/weeklyClaimParity.test.tsx`.** That test
  renders one week, ordinary and held, through the homepage card, the share card,
  `/brief.md`, the embed, the brief document every paste renders, the agent state, the `/share` standup
  line, the `/api/decision` memo, the frozen record, and the Monday Slack post and email, and holds each
  claim equal on every surface that prints it. A surface that does not print a claim is not held to it.
- **A claim's meaning is the owner's; its wording is `lib/report/`'s.** Changing what a claim means
  (when an improving week counts as holding, which reading a week is compared with) is a decision
  recorded in `docs/feature-specs-current.md`, not a copy edit.
- **The weekly read-through checks the live week.** A scheduled read early each Tuesday, after the Monday send, opens
  the production surfaces for that week and compares each claim across them. It reports a
  disagreement rather than fixing it, because a disagreement on live data the suite did not catch is
  a missing test first.
