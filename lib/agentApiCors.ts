/* Intentionally permissive CORS — /api/agent is a public endpoint for AI agents
   reading the weekly brief. No auth or cookies are involved, so wildcard origin
   is safe here. If this endpoint ever requires credentials, restrict origins. */
export const agentApiCorsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept",
} as const;
