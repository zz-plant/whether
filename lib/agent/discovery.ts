/**
 * Where an agent finds Whether, written once: the manifest's path, where to start on each
 * surface, the endpoints, and the views `/api/agent` answers.
 *
 * The manifest path was typed out again in six places beside its constant (`robots.ts`, the
 * `<link>` in the root layout, `/llms.txt`, `/llms-full.txt`, the brief's `links.discovery` and
 * `/api-docs`), the start pointers and endpoints in both the manifest and `/llms.txt`, and the
 * manifest's `views` copied the list the route checks. Each copy is a URL an agent can be sent to
 * that nothing held to the route that answers it; `tests/agentDiscoveryParity.test.ts` does now.
 *
 * No imports: the root layout and `robots.ts` read this, and neither should load the tools.
 */

export const WHETHER_AGENT_MANIFEST_PATH = "/.well-known/whether-agent.json";

/* `full` is the whole brief and stays the default; `state` is the compact answer an agent
   decides from (`lib/agentState.ts`), about a tenth the size. */
export const AGENT_VIEWS = ["full", "state"] as const;
export const DEFAULT_AGENT_VIEW = "full";

/** The tool an agent calls first, on every MCP surface. */
export const AGENT_START_TOOL = "get_state";

/**
 * Every endpoint the manifest advertises, absolute. `robots.ts` opens each of these paths to
 * crawlers, so an endpoint here is one an agent may fetch. `/api/health` was listed until
 * 2026-10-27, while robots.txt closed it: it is a monitor's probe and loads the report on every
 * call, so it left the manifest rather than opening to crawlers.
 */
export const buildAgentEndpoints = (baseUrl: string) => ({
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
});

/* Where to begin, by surface. The state is a tenth the size of the full brief and is what to
   decide from; each of these reads `automation.ready` first. */
export const buildAgentStartPointers = (baseUrl: string) => {
  const endpoints = buildAgentEndpoints(baseUrl);
  return {
    http: `GET ${endpoints.state}`,
    mcp: `tools/call ${AGENT_START_TOOL}`,
    cli: "bun run cli:whether -- state --json",
    markdown: `GET ${endpoints.brief}`,
  };
};
