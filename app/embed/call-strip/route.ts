import { assembleHomePage } from "../../../lib/report/homePageAssembler";
import {
  buildCallStripEmbedModel,
  renderCallStripEmbedDocument,
  renderCallStripEmbedUnavailable,
} from "../../../lib/export/callStripEmbed";
import { parseEmbedTheme } from "../../../lib/export/oembed";

export const runtime = "edge";
export const revalidate = 900;

/*
 * A route handler, not a page: a page renders inside the root layout, which draws the
 * site's header, nav, record band and footer around it, and an embed is the one
 * response that must have none. The frame exception (`frame-ancestors *`) is set for
 * this path alone in next.config.js.
 *
 * The live reading only. The read path serves the materialized model (a cold store is
 * the one case it ingests inline), and no archived month is offered: a live frame under
 * a past month's address would print a week the address does not name.
 */
const headers = {
  "Content-Type": "text/html; charset=utf-8",
  "X-Robots-Tag": "noindex",
  /* No reader's cookies are read, so one copy serves every embedder; the brief refreshes behind it. */
  "Cache-Control": "public, max-age=900, s-maxage=900, stale-while-revalidate=3600",
};

export async function GET(request: Request) {
  const theme = parseEmbedTheme(new URL(request.url).searchParams.get("theme"));
  try {
    const homepage = await assembleHomePage({ searchParams: undefined });
    return new Response(renderCallStripEmbedDocument(buildCallStripEmbedModel(homepage), { theme }), { headers });
  } catch (error) {
    console.error("Embed render failed:", error);
    return new Response(renderCallStripEmbedUnavailable({ theme }), {
      status: 503,
      headers: { ...headers, "Cache-Control": "no-store" },
    });
  }
}
