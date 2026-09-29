import { buildLlmsTxt } from "../../lib/seo/llmsTxt";
import { resolveSiteUrl } from "../../lib/siteUrl";

export const runtime = "edge";
export const revalidate = 3600;

/**
 * Transport only: the document is built in `lib/seo/llmsTxt.ts`, from the same tool
 * definitions the MCP servers run, so what is listed here is what is served.
 */
export async function GET() {
  return new Response(buildLlmsTxt(resolveSiteUrl()), {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
