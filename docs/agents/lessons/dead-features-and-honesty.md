# Unshipped features, invented fields, and what surfaces claim

Moved out of `CLAUDE.md`. Read before adding a module, an API field, share/SEO metadata, a cache, or a warning banner.

## Features that shipped without shipping (2026-09-16)

Four things were built, tested, and reachable by nobody. They are worth naming together, because
**one mechanism kept all four alive: every ratchet here counts a reference from anywhere, and a test
counts.** An unshipped feature with a test is not a lint finding, not a type error, not a failing
test and not a dead export. It is invisible to the whole gate.

- **The first-time guide.** `FIRST_TIME_GUIDE_STEPS` (three steps, each with a worked example),
  `FIRST_TIME_GUIDE_HIGHLIGHTS` and `FIRST_TIME_GUIDE_NEXT_LINKS` sat in `reportCopy.ts` with
  `tests/reportCopy.test.ts` asserting there were exactly three steps and that each carried an
  example — and asking nowhere whether a reader could see them. They render now, collapsed, inside
  `FirstVisitExplainer`: that element is already the one thing on `/` addressed to someone who has
  never seen the page, and its own comment records what it cost the last time that spot grew a
  second block. Its first link pointed at `#executive-snapshot`, an id no page renders.
  Rendering it was not the end of it: tested only for being on the page, it kept naming sections the
  page did not draw ("Summary", "Proof", "Actions") and a stage-and-runway rule the picker under it
  contradicted, until 2026-10-08. A guide's test has to check its nouns against the page's.
- **`computeReliabilityScore`** averaged confidence as 90/60/30, an offline flag as 100/50, and a
  degraded-source ratio over `max(degraded + 3, 4)` into a 0-100 figure with three colour bands.
  Its own tests pinned MED at 87 and LOW at 77 with every source healthy, against bands calling 80
  green and 60 amber — so the whole confidence range landed between 77 and 97, LOW read amber, MED
  read green. Deleted, not recalibrated: the site publishes a confidence label and, since the
  archive study, the record behind it.
- **The operator feedback pipeline.** `scripts/ingest_operator_feedback.py` (545 lines, the only
  Python here), `data/cohort_feedback.json` (31KB, eight named operators over six weeks), and a
  suite in `tests/tools/` — the one directory the deploy gate drops. No npm script, no route, no
  reader. It could not have been real: the published archive holds one week because the weekly
  routine has never completed a good run, so a six-week feedback cadence never happened. A
  committed file of named operators reads as evidence, which is why it went rather than stayed.
- **`data/concept_conflicts.json`**, which principle wins under which regime — a good idea, wired to
  nothing, referencing slugs no content carries and whose `/concepts` routes are in
  `retiredSitemapPaths`.

Also removed: the `ReturningVisitorDeltaStrip` fallback, whose default `impactLinks` and
`openPanelHref` named four ids nothing renders. The one caller passes its own, so the defaults never
shipped — dead anchors kept alive by never being reached. Both props are required now.

`check:dead-exports` grew the data-file scan above as a result. The export half still counts tests,
by design, so **this class can recur for code**: if you are adding a module whose only caller is its
own test, you are adding one of these.

## The rest of them (2026-09-17)

The module census above found nine more, and the split it draws is the useful part: three modules
`scripts/` imports (`answerLaunchReadiness`, `pageMetricsFromTelemetry`, `summaryArchive`) are alive
— a CLI is a consumer — and nine had no consumer but their own test.

- **`lib/export/issueTrackerBrief.ts` was wired up rather than deleted.** Its own doc comment says it
  was extracted from `exportBriefPanel.tsx` so it could be tested; that panel was later deleted, and
  the extraction survived it. It takes the same four arguments as the Slack brief, and `/share` is
  the page that owns copy formats, so it is a fifth card there now.
