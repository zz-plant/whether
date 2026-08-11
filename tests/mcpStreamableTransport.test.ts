import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import {
  handleMcpRequest,
  isMcpStreamOpenRequest,
  listMcpTools,
  MCP_PROTOCOL_VERSIONS,
} from "../lib/mcp/httpMcpServer";

const postMcp = (body: unknown) =>
  handleMcpRequest(
    new Request("https://whether.work/api/mcp", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );

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
      params: { protocolVersion: "1999-01-01" },
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
    for (const expected of ["get_brief", "get_context", "get_projection", "get_comps", "get_signals"]) {
      assert.ok(names.includes(expected), `lists ${expected}`);
    }
    for (const tool of payload.result.tools) {
      assert.equal(tool.inputSchema.type, "object", `${tool.name} has an object schema`);
      assert.ok(tool.description, `${tool.name} has a description`);
    }
    assert.deepEqual(names, listMcpTools().map((tool) => tool.name));
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

  it("reports missing tool arguments as a tool error, not a protocol error", async () => {
    const response = await postMcp({
      jsonrpc: "2.0",
      id: 6,
      method: "tools/call",
      params: { name: "get_context", arguments: {} },
    });
    const payload = await response.json();
    assert.ok(!payload.error, "protocol layer stays clean");
    assert.equal(payload.result.isError, true);
    assert.match(payload.result.content[0].text, /regime/);
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

  it("detects SSE stream-open requests", () => {
    const sse = new Request("https://whether.work/api/mcp", { headers: { accept: "text/event-stream" } });
    const plain = new Request("https://whether.work/api/mcp", { headers: { accept: "application/json" } });
    assert.equal(isMcpStreamOpenRequest(sse), true);
    assert.equal(isMcpStreamOpenRequest(plain), false);
  });
});
