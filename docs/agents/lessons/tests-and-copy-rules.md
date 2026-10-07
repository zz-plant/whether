# Test honesty and reader-facing copy

Moved out of `CLAUDE.md`. Read before writing reader-facing strings, source-reading tests, or page-vs-page claims.

## Tests that read source instead of behaviour

22 test files (counted 2026-09-16) match a regex against a file's source rather than asserting on
what it does.
That is not automatically wrong, and the split is sharp enough to state as a rule.

**Legitimate, and most of them.** A `.husky` hook, a workflow YAML, `package.json`, `next.config.js`
and a `scripts/*.mjs` are configuration: there is no behaviour to render, and the fact *is* the text.
So is a module-level declaration a render cannot see — `"use client"`, `alternates.canonical`,
`export const revalidate` — which `tests/crawlableRouteContract.test.ts` explains where it uses one.
A third case is narrower and real: `tests/feedRoute.test.ts` reads its route to check no URL is
hardcoded, which no rendered assertion can distinguish, because the hardcoded literal and the
configured default are the same string.

**The failure mode, when it is one.** A source regex breaks on a rename and passes on a regression.
`tests/homePageHeading.test.tsx` carried the evidence in its own comment: one assertion "failed when
the ternary became a `??`, with the rendered heading unchanged". A test that fails on a refactor and
passes on a behaviour change is answering a different question from the one in its name.

**The rule.** If the claim is about rendered output and the thing renders in this suite, render it.
Pages and components do: `renderToStaticMarkup` works for a component, and for a page that reads no
upstream (`tests/toolkitHowToAnchors.test.tsx` renders `/toolkits/[slug]` and checks the HowTo's
`#step-N` fragments resolve to real anchors). A route handler is even easier — call it and parse the
response, as the feed test does for everything except that one literal. What does **not** render here
is a page behind the report read path: the suite serves no upstreams, so `app/page.tsx` suspends at
its data boundary and streams a shell. Assertions about that route stay source-level and say so at
the site.

Two files were converted on 2026-09-16 under this rule; the remaining source reads were checked
against it and left.

## Who the copy is written for (2026-09-16)

Four surfaces were addressed to the wrong reader, all in the same way: they rendered a fact about
*how the product works* to someone who can only act on facts about their own decision.

- **The programmatic pages published the indexation decision.** Two of the three printed the word
  "noindex" into the page, and all three joined `noindexReasons` — the quality gate's own
  identifiers — into the sentence. Someone searching a hiring question could land on an amber box
  reading "Degraded data mode: cluster-duplicate-no-distinct-datapoint-or-interpretation; this
  answer is marked noindex." Whether a page is indexed is a fact about a crawler; the gate ids are a
  fact about our own editorial bar. `lib/report/dataCurrencyNotice.ts` now splits the reasons: the
  four that mean the reading is not current become one sentence in the reader's terms, and the rest
  — thin section, duplicate cluster, missing copy button — render nothing at all, because a warning
  about data that is fine is the one that teaches a reader to ignore the next one. It takes the
  reasons rather than `degraded`, which is true whenever *any* gate fails.
- **`/trust`'s "Scheduled runs" panel was written for whoever maintains the pipeline**, on the page
  the IA points a reader to "when you want to sanity-check the brief before a big decision". It
  named the Worker and its crons, printed the read failure's internal reason, and rendered a raw
  error message under a column header promising a time. The column is a timestamp now
  (`lastFailedAt`), and the message stays in the model for whoever reads logs.
- **The cold-traffic corpus dropped the plain-language layer.** `GlossaryLink`, `SignalScaleNote`
  and `PlainEnglishScoreNote` were used on the home hero, `/signals` and `/trust` — the three pages
  a *returning* reader already knows their way around — and on none of the eleven answer pages or
  the scenario pages, which printed "current tightness: 79 / 100" to first-time visitors under a
  name no other surface uses for that score. The FAQ answer, which is the text a rich result shows,
  carried the same bare comparison.
- **The weekly email said "vs the regime line".** True, after the fix that replaced "vs last week",
  and still the engine's name for a threshold. It reads "9 pts above the line that changes the call"
  now, with the worse side folded into the model rather than re-derived in the renderer by checking
  whether a formatted string starts with a plus — the two lines face opposite ways.

