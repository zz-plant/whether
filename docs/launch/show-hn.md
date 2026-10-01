# Show HN launch kit

Prepared 2026-08-10. Target: front page via Show HN, linking https://whether.work.

## Hold condition (added 2026-08-29)

**Do not post yet.** Show HN is a one-shot channel with a multi-year cooldown, and the landing
experience currently converts a spike into a flat retention curve. Four things gate the post, from
`docs/product-marketing-review-2026-08-29.md`:

| Gate | State |
| --- | --- |
| The homepage does not advertise a stale permalink | Done — gated on archive recency |
| A track record exists for a visitor to inspect | Done — `/history` |
| The share loop returns a reader to the product | Done — permalink line on every artifact |
| There is a stated offer (`/pricing`, including what is free forever) | Done — prices stated, checkout unwired |

All four closed on 2026-08-29. The reason the fourth gated a *launch* and not just a funnel: the
strongest thing this product can say on HN is "the weekly call is free forever, here is the scoring,
here is the API" — and that claim is only credible in writing, on a page, before the traffic
arrives. Saying it in a comment thread after someone asks "what's the catch" is a weaker version of
the same answer. `/pricing` now states it, and `FREE_FOREVER_PROMISE` is asserted in tests so it
cannot quietly erode before the post goes up.

Two additions to the post text worth making before submitting, both now true and both answering
objections the kit already anticipates:

- **The track record.** `/history` publishes every call the engine has made, how long the current one
  has held, and how often the regime changed. The prepared defense against "macro horoscope" was
  method transparency; this is the stronger half of that answer, because it invites scrutiny of the
  output rather than only the derivation.
- **Free forever, in writing.** Link `/pricing` rather than asserting it in a comment. HN reads a
  published free-tier promise very differently from a founder saying "we'll always have a free tier".

The track record is in the post text below as of 2026-10-01, as the "grades itself" bullet.

The remaining checklist below still applies.

## Why this can work on HN

Whether already has the three things HN rewards and rarely gets in one product: no signup, a
free no-auth API (plus MCP endpoint and llms.txt), and an open repo. The launch prep work
(2026-08-10) made all three visible: the homepage now explains itself to a cold visitor, the
footer links GitHub, and /trust#formula-reference publishes the full scoring derivation with
constants imported from the engine itself.

The main risk is the "macro horoscope for founders" top comment. The defense is not arguing —
it's radical transparency plus honest limits. Every prepared answer below leans on that.

## Title options (pick one, ≤80 chars, no superlatives)

1. `Show HN: Whether – turns Fed data into weekly operating guidance for startups`
2. `Show HN: A weekly operating brief for startups, with the thresholds that flip it`
3. `Show HN: Open-source weekly macro brief for startup operators (no signup)`

Option 1 is the strongest: concrete input (Fed data), concrete output (weekly operating guidance, the
category line every outward surface uses; `docs/editorial-guardrails.md` -> Category line),
concrete audience. Avoid "AI", "revolutionary", "beautiful" — all negative signals on HN.

## Post text (the URL field takes the site; this goes in the text box or first comment)

> I run product at an early-stage company and kept losing the same 30 minutes every Monday:
> skim the Fed news, skim a macro newsletter, and try to translate "conditions are tightening"
> into whether we should actually approve the two open reqs.
>
> Whether automates that translation. It pulls public series from FRED (fed funds, 2Y/10Y
> yields, high-yield spreads, Chicago Fed financial conditions, VIX) and compresses them into
> weekly operating guidance — e.g. "conditions tightening — freeze new commitments" — plus the
> part I actually care about: the exact thresholds that would flip the call, and the reversal
> condition for every rule.
>
> Some choices HN might appreciate:
>
> - **The scoring is boring on purpose.** Two 0–100 scores (cost of money, willingness to fund
>   risk), a quadrant classification with hysteresis so one noisy week can't flip the regime,
>   and published constants: https://whether.work/trust#formula-reference. The methodology page
>   imports its numbers from the scoring engine's constants, so it can't drift from the code.
> - **Set your own lines.** The published pause and resume lines are a starting point. The planning
>   page lets a team move them, say releasing more hiring only once funding pressure falls below 60,
>   and sends one email the day one is crossed. Most weeks nothing does, which is the point.
> - **It grades itself in public.** Every week stays published as written, and
>   https://whether.work/history scores the archive against what happened next, including the
>   changes in conditions it gave no warning of. https://whether.work/calibration shows the
>   confidence figure measures distance from a line, not probability, and the page says so.
> - **No signup, no trackers.** The whole product is on the front page.
> - **Free API, no key**: `curl https://whether.work/api/agent?cadence=weekly`. There's also an
>   MCP endpoint and llms.txt if you want your agent to read it instead of you.
> - **Open source**: https://github.com/zz-plant/whether
>
> What it is not: a prediction engine. It won't tell you what the Fed will do. It's a pacing
> tool — a shared default for "how aggressive should we be this week" that a team can argue
> against, with the argument bounded by explicit thresholds instead of vibes.
>
> Happy to answer anything about the scoring, the data pipeline (Cloudflare Workers + KV,
> materialized read models, cached fallbacks for when FRED is down), or the product stance.

