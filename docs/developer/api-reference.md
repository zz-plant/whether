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
| `/api/integrations/weekly-mandate?target=<slack|email|...>` | GET | Destination-specific weekly mandate payload. |

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

Alert preferences, alerts, and delivery events currently use process-memory store semantics. For production-grade durable history, persist these events in external storage.

## Regime and posture taxonomy

- Canonical regime keys for API consumers: `SCARCITY`, `DEFENSIVE`, `VOLATILE`, `EXPANSION`.
- Policy posture values (`RISK_ON`, `SAFETY_MODE`, `TRANSITION`) are additive diagnostics and should not replace regime keys in matrix routing, alert grouping, or Decision Shield mapping.
