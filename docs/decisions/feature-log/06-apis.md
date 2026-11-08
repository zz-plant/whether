<!-- Part of the feature log. Index: ./README.md -->

## 6) APIs (server routes)

### 6.1 Data APIs
- `GET /api/treasury` — normalized Treasury yield data with fallback support.
- `GET /api/comps` — the SaaS basket's median EV/Revenue and revenue growth, its company count, the
  read's `fetchedAt` and the `source` that answered (`sec-cboe`, `yahoo` or `alpha-vantage`). Cached
  in KV for an hour. 503 `quote_source_unavailable`, with every provider's reason in `detail`, when
  none answers.

### 6.2 Summary APIs
- `GET /api/weekly` — weekly summary payload with structured sections, copy text, and provenance.
- `GET /api/monthly` — monthly summary payload with structured sections, copy text, and provenance.
- `GET /api/quarterly` — quarterly summary payload with provenance.
- `GET /api/yearly` — yearly summary payload with provenance.
- `GET /api/summary-delta` — difference between weekly and monthly summaries.
- `GET /api/cadence` — alignment check between weekly and monthly constraints.

### 6.3 Signal Ops APIs
- `GET /api/regime-alerts` — list logged regime alerts.
- `POST /api/regime-alerts` — create an alert when trigger/cooldown rules pass.
- `GET /api/weekly-digest` — digest summary generated from logged alerts.
- Alert email consent is a field on the subscription: `alerts` on `POST /api/email/subscribe`, applied to a confirmed address only once its inbox confirms (§1.1.32). `/api/alert-preferences` was deleted on 2026-09-07 (§1.1.14b).
- `GET /api/alert-deliveries` / `POST /api/alert-deliveries` — delivery logs and send attempts, filterable by `clientId` for per-profile audit views.

### 6.4 Decision audit APIs
- `GET /api/decision-memory` / `POST /api/decision-memory` — append-only Decision Shield audit entries, filterable by `clientId`, with CSV export support.
- Entries carry an `assumptions` snapshot (conditions that had to hold at decision time) so the
  decision-staleness engine can compare current conditions against the recorded range.
- `POST` also accepts a **review response** (`lib/decisionFollowUp.ts`): `entryId`, `response`
  (`continued` | `changed` | `deferred`), optional `note`, and the `conditions` at response time.
  The route refuses a response that names no entry on the caller's own record (`unknown-entry`).
  `GET` returns the review trail as `followUps` beside `entries`; the CSV and the revisable
  delegation records stay decision-only, so the record schema is unchanged.

### 6.5 Integration APIs
- `GET /api/integrations/weekly-mandate?target=slack|notion|linear` — target-specific weekly
  mandate export payload.

### 6.6 Open Graph
- `GET /api/og` — PNG Open Graph image with regime metadata (supports Time Machine selection); `template=report` is the weekly card.
- `GET /api/image/brief` — the brief card as a 1200×800 PNG: the call, both scores against their pause and restart lines, confidence and source (§1.1.25). Takes the page's `?month=`, `?year=`, `?sector=`, `?stage=` and `?cadence=` context.

### 6.7 Agent access (MCP)
- `GET /api/agent?view=state` — the compact state to decide from (§6.9); `?view=full` (the default) is the whole brief.
- `POST /api/mcp` (no `?tool` param) — **MCP streamable-HTTP transport** (JSON-RPC 2.0,
  protocol 2025-06-18): `initialize`, `ping`, `tools/list`, `tools/call` over
  `application/json` responses. Standard MCP clients can mount `https://whether.work/api/mcp`
  directly. The tools are defined once in `lib/agent/tools.ts`; the transport is `lib/mcp/httpMcpServer.ts`.
- `GET /api/mcp?tool=<name>` — every tool as a plain GET (§6.9); `POST /api/mcp?tool=subscribe` unchanged.
- `bun run mcp:whether` — the local stdio MCP server (`lib/mcp/server.ts`, the one `/api/mcp` runs): the same tools, plus
  `pull_recent_site_info`.
