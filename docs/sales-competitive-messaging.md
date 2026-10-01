# Sales competitive messaging pack

Use this page for internal sales enablement, demo prep, and objection handling.

## Who this is for (read before using any battlecard below)

This pack addresses two different buyers, and only one of them has been validated. Blending them is
how enterprise framing ends up steering the homepage and the roadmap.

### Primary ICP — validated, and what every outward surface should target

The seed-to-Series-B operator: VP Product, VP Engineering, Chief of Staff, or founder-CEO at roughly
20–200 people, with no macro analyst on staff, who runs or preps a Monday leadership meeting.

They are not switching off a competitor. They are doing this by hand — skimming Fed headlines and a
macro newsletter on Sunday night and guessing at the translation. **The manual briefing stack is the
real competitor**, which makes the last row of the table below the most important one, not the least.
The product shape matches this buyer: free, no signup, self-serve, open source, and shareable into a
Slack channel full of the same people.

Lead with this. "You're doing this by hand and it degrades under pressure" is a pain the buyer can
confirm from memory in one sentence.

### Secondary ICP — aspirational, unvalidated, do not steer product from it

The enterprise macro/strategy buyer for the terminal, research-subscription, FP&A, and research-
workflow rows below. These are real segments and the differentiation arguments hold, but no such
buyer has been sold, and the product has no seat model, no admin surface, no procurement story, and
no paid tier. Treat those rows as preparation for a motion that does not exist yet.

Two consequences, both binding:

- Do not use these rows to justify homepage copy, roadmap sequencing, or feature scope.
- Do not read the absence of an enterprise feature as a gap. It is a segment the product has not
  chosen yet.

**"Decision-translation layer" is internal vocabulary** and stays in this document. Outward surfaces
use the single category line in `lib/seo.ts` — *weekly operating guidance for startup leaders*. See
`docs/editorial-guardrails.md` -> Category line.

### Distribution channel — unvalidated: investor platform teams and accelerators

One platform team reaches dozens of primary-ICP companies, which is why `/share` carries a portfolio
note (`lib/export/portfolioNote.ts`): the week at every runway band, each area's lines, and a link for
each company to set its own. Nothing has measured demand from this channel yet. Use the note in a
conversation; do not build seats or a portfolio tier for it until someone asks for one.

## Why now (20-second talk track)
- The funding climate turns a few times a year (6 changes in 176 month-ends), and each turn lands on
  plans that were made months earlier with no rule for what to do when it came.
- Whether writes that rule down first: for each area, the action, the line that pauses it and the line
  that resumes it, with an email the day one is crossed. A team can move the lines to fit its own plan.
- Every week is published and never edited, and the record grades itself, including the turns it gave
  no warning of. Do not pitch week-to-week movement; most weeks, nothing crosses a line.

## Competitor battlecard

Ordered as written for historical reasons, not by priority. The **manual substitute** row is the one
that matches the primary ICP; the four enterprise rows serve the secondary, unvalidated one.

| Segment | Primary buyer | Strongest claim | Weakest point vs Whether | Homepage copy angle |
| --- | --- | --- | --- | --- |
| Institutional macro terminals (Bloomberg / Refinitiv / FactSet) | CFO, strategy, treasury, market-intel | Deepest real-time macro and market coverage | Data-rich but not purpose-built for weekly startup operating posture decisions across product/engineering | From macro noise to one weekly operating call. |
| Macro research subscriptions (BCA / TS Lombard / Gavekal) | CEO/CFO, strategy leads | High-quality macro interpretation from experts | Insight-heavy but less bounded for weekly execution decisions (hiring, roadmap, spend) | Not just macro analysis—bounded actions for hiring, roadmap, and spend. |
| Planning and FP&A platforms (Anaplan / Pigment / Mosaic) | CFO, FP&A, COO | Best-in-class planning model depth and scenarios | Strong model mechanics, weaker macro-native weekly briefing ritual and leadership shorthand | Weekly pacing authority before the planning model. |
| Research workflow platforms (AlphaSense / Sentieo) | Strategy, corp dev, investor relations | Fast retrieval and synthesis across signals and filings | Built for research retrieval, not a single weekly posture call with explicit decision delta | One-screen weekly posture, not a research scavenger hunt. |
| BI + internal ops dashboards (Looker / Tableau / Mode + custom stack) | Data/ops leaders, analytics | Customizable internal metrics and visibility | High maintenance, lower portability for screenshot-ready/citeable leadership artifacts | Decision-complete brief in 30 seconds, screenshot-ready. |
| Newsletter + staff synthesis stack (manual substitute) | Chief of Staff, VP Product/Eng, operations | Flexible and low-cost narrative updates | Inconsistent thresholds and provenance; hard to sustain repeatable weekly ritual quality | Codified weekly call with thresholds and reversal conditions. |

