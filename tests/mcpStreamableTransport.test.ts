import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { listAgentTools } from "../lib/agent/tools";
import { handleMcpRequest, isMcpStreamOpenRequest } from "../lib/mcp/httpMcpServer";
import { MCP_PROTOCOL_VERSIONS } from "../lib/mcp/serverIdentity";
import { buildWebMcpToolCall } from "../app/components/webMcpBridge";

// The SDK transport enforces the spec's Accept requirement: a client must accept
// both media types, even though this server answers JSON only.
const MCP_HEADERS = { "content-type": "application/json", accept: "application/json, text/event-stream" };

const postMcp = (body: unknown) =>
  handleMcpRequest(
    new Request("https://whether.work/api/mcp", {
      method: "POST",
      headers: MCP_HEADERS,
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );

/* The SDK's default limit on a request body. Written out, not imported: an SDK update that
   moves it changes what this route accepts, and should be seen here. */
const BODY_CAP_BYTES = 4 * 1024 * 1024;

const PING = JSON.stringify({ jsonrpc: "2.0", id: 1, method: "ping" });

/** A ping padded to an exact length with trailing spaces, which JSON ignores. */
const pingOfLength = (bytes: number) => PING + " ".repeat(bytes - PING.length);

describe("MCP streamable HTTP transport", () => {
  it("negotiates initialize with a supported protocol version", async () => {
    const response = await postMcp({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "test", version: "0" } },
    });
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.jsonrpc, "2.0");
    assert.equal(payload.id, 1);
    assert.equal(payload.result.protocolVersion, "2025-03-26");
    assert.equal(payload.result.serverInfo.name, "whether");
    assert.ok(payload.result.capabilities.tools, "advertises tools capability");
  });

  it("falls back to the latest protocol version for unknown requests", async () => {
    const response = await postMcp({
      jsonrpc: "2.0",
      id: 2,
      method: "initialize",
      // The SDK validates initialize params against the spec, which requires
      // capabilities and clientInfo; the bogus version is the point here.
      params: { protocolVersion: "1999-01-01", capabilities: {}, clientInfo: { name: "test", version: "0" } },
    });
    const payload = await response.json();
    assert.equal(payload.result.protocolVersion, MCP_PROTOCOL_VERSIONS[0]);
  });

  it("accepts notifications with 202 and no body", async () => {
    const response = await postMcp({ jsonrpc: "2.0", method: "notifications/initialized" });
    assert.equal(response.status, 202);
    assert.equal(await response.text(), "");
  });

  it("answers ping", async () => {
    const response = await postMcp({ jsonrpc: "2.0", id: 3, method: "ping" });
    const payload = await response.json();
    assert.deepEqual(payload.result, {});
  });

  it("lists tools with input schemas", async () => {
    const response = await postMcp({ jsonrpc: "2.0", id: 4, method: "tools/list" });
    const payload = await response.json();
    const names = payload.result.tools.map((tool: { name: string }) => tool.name);
    for (const expected of [
      "get_state",
      "get_brief",
      "get_context",
      "get_projection",
      "get_comps",
      "get_signals",
      "get_decision_rules",
      "get_recent_history",
      "list_agent_skills",
    ]) {
      assert.ok(names.includes(expected), `lists ${expected}`);
    }
    for (const tool of payload.result.tools) {
      assert.equal(tool.inputSchema.type, "object", `${tool.name} has an object schema`);
      assert.ok(tool.description, `${tool.name} has a description`);
    }
    assert.deepEqual(names, listAgentTools("http").map((tool) => tool.name));
    assert.ok(!names.includes("pull_recent_site_info"), "the local-only tool is not offered over HTTP");
  });

  /* The WebMCP bridge shipped sending only Content-Type; the browser's default Accept drew a 406 on every call. */
  it("answers the WebMCP bridge's own tools/call request", async () => {
    const response = await handleMcpRequest(
      new Request("https://whether.work/api/mcp", buildWebMcpToolCall("get_decision_rules", {})),
    );
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.ok(payload.result, "the call returns a result, not a transport error");
  });

  it("executes an offline tool via tools/call with structuredContent", async () => {
    const response = await postMcp({
      jsonrpc: "2.0",
      id: 5,
      method: "tools/call",
      params: { name: "get_signals", arguments: {} },
    });
    const payload = await response.json();
    assert.ok(!payload.error, "no protocol error");
    assert.ok(payload.result.content[0].text.includes("coverage"));
    assert.ok(payload.result.structuredContent.coverage, "structured content mirrors the text payload");
  });

  it("serves the bounded decision rules remotely, for one regime or all four", async () => {
    const all = await postMcp({ jsonrpc: "2.0", id: 40, method: "tools/call", params: { name: "get_decision_rules", arguments: {} } });
    const allPayload = await all.json();
    assert.deepEqual(Object.keys(allPayload.result.structuredContent).sort(), ["DEFENSIVE", "EXPANSION", "SCARCITY", "VOLATILE"]);

    const one = await postMcp({
      jsonrpc: "2.0",
      id: 41,
      method: "tools/call",
      params: { name: "get_decision_rules", arguments: { regime: "defensive" } },
    });
    const onePayload = await one.json();
    /* An object, like the all-regimes answer: `structuredContent` must be one, and the SDK
       client rejects a result whose structured content is an array. */
    assert.deepEqual(Object.keys(onePayload.result.structuredContent), ["DEFENSIVE"], "a single regime is a one-key object, lowercase accepted");
    assert.ok(onePayload.result.structuredContent.DEFENSIVE.length > 0);
    assert.ok("area" in onePayload.result.structuredContent.DEFENSIVE[0]);

    const bad = await postMcp({
      jsonrpc: "2.0",
      id: 42,
      method: "tools/call",
      params: { name: "get_decision_rules", arguments: { regime: "RAINY" } },
    });
    const badPayload = await bad.json();
    assert.equal(badPayload.result.isError, true);
    assert.match(badPayload.result.content[0].text, /Unknown regime "RAINY"\. Use one of: SCARCITY \(Freezing\), DEFENSIVE \(Cloudy\), VOLATILE \(Stormy\), EXPANSION \(Sunny\)\./);
    assert.equal(badPayload.result.structuredContent, undefined, "a refusal carries no structured content to validate");
  });

  it("lists the agent skills contract remotely", async () => {
    const response = await postMcp({ jsonrpc: "2.0", id: 43, method: "tools/call", params: { name: "list_agent_skills", arguments: {} } });
    const payload = await response.json();
    assert.ok(Array.isArray(payload.result.structuredContent.skills));
    assert.ok(payload.result.structuredContent.skills.length > 0);
  });

  it("reports missing tool arguments as a tool error, not a protocol error", async () => {
    const response = await postMcp({
      jsonrpc: "2.0",
      id: 6,
      method: "tools/call",
      params: { name: "get_recent_history", arguments: {} },
    });
    const payload = await response.json();
    assert.ok(!payload.error, "protocol layer stays clean");
    assert.equal(payload.result.isError, true);
    assert.match(payload.result.content[0].text, /Missing required argument: signal_key\. Use one of: TREASURY_1M/);
  });

  it("rejects unknown tools with invalid params", async () => {
    const response = await postMcp({
      jsonrpc: "2.0",
      id: 7,
      method: "tools/call",
      params: { name: "not_a_tool" },
    });
    const payload = await response.json();
    assert.equal(payload.error.code, -32602);
  });

  it("rejects unknown methods", async () => {
    const response = await postMcp({ jsonrpc: "2.0", id: 8, method: "resources/list" });
    const payload = await response.json();
    assert.equal(payload.error.code, -32601);
  });

  it("rejects batches per the 2025-06-18 revision", async () => {
    const response = await postMcp([
      { jsonrpc: "2.0", id: 9, method: "ping" },
      { jsonrpc: "2.0", id: 10, method: "ping" },
    ]);
    assert.equal(response.status, 400);
    const payload = await response.json();
    assert.equal(payload.error.code, -32600);
  });

  it("rejects malformed JSON with a parse error", async () => {
    const response = await postMcp("{not json");
    assert.equal(response.status, 400);
    const payload = await response.json();
    assert.equal(payload.error.code, -32700);
  });

  /* The route reads the body itself, to refuse a batch, and hands the transport the parsed
     message; the transport's limit covers only a body it reads, so until 2026-11-12 a POST
     of any size was read into memory.

     An over-cap body is refused, but the rest of the upload is still taken and thrown away
     before the 413 goes out. Answering while the client was still sending is what the first
     version did, and Cloudflare's edge turned 3 of 7 such answers into its own 502
     (production, 2026-11-12). Past DISCARD_CEILING_BYTES the upload is cancelled instead. */
  const DISCARD_CEILING_BYTES = 8 * BODY_CAP_BYTES;

  /** A request whose body is `available` bytes of spaces, counted as the handler takes them. */
  const streamedRequest = (available: number, headers: Record<string, string> = {}) => {
    const chunk = new Uint8Array(64 * 1024).fill(0x20);
    const taken = { bytes: 0, cancelled: false };
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (taken.bytes >= available) {
          controller.close();
          return;
        }
        taken.bytes += chunk.byteLength;
        controller.enqueue(chunk);
      },
      cancel() {
        taken.cancelled = true;
      },
    });
    const request = new Request("https://whether.work/api/mcp", {
      method: "POST",
      headers: { ...MCP_HEADERS, ...headers },
      body,
    });
    return { request, taken };
  };

  const assertTooLarge = async (response: Response) => {
    assert.equal(response.status, 413);
    assert.match(response.headers.get("content-type") ?? "", /application\/json/);
    assert.deepEqual(await response.json(), {
      jsonrpc: "2.0",
      id: null,
      error: { code: -32000, message: "Payload Too Large: Request body must not exceed 4194304 bytes" },
    });
  };

  it("refuses a declared Content-Length over the cap with 413, after taking the upload", async () => {
    const available = BODY_CAP_BYTES + 2 * 1024 * 1024;
    const { request, taken } = streamedRequest(available, { "content-length": String(available) });

    await assertTooLarge(await handleMcpRequest(request));

    assert.equal(taken.bytes, available, "the whole upload was taken before the answer");
    assert.equal(taken.cancelled, false);
  });

  it("refuses a small body that declares an over-cap length, whatever it holds", async () => {
    const request = new Request("https://whether.work/api/mcp", {
      method: "POST",
      headers: { ...MCP_HEADERS, "content-length": String(BODY_CAP_BYTES + 1) },
      // A small, valid body: only the declared length can be what refuses it.
      body: PING,
    });

    await assertTooLarge(await handleMcpRequest(request));
  });

  it("refuses a streamed body that declares no length once it passes the cap, after taking the rest", async () => {
    const available = BODY_CAP_BYTES * 2;
    const { request, taken } = streamedRequest(available);
    assert.equal(request.headers.get("content-length"), null);

    await assertTooLarge(await handleMcpRequest(request));

    assert.equal(taken.bytes, available, "the whole upload was taken before the answer");
    assert.equal(taken.cancelled, false);
  });

  it("stops taking an upload at the discard ceiling and cancels it", async () => {
    const available = DISCARD_CEILING_BYTES * 4;
    const { request, taken } = streamedRequest(available);

    await assertTooLarge(await handleMcpRequest(request));

    assert.ok(
      taken.bytes <= BODY_CAP_BYTES + DISCARD_CEILING_BYTES + 1024 * 1024,
      `taking stopped near the ceiling: ${taken.bytes} of ${available} bytes were taken`,
    );
    assert.equal(taken.cancelled, true, "the rest of the upload was cancelled");
  });

  it("still answers 413 when the upload fails while it is being discarded", async () => {
    let sent = 0;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        sent += 1;
        if (sent > 80) {
          controller.error(new Error("client went away"));
          return;
        }
        controller.enqueue(new Uint8Array(64 * 1024).fill(0x20));
      },
    });
    const request = new Request("https://whether.work/api/mcp", { method: "POST", headers: MCP_HEADERS, body });

    await assertTooLarge(await handleMcpRequest(request));
  });

  it("answers a body exactly at the cap as before, and refuses one byte more", async () => {
    const atCap = await postMcp(pingOfLength(BODY_CAP_BYTES));
    assert.equal(atCap.status, 200);
    assert.deepEqual(await atCap.json(), { result: {}, jsonrpc: "2.0", id: 1 });

    const over = await postMcp(pingOfLength(BODY_CAP_BYTES + 1));
    assert.equal(over.status, 413);
    const payload = await over.json();
    assert.equal(payload.id, null);
    assert.equal(payload.error.code, -32000);
  });

  it("detects SSE stream-open requests", () => {
    const sse = new Request("https://whether.work/api/mcp", { headers: { accept: "text/event-stream" } });
    const plain = new Request("https://whether.work/api/mcp", { headers: { accept: "application/json" } });
    assert.equal(isMcpStreamOpenRequest(sse), true);
    assert.equal(isMcpStreamOpenRequest(plain), false);
  });
});