## Prepared answers for the predictable top comments

**"This is astrology for founders."**
Fair concern — most macro content is. Two differences: every call is bounded (action +
threshold + reversal condition, all numeric, all public), and the system publishes what would
make it wrong before you act, not after. If you think the thresholds are wrong, they're all
URL-tunable (`?tightnessThreshold=`) — the disagreement becomes a number, not a mood.

**"Treasury yields can't tell you whether to hire."**
Correct, and the product says so on its own trust page: "decision-support software, not an
authority... combine it with company-specific metrics." The claim isn't that macro determines
your hiring plan; it's that teams already reprice risk weekly from headlines, and doing it
from five public series with published formulas beats doing it from the loudest tweet anyone
on the exec team read that morning.

**"How is the score computed?"**
Full derivation with the engine's actual constants: /trust#formula-reference. Short version:
funding pressure ramps 0→90 as the one-month bill rate passes 3.5%→4.0%, plus up to 25 for curve inversion;
risk appetite maps the 10Y−2Y slope linearly from −1% to +1.5%; stress reads (HY spreads, FCI,
VIX, funding velocity, layoffs) apply capped adjustments; regime is a quadrant with a
two-consecutive-reads confirmation gate near boundaries.

**"What data, exactly? Is it fresh?"**
FRED daily CSV endpoints (DFF, DGS1MO, DGS3MO, DGS2, DGS10) plus the macro series above. No
API keys anywhere in the pipeline. Freshness, per-source health, and degraded-state behavior
are on /trust — when a source is down it says so and serves the last canonical snapshot
instead of silently pretending.

**"Why not just read the FOMC minutes / a newsletter?"**
Those explain; they don't decide. The output here is an artifact you can paste into Slack or
a planning doc: action, threshold, reversal. The bet is that "citeable and bounded" beats
"informative" for a weekly operating ritual.

**"What's the business model?"**
None right now. It's free and open source; it started as scratching my own Monday itch.

**"Stack?"**
Bun, React server components on Cloudflare Workers (edge SSR, 300s revalidate), KV for
materialized weekly read models with a 92-day history window, cron-driven ingest that never
self-fetches over HTTP. ~1,900 tests. The repo's AGENTS.md/CLAUDE.md are public too if you want
to see how the agent-assisted workflow is set up.

## Pre-launch checklist

- [ ] **Make the repo public.** As of 2026-08-10, github.com/zz-plant/whether is PRIVATE, so
      every "open source" claim above — plus the GitHub links now in the footer, homepage
      explainer, formula reference, and the pre-existing doc deep-links in /operate — 404s for
      visitors. The repo already reads as public (MIT LICENSE, CONTRIBUTING, README with demo
      gif). If it stays private instead, strip the open-source claims from the post text and
      remove the site's GitHub links before launch — a dead "Source code" link is worse than none.
- [ ] **Deploy** the current main first — the launch-prep work (homepage explainer, formula
      reference, GitHub footer link, `/evidence` `/resolve` `/planning` redirects) must be live.
- [ ] `bun run smoke:prod` passes — as of 2026-08-10 it fails on `/evidence` (404) until the
      redirect change deploys.
- [ ] Check https://whether.work shows **no DEGRADED badge** at post time (local dev shows one
      when live fetch fails; prod was healthy at last check). If a source is degraded, wait —
      "first click shows stale data" is a thread-killer.
- [ ] OG/social image renders correctly (in progress in a parallel session on 2026-08-10 —
      confirm before posting).
- [ ] `curl https://whether.work/api/agent?cadence=weekly` returns JSON — the post text cites it.
- [ ] Repo README is current (it is: demo gif + quickstart + curl example).
- [ ] Post **Tuesday–Thursday, 8–10am ET**. Weekends and Mondays bury Show HNs.
- [ ] Submit from the account that will answer comments; be present for the first 3 hours.
      Fast, non-defensive author replies are the strongest ranking signal a Show HN has.
- [ ] Do not ask anyone to upvote, and don't share the item link asking for support (HN
      penalizes voting rings). Sharing "we're on HN" after it's moving is fine.
- [ ] If the thread surfaces a fixable bug, fix and reply with the commit link — live fixes
      during the thread are the best possible look for an open-source Show HN.
