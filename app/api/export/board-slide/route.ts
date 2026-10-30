import { NextRequest, NextResponse } from "next/server";
import {
  buildExportSlidePayload,
  loadExportSnapshot,
  publishedBriefToSlidePayload,
} from "../../../../lib/export/exportSnapshot";
import {
  BOARD_SLIDE_FORMATS,
  boardSlideFileName,
  buildBoardSlidePdf,
  buildBoardSlidePptx,
  isBoardSlideFormat,
} from "../../../../lib/export/boardSlideDeck";
import {
  isStartupVariantMode,
  type StartupVariantMode,
} from "../../../../lib/report/boundedDecisionRules";
import { findPublishedBrief } from "../../../../lib/report/publishedBriefs";
import type { MeetingSlidePayload } from "../../../../lib/export/meetingSlideExport";

export const runtime = "edge";
export const revalidate = 3600;

/**
 * The one-slide board deck as a file: `?format=pptx` (default) or `?format=pdf`,
 * with the same `?stage=` the SVG slide takes, and optional `?week=` to download
 * a slide for any frozen historical week. Served as an attachment so a click
 * lands the file in the download tray rather than a tab.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const rawStage = searchParams.get("stage");
  const stage: StartupVariantMode | null = rawStage && isStartupVariantMode(rawStage) ? rawStage : null;
  const rawFormat = searchParams.get("format") ?? "pptx";
  const format = isBoardSlideFormat(rawFormat) ? rawFormat : "pptx";
  const rawWeek = searchParams.get("week");

  let payload: MeetingSlidePayload;
  if (rawWeek) {
    // A frozen week's slide is the brief as published. A stage would calibrate
    // the archived call, pause and restart lines into guidance the record never
    // contained — the live path derives them from the engine; the archive only
    // has what was frozen. Rejected rather than half-applied (a bare stage key
    // in the title over uncalibrated lines).
    if (stage) {
      return new NextResponse(
        "A stage cannot calibrate a frozen week's brief; stage applies to the live week only.",
        { status: 400 },
      );
    }
    const brief = findPublishedBrief(rawWeek.toLowerCase());
    if (!brief) {
      return new NextResponse(`Published brief not found for week ${rawWeek}`, { status: 404 });
    }
    payload = publishedBriefToSlidePayload(brief, stage);
  } else {
    const snapshot = await loadExportSnapshot();
    if (!snapshot) {
      return new NextResponse("Operating snapshot unavailable", { status: 503 });
    }
    payload = buildExportSlidePayload(snapshot, stage);
  }

  const bytes = format === "pdf" ? await buildBoardSlidePdf(payload) : buildBoardSlidePptx(payload);
  // Copied into a fresh buffer: the builders return a view over `ArrayBufferLike`,
  // which `BodyInit` does not accept, and a copy costs a few tens of kilobytes.
  const body = new Uint8Array(bytes).buffer;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": BOARD_SLIDE_FORMATS[format].contentType,
      "Content-Disposition": `attachment; filename="${boardSlideFileName(payload, format)}"`,
      "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
