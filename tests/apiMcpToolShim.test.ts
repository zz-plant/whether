import assert from "node:assert/strict";
import { afterEach, describe, it } from "bun:test";
import { GET as getMcp } from "../app/api/mcp/route";

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
