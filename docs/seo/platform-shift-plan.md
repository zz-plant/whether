# SEO platform shift plan: build-time/pull → event-driven/agent-pull

Status: Proposed, 2026-11-02. **Phases 0–5, 7 and 8 shipped 2026-11-02.** Phase 6 is
reclassified: the data jobs (ingest, regime history, brief freeze) are already edge-native
cron + Workflows, and the SEO runbook is an operator tool that stays a Node script because the
runtime computes payloads in memory when the artifact cache is absent.
Supersedes nothing; it sequences the "old way → new way" review in
`docs/programmatic-seo-operations.md` and `docs/seo/refresh-loop.md`.

## North star

Content, indexing, and distribution should move on the same event model as the
product: a read lands, a call is struck, a brief is frozen — and every surface
(page, sitemap, agent, cache) follows from that event. Today most of that is
build-time and pull-based: JSON in the repo, a deploy to publish, timers to
refresh, a monolithic sitemap, and a search-first discovery assumption.

Two rules constrain the plan:

- **No new product surface** unless an existing one cannot carry the behavior.
- **Reuse before adding.** Each phase should delete or consolidate something, not
  just add.

## Sequencing

Ordered by leverage-to-risk. Each phase ships independently; later phases do not
block earlier ones.

| Phase | Shift | Risk | Depends on | Deletes |
| --- | --- | --- | --- | --- |
| 0 ✅ | Measure AI referrals | Low | — | — |
| 1 ✅ | Event-driven revalidation | Low | — | most timer reliance |
| 2 ✅ | Content ledger + honest `lastmod` | Low | — | manual `updatedAt` |
| 3 ✅ | Answer-object-first | Medium | 2 | page/agent duplication |
| 4 ✅ | Segmented sitemaps | Medium | 2 | monolithic sitemap function |
| 5 ✅ | Content layer (KV) | High | 2, 3 | deploy-to-publish for copy |
| 6 ◐ | Edge-native scheduling | High | 5 | external routine + PR freeze |
| 7 ✅ | AI-crawler policy + IndexNow | Low | — | static robots assumption |
| 8 ✅ | Near-duplicate detection | Medium | 3 | regex-only distinctness |

## Phase 0 — Measure AI referrals

**Why:** the AEO shift is unmeasurable today. `classifyAcquisitionSource` has five
buckets (`search`, `social`, `referral`, `direct`, `internal`); ChatGPT,
Perplexity and Claude arrive as `referral` or `direct`.

**Scope**
- Add an `ai` bucket to `lib/contentMeasurement.ts` with the assistant hosts
  (chatgpt.com, perplexity.ai, claude.ai, copilot.microsoft.com, gemini.google.com).
- Extend `tests/contentMeasurement` fixtures.
- Add an `ai_referral` line to the metrics artifact and the corpus audit output.

**Acceptance:** a session from an AI assistant is counted as `ai`, and the weekly
runbook prints AI-referred entrances per URL.

**Shipped 2026-11-02:** `ai` bucket + assistant hosts in `lib/contentMeasurement.ts`;
`aiEntrances30d` per URL in `lib/seo/pageMetricsFromTelemetry.ts`; the runbook's
metrics line prints the AI total; `docs/seo/measurement-model.md` updated.

## Phase 1 — Event-driven revalidation

**Why:** `revalidateTag("report-data")` already exists but timers still carry the
load. Make the event primary and the timer a safety net.

**Scope**
- Confirm the weekly publish and `brief:freeze` call `revalidateTag` (add if not).
- Add a Cloudflare cache-purge step on publish if tag invalidation does not reach
  the edge cache.
- Keep `revalidate = 3600` as fallback only; document it as such.

**Acceptance:** a publish updates `/`, `/answers/*`, `/signals/*` and the sitemap
within minutes with no deploy; a test asserts the publish path calls the tag.

**Shipped 2026-11-02:** the ingest, materialized write and operating-state refresh
already call `revalidateReportDataCaches()`; `tests/eventDrivenRevalidation.test.ts`
pins that and pins the page timers at the hourly fallback. The Cloudflare edge-cache
purge step is not added — tag invalidation covers the Next data cache; revisit only
if a published change is observed stale at the edge.

