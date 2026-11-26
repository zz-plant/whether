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
   `patches/vinext@<version>.patch` keeps a cache-candidate render's metadata in `<head>`; uncached
   routes still stream for browsers. vinext 1.4.7 has the same bug (re-checked on a production
   build when the dependency update moved to it), so the patch moved with it. Verified on the production
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

5. **Titles and descriptions.** Read from every page as Googlebot (metadata anywhere in the
   document, so the cached pages count): none missing, none duplicated. Fixed in the same pass:
   - The signal pages were titled "<watch> | Evidence", the name /signals lost on 2026-10-08;
     their share cards said "Evidence" too. They are titled by the watch alone.
   - The advice study was "Best Product Management Books and Articles" and the Guides hub
     "Startup Decision Guides: Hiring, Fundraising, Runway and Spending": title case, and a
     superlative. Now "Product management reading list" and "Startup guides: hiring,
     fundraising, runway, spending".
   - Descriptions past 160 characters on `/signals`, `/trust` and `/operate`, and in the role
     (up to 209), role-stage (202), company-role (172) and company (166) templates, which
     `tests/searchResultLengths.test.ts` now holds to 160 for every label.
   - "See what has changed since you decided" and "Your decision record" linked a record the
     product retired. The first is "Check the plan against this week's guidance", on the plan
     stress test; the second went.

## Not changed

- The homepage description is this week's guidance sentence, so its length moves with the
  week (171 characters this week). Six answer descriptions run 161–201 characters because they
  are the enduring answer itself, and three resource guides 162–191. Rewriting those is
  editorial, not template, work.
- Titles past 60 characters with the suffix remain on the company-role (249 of 300), role-stage
  and answer templates. A result line cuts the brand suffix first and the words people search
  lead each title, so the cut costs little.
- Mintlify's generated pages of the repository now answer 410 Gone; search engines drop them.
- Authority. With no search arrivals in three months, the limit is discovery and links to the
  site, which the code cannot supply. Search Console is the next read: indexed pages,
  impressions by query, and whether the metadata fix moves them.
