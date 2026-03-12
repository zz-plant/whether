# API reference

Whether exposes read-first JSON endpoints for weekly posture transmission, cadence consistency checks, treasury provenance, and integration workflows.

## API conventions

- **Lifecycle:** developer preview for internal integrations; contracts may evolve while v1 stabilizes.
- **Format:** JSON.
- **Runtime:** edge handlers.
- **Auth:** currently none. Protect public deployments with your own auth/reverse proxy as needed.
- **Rate limiting:** platform-default protections apply; explicit per-endpoint quotas are not yet published.
- **Versioning:** most payloads include `version: "v1"`.

## Outcome-first endpoint map

### A) Build weekly decision artifacts

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/api/agent?cadence=<weekly|monthly|quarterly|yearly>` | GET | Agent-focused summary + handoff payload/prompt. |
| `/api/weekly` | GET | Weekly summary copy + structured fields + summary hash. |
| `/api/brief/slack` | GET | Slack-ready plain-text weekly brief payload for automation. |

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
| `/api/weekly-digest` | GET | Build digest summary from stored alert events. |
| `/api/decision-memory` | GET, POST | List/create Decision Memory entries (`{ entries, count }`), with CSV export via `?format=csv`. |
| `/api/alert-preferences` | GET, POST | Read/upsert delivery preferences by `clientId` (`{ preferences }`). |
| `/api/alert-deliveries` | GET, POST | List delivery history and create delivery attempts (`{ deliveries }`). |
| `/api/decision-events` | GET | Retrieve regime transition decision events with cursor pagination and optional replay support (`replay=1&initialState=<REGIME>`). |
| `/api/integrations/weekly-mandate?target=<slack|email|...>` | GET | Destination-specific weekly mandate payload. |

### D2) Premium billing readiness

| Endpoint | Method(s) | Purpose |
| --- | --- | --- |
| `/api/billing/checkout` | POST | Creates Stripe Checkout sessions for premium plans (`pro`, `team`) before paywall reveal; requires an attributed premium `source` and supports `Idempotency-Key`. |
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
curl -s "http://localhost:3000/api/agent?cadence=weekly" | jq '{cadence, supportedCadences, links, generatedAt}'
```

Invalid cadence returns `400` with `allowedCadences`.

### Weekly mandate payload

```bash
curl -s "http://localhost:3000/api/integrations/weekly-mandate?target=slack" | jq '{target, recordDate, payload}'
```

## Contract invariants to preserve downstream

When storing or forwarding payloads, retain:
- `generatedAt`
- `recordDateLabel` (where present)
- `version`
- `summaryHash` (weekly/monthly)
- provenance/fallback metadata blocks

Dropping these fields weakens traceability and makes cross-run comparisons brittle.

## Data durability note

- Decision transition events (`/api/decision-events`) support durable persistence on Cloudflare when the `DECISION_EVENTS_KV` binding is configured; otherwise they fall back to process-memory semantics.
- Alert preferences, decision memory, alerts, and delivery events return stable contracts in all environments and automatically degrade to in-process fallback storage when durable KV bindings are unavailable (`backend: "local-fallback"`, `degraded: true`). Configure `WHETHER_DURABLE_KV` or route-specific bindings (`DECISION_MEMORY_KV`, `ALERT_PREFERENCES_KV`, `REGIME_ALERTS_KV`) for durable history.

## Regime and posture taxonomy

- Canonical regime keys for API consumers: `SCARCITY`, `DEFENSIVE`, `VOLATILE`, `EXPANSION`.
- Policy posture values (`RISK_ON`, `SAFETY_MODE`, `TRANSITION`) are additive diagnostics and should not replace regime keys in matrix routing, alert grouping, or Decision Shield mapping.