- **What robots.txt opens is what the documents advertise (2026-10-27).** robots.txt closed `/api/` and opened
  four API paths, while the manifest advertised `/api/weekly`, `/monthly`, `/quarterly`, `/yearly`, `/cadence`,
  `/treasury` and `/health`, and `/api-docs` documented ten more that stayed closed. It opens the manifest's endpoints (read from
  `buildAgentEndpoints`) and every path `/api-docs` documents now; `/api/health` left the manifest instead, as a
  monitor's probe that loads the report on every call. `/api-docs` gained the `/api/cli/*` routes (with a curl
  example and how to point the CLI at this site), the mandate targets, `/api/badge`, `/api/decision`, the image
  and embed parameters, the stored screenshot, `/api/agent`'s `week` and `period`, `/calendar.ics` and
  `/llms-full.txt`; `/llms.txt` gained the CLI status and history routes, the badge, the calendar and the full
  text. `tests/robotsRoute.test.ts` holds robots.txt to `/llms.txt`, the manifest and the rendered `/api-docs`.
- **`/api/cli/history` rows are their own months (2026-10-27).** Every row carried this week's margin and
  trend, so a year of month-ends all read "Close to the line" and "mixed"; and `weeks` counted rows. A row is
  now what `?asOf=` that month reports: its margin from the month's governed assessment, its trend from
  `buildReportDynamics` against the month-end before. `weeks` is weeks, the month-ends within that many of
  the newest (1 to 52, default 52, the same twelve rows a request without it always returned).
  `tests/cliHistoryRoute.test.ts` pins March and January 2026 against their own briefs.

### 6.8 Alert cadence (2026-08-11; flash 2026-09-17)
Both crons now evaluate bounded-rule tripwires after ingest: the daily 02:00 UTC run calls
`/api/check-regime-change` and `/api/alert-deliveries` in addition to the Monday run, so a
regime flip or threshold crossing pushes the day it lands instead of waiting up to six days.
Both endpoints are transition-based (KV last-known state: `regime:*`, `alert:state`), so
daily runs stay silent unless something actually crossed. Since 2026-09-17 the same two steps
also judge a flash (§1.1.18): an outsized move in the short rate or the curve between the
previous snapshot and this one, which is measured against the previous read rather than the
alert state. The brief email remains weekly-only — the cadence promise is weekly; only rule
firings break cadence.

The weekly run is `0 14 * * MON` (14:00 UTC Monday). Until 2026-10-14 it was `0 14 * * 1`, which
Cloudflare reads as Sunday; `tests/cronSchedule.test.ts` now refuses a numeric weekday.

A run with any failed step mails one summary to the owner at `WHETHER_OPS_EMAIL`
(`lib/delivery/opsNotice.ts`), and each Workflow does the same when it fails. A clean run sends nothing.

### 6.9 One state, one tool registry (2026-09-29)
Agents met the product through four surfaces that disagreed about what Whether says and how to ask.
Changes, all additive except where noted:

