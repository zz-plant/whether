# SEO and semantic-matching audit — missed opportunities (2026-09-10)

Scope: indexation, structured data, and query-to-page matching across the rendered site.
Method: static read of `app/`, `lib/seo*`, `lib/search/`, `content/`, plus head/JSON-LD captured
from a local `bun run dev` server at `127.0.0.1:3000`. Findings marked **verified** were observed
in rendered HTML; findings marked **read** come from source only.

## Status

Findings are recorded as they were found. Every one of them is now closed; where a fix
differs from the remedy this document proposed, the row says so. Status as of 2026-09-15.

| Finding | Status |
| --- | --- |
| A1 — four pages canonicalising to the homepage | **fixed** — root-layout canonical and `x-default` removed, self-canonicals added, pinned by `tests/crawlableRouteContract.test.ts` |
| A2 — `/comps` renders nothing server-side | **fixed** — now a server component reading `fetchSaaSValuations()` directly |
| A3 — doubled brand in titles | **fixed** — `/share`, `/terms-of-service`, `/acceptable-use-policy` |
| A4 — `/history` has no metadata, canonical, or JSON-LD | **fixed** — metadata and self-canonical first; then a `CollectionPage` over a regime-history `Dataset`, with an `ItemList` naming all 82 archive periods and every published week (`lib/seo/pageStructuredData.ts`) |
| A5 — sitemap is four-fifths archive periods; two indexable `/operate` pages submitted nowhere | **fixed** — the workstream map moved out of the page file so the sitemap can read it, the three signal watch hubs are submitted, and archive periods drop below every hub and live page |
| A6 — a data outage flips every live page to `noindex` at once | **fixed** — one rule in `lib/seo/freshnessIndexation.ts`, on the same 72-hour window the payload gate uses. A reading a few hours past its refresh stays indexed; the first failed fetch no longer de-indexes anything |
| A7 — `/api/mcp` disallowed while advertised | **fixed** — allow rule added, and `tests/robotsRoute.test.ts` reads llms.txt and checks every `/api` path it advertises against the allow list. The named-AI-crawler half stays withdrawn: the wildcard already permits them |
| A8 — no RSS autodiscovery, single-item feed | **fixed** — autodiscovery link in the root layout; one item per published week at its permalink, plus the live week until it is frozen |
| B1/B2/B3 — homepage entity graph discarded, non-ISO dates, non-schema `result`, unescaped serializer | **fixed** — the assembled graph now renders, dates are ISO, posture moved to `Dataset.variableMeasured`, `serializeJsonLd` is used |
| B4 — schema types the content supports and does not declare | **fixed** — `Product`/`Offer` on `/pricing` (paid plans `PreOrder`, which is what the page says), `Dataset` on `/comps` and `/history`, `WebAPI` on `/api-docs`, `HowTo` on toolkits, `Organization.sameAs`, and author/publisher/dates on the answer `FAQPage` |
| C1 — related answers filtered for a *different* category | **fixed** — ranked on shared `mappedDecisionAreas`, filtered to indexable slugs (`lib/seo/relatedAnswers.ts`) |
| C2 — answer descriptions are a function of the week | **fixed** — each page's own `shortAnswer` is the whole description now. The live action used to trail it, which still rewrote the snippet weekly; it belongs on the page and on the social card, not in a cached snippet. Same on `/signals/[cluster]/[scenario]` |
| C3 — the uniqueness gate cannot see the duplication it exists to catch | **fixed**, and not as proposed. Keying on the scenario is right, but keyed honestly the gate *failed*: the three watch pages for one scenario cited the same site-wide evidence under the same call. Each watch now cites its own signals' evidence (`evidenceKeys`), which is both what the page is for and the distinct data point the gate looks for |
| C4 — identical generic H2s across 11 answer pages; homepage H1 is `sr-only` | **fixed** — four of six answer headings derive from the page's audience, areas and threshold focus, with a test that no two pages share a set; the weekly call is the homepage `h1` |
| C5 — tier-two and tier-three keyword arrays read by nothing | **fixed** — removed from the content, the schema, and the exports |
| C6 — `/search` substring matching, always 308s, no query logging | **fixed** — whole-word matching (a non-matching query returned the *entire index* before, because `routePriority` made every score positive), a real results page with the old redirect offered rather than forced, and a `search` stream recording the routed job and match count. The query text is deliberately not stored |
| C7 — thin `noindex` cluster pages with payloads generated anyway | **fixed** — the three signal hubs carry their own reading and are indexable while live. The 51 `/resolve` and `/toolkits` cluster pages are retired: they rendered their parent's call, were hardcoded `noindex`, and had no inbound link. They redirect to their parents, and the builder enumerates only the 15 signal-scenario routes |
| C8 — `/resources` redirects away while six of its URLs are submitted | **fixed** — `/resources` is a real hub, and `tests/resourceHub.test.ts` asserts every `/resources` URL the sitemap emits is one the hub links |
| D — llms.txt claims `schema.org/Report` the homepage did not emit | **closed by B1** — the homepage graph emits `["Article", "Report"]`, so the claim is true. It was recorded as open after that landed; it was not |

