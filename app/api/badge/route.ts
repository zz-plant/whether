import { renderStatusBadge } from "../../../lib/export/statusBadge";
import { getRegimePublicLabel } from "../../../lib/regimePresentation";
import { loadReportDataSafe } from "../../../lib/report/reportData";

export const runtime = "edge";

/** The week's conditions as an SVG badge (`lib/export/statusBadge.ts`). */
export async function GET() {
  const result = await loadReportDataSafe(undefined, { route: "/api/badge" });
  const reportData = result.ok ? result.data : result.fallback;
  const regime = reportData.assessment.regime;
  const svg = renderStatusBadge({
    regime,
    conditions: getRegimePublicLabel(regime),
    savedCopy: !result.ok || !reportData.treasury.isLive,
  });
  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      /* Short at the edge so a README's image cache (GitHub's camo honours it) picks up a Monday change the same day. */
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
