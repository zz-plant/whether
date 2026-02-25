import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  buildAgentInterfaceResponse,
  pullRecentSiteInfo,
  supportedAgentCadences,
  type AgentCadence,
} from "../../lib/agentInterface";
import { agentSkills } from "../../lib/agentSkills";

const cadenceSchema = z.enum(supportedAgentCadences);
const defaultCadence: AgentCadence = "weekly";

const server = new McpServer({
  name: "whether-agent-interface",
  version: "1.0.0",
});

const registerTool = server.tool.bind(server) as any;

registerTool(
  "get_agent_brief",
  "Fetch a cadence-specific Whether summary with structured agent handoff payload and prompt.",
  {
    cadence: cadenceSchema.optional(),
  },
  async ({ cadence }: { cadence?: AgentCadence }) => {
    const resolvedCadence = cadence ?? defaultCadence;
    const response = await buildAgentInterfaceResponse(resolvedCadence);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  }
);

registerTool(
  "list_agent_skills",
  "List Whether agent skills expected by the agent handoff payload.",
  {},
  async () => ({
    content: [
      {
        type: "text",
        text: JSON.stringify({ skills: agentSkills }, null, 2),
      },
    ],
  })
);

registerTool(
  "pull_recent_site_info",
  "Pull the latest Whether site agent brief from /api/agent so downstream agents can use fresh site context.",
  {
    cadence: cadenceSchema.optional(),
    siteUrl: z.string().optional(),
  },
  async ({
    cadence,
    siteUrl,
  }: {
    cadence?: AgentCadence;
    siteUrl?: string;
  }) => {
    const recentInfo = await pullRecentSiteInfo({
      cadence: cadence ?? defaultCadence,
      siteBaseUrl: siteUrl,
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(recentInfo, null, 2),
        },
      ],
    };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
