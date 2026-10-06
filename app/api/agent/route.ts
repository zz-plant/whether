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
import { buildUseConstraint } from "../../../lib/report/useConstraint";

export const runtime = "edge";
export const revalidate = 0;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const requestedCadence = searchParams.get("cadence") ?? "weekly";
  const format = searchParams.get("format");
  // The views are the manifest's (`lib/agent/discovery.ts`), so it cannot list one this refuses.
  const view = searchParams.get("view") ?? DEFAULT_AGENT_VIEW;

  if (format !== null && format !== "jev") {
    return NextResponse.json(
      { error: "Invalid format.", allowedFormats: ["jev"] },
      { status: 400, headers: agentApiCorsHeaders },
    );
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

  if (format === "jev") {
    const handoff = buildJevHandoff({
      payload: payload.agentHandoff.payload,
      publishReadiness: payload.publishReadiness,
      recordDateLabel: payload.recordDateLabel,
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