- **`lib/runtime/boundary.ts` was the instructive one.** Its `config` getter resolved `cronSecret`
  and `siteUrl` its own way, and production resolves both elsewhere — `lib/api/cronAuth.ts` and
  `lib/siteUrl.ts`, the latter reading `NEXT_PUBLIC_SITE_URL`, not the `SITE_URL` the boundary read.
  So the only test of "how config resolves" tested a third, divergent copy against the wrong
  variable. Its `ensureDurableStorage` promised to refuse a "silent in-memory fallback" that nothing
  consulted, and **"Invariant 6: Production writes fail if durable storage is missing" proved it by
  calling a fixture it had just defined** — an object literal, installed through
  `setRuntimeBoundaryForTesting`, asserted to throw from its own method. No production code was
  involved.

  What the code does is the opposite: `getOperatingSnapshotStore()` falls back to
  `InMemoryOperatingSnapshotStore` when no KV binding is present, in production as anywhere else, so
  the write succeeds and goes nowhere durable. Invariant 6 pins *that* now, and says so. Whether it
  should refuse instead is open — this repo has paid for silent fallbacks before — but that is a
  change to a write path, not a cleanup.
- **Deleted, each for its own reason**: a second Slack dispatcher (`lib/webhooks/`) beside the one
  the cron runs; an "official TypeScript SDK" that is not published and duplicates `/api/mcp` and
  `/api/agent`; `DecisionPlanStressTester.tsx`, 425 lines superseded by `PlanStressTestMode` in
  `decisionShieldPanel`; `transitionProbability.ts`, whose own comment said it was "kept for model
  analysis and tests; not rendered as a user product surface"; `reportNarrative.ts`, `sectorOverlays.ts`
  and `whetherToShipChecklist.ts`, each of which needs a surface that does not exist, and inventing
  one is what the first-time guide's history argues against.

Five exported *types* fell out as orphans once those modules went, and were de-exported rather than
deleted: each is still used inside its own file, and each had been kept "referenced" only by the
deleted module naming the same identifier.

## What the census still could not see (2026-09-17)

Four more, each invisible to every ratchet for its own structural reason. The pattern worth carrying:
**the census measures exported symbols in `app/`, `lib/` and `worker/`, so anything that is not one
is unmeasured.**

- **A route is not an export.** `GET`/`POST` are framework-exempt by name, so an API route nobody
  links, fetches or documents scores zero findings forever. `/api/company` (a public, rate-limited
  proxy to a keyed upstream, no consumer, absent from `/api-docs`) and `/api/posture-state` (an
  unauthenticated GET of full posture state, plus a cron-authed POST that appended the same
  committed transition `refreshOperatingState` already appends inline every run) are both gone.
  `appendCommittedPostureEvent` went with the route it existed for.
- **`/api/sync` was the same hole with a write on the end**, and had been *knowingly* kept:
  `docs/feature-specs-current.md` recorded it as "stays, tested, with no client". Unauthenticated
  POST, caller-chosen id and secret, 24KB into KV with no rate limit and no TTL, for two key names
  (`whether-company-metrics`, `whether-decision-log`) naming a module deleted the same day and a key
  nothing has ever written. `/privacy` 2.3 promises everything but recorded decisions "stays in your
  browser and is never sent", which was true only because nothing called it — and
  `tests/privacyPolicy.test.tsx` enumerates `STORAGE_KEYS` and `TELEMETRY_STREAMS`, neither of which
  a server-side write path appears in. A tested endpoint with no client is not a dormant feature.
- **A barrel is referenced by construction.** `lib/report/index.ts` was eleven
  `export * as x from "./x"` lines, imported by nothing except `packages/decision-engine`, whose
  entire content was `export * from "../../../lib/report/index"` and which nothing imported at all.
  The scan could never have found it: a namespace re-export always spells its own filename, so every
  file importing `./decisionKnobs` reads as a reference to the barrel's `decisionKnobs`. Both are
  deleted and `packages` is no longer a reference root.
- **`reports/` is not `data/`.** `reports/OPERATOR_COHORT_6_WEEKS.md` — eight named operators with
  companies, stages and runway months, "100% cohort retention", a 22.9-second median read — survived
  the purge of the operator-feedback pipeline, because `censusOrphanedDataFiles` walks `data/` and
  `content/`. It was the most evidence-shaped of the three files and the one left behind.

