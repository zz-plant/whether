/**
 * Minimal MCP streamable-HTTP server for /api/mcp (JSON-RPC 2.0).
 *
 * Implements the request subset real MCP clients need to connect over HTTP —
 * initialize / ping / tools/list / tools/call — targeting protocol revision
 * 2025-06-18 (single-message transport; batching was removed from the spec).
 * Responses use `application/json`, which the streamable-HTTP transport
 * permits in place of an SSE stream for single-response requests.
 *
 * The legacy `?tool=` GET API in app/api/mcp/route.ts stays as-is; this module
 * exposes the same underlying capabilities through a compliant transport so
 * agent runtimes can mount whether.work as a standard MCP server.
 */
import { buildAgentInterfaceResponse, isAgentCadence } from "../agentInterface";
import { getRegimeContext, getRegimeProjection } from "../report/regimeContext";
import { getTimeMachineMonthsByYear } from "../timeMachine/timeMachineCache";
import { fetchSaaSValuations } from "../saasMultiples";
import { stressTestDecisionPlan } from "../decisionShield";
import { getHistoricalAnalogPlaybook } from "../analogPlaybook";
import { loadWeeklyBriefSnapshot } from "../report/weeklyBriefSnapshot";
import { agentSkills } from "../agentSkills";
import { loadCanonicalReportInputs } from "../ingestion/materialized";
import type { SignalKey } from "../ingestion/types";
import { DEFAULT_THRESHOLDS, type RegimeKey } from "../regimeEngineCore";
import { buildCanonicalBoundedDecisionRules, formatBoundedDecisionTriplet } from "../report/boundedDecisionRules";

export const MCP_PROTOCOL_VERSIONS = ["2025-06-18", "2025-03-26"] as const;

const SERVER_INFO = {
  name: "whether",
  title: "Whether — Weekly Macro Operating Brief",
  version: "1.0.0",
} as const;

const SERVER_INSTRUCTIONS =
  "Whether turns public macro data into a weekly operating call for startup leaders. " +
  "Call get_brief for the current regime, action, and confidence; get_decision_rules for the " +
  "bounded rules behind it; get_context and get_projection for regime trajectory; " +
  "get_recent_history for one signal's trailing window; get_comps for SaaS valuation multiples.";

const ALL_REGIMES: readonly RegimeKey[] = ["SCARCITY", "DEFENSIVE", "VOLATILE", "EXPANSION"];
const SIGNAL_KEYS: readonly SignalKey[] = [
  "TREASURY_1M",
  "TREASURY_3M",
  "TREASURY_2Y",
  "TREASURY_10Y",
  "BBB_CREDIT_SPREAD",
  "HY_CREDIT_SPREAD",
  "CPI_YOY",
  "UNEMPLOYMENT_RATE",
  "CHICAGO_FCI",
  "VIX_INDEX",
];

const isRegimeKey = (value: string): value is RegimeKey => ALL_REGIMES.some((regime) => regime === value);
const isSignalKey = (value: string): value is SignalKey => SIGNAL_KEYS.some((key) => key === value);

type JsonValue = unknown;

type JsonRpcId = string | number | null;

type JsonRpcMessage = {
  jsonrpc?: string;
  id?: JsonRpcId;
  method?: string;
  params?: Record<string, JsonValue>;
};

type ToolDefinition = {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, JsonValue>;
  execute: (args: Record<string, JsonValue>) => Promise<JsonValue>;
};

