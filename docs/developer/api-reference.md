# API reference

Whether exposes read-first JSON endpoints for weekly posture transmission, cadence consistency checks, treasury provenance, and integration workflows.

## API conventions

- **Lifecycle:** developer preview for internal integrations; contracts may evolve while v1 stabilizes.
- **Format:** JSON.
- **Runtime:** edge handlers.
- **Auth:** currently none. Protect public deployments with your own auth/reverse proxy as needed.
- **Automation headers:** send `Accept: application/json`; include `Authorization: Bearer <token>` when your deployment is access-controlled.
- **Rate limiting:** platform-default protections apply; explicit per-endpoint quotas are not yet published.
- **Versioning:** most payloads include `version: "v1"`.

## Outcome-first endpoint map

### A) Build weekly decision artifacts

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/api/agent?cadence=<weekly|monthly|quarterly|yearly>` | GET | Agent-focused summary + handoff payload/prompt. |
| `/api/agent?view=state` | GET | The compact state to decide from (about 3KB, weekly only): conditions, published confidence, `automation.ready`, each score against its pause / resume / change lines, `perWeek` pace, what moved it, guidance. Shape: `agentStateSchema` in `lib/agentState.ts`. |
| `/api/weekly` | GET | Weekly summary copy + structured fields + summary hash. |
| `/api/brief/slack` | GET | Slack-ready plain-text weekly brief payload for automation. |
| `/api/image/slide?stage=<seed|series-a|series-b|growth>` | GET | The call as a 16:9 meeting slide, hand-written SVG. |
| `/api/export/board-slide?format=<pptx|pdf>&stage=<mode>` | GET | The same slide as a file: a one-slide native PPTX (default) or a one-page 16:9 PDF, served as an attachment named by ISO week. |

### B) Validate drift and consistency

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/api/cadence` | GET | Weekly/monthly alignment and mismatch details. |
| `/api/summary-delta` | GET | Structured diff between weekly and monthly summaries. |

### C) Inspect signal provenance and health

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/api/treasury` | GET | Treasury yield data with live/fallback metadata. |
| `/api/health` | GET | Monitor-friendly service + treasury freshness status. |

### D) Run alert and integration workflows

| Endpoint | Method(s) | Purpose |
| --- | --- | --- |
| `/api/regime-alerts` | GET, POST | Read/create regime alert events. |
| `/api/weekly-digest` | GET | Build digest summary from stored alert events, including top-level counts plus `degraded`/`backend` markers. |
| `/api/decision-memory` | GET, POST | List/create Decision Memory entries (`{ entries, count }`), with CSV export via `?format=csv`. |
| `/api/alert-preferences` | GET, POST | Read/upsert delivery preferences by `clientId` (`{ preferences }`). |
| `/api/alert-deliveries` | GET, POST | List delivery history and create delivery attempts (`{ deliveries }`). |
| `/api/slack/subscribe` | POST | Register a Slack Incoming Webhook (`webhookUrl`) plus optional `channelName` for weekly brief delivery; pings the channel to verify (bounded at 5s), stores the subscription in KV, returns a `token` for unsubscribe. |
| `/api/slack/unsubscribe` | POST | Remove a Slack delivery subscription by its `token`. |
| `/api/decision-events` | GET | Retrieve regime transition decision events with cursor pagination and optional replay support (`replay=1&initialState=<REGIME>`). |
| `/api/integrations/weekly-mandate?target=<slack|email|...>` | GET | Destination-specific weekly mandate payload. |

### D2) Premium billing readiness

This is backend substrate for the pre-reveal premium flow. It supports checkout and webhook plumbing, but it is not a first-class public pricing surface.

| Endpoint | Method(s) | Purpose |
| --- | --- | --- |
| `/api/billing/checkout` | POST | Creates Stripe Checkout sessions for premium plans (`pro`, `team`) as pre-reveal backend plumbing; requires an attributed premium `source` and supports `Idempotency-Key`. |
| `/api/billing/webhook` | POST | Stripe webhook receiver for `checkout.session.completed`; verifies `stripe-signature` via `STRIPE_WEBHOOK_SECRET` (accepts any matching `v1=` signature and enforces Stripe's 5-minute timestamp tolerance) and emits `premium_checkout_complete` telemetry when attribution metadata is valid. |

### E) Discover capabilities for tools/agents

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/llms.txt` | GET | Plain-text machine onboarding + endpoint discovery; its tool section is written from the tool registry. |
| `/.well-known/whether-agent.json` | GET | JSON discovery manifest for agent/tool clients: where to `start` per surface, the `views`, how to tell whether a reading is live and current (`automation`), and the MCP endpoint with every tool and its arguments (`mcp.tools`). |
| `/api/mcp` | POST | MCP streamable-HTTP server (JSON-RPC 2.0). Tools are defined once in `lib/agent/tools.ts`; see `docs/agents/agent-interface.md`. CORS is open for the transport and the reads, so a browser-based client can call it; `?tool=subscribe` stays closed. |
| `/api/mcp?tool=<name>` | GET | The same tools as a plain GET for an agent with no MCP client; `tool=get_actions` lists them with their arguments and a call that works. A wrong tool or argument is a 400 with what would have worked. |

## Additional cadence endpoints

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/api/monthly` | GET | Monthly summary with structured output + summary hash. |
| `/api/quarterly` | GET | Quarterly summary payload + provenance. |
| `/api/yearly` | GET | Yearly summary payload + provenance. |

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

Check `automation.ready` before acting on it without a person looking. Every `previous`, `delta` and `perWeek` is measured against `change.comparedWith`, the previous month-end snapshot, not last week.

`confidence` at the root of the full response is the published confidence, the one the page and `/api/scores` carry, and `summary.confidence` matches it on this route. `/api/weekly` and `/api/monthly` still return the engine's own label in `summary.confidence`.

The nested `agentHandoff.payload` now exposes:

- `decision_rules` for bounded operating rules by area
- `decision_delta` for change interpretation: `changed_signals` carry `from`, `to` and `delta`, and `compared_with` (`{ record_date, label }`, or `null` where a source did not date it) names the reading `from` is: the previous month-end snapshot, not last week. Its `summary` says "since Aug 31" where it used to say "this week"
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
- Alert preferences, decision memory, alerts, and delivery events return stable contracts in all environments and automatically degrade to in-process fallback storage when durable KV bindings are unavailable (`backend: "local-fallback"`, `degraded: true`). `WHETHER_DURABLE_KV` is the one binding that makes that history durable.

## Regime and posture taxonomy

- Canonical regime keys for API consumers: `SCARCITY`, `DEFENSIVE`, `VOLATILE`, `EXPANSION`.
- Policy posture values (`RISK_ON`, `SAFETY_MODE`, `TRANSITION`) are additive diagnostics and should not replace regime keys in matrix routing, alert grouping, or Decision Shield mapping.
