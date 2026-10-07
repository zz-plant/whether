# Current JTBD Map And Click Paths

Type: Canonical  
Scope: Shipped UI flows in `app/` as implemented on 2026-10-06.

Validation note: checked on 2026-10-06 against the code at `bc520ac3`. Each quoted label, heading and nav name was matched in `app/` and `lib/`, each route in `app/**/page.tsx`, and each redirect in `next.config.js`. `<…>` marks text filled in at runtime. The flows were not walked in a browser.

Navigation: the header tabs are `Brief` (`/`) · `Plan` (`/operate`) · `Evidence` (`/signals`) · `Resolve` (`/resolve`) · `Trust` (`/trust`) · `History` (`/history`), followed by a `More` menu that holds `Share`, `Compare periods`, `Search` and the other utility links. A phone shows `Brief`, `Plan`, `Evidence`, `Search` and `More` in a bottom bar. Most report pages index their sections under `On this page` on a wide screen and as a chip row on a narrow one.

## 1. Get this week’s operating call fast

**JTBD:** When I open Whether at the start of the week, help me know what to do now without reading a macro essay.

**Clicks**
1. Open `/` or click `Brief` in the header.
2. Read the call card: the conditions word, the call, and the trust strip (`As of`, `Sources`, `Confidence`, `Could change next week`).
3. On a first visit, pick an answer under `What are you deciding?` or click `Show the full brief`. A returning visit opens on the full brief: `What changed this week`, `What that changes for you`, `What would change this guidance`, `Do and share`.
4. For execution detail, click `Build this week’s plan →` under `Do and share` (the label follows the `Plan horizon` choice), or `Plan` in the header.

**Current output**
- Conditions and the operating call
- Each area's rule, with the line that pauses it and the line that resumes it
- What would change the guidance, drawn against both scores' lines
- Freshness and confidence on the trust strip; `How this is judged` opens `/trust`

## 2. Share a meeting-ready artifact without rewriting it

**JTBD:** When I need to brief leadership or Slack quickly, let me copy a ready-made artifact instead of translating the call myself.

**Clicks**
1. On `/`, click `Copy Brief` under the call card (on a first visit, after `Show the full brief`). It copies a Slack-formatted brief, or opens the device's share sheet where the browser offers one. The `C` key and `Copy Slack brief` in the command palette press the same button.
2. Under `Do and share`, click `Copy as a slide` or `Copy as an image`.
3. For other formats, open `Share` from the header's `More` menu (`/share`). Pick a format from the list (the `Format` select on a phone), then click its copy button:
   - Chat: `Copy Slack post`, `Copy full brief`, `Copy standup line`
   - Meetings: `Copy meeting pack`, `Copy agenda`, `Copy slide text`
   - Docs and email: `Copy email`, `Copy investor update`, `Copy portfolio note`, `Copy citation`
   - Tickets and boards: `Copy ticket brief`; `Work-item tags` copies one area at a time (`Copy <area> tag`) and `Pull policies` one policy at a time (`Copy policy`)
   - Team: `Role memos` (`Copy memo`, `Copy checklist`)
4. On `/share`, the meeting pack and Monday agenda formats add `Add a Monday review to your calendar`. `Files and images for a deck or a thread` holds the board slide (`Download PPTX`, `Download PDF`, `Open SVG`) and `Open brief card`.
5. On `Plan`, the `Share the brief` step copies the Slack, Slide, Citation and Agenda formats (`Copy <format> format`) and links to `/share` for the rest.

**Current output**
- A Slack-formatted brief from `/`, plus the same call as a slide and as an image
- Fourteen formats on `/share`, grouped by where they get pasted
- The board slide as PPTX, PDF or SVG, and a PNG brief card
- A Google Calendar event for next Monday's review

## 3. Validate why the call moved and whether to trust it

**JTBD:** When someone challenges the weekly call, show me the evidence, freshness, and trust status fast.

