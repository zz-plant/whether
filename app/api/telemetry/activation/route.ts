import { NextResponse } from "next/server";
import { isActivationEvent } from "../../../../lib/activationFunnel";
import { writeAnalytics } from "../../../../lib/telemetry/analyticsEngine";

export const runtime = "edge";

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (!isActivationEvent(payload)) {
    return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
  }

  writeAnalytics("activation", payload);

  return NextResponse.json({ ok: true }, { status: 202 });
}
