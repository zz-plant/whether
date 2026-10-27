import { PREMISE_TEST_DOCS } from "../../../lib/research/premiseTestDocs";

export const runtime = "edge";

/**
 * Transport only: the text is docs/research/, bundled by
 * scripts/research/publishResearchDocs.ts. Plain text rather than
 * text/markdown, because some browsers download a Markdown response instead of
 * showing it, and this is linked for reading from /trust.
 */
export async function GET() {
  return new Response(PREMISE_TEST_DOCS.registration, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
