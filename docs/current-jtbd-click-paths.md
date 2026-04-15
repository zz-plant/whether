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
   - `Copy weekly delta`
   - `Copy one-screen summary`
   - `Copy leadership team brief`
   - `Share leadership team brief`
3. If needed, click `Open full formats`.
4. In Planning, choose one of:
   - `Copy plain-English brief`
   - `Copy board note`
   - `Copy meeting pack`
   - `Copy board summary`
   - `Copy citation`
   - `Print / PDF`
5. Only if the company needs a temporary exception, open `Company-specific exception` in Planning and add the governance note before copying again.

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

## 9. Move into Planning when company context is needed

**JTBD:** When the base weekly call needs company-specific guardrails or exceptions, carry it into Planning instead of using a separate personalization branch.

**Clicks**
1. Click `Decision Tools`.
2. Review the `Start from this week's live call` block.
3. If company context matters, open Planning and use the export / governance sections to add the company-specific note.
4. Copy or share the plan with the live weekly call preserved as the base.

**Current output**
- Planning handoff for company-specific context
- Governance note or exception path
- Shareable plan artifact with the live weekly call preserved as the base

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