*Checked 2026-09-29: `mosaic.tech` redirects to `hibob.com/platform/finance` ("Strategic planning with modern
FP&A software | HiBob"), so "Mosaic" in the planning row now points at HiBob's finance product. Confirm the
name before quoting it to a buyer.*

## Objection handling

### "We already use Bloomberg/FactSet."
- You should keep those tools for signal depth.
- Whether is the decision-translation layer: convert signal coverage into a weekly operating call.
- We replace ambiguity in Monday leadership decisions, not terminal functionality.

### "This sounds like strategy consulting in software."
- Whether is action-first, not methodology-first.
- Output is bounded decisions with thresholds and reversal conditions.
- The goal is faster execution alignment, not longer explanation cycles.

### "Our FP&A tool already does scenarios."
- FP&A tools are excellent for model mechanics.
- Whether sets weekly posture assumptions before those model updates.
- It creates one pacing call leadership can execute immediately.

### "Couldn’t our chief of staff do this manually?"
- Manual synthesis can work, but consistency and continuity degrade under time pressure.
- Whether keeps provenance, freshness, and decision framing compact and reusable.
- This reduces re-litigation and meeting-to-meeting drift.

### "Is this just another dashboard?"
- Dashboards answer what happened.
- Whether is built to answer what to do this week.
- The output is a shareable operating artifact, not analyst-only exploration.

## 3-line differentiation script by segment

### 1) Institutional macro terminals
1. You already have strong macro visibility.
2. Whether converts that visibility into a weekly operating posture for startup leadership.
3. Think of it as signals → posture → decision → artifact.

### 2) Macro research subscriptions
1. Research tells you what macro means.
2. Whether tells VP Product/Engineering what to change this week.
3. Bounded rules and revisit logic outperform broad caution language.

### 3) FP&A / planning platforms
1. Planning tools optimize scenarios once assumptions are set.
2. Whether helps set weekly posture assumptions before model runs.
3. It aligns leadership on one pacing call quickly.

### 4) Research workflow platforms
1. Search/research platforms are strong for evidence retrieval.
2. Whether compresses evidence into one weekly decision call.
3. You get a cite-ready, screenshot-safe artifact leadership can act on.

### 5) BI/internal dashboard stacks
1. Custom BI tracks internal metrics deeply.
2. Whether adds external macro pacing and explicit decision deltas.
3. It is built for weekly alignment, not only exploratory analysis.

### 6) Manual briefing stacks
1. Manual briefs can be high quality but fragile.
2. Whether standardizes cadence, thresholds, and trust metadata.
3. Teams align faster with less re-litigation.

## External-ready one-liner
From macro signals to one weekly operating call—bounded, shareable, and ready for Monday leadership sync.

## Primary-ICP talk track (use this one by default)

1. Someone on your team is already doing this by hand every Sunday night — reading the Fed news and
   guessing what it means for the two open reqs.
2. Whether does that translation from published data on a fixed cadence, with the thresholds that
   would flip the call written down.
3. It is free, there is no signup, and the scoring is published — so the argument in your Monday
   meeting is about the decision, not about where the number came from.
