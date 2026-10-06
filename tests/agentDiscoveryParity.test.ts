import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it } from "bun:test";
import { GET as getAgent } from "../app/api/agent/route";
import { GET as getLlms } from "../app/llms.txt/route";
import ApiDocsPage from "../app/api-docs/page";
import robots from "../app/robots";
import { AGENT_START_TOOL, WHETHER_AGENT_MANIFEST_PATH } from "../lib/agent/discovery";
import { describeAgentTools, listAgentTools } from "../lib/agent/tools";
import { agentManifestResponse } from "../lib/agentManifest";
import { handleMcpRequest } from "../lib/mcp/httpMcpServer";
import { MCP_PROTOCOL_VERSIONS } from "../lib/mcp/serverIdentity";

/*
 * A tool that is served and not listed is one an agent never learns to call, and a tool that is
 * listed and not served is one it calls and is refused. There were five copies of the list (the
 * remote server, the local one, the GET catalogue, `/llms.txt`, the docs page) and a manifest
 * that promised the tools and listed none, so they had drifted: five tools here, eight there,
 * twelve there. They read one registry now; this holds every place that names a tool to it, and
 * the views and the start pointers to what the routes actually answer.
 */

const httpTools = describeAgentTools("http");
const repoFile = (...segments: string[]) => readFileSync(join(process.cwd(), ...segments), "utf8");

describe("every place an agent learns what to call", () => {
  it("names the same tools the remote server lists", async () => {
    const rpc = await (
      await handleMcpRequest(
        new Request("https://whether.work/api/mcp", { method: "POST", headers: { "content-type": "application/json", accept: "application/json, text/event-stream" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }) }),
      )
    ).json();
    const served: string[] = rpc.result.tools.map((tool: { name: string }) => tool.name);
    const names = httpTools.map((tool) => tool.name);

    assert.deepEqual(served, names);
    assert.deepEqual(served, listAgentTools("http").map((tool) => tool.name));

    const manifest = await agentManifestResponse().json();
    assert.deepEqual(manifest.mcp.tools.map((tool: { name: string }) => tool.name), names, "the manifest");
    assert.equal(manifest.mcp.endpoint, "https://whether.work/api/mcp");
    assert.deepEqual(manifest.mcp.protocolVersions, [...MCP_PROTOCOL_VERSIONS]);

    const llms = await (await getLlms()).text();
    for (const name of names) {
      assert.ok(llms.includes(`### ${name}\n`), `/llms.txt describes ${name}`);
    }

    const docsPage = renderToStaticMarkup(ApiDocsPage());
    for (const name of names) {
      assert.ok(docsPage.includes(name), `/api-docs names ${name}`);
    }

    const guide = repoFile("docs", "agents", "agent-interface.md");
    for (const name of [...names, "pull_recent_site_info"]) {
      assert.ok(guide.includes(`\`${name}`), `docs/agents/agent-interface.md names ${name}`);
    }
  });

  it("points to the state where an agent begins, and the route answers it", async () => {
    const manifest = await agentManifestResponse().json();
    const llms = await (await getLlms()).text();

    assert.equal(manifest.start.http, "GET https://whether.work/api/agent?view=state");
    assert.equal(manifest.start.mcp, "tools/call get_state");
    assert.ok(httpTools.some((tool) => tool.name === "get_state"));
    assert.match(llms, /GET https:\/\/whether\.work\/api\/agent\?view=state/);
    assert.match(llms, /Call get_state first\./);
    assert.equal(manifest.endpoints.state, "https://whether.work/api/agent?view=state");
    assert.equal((await getAgent(new Request(manifest.endpoints.state))).status, 200);
  });

  it("sends an agent to the same places from the manifest and /llms.txt, each one a route that answers", async () => {
    const manifest = await agentManifestResponse().json();
    const llms = await (await getLlms()).text();

    // The start pointers, word for word, where /llms.txt says where to start.
    const startHere = llms.slice(llms.indexOf("## Start here"), llms.indexOf("## MCP tools"));
    for (const pointer of [manifest.start.http, manifest.start.markdown, manifest.start.cli]) {
      assert.ok(startHere.includes(pointer), `/llms.txt starts an agent at ${pointer}`);
    }
    assert.equal(manifest.start.mcp, `tools/call ${AGENT_START_TOOL}`);
    assert.ok(startHere.includes(`${manifest.mcp.endpoint} (`) && startHere.includes(`Call ${AGENT_START_TOOL} first.`));

    // Every place /llms.txt's discovery list names is the manifest, the homepage, or a manifest endpoint.
    const discovery = [...llms.slice(llms.indexOf("## Discovery")).matchAll(/^- [^:]+: (\S+)$/gm)].map((match) => match[1]);
    assert.deepEqual(discovery, [
      `https://whether.work${WHETHER_AGENT_MANIFEST_PATH}`,
      "https://whether.work/",
      manifest.endpoints.brief,
      manifest.endpoints.agent,
      manifest.endpoints.mcp,
    ]);

    // Every endpoint the manifest advertises is a route the app serves, and robots.txt lets an agent fetch the manifest.
    for (const [name, url] of Object.entries<string>(manifest.endpoints)) {
      const { pathname, origin } = new URL(url);
      assert.equal(origin, "https://whether.work", name);
      const route = await import(`../app${pathname}/route`);
      assert.equal(typeof route.GET, "function", `${name} (${pathname}) is served`);
    }
    const allowed = robots().rules;
    for (const group of Array.isArray(allowed) ? allowed : [allowed]) {
      assert.ok([group.allow ?? []].flat().includes(WHETHER_AGENT_MANIFEST_PATH), "robots.txt allows the manifest");
    }
    assert.equal(manifest.mcp.plainGet, `${manifest.endpoints.mcp}?tool=get_actions`);
  });

  it("lists the views the agent route has, and no others", async () => {
    const manifest = await agentManifestResponse().json();
    const refused = await (await getAgent(new Request("https://whether.work/api/agent?view=nope"))).json();

    assert.deepEqual(manifest.agent.views, refused.allowedViews);
    assert.ok(manifest.agent.views.includes(manifest.agent.defaultView));
  });

  it("says how to tell whether a reading is live and current, in the manifest and the guide", async () => {
    const manifest = await agentManifestResponse().json();

    assert.match(manifest.automation.check, /automation\.ready/);
    assert.ok(manifest.automation.refusesWhen.some((reason: string) => /saved copy/.test(reason)));
    assert.match(repoFile("docs", "agents", "agent-interface.md"), /automation\.ready/);
  });
});
