import { resolveSiteUrl } from "../../../lib/siteUrl";
import { supportedAgentCadences } from "../../../lib/agentInterface";

export const runtime = "edge";
export const revalidate = 3600;

export async function GET() {
  const baseUrl = resolveSiteUrl();

  return Response.json(
    {
      name: "whether-agent-interface",
      description:
        "Machine-readable discovery metadata for agents integrating with whether.work.",
      defaultCadence: "weekly",
      supportedCadences: [...supportedAgentCadences],
      endpoints: {
        brief: `${baseUrl}/api/agent?cadence={cadence}`,
        llms: `${baseUrl}/llms.txt`,
      },
      mcp: {
        command: "bun run mcp:whether",
        tools: ["get_agent_brief", "list_agent_skills", "pull_recent_site_info"],
      },
      examples: {
        weekly: `${baseUrl}/api/agent?cadence=weekly`,
        monthly: `${baseUrl}/api/agent?cadence=monthly`,
      },
      version: "v1",
    },
    {
      headers: {
        "cache-control": "public, max-age=3600",
      },
    }
  );
}
