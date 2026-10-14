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

- Configure destination toggles per consumer/profile: `POST /api/alert-preferences`.
- Trigger delivery runs: `POST /api/alert-deliveries`.
- Inspect run history: `GET /api/alert-deliveries?clientId=<id>`.
- Operator audit trail for saved Decision Shield runs: `GET /api/decision-memory?clientId=<id>` or `GET /api/decision-memory?clientId=<id>&format=csv`.

## 3) Reliability and publish gates

### Health gate

- `GET /api/health` emits `ok`, `degraded` (HTTP 200), or `down` (HTTP 503).
- `degradedSources` names each live source that is not answering live, with its `state` (`stale`, `unconfirmed`, `cached`) and age.

### Consistency gate

- `GET /api/cadence` verifies weekly/monthly alignment: `alignmentStatus` is `aligned`, `watch` (constraint themes differ) or `mismatch` (regimes differ).
- `GET /api/summary-delta` explains mismatches when they occur.

### Suggested outbound policy

Before posting to Slack/email/webhooks:
1. Require `health.status === "ok"`.
2. Require `alignmentStatus === "aligned"` (no mismatched constraints).
3. Include `recordDateLabel`, `generatedAt`, and provenance in the outgoing payload.

## 4) Exemplary TypeScript Integration Client

```typescript
import { z } from "zod";

const WeeklyBriefSchema = z.object({
  version: z.string(),
  degraded: z.boolean(),
  recordDateLabel: z.string(),
  summary: z.object({
    regime: z.enum(["SCARCITY", "DEFENSIVE", "VOLATILE", "EXPANSION"]),
    operatingPosture: z.string(),
    copy: z.string(),
  }),
  structured: z.object({
    boundedNextActions: z.array(z.string()),
    reversalConditions: z.array(z.string()),
  }).optional(),
});

export async function fetchWeeklyOperatingCall(baseUrl = "https://whether.work") {
  // 1. Health check preflight
  const healthRes = await fetch(`${baseUrl}/api/health`);
  const health = await healthRes.json();
  if (health.status !== "ok") {
    console.warn(`[Whether] Degraded data health: ${health.status}`);
  }

  // 2. Fetch and parse brief payload
  const res = await fetch(`${baseUrl}/api/weekly`, {
    headers: { Accept: "application/json" },
  });
  
  if (!res.ok) {
    throw new Error(`Failed to fetch Whether brief: HTTP ${res.status}`);
  }

  const data = await res.json();
  return WeeklyBriefSchema.parse(data);
}
```

---

## 5) Model Context Protocol (MCP) Integration Pattern

When integrating Whether with Cursor, Claude Desktop, or custom agent runtimes:

```json
{
  "mcpServers": {
    "whether": {
      "url": "https://whether.work/api/mcp"
    }
  }
}
```

### Agent Prompt Template
```text
You have access to the 'whether' MCP server. Before generating recommendations for hiring,
infrastructure refactoring, or budget allocations, call 'whether.get_weekly_brief' to obtain
the current macroeconomic regime, Operating latitude, and bounded decision rules.
Enforce the retrieved payback and reversal triggers strictly in your output.
```

---

## 6) Deployment & Persistence Notes

- Alert/posture primitives use repository abstractions with durable KV bindings when available (`lib/storage/regimeAlertRepository.ts`, `lib/storage/postureDecisionEventRepository.ts`).
- Ingestion snapshots/materialized read models use the same pattern (`lib/ingestion/store.ts`) and automatically fall back to local file-backed storage in `.cache/ingestion` when durable KV is unavailable. `WHETHER_INGESTION_DIR` moves that directory; the test preload sets it to a fresh one per run, so a reading an earlier online run left in the checkout never reaches the suite.
- If durable KV bindings are unavailable or failing, repositories degrade to local fallback and report backend status (`durable` vs `local-fallback`) in API responses where relevant.
- See [`docs/cloudflare-deployment-runbook.md`](../cloudflare-deployment-runbook.md) for Wrangler KV provisioning steps.
