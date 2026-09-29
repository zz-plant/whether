import { describeAgentTools, describeToolParams } from "../agent/tools";
import { MCP_PROTOCOL_VERSIONS } from "../mcp/serverIdentity";
import { PUBLISH_MAX_RECORD_AGE_DAYS } from "../report/briefPublishGuard";

/**
 * `/llms.txt`: what an agent reads before it calls anything.
 *
 * The tool section is written from the definitions the MCP servers run (`lib/agent/tools.ts`),
 * so a tool cannot be served and missing here. It used to be written by hand and described the
 * plain-GET shim (five of twelve tools) as if it were the interface, and never said that
 * `/api/mcp` is an MCP server.
 */
export const buildLlmsTxt = (baseUrl: string) => {
  const toolLines = describeAgentTools("http").flatMap((tool) => {
    const query = new URLSearchParams({ tool: tool.name, ...Object.fromEntries(Object.entries(tool.example).map(([key, value]) => [key, String(value)])) });
    return [
      `### ${tool.name}`,
      `- ${tool.description}${tool.plainGetNote ? ` ${tool.plainGetNote}` : ""}`,
      `- Arguments: ${describeToolParams(tool.arguments)}`,
      ...(tool.aliases.length > 0 ? [`- Also called: ${tool.aliases.join(", ")}`] : []),
      `- Plain GET: ${baseUrl}/api/mcp?${query}`,
      "",
    ];
  });

  return [
    "# Whether — Agent Interface",
    "",
    "Whether turns public macro signals into a weekly operating posture for startup and product leaders.",
    "",
    "## Start here",
    "",
    `- Decide from the state: GET ${baseUrl}/api/agent?view=state`,
    "  - The current reading in about 3KB: the conditions and how sure, whether the data is live and current, where each score sits against its pause, resume and change lines, what moved each score, and the guidance.",
    "  - Check `automation.ready` first. False means the reading is a saved copy, or older than " +
      `${PUBLISH_MAX_RECORD_AGE_DAYS} days, or assembly failed: say so, and do not act on it without a person looking.`,
    `- MCP client: ${baseUrl}/api/mcp (streamable HTTP, JSON-RPC 2.0, protocol ${MCP_PROTOCOL_VERSIONS.join(" or ")}). Call get_state first.`,
    "  - `bun run mcp:whether` runs the same tools over stdio from a checkout of the repository.",
    `- Read rather than decide: GET ${baseUrl}/brief.md (Markdown).`,
    "- CLI, from a checkout: `bun run cli:whether -- state --json`",
    "",
    "## MCP tools",
    "",
    "The same tools on both MCP transports, and on plain GET for an agent with no MCP client:",
    `GET ${baseUrl}/api/mcp?tool=<name>&<argument>=<value>. Every tool reads; none writes.`,
    "A regime is accepted by its key (SCARCITY, DEFENSIVE, VOLATILE, EXPANSION) or by the word the site prints",
    "(Freezing, Cloudy, Stormy, Sunny), in any case. A wrong argument is refused with the values that would have worked,",
    "and an argument a tool does not take is named rather than ignored.",
    "",
    `### GET ${baseUrl}/api/mcp?tool=get_actions`,
    "- Returns: this catalogue, with each tool's arguments and a call that works.",
    "",
    ...toolLines,
    "### POST /api/mcp?tool=subscribe",
    '- Body: `{ "email": "user@company.com" }`',
    "- Subscribes an email to the weekly brief. Returns confirmation. Not an MCP tool.",
    "",
    "## Machine-readable endpoints",
    "",
    "### Markdown brief (recommended for browser/reading agents)",
    `- GET ${baseUrl}/brief.md`,
    "- Returns: Structured Markdown with posture, decisions, revisit triggers, provenance, and copy-paste-ready operator brief",
    "- Content-Type: text/markdown; charset=utf-8",
    "- Cache: 900s",
    "",
    "### JSON agent API",
    `- GET ${baseUrl}/api/agent?cadence=<weekly|monthly|quarterly|yearly>`,
    "- Default cadence: weekly",
    "- Response: JSON with summary, posture, decision delta, flip watch, agent handoff payload + prompt, provenance",
    "- `&view=state` answers the compact state instead (weekly only); the default view is the whole brief",
    "- Invalid cadence or view: HTTP 400 with the values allowed",
    "",
    "### Jev decision request",
    `- GET ${baseUrl}/api/agent?format=jev`,
    "- Returns: this week's guidance as a ready-to-send request for TypeSafe's Jev decision model (typesafe/jev): typed state with a `plan` slot, plus questions (does the plan conflict with the guidance, which decision area, how reversible, is it safer after conditions change)",
    "- Fill `request.state.plan` and send `request` to Jev yourself; Whether never receives the plan",
    "- Check `automationReady` first: false means the reading is not live or not current",
    "",
    "## Guidance for agents",
    "- Start with get_state (or /api/agent?view=state): it is a tenth the size of the full brief and says whether to act on it",
    "- Prefer /brief.md for reading and summarization tasks — it's Markdown, structured, and instant",
    "- Use /api/agent for structured data processing, integration, or when you need specific cadence windows",
    "- Scores are compared with the previous month-end reading, named by date (`comparedWith`), not with last week",
    "- The homepage (/) includes JSON-LD structured data (schema.org/Report) with decision artifacts",
    "- All endpoints include provenance metadata — preserve it in downstream outputs",
    "- Informational only: not investment, legal, tax or employment advice, and not a forecast",
    "",
    "## Discovery",
    `- Manifest: ${baseUrl}/.well-known/whether-agent.json`,
    `- Homepage: ${baseUrl}/`,
    `- Brief (Markdown): ${baseUrl}/brief.md`,
    `- Agent API: ${baseUrl}/api/agent`,
    `- MCP server: ${baseUrl}/api/mcp`,
  ].join("\n");
};