**A dead `#anchor` is the link version of this, and the landmark audit now catches it.**
`inspectInPageAnchors` reads every `href="#…"` and every id off the same served response for all 31
routes, and `collectUnresolvedAnchors` judges them **across routes, never per page**: a link fails
only when *no* audited route renders that id.

Both halves of that were paid for. Reading only literal HTML called the skip link dead on five
routes, because a streamed route's `<main id="main-content">` arrives escaped in the flight payload —
the same reason `inspectMainContentHtml` already consults it. And the first version judged per page,
which went green here and red in the container: plenty of targets render only under a condition —
a section that needs figures entered, a banner that needs degraded data — so "this page links to an
id it is not currently showing" is a claim about the data a route got, and the container's data is
not this box's (it reaches Treasury and often FRED; a sandbox reaches neither). "No page renders this
id" is a claim about the code. It is also the claim that catches the real cases: all four anchors
found by hand rendered on no route at all.

One real finding survived: `/operate/financial` offered nav chips for `#ops-runway-risk` and
`#ops-board-memo`, neither of which exists until figures have been entered. The empty state carries
the risk id now (exactly one branch is ever in the DOM, so the anchor always lands, on the message
saying what is missing), and the board-memo chip is gone — it sits behind a second toggle, so it
could never be a stable target.

## A cache is only honest where the label is (2026-09-17)

`public/sw.js` caches every same-origin document and serves the last copy when the network is gone;
`OfflineNotice` names the record date of what is on the screen. The worker shipped caching every
route and the notice shipped on `/` alone, so `/trust` — the page the IA points a reader to "when
you want to sanity-check the brief before a big decision" — served a previous visit's readings with
nothing saying so. The notice is mounted in `app/components/reportShell.tsx` now, which every
reading route but `/` is built on, and it takes the record date the shell already has, so the claim
stays true by construction.

The rule: **a route that renders a reading carries the notice; a route that does not — the glossary,
`/privacy`, the API docs — needs nothing**, because a cached copy of those makes no claim that can go
stale.

## What the site says about its reader (2026-09-17)

`/privacy` did not exist. The footer carried Terms and an Acceptable Use Policy, and **every use of
the word "data" in both means market data** — twelve sections of Terms including "Fees and Payment",
and nothing about the person reading. Meanwhile the product holds subscriber addresses with
verification tokens, the email Stripe reports for a paying customer, a per-browser identifier the
server reads back (`x-whether-client-id`) to scope saved decisions, one cookie, nine browser storage
keys and eight telemetry streams.

The gap was worse than a missing document, because `/pricing` published **"No signup, no key, no
trackers"** and the code is genuinely built to honour it: the search payload has no field that could
hold the query text, the acquisition bucket drops the referring URL, the intake refuses an
unexpected key, and the fonts are self-hosted. A claim a reader cannot check is worth less than the
work behind making it true, and there is real work behind this one — so `/pricing` linked to the page
from the promise itself. (`/pricing` went with the paid tier on 2026-10-14; `/privacy` section 1
states each part of the promise now.)

**The page is an inventory, and `tests/privacyPolicy.test.tsx` keeps it one.** Every `STORAGE_KEYS`
entry and every `TELEMETRY_STREAMS` entry is claimed there by the section that accounts for it, so
adding a storage key or a stream without deciding what a reader is told fails the suite. The registry
is hand-written on purpose: the point is that a person looked at the new key and said where it
belongs. It also checks the absences the page asserts — "no third-party analytics" is the kind of
sentence one added `<script>` makes false.

## A published field with no reading behind it

Three cases now, and they rhyme. `RegimeDiagnostics` published a distance from a threshold as a
weekly move (below); the confidence percent published distance as a probability; and on 2026-09-17
the embed API was found publishing `reversalCondition` as the literal **"Two consecutive weeks of
confirming signals"** — the same sentence every week, in every regime.

