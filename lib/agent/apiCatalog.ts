import { resolveSiteUrl } from "../siteUrl";
import { API_CATALOG_PATH, API_DOCS_PATH, OPENAPI_PATH, WHETHER_AGENT_MANIFEST_PATH } from "./discovery";

/**
 * The API catalog at `/.well-known/api-catalog` (RFC 9727): a linkset (RFC 9264) naming each
 * API this origin publishes, with its machine-readable description and its documentation.
 *
 * Two entries, one per surface. The HTTP reads are described by the OpenAPI document; the MCP
 * server by the agent manifest, which lists every tool with its arguments. Neither carries a
 * `status` link: `/api/health` is the only probe, and it stays closed to crawlers and out of the
 * manifest because it loads the report on every call (`lib/agent/discovery.ts`).
 *
 * Served by the Worker ahead of the app, like the manifest, because a route under
 * `app/.well-known/` is never registered (`lib/agentManifest.ts`).
 */

export const API_CATALOG_CONTENT_TYPE = 'application/linkset+json; profile="https://www.rfc-editor.org/info/rfc9727"';

const buildApiCatalog = (baseUrl: string) => ({
  linkset: [
    {
      anchor: `${baseUrl}/api`,
      "service-desc": [{ href: `${baseUrl}${OPENAPI_PATH}`, type: "application/vnd.oai.openapi+json;version=3.1" }],
      "service-doc": [{ href: `${baseUrl}${API_DOCS_PATH}`, type: "text/html" }],
      describedby: [{ href: `${baseUrl}${WHETHER_AGENT_MANIFEST_PATH}`, type: "application/json" }],
    },
    {
      anchor: `${baseUrl}/api/mcp`,
      "service-desc": [{ href: `${baseUrl}${WHETHER_AGENT_MANIFEST_PATH}`, type: "application/json" }],
      "service-doc": [{ href: `${baseUrl}/llms.txt`, type: "text/plain" }],
    },
  ],
});

/** GET answers the catalog; HEAD the same headers with no body, which RFC 9727 §3 asks a publisher to support. */
export const apiCatalogResponse = (request: Request): Response => {
  const baseUrl = resolveSiteUrl();
  const headers = {
    "Content-Type": API_CATALOG_CONTENT_TYPE,
    "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
    "Access-Control-Allow-Origin": "*",
    Link: `<${baseUrl}${API_CATALOG_PATH}>; rel="api-catalog"`,
  };
  if (request.method === "HEAD") return new Response(null, { headers });
  if (request.method !== "GET") return new Response(null, { status: 405, headers: { Allow: "GET, HEAD" } });
  return new Response(JSON.stringify(buildApiCatalog(baseUrl)), { headers });
};