Three things outside the original findings, found while closing them:

- The refresh loop in `docs/seo/refresh-loop.md` had no step producing `page-metrics.json`.
  `bun run seo:page-metrics` now does, and reads the window in narrowing time slices rather
  than refusing the whole run when one query hits the row cap.
- `organic_entrance` checked no referrer, so direct, paid and social visits were counted as
  organic — which inflated the traffic tier the refresh queue derives. The tracker sends a
  coarse bucket now; see `docs/seo/refresh-loop.md`.
- 556 exported declarations under `app/`, `lib/` and `worker/` were referenced by nothing, and
  nothing in the gate noticed. `bun run check:dead-exports` holds the count at zero.

### A note on how these landed

Five of the pull requests in the first pass merged at a stale head: commits pushed to the
branch before the merge were not in the merge commit. The cause was never established — the
GitHub webhooks named pre-rebase SHAs, and the branch tip at merge time did not match what
had been pushed. Until it is, two habits avoid it: keep a pull request to a single commit,
and after a merge verify with `git merge-base --is-ancestor <sha> origin/main` rather than
trusting the merge notification.

---

Below is the audit as originally written.

Note on the local environment: FRED returns 403 in a sandbox, so the report ran on the bundled
fallback snapshot. That flips the freshness gate, which is why `/answers/*` and
`/signals/*/*` were absent from the locally rendered sitemap and rendered `noindex`. Where a
finding depends on that, it is called out. Everything else reproduces regardless of data state.

---

## A. Defects that are costing indexation right now

### A1. Four sitemap-listed pages declare the homepage as their canonical — **verified**

`app/layout.tsx:108-110` sets `alternates: { canonical: "/" }` on the root layout. Next merges
metadata down the segment tree, so any page that does not set its own `alternates` inherits it.
Four pages do not, and all four are submitted in `sitemap.xml`:

| Page | Sitemap priority | Rendered `<link rel="canonical">` |
| --- | --- | --- |
| `/comps` | 0.75 | `https://whether.work` |
| `/history` | 0.70 | `https://whether.work` |
| `/share` | 0.65 | `https://whether.work` |
| `/api-docs` | 0.50 | `https://whether.work` |

A self-referencing sitemap entry whose page canonicalises elsewhere is the standard recipe for
"Alternate page with proper canonical tag" in Search Console — the URL is crawled and then dropped.
These four are asking to be de-indexed.

`app/comps/page.tsx` and `app/history/page.tsx` export no `metadata` at all, so they also inherit
the homepage `<title>` and `<meta name="description">` verbatim:

```
/comps    <title>Whether — Weekly Operating Call for Startup Leaders</title>
/history  <title>Whether — Weekly Operating Call for Startup Leaders</title>
```

Three URLs (`/`, `/comps`, `/history`) currently ship the same title, the same description, and the
same canonical.

`app/layout.tsx:176` compounds it: `<link rel="alternate" hrefLang="x-default" href={siteUrl} />`
is hardcoded in the layout, so **every** page also declares the homepage as its x-default.

### A2. `/comps` renders none of its content server-side — **verified**

