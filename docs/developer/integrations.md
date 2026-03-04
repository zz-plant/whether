# Integrations and operations

This page explains practical integration patterns for agent workflows and signal operations.

## Agent integrations

Preferred pull sequence:
1. Read `/.well-known/whether-agent.json` for endpoint and cadence discovery.
2. Pull `/api/agent?cadence=weekly` for default near-term operating posture.
3. Pull monthly/quarterly/yearly cadence only when planning horizon expands.
4. Preserve `provenance`, `recordDateLabel`, and `generatedAt` in downstream outputs.

### CORS behavior
`/api/agent` supports browser-based tool clients with permissive read-only CORS and `OPTIONS` preflight.

## Signal operations integrations

### Alert generation flow
- Use `POST /api/regime-alerts` with signal payloads.
- The endpoint de-duplicates repeated no-change events via `shouldCreateSignalAlert` checks.
- Read active stream with `GET /api/regime-alerts`.

### Delivery simulation and audit flow
- Configure destination toggles per consumer via `POST /api/alert-preferences`.
- Request delivery runs via `POST /api/alert-deliveries`.
- Pull historical events via `GET /api/alert-deliveries`.

## Reliability checks

### Health endpoint
- `GET /api/health` emits `ok`, `degraded`, or `down`.
- Treasury freshness drives status via `checks.treasuryData.ageHours` and `staleAfterHours`.

### Summary consistency
- Use `GET /api/cadence` to verify weekly/monthly alignment.
- Use `GET /api/summary-delta` to explain drift when mismatches exist.

## Deployment notes
- Signal ops state is routed through `lib/serverStore.ts` adapter contracts.
- Default behavior uses file-backed persistence where Node file APIs are available (configurable via `WHETHER_SERVER_STORE_FILE`).
- If file APIs are unavailable or `WHETHER_SERVER_STORE_BACKEND=memory` is set, routes fall back to in-memory state.