**Clicks**
1. Click `Evidence` in the header (`/signals`).
2. Read `What changed` and `What would change this guidance`.
3. Under `Deeper evidence`, open the question you need, such as `What are interest rates doing?`, `How have the two scores moved this year?` or `What would conditions be with different lines?`.
4. For provenance, click `Trust` in the header, or `How this is judged` on the call card.
5. On `/trust`, read `How the scores are built` and `Sources and last update`. In a week with live data and no active warning, `Citation, limits and revisit triggers` folds `Cite this guidance`, `Confidence and reliability limits`, `What would make this recommendation wrong?` and `Meeting snippet`; in any other week they render open.

**Current output**
- Each signal against its earlier reading and its lines
- The derivation from public data series to the guidance
- Each source feed, whether this reading came from it live, and when it last updated
- Pause and flip conditions, active warnings, and a one-line citation

## 4. Replay a prior regime window before changing plans

**JTBD:** When I want context from an earlier month, let me replay historical posture before revisiting current bets.

**Clicks**
1. On `/`, click the week title (`Week of <date>`) between the `Previous week` and `Next week` arrows. Pick a month under `Past weeks` or a period under `Replay a known period`; `Back to this week` returns to the live brief.
2. On `History` (`/history`), `Conditions by month` shows every month's conditions. The pills under `Each closed year` open `/history/<year>`, and each card under `Published weekly briefs` opens that frozen week at `/brief/<week>`.
3. On `Evidence`, open `What did the brief say in an earlier month?` under `Deeper evidence`, choose a month and click `Load month`.
4. To set two months side by side, click `Compare funding conditions across periods` on `/history` or `Compare periods` in the `More` menu (`/history/compare`), then choose `Period A` and `Period B`.

**Current output**
- An archived month's brief and evidence, marked as archived
- The month-by-month record and the published weekly briefs
- Two months' scores, lines and rules side by side

## 5. Turn the call into this week’s operating plan

**JTBD:** When I need to approve or hold changes to team pace, roadmap, and spend, translate the posture into bounded operating rules.

**Clicks**
1. Click `Plan` in the header (`/operate`), or `Build this week’s plan →` on `/`.
2. Read `This week's rule for each area`, open on arrival: one row per area, with the line that pauses its rule and the line that resumes it.
3. Read `Rules before you commit`, also open: the top three `Stop`, `Start` and `Keep limited` rules. Click `Show all rules` for the full lists.
4. Before approving, read `Warnings to read before you approve` under `Risk checks` at the foot of the page.

The page index runs `Rule for each area` · `Rules before you commit` · `Test a decision` · `Set this plan's lines` · `Finance strategy` · `Share the brief` · `Risk checks`.

**Current output**
- Each area's rule with its pause and resume lines
- Stop, start and keep-limited rules for new commitments
- Warnings that name an assumption the plan rests on and how to check it

## 6. Model runway, raise timing, and burn changes

**JTBD:** When finance or leadership asks what this regime means for cash posture, help me test runway decisions against the current call.

**Clicks**
1. Click `Plan` in the header, then `Runway planner` in the plan's view tabs (`Weekly plan` · `Runway planner` · `Scenarios`), which opens `/operate/financial`. The `Finance strategy` step on `/operate` links to the same page.
2. In `Runway planner`, enter:
   - `Cash in the bank ($)` or `Runway (months)` (typing either replaces the other)
   - `Monthly spend ($)`
   - `Monthly revenue ($)`
   - Optional: `Monthly revenue growth (%)` (blank reads as flat), `Sector`, `Stage`
3. Until all three required figures are in, the panel names the missing ones and sizes nothing. A company whose revenue covers its spending is told there is no runway to plan against.
4. Optional: under `Your own runway lines`, set `Start raising at (months of runway)` and `Pause hiring at (months of runway)`.
5. Optional: open `How is this calculated?`.
6. Click `Copy block` for the runway plan, or open `Budget memo` and click `Copy memo`.

**Current output**
- `Runway risk`, `Safe runway band`, `Raise timing window` and `Burn adjustment range`
- `The rules this sets`: a raise rule and a burn rule for the entered figures
- A copy-ready block, and a budget memo built from the entered figures
- Figures persist in this browser (`whether.operatorProfile`) and feed `Test a decision` on `/operate` and `Test a decision against your runway` on `/`; `Stage` writes the stage cookie the brief reads

## 7. Route the weekly call by role

