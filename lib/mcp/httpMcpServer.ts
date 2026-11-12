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
 * Refusing a batch means reading the body here, so the SDK's cap on a request
 * body has to be applied here too: the transport enforces it only on a body
 * it reads itself, and it is handed this one already parsed.
 *
 * The server is `lib/mcp/server.ts`, the one the local stdio server
 * (`bun run mcp:whether`) also runs, over the tools in `lib/agent/tools.ts`
 * that the plain-GET shim in app/api/mcp/route.ts reads too; this module is
 * only the transport.
 */
import {
  DEFAULT_MAX_REQUEST_BODY_SIZE,
  readRequestBody,
  requestBodyTooLargeMessage,
} from "@modelcontextprotocol/sdk/server/requestBody.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createWhetherMcpServer } from "./server";

const jsonErrorResponse = (status: number, code: number, message: string) =>
  new Response(JSON.stringify({ jsonrpc: "2.0", id: null, error: { code, message } }), {
    status,
    headers: { "content-type": "application/json" },
  });

/**
 * How much of an over-cap upload is still taken before the 413 goes out: eight
 * times the cap, 32 MiB. A longer upload is cancelled there.
 */
const DISCARD_CEILING_BYTES = 8 * DEFAULT_MAX_REQUEST_BODY_SIZE;

/**
 * Take what is left of a refused upload and keep none of it.
 *
 * A Worker that answers while the client is still sending does not reliably
 * get its answer delivered: in production on 2026-11-12, Cloudflare's edge
 * replaced 3 of 7 such 413s with its own 502. Reading the upload to its end
 * first removes the race. Each chunk is dropped as it arrives, so memory stays
 * flat whatever the size, which is what the cap is for.
 */
const discardRequestBody = async (request: Request): Promise<void> => {
  if (request.body === null || request.body.locked) return;
  const reader = request.body.getReader();
  try {
    let discarded = 0;
    while (discarded < DISCARD_CEILING_BYTES) {
      const { done, value } = await reader.read();
      if (done) return;
      discarded += value.byteLength;
    }
    await reader.cancel();
  } catch {
    // The upload failed or was aborted. The request is refused either way.
  } finally {
    reader.releaseLock();
  }
};

/** Handle one MCP streamable-HTTP POST. */
export const handleMcpRequest = async (request: Request): Promise<Response> => {
  // The body is parsed here so a batched request can be refused before the
  // transport parses and processes it: the SDK still accepts arrays, which
  // clients of the negotiated revisions no longer send, and a 2026 protocol
  // caller that batches is buggy rather than old.
  //
  // It is read with the SDK's own reader and limit (4 MiB), the ones the
  // transport would use on an unread request: a declared Content-Length over
  // the limit is refused on the header alone, and a body that turns out
  // longer than it declared, or declared nothing, stops being kept once it
  // passes the limit. The rest of a refused upload is discarded before the
  // answer, which is the transport's: 413 and code -32000.
  let message: unknown;
  try {
    const body = await readRequestBody(request, DEFAULT_MAX_REQUEST_BODY_SIZE);
    if (body.tooLarge) {
      await discardRequestBody(request);
      return jsonErrorResponse(413, -32000, requestBodyTooLargeMessage(DEFAULT_MAX_REQUEST_BODY_SIZE));
    }
    message = JSON.parse(body.text);
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
