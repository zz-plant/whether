import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { handleMcpRequest } from "../lib/mcp/httpMcpServer";
import { createWhetherMcpServer } from "../lib/mcp/server";
import { getPublishedBriefs } from "../lib/report/publishedBriefs";
import { serveUnreachableUpstreams } from "./fixtures/unreachableUpstreams";

serveUnreachableUpstreams();

/*
 * Prompts and resources are the parts of the server a person reaches for in a client's menu,
 * not ones a model calls. Each runs a tool from lib/agent/tools.ts, so these tests hold them
 * to that tool's answer, on the bundled reading the read path serves when upstreams are down.
 */

const rpc = async (method: string, params?: Record<string, unknown>) => {
  const response = await handleMcpRequest(
    new Request("https://whether.work/api/mcp", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, ...(params ? { params } : {}) }),
    }),
  );
  return response.json();
};

describe("MCP prompts and resources", () => {
  it("advertises both capabilities, without subscriptions, on both transports", async () => {
    const init = await rpc("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "test", version: "0" } });
    assert.deepEqual(init.result.capabilities.prompts, { listChanged: false });
    assert.deepEqual(init.result.capabilities.resources, { subscribe: false, listChanged: false });
    // The stdio server is built by the same function; it must not lose what the remote one has.
    const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: "test", version: "0" });
    await Promise.all([createWhetherMcpServer("stdio").connect(serverSide), client.connect(clientSide)]);
    try {
      assert.deepEqual(client.getServerCapabilities()?.resources, { subscribe: false, listChanged: false });
      assert.equal((await client.listPrompts()).prompts.length, 3);
    } finally {
      await client.close();
    }
  });

  it("lists the state, the weekly brief and the newest published weeks", async () => {
    const { result } = await rpc("resources/list");
    const uris: string[] = result.resources.map((resource: { uri: string }) => resource.uri);
    assert.deepEqual(uris.slice(0, 2), ["whether://state", "whether://brief/weekly"]);
    assert.equal(uris[2], `whether://weeks/${getPublishedBriefs()[0].slug}`);
    const templates = await rpc("resources/templates/list");
    assert.equal(templates.result.resourceTemplates[0].uriTemplate, "whether://weeks/{week}");
  });

  it("reads the state as get_state answers it", async () => {
    const { result } = await rpc("resources/read", { uri: "whether://state" });
    const [content] = result.contents;
    assert.equal(content.mimeType, "application/json");
    const state = JSON.parse(content.text);
    assert.equal(typeof state.headline, "string");
    assert.equal(typeof state.automation.ready, "boolean");
  });

  it("reads a published week through the template, and refuses one that was never published", async () => {
    const week = getPublishedBriefs()[1].slug;
    const { result } = await rpc("resources/read", { uri: `whether://weeks/${week}` });
    assert.equal(JSON.parse(result.contents[0].text).slug, week);

    const missing = await rpc("resources/read", { uri: "whether://weeks/1999-w01" });
    assert.equal(missing.error.code, -32602);
    assert.match(missing.error.message, /No brief was published for 1999-w01/);
    const unknown = await rpc("resources/read", { uri: "https://example.com/" });
    assert.equal(unknown.error.code, -32602);
  });

  it("reads a week written the way a client may fill the template, and refuses a malformed one as the caller's", async () => {
    const [year, number] = getPublishedBriefs()[0].slug.split("-w");
    const { result } = await rpc("resources/read", { uri: `whether://weeks/${year}-W${Number(number)}` });
    assert.equal(JSON.parse(result.contents[0].text).slug, getPublishedBriefs()[0].slug);
    for (const uri of ["whether://weeks/%E0", "whether://weeks/last-week"]) {
      const refused = await rpc("resources/read", { uri });
      assert.equal(refused.error.code, -32602, uri);
    }
  });

  it("lists three prompts with their arguments", async () => {
    const { result } = await rpc("prompts/list");
    assert.deepEqual(result.prompts.map((prompt: { name: string }) => prompt.name), ["check-plan", "answer-question", "share-this-week"]);
    const checkPlan = result.prompts[0];
    assert.deepEqual(checkPlan.arguments.map((arg: { name: string; required: boolean }) => [arg.name, arg.required]), [["plan", true], ["runway_months", false]]);
  });

  it("carries the stress test's verdict and the state inside check-plan", async () => {
    const { result } = await rpc("prompts/get", { name: "check-plan", arguments: { plan: "Sign a three-year cloud commitment", runway_months: "18" } });
    const [message] = result.messages;
    assert.equal(message.role, "user");
    const text: string = message.content.text;
    assert.match(text, /Plan: Sign a three-year cloud commitment/);
    const testJson = text.split("Stress test (stress_test_plan):\n")[1].split("\n\n")[0];
    assert.ok("verdict" in JSON.parse(testJson), "the verdict arrives as data");
    assert.match(text, /This week's state \(get_state\):\n\{/);
    assert.match(text, /automation\.ready is false/);
    assert.doesNotMatch(text, /not a number of months/);
  });

  it("tells the model when a runway could not be read, instead of dropping it", async () => {
    const { result } = await rpc("prompts/get", { name: "check-plan", arguments: { plan: "Hire two engineers", runway_months: "about a year" } });
    assert.match(result.messages[0].content.text, /The runway given \("about a year"\) is not a number of months/);
    const months = await rpc("prompts/get", { name: "check-plan", arguments: { plan: "Hire two engineers", runway_months: "18 months" } });
    assert.doesNotMatch(months.result.messages[0].content.text, /not a number of months/);
  });

  it("passes on get_answer's refusal instead of failing the prompt", async () => {
    const { result } = await rpc("prompts/get", { name: "answer-question", arguments: { question: "what colour is the sky" } });
    assert.match(result.messages[0].content.text, /"refused":"No answer/);
  });

  it("builds share-this-week from the standup line and the state", async () => {
    const { result } = await rpc("prompts/get", { name: "share-this-week" });
    const text: string = result.messages[0].content.text;
    assert.match(text, /Standup line \(get_standup_line\):\n\{"standupLine"/);
    // The prompt's own words, before the data it carries: the guidance never presumes a team, a board or an approver.
    const instructions = text.slice(0, text.indexOf("Standup line (get_standup_line):"));
    assert.doesNotMatch(instructions, /\b(your|the) (team|teams|engineers|board|manager|approver|leadership)\b/i, "it presumes no team or board");
  });

  it("refuses an unknown prompt and a missing required argument as invalid params", async () => {
    const unknown = await rpc("prompts/get", { name: "nope" });
    assert.equal(unknown.error.code, -32602);
    assert.match(unknown.error.message, /Available: check-plan/);
    const missing = await rpc("prompts/get", { name: "check-plan", arguments: {} });
    assert.equal(missing.error.code, -32602);
    assert.match(missing.error.message, /needs plan/);
  });
});
