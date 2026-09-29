import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ErrorCode, ListToolsRequestSchema, McpError, ToolSchema } from "@modelcontextprotocol/sdk/types.js";
import { AgentInputError } from "../agent/inputs";
import { callAgentTool, listAgentTools } from "../agent/tools";
import { MCP_SERVER_INFO, MCP_SERVER_INSTRUCTIONS } from "./serverIdentity";

/**
 * The local MCP server behind `bun run mcp:whether`: the tools `/api/mcp` serves, over stdio.
 *
 * It had five tools of its own, registered separately, under another name and with none of
 * the remote server's structured results or refusals that say what was allowed. This is the
 * same list and the same call path (`lib/agent/tools.ts`), plus the one tool that only makes
 * sense here. It uses the SDK's low-level `Server` so a wrong argument is answered by our own
 * refusal, in the words the remote server uses, and not by the SDK's schema validation.
 */
export const createWhetherMcpServer = () => {
  const server = new Server(MCP_SERVER_INFO, {
    capabilities: { tools: { listChanged: false } },
    instructions: MCP_SERVER_INSTRUCTIONS,
  });

  // The SDK's own schema is the check that what is listed is what a client can read.
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: listAgentTools("stdio").map((tool) => ToolSchema.parse(tool)),
  }));

  server.setRequestHandler(CallToolRequestSchema, async ({ params }) => {
    try {
      return await callAgentTool(params.name, params.arguments, "stdio");
    } catch (error) {
      // An unknown tool is the protocol's refusal; a wrong argument to a known one is a tool result.
      if (error instanceof AgentInputError) throw new McpError(ErrorCode.InvalidParams, error.message);
      throw error;
    }
  });

  return server;
};
