import { AGENT_START_TOOL, WHETHER_AGENT_MANIFEST_PATH, buildAgentEndpoints, buildAgentStartPointers } from "../agent/discovery";
import { describeToolParams } from "../agent/registry";
import { describeAgentTools } from "../agent/tools";
import { MCP_PROTOCOL_VERSIONS } from "../mcp/serverIdentity";
import { PUBLISH_MAX_RECORD_AGE_DAYS } from "../report/briefPublishGuard";
import { canonicalPositioningLine } from "../seo";
import { navigationGroups, pagesInGroup, utilityLinks } from "../navigation/informationArchitecture";

/**
 * `/llms.txt`: what an agent reads before it calls anything.
 *
 * The tool section is written from the definitions the MCP servers run (`lib/agent/tools.ts`),
 * so a tool cannot be served and missing here. It used to be written by hand and described the
 * plain-GET shim (five of twelve tools) as if it were the interface, and never said that
 * `/api/mcp` is an MCP server. The start pointers and endpoints are the manifest's
 * (`lib/agent/discovery.ts`), so the two cannot send an agent to different places.
 */
export const buildLlmsTxt = (baseUrl: string) => {
  const endpoints = buildAgentEndpoints(baseUrl);
  const start = buildAgentStartPointers(baseUrl);
  const toolLines = describeAgentTools("http").flatMap((tool) => {
    const query = new URLSearchParams({ tool: tool.name, ...Object.fromEntries(Object.entries(tool.example).map(([key, value]) => [key, String(value)])) });
    return [
      `### ${tool.name}`,
      `- ${tool.description}${tool.plainGetNote ? ` ${tool.plainGetNote}` : ""}`,
      `- Arguments: ${describeToolParams(tool.arguments)}`,
      ...(tool.aliases.length > 0 ? [`- Also called: ${tool.aliases.join(", ")}`] : []),
      `- Plain GET: ${endpoints.mcp}?${query}`,
      "",
    ];
  });

  /* The site's four groups and their pages, read from the IA the header and the
     footer render, so an agent reading this file meets the same map a reader
     does. */
  const siteLines = [
    ...navigationGroups.flatMap((group) => [
      `- ${group.label}: ${baseUrl}${group.href} — ${group.description}`,
      ...pagesInGroup(group.key)
        .filter((page) => page.href !== group.href)
        .map((page) => `  - ${page.label}: ${baseUrl}${page.href}`),
    ]),
    ...utilityLinks
      .filter((link) => link.href !== "/search")
      .map((link) => `- ${link.label}: ${baseUrl}${link.href} — ${link.description}`),
  ];

  return [
    "# Whether — Agent Interface",
    "",
    `Whether is weekly operating guidance for startup leaders. ${canonicalPositioningLine}`,
    "Whether is free, and nothing below needs a key or an account.",
    "",
    "## Start here",
    "",
    `- Decide from the state: ${start.http}`,
    "  - The current reading in about 3KB: the conditions and the margin from their change lines, the data's freshness, each score against its pause, resume and change lines, the moves behind each score, and the guidance.",
    "  - Check `automation.ready` first. False means the reading is a saved copy, or older than " +
      `${PUBLISH_MAX_RECORD_AGE_DAYS} days, or assembly failed: say so, and do not act on it without a person looking.`,
    `- MCP client: ${endpoints.mcp} (streamable HTTP, JSON-RPC 2.0, protocol ${MCP_PROTOCOL_VERSIONS.join(" or ")}). Call ${AGENT_START_TOOL} first.`,
    "  - `bun run mcp:whether` runs the same tools over stdio from a checkout of the repository.",
    `- Read rather than decide: ${start.markdown} (Markdown).`,
    `- CLI, from a checkout: \`${start.cli}\``,
    "",
    "## MCP tools",
    "",
    "The same tools on both MCP transports, and on plain GET for an agent with no MCP client:",
    `GET ${endpoints.mcp}?tool=<name>&<argument>=<value>. Every tool reads; none writes.`,
    "A regime is accepted by its key (SCARCITY, DEFENSIVE, VOLATILE, EXPANSION) or by the word the site prints",
    "(Freezing, Cloudy, Stormy, Sunny), in any case. A wrong argument is refused with the values that would have worked,",
    "and an argument a tool does not take is named rather than ignored.",
    "",
    `### GET ${endpoints.mcp}?tool=get_actions`,
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
    `- GET ${endpoints.brief}`,
    "- Returns: Structured Markdown with posture, decisions, revisit triggers, provenance, and copy-paste-ready operator brief",
    "- Content-Type: text/markdown; charset=utf-8",
    "- Cache: 900s",
    "",
    "### JSON agent API",
    `- GET ${endpoints.agent}?cadence=<weekly|monthly|quarterly|yearly>`,
    "- Default cadence: weekly",
    "- Response: JSON with summary, posture, decision delta, flip watch, agent handoff payload + prompt, provenance",
    "- `&view=state` answers the compact state instead (weekly only); the default view is the whole brief",
    "- Invalid cadence or view: HTTP 400 with the values allowed",
    "",
    "### Jev decision request",
    `- GET ${endpoints.agent}?format=jev`,
    "- Returns: this week's guidance as a ready-to-send decision request: typed state with a `plan` slot, plus eight questions about conflict, decision area, reversibility, conditional permission after conditions change, recurring fixed cost, explicit pause terms, reversibility evidence, and an explicit proposed action",
    "- Optional `&model=jev|clef|clef-flash|clef-omni` selects the caller's model; Jev remains the default",
    "- Fill `request.state.plan` and send `request` to your selected model yourself; Whether never receives the plan",
    "- `&model=clef-omni&input=audio|video` supplies an empty media array for your own clip; send it directly to Cloudflare, never back to Whether",
    "- Check `automationReady` first: false means the reading is not live or not current",
    "",
    "## Guidance for agents",
    "- Start with get_state (or /api/agent?view=state): it is a tenth the size of the full brief and says whether to act on it",
    "- Prefer /brief.md for reading and summarization tasks — it's Markdown, structured, and instant",
    "- Use /api/agent for structured data processing, integration, or specific cadence windows",
    "- Scores are compared with last week's published brief, or with the previous month-end reading where there is none from the previous one to two weeks; either is named by date (`comparedWith`)",
    "- The homepage (/) includes JSON-LD structured data (schema.org/Report) with decision artifacts",
    "- All endpoints include provenance metadata — preserve it in downstream outputs",
    "- Informational only: not investment, legal, tax or employment advice, and not a forecast",
    "",
    "## Site",
    "",
    ...siteLines,
    "",
    "## Source",
    "",
    "- The code, MIT licensed: https://github.com/zz-plant/whether",
    "- The score formulas: https://github.com/zz-plant/whether/blob/main/lib/regimeEngineCore.ts",
    "",
    "## Discovery",
    `- Manifest: ${baseUrl}${WHETHER_AGENT_MANIFEST_PATH}`,
    `- WebMCP: ${baseUrl}/.well-known/webmcp.json`,
    `- Homepage: ${baseUrl}/`,
    `- Brief (Markdown): ${endpoints.brief}`,
    `- Agent API: ${endpoints.agent}`,
    `- MCP server: ${endpoints.mcp}`,
  ].join("\n");
};
