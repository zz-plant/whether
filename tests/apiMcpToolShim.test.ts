import assert from "node:assert/strict";
import { afterEach, describe, it } from "bun:test";
import { GET as getMcp, OPTIONS as optionsMcp, POST as postMcp } from "../app/api/mcp/route";
import { describeAgentTools } from "../lib/agent/tools";
import { agentStateSchema } from "../lib/agentState";

/*
 * The plain-GET tool shim on `/api/mcp`, which `/llms.txt` advertises as the way for an
 * agent without an MCP client to call these tools. `tests/mcpStreamableTransport.test.ts`
 * covers the JSON-RPC transport underneath; nothing covered this shim.
 *
 * `get_comps` answered 500 when the quote source was unreachable — in production, not just
 * here. `/api/comps` returns 503 for the same condition, deliberately, because "an
 * unreachable source is not an empty basket". The shim's generic catch flattened that into
 * a 500, which tells an agent this server is broken rather than that an upstream is down
 * and the call is worth retrying.
 */

const callTool = (tool: string) =>
  getMcp(new Request(`https://whether.work/api/mcp?tool=${tool}`));

/* Annotated rather than cast: `review:hotspot-preflight` counts `as typeof fetch` as an
   unsafe assertion, and the annotation gives the same type with the same safety. Same
   shape as `disabledFetch` in tests/agentRoutes.test.ts. */
const unreachableUpstream: typeof fetch = async () => {
  throw new Error("quote source unreachable");
};

describe("/api/mcp GET tool shim", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("reports an unreachable quote source as 503, matching /api/comps", async () => {
    // The suite runs offline, so the quote source is already unreachable; making it
    // explicit keeps the test honest about what it is exercising.
    globalThis.fetch = unreachableUpstream;

    const response = await callTool("get_comps");
    const body = await response.json();

    assert.equal(response.status, 503, "an unreachable upstream is not a server fault");
    assert.equal(body.ok, false);
    assert.equal(body.error, "quote_source_unavailable");
  });

  it("still answers the offline tools while an upstream is down", async () => {
    globalThis.fetch = unreachableUpstream;

    // get_actions is the discovery tool: it must not depend on any upstream, or an agent
    // cannot even learn what else to call.
    const response = await callTool("get_actions");
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.ok, true);
    assert.ok(
      body.tools.some((tool: { name: string }) => tool.name === "get_comps"),
      "get_actions should still advertise the tool that is currently degraded",
    );
  });
});

/*
 * The shim reads the same tool definitions the MCP transports do, so an agent without an MCP
 * client is told the same things: which tools exist, what each takes, and what it may pass.
 * Before, an unknown `?tool=` fell through to the brief and answered 200, `riskAppetite=0`
 * was refused as missing, `get_actions` listed six of the twelve tools, and "Every MCP tool
 * also answers a plain GET" (the public docs) was true of five.
 */