The embed case is the one worth remembering for where it hid. The field is returned only by
`format=json` and rendered by neither the HTML nor the text format, so nothing on any page could
have looked wrong; its only consumer was an integrator reading it as a fact about this week's call.
The real value was in scope the whole time — `reversalCondition` and `triggerThreshold` are
non-optional siblings of the `areaActionNow` the route already maps — and `flipTrigger` fell back to
"Monitor economic indicators", advice no reading produced. Both fields are nullable now, so a
consumer can tell "no condition published" from a condition.

**A surface nothing renders is where invented data survives longest.** When a route returns more than
it draws, the undrawn fields are the ones to check.

**A fourth case, and the one with the widest reach (2026-09-17): "stable" was manufactured from
absence.** `buildReportDynamics` returned `directionLabel: "stable"` when handed `previous: null`,
and the loader's fallback dynamics said the same — so *no comparison happened* and *a comparison
found nothing* arrived downstream as identical inputs, a zero severity delta and an empty
changed-signal list. Every renderer read the second meaning. A degraded read published "Conditions
held steady this week. Last week's calls stand." as the homepage's movement line, and
`postureDeltaLabel` rendered "No worse than last week" — onto the OG share card, which is the copy
that travels furthest. The snapshot path was worse: `lib/operatingState/snapshot.ts` passes
`previous: null` unconditionally, so every `OperatingSnapshot` claimed a stable week.

The fix is a fifth direction rather than better wording, because the distinction has to survive
being passed around: `"unavailable"` on `ReportDynamics["directionLabel"]` and on `RegimeMomentum`.
Widening the union is what enumerated the work — the compiler named the sites, and the ones it could
not reach (a `Record<string, string>` copy map, a `titleCase` interpolation, a zod enum that would
have *rejected* the degraded payload) were found by following the same field. `weeklyMovement.score`
is `number | null` for the same reason a missing distance is not zero. `tests/noComparisonHonesty.test.ts`
pins both halves: nothing claims a comparison when there was none, and a real comparison still says
what it found.

## Written for third parties, resolved like it (2026-09-17)

The embed is the one surface that renders inside somebody else's page, and it wrote the production
origin in three times: the snippet a reader copies off `/share`, `buildWhetherBriefUrl` (which
supplies the two links every embed carries), and `public/embed.js`. So the preview lane's embeds
advertised production — **the one surface you would use preview to check was the one preview could
not check.** The first two resolve through `lib/siteUrl` now, which `app/api-docs/page.tsx` already
did for the identical snippet; the script cannot import anything, so it reads its own `<script src>`
and keeps production as the fallback.

This is `tests/feedRoute.test.ts`'s rule, which had never been carried past the feed: on production
the hardcoded literal and the configured default are the same string, so no rendered assertion can
tell them apart, and the lane where they differ is the one this suite never runs in. Those
assertions are source reads and say so.

**The rule stopped at the embed, and the embed is not the only surface written for someone else
(2026-09-17).** `/api/mcp` hardcoded the production origin in the `_links` block and in
`mcp.endpoint` — the discovery payload, so preview told an agent which URL to call and named
production. So did the "Open the brief" button on both the weekly Slack post and the regime-change
alert, the weekly email's four links, and `app/brief.md`'s footer. All resolve through `lib/siteUrl`
now. `lib/fred.ts` and `lib/github/repoClient.ts` keep the literal on purpose: a `user-agent` names
who to contact, not where this deployment lives.

## What a shared link previews as (2026-09-23)

An audit of every sitemap page's `og:image` found the share cards were the one surface no check
read. 113 pages, the privacy policy and all 82 archive periods among them, previewed the *live
weekly card*, because a page that passed no image settings got the bare `/api/og`, so a link to 2014
showed this week's reading. `/pricing` previewed nothing, and `/share` and `/api-docs` previewed as
the homepage (its title and URL): all three set `openGraph` by hand or not at all, and Next replaces
that object rather than merging it. The cards themselves carried "boldness" (retired), "Canonical
ingestion" (banned), a `≤` the font subset lacks, a second row drawn below the canvas, and a compare
headline whose sign ran backwards.

