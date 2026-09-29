/* Intentionally permissive CORS — /api/agent is a public endpoint for AI agents
   reading the weekly brief. No auth or cookies are involved, so wildcard origin
   is safe here. If this endpoint ever requires credentials, restrict origins. */
export const agentApiCorsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept",
} as const;

/* /api/mcp: the same public, credential-free reads, plus the JSON-RPC POST a browser-based MCP
   client sends. Without these a page could not call the remote server at all: the POST with a
   JSON body is preflighted, and the route answered no OPTIONS. `MCP-Protocol-Version` is the
   header a 2025-06-18 client puts on every request after `initialize`. Not for `?tool=subscribe`,
   which sends an email: a browser preflight of it is left unanswered, so the POST is never sent. */
export const mcpApiCorsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, MCP-Protocol-Version, Mcp-Session-Id",
} as const;
