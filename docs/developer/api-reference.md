# API reference

Whether exposes read-first JSON endpoints for weekly posture transmission, cadence consistency checks, treasury provenance, and integration workflows.

## API conventions

- **Lifecycle:** developer preview for internal integrations; contracts may evolve while v1 stabilizes.
- **Format:** JSON.
- **Runtime:** edge handlers.
- **Cost:** Whether is free.
- **Auth:** none for the reads. The routes the scheduler owns (creating a regime alert, `/api/alert-deliveries`, `/api/decision-events`) take `Authorization: Bearer <WHETHER_CRON_SECRET>`. Decision memory reads and writes one owner's entries, named by an `x-whether-client-id` header, and answers 401 without it.
- **Automation headers:** send `Accept: application/json`; include `Authorization: Bearer <token>` when your deployment is access-controlled.
- **Crawlers:** `robots.txt` opens every path `/api-docs`, `/llms.txt` and the agent manifest advertise (`tests/robotsRoute.test.ts`), and keeps `/api/health`, telemetry, the alert digest and the scheduler's routes closed. It carries the Content-Signal declaration (`search=yes, ai-input=yes, ai-train=yes`, rendered from `lib/seo/robotsTxt.ts`).
- **Markdown negotiation:** `GET /` with `Accept: text/markdown` answers the Markdown brief (`/brief.md`) instead of HTML; every HTML response also carries `Link` headers naming the manifest, `/llms.txt` and `/brief.md` (`lib/runtime/agentResponse.ts`, applied in `worker/index.ts`).
- **Rate limiting:** platform-default protections apply; explicit per-endpoint quotas are not yet published.
- **Versioning:** most payloads include `version: "v1"`.

## Outcome-first endpoint map

### A) Build weekly decision artifacts

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/api/agent?cadence=<weekly|monthly|quarterly|yearly>` | GET | Agent-focused summary + handoff payload/prompt. |
| `/api/agent?view=state` | GET | The compact state to decide from (about 3KB, weekly only): conditions, published confidence, `automation.ready`, each score against its pause / resume / change lines, `perWeek` pace, what moved it, guidance. Shape: `agentStateSchema` in `lib/agentState.ts`. |
| `/api/agent?week=<slug>` / `?period=<slug>` | GET | A frozen published week (`2026-w41`), or an archive quarter or year (`2024-q1`, `2023`), with its permalink. An unknown slug is a 404 listing the slugs on record. |
| `/api/posture/current` | GET | The current guidance as a small stable object: conditions, funding pressure, direction, confidence, week, summary, url, version. |
| `/api/scores` | GET | Both scores, their deltas, the distance to the change line and the score nearer to crossing. |
| `/api/decision` | GET | The week's guidance as one object: the action, each area's action with its pause and resume lines, decisions to revisit, the lines that would change the guidance. |
| `/api/weekly` | GET | Weekly summary copy + structured fields + summary hash. |
| `/api/brief/slack` | GET | Slack-ready plain-text weekly brief payload for automation. |
| `/api/embed?format=<html|text|json|page>` | GET | The brief as a snippet (`html` default; `page` is a whole document for an iframe). `mode=call-strip` is one line; `stage` and `runway` (a band or a number of months) calibrate it; `ticker` labels it. |
| `/api/image/brief` | GET | The brief card as a PNG, 1200×800; `layout=landscape|square|portrait`, `theme=light`, `month` + `year` for a past month-end, `stage` to calibrate. `ticker` and `sector` only add a label. |
| `/api/image/brief-screenshot?date=<YYYY-MM-DD|latest>` | GET | The Monday screenshot of the homepage's guidance, kept 60 days; 404 when none is stored. Never captures on request. |
| `/api/badge` | GET | The week's conditions as an SVG badge, marked when the reading is a saved copy. |
| `/api/image/slide?stage=<seed|series-a|series-b|growth>` | GET | The call as a 16:9 meeting slide, hand-written SVG. |
| `/api/export/board-slide?format=<pptx|pdf>&stage=<mode>` | GET | The same slide as a file: a one-slide native PPTX (default) or a one-page 16:9 PDF, served as an attachment named by ISO week. |
| `/brief.md`, `/feed.xml`, `/calendar.ics` | GET | The brief in Markdown, the RSS feed, and a subscribable calendar with each Monday's guidance for the last 26 weeks. |

### B) Validate drift and consistency

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/api/cadence` | GET | Weekly/monthly alignment and mismatch details. |
| `/api/summary-delta` | GET | Structured diff between weekly and monthly summaries. |

