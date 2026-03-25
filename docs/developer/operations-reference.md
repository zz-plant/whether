# Operations implementation reference

Use this page when the weekly operations brief is approved and you need to hand off implementation details to engineering, data, or automation owners.

## Weekly data/API handoff

- Core read endpoint: `GET /api/weekly`
- Agent-oriented endpoint: `GET /api/agent?cadence=weekly`
- Full contract docs: `api-reference.md`
- Machine discovery:
  - `/llms.txt`
  - `/.well-known/whether-agent.json`

Quick checks:

```bash
curl -s "$BASE_URL/api/weekly" | jq '{recordDateLabel, generatedAt, version, summaryHash}'
curl -s "$BASE_URL/api/agent?cadence=weekly" | jq '{cadence, generatedAt, summaryHash, recordDateLabel}'
```

## CLI handoff

Primary reference files:

- `../cli-command-reference.md` (full command set)
- `cli-fallback.md` (HTTP fallback when binary install/auth is blocked)

Core commands:

```bash
whether status
whether call diff --from previous --to current
whether changes
whether history compare --weeks 6
whether scenario --tightness 0.65 --risk-appetite 0.45
whether agent weekly --json
```

CLI contract endpoints:

- `GET /api/cli/status`
- `GET /api/cli/call`
- `GET /api/cli/regime`
- `GET /api/cli/changes`
- `GET /api/cli/diagnostics`
- `GET /api/cli/history`
- `GET /api/cli/scenario`

## Integrations handoff

Weekly mandate payload endpoint:

- `GET /api/integrations/weekly-mandate?target=<slack|notion|linear>`

Quick check:

```bash
curl -s "$BASE_URL/api/integrations/weekly-mandate?target=slack" | jq '{target, recordDate, payload}'
```

For delivery sequencing, health gates, and retry strategy, use `integrations.md`.
