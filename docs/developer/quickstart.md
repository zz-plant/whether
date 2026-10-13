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
- for weekly payloads, `recordDateLabel` is the week-ending label for the briefing period; provenance keeps the underlying source date.

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
- HTTP `200` + `status: "ok"` → every live source is answering live and inside its freshness window.
- HTTP `200` + `status: "degraded"` → a live source is stale, unconfirmed or cached; hold outbound sends and read `degradedSources`.
- HTTP `503` + `status: "down"` → the report did not load.

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

---

## 7) Exemplary Recipe: Monday Morning Slack Webhook Bot

Automate sending the weekly operating call into your team's Slack channel every Monday morning.

```bash
#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${WHETHER_BASE_URL:-https://whether.work}"
SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:?SLACK_WEBHOOK_URL required}"

# 1. Check health gate
HEALTH=$(curl -s "$BASE_URL/api/health" | jq -r '.status')
if [ "$HEALTH" != "ok" ]; then
  echo "⚠️ Whether health check failed ($HEALTH). Aborting send." >&2
  exit 1
fi

# 2. Fetch Slack-formatted brief
BRIEF_TEXT=$(curl -s "$BASE_URL/api/brief/slack" | jq -r '.brief')

# 3. Post payload to Slack
curl -s -X POST -H 'Content-type: application/json' \
  --data "$(jq -n --arg text "$BRIEF_TEXT" '{text: $text}')" \
  "$SLACK_WEBHOOK_URL"

echo "✅ Weekly brief successfully dispatched to Slack."
```

---

## 8) Exemplary Recipe: GitHub Actions Automated Brief Dispatch

```yaml
name: Monday Weekly Brief Dispatch

on:
  schedule:
    - cron: '0 13 * * 1' # 9:00 AM Eastern every Monday
  workflow_dispatch:

jobs:
  dispatch-brief:
    runs-on: ubuntu-latest
    steps:
      - name: Fetch and Post Whether Brief
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_LEADERSHIP_WEBHOOK }}
        run: |
          HEALTH=$(curl -s "https://whether.work/api/health" | jq -r '.status')
          if [ "$HEALTH" != "ok" ]; then
            echo "Whether service degraded, skipping outbound send."
            exit 0
          fi
          
          BRIEF=$(curl -s "https://whether.work/api/brief/slack" | jq -r '.brief')
          curl -X POST -H 'Content-type: application/json' \
            --data "$(jq -n --arg text "$BRIEF" '{text: $text}')" \
            "$SLACK_WEBHOOK_URL"
```
