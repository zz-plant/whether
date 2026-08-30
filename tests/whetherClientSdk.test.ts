import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { WhetherClient } from "../lib/sdk/whetherClient";
import { handleMcpRequest } from "../lib/mcp/httpMcpServer";

describe("whetherClientSdk", () => {
  it("interacts with Whether MCP backend seamlessly", async () => {
    // Route mockFetch directly to our in-process handleMcpRequest handler
    const mockFetch = async (input: string | URL | Request, init?: RequestInit) => {
      const req = new Request(input, init);
      return handleMcpRequest(req);
    };

    const client = new WhetherClient({
      baseUrl: "http://localhost",
      fetchFn: mockFetch as any,
    });

    const result = await client.stressTestPlan({
      planText: "We want to hire 4 engineers with 14 months runway.",
    });

    assert.ok(result);
    assert.equal(result.detectedCategory, "HIRING");
    assert.ok(result.verdict);
    assert.ok(result.boundedGuardrail);
    assert.ok(result.reversalTrigger);
  });

  it("lints a commitment spec via the SDK", async () => {
    const mockFetch = async (input: string | URL | Request, init?: RequestInit) => {
      const req = new Request(input, init);
      return handleMcpRequest(req);
    };

    const client = new WhetherClient({
      baseUrl: "http://localhost",
      fetchFn: mockFetch as any,
    });

    const result = await client.lintCommitment(
      "We want to sign a 3-year GPU reservation cluster for $150k upfront."
    );

    assert.ok(result);
    assert.equal(result.detectedCategory, "INFRASTRUCTURE");
    assert.ok(result.reversibleAlternative);
  });

  it("fetches the historical analog playbook via the SDK", async () => {
    const mockFetch = async (input: string | URL | Request, init?: RequestInit) => {
      const req = new Request(input, init);
      return handleMcpRequest(req);
    };

    const client = new WhetherClient({
      baseUrl: "http://localhost",
      fetchFn: mockFetch as any,
    });

    const result = await client.getAnalogPlaybook();

    assert.ok(result);
    assert.ok(result.analogPeriod);
    assert.ok(result.consensusTrap);
    assert.ok(result.winningMove);
  });
});