## Phase 2 — Content ledger + honest `lastmod`

**Why:** `updatedAt` is hand-maintained and the sitemap can bump weekly without a
body change. A ledger makes recency auditable.

**Scope**
- Add `content/answers/ledger.json`: append-only `{ slug, changedAt, summary }`.
- Derive `updatedAt` and the "Answer last reviewed" line from the newest ledger
  entry, falling back to the page's `updatedAt`.
- Sitemap `lastmod = max(ledger, weekly call date)` (already the shape; source
  the editorial half from the ledger).

**Acceptance:** `seo:corpus-audit` fails if a page's `updatedAt` disagrees with
the ledger; the sitemap's editorial date traces to a ledger row.

**Shipped 2026-11-02:** `content/answers/ledger.json` (append-only, seeded with the
seven pages reviewed this week) and `lib/answers/contentLedger.ts` (Zod-validated,
`resolveAnswerUpdatedAt`, `orphanedLedgerSlugs`). The answer page and sitemap read
the ledger; `seo:corpus-audit` fails on page/ledger drift and orphaned rows.
`tests/contentLedger.test.ts` and an answer-page render assertion pin it.

## Phase 3 — Answer-object-first

**Why:** the page and `/api/agent`, MCP and `/llms.txt` each rebuild the answer
from the same fields; they can drift.

**Scope**
- Add `lib/answers/answerObject.ts`: `buildAnswerObject(page, payload)` returns
  the question, stance, action, pause/restart lines, evidence, citations, FAQ.
- Render `decisionAnswerPageContent.tsx` from it.
- Feed the agent/MCP/llms builders from the same object.

**Acceptance:** a test asserts the page's visible answer and the agent's
`get_answer` payload come from one object; changing a field changes both.

**Shipped 2026-11-02:** `lib/answers/answerObject.ts` (`buildAnswerObject`) is the
single source for the answer text, company inputs, decision note, watchouts, FAQ,
last-reviewed date, standing and rules. `decisionAnswerPageContent.tsx` renders it;
`get_answer` returns it. `tests/answerPageReaderCopy.test.tsx` asserts the page's
visible answer and the agent payload are the same object.

## Phase 4 — Segmented sitemaps

**Why:** one function computes ~130 URLs and one gate drops all programmatic
entries together.

**Scope**
- `/sitemap.xml` becomes an index; add `/sitemaps/{answers,signals,history,briefs}.xml`.
- Each child applies its own gate; `lastmod` from the ledger (Phase 2).
- Keep `isRetiredSitemapPath` and the readiness gates per child.

**Acceptance:** a stale answer segment drops without touching history or briefs;
crawl diagnostics are readable per segment.

**Shipped 2026-11-02:** `app/sitemap.ts` now exports `generateSitemaps()` with five
segments (`pages`, `answers`, `signals`, `history`, `briefs`). Next/vinext renders
`/sitemap.xml` as the index over `/sitemap/{segment}.xml`, so each child carries its
own gate and `lastmod` (the answer segment uses the Phase 2 ledger). `tests/sitemap.test.ts`
pins the split, the independence of history/briefs from the live gate, and that each
URL appears in exactly one child.

## Phase 5 — Content layer (D1/KV)

**Why:** every copy edit needs a build and deploy.

**Scope**
- Store answer pages in D1 behind the existing Zod schema; seed from
  `content/answers/pages.json`.
- Add a preview route and a publish guard (schema + corpus audit) before a row is
  served.
- Keep the JSON file as the seed/migration source.

**Acceptance:** an answer edit ships without a deploy; the audit and launch
readiness run against the published row.

