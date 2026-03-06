# Integrations and operations

Practical integration patterns for agent workflows, delivery systems, and reliability gates.

## 1) Agent integration baseline

Recommended pull sequence:
1. Discover capabilities via `/.well-known/whether-agent.json`.
2. Pull `/api/agent?cadence=weekly` for the default operating horizon.
3. Pull monthly/quarterly/yearly only when planning horizon expands.
4. Preserve `provenance`, `recordDateLabel`, and `generatedAt` in downstream artifacts.

### Browser clients and CORS

`/api/agent` supports read-only browser tool clients with permissive CORS and `OPTIONS` preflight.

## 2) Alert-driven signal operations

### Alert generation flow

- Write signal events with `POST /api/regime-alerts`.
- Repeated no-change events are de-duplicated via `shouldCreateSignalAlert` checks.
- Read current stream with `GET /api/regime-alerts`.

### Delivery simulation + audit flow

- Configure destination toggles per consumer: `POST /api/alert-preferences`.
- Trigger delivery runs: `POST /api/alert-deliveries`.
- Inspect run history: `GET /api/alert-deliveries`.

## 3) Reliability and publish gates

### Health gate

- `GET /api/health` emits `ok`, `degraded`, or `down`.
- Treasury freshness drives status via `checks.treasuryData.ageHours` and `staleAfterHours`.

### Consistency gate

- `GET /api/cadence` verifies weekly/monthly alignment.
- `GET /api/summary-delta` explains mismatches when they occur.

### Suggested outbound policy

Before posting to Slack/email/webhooks:
1. Require `health.status === "ok"`.
2. Require healthy cadence alignment/no mismatched constraints.
3. Include `recordDateLabel`, `generatedAt`, and provenance in the outgoing payload.

## 4) Deployment notes

- Current alert store is process memory (`lib/serverStore.ts`), so state resets across cold starts/new isolates.
- For durable operational history, pair these APIs with persistent storage and idempotent writes.
