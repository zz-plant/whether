# Technical SEO audit, 2026-11-26

The owner asked to improve SEO. No Search Console data was available, so this pass measured what
the site serves: every sitemap URL fetched as a browser and as Googlebot, the site's own telemetry
(Analytics Engine, `whether_telemetry`), and layout shift in headless Chrome against production.

## What the data shows

- **No search arrivals.** The `activation` stream logged 1,649 homepage visits from 2026-08-29 to
  2026-11-26. None arrived from a search engine, an assistant or a referral; 1,068 were direct and
  563 carried no arrival. The stream fires on `/` only, so it says nothing about landings
  elsewhere. `content-measurement`, which records organic entrances on content pages, holds 4
  events in three months: it does not measure traffic, and `seo:page-metrics` has nothing to read.
- **A web search for the domain finds Mintlify's generated docs of the public repository**
  (`mintlify.com/zz-plant/whether/...`) rather than whether.work. Those pages describe the product
  as it was positioned earlier (product and engineering leaders). They are outside this
  repository.

## Fixed

1. **Metadata in `<body>` on cached pages (128 sitemap URLs).** Every answer page, published week,
   signal page, resource guide, archive period and `/roles` served its `<title>`, description,
   canonical and OG tags at the foot of `<body>` to every crawler, Googlebot and Bingbot included,
   despite `htmlLimitedBots` naming them. These routes are served from vinext's ISR cache, whose
   key does not vary by user agent, so the first requester's render (a browser's, with streamed
   metadata) was cached and served to everyone: for an hour on answers, a year on published weeks.
   Google ignores a canonical outside `<head>`; link unfurlers and Bing read `<head>` only.
   `patches/vinext@1.0.1.patch` keeps a cache-candidate render's metadata in `<head>`; uncached
   routes still stream for browsers. vinext 1.4.6 has the same code. Verified on the production
   build in workerd: a browser's first render (cache miss), then Googlebot and an empty user agent
   (cache hits), all carry the tags in `<head>`. The cache key includes the build ID, so the deploy
   replaces every poisoned entry. Pinned by `tests/htmlLimitedBots.test.ts`.
2. **Layout shift.** Real-user CLS p75 was 0.36 since 2026-11-01 (poor above 0.25), on most report
   routes. Two causes, both on desktop:
   - The route's loading placeholder was shorter than a screen, so the full-height body put the
     footer on the first screen and the page that replaced it pushed the footer away (0.46).
     `RouteLoadingShell` is at least a screen tall.
   - History's record band was opened from script after the first paint, pushing the page down
     356px (0.22). It is drawn open in the server's HTML.
   With the network and CPU throttled the same way, production measured 0.46 on `/` and 0.69 on
   `/history`; the fixed build measured 0 on `/`, `/history`, `/signals` and `/operate`, desktop
   and phone. The `web-vitals` stream will show whether real visits agree.
3. **IndexNow only on answer publishes.** A merged week, a new month on /history or a refreshed
   archive period reached Bing (and the ChatGPT and DuckDuckGo results built on it) only when it
   reread the sitemap. The daily cron's `seo/indexnow-sync` step submits each sitemap URL that is
   new or whose `lastModified` moved (`lib/seo/indexNowSitemapSync.ts`), recording what was sent
   only after IndexNow accepts it. The first run sends the whole sitemap once.
4. **Internal links through redirects.** 36 links on 10 targets went through a 308: the toolkit
   links (`/toolkits/<slug>`, now the Guides page's own `/resources?toolkitQuery=<slug>#toolkit-library`),
   `/history/compare`, `/decisions` and `/visual-assets/index.html`. Each points at where it lands.

## Not changed

- Three descriptions run past 160 characters (`/signals`, `/trust`, `/operate`) and three titles
  past 65 with the suffix. Search engines truncate them; rewriting is a copy pass under
  `docs/editorial-guardrails.md`.
- The "decision record" links on `/operate`'s work questions and the Decision Shield overview
  still promise a record the product retired; they now point at `/operate` directly, where the
  redirect sent them.
- Authority. With no search arrivals in three months, the limit is discovery and links to the
  site, which the code cannot supply. Search Console (or a phone screenshot of it, as on andwise)
  is the next read: indexed pages, impressions by query, and whether the metadata fix moves them.
