# CLI fallback API (curl-first)

Use this when CLI install/auth is blocked and you still need an automation-safe weekly read path.

## Stable endpoint for automation

- **Endpoint:** `GET /api/cli/status`
- **Contract:** `version: "v1"` response payload.
- **Why this is stable enough for automation:** it is the CLI default read route (`whether status`) and has dedicated contract/query tests in this repo.
- **Supported query params:**
  - `asOf=YYYY-MM` (historical month replay)
  - `view=expanded` (bounded-decision detail)

## Required request headers

Whether currently does not enforce auth by default, but automation clients should send:

- `Accept: application/json` (required for predictable machine output)
- `Authorization: Bearer <token>` (required only when your deployment is gated by proxy/auth)

## Minimal curl example (live status)

```bash
curl -sS "$BASE_URL/api/cli/status" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $WHETHER_TOKEN" \
  | jq '{version, generatedAt, updatedAt, regime, trend, degraded, call: {summary: .call.summary, flipConditions: .call.flipConditions}}'
```

Expected JSON shape (example values):

```json
{
  "version": "v1",
  "generatedAt": "2026-03-12T12:34:56.000Z",
  "updatedAt": "2026-03-12T12:00:00.000Z",
  "regime": "Guarded Expansion",
  "trend": "Deteriorating",
  "degraded": false,
  "call": {
    "summary": "Stage decisions. Avoid irreversible spend.",
    "flipConditions": [
      "tightness < 60 for 2 consecutive refreshes"
    ]
  }
}
```

If your deployment is public and ungated, omit the `Authorization` header.

## Historical replay example

```bash
curl -sS "$BASE_URL/api/cli/status?asOf=2024-07" \
  -H "Accept: application/json" \
  | jq '{version, updatedAt, regime, degraded}'
```

## Expanded bounded-decision example

```bash
curl -sS "$BASE_URL/api/cli/status?view=expanded" \
  -H "Accept: application/json" \
  | jq '{version, view, boundedDecision: {guardrailThreshold, reversalTrigger, flipConditionsCompact}}'
```

## Failure handling contract (automation)

- `400` for unsupported query params or invalid `asOf` format.
- `401/403` when auth is required and missing/invalid.
- `429` for quota/rate-limit pressure.
- `5xx` for upstream/platform failure.

For scripted workflows, treat non-2xx as retry-or-hold conditions and gate outbound briefs on `/api/health` as documented in `quickstart.md`.
