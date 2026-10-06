import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createWhetherMcpServer } from "../../lib/mcp/server.js";

/* Start the stdio transport for local MCP integration (e.g., Claude Desktop, AI IDEs). The
   server is the one `/api/mcp` runs (lib/mcp/server.ts), with the tools it serves plus the one
   that only makes sense locally; for remote access, point a client at that URL instead. */
await createWhetherMcpServer("stdio").connect(new StdioServerTransport());