### C) Inspect signal provenance and health

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/api/treasury` | GET | Treasury yield data with live/fallback metadata. |
| `/api/comps` | GET | The SaaS basket's median EV/Revenue, with the source that answered; 503 when none does. |
| `/api/health` | GET | Monitor-friendly service + treasury freshness status. Closed to crawlers and left out of the agent manifest: it loads the report on every call. |

### D) Run alert and integration workflows

| Endpoint | Method(s) | Purpose |
| --- | --- | --- |
| `/api/regime-alerts` | GET, POST | Read regime alert events; the `POST` that creates one takes the cron secret. |
| `/api/weekly-digest` | GET | Build digest summary from stored alert events, including top-level counts plus `degraded`/`backend` markers. |
| `/api/decision-memory` | GET, POST | List/create one owner's Decision Memory entries (`{ entries, followUps, count }`), with `?format=csv` for a spreadsheet and `?format=records` for revisable delegation records (NDJSON). Needs `x-whether-client-id`. |
| `/api/alert-deliveries` | GET, POST | List delivery history and create delivery attempts (`{ deliveries }`). Both take the cron secret. |
| `/api/slack/subscribe` | POST | Register a Slack Incoming Webhook (`webhookUrl`) plus optional `channelName` for weekly brief delivery; pings the channel to verify (bounded at 5s) and stores the subscription in KV. Deleting the webhook in Slack stops delivery. |
| `/api/decision-events` | GET | Retrieve regime transition decision events with cursor pagination and optional replay support (`replay=1&initialState=<REGIME>`). Takes the cron secret. |
| `/api/integrations/weekly-mandate?target=<slack|notion|linear>` | GET | The weekly mandate shaped for one tool: Slack blocks (the default), a Notion page, or a Linear issue. The channel and database id are placeholders. An unknown target is a 400 listing `supportedTargets`. |

### E) Discover capabilities for tools/agents

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/llms.txt` | GET | Plain-text machine onboarding + endpoint discovery; its tool section is written from the tool registry. |
| `/llms-full.txt` | GET | The indexable answer pages, guides and terms in one Markdown file. |
| `/.well-known/whether-agent.json` | GET | JSON discovery manifest for agent/tool clients: where to `start` per surface, the `views`, how to tell whether a reading is live and current (`automation`), and the MCP endpoint with every tool and its arguments (`mcp.tools`). |
| `/auth.md` | GET | What it takes to sign in, in one page: nothing for the reads; the one credential-free write (email subscribe) and the authenticated routes named so an agent does not hunt for a login. |
| `/api/mcp` | POST | MCP streamable-HTTP server (JSON-RPC 2.0). Tools are defined once in `lib/agent/tools.ts`; see `docs/agents/agent-interface.md`. CORS is open for the transport and the reads, so a browser-based client can call it; `?tool=subscribe` stays closed. |
| `/api/mcp?tool=<name>` | GET | The same tools as a plain GET for an agent with no MCP client; `tool=get_actions` lists them with their arguments and a call that works. A wrong tool or argument is a 400 with what would have worked. |

## Additional cadence endpoints

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/api/monthly` | GET | Monthly summary with structured output + summary hash. |
| `/api/quarterly` | GET | Quarterly summary payload + provenance. |
| `/api/yearly` | GET | Yearly summary payload + provenance. |

## CLI endpoints

The `whether` CLI reads these; each is public, so a script can call them without it.

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/api/cli/status?asOf=<YYYY-MM>&view=expanded` | GET | What `whether status` prints. `view=expanded` adds what would change the guidance and up to three signal moves. |
| `/api/cli/history?asOf=<YYYY-MM>&weeks=<n>` | GET | One row per month-end, newest first, going back `weeks` weeks (1 to 52, default 52: twelve month-ends). A row's margin (`confidenceLabel`) and `trend` are what `asOf` that month reports; `trend` is the move from the month-end before. |
| `/api/cli/scenario?tightness=<n>&risk-appetite=<n>` | GET | The conditions the given scores would read as, against this week's. |
| `/api/cli/changes`, `/call`, `/regime`, `/diagnostics` | GET | What the commands of the same name print. Each takes `asOf`. |

A name a route does not take is a 400 that lists the ones it does (`unsupported`, `supported`).

## Request examples

### Weekly agent summary

```bash
curl -s "http://localhost:3000/api/agent?cadence=weekly" \
  | jq '{cadence, supportedCadences, generatedAt, decisionDelta: .agentHandoff.payload.decision_delta.summary, flipTrigger: .agentHandoff.payload.flip_watch.flip_trigger}'
```

Invalid cadence returns `400` with `allowedCadences`; an invalid `view` returns `400` with `allowedViews`.

### The compact state

```bash
curl -s "http://localhost:3000/api/agent?view=state" \
  | jq '{headline, automation, confidence, pause: {tightness: .scores.tightness.pause, riskAppetite: .scores.riskAppetite.pause}}'
```

Check `automation.ready` before acting on it without a person looking. Every `previous`, `delta` and `perWeek` is measured against `change.comparedWith`: last week's published brief, or the previous month-end snapshot where the archive has no brief from the previous one to two weeks (`change.days` says which). Against last week's brief `moved` is empty and `note` is null: both readings were scored the same way, so there is no rates-versus-inputs split to make.

