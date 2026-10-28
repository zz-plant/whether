import { NextResponse } from "next/server";
import { AGENT_VIEWS, DEFAULT_AGENT_VIEW } from "../../../lib/agent/discovery";
import {
  buildAgentInterfaceResponse,
  isAgentCadence,
  supportedAgentCadences,
} from "../../../lib/agentInterface";
import { agentApiCorsHeaders } from "../../../lib/agentApiCors";
import { buildAgentStateResponse } from "../../../lib/agentState";
import { buildJevHandoff } from "../../../lib/jev/jevHandoff";
import { DECISION_MODELS, isDecisionModel } from "../../../lib/jev/jevClient";
import { buildUseConstraint } from "../../../lib/report/useConstraint";
import {
  findPublishedBrief,
  getPublishedBriefs,
  publishedBriefDisplay,
  publishedBriefHeadline,
  buildPublishedBriefPath,
} from "../../../lib/report/publishedBriefs";
import {
  findPostureArchivePeriod,
  getPostureArchivePeriods,
  buildPostureArchivePath,
} from "../../../lib/summary/postureArchive";
import { buildCanonicalUrl } from "../../../lib/seo";

export const runtime = "edge";
export const revalidate = 0;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const requestedCadence = searchParams.get("cadence") ?? "weekly";
  const weekParam = searchParams.get("week");
  const periodParam = searchParams.get("period");
  const format = searchParams.get("format");
  const model = searchParams.get("model") ?? "jev";
  const input = searchParams.get("input") ?? "text";
  // The views are the manifest's (`lib/agent/discovery.ts`), so it cannot list one this refuses.
  const view = searchParams.get("view") ?? DEFAULT_AGENT_VIEW;

  if (weekParam) {
    const brief = findPublishedBrief(weekParam.toLowerCase());
    if (!brief) {
      return NextResponse.json(
        {
          error: "Published brief not found for the requested week.",
          requestedWeek: weekParam,
          availableWeeks: getPublishedBriefs().map((b) => b.slug),
        },
        { status: 404, headers: agentApiCorsHeaders },
      );
    }
    const display = publishedBriefDisplay(brief);
    return NextResponse.json(
      {
        type: "published_brief",
        slug: brief.slug,
        year: brief.year,
        week: brief.week,
        publishedAt: brief.publishedAt,
        recordDate: brief.recordDate,
        recordDateLabel: brief.recordDateLabel,
        headline: publishedBriefHeadline(brief).composed,
        /* The headline's action. The record's own field is the action the headline stopped
           leading with on 2026-10-09, kept as the source of the week's direction. */
        actionNow: publishedBriefHeadline(brief).action,
        regime: brief.regime,
        conditions: display.conditions,
        confidence: { label: brief.confidenceLabel },
        scores: brief.scores ?? null,
        whatChanged: display.whatChanged,
        pauseIf: display.pauseIf,
        conditionsChangeIf: display.conditionsChangeIf,
        decisions: brief.decisions,
        evidence: brief.evidence,
        sourceLabel: brief.sourceLabel,
        permalink: buildCanonicalUrl(buildPublishedBriefPath(brief.slug)),
        use: buildUseConstraint(),
      },
      { headers: agentApiCorsHeaders },
    );
  }

  if (periodParam) {
    const archivePeriod = findPostureArchivePeriod(periodParam.toLowerCase());
    if (!archivePeriod) {
      return NextResponse.json(
        {
          error: "Archive period not found for the requested period.",
          requestedPeriod: periodParam,
          availablePeriods: getPostureArchivePeriods().map((p) => p.slug),
        },
        { status: 404, headers: agentApiCorsHeaders },
      );
    }
    return NextResponse.json(
      {
        type: "posture_archive_period",
        ...archivePeriod,
        permalink: buildCanonicalUrl(buildPostureArchivePath(archivePeriod.slug)),
        use: buildUseConstraint(),
      },
      { headers: agentApiCorsHeaders },
    );
  }

  if (format !== null && format !== "jev") {
    return NextResponse.json(
      { error: "Invalid format.", allowedFormats: ["jev"] },
      { status: 400, headers: agentApiCorsHeaders },
    );
  }

  if (format === "jev" && (!isDecisionModel(model) || !["text", "audio", "video"].includes(input) || (input !== "text" && model !== "clef-omni"))) {
    return NextResponse.json({ error: "Invalid decision model or input. Audio/video require clef-omni.", allowedModels: Object.keys(DECISION_MODELS), allowedInputs: ["text", "audio", "video"] }, { status: 400, headers: agentApiCorsHeaders });
  }

  if (!AGENT_VIEWS.some((allowed) => allowed === view)) {
    return NextResponse.json(
      { error: "Invalid view.", allowedViews: AGENT_VIEWS },
      { status: 400, headers: agentApiCorsHeaders },
    );
  }

  if (view === "state" && format === "jev") {
    return NextResponse.json(
      { error: "view=state cannot be combined with format=jev; the Jev request carries its own state.", allowedViews: AGENT_VIEWS },
      { status: 400, headers: agentApiCorsHeaders },
    );
  }

  if (!isAgentCadence(requestedCadence)) {
    return NextResponse.json(
      {
        error: "Invalid cadence.",
        allowedCadences: supportedAgentCadences,
      },
      {
        status: 400,
        headers: agentApiCorsHeaders,
      }
    );
  }

  if (view === "state") {
    /* The state is the current reading; a monthly or yearly answer to the same request would be
       the weekly one under another name. */
    if (requestedCadence !== "weekly") {
      return NextResponse.json(
        { error: "view=state is the current reading and takes no other cadence.", allowedCadences: ["weekly"] },
        { status: 400, headers: agentApiCorsHeaders },
      );
    }
    return NextResponse.json(await buildAgentStateResponse("/api/agent"), { headers: agentApiCorsHeaders });
  }

  const payload = await buildAgentInterfaceResponse(requestedCadence, {
    route: "/api/agent",
  });

  if (format === "jev" && isDecisionModel(model) && (input === "text" || input === "audio" || input === "video")) {
    const handoff = buildJevHandoff({
      payload: payload.agentHandoff.payload,
      publishReadiness: payload.publishReadiness,
      recordDateLabel: payload.recordDateLabel,
      model,
      input,
    });
    return NextResponse.json({ ...handoff, cadence: payload.cadence, use: buildUseConstraint() }, {
      headers: agentApiCorsHeaders,
    });
  }

  return NextResponse.json({ ...payload, use: buildUseConstraint() }, {
    headers: agentApiCorsHeaders,
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: agentApiCorsHeaders,
  });
}
