import { NextResponse } from "next/server";
import { isOperatorWorkflowEvent } from "../../../../lib/operatorWorkflowTelemetry";
import { writeAnalytics } from "../../../../lib/telemetry/analyticsEngine";

export const runtime = "edge";

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (!isOperatorWorkflowEvent(payload)) {
    return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
  }

  writeAnalytics("operator-workflow", payload);

  return NextResponse.json({ ok: true }, { status: 202 });
}