- **One confidence.** The full agent payload, the legacy `?tool=get_brief` answer and the RSS item said
  MEDIUM (the engine's confirmation gate) on a week the page, `/api/scores` and the CLI called High. They
  carry the published confidence now. `/api/weekly` and `/api/monthly` (and `/api/cadence`,
  `/api/summary-delta`) followed on 2026-10-06: the summary builders read `resolveSummaryConfidence`
  (`lib/summary/summaryFormatting.ts`, the published label in the stored LOW / MEDIUM / HIGH spelling) for
  both `summary.confidence` and the prose sentence, and the routes pass the record so a stale fallback
  lowers it as it does on the page. The archives regenerate from the same builders, so the next run rewrites
  `summary.confidence`, the confidence sentence in `summary.summary`, `structured.posture.summary[0]`
  (monthly) and `copy` wherever the two ladders disagree: 55 of the 176 monthly entries on record (23 LOW
  and 25 MEDIUM to HIGH, 7 LOW to MEDIUM); the weekly count is not computable offline because weekly
  entries store no scores. One consequence to know: the published ladder ignores the engine's shock
  downgrade, so a shock week's summary now says what the page says (Dec 2025: HIGH, not LOW) and the shock
  sentence beside it carries the warning.
- **The state** (`lib/agentState.ts`, `agentStateSchema`): about a tenth of the full brief. `automation.ready`
  first; each score against its pause, resume and change lines; `perWeek`, and what the move is made of.
  Served at `?view=state`, as MCP `get_state` (with an `outputSchema`) and as `whether state`.
- **One registry** (`lib/agent/tools.ts`) for the remote server, the local server and the GET shim: five
  tools on the local server against twelve remote, under two names, is one list of 13 (plus the local-only
  `pull_recent_site_info`). Read-only annotations on every tool; compact JSON in `content`, the same object
  in `structuredContent` (always an object: `get_decision_rules` for one regime is now `{ "DEFENSIVE": [...] }`
  and was an array, which the SDK client rejected; **breaking** for a caller that read the array).
- **Inputs** (`lib/agent/inputs.ts`, parsed and refused by the generic `lib/agent/registry.ts`): a regime by key or by the site's weather word in any case; empty
  arguments are absent; numbers may be text and zero is a value; unknown arguments and values are refused
  with what would have worked. `get_context` with `SUNNY` answered zero weeks as a success; `?tool=` with
  an unknown name answered the brief with a 200 (now a 400); a cadence the server did not know became
  weekly (now refused). `get_context` and `get_projection` fill what is left out from today's reading and
  say so in `inputs`.
- **Discovery from the registry**: the manifest lists `mcp.tools`, `start` pointers, `views` and the
  `automation` check (it promised "MCP tools" and listed none); `/llms.txt` and `/api-docs` name every tool;
  `tests/agentDiscoveryParity.test.ts` holds each place that names a tool to the registry.
- **`get_context` counts months.** Its counts came from the Time Machine's regime series, one entry per month-end, and were named `weeksActive` / `historicalAvgWeeks`: "8 weeks" was 8 months (§1.1.26, the same period-word defect). They are `monthsActive` / `historicalAvgMonths` now (**breaking** for a caller reading the old names; its only caller in the repo is the tool), with the `latestSnapshot` they run to, and a `note` when the count is 0 because the regime is newer than the last month-end.
- **`get_projection` is direction-aware** (`projectRegimeFromPace`, `lib/report/regimeContext.ts`): it steps
  the scores by their weekly pace and classifies each step with the engine's own quadrant table, so a score
  moving away from its line does not cross it and the regime it lands in is the table's, not a guess. Called
  with no arguments (today's scores at today's pace) the old function reported a crossing within a week
  on the Sep 25 read, when both scores were moving deeper into the regime.
  **Found, not changed:** `getRegimeProjection`, the function it replaced for the tool, still drives the
  alert path (`lib/alert/checkRegimeChange.ts`, "Conditions could change soon" to Slack, and the
  `regime:weeks-to-flip` state), and that path has two defects of its own. The function divides the nearest
  line's distance by the fastest pace whichever way either score moves, and the caller passes it
  `reportDynamics.changedSignals[].delta`, which is the change since the previous *month-end* snapshot
  (§1.1.26), as if it were a weekly pace. Both make the alert early or spurious. What Slack subscribers are
  sent is an owner decision; the fix is to call `projectRegimeFromPace` with the pace `get_state` publishes
  as `perWeek`.
- **Browsers.** `/api/mcp` answers its CORS preflight and carries `Access-Control-Allow-Origin: *` on the JSON-RPC transport and the reads; `?tool=subscribe` stays closed.
- **CLI**: `whether state` (and `--require-ready`, which exits 8 when the data is not live and current); a mistyped command is refused as one (it was answered "too many arguments for 'status'"); `changes` names the dated reading it compares with, uses reader names and says what moved a score.
- **What the change did to the decisions** (§1.1.28): the state carries `change.summary` (one sentence) and `change.crossed` (the areas whose pause or resume state changed since `comparedWith`, grouped by how they moved, with the lines that decided it; empty when none did); `whether changes` prints the same sentence under `DECISIONS`, and the changes contract carries it as `decision`. Additive.