**JTBD:** When different leaders need different decision framing, let me translate the same call into a role-specific path.

**Clicks**
1. Click `Resolve` in the header (`/resolve`).
2. Open `Browse by role, company stage, situation or toolkit` at the foot of the page.
3. Under `Help by role`, click a role to open `/resolve/<slug>`. A link under `By role or stage` instead reloads `/resolve` with that role's or stage's guidance under `Direct answers`.
4. On the role page (`For <role>`), read `Decisions this role usually owns`, `Common mistakes` and `When conditions change`, then pick from `Recommended tools`.

**Current output**
- The decisions the role owns, its common mistakes, and how its moves shift when conditions change
- Toolkits recommended for the role, each naming the artifact it produces

## 8. Jump to the right toolkit for a specific situation

**JTBD:** When I already know the decision situation, take me straight to the right operating instrument.

**Clicks**
1. Click `Resolve` in the header.
2. For a single question, pick it from `Direct answers`; each opens `/answers/<slug>`.
3. For a reusable worksheet, open `Browse by role, company stage, situation or toolkit`. Pick a tool under `Recommended tools`, or a situation under `Help by situation` (`/resolve/<slug>`, which lists its own `Recommended tools`).
4. On the toolkit page (`/toolkits/<slug>`), work through `Prep checklist`, `Run sequence` and `Signs it worked`. `What's in this toolkit` links each instrument to a guidance page, and `Related guidance` lists the rest.

The toolkit page's `Toolkits` breadcrumb returns to `/resolve#toolkit-library`; `/toolkits` on its own redirects to `/`.

**Current output**
- A one-answer page per common decision
- Toolkits matched to the situation
- A prep checklist, run sequence and success signs for each toolkit, with links to its instruments

## 9. Carry the call into Plan when company context is needed

**JTBD:** When the base weekly call needs company-specific guardrails or exceptions, carry it into Plan instead of using a separate personalization branch.

**Clicks**
1. On `/`, set `Stage` and `Cash runway` under `Company calibration` in `What that changes for you`; on a phone, the same two choices sit in the header. The pause and resume lines rescale to them.
2. Click `Plan` and enter the company's figures in `Runway planner` (section 6).
3. On a live week, adjust the lines under `Set this plan's lines` and click `Email me when a line is crossed`.
4. Copy the result from the `Share the brief` step, or from `/share` (section 2).

**Current output**
- Pause and resume lines scaled to the company's stage and runway
- Plan lines the team agreed, with an email when one is crossed
- Share formats built on the live weekly call

## 10. Test one move before committing to it

**JTBD:** When I am about to commit to one move (a hire, a price change, a roadmap bet), tell me whether it holds under this week's lines.

**Clicks**
1. Click `Plan` in the header. `Test a decision` is open on arrival.
2. Choose `Describe a plan`, `Compare two plans` or `Pick from a list`, then enter the move. The verdict appears once there is a plan to judge.
3. Read the `Decision verdict`, then click `Copy verdict`, `Copy link` or `Record this decision`.
4. On `/`, `Test a decision against your runway` under `What that changes for you` tests one commitment in an area against the runway you entered.
5. For a yes-or-no on a common decision, use `Direct answers` on `/resolve`.

**Current output**
- A verdict on the move and the reasons for it
- For a described plan: sizing, what the plan assumes, its pause line, and a more reversible version
- A copyable verdict, a link to it, and an entry in the browser's decision record

## Retired since the version at `6a55a222`

- The header no longer says `Planning` or `Decision Tools`; those tabs are `Plan` and `Resolve`. `/planning` redirects to `/operate`, `/evidence` to `/signals`, and `/decision-tools` to `/resolve`.
- The ship checklist and its GO / WAIT / KILL score are gone: `/resolve/ship-checklist` redirects to `/resolve#direct-answers`.
- Decision Memory and the regime alert log are gone from Plan. `/operate/memory` redirects to `/history`, and `#regime-alert-log` opens the `Share the brief` step. Email alerts come from the subscribe form under `Do and share` on `/` and from `Set this plan's lines`.
- Most click labels in that version no longer exist; `git show 6a55a222:docs/current-jtbd-click-paths.md` prints it.
