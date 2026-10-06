import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ErrorCode, ListToolsRequestSchema, McpError, ToolSchema } from "@modelcontextprotocol/sdk/types.js";
import { AgentInputError, type AgentToolTransport } from "../agent/registry";
import { callAgentTool, listAgentTools } from "../agent/tools";
import { MCP_SERVER_INFO, MCP_SERVER_INSTRUCTIONS } from "./serverIdentity";

/**
 * The Whether MCP server, for either transport: the remote one (`/api/mcp`,
 * `lib/mcp/httpMcpServer.ts`, a fresh server per request) and the local one behind
 * `bun run mcp:whether` (`scripts/mcp/whether-mcp-server.ts`, over stdio). They built the same
 * `Server` with the same two handlers in two files, differing only in the transport name the
 * registry is asked for; the local one also serves `pull_recent_site_info`.
 *
 * The local server had five tools of its own, registered separately, under another name and with
 * none of the remote server's structured results or refusals that say what was allowed. Both
 * read one list and one call path (`lib/agent/tools.ts`). This uses the SDK's low-level `Server`
 * so a wrong argument is answered by our own refusal, in the same words on both transports, and
 * not by the SDK's schema validation.
 */
export const createWhetherMcpServer = (transport: AgentToolTransport) => {
  const server = new Server(MCP_SERVER_INFO, {
    capabilities: { tools: { listChanged: false } },
    instructions: MCP_SERVER_INSTRUCTIONS,
  });

  // The SDK's own schema is the check that what is listed is what a client can read.
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: listAgentTools(transport).map((tool) => ToolSchema.parse(tool)),
  }));

  server.setRequestHandler(CallToolRequestSchema, async ({ params }) => {
    try {
      return await callAgentTool(params.name, params.arguments, transport);
    } catch (error) {
      // An unknown tool is the protocol's refusal; a wrong argument to a known one is a tool result.
      if (error instanceof AgentInputError) throw new McpError(ErrorCode.InvalidParams, error.message);
      throw error;
    }
  });

  return server;
};
