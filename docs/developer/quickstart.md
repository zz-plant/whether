# Developer quickstart

Get your first Whether integration working quickly.

## Prerequisites
- Running Whether locally (`bun run dev`) or a deployed Whether URL.
- `curl` and `jq` (optional) available in your terminal.

## 1) Pull a weekly agent brief

```bash
curl -s "http://localhost:3000/api/agent?cadence=weekly" | jq '{cadence, generatedAt, version, summaryHash}'
```

Expected result:
- `cadence` = `weekly`
- `summaryHash` present for `weekly` and `monthly`
- `generatedAt` and `version` included for traceability

## 2) Pull human-readable weekly summary output

```bash
curl -s "http://localhost:3000/api/weekly" | jq '{recordDateLabel, generatedAt, version, hasStructured: (.structured != null)}'
```

Use this endpoint for in-product weekly briefing panels.

## 3) Validate cross-cadence alignment

```bash
curl -s "http://localhost:3000/api/cadence" | jq '{alignmentStatus, mismatchedConstraints, generatedAt}'
```

Use this to catch drift between weekly and monthly guidance before publishing rollups.

## 4) Check operational health

```bash
curl -i -s "http://localhost:3000/api/health"
```

Interpretation:
- HTTP `200` + `status: "ok"` means treasury freshness is within threshold.
- HTTP `503` indicates `degraded` or `down`; inspect `checks.treasuryData` for details.

## 5) Discover machine endpoints

```bash
curl -s "http://localhost:3000/llms.txt"
```

```bash
curl -s "http://localhost:3000/.well-known/whether-agent.json" | jq
```

Use these for tool discovery and agent bootstrap flows.