**Shipped 2026-11-02 (KV, not D1):** `lib/answers/answerContentStore.ts` reads a
published set from `WHETHER_DURABLE_KV` (key `answers:pages:v1`) and falls back to the
bundled seed when absent or invalid. `POST /api/answers/publish` (cron-auth) validates
the schema and the structural guard before writing; `GET /api/answers/preview`
(cron-auth) reads the draft. The answer page and sitemap read the published set.
Adding a brand-new slug still needs an `indexableAnswerSlugs` update, which is a
deploy — editing an existing page does not. Tests: `tests/answerContentStore.test.ts`.

## Phase 6 — Edge-native scheduling

**Why:** the weekly freeze and runbook depend on an external routine and a PR.

**Scope**
- Move `brief:freeze` + `seo:weekly-runbook` onto a Workers cron + Queue, with a
  Durable Object for exactly-once.
- Move the human approval into `lib/report/briefPublishGuard.ts` (a confirm step
  in the publish flow), not a Git PR.
- Keep `weekly-brief-freeze.yml` as a manual fallback.

**Acceptance:** a week runs end to end in-platform; a duplicate trigger produces
one frozen brief.

**Reclassified 2026-11-02:** already true for the data jobs — `wrangler.toml` crons
(`0 2 * * *`, `0 14 * * MON`) start `WeeklyBriefFreezeWorkflow` and
`RegimeHistoryRefreshWorkflow` in-platform, and `briefPublishGuard` gates the freeze.
The SEO runbook stays a Node operator tool: `readProgrammaticPayload` computes payloads
in memory when the artifact cache is absent, so the runbook is inspection, not runtime.

## Phase 7 — AI-crawler policy + IndexNow

**Why:** AI crawlers are now a primary discovery path, and new URLs wait for a
crawl.

**Scope**
- Extend `lib/seo/robotsTxt.ts` with GPTBot, ClaudeBot, PerplexityBot and a
  `Content-Signal` policy.
- Ping IndexNow (Bing/Yandex) on publish for new/changed URLs.

**Acceptance:** robots reflects the policy; a publish submits the new URL without
waiting for a crawl.

**Shipped 2026-11-02:** the robots half was already present (`lib/seo/robotsTxt.ts`:
retrieval/training crawler groups + `Content-Signal`). IndexNow added:
`lib/seo/indexNow.ts`, the key file at `/indexnow/{key}.txt`, and a ping from the answer
publish route. It is a no-op without `INDEXNOW_KEY`. Tests: `tests/indexNow.test.ts`,
`tests/indexNowKeyRoute.test.ts`.

## Phase 8 — Near-duplicate detection

**Why:** the regex vocabulary and clause tests catch words, not paraphrase.

**Scope**
- Add a script that compares each answer's enduring body and flags similarity
  above a threshold. Shipped as token shingles + Jaccard (offline, deterministic);
  an embedding model can replace the scorer behind the same interface.
- Run it in `seo:corpus-audit`.

**Acceptance:** a paraphrased duplicate fails the audit; the threshold is
documented and tunable.

**Shipped 2026-11-02 (shingles, not embeddings):** `lib/answers/nearDuplicate.ts`
compares 5-token shingles with Jaccard similarity at a 0.62 threshold — deterministic
and offline, so it runs in CI without a credential. `seo:corpus-audit` fails on a pair
above the threshold. Tests: `tests/nearDuplicate.test.ts`. Swap in embeddings later if
paraphrase recall proves too low; the interface stays `findNearDuplicates(docs, threshold)`.

## What this plan does not do

- No full CMS. Phase 5 is a thin content layer, not an editor product.
- No AEO rewrite of the site. Phase 0 measures; the answer pages stay the unit.
- No hreflang/multi-language. Not resourced.
- No new routes for their own sake. Every phase reuses an existing surface.

## Measurement

- Phase 0: AI-referred entrances per URL.
- Phase 1: minutes from publish to updated page.
- Phase 2: share of sitemap entries whose `lastmod` traces to a ledger row.
- Phase 3: drift tests (page vs agent) at zero.
- Phase 4: per-segment indexed count.
- Phase 5: deploys avoided per content change.
- Phase 6: runbook success rate without an external routine.
- Phase 7: IndexNow submissions and AI-crawler hits.
- Phase 8: near-duplicate findings per audit.
