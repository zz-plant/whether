import { renderRobotsTxt } from "../../lib/seo/robotsTxt";

/**
 * robots.txt as a plain route handler. The Content-Signal line (contentsignals.org)
 * is not representable in Next's `MetadataRoute.Robots`, so the metadata route became
 * this handler rendering the text from the rules in `lib/seo/robotsTxt.ts` — the same
 * rules `tests/robotsRoute.test.ts` and `tests/agentDiscoveryParity.test.ts` check.
 * The rendered file cannot drift from the structured rules without a failing test.
 */
export async function GET() {
  return new Response(renderRobotsTxt(), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      // The file changes only with a deploy; one hour, like /llms.txt.
      "Cache-Control": "public, max-age=3600",
    },
  });
}
