import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { handleMcpRequest, listMcpTools } from "../lib/mcp/httpMcpServer";

describe("mcpCommitmentLinter and stress-testing tools", () => {
  it("lists the new AI capability tools", () => {
    const tools = listMcpTools();
    const names = tools.map((t) => t.name);

    assert.ok(names.includes("stress_test_plan"));
    assert.ok(names.includes("lint_commitment"));
    assert.ok(names.includes("get_analog_playbook"));
  });

  it("handles tools/call for stress_test_plan via MCP JSON-RPC", async () => {
    const request = new Request("http://localhost/api/mcp", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 101,
        method: "tools/call",
        params: {
          name: "stress_test_plan",
          arguments: {
            planText: "We want to hire 4 engineers with 12 months runway.",
          },
        },
      }),
    });

    const response = await handleMcpRequest(request);
    const body = (await response.json()) as any;

    assert.equal(body.id, 101);
    assert.ok(body.result);
    const data = body.result.structuredContent;
    assert.equal(data.detectedCategory, "HIRING");
    assert.ok(data.verdict);
    assert.ok(data.boundedGuardrail);
    assert.ok(data.reversalTrigger);
  });

  it("handles tools/call for lint_commitment on PRD/RFC text", async () => {
    const request = new Request("http://localhost/api/mcp", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 102,
        method: "tools/call",
        params: {
          name: "lint_commitment",
          arguments: {
            specText: "We propose signing a 3-year GPU reservation cluster for $150k upfront.",
          },
        },
      }),
    });

    const response = await handleMcpRequest(request);
    const body = (await response.json()) as any;

    assert.equal(body.id, 102);
    assert.ok(body.result);
    const data = body.result.structuredContent;
    assert.equal(data.detectedCategory, "INFRASTRUCTURE");
    assert.ok(data.reversibleAlternative);
  });

  it("handles tools/call for get_analog_playbook", async () => {
    const request = new Request("http://localhost/api/mcp", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 103,
        method: "tools/call",
        params: {
          name: "get_analog_playbook",
          arguments: {},
        },
      }),
    });

    const response = await handleMcpRequest(request);
    const body = (await response.json()) as any;

    assert.equal(body.id, 103);
    assert.ok(body.result);
    const data = body.result.structuredContent;
    assert.ok(data.analogPeriod);
    assert.ok(data.consensusTrap);
    assert.ok(data.winningMove);
  });
});
