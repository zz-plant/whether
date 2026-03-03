# API reference

Whether exposes read-first JSON endpoints for summary generation, cadence checks, treasury data, and integration workflows.

## Conventions
- Lifecycle: developer preview for internal integrations; contracts may evolve while v1 stabilizes.
- Format: JSON.
- Runtime: edge handlers.
- Auth: currently no authentication layer (do not expose write endpoints publicly without an auth proxy).
- Rate limiting: platform-default protections apply; explicit per-endpoint quotas are not yet published.
- Versioning: most payloads include `version: "v1"`.

## Core summary and data endpoints

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/api/agent?cadence=<weekly|monthly|quarterly|yearly>` | GET | Agent-focused summary + handoff payload/prompt. |
| `/api/weekly` | GET | Weekly summary with copy + structured fields + summary hash. |
| `/api/monthly` | GET | Monthly summary with copy + structured fields + summary hash. |
| `/api/quarterly` | GET | Quarterly summary payload + provenance. |
| `/api/yearly` | GET | Yearly summary payload + provenance. |
| `/api/cadence` | GET | Weekly/monthly alignment and mismatch details. |
| `/api/summary-delta` | GET | Structured diff between weekly and monthly summaries. |
| `/api/treasury` | GET | Treasury yield data with live/fallback metadata. |

## Alert and delivery endpoints

| Endpoint | Method(s) | Purpose |
| --- | --- | --- |
| `/api/regime-alerts` | GET, POST | Read/create regime alert events. |
| `/api/alert-preferences` | GET, POST | Read/update per-client channel preferences. |
| `/api/alert-deliveries` | GET, POST | Read/simulate alert deliveries by channel. |
| `/api/weekly-digest` | GET | Build digest summary from stored alert events. |

## Integration and operations endpoints

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/api/integrations/weekly-mandate?target=<slack|email|...>` | GET | Destination-specific weekly mandate payload. |
| `/api/health` | GET | Monitor-friendly service + treasury freshness status. |
| `/llms.txt` | GET | Plain-text machine onboarding and endpoint discovery. |
| `/.well-known/whether-agent.json` | GET | JSON discovery manifest for agent/tool clients. |

## Request examples

### Agent endpoint

```bash
curl -s "http://localhost:3000/api/agent?cadence=weekly" | jq '{cadence, supportedCadences, links, generatedAt}'
```

Invalid cadence returns `400` with an `allowedCadences` field.

### Alert preference update

```bash
curl -s -X POST "http://localhost:3000/api/alert-preferences" \
  -H "content-type: application/json" \
  -d '{"clientId":"ops-demo","preferences":{"slack":true,"email":false,"webhook":true}}' | jq
```

### Weekly mandate integration payload

```bash
curl -s "http://localhost:3000/api/integrations/weekly-mandate?target=slack" | jq '{target, recordDate, payload}'
```

## Data durability note
Alert preferences, alerts, and delivery events currently use process-memory server store semantics. For production-grade durable history, persist these events in external storage.


## Regime and posture taxonomy
- Canonical regime keys for API consumers: `SCARCITY`, `DEFENSIVE`, `VOLATILE`, `EXPANSION`.
- Policy posture values (`RISK_ON`, `SAFETY_MODE`, `TRANSITION`) are additive diagnostics and should not be used as replacements for regime keys in matrix routing, alert grouping, or Decision Shield mapping.
