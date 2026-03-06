# Developer quickstart

Get your first Whether integration from zero to a shareable weekly artifact.

## Prerequisites

- Whether running locally (`bun run dev`) or a deployed base URL.
- `curl` and `jq` (recommended) installed.

Set a base URL once:

```bash
BASE_URL="http://localhost:3000"
```

## 1) Pull the weekly machine brief

```bash
curl -s "$BASE_URL/api/agent?cadence=weekly" | jq '{cadence, generatedAt, version, summaryHash, recordDateLabel}'
```

Why this matters:
- `cadence=weekly` is the default operator rhythm.
- `summaryHash` helps detect content drift in downstream automations.
- `generatedAt` and `recordDateLabel` support auditability in Slack/meeting artifacts.

## 2) Pull the human-readable weekly summary

```bash
curl -s "$BASE_URL/api/weekly" | jq '{recordDateLabel, generatedAt, version, hasStructured: (.structured != null)}'
```

Use this output to render the briefing text users actually read.

## 3) Verify cadence alignment before publishing

```bash
curl -s "$BASE_URL/api/cadence" | jq '{alignmentStatus, mismatchedConstraints, generatedAt}'
```

Ship/publish rule:
- publish only when `alignmentStatus` is healthy and `mismatchedConstraints` is empty.

## 4) Enforce operational health gate

```bash
curl -i -s "$BASE_URL/api/health"
```

Interpretation:
- HTTP `200` + `status: "ok"` → treasury freshness is within threshold.
- HTTP `503` (`degraded`/`down`) → hold outbound sends and inspect `checks.treasuryData`.

## 5) Enable agent discovery

```bash
curl -s "$BASE_URL/llms.txt"
```

```bash
curl -s "$BASE_URL/.well-known/whether-agent.json" | jq
```

Use these endpoints for tool bootstrap and machine-readable capability discovery.

## 6) Minimal production-ready pull loop

```bash
curl -s "$BASE_URL/api/health" | jq '{status}'
curl -s "$BASE_URL/api/cadence" | jq '{alignmentStatus, mismatchedConstraints}'
curl -s "$BASE_URL/api/agent?cadence=weekly" | jq '{recordDateLabel, summaryHash, generatedAt, posture: .summary.operatingPosture}'
```

Recommended policy:
1. Abort if health is not `ok`.
2. Abort if cadence alignment is not healthy.
3. Only then fetch and distribute the weekly brief.