`confidence` at the root of the full response is the published confidence, the one the page and `/api/scores` carry, and `summary.confidence` matches it on this route. `/api/weekly` and `/api/monthly` still return the engine's own label in `summary.confidence`.

#### Field-to-label mapping: `confidence` is shown as "Margin"

Since 2026-10-09 no page, paste or email prints "Confidence". The number measures how far the scores sit from the line where conditions change, not a probability (`/calibration`), so readers see it as the margin. The JSON fields keep their names; only the display text changed.

| Field | Values | What a reader sees |
| --- | --- | --- |
| `confidence.label` (also `confidenceLabel`, `posture.confidenceLabel`, `summary.confidence`) | `HIGH` | Clear of the line |
| | `MED` / `MEDIUM` | Within reach of the line |
| | `LOW` | Close to the line |
| `confidence.percent` / `confidencePercent` | 30 to 92 | Not printed on pages; the calibration study's "Published %" column |
| (derived from `scores` and `thresholds`) | the nearer score, chosen as the band chooses it | "Risk appetite 1 pt from its change line" on the trust strip; "(risk appetite is 1 point from its change line)" in pastes |

The band still steps down a level on a saved copy older than 48 hours, as `confidence.label` always has; the strip's Sources cell names the saved copy. Wording lives in `lib/report/reportFormatting.ts` (`MARGIN_LABEL`, `formatMarginBand`, `formatMargin`); the points come from `resolveNearestLineMargin` in `lib/report/confidence.ts`.

The nested `agentHandoff.payload` now exposes:

- `decision_rules` for bounded operating rules by area
- `decision_delta` for change interpretation: `changed_signals` carry `from`, `to` and `delta`, and `compared_with` (`{ record_date, label }`, or `null` where a source did not date it) names the reading `from` is: last week's published brief, or the previous month-end snapshot where there is none. Its `summary` says "since Sep 29" where it used to say "this week"
- `flip_watch` for primary trigger, reversal conditions, and boundary pressure
- `skills` for deterministic downstream output ordering

### Weekly mandate payload

```bash
curl -s "http://localhost:3000/api/integrations/weekly-mandate?target=slack" | jq '{target, recordDate, payload}'
```

### Weekly digest payload

```bash
curl -s "http://localhost:3000/api/weekly-digest" \
  | jq '{version, generatedAt, alertCount, deliveryCount, degraded, backend, digest}'
```

### CLI fallback core read path (`/api/cli/status`)

Use this endpoint when CLI install/auth flows are blocked but you still need the same core read path that powers `whether status` and `whether brief`.

The `Authorization` header is for an access-controlled deployment of your own; `https://whether.work` needs none.

```bash
curl -sS "http://localhost:3000/api/cli/status" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $WHETHER_TOKEN" \
  | jq '{version, generatedAt, updatedAt, regime, trend, degraded, call: {summary: .call.summary, flipConditions: .call.flipConditions}}'
```

Expected JSON response shape (example values):

```json
{
  "version": "v1",
  "generatedAt": "2026-03-12T12:34:56.000Z",
  "updatedAt": "2026-03-12T12:00:00.000Z",
  "regime": "Guarded Expansion",
  "trend": "Deteriorating",
  "degraded": false,
  "call": {
    "summary": "Stage decisions. Avoid irreversible spend.",
    "flipConditions": [
      "tightness < 60 for 2 consecutive refreshes"
    ]
  }
}
```

For bounded-decision parity with `whether status --verbose`, use `GET /api/cli/status?view=expanded`. For historical replay parity with `--as-of`, use `GET /api/cli/status?asOf=YYYY-MM`.

Stability note: this contract is covered by CLI contract/query tests and is the CLI default read route, making it suitable for automation polling and fallback workflows.

## Contract invariants to preserve downstream

When storing or forwarding payloads, retain:
- `generatedAt`
- `recordDateLabel` (where present)
- `version`
- `summaryHash` (weekly/monthly)
- provenance/fallback metadata blocks

Dropping these fields weakens traceability and makes cross-run comparisons brittle.

Weekly cadence note:
- for `/api/weekly` and `/api/agent?cadence=weekly`, `recordDateLabel` is the week-ending label used for the briefing artifact
- the underlying source record date remains available in provenance and input-level fields

## Data durability note

- Decision transition events (`/api/decision-events`) persist durably on Cloudflare through the `WHETHER_DURABLE_KV` binding; without it they fall back to process-memory semantics.
- Decision memory, alerts, and delivery events return stable contracts in all environments and automatically degrade to in-process fallback storage when durable KV bindings are unavailable (`backend: "local-fallback"`, `degraded: true`). `WHETHER_DURABLE_KV` is the one binding that makes that history durable.

## Regime and posture taxonomy

- Canonical regime keys for API consumers: `SCARCITY`, `DEFENSIVE`, `VOLATILE`, `EXPANSION`.
- Policy posture values (`RISK_ON`, `SAFETY_MODE`, `TRANSITION`) are additive diagnostics and should not replace regime keys in matrix routing, alert grouping, or Decision Shield mapping.
