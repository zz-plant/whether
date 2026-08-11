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

export const MCP_PROTOCOL_VERSIONS = ["2025-06-18", "2025-03-26"] as const;

const SERVER_INFO = {
  name: "whether",
  title: "Whether — Weekly Macro Operating Brief",
  version: "1.0.0",
} as const;

const SERVER_INSTRUCTIONS =
  "Whether turns public macro data into a weekly operating call for startup leaders. " +
  "Call get_brief for the current regime, action, and confidence; get_context and " +
  "get_projection for regime trajectory; get_comps for SaaS valuation multiples.";

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
