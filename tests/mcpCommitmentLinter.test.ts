import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { listAgentTools } from "../lib/agent/tools";
import { handleMcpRequest } from "../lib/mcp/httpMcpServer";
import { serveUnreachableUpstreams } from "./fixtures/unreachableUpstreams";

serveUnreachableUpstreams();

describe("mcpCommitmentLinter and stress-testing tools", () => {
  it("lists the new AI capability tools", () => {
    const tools = listAgentTools("http");
    const names = tools.map((t) => t.name);

    assert.ok(names.includes("stress_test_plan"));
    assert.ok(names.includes("lint_commitment"));
    assert.ok(names.includes("lint_sprint_goal"));
    assert.ok(names.includes("audit_sprint_retro"));
    assert.ok(names.includes("get_analog_playbook"));
  });

  it("handles tools/call for stress_test_plan via MCP JSON-RPC", async () => {
    const request = new Request("http://localhost/api/mcp", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
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
    const body: any = await response.json();

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
      headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
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
    const body: any = await response.json();

    assert.equal(body.id, 102);
    assert.ok(body.result);
    const data = body.result.structuredContent;
    assert.equal(data.detectedCategory, "INFRASTRUCTURE");
    assert.ok(data.reversibleAlternative);
  });

  it("handles tools/call for get_analog_playbook", async () => {
    const request = new Request("http://localhost/api/mcp", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
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
    const body: any = await response.json();

    assert.equal(body.id, 103);
    assert.ok(body.result);
    const data = body.result.structuredContent;
    assert.ok(data.analogPeriod);
    assert.ok(data.consensusTrap);
    assert.ok(data.winningMove);
  });

  it("lints a sprint goal to holds/pauses/needs_reversal_guardrail with the bounded rule's trigger", async () => {
    const request = new Request("http://localhost/api/mcp", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 104,
        method: "tools/call",
        params: {
          name: "lint_sprint_goal",
          arguments: {
            goalText: "Ship the v2 migration across three long-running refactor tracks this sprint.",
          },
        },
      }),
    });

    const response = await handleMcpRequest(request);
    const body: any = await response.json();

    assert.equal(body.id, 104);
    assert.ok(body.result);
    const data = body.result.structuredContent;
    assert.ok(["holds", "pauses", "needs_reversal_guardrail"].includes(data.verdict));
    assert.ok(typeof data.pauseTrigger === "string" && data.pauseTrigger.length > 0);
    assert.ok(typeof data.reversalTrigger === "string" && data.reversalTrigger.length > 0);
    assert.ok(Array.isArray(data.fragileAssumptions));
  });

  it("handles tools/call for audit_sprint_retro via MCP JSON-RPC", async () => {
    const request = new Request("http://localhost/api/mcp", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 105,
        method: "tools/call",
        params: {
          name: "audit_sprint_retro",
          arguments: {
            planText: "Committed to 3 new roles without revenue payback proof.",
          },
        },
      }),
    });

    const response = await handleMcpRequest(request);
    const body: any = await response.json();

    assert.equal(body.id, 105);
    assert.ok(body.result);
    const data = body.result.structuredContent;
    assert.ok(data.regime);
    assert.ok(typeof data.headline === "string");
    assert.ok(Array.isArray(data.activePauseTriggers));
    assert.ok(typeof data.markdown === "string");
  });
});