`app/comps/page.tsx:1` is `"use client"` and fetches `/api/comps` in a `useEffect`. The SSR HTML
carries the headings ("Public SaaS valuation multiples", "Basket composition") and the string
`EV/Revenue`, and not one multiple, company name, or median. The page is in the sitemap at 0.75 —
the highest priority of any non-hub page — and the substance a query like *"saas ev/revenue multiple
2026"* would match is not in the document. Combined with A1, `/comps` contributes nothing.

### A3. Title template double-suffixing — **verified**

`app/layout.tsx` sets `title.template = "%s | Whether"`. Three pages hardcode the brand into the
page title as well:

```
/share             Share the Current Weekly Brief | Whether | Whether
/terms-of-service  Terms of Service — Whether | Whether
/acceptable-use-policy   Acceptable Use Policy — Whether | Whether
```

(`app/pricing/page.tsx:24` has the same pattern but only on the OG title, which is not templated —
harmless.)

### A4. `/history` is the largest asset on the site and the least equipped — **verified**

The live sitemap is **104 URLs, of which 83 are the history family and 81 are `/history/<period>`
archive pages**. The hub those 81 pages hang off:

- exports no `metadata` (generic title, generic description, canonical → `/`, per A1);
- emits **zero** JSON-LD — the only route checked with none at all (`/operate` and `/signals` both
  emit `WebPage` + `WebSite` + `Organization` + `BreadcrumbList`);
- has no `ItemList` or `CollectionPage` describing the 81 children it links.

### A5. Sitemap composition inverts the value ranking — **read + verified**

81 of 104 URLs are closed archive periods at priority 0.55–0.62. Absent entirely:

- `/operate/financial` and `/operate/scenarios` — indexable (`index, follow` **verified**), with
  correct self-canonicals and unique descriptions, and never submitted;
- the 4 downloadable resource pages and `/resources/decision-shield-overview` — these are `noindex`
  by config, so their absence is consistent, but see B4;
- `/answers/*` and `/signals/*/*` — gated behind `isProgrammaticSitemapEligible()`
  (`app/sitemap.ts:76`), see A6.

### A6. One bad data week removes the entire high-intent surface from the sitemap — **read**

`app/sitemap.ts:76-99` evaluates the weekly quality gates once and, when they fail, drops **all**
`/answers/*` (7) and **all** `/signals/*/*` (15) entries — 22 URLs, the whole set of pages that
match an actual operator query. The same gate independently sets `noindex` on those pages
(`app/answers/[slug]/page.tsx:41`, `app/signals/[cluster]/[decision-scenario]/page.tsx:55-58`).

The intent is right and documented: do not index a stale posture call. The cost is that the failure
mode is all-or-nothing on the *URL*, and CLAUDE.md records FRED outages lasting weeks (the brief
freeze routine "has not completed a good run since" June). Every outage resets these pages'
accumulated ranking signals, and re-indexing lags recovery by days to weeks.

The cheaper shape: keep the URL indexable on its evergreen question content, and mark only the
live-posture block as stale (the page already renders a degraded-mode notice). Reserve `noindex` for
pages whose *entire* value is the live call.

### A7. `robots.txt` disallows an endpoint the site advertises — **verified**

`app/robots.ts:12` allows `/`, `/api/og`, `/brief.md`, `/api/agent`, `/.well-known/whether-agent.json`,
`/llms.txt`, `/api/posture/current`, then disallows `/api/`. `/api/mcp` is not on the allow list —
but `llms.txt` names `GET /api/mcp?tool=get_actions` as the tool catalog and lists
`/api/mcp` under Discovery, and `/api-docs` links it. The site tells agents to fetch a path its own
robots file forbids.

That is the whole of A7. A separate, weaker point, kept separate deliberately: there is no named
group for `GPTBot`, `OAI-SearchBot`, `ClaudeBot`, `PerplexityBot`, or `Google-Extended`. This is
**not** missing coverage — under the robots exclusion protocol a crawler with no group of its own
matches `User-agent: *`, and that group is `Allow: /`, so every one of them is already permitted.
Adding named groups changes no crawler's behaviour today; it only states the intent explicitly, and
buys a place to diverge later (say, allowing a search-grounding agent while disallowing a training
crawler). Treat it as optional documentation, not a fix — and note that duplicating the wildcard
policy into named groups is a live risk of drift, since a future edit to `*` would no longer reach
them.

