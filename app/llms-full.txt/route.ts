import { resolveSiteUrl } from "../../lib/siteUrl";
import { buildLlmsFullCorpus } from "../../lib/seo/llmsFullCorpus";

export const runtime = "edge";
export const revalidate = 3600;

/**
 * The corpus itself, beside `/llms.txt`'s map of endpoints.
 *
 * Transport only — the document is built in `lib/seo/llmsFullCorpus.ts` so its
 * shape is testable without a route context, the same split `/brief.md` uses.
 */
export async function GET() {
  return new Response(buildLlmsFullCorpus(resolveSiteUrl()), {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
