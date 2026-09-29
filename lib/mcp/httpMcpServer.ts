/**
 * Minimal MCP streamable-HTTP server for /api/mcp (JSON-RPC 2.0).
 *
 * Implements the request subset real MCP clients need to connect over HTTP —
 * initialize / ping / tools/list / tools/call — targeting protocol revision
 * 2025-06-18 (single-message transport; batching was removed from the spec).
 * Responses use `application/json`, which the streamable-HTTP transport
 * permits in place of an SSE stream for single-response requests.
 *
 * The tools themselves are `lib/agent/tools.ts`, the same definitions the local
 * stdio server (`bun run mcp:whether`) and the plain-GET shim in
 * app/api/mcp/route.ts read; this module is only the transport.
 */
import { AgentInputError } from "../agent/inputs";
import { callAgentTool, listAgentTools } from "../agent/tools";
import { MCP_PROTOCOL_VERSIONS, MCP_SERVER_INFO, MCP_SERVER_INSTRUCTIONS } from "./serverIdentity";

type JsonValue = unknown;

type JsonRpcId = string | number | null;

type JsonRpcMessage = {
  jsonrpc?: string;
  id?: JsonRpcId;
  method?: string;
  params?: Record<string, JsonValue>;
};

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

const negotiateProtocolVersion = (requested: JsonValue): string =>
  MCP_PROTOCOL_VERSIONS.find((version) => version === requested) ?? MCP_PROTOCOL_VERSIONS[0];

/** Handle one MCP streamable-HTTP POST. */
export const handleMcpRequest = async (request: Request): Promise<Response> => {
  let message: JsonRpcMessage;
  try {
    message = await request.json();
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
        serverInfo: MCP_SERVER_INFO,
        instructions: MCP_SERVER_INSTRUCTIONS,
      });

    case "ping":
      return resultResponse(id, {});

    case "tools/list":
      return resultResponse(id, { tools: listAgentTools("http") });

    case "tools/call": {
      try {
        // Tool failures, including a caller's wrong arguments, are results with isError, not protocol errors.
        return resultResponse(id, await callAgentTool(typeof params.name === "string" ? params.name : "", params.arguments, "http"));
      } catch (error) {
        // An unknown tool is the one refusal that is the protocol's: the name is what `tools/call` is for.
        if (error instanceof AgentInputError) {
          return errorResponse(id, JSON_RPC_ERRORS.invalidParams, error.message);
        }
        throw error;
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