The rule this leaves: **reader-facing copy carries no crawler, engine or infrastructure
vocabulary**, and where a label means the same thing on more than one surface it belongs in
`lib/report/` rather than being reworded per component (`lib/report/AGENTS.md` already says so).
Three tests hold it, each rendering the thing it judges rather than reading its source:
`tests/answerPageReaderCopy.test.tsx` renders all eleven answer pages and fails on
`/tightness|noindex|riskAppetite/`, `tests/runHistoryPanelCopy.test.tsx` renders every state the
panel has and fails on `/worker|cron|telemetry|binding|dataset/`, and
`tests/dataCurrencyNotice.test.ts` drives the real gate and asserts no reason id it produces can
reach a rendered sentence. The answer pages render offline because `loadWeeklyBriefSnapshot` falls
back to the bundled snapshot — which is worth knowing generally: **a page that reads through a
loader that degrades gracefully is testable here**, unlike one that suspends at a data boundary.

## One name per concept, counted (2026-09-22)

A copy audit read every route and every artifact that leaves the site against four questions:
cryptic, figurative, abstract, presumptuous. Nearly every surface failed at least one, and the
failures shared a shape rather than a page. Three vocabularies for the four market states, with
the engine key (EXPANSION/DEFENSIVE/VOLATILE/SCARCITY) winning wherever text left the site: every
subscriber alert, the meeting slide, the compare picker, half the glossary. "Posture" as the
load-bearing noun on every surface and defined on one. The pause/resume pair called "corridor",
"line" and "lane" on one screen. Fallback copy that was the most abstract copy on the page ("Hold
bounded operating discipline."), so the site was least legible exactly when the model was least
sure. And an approvals-committee register that assumed a board, a CEO, a finance lead and a
Mon/Thu operating review, printed into the Slack brief.

Two findings were worse than wording, and shipped first on their own
(`tests/exportsCarryNoFixtureCompany.test.ts`): the Slack brief carried a "Financial implications"
block computed from a hardcoded company (13 months of runway, $700k burn, growth-stage B2B SaaS)
with nothing marking it as a sample, in the artifact that travels furthest; and the board annex
asserted, under "Prepared for the Board of Directors", that management had "backfilled
revenue-critical roles only" and "preserved forward cash buffer above 18 months". A published
field with no reading behind it, twice more, both about the reader's own company.

The naming decisions live in `lib/report/AGENTS.md` as a table, and `tests/readerVocabulary.test.tsx`
holds them the way the suppression census holds its numbers: it renders every route that renders
offline and runs every export, alert and email builder, bans the words that are never a reader's
(engine keys, `tightness`, pipeline/payload/cache/override, hysteresis/whipsaw, the fixture
company), and ratchets the ones that have a place somewhere (`posture`, `regime`, `bounded`,
`board`) against an inline baseline that may only fall. Abbreviations may appear only after their
expansion on the same surface. `<code>` is stripped before counting, because an API signature on
`/api-docs` names the parameter the API takes.

What the guardrail cannot see, recorded here: `buildTrustStatus` still computes `approvalBuckets`,
`recoveryPlan`, `outageExitGate` and `decisionImpactWindow`, threaded through `homePageAssembler`
into the page contracts, and nothing under `app/` renders any of them. Their strings were rewritten
along with everything else, which is the wrong fix for a field nothing draws; they belong to the
"published field with no reading behind it" class above and should go.

## What a page says against what the rest of the site says (2026-09-17)

Found by rendering the routes and reading them — `bun run ui:shots` against a dev server, then
looking at the PNGs — rather than by reading source. None of these is a lint finding, a type error,
a failing test or a dead export, and the suite was green through all of them.
`tests/pageReaderContradictions.test.tsx` pins each one.

- **`/history` said "Reading now" over a month-end reading.** Every figure on that page comes from
  the monthly series, so the last plotted point is the last *completed* month — up to five weeks
  behind the weekly call and regularly a different regime. The panel beside the phase map was headed
  "Reading now", and `TrackRecord` said "The call has been Sunny since Dec 31, 2025", so on a week
  the brief was calling Freezing, the page a reader visits to check the record told them the call
  was Sunny. Its own "Published weekly briefs" panel, two sections down, led with *Sep 15 — Freezing*.
  The honest version already existed on `/signals`, over the same series: "Month-end readings from
  the archive, so the latest figure here is the last completed month rather than this week's score
  above." That sentence is on `/history` now, the panel is headed "Last completed month", and the
  track-record line is bounded ("Through Aug 31, 2026, the month-end call had been…").
- **`/resolve` rendered every answer row as two underlined lines**, so eleven links read as
  twenty-two. `app/styles/decision-flow.css` already carries the fix and the argument for it, from
  when the same thing happened on `/answer` — but it keys on `a:has(p)`, and this list was built with
  `<span className="block">`. The anchor's own `no-underline` lost, exactly as the comment three
  lines below predicts ("the anchor rules above are unlayered, so they beat Tailwind's
  `no-underline`"). **A CSS rule that keys on an element name is a contract with the markup**; the
  three lists there are `<p>` in a grid now, with the title as the anchor's own first child.
- **`/trust` restated its section description as the first line of the section**, so the reader met
  the same sentence twice before anything new. And its rail offered "Sources" and "Sources &
  freshness" as neighbours, where the second opened a section headed **"Cite this call"** — a label
  naming neither its destination nor anything distinguishable from the entry above it. Rail labels
  are the section titles now. The test only pins distinguishability: a first version also required
  each label to share a word with its heading and failed on "Revisit triggers" → "What would make
  this recommendation wrong?", which is a good short name. A test that fails on a correct label is
  answering a different question from the one in its name.
- **`/pricing` told a reader their recorded decisions stay in their browser.** `/privacy` 2.4 says
  they are held in Cloudflare KV against the browser identifier, which is the truth; the pricing
  bullet bundled them with week close-outs, which *are* local, and called both "saved in this
  browser". Understating where a reader's data goes is the direction that costs trust, and these two
  pages are read by the same person for the same reason.
- **The mockup's copy button handed over an unmarked sample.** `/mockups/*` is gated off production
  by `app/mockups/layout.tsx` and only runs on the preview lane, which the audit initially missed —
  the route is not the problem. What left it was: the copied text was branded "Whether" and carried
  a posture, an action and a pause condition, so in a channel it read as the Monday brief. It leads
  with a SAMPLE line now, the same rule `tests/downloadableResourceArtifacts.test.ts` holds for the
  downloadable artifacts.

## The three left open, closed 2026-09-18

- **`/history` painted its whole chrome in the archive's newest regime.** The accent
  (`regimeAccentStyle`, on the page shell) is the hue every section rule, eyebrow and the mobile
  outline draw in — the site saying what the weather is — and `/history` fed it
  `trackRecord.currentRegime`. So the page rendered Sunny throughout on a week the brief was calling
  Freezing, and a reader one click from `/` watched the site change its mind. The status line still
  names the archive's regime, which describes the numbers on the page; the accent is neutral now.
  `tests/regimeColourContract.test.tsx` already carried the principle and the exception — "/history/compare
  is the one exception by design: it shows two weeks, and keying it to either would mislead" — so
  `/history`, which shows 176 months and counts all four regimes in a panel of its own, is the
  second exception rather than a new rule.
- **`startupClimateIndex` is gone.** It was computed on every build, carried into the weekly
  decision card's `diagnostics`, and rendered by nothing. A *field* rather than an export, so
  `check:dead-exports` could not see it — and `tests/homeBriefModel.test.ts` asserted on its score
  and its four breakdown rows without ever asking whether a reader could reach it, which is the
  mechanism that kept the four features above alive. `docs/adoption-driven-change-plan.md` had
  already put the choice as "surface it or remove the computation entirely"; surfacing it would have
  meant inventing the surface.
- **`review:hotspot-preflight` could not read a merge commit.** Its default range was `HEAD~1` — the
  first parent, which on "merge the base branch into this PR" is the *pre-merge branch tip*, so
  every line the base brought in read as newly added. Merging `main` on 2026-09-17 flagged an `as`
  cast that had been on `main` for a day, and the merge that resolved that PR's conflict could only
  be pushed with `SKIP_PREPUSH=1`. A merge now scans `HEAD^2...HEAD`: the second parent is the
  branch merged *in*, so the range is this branch since it last agreed with the base. Checked
  against the commit that misfired, the first parent surfaces seven lines of the base's own code and
  the new range surfaces none.

  **The first version of that fix was worse than the bug**, and the shape is worth keeping. A
  three-dot range ignores the working tree, and every branch cut from this repo's `main` starts at a
  merge commit — so scanning only the merge range made a fresh branch's uncommitted edits invisible
  until its first commit. The default mode's whole value is that it sees uncommitted work. It scans
  both ranges now, and the printed line names both.

  Left alone, deliberately: `isUnsafeAssertion` does not strip template literals, so prose in a
  backticked assertion message can still trip it (this session hit "…as one of them" and reworded
  the message). The comment there states the reason — `${...}` can hold real code — and blanking the
  literal text without blanking interpolations is a change to a matcher, not to a range.

- **The pre-push preflight reviewed the wrong range (2026-10-02).** Its default — last commit plus
  every uncommitted edit — is right for a working `bun run check` and wrong for a push, on both
  ends. The push may carry several commits, and the preflight is not part of the deploy gate
  (`check:vinext` omits it), so commits 2..n of a multi-commit push were reviewed nowhere: a risky
  file change or an `as` cast buried one commit back sailed through both gates. And on this repo's
  shared working tree, the uncommitted half of that range belongs to whatever concurrent session is
  editing at push time, so the gate failed on work the push did not contain — the same failure the
  hook's own caveat warns about, now removed for the check that can be scoped precisely.
  `.husky/pre-push` reads git's stdin plan (`<local ref> <local sha> <remote ref> <remote sha>` per
  ref) through `scripts/pre-push-range.mjs` and exports the remote sha as `REVIEW_HOTSPOT_BASE`.
  A new branch, a deletion, and a manual run print nothing and keep the default base; a remote sha
  the local repo has never fetched fails verification and falls back the same way, so every way
  the scoping can fail costs a wider scan rather than a skipped one.

- **The preflight has one comparison (2026-10-07).** It had grown three: the default (`HEAD~1`
  plus the working tree, or `HEAD^2...HEAD` plus the working tree on a merge), `--base` (a
  three-dot commit range that saw no dirty tree) and `--working-tree`, each with its own printed
  description, for a check that is a filename regex and an `as`-cast grep. It is now `git diff
  <base>` against the working tree, and the base is the merge-base with `main`, `HEAD~1` on `main`
  itself, or `--base`/`REVIEW_HOTSPOT_BASE`. The merge-base covers both earlier findings at once: a
  branch is judged on everything it changes however many commits that is, and a merge commit's
  first parent is never the base. What it gives up is the pre-push hook's blindness to other
  sessions' uncommitted edits; the hook's own caveat covers that, and `git status` says whose it is.

**Two findings from that audit were wrong and are recorded here as such.** The mockup route being
publicly reachable — it is gated, and the gate has its own recorded argument. And `/operate` showing
four of six sections collapsed: `resolveInitialOpenStepIds` opens the first step plus anything
marked `defaultOpen`, and the comment above it records why the page moved *away* from opening
everything. Rendering a page tells you what a reader sees; it does not tell you whether someone
already decided that on purpose. Read the component before calling a default a defect.


## What the site says is new, said once (2026-10-01)

Asked whether the site knew its own contribution, a read of the live routes found five candidates,
each presented as the core on its own page: the act / pause / resume format (`/about`), "the whole
method" with an unattributed healthcare origin (`/trust`), the self-graded record (`/history`,
`/calibration`), a product-essay index under the eyebrow "The record" (`/concepts`), and agent
guardrails (`/llms.txt`). The answer the site now gives everywhere, starting from `/about` → "What is
new here": **lines decided before they are needed**, and **a record that grades itself**. The inputs
are explicitly *not* the contribution.

