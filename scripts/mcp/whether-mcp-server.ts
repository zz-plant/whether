import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createWhetherMcpServer } from "../../lib/mcp/stdioServer.js";

/* Start the stdio transport for local MCP integration (e.g., Claude Desktop, AI IDEs). The
   tools are the ones `/api/mcp` serves (lib/agent/tools.ts); for remote access, point a client
   at that URL instead. */
await createWhetherMcpServer().connect(new StdioServerTransport());
