import assert from "node:assert/strict";
import { afterEach, describe, it } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { listAgentTools } from "../lib/agent/tools";
import { MCP_SERVER_INFO } from "../lib/mcp/serverIdentity";
import { createWhetherMcpServer } from "../lib/mcp/server";
import { serveUnreachableUpstreams } from "./fixtures/unreachableUpstreams";

serveUnreachableUpstreams();

/*
 * The local server (`bun run mcp:whether`) and the remote one (`/api/mcp`) read one registry,
 * so a client configured against either finds the same tools that answer the same way. This
 * drives the local one through the SDK's own client, which also does what a real client does
 * with a tool that publishes an output schema: checks what comes back against it.
 */

const open: Client[] = [];

/** What a call returned as an object; the SDK types it as `{}` and a test wants to read fields. */
const structuredOf = (result: unknown) => z.object({ structuredContent: z.record(z.string(), z.unknown()) }).parse(result).structuredContent;

const connect = async () => {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test", version: "0" });
  await Promise.all([createWhetherMcpServer("stdio").connect(serverTransport), client.connect(clientTransport)]);
  open.push(client);
  return client;
};

describe("the local MCP server", () => {
  afterEach(async () => {
    await Promise.all(open.splice(0).map((client) => client.close()));
  });

  it("is the same server the remote one is, told the same way", async () => {
    const client = await connect();

    assert.equal(client.getServerVersion()?.name, MCP_SERVER_INFO.name);
    assert.equal(client.getServerVersion()?.version, MCP_SERVER_INFO.version);
    assert.match(client.getInstructions() ?? "", /Call get_state first/);
  });

  it("lists the tools the registry has for it, each a shape the SDK itself accepts", async () => {
    const client = await connect();
    const { tools } = await client.listTools();

    assert.deepEqual(tools.map((tool) => tool.name), listAgentTools("stdio").map((tool) => tool.name));
    assert.ok(tools.some((tool) => tool.name === "pull_recent_site_info"), "the tool only a local agent needs");
    assert.equal(tools.find((tool) => tool.name === "get_state")?.annotations?.readOnlyHint, true);
  });

  it("answers get_state with a result the client validates against the schema the tool published", async () => {
    const client = await connect();
    // `callTool` throws when a tool with an output schema returns structured content that does not match it.
    const result = await client.callTool({ name: "get_state", arguments: {} });

    assert.ok(!result.isError);
    assert.equal(structuredOf(result).version, "v1");
    assert.equal(typeof structuredOf(result).automation, "object");
  });

  it("still answers to get_agent_brief, and takes the page's word for a regime", async () => {
    const client = await connect();

    const brief = await client.callTool({ name: "get_agent_brief", arguments: { cadence: "weekly" } });
    assert.equal(structuredOf(brief).cadence, "weekly");

    const context = await client.callTool({ name: "get_context", arguments: { regime: "Sunny" } });
    assert.equal(structuredOf(context).currentRegime, "EXPANSION");
  });

  it("refuses a wrong argument in a result that says what would work, and an unknown tool as the protocol does", async () => {
    const client = await connect();

    const wrong = await client.callTool({ name: "get_context", arguments: { regime: "rainy" } });
    assert.equal(wrong.isError, true);
    assert.deepEqual(wrong.content, [
      {
        type: "text",
        text: 'Unknown regime "rainy". Use one of: SCARCITY (Freezing), DEFENSIVE (Cloudy), VOLATILE (Stormy), EXPANSION (Sunny).',
      },
    ]);

    const missing = await client.callTool({ name: "get_weather", arguments: {} }).then(
      () => null,
      (error) => error,
    );
    assert.ok(missing instanceof McpError);
    assert.equal(missing.code, ErrorCode.InvalidParams);
    assert.match(missing.message, /Unknown tool: "get_weather"\. Available: get_state,/);
  });
});
