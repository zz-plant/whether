import { NextResponse } from "next/server";
import {
  buildAgentInterfaceResponse,
  isAgentCadence,
  supportedAgentCadences,
} from "../../../lib/agentInterface";
import { agentApiCorsHeaders } from "../../../lib/agentApiCors";
import { buildJevHandoff } from "../../../lib/jev/jevHandoff";
import { buildUseConstraint } from "../../../lib/report/useConstraint";

export const runtime = "edge";
export const revalidate = 0;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const requestedCadence = searchParams.get("cadence") ?? "weekly";
  const format = searchParams.get("format");

  if (format !== null && format !== "jev") {
    return NextResponse.json(
      { error: "Invalid format.", allowedFormats: ["jev"] },
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
