<!-- Part of the feature log. Index: ./README.md -->

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
    `runwayBandForProfileRunway`) when its balance and a year of surplus would carry six months of spending and revenue
    still covers spending 24 months on at the reader's own growth rate, and in the 12–24 band
    otherwise, which leaves the guidance as written (2026-11-04). Revenue coming to cover spend moves
    the band cookie to whichever it earns. It
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
- The `company` and `financial` interpretation views never received a company profile from any
  caller, so they described a built-in default (Series B, $1–10M ARR, 12–18 months of runway),
  and nothing drew them. Both went with the interpretation layer on 2026-10-27 (§1.0); the
  runway planner is where a company's own figures go.
