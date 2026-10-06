/**
 * MCP streamable-HTTP transport for /api/mcp, on the official SDK.
 *
 * Before 2026-10 this file was ~120 lines of hand-written JSON-RPC 2.0 —
 * request shapes, error codes, protocol negotiation, batch rejection — the
 * exact details the SDK exists to own and that drift from the spec. The SDK
 * was already a dependency for the stdio server; this module now delegates to
 * its web-standard streamable-HTTP transport and keeps only the two decisions
 * that are ours: stateless mode (a fresh transport and `Server` per request,
 * as the SDK requires for serverless) and the refusal of batched requests,
 * which protocol revision 2025-06-18 removed.
 *
 * The server is `lib/mcp/server.ts`, the one the local stdio server
 * (`bun run mcp:whether`) also runs, over the tools in `lib/agent/tools.ts`
 * that the plain-GET shim in app/api/mcp/route.ts reads too; this module is
 * only the transport.
 */
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createWhetherMcpServer } from "./server";

const jsonErrorResponse = (status: number, code: number, message: string) =>
  new Response(JSON.stringify({ jsonrpc: "2.0", id: null, error: { code, message } }), {
    status,
    headers: { "content-type": "application/json" },
  });

/** Handle one MCP streamable-HTTP POST. */
export const handleMcpRequest = async (request: Request): Promise<Response> => {
  // The body is parsed here so a batched request can be refused before the
  // transport parses and processes it: the SDK still accepts arrays, which
  // clients of the negotiated revisions no longer send, and a 2026 protocol
  // caller that batches is buggy rather than old.
  let message: unknown;
  try {
    message = JSON.parse(await request.text());
  } catch {
    return jsonErrorResponse(400, -32700, "Parse error: Invalid JSON");
  }
  if (Array.isArray(message)) {
    // JSON-RPC batching was removed in protocol revision 2025-06-18.
    return jsonErrorResponse(400, -32600, "Batch requests are not supported; send one message per POST.");
  }

  // Stateless mode: no session id is issued and each request gets a fresh
  // transport, which the SDK requires for serverless handlers (reusing one
  // collides message ids between concurrent clients).
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  const server = createWhetherMcpServer("http");

  await server.connect(transport);
  return transport.handleRequest(request, { parsedBody: message });
};

/** True when a request reads as an MCP client opening an SSE stream (GET + Accept: text/event-stream). */
export const isMcpStreamOpenRequest = (request: Request): boolean => {
  const accept = request.headers.get("accept") ?? "";
  return accept.includes("text/event-stream");
};