### A8. No RSS autodiscovery, and the feed is a single item pointing at the homepage — **verified**

`app/layout.tsx:177-180` emits `rel="alternate"` links for Markdown, JSON, and `llms.txt`, but
**no `<link rel="alternate" type="application/rss+xml" href="/feed.xml">`**. The feed is instead
submitted as a page URL in `sitemap.xml`, which is the wrong channel for it.

`app/feed.xml/route.ts` then publishes exactly one `<item>`, whose `<link>` is a hardcoded
`https://whether.work` rather than `siteUrl`, with `<guid isPermaLink="false">`. `getPublishedBriefs()`
and `buildPublishedBriefPath()` already exist and already power `/brief/[week]` — the feed could
carry one item per published week with a real permalink, and does not. There is also no
`<atom:link rel="self">`.

---

## B. Structured data: built, then not shipped

### B1. The homepage's entity graph is assembled on every request and discarded — **verified**

`lib/report/home/structuredData.ts` builds a six-node `@graph`: `Organization`, `WebSite`,
`CollectionPage`, `Dataset`, `FAQPage` (three Q&A pairs), `BreadcrumbList`.
`lib/report/homePageAssembler.ts:407` puts it on `homepage.reportShell.structuredData`.

`app/page.tsx` never reads `structuredData` and never renders `ReportShell` — it renders its own
layout and its own inline script. The rendered homepage contains **exactly one** JSON-LD block, of
type `["Article","Report"]`, and none of the six nodes above.

Verified across routes:

| Route | JSON-LD nodes rendered |
| --- | --- |
| `/` | `Article`/`Report` only |
| `/operate` | `WebPage`, `WebSite`, `Organization`, `BreadcrumbList` |
| `/signals` | `WebPage`, `WebSite`, `Dataset`, `Organization`, `BreadcrumbList` |
| `/trust` | `BreadcrumbList` only |
| `/resolve` | `BreadcrumbList` only |
| `/history` | none |

So the site's `Organization` and `WebSite` anchors exist on two secondary pages and are missing from
the homepage — the URL search engines resolve site-level entities from. The `FAQPage` never ships at
all. `tests/decisionTransmissionCopyContract.test.ts` asserts against `buildHomeStructuredData()`
directly, so the suite is green on markup no crawler receives.

### B2. The homepage's dates are not dates — **verified**

`app/page.tsx:477-478`:

```js
"datePublished": homepage.reportShell.recordDateLabel,   // → "Jun 17, 2026"
"dateModified": homepage.reportShell.fetchedAtLabel,     // → "Jun 22, 2026, 5:05 PM"
```

schema.org `datePublished`/`dateModified` are ISO 8601. Display labels are discarded by consumers,
so the one page whose entire premise is *this week* publishes no machine-readable recency at all.
The ISO values are on the same object (`reportData.treasury.record_date`, `treasury.fetched_at`) and
are already used correctly by `/brief/[week]`.

### B3. The homepage's JSON-LD invents vocabulary and skips the hardened serializer — **verified**

Same block, `app/page.tsx:471-491`:

- `result`, and its `posture` / `regime` / `confidence` / `provenance` children, are not schema.org
  terms on `Article` or `Report`. The most decision-dense payload on the site is expressed in a
  private vocabulary inside a public format, so it is inert.
- No `author`, `publisher`, `image`, `url`, `mainEntityOfPage`, or `isAccessibleForFree` — all of
  which `app/brief/[week]/page.tsx:135-156` gets right via `buildAuthorSchema()` and
  `buildPublisherSchema()`. The archived weekly permalink has strictly better article markup than
  the live weekly brief.
- It calls raw `JSON.stringify`, not `serializeJsonLd` from `lib/seo.ts:52`, whose doc comment
  exists specifically to escape `<`, `>`, `&`, U+2028 and U+2029. `headline`, `about` and the
  posture labels are all interpolated. This is the only JSON-LD call site in the repo that bypasses
  the escaper.

### B4. Schema types the content already supports and does not declare — **read**

