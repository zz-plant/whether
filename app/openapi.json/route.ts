import { buildOpenApiDocument } from "../../lib/agent/openApi";
import { resolveSiteUrl } from "../../lib/siteUrl";

export const runtime = "edge";
export const revalidate = 3600;

/** Transport only: the document is built in `lib/agent/openApi.ts`; the API catalog names it as `service-desc`. */
export async function GET() {
  return new Response(JSON.stringify(buildOpenApiDocument(resolveSiteUrl())), {
    headers: {
      "Content-Type": "application/vnd.oai.openapi+json;version=3.1; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