The same read found claims about the model that its own formula page contradicted, which is the
reason the novelty question was hard to answer: `/about` said six signal families were "scored into"
the conditions, but inflation and unemployment enter neither score (they feed the policy layer and
the `/signals` tabs) and public software valuations enter nothing. `/trust` placed operating
latitude on a homepage that stopped drawing it, and defined confidence in raw points while
`resolveDistanceToFlip` counts a risk-appetite point as 4.5 — so a week with risk appetite 6 points
from its line read "High" beside a ladder whose Medium band ends at 12.

`tests/pageReaderContradictions.test.tsx` → "the site gives one account…" pins each. When a page
describes what the scores read, check it against `/trust#formula-reference`, which imports its
constants from the engine; prose elsewhere does not.

## Two flags for one claim (2026-10-01)

On the week of Sep 29, 2026 (Freezing, funding pressure 90, risk appetite 44) the homepage trust
strip said "Could change next week: Not expected" and line 4 of `/brief.md` said "Conditions could
change next week". Both were reading a real flag. The strip read the engine: a score inside its
5-point near band, or a change held for its confirming reading. The brief read the homepage
model's `transitionWatch`, a second rule: 8 points on the one-scale distance, *or any change since
the month-end comparison*. The call had moved from Sunny to Freezing since Aug 31, so that flag stayed
on all month, although the change had already passed its confirming reading and said nothing about
the next one. The two rules also disagreed the other way: 3 raw points from the risk-appetite line
is inside the engine's band and 13.5 on the scaled distance, so the strip said Yes and the brief said
"not close to changing".

`couldCallChangeNextWeek` (`lib/report/trustStatus.ts`) is the one rule now, and the home model's
`transitionWatch` is computed from it, so the brief, the memo lines, the change-watch row and the
exports that read the model all agree with the strip. **When two surfaces print the same claim,
trace each to its flag before you choose a wording.** The words differed only because the flags did.

The same brief's provenance section printed "**Action:** Safe to use for near-term planning; proceed
with normal approval flow." under "Freeze new commitments and protect runway". The line described
the data, but it carried the decision contract's own label for the operating action. It is
`DATA_CAVEAT_LABEL` now, and on live data it reads "None."
`tests/pageReaderContradictions.test.tsx` renders `/brief.md` and the strip for three readings, and
checks that the provenance section uses no operating-action label.
