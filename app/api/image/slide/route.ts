import { NextRequest, NextResponse } from "next/server";
import { buildExportSlidePayload, loadExportSnapshot } from "../../../../lib/export/exportSnapshot";
import { formatMeetingSlideSvg } from "../../../../lib/export/meetingSlideExport";
import {
  isStartupVariantMode,
  type StartupVariantMode,
} from "../../../../lib/report/boundedDecisionRules";

export const runtime = "edge";
export const revalidate = 3600;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const rawStage = searchParams.get("stage");
  const stage: StartupVariantMode | null = rawStage && isStartupVariantMode(rawStage) ? rawStage : null;

  const snapshot = await loadExportSnapshot();
  if (!snapshot) {
    return new NextResponse("Operating snapshot unavailable", { status: 503 });
  }

  const payload = buildExportSlidePayload(snapshot, stage);
  const svg = formatMeetingSlideSvg(payload);

  return new NextResponse(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