| Surface | Available today | Not declared |
| --- | --- | --- |
| `/pricing` | `pricingPlans` with monthly USD prices | `Product` / `Offer` |
| `/comps` | median EV/Revenue over a 15-company basket | `Dataset` (and no SSR content to attach it to — A2) |
| `/history` | 81 period records + regime series | `Dataset`, `ItemList` |
| `/history/[period]` | closed period record | `Article` present; no `temporalCoverage` |
| `/api-docs` | MCP + REST + CLI + embed | `WebAPI` / `SoftwareApplication` |
| `/answers/*` | one question, one bounded answer | `Article` fields on the existing `FAQPage` — see below |
| `/resolve`, `/trust` | full page content | breadcrumb only — no `WebPage`/`FAQPage` |
| toolkits | `whenToUse` → steps → `decisionArtifact` | `HowTo` |

Two notes on that table.

**Do not switch `/answers/*` to `QAPage`.** An earlier draft of this audit recommended that, and it
was wrong. `QAPage` describes a community question with user-submitted, competing answers that
visitors can vote on; Google's Q&A structured data documentation says to use `FAQPage` instead when
the page carries a single publisher-authored answer. `app/answers/decisionAnswerPageContent.tsx:73-85`
emits exactly that — one `Question` with one `acceptedAnswer`, written by us, with no submission
path — so `FAQPage` is the correct type and swapping it would make the markup invalid.

The real gap is elsewhere. `FAQPage` has not earned rich results for non-government, non-health
sites since Google's August 2023 change, so the markup's remaining value is entity and passage
parsing, not a SERP feature — and on that axis these pages are thin. The `FAQPage` node carries no
`author`, `publisher`, `datePublished`, `dateModified`, `url`, `mainEntityOfPage`, or `inLanguage`,
and it is emitted standalone rather than joined to the site `@graph`. Adding those (via the existing
`buildAuthorSchema()` / `buildPublisherSchema()`, as `/brief/[week]` already does) is the change
worth making; the type is already right.

**`Organization` is emitted without `sameAs`, `description`, or logo dimensions** anywhere on the
site, which leaves the brand entity unlinked to any external profile.

---

## C. Semantic matching: query intent to page

### C1. Related-answer links are computed to be *un*related — **read**

`app/answers/decisionAnswerPageContent.tsx:59`:

```ts
const relatedPages = answerPages
  .filter((candidate) => candidate.slug !== page.slug && candidate.category !== page.category)
  .slice(0, 3);
```

The filter selects for a **different** category, then takes the first three in file order. Every
page carries `mappedDecisionAreas`, `thresholdFocus`, `audience`, and `keyword`; none is consulted.

Because the corpus is 8 `decision` + 2 `climate` + 1 `explanation`, the consequence is exact and
static: **all eight decision pages emit the identical three related links** (the two climate pages
and the explanation page — the only three candidates that exist). The block is a constant rendered
eleven times, it passes no topical signal, and it can point at pages the allowlist has excluded from
the index.

The obvious replacement is already in the data: rank by shared `mappedDecisionAreas`, tie-break on
`thresholdFocus`, and filter through `isIndexableAnswerSlug`.

### C2. Meta descriptions are a function of the week, not of the page — **verified**

`app/answers/[slug]/page.tsx:37`:

```ts
description: `${payload.currentCall} Action: ${payload.immediateAction}`
```

`currentCall` and `immediateAction` come from the live posture filtered by `mappedDecisionAreas`, so
any two pages leading with the same decision area get byte-identical descriptions. Observed:

```
/answers/should-startups-hire-engineers-right-now
/answers/should-we-expand-sales-headcount-now
  → "Selective hiring for revenue-linked and reliability roles. Action: Prioritize
     revenue-linked and reliability roles with staged approvals."
```

Every page in `content/answers/pages.json` has a hand-written `shortAnswer`, `directAnswer`, and
`keyword`. None reaches the SERP snippet. The one text field that differentiates the page in results
is generated from the one input that is identical across the corpus.

### C3. The uniqueness gate checks the axis on which pages differ, and not the one on which they don't — **verified**

