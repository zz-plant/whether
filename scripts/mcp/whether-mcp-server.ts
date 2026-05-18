import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  buildAgentInterfaceResponse,
  pullRecentSiteInfo,
  supportedAgentCadences,
  type AgentCadence,
} from "../../lib/agentInterface.js";
import { agentSkills } from "../../lib/agentSkills.js";

const cadenceSchema = z.enum(supportedAgentCadences);
const defaultCadence: AgentCadence = "weekly";

const server = new McpServer({
  name: "whether-agent-interface",
  version: "1.0.0",
});

server.registerTool("get_agent_brief", {
  description: "Fetch a cadence-specific Whether summary with structured agent handoff payload and prompt.",
  inputSchema: {
    cadence: cadenceSchema.optional(),
  },
}, async ({ cadence }: { cadence?: AgentCadence }) => {
  try {
    const resolvedCadence = cadence ?? defaultCadence;
    const response = await buildAgentInterfaceResponse(resolvedCadence);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(response, null, 2) }],
    };
  } catch (error) {
    return {
      content: [{ type: "text" as const, text: JSON.stringify({
        error: "Failed to fetch agent brief",
        message: error instanceof Error ? error.message : String(error),
        cadence: cadence ?? "weekly",
      }, null, 2) }],
      isError: true,
    };
  }
});

server.registerTool("list_agent_skills", {
  description: "List Whether agent skills expected by the agent handoff payload.",
  inputSchema: {},
}, async () => {
  try {
    return {
      content: [{ type: "text" as const, text: JSON.stringify({ skills: agentSkills }, null, 2) }],
    };
  } catch (error) {
    return {
      content: [{ type: "text" as const, text: JSON.stringify({
        error: "Failed to list skills",
        message: error instanceof Error ? error.message : String(error),
      }, null, 2) }],
      isError: true,
    };
  }
});

server.registerTool("pull_recent_site_info", {
  description: "Pull the latest Whether site agent brief from /api/agent so downstream agents can use fresh site context.",
  inputSchema: {
    cadence: cadenceSchema.optional(),
    siteUrl: z.string().optional(),
  },
}, async ({ cadence, siteUrl }: { cadence?: AgentCadence; siteUrl?: string }) => {
  try {
    const recentInfo = await pullRecentSiteInfo({
      cadence: cadence ?? defaultCadence,
      siteBaseUrl: siteUrl,
    });
    return {
      content: [{ type: "text" as const, text: JSON.stringify(recentInfo, null, 2) }],
    };
  } catch (error) {
    return {
      content: [{ type: "text" as const, text: JSON.stringify({
        error: "Failed to pull site info",
        message: error instanceof Error ? error.message : String(error),
        cadence: cadence ?? "weekly",
      }, null, 2) }],
      isError: true,
    };
  }
});

/* Start stdio transport for local MCP integration (e.g., Claude Desktop, AI IDEs).
   For remote/HTTP access, use the /api/agent endpoint directly or expose the MCP server
   via the app router with the StreamableHTTP transport. */
const transport = new StdioServerTransport();
await server.connect(transport);
