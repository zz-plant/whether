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
| `/llms.txt` | GET | Plain-text machine onboarding + endpoint discovery. |
| `/.well-known/whether-agent.json` | GET | JSON discovery manifest for agent/tool clients. |

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

Invalid cadence returns `400` with `allowedCadences`.

The nested `agentHandoff.payload` now exposes:

- `decision_rules` for bounded operating rules by area
- `decision_delta` for weekly change interpretation
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

- Decision transition events (`/api/decision-events`) support durable persistence on Cloudflare when the `DECISION_EVENTS_KV` binding is configured; otherwise they fall back to process-memory semantics.
- Alert preferences, decision memory, alerts, and delivery events return stable contracts in all environments and automatically degrade to in-process fallback storage when durable KV bindings are unavailable (`backend: "local-fallback"`, `degraded: true`). Configure `WHETHER_DURABLE_KV` or route-specific bindings (`DECISION_MEMORY_KV`, `ALERT_PREFERENCES_KV`, `REGIME_ALERTS_KV`) for durable history.

## Regime and posture taxonomy

- Canonical regime keys for API consumers: `SCARCITY`, `DEFENSIVE`, `VOLATILE`, `EXPANSION`.
- Policy posture values (`RISK_ON`, `SAFETY_MODE`, `TRANSITION`) are additive diagnostics and should not replace regime keys in matrix routing, alert grouping, or Decision Shield mapping.