`lib/seo/programmaticPayloadBuilder.ts:118-121`, `clusterKeyForRoute`, returns `signal:${cluster}`
for a signal-scenario route. `buildUniquenessGate` therefore compares each page only against the
other **scenarios within the same signal cluster** — where the interpretation genuinely differs, so
the gate passes.

It never compares the same scenario **across** clusters, which is where the duplication actually is:

```
/signals/capital-tightness-watch/hiring
/signals/risk-appetite-watch/hiring
  → identical <meta description>, identical currentCall, identical immediateAction
/signals/capital-tightness-watch/burn-discipline
  → different (different scenario)
```

The payload is a pure function of `decisionScenario`. Across the 15 signal-scenario URLs there are
**5 distinct payloads**; the three signal clusters are duplicates of one another. The gate that
exists to catch exactly this is keyed so it cannot see it.

**The fix is to group by scenario, not by both axes.** An earlier draft of this audit said to key on
the cluster *and* the scenario; that is wrong, and worth stating explicitly because it fails
silently in the direction of green. `buildUniquenessGate` opens with:

```ts
const siblings = (input.siblingsInCluster ?? []).filter((s) => s.pageKey !== input.pageKey);
if (siblings.length === 0) {
  return { passed: true, reasons: [], details: { uniquenessScore: 1 } };
}
```

A `signal:${cluster}:${scenario}` key puts every route in a bucket of one, so every signal page
takes that early return and the gate stops evaluating them at all — a strictly worse state than
today, and one that reads as "all gates passing".

Grouping on the scenario alone (`signal:${scenario}`) makes the three clusters that share a scenario
siblings of one another, which is the axis the duplication lives on. Comparing across clusters
explicitly would also work. Either way, expect the gate to start failing on these routes once it can
see them — that is the point, and the payloads are what need to diverge, not the threshold.

### C4. Sub-headings carry no query language — **verified**

Every one of the 11 answer pages renders the same H2 set: *Copy this answer · This week's posture ·
Bounded calls · What would change this answer · Citation · Where to go next*. The H1 is the question
(good); below it, nothing is matchable. Passage-level retrieval and AI-overview extraction both work
off sub-headings, and the corpus offers six identical generic ones.

The homepage is worse: its H1 is `<h1 class="sr-only">Weekly Brief</h1>` (`app/page.tsx:294`) —
visually hidden, two words, no posture, no date, no category term. The most linked page on the site
has no heading text to match against.

### C5. The declared keyword targets reach no surface — **read**

`content/answers/meta.json` declares 2 `tierTwoKeywords` and 5 `tierThreeKeywords`
("yield curve inversion startup impact", "treasury rates and saas valuations",
"venture capital risk appetite indicator", …). They are parsed by `lib/answerContentSource.ts`,
re-exported by `app/answers/decisionPages.ts:88-90`, and **imported by nothing** — no page, no
metadata, no internal link, no test. Seven researched target queries with no landing surface and no
mechanism that would notice.

### C6. Site search is substring matching, and it never renders — **read**

`lib/search/searchIndex.ts:196-213` scores by `haystack.includes(term)` on a lowercased join. No
stemming, no plural folding, no synonyms: *"hire"* does not match *"hiring"*, *"runway"* does not
match *"cash out date"*, *"layoffs"* matches nothing in the corpus. `rg -i 'synonym|stem|fuzzy|
embedding'` over `app/` and `lib/` returns no matching layer.

`app/search/page.tsx:83` then `permanentRedirect`s every query to a hub anchor. The page is also
`noindex`. So: internal search intent is never rendered, never logged as a query→page pair, and
never available to inform which answer pages should exist. That is the cheapest keyword research
input the product has, and it is discarded on arrival.

The routing heuristics that do exist (`resolveSearchCommandHref`, `app/search/page.tsx:30-40`) are
two hardcoded regexes over `failure|risk|break|fragility` and `trust|confidence|source|formula`.

### C7. 67 payload-backed pages are permanently `noindex` — **read + verified**

