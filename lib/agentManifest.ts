import { resolveSiteUrl } from "./siteUrl";
import { describeToolParams } from "./agent/registry";
import { describeAgentTools } from "./agent/tools";
import { supportedAgentCadences } from "./agentInterface";
import { MCP_PROTOCOL_VERSIONS, MCP_SERVER_INFO, MCP_SERVER_INSTRUCTIONS } from "./mcp/serverIdentity";
import { PUBLISH_MAX_RECORD_AGE_DAYS } from "./report/briefPublishGuard";
import {
  REVISABLE_DELEGATION_RECORD_SCHEMA_VERSION,
  REVISABLE_DELEGATION_SCHEMA_URL,
  REVISABLE_DELEGATION_VERIFIER_URL,
  REVISABLE_DELEGATION_STANDARD_URL,
  WHETHER_REVISABLE_DELEGATION_CONFORMANCE_LEVEL,
} from "./export/revisableDelegationRecord";
import { buildUseConstraint } from "./report/useConstraint";

/**
 * The agent discovery manifest, and the one path that can actually serve it.
 *
 * This lived at `app/.well-known/whether-agent.json/route.ts` and returned 404
 * in production for as long as it existed. vinext enumerates App Router files
 * with Node's `glob`, where `*` does not match a leading dot, so a route under
 * `app/.well-known/` is never registered — the request fell through to the app
 * shell and rendered HTML. Nothing caught it: `tests/agentRoutes.test.ts`
 * imported the route module and called `GET()` directly, which exercises the
 * handler but never the router. Meanwhile `robots.ts`, the `<link>` in
 * `app/layout.tsx`, `/llms.txt`, `agentInterface.links.discovery` and four docs
 * all advertised the URL, so every agent following the documented entry point
 * hit a dead end.
 *
 * `.well-known` URIs are reserved at the origin (RFC 8615) and this one has to
 * keep its advertised path, so the Worker serves it ahead of the Next handler
 * rather than the route moving somewhere the scanner can see. That also keeps
 * it working in `bun run dev`, which runs this same Worker entry.
 */
export const WHETHER_AGENT_MANIFEST_PATH = "/.well-known/whether-agent.json";

const buildAgentManifest = (baseUrl = resolveSiteUrl()) => ({
  service: "whether",
  version: "v1",
  generatedAt: new Date().toISOString(),
  baseUrl,
  defaultCadence: "weekly",
  supportedCadences: [...supportedAgentCadences],
  /* Where to begin, by surface. The state is a tenth the size of the full brief and is what to
     decide from; each of these reads `automation.ready` first. */
  start: {
    http: `GET ${baseUrl}/api/agent?view=state`,
    mcp: "tools/call get_state",
    cli: "bun run cli:whether -- state --json",
    markdown: `GET ${baseUrl}/brief.md`,
  },
  endpoints: {
    agent: `${baseUrl}/api/agent`,
    state: `${baseUrl}/api/agent?view=state`,
    mcp: `${baseUrl}/api/mcp`,
    brief: `${baseUrl}/brief.md`,
    llms: `${baseUrl}/llms.txt`,
    weekly: `${baseUrl}/api/weekly`,
    monthly: `${baseUrl}/api/monthly`,
    quarterly: `${baseUrl}/api/quarterly`,
    yearly: `${baseUrl}/api/yearly`,
    cadence: `${baseUrl}/api/cadence`,
    treasury: `${baseUrl}/api/treasury`,
    health: `${baseUrl}/api/health`,
  },
  examples: {
    weekly: `${baseUrl}/api/agent?cadence=weekly`,
    state: `${baseUrl}/api/agent?view=state`,
    // This week's call as a typesafe/jev request, with a slot for the caller's plan.
    jev: `${baseUrl}/api/agent?format=jev`,
  },
  agent: {
    invalidCadenceStatus: 400,
    /* `full` is the default. `state` is the compact answer (`lib/agentState.ts`); its shape is the
       `outputSchema` of the MCP tool `get_state`. It takes no cadence other than weekly. */
    views: ["full", "state"],
    defaultView: "full",
    invalidViewStatus: 400,
  },
  /* Whether it is sound to act on a reading without a person looking first. Not `degraded`,
     which only says report assembly failed: a total outage serves the bundled snapshot and
     leaves `degraded` false. */
  automation: {
    check: "automation.ready in view=state; publishReadiness.ok in the full brief",
    refusesWhen: ["the data is a saved copy, not a live reading", `the record is more than ${PUBLISH_MAX_RECORD_AGE_DAYS} days old`, "report assembly failed"],
  },
  /* The tools an MCP client lists at `tools/list`, with the same arguments, so an agent can plan
     its calls from this document without connecting first. Read from the definitions the server
     runs (`lib/agent/tools.ts`), so a tool cannot be served and missing here. */
  mcp: {
    endpoint: `${baseUrl}/api/mcp`,
    transport: "streamable-http",
    protocolVersions: [...MCP_PROTOCOL_VERSIONS],
    server: MCP_SERVER_INFO,
    instructions: MCP_SERVER_INSTRUCTIONS,
    local: "bun run mcp:whether (stdio, from a checkout of the repository: the same tools, plus pull_recent_site_info)",
    plainGet: `${baseUrl}/api/mcp?tool=get_actions`,
    tools: describeAgentTools("http").map(({ name, title, description, aliases, readOnly, arguments: args }) => ({
      name,
      title,
      description,
      ...(aliases.length > 0 ? { aliases } : {}),
      readOnly,
      arguments: describeToolParams(args),
    })),
  },
  /* What a caller may and may not do with any of the above. The manifest is the
     documented entry point for an agent, so it is the first place a constraint
     has a chance of being read. */
  use: buildUseConstraint(),
  // Where Whether sits in the loop an institution runs when it delegates
  // work to machines, and what it emits in the shared record shape. Whether
  // authorizes nothing and acts on nothing, so it emits belief records only.
  revisableDelegation: {
    loopPosition: "act",
    loopRole: "turns changed conditions into weekly operating guidance; the operator acts",
    standard: REVISABLE_DELEGATION_STANDARD_URL,
    schema: REVISABLE_DELEGATION_SCHEMA_URL,
    schemaVersion: REVISABLE_DELEGATION_RECORD_SCHEMA_VERSION,
    conformanceLevel: WHETHER_REVISABLE_DELEGATION_CONFORMANCE_LEVEL,
    // A declared level is worth what a reader can check. This names the one
    // that can contradict it, against the stream at `records` below.
    verifier: REVISABLE_DELEGATION_VERIFIER_URL,
    kinds: ["belief"],
    records: `${baseUrl}/api/decision-memory?format=records`,
    upstream: [],
    downstream: [],
  },
});

export const agentManifestResponse = () =>
  new Response(JSON.stringify(buildAgentManifest()), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      // Matches the `revalidate = 3600` the unreachable route declared.
      "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
      // A discovery manifest is meant to be read cross-origin by agent clients,
      // the same reason /api/agent carries permissive read-only CORS.
      "Access-Control-Allow-Origin": "*",
    },
  });