describe("/api/mcp GET tool shim, on the shared tools", () => {
  const get = (query: string) => getMcp(new Request(`https://whether.work/api/mcp?${query}`));

  it("refuses a tool that does not exist and lists the ones that do, where it used to answer the brief", async () => {
    const response = await get("tool=get_weather");
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.ok, false);
    assert.equal(body.error, "unknown_tool");
    assert.ok(body.available.includes("get_state") && body.available.includes("get_decision_rules"));
  });

  it("lists every tool the MCP server has, with its arguments and a call that works", async () => {
    const body = await (await get("tool=get_actions")).json();
    const listed: string[] = body.tools.map((tool: { name: string }) => tool.name);

    assert.deepEqual(listed, [...describeAgentTools("http").map((tool) => tool.name), "subscribe"]);
    const projection = body.tools.find((tool: { name: string }) => tool.name === "get_projection");
    assert.match(projection.params, /^regime \(optional: SCARCITY\/DEFENSIVE\/VOLATILE\/EXPANSION\), tightness \(optional number\)/);
    assert.equal(
      projection.example,
      "https://whether.work/api/mcp?tool=get_projection&regime=DEFENSIVE&tightness=74&riskAppetite=32&tightnessDelta=4&riskAppetiteDelta=-2",
    );
    const brief = body.tools.find((tool: { name: string }) => tool.name === "get_brief");
    assert.match(brief.description, /Over plain GET it answers a summary instead/, "says where this answer is not the MCP tool's");
  });

  it("takes zero as a value, where it used to refuse it as missing", async () => {
    const response = await get("tool=get_projection&regime=DEFENSIVE&tightness=74&riskAppetite=0&tightnessDelta=4");
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(body.projection.inputs.riskAppetite, { value: 0, from: "given" });
    assert.deepEqual(body.projection.inputs.riskAppetiteDelta, { value: 0, from: "assumed" });
  });

  it("takes the page's word for a regime, and defaults to today's when none is given", async () => {
    const sunny = await (await get("tool=get_context&regime=Sunny")).json();
    assert.equal(sunny.context.currentRegime, "EXPANSION");

    const today = await (await get("tool=get_context")).json();
    assert.equal(today.context.inputs.regime.from, "today");
  });

  it("refuses a wrong argument with the values that would work, as a 400 and not a success", async () => {
    const response = await get("tool=get_context&regime=rainy");
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.error, "invalid_arguments");
    assert.deepEqual(body.problems[0].allowed, ["SCARCITY (Freezing)", "DEFENSIVE (Cloudy)", "VOLATILE (Stormy)", "EXPANSION (Sunny)"]);

    const cadence = await get("tool=get_brief&cadence=daily");
    assert.equal(cadence.status, 400);
    assert.match((await cadence.json()).message, /Unknown cadence "daily"\. Use one of: weekly, monthly, quarterly, yearly\./);
    assert.equal((await get("tool=get_brief&cadence=WEEKLY")).status, 200);

    const typo = await get("tool=get_state&cadence=weekly");
    assert.equal(typo.status, 400);
    assert.match((await typo.json()).message, /Unknown argument "cadence"\. get_state takes no arguments\./);
  });

  it("answers any other tool under `result`, with the use limits, and the state as the schema says", async () => {
    const rules = await (await get("tool=get_decision_rules&regime=cloudy")).json();
    assert.equal(rules.tool, "get_decision_rules");
    assert.deepEqual(Object.keys(rules.result), ["DEFENSIVE"]);
    assert.match(rules.use.humanReview, /Human review is required/);

    const state = await (await get("tool=get_state")).json();
    agentStateSchema.parse(state.result);
  });

  it("says a tool that only takes a POST takes a POST, where a GET used to answer the brief", async () => {
    const response = await get("tool=subscribe");

    assert.equal(response.status, 405);
    assert.equal(response.headers.get("allow"), "POST");
  });
});

/*
 * A browser-based agent could not call the remote MCP server at all: a JSON-RPC POST is
 * preflighted, and the route answered no OPTIONS and set no CORS headers on anything (`/api/agent`
 * has had them from the start). `subscribe` is left closed: it sends an email, and a preflight
 * that goes unanswered is what stops a page's POST from being sent.
 */
describe("/api/mcp from a browser", () => {
  const rpc = (body: unknown) =>
    new Request("https://whether.work/api/mcp", { method: "POST", headers: { "content-type": "application/json", accept: "application/json, text/event-stream" }, body: JSON.stringify(body) });

  it("answers the preflight a JSON-RPC POST triggers", async () => {
    const response = await optionsMcp(new Request("https://whether.work/api/mcp", { method: "OPTIONS" }));

    assert.equal(response.status, 204);
    assert.equal(response.headers.get("access-control-allow-origin"), "*");
    assert.match(response.headers.get("access-control-allow-methods") ?? "", /POST/);
    assert.match(response.headers.get("access-control-allow-headers") ?? "", /MCP-Protocol-Version/);
  });

  it("lets a page read the answer to a tool call, and to a plain GET", async () => {
    const call = await postMcp(rpc({ jsonrpc: "2.0", id: 1, method: "ping" }));
    assert.equal(call.status, 200);
    assert.equal(call.headers.get("access-control-allow-origin"), "*");

    const read = await getMcp(new Request("https://whether.work/api/mcp?tool=get_signals"));
    assert.equal(read.headers.get("access-control-allow-origin"), "*");

    const refused = await getMcp(new Request("https://whether.work/api/mcp?tool=nope"));
    assert.equal(refused.status, 400);
    assert.equal(refused.headers.get("access-control-allow-origin"), "*", "a page can read why it was refused");
  });

  it("stays closed to a page for subscribe, which sends an email", async () => {
    const preflight = await optionsMcp(new Request("https://whether.work/api/mcp?tool=subscribe", { method: "OPTIONS" }));
    assert.equal(preflight.headers.get("access-control-allow-origin"), null);

    const post = await postMcp(
      new Request("https://whether.work/api/mcp?tool=subscribe", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "not-an-email" }) }),
    );
    assert.equal(post.status, 400, "an invalid address is refused before anything is sent");
    assert.equal(post.headers.get("access-control-allow-origin"), null);
  });
});