| Route family | Count | Robots |
| --- | --- | --- |
| `/resolve/[slug]/[cluster]` | 30 | hardcoded `noindex` (`page.tsx:46`) |
| `/toolkits/[slug]/[cluster]` | 21 | hardcoded `noindex` (`page.tsx:46`) |
| `/toolkits/[slug]` | 7 | hardcoded `noindex` |
| `/resolve/[slug]` | 6 | hardcoded `noindex` |
| `/signals/[cluster]` | 3 | hardcoded `noindex` (**verified**) |

`enumerateProgrammaticRoutes()` generates, validates and writes payload artifacts for the 51 cluster
routes on every build, and `assertGenerationContracts` fails the build if any of them is stale —
work spent maintaining freshness for pages that cannot rank.

The `/signals` three are the sharpest case: the 3 cluster hubs are `noindex` while their 15 children
are the *only* programmatic pages the sitemap submits. That is an inverted hierarchy — indexable
leaves whose parent passes no authority and appears in no breadcrumb path a crawler can follow.

### C8. `/resources` is an orphaned cluster — **read**

`next.config.js` permanently redirects `/resources` → `/operate#ops-export-briefs`, so the 6
resource URLs in the sitemap (3 pillars, 2 articles, 1 VC authority page) have no index page. Their
only inbound links are from each other and one list in `app/operate/planningPageModel.ts:464`. A
pillar with no hub and no sibling ring is a pillar in name only.

---

## D. Consistency drift worth fixing while nearby

- `app/llms.txt/route.ts` tells agents "The homepage (/) includes JSON-LD structured data
  (schema.org/Report) with decision artifacts". It does include `Report` — with non-ISO dates (B2)
  and a non-schema `result` object (B3), and without the `Organization`/`WebSite`/`FAQPage` graph
  the same file implies (B1).
- `docs/seo/quality-gates.md` requires "canonical links to `/` and `/answer` or `/operate`".
  `/answer` is a redirect stub, not a route; the corpus is `/answers/[slug]` and the hub is
  `/resolve`.
- `lib/seo/indexationPolicy.ts:14-22` allowlists 7 answer slugs; `content/answers/pages.json` ships
  11. Four fully-built pages (`should-startups-slow-roadmap-expansion`,
  `should-we-expand-sales-headcount-now`, `should-we-delay-new-product-lines`,
  `how-fast-should-we-scale-go-to-market`) render, are linked from `/resolve`, and are `noindex`
  with no recorded reason. Either they are below the bar and should be deleted, or they are not and
  should be listed.

---

## Suggested order of work

Ranked by recovered value per unit of change. Each is independent.

1. **A1** — give `/comps`, `/history`, `/share`, `/api-docs` their own `alternates.canonical`, and
   drop or per-page the hardcoded `x-default`. Four URLs stop asking to be de-indexed. One-line
   fixes plus a metadata export for the two pages that have none.
2. **B1 + B2 + B3** — render `buildHomeStructuredData()` on `/`, merge the `Article`/`Report` node
   into that graph with ISO dates, `author`, `publisher`, and `serializeJsonLd`. The markup is
   already written and already tested.
3. **C2 + C1** — descriptions from `shortAnswer`, related links from `mappedDecisionAreas`. Both are
   a few lines against data that already exists, and both are per-page rather than per-week.
4. **C3** — group signal routes in `clusterKeyForRoute` by **scenario alone** (`signal:${scenario}`),
   so the uniqueness gate compares the clusters that duplicate each other. Not by both axes: that
   gives every route a bucket of one and the gate's zero-sibling early return passes them all. Expect
   it to start failing, which is the point.
5. **A4** — metadata, self-canonical, and an `ItemList`/`CollectionPage` for `/history`, which is
   78% of the submitted sitemap.
6. **A6** — split page-level `noindex` from block-level staleness so an outage stops resetting the
   answer corpus.
7. **A7 + A8** — allow `/api/mcp` in `robots.txt`, add RSS autodiscovery, and expand the feed to one
   item per published week. (Named AI-crawler groups are not part of this: the wildcard already
   allows them.)
8. **C7** — decide the cluster routes. Either give the 51 `noindex` pages a reason to be indexable
   or stop generating payloads for them.
9. **C5 + C6** — either land the 7 declared keywords on a surface or delete them; either render
   search results or stop pretending `/search` is a page.
