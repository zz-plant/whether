# Current JTBD Map And Click Paths

Type: Canonical  
Scope: Shipped UI flows in `app/` as implemented on 2026-03-16.

Validation note: click labels in this document were verified from the current route and component code. A live browser walkthrough was not completed in this workspace because `bun run dev` currently fails in the `vinext` wrapper with a `rolldown` export error.

## 1. Get this week’s operating call fast

**JTBD:** When I open Whether at the start of the week, help me know what to do now without reading a macro essay.

**Clicks**
1. Open `/` or click `Weekly Brief` in global navigation.
2. Read the `This week in 15 seconds` block.
3. If execution detail is needed, click `Open Planning`.

**Current output**
- Current posture
- Immediate decision
- Guardrail
- Flip condition
- Confidence and trend context

## 2. Share a meeting-ready artifact without rewriting it

**JTBD:** When I need to brief leadership or Slack quickly, let me copy a ready-made artifact instead of translating the call myself.

**Clicks**
1. Open `/` or click `Weekly Brief`.
2. Use one of:
   - `Copy board snippet`
   - `Copy weekly call snapshot`
   - `Copy delta brief`
   - `Copy Weekly Operator Brief`
3. If needed, open `More share actions`.
4. Choose one of:
   - `Copy meeting pack`
   - `Copy board summary`
   - `Copy citation`
   - `Export / print PDF`
5. Only if the company needs a temporary exception, open `Company-specific exception` and add the governance note before copying again.

**Current output**
- Slack-ready weekly call snapshot
- Delta-only weekly brief for repeat readers
- Meeting pack
- Weekly operator brief
- Board summary
- Citation line
- PDF/print export

## 2.1 Re-deliver the call and keep an operator audit trail

**JTBD:** When I need to resend the weekly call or prove what we approved, let me do it from the same Planning checkpoint instead of stitching together separate tools.

**Clicks**
1. Click `Planning` in global navigation.
2. Open `Share the brief`.
3. In `Regime alert log`, toggle delivery channels or click `Deliver latest alert`.
4. In `Decision Memory`, copy the latest saved entry or export CSV.

**Current output**
- Per-profile alert delivery toggles
- Recent delivery history
- Latest Decision Memory entries
- CSV export for saved decision runs

## 3. Validate why the call moved and whether to trust it

**JTBD:** When someone challenges the weekly call, show me the evidence, freshness, and trust status fast.

**Clicks**
1. Click `Evidence` in global navigation.
2. Click `Review evidence`.
3. Use the in-page actions that matter:
   - `Open tightness`
   - `Open risk appetite`
   - `Open curve slope`
   - `Inspect threshold logic`
4. If the question is about provenance or uncertainty, click `Trust`.
5. On `/method`, open:
   - `Sources and freshness`
   - `Confidence and limits`
   - `Open formula reference`

**Current output**
- Real-time scorecards
- Threshold references
- Freshness and source coverage
- Confidence and distrust/revisit conditions
- Formula and method links

## 4. Replay a prior regime window before changing plans

**JTBD:** When I want context from an earlier month, let me replay historical posture before revisiting current bets.

**Clicks**
1. Click `Evidence`.
2. In `Advanced filters and historical tools`, click `Open Time Machine`.
3. In `Historical regime replay`, pick a date.
4. If needed, review the advanced `Time Machine` and `Regime timeline` panels.

**Current output**
- Historical snapshot selection
- Snapped month replay
- Historical banner context
- Regime comparison support

## 5. Turn the call into this week’s operating plan

**JTBD:** When I need to approve or hold changes to team pace, roadmap, and spend, translate the posture into bounded operating rules.

**Clicks**
1. Click `Planning` in global navigation.
2. Click `Start with weekly plan`.
3. Click `Open guardrails`.
4. Review `Weekly plan` and `Approve or hold moves`.
5. If needed, click `Show full action lanes`.

**Current output**
- Weekly approve/hold/revisit framing
- Start rules
- Stop rules
- Fence rules
- Expanded action lanes for deeper review

## 6. Model runway, raise timing, and burn changes

**JTBD:** When finance or leadership asks what this regime means for cash posture, help me test runway decisions against the current call.

**Clicks**
1. Click `Planning`.
2. Open the `Finance strategy` section.
3. In `Runway planner`, set:
   - `Runway (months)`
   - `Monthly burn ($)`
   - `Monthly revenue ($)`
   - `Monthly growth rate (%)`
   - `Sector`
   - `Stage`
4. Optional: click `How is this calculated?`
5. Click `Copy financial block`.

**Current output**
- Runway risk
- Safe runway band
- Raise timing window
- Burn adjustment range
- Bounded finance guardrails
- Copy-ready finance block

## 7. Route the weekly call by role

**JTBD:** When different leaders need different decision framing, let me translate the same call into a role-specific path.

**Clicks**
1. Click `Decision Tools` in global navigation.
2. Review the `Start from this week's live call` block.
3. Under `Explore by role`, click the relevant role card.
3. Review:
   - `Decisions you're making`
   - `Failure modes to watch`
   - `Recommended toolkits`
   - `Run this now`

**Current output**
- Role-specific decision framing
- Role-specific failure modes
- Recommended next toolkits

## 8. Jump to the right toolkit for a specific situation

**JTBD:** When I already know the decision situation, take me straight to the right operating instrument.

**Clicks**
1. Click `Decision Tools`.
2. Review the `Start from this week's live call` block.
3. Under `Explore by situation`, click the relevant situation card.
4. Click a toolkit in `Start here` or `Run this now`.
5. On the toolkit page, use:
   - `Run sequence`
   - `Included instruments`
   - `Canon references`

**Current output**
- Situation-specific toolkit selection
- Step-by-step run sequence
- Expected artifact and bounded rules

## 9. Personalize the mandate for my company context

**JTBD:** When the base weekly call is directionally right but too generic for my company, tailor it to stage, sector, and operating shape.

**Clicks**
1. Click `Decision Tools`.
2. Review the `Start from this week's live call` block.
3. In `Decision utilities`, click `Team context profile`.
3. Set:
   - `Stage`
   - `Sector`
   - `Team size`
   - `Revenue band`
   - `Cash runway`
   - `Growth rate`
   - `Business model`
4. Click `Generate personalized mandate`.

**Current output**
- Personalized weekly mandate
- Sector-adjusted interpretation
- Tailored actions
- Stage differentiation guidance

## 10. Score whether to ship now or wait

**JTBD:** When I need a bounded launch decision, help me turn the macro call into a go, wait, or kill recommendation.

**Clicks**
1. Click `Decision Tools`.
2. Review the `Start from this week's live call` block.
3. In `Decision utilities`, click `Whether to ship checklist`.
3. Set:
   - `Evidence strength`
   - `Reversibility`
   - `Blast radius`
   - `Strategic alignment`
4. Click `Score checklist`.

**Current output**
- `Recommendation: GO | WAIT | KILL`
- Adjusted score
- Reasons
- Reversal trigger