What holds it now: `buildPageMetadata` gives a page with no settings a card of its own title and
description, and the live card is something a page asks for (`template: "report"`: `/` and
`/share`). `/api/og`'s logic lives in `app/api/og/renderOgElement.tsx`, outside the route, so tests
can read any card; `tests/shareCardCoverage.test.tsx` walks the sitemap to every page's card, and
`tests/readerVocabulary.test.tsx` holds every distinct card to the bans. **Give a new page its
metadata through `buildPageMetadata`**, and name a template if the plain card is not the right one.

**Drawn for the size it is seen at (2026-09-23).** A feed shows a card at about 500px wide, so
everything prints at ~40%. The weekly card had twelve boxes and chips with most labels at 13–17px,
about 6px in a feed; it is five blocks now with nothing under 20px. The static templates spent a third
of the card on a side panel that said the same thing on every page of a template ("THE RECORD / A
closed period" on all 83 archive cards); a page can now pass its own `panelLabel` / `panelTitle` /
`panelBody` (all three or none) and a `mix` bar. Archive periods carry their reading count, mix and
how often conditions changed; signal hubs this week's figure; scenario pages this week's action for that decision —
the live ones only from a read that is current, because platforms cache a card for days.
`tests/shareCardContent.test.tsx` holds the type floor, the panels and the gates.

## What a crawler receives (2026-09-23)

A crawl of every sitemap URL against a local server, reading what each response actually carries
rather than what the metadata code intends, found gaps none of the SEO suites could see:

- **Metadata streamed into `<body>` for Googlebot and every AI crawler.** A page whose
  `generateMetadata` awaits the report read (every answer page, every published week) sends its
  title, description, canonical and OG tags after the content — 43KB in on an answer page — unless
  the user agent is on the framework's "HTML-limited" list, which names the social unfurlers and
  Bing and omits Googlebot and every crawler `app/robots.ts` names. Google ignores a canonical
  outside `<head>` in the HTML it fetches, and the retrieval crawlers do not run JavaScript.
  `htmlLimitedBots` in `next.config.js` now adds them; `tests/htmlLimitedBots.test.ts` fails if
  robots.ts names an agent it does not cover. Check with `curl -A Googlebot` — a browser fetch
  shows the streamed version, which is correct for a browser.
- **Fifteen sitemap URLs had no inbound link.** The signal hubs' own comment called the scenario
  pages their children and never linked them. `tests/crawlPaths.test.tsx` holds it.
- **Breadcrumbs as data.** Eleven routes drew a trail and two described one, one of them a
  different trail. `<Breadcrumbs>` now emits the BreadcrumbList from the items it draws.
- **`lastmod` was one constant**, 2026-02-01, on fifteen pages, twelve of which did not exist then,
  and on five that change weekly. Undated static pages now omit it; weekly pages carry the read's
  date, `/history` its newest entry, resources their own `updatedAt`. A resource's `updatedAt` in
  `content/resources/*.json` has to move with its copy — it is the sitemap date and `dateModified`.
- **Five lookalike Organization nodes** (a name, sometimes a URL, no `@id`) are the site entity by
  id now, and the RSS feed moved out of `sitemap.xml` into a second `Sitemap:` line in robots.txt.
- **The allow list was checked against one of three documents (2026-10-27).** robots.txt opens
  `/api/` paths by name, and `tests/robotsRoute.test.ts` held that list to `/llms.txt` alone. The
  agent manifest and `/api-docs` advertise API paths too, so seven manifest endpoints and most of
  `/api-docs` (scores, comps, the images, the slide file, the embed) were advertised and disallowed
  at once. The test reads all three now. An endpoint that should stay closed leaves the document
  instead (`/api/health` left the manifest), and an open path opens every path it is a prefix of,
  so a closed neighbour (`/api/weekly-digest` beside `/api/weekly`) needs a Disallow line of its own.

## A warning that is always on (2026-09-23)

Every page showed **"Sources: Partly cached"** in warning amber on every visit, production
included, and `/signals`, `/operate` and the answer pages told the reader to "hold anything you
can't undo until every source is current". `buildDegradedSourceRows` counted every source that was
not live, and "Startup/private markets" is a curated snapshot by design (`supportsLive: false`,
45-day window) that is never live — so the condition could never clear. `/trust` read the same
data and said "No warning is active… Fine to act on this week" under a header saying the opposite.
A row now carries `expectsLive`: a live-by-design source is degraded when it is not live, and a
snapshot-by-design one only when it is past its own window. It was the first thing a new visitor
was told about the data, and a warning that never turns off is one readers learn to skip on the
week it is true. `tests/sourceHealth.test.ts` holds all three cases.

## One runway setting (2026-09-23)

`/` had two "cash runway" settings: the header pill and section selector (a cookie the server
calibrates the guidance to, bands <6 / 6–12 / 12–24 / 24+) and a picker in the runway-notes panel
(the browser profile, bands under 6 / 6–12 / 12–18 / 18+). Neither updated the other, and they were
half-linked in the worst way: choosing a band wrote its representative figure into the profile, so
"12–24 mo — Follow the guidance" became "18 months" in the planner and the stress test, and 18
crossed the notes' long-runway line: "runway is not what limits you this week".

Now: the band (cookie) is the setting, and the notes branch on the band table's own boundaries.
Choosing a band writes no figure, and clears an entered one it excludes. An exact figure entered
on `/operate` moves the band (`syncRunwayBandToFigures` in `useOperatorProfile`). A band reads as
its range in the notes ("With 12–24 months of runway"), never as a number the reader did not give,
and burn arithmetic runs only on a real figure. The server-rendered default band produces no note:
it is shown as a default ("It shows 12–24 mo until you choose"), not as an answer.

The band lives in the cookie and never in the address: the selectors stopped writing `?runway=`
(which outranked the cookie and travelled in pasted URLs), and `RunwayServerSync` re-renders the page
when a band is picked. A typed figure moves the cookie without a refresh, because vinext's refresh
remounts the page's client components.

## An artifact that names itself

`public/downloads/quarterly-capital-posture-memo-example.md` was 310 bytes of empty headings —
`- Posture this quarter:` with nothing after the colon, five times — while being titled "Example"
and sold as "a memo example for board updates". A reader who already had the template downloaded the
same blank document under a second name.

The rule `tests/downloadableResourceArtifacts.test.ts` pins is asymmetric, and that is the point: a
file calling itself an example has no unfilled fields and says in the file that its figures are
illustrative, while the template and the checklist stay blank forms, because that is what those are.
A memo full of real-looking figures without that label is a live claim, and this repo already keeps
those out of static content.


## A period word in a label is a claim about the record's dates (2026-09-29)

"Last week" sat over the change since the previous Time Machine snapshot for as long as the comparison
existed, on the page, in `/share`, in Slack and in every paste. That snapshot is the last month-end: the
Sep 18 and Sep 25 reads both compare with Aug 31, so "last week 63" was a number from four weeks back. The
cache is monthly, the label was written for a weekly one, and nothing tied the two together.

A word for a period ("last week", "this month", "since Monday") is only as true as the dates behind the
figure, so it comes from them: `ReportDynamics.comparedWith` carries the earlier reading's date and
`comparisonBasis` (`lib/report/comparisonBasis.ts`) is the one place it becomes words. A new surface that
prints a comparison takes its label from there. Where a source has no date the wording stays "last week"
rather than inventing one, which is also how a test can tell the two paths apart. Full account: `docs/feature-specs-current.md` §1.1.26.

## A list written five times drifts, and a set an endpoint does not know is not an empty one (2026-09-29)

Driving the site as an agent (every surface, from a cold start) found the tool list in five places, no two
alike: the remote MCP server had twelve tools, the local one five under another server name, the GET
catalogue six, `/api-docs` five, and the discovery manifest, which the guide said listed "MCP tools", listed
none. Each was written by hand when it was added. A tool added to one was missing from the rest and nothing
said so, and `/api-docs` claimed "every MCP tool also answers a plain GET" while five did.

Same family, found the same way: `get_context` with `SUNNY` (the page's own word) answered zero weeks active
as a success, an unknown `?tool=` answered the brief with a 200, an unknown cadence became weekly, and a
score of `0` was refused as missing because it was tested for truth. Each returned something plausible for
input the server had not understood, which is worse than an error: it reads as a finding.

- **A set of names a caller can use is generated from the thing that serves it** (`lib/agent/tools.ts`, one
  definition per tool: the transports, the GET shim, the manifest, `/llms.txt` and `/api-docs` all read it),
  and `tests/agentDiscoveryParity.test.ts` holds every place that must name one to it. The same went for the
  CLI's completion scripts, which listed the commands by hand and had lost `agent`.
- **Refuse what you did not understand, and say what would have worked.** `lib/agent/inputs.ts` accepts a
  regime by key or by the site's own word in any case, treats empty as absent, and answers anything else
  with the allowed values. An argument the tool does not take is named, because a tool with defaults turns a
  typo into a plausible answer to a question nobody asked.
- **A default that fills what the caller left out says so.** `get_context` and `get_projection` return
  `inputs` with `given`, `today` or `assumed` against each value.
- **Making a call easy makes its answer the one that gets read, so audit what it returns first.**
  `get_projection` with no arguments (today's scores at today's pace: "if the trend continues, when do
  conditions change?") was the one call defaults made trivial, and it reported a crossing within a week on a
  read where both scores were moving deeper into their regime. The function behind it ignores direction and
  also drives a Slack alert; the tool now asks a direction-aware one (`projectRegimeFromPace`), and the alert
  is left for the owner (`docs/feature-specs-current.md` §6.9).
- **A field that reads the wrong thing under the right name stays wrong on every surface that copies it.**
  `summary.confidence` was the engine's confirmation gate, not the published confidence, and three routes
  carried it. `/api/weekly` and `/api/monthly` kept it until 2026-10-06, when the summary builders moved to
  the published label; the archives follow on their next regeneration (`docs/feature-specs-current.md` §6.9).

## A "what changed" sentence is a claim about the decisions, and it needs the lines to make one (2026-09-29)

The archive froze "Pressure increased by +3.0 this week. Slow new commitments until conditions stabilize." on
two consecutive weeks, beside guidance that said "freeze new commitments". The number was in a unit nothing
else used, the instruction was the sentence's own and disagreed with the guidance under it, and "this week"
was Aug 31. It was correct about one thing (the score rose) and useless for the reader's question, which is
whether anything crossed a line. A move of eight points while already past a pause line changes nothing to do;
a move of one point through it changes what four areas should do. Direction and size cannot tell those apart.

- **Derive "what changed" from the same lines the table prints, through the same predicate**
  (`lib/report/decisionMovement.ts` uses `isRuleConditionMet`), and give every surface that says it one
  function. There were three sentences for it (`weeklyMovement.summary`, `decisionShiftSummary`, the table's
  "Changed" cell) and each named a direction and prescribed an action.
- **A sentence that prescribes belongs to the guidance, not to the change.** "Slow new commitments" was true of
  no week in particular.
- **A claim about the market state needs both of its sources to agree.** The earlier state is what the earlier
  scores classify into; the current one is the assessed state, which can be a step behind its own scores while a
  change waits on confirmation. A fixture whose regime did not match its own scores produced "conditions changed
  from Stormy to Cloudy" on a week with no move at all. When the two disagree the sentence says nothing about the
  state, because a change from one to the other would describe a pair nobody assessed.
- **A number read from a widened type must still read the list the big moves land in.** The homepage model is
  handed a looser `reportDynamics` than the loader's, and reading `changedSignals` alone treats a move past
  the weekly sanity limit (the largest ones) as no move: the same defect `tests/lastWeekDerivation.test.ts`
  records for the page, reproduced one layer down. `SignalDynamicsSource` types what the read needs.
- **An earlier month is one outcome from one starting point.** "By Dec 2022 the scores stood here" reads as a
  forecast unless the card says the change it matched was a different one (Stormy to Freezing, not Sunny to
  Freezing) from very different scores (risk appetite 7, not 43).

