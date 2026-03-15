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
| `/api/alert-preferences?clientId=<id>` | GET, POST | Read/update per-client alert channel preferences. |
| `/api/alert-deliveries` | GET, POST | Read delivery history and emit channel delivery events for an alert. |
| `/api/weekly-digest` | GET | Build digest summary from stored alert events. |

## Integration and operations endpoints

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/api/brief/slack` | GET | Slack-ready executive brief payload for the current report state. |
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

### Regime alert create

```bash
curl -s -X POST "http://localhost:3000/api/regime-alerts" \
  -H "content-type: application/json" \
  -d '{
    "previousRecordDate": "2026-02-01",
    "currentRecordDate": "2026-02-08",
    "previousAssessment": {
      "regime": "DEFENSIVE",
      "scores": { "tightness": 78, "riskAppetite": 56, "baseRateUsed": "1M", "baseRate": 5.2, "curveSlope": 0.12 },
      "diagnostics": { "tightnessDelta": 8, "riskAppetiteDelta": 6, "nearestThresholdDelta": 8, "confidence": "MEDIUM", "transitionWatch": true, "intensity": "STANDARD", "boundaryContributors": [], "weakReadCount": 0, "twoWeakReadsWarning": false },
      "description": "",
      "constraints": [],
      "tightnessExplanation": "",
      "riskAppetiteExplanation": "",
      "dataWarnings": [],
      "thresholds": { "baseRateTightness": 5, "tightnessRegime": 70, "riskAppetiteRegime": 50 },
      "inputs": [],
      "policyAssessment": {
        "version": "policy-v1",
        "normalizations": [],
        "composites": { "cts": 0, "ras": 0 },
        "posture": "TRANSITION",
        "band": "NEUTRAL",
        "confidenceIndex": { "agreement": 0, "distanceFromNeutral": 0, "volatility30d": 0 },
        "refusal": { "refused": false, "reasons": [] },
        "governanceParameters": {
          "hiringThreshold": "HIGH",
          "paybackWindowTolerance": "STANDARD",
          "rollbackRequirement": "EXPLICIT_KILL_CRITERIA",
          "approvalVelocity": "BALANCED",
          "expansionScope": "BALANCED",
          "experimentationTolerance": "MEDIUM"
        }
      }
    },
    "currentAssessment": {
      "regime": "SCARCITY",
      "scores": { "tightness": 86, "riskAppetite": 42, "baseRateUsed": "1M", "baseRate": 5.4, "curveSlope": -0.1 },
      "diagnostics": { "tightnessDelta": 16, "riskAppetiteDelta": -8, "nearestThresholdDelta": 16, "confidence": "HIGH", "transitionWatch": false, "intensity": "STRONG", "boundaryContributors": [], "weakReadCount": 0, "twoWeakReadsWarning": false },
      "description": "",
      "constraints": [],
      "tightnessExplanation": "",
      "riskAppetiteExplanation": "",
      "dataWarnings": [],
      "thresholds": { "baseRateTightness": 5, "tightnessRegime": 70, "riskAppetiteRegime": 50 },
      "inputs": [],
      "policyAssessment": {
        "version": "policy-v1",
        "normalizations": [],
        "composites": { "cts": 0, "ras": 0 },
        "posture": "SAFETY_MODE",
        "band": "ELEVATED",
        "confidenceIndex": { "agreement": 0, "distanceFromNeutral": 0, "volatility30d": 0 },
        "refusal": { "refused": false, "reasons": [] },
        "governanceParameters": {
          "hiringThreshold": "VERY_HIGH",
          "paybackWindowTolerance": "SHORTER",
          "rollbackRequirement": "REVERSIBLE_ONLY",
          "approvalVelocity": "SLOWER_STRUCTURED",
          "expansionScope": "CONSTRAINED",
          "experimentationTolerance": "LOW"
        }
      }
    },
    "reasons": [{ "code": "regime-change", "message": "Regime shifted from DEFENSIVE to SCARCITY." }],
    "sourceUrls": ["https://fred.stlouisfed.org/"],
    "timeMachineHref": "/signals?month=2&year=2026"
  }' | jq
```

### Alert preferences and delivery

```bash
curl -s "http://localhost:3000/api/alert-preferences?clientId=exec-team" | jq

curl -s -X POST "http://localhost:3000/api/alert-preferences" \
  -H "content-type: application/json" \
  -d '{"clientId":"exec-team","preferences":{"slack":true,"email":false,"webhook":true}}' | jq

curl -s -X POST "http://localhost:3000/api/alert-deliveries" \
  -H "content-type: application/json" \
  -d '{"clientId":"exec-team","alertId":"<alert-id>"}' | jq
```

### Weekly mandate integration payload

```bash
curl -s "http://localhost:3000/api/integrations/weekly-mandate?target=slack" | jq '{target, recordDate, payload}'
```

## Data durability note
Signal ops state (`/api/regime-alerts`, `/api/weekly-digest`) now uses adapter-based storage in `lib/serverStore.ts`.
Default behavior uses file-backed persistence where Node file APIs are available (`WHETHER_SERVER_STORE_FILE`, default `/tmp/whether-server-store.json`), with explicit in-memory fallback via `WHETHER_SERVER_STORE_BACKEND=memory` or when file APIs are unavailable.


## Regime and posture taxonomy
- Canonical regime keys for API consumers: `SCARCITY`, `DEFENSIVE`, `VOLATILE`, `EXPANSION`.
- Policy posture values (`RISK_ON`, `SAFETY_MODE`, `TRANSITION`) are additive diagnostics and should not be used as replacements for regime keys in matrix routing, alert grouping, or Decision Shield mapping.