const numberArg = (args: Record<string, JsonValue>, key: string): number | undefined => {
  const value = args[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
};

const TOOLS: ToolDefinition[] = [
  {
    name: "get_brief",
    title: "Get the current operating brief",
    description:
      "Current regime, weekly operating call, confidence, and record date for the requested cadence.",
    inputSchema: {
      type: "object",
      properties: {
        cadence: {
          type: "string",
          enum: ["weekly", "monthly", "quarterly", "yearly"],
          description: "Brief cadence; defaults to weekly.",
        },
      },
    },
    execute: async (args) => {
      const requested = typeof args.cadence === "string" ? args.cadence : "weekly";
      const cadence = isAgentCadence(requested) ? requested : "weekly";
      return buildAgentInterfaceResponse(cadence);
    },
  },
  {
    name: "get_context",
    title: "Get regime context",
    description:
      "How long the given regime has been active, its historical average duration, and the most common next regime.",
    inputSchema: {
      type: "object",
      properties: {
        regime: { type: "string", description: "Regime key, e.g. DEFENSIVE or EXPANSION." },
      },
      required: ["regime"],
    },
    execute: async (args) => {
      if (typeof args.regime !== "string" || !args.regime) {
        throw new Error("Missing required argument: regime");
      }
      return getRegimeContext(args.regime.toUpperCase());
    },
  },
  {
    name: "get_projection",
    title: "Project weeks to regime flip",
    description:
      "Weeks until a threshold crossing at the current signal velocity, given scores and week-over-week deltas.",
    inputSchema: {
      type: "object",
      properties: {
        regime: { type: "string" },
        tightness: { type: "number" },
        riskAppetite: { type: "number" },
        tightnessDelta: { type: "number", description: "Defaults to 0." },
        riskAppetiteDelta: { type: "number", description: "Defaults to 0." },
      },
      required: ["regime", "tightness", "riskAppetite"],
    },
    execute: async (args) => {
      const regime = typeof args.regime === "string" ? args.regime : "";
      const tightness = numberArg(args, "tightness");
      const riskAppetite = numberArg(args, "riskAppetite");
      if (!regime || tightness === undefined || riskAppetite === undefined) {
        throw new Error("Missing required arguments: regime, tightness, riskAppetite");
      }
      return getRegimeProjection(
        regime.toUpperCase(),
        tightness,
        riskAppetite,
        numberArg(args, "tightnessDelta") ?? 0,
        numberArg(args, "riskAppetiteDelta") ?? 0,
      );
    },
  },
  {
    name: "get_comps",
    title: "Get SaaS valuation comps",
    description: "Median SaaS EV/Revenue multiple from 15 public companies.",
    inputSchema: { type: "object", properties: {} },
    execute: async () => fetchSaaSValuations(),
  },
  {
    name: "get_signals",
    title: "Get historical data coverage",
    description: "Available historical data coverage by year and month.",
    inputSchema: { type: "object", properties: {} },
    execute: async () => ({ coverage: getTimeMachineMonthsByYear() }),
  },
  {
    name: "stress_test_plan",
    title: "Stress-test a planned decision against live macro posture",
    description:
      "Audits a proposed operational decision (hiring, cloud commit, office lease, GTM pricing) against current macro tightness and risk appetite, outputting fragile assumptions, bounded guardrails, and reversal triggers.",
    inputSchema: {
      type: "object",
      properties: {
        planText: { type: "string", description: "The planned decision or initiative in plain English." },
        lifecycle: {
          type: "string",
          enum: ["DISCOVERY", "GROWTH", "SCALE", "MATURE"],
          description: "Company lifecycle stage; defaults to GROWTH.",
        },
      },
      required: ["planText"],
    },
    execute: async (args) => {
      const planText = typeof args.planText === "string" ? args.planText : "";
      if (!planText.trim()) throw new Error("Missing required argument: planText");
      const lifecycle = (args.lifecycle as any) ?? "GROWTH";
      const { snapshot } = await loadWeeklyBriefSnapshot();
      return stressTestDecisionPlan(snapshot.reportData.assessment, { planText, lifecycle });
    },
  },
  {
    name: "lint_commitment",
    title: "Lint engineering PRD / RFC / contract specs against live macro constraints",
    description:
      "Scans technical specifications or contract terms for fixed capital lock-in (multi-year reservations, high upfront cash commitments) and provides macro-safe reversible alternatives.",
    inputSchema: {
      type: "object",
      properties: {
        specText: { type: "string", description: "The PRD, RFC, or procurement specification text." },
      },
      required: ["specText"],
    },
    execute: async (args) => {
      const specText = typeof args.specText === "string" ? args.specText : "";
      if (!specText.trim()) throw new Error("Missing required argument: specText");
      const { snapshot } = await loadWeeklyBriefSnapshot();
      return stressTestDecisionPlan(snapshot.reportData.assessment, { planText: specText });
    },
  },
  {
    name: "get_analog_playbook",
    title: "Get historical analog playbook and consensus trap",
    description:
      "Matches current macro conditions against historical analogs (e.g. Q3 2007, Q4 2018, Q2 2022) to return what peer startups got wrong and what winners executed.",
    inputSchema: { type: "object", properties: {} },
    execute: async () => {
      const { snapshot } = await loadWeeklyBriefSnapshot();
      return getHistoricalAnalogPlaybook(snapshot.reportData.assessment);
    },
  },
  /* The three tools below existed only on the stdio server (scripts/mcp/whether-mcp-server.ts),
     which needs a local checkout. Remote clients get the same surface here. */
  {
    name: "get_decision_rules",
    title: "Get the bounded decision rules",
    description:
      "Action, pause threshold, and reversal trigger per operating area for one regime, or for all four regimes when none is given.",
    inputSchema: {
      type: "object",
      properties: {
        regime: {
          type: "string",
          enum: [...ALL_REGIMES],
          description: "Regime key. Omit to get every regime keyed by name.",
        },
      },
    },
    execute: async (args) => {
      const requested = typeof args.regime === "string" && args.regime !== "" ? args.regime.toUpperCase() : undefined;
      if (requested !== undefined && !isRegimeKey(requested)) {
        throw new Error(`Unknown regime: ${requested}`);
      }
      const rulesFor = (regime: RegimeKey) =>
        buildCanonicalBoundedDecisionRules({
          regime,
          thresholds: DEFAULT_THRESHOLDS,
          scores: { tightness: 50, riskAppetite: 50 },
        }).map((rule) => ({ area: rule.area, ...formatBoundedDecisionTriplet(rule) }));
      return requested ? rulesFor(requested) : Object.fromEntries(ALL_REGIMES.map((regime) => [regime, rulesFor(regime)]));
    },
  },
  {
    name: "get_recent_history",
    title: "Get one signal's trailing history",
    description:
      "The trailing 92-day window for one signal key from the materialized model, for temporal analysis without parsing the whole brief.",
    inputSchema: {
      type: "object",
      properties: {
        signal_key: { type: "string", enum: [...SIGNAL_KEYS] },
      },
      required: ["signal_key"],
    },
    execute: async (args) => {
      const key = typeof args.signal_key === "string" ? args.signal_key : "";
      if (!isSignalKey(key)) {
        throw new Error(`Unknown signal key: ${key || "(missing signal_key)"}`);
      }
      // Same posture as the report read path: serve what is materialized, refresh off-request.
      const inputs = await loadCanonicalReportInputs({ refresh: "background" });
      const history = inputs?.materializedSignals.recentHistory?.[key];
      if (!history) {
        throw new Error(`No history is materialized for ${key}`);
      }
      return { signal_key: key, history };
    },
  },
  {
    name: "list_agent_skills",
    title: "List the agent skills contract",
    description: "The skill ids and output order an agent runtime should follow when working from a Whether brief.",
    inputSchema: { type: "object", properties: {} },
    execute: async () => ({ skills: agentSkills }),
  },
];

export const listMcpTools = () =>
  TOOLS.map(({ name, title, description, inputSchema }) => ({ name, title, description, inputSchema }));

const JSON_RPC_ERRORS = {
  parseError: { code: -32700, message: "Parse error" },
  invalidRequest: { code: -32600, message: "Invalid Request" },
  methodNotFound: { code: -32601, message: "Method not found" },
  invalidParams: { code: -32602, message: "Invalid params" },
} as const;

const jsonResponse = (body: JsonValue, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const errorResponse = (
  id: JsonRpcId,
  error: { code: number; message: string },
  data?: string,
  status = 200,
) =>
  jsonResponse(
    { jsonrpc: "2.0", id, error: data ? { ...error, data } : error },
    status,
  );

const resultResponse = (id: JsonRpcId, result: JsonValue) =>
  jsonResponse({ jsonrpc: "2.0", id, result });

const negotiateProtocolVersion = (requested: JsonValue): string => {
  if (typeof requested === "string" && (MCP_PROTOCOL_VERSIONS as readonly string[]).includes(requested)) {
    return requested;
  }
  return MCP_PROTOCOL_VERSIONS[0];
};

/** Handle one MCP streamable-HTTP POST. */
export const handleMcpRequest = async (request: Request): Promise<Response> => {
  let message: JsonRpcMessage;
  try {
    message = (await request.json()) as JsonRpcMessage;
  } catch {
    return errorResponse(null, JSON_RPC_ERRORS.parseError, undefined, 400);
  }

  if (Array.isArray(message)) {
    // JSON-RPC batching was removed in protocol revision 2025-06-18.
    return errorResponse(
      null,
      JSON_RPC_ERRORS.invalidRequest,
      "Batch requests are not supported; send one message per POST.",
      400,
    );
  }

  if (!message || message.jsonrpc !== "2.0" || typeof message.method !== "string") {
    return errorResponse(message?.id ?? null, JSON_RPC_ERRORS.invalidRequest, undefined, 400);
  }

  // Notifications (no id) are accepted and produce no body.
  if (message.id === undefined) {
    return new Response(null, { status: 202 });
  }

  const id = message.id;
  const params = message.params ?? {};

  switch (message.method) {
    case "initialize":
      return resultResponse(id, {
        protocolVersion: negotiateProtocolVersion(params.protocolVersion),
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions: SERVER_INSTRUCTIONS,
      });

    case "ping":
      return resultResponse(id, {});

    case "tools/list":
      return resultResponse(id, { tools: listMcpTools() });

    case "tools/call": {
      const toolName = typeof params.name === "string" ? params.name : "";
      const tool = TOOLS.find((candidate) => candidate.name === toolName);
      if (!tool) {
        return errorResponse(id, JSON_RPC_ERRORS.invalidParams, `Unknown tool: ${toolName || "(missing name)"}`);
      }

      const args =
        params.arguments && typeof params.arguments === "object"
          ? (params.arguments as Record<string, JsonValue>)
          : {};

      try {
        const structured = await tool.execute(args);
        return resultResponse(id, {
          content: [{ type: "text", text: JSON.stringify(structured, null, 2) }],
          structuredContent: structured,
        });
      } catch (error) {
        // Tool execution failures are tool results with isError, not protocol errors.
        const text = error instanceof Error ? error.message : String(error);
        return resultResponse(id, {
          content: [{ type: "text", text }],
          isError: true,
        });
      }
    }

    default:
      return errorResponse(id, JSON_RPC_ERRORS.methodNotFound, message.method);
  }
};

/** True when a request reads as an MCP client opening an SSE stream (GET + Accept: text/event-stream). */
export const isMcpStreamOpenRequest = (request: Request): boolean => {
  const accept = request.headers.get("accept") ?? "";
  return accept.includes("text/event-stream");
};
