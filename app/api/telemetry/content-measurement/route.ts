import { NextResponse } from "next/server";
import { isContentMeasurementEvent } from "../../../../lib/contentMeasurement";

export const runtime = "edge";

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (!isContentMeasurementEvent(payload)) {
    return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
  }

  // Keep first-action telemetry non-blocking to preserve operator flow.
  console.info("[content-measurement]", payload);

  return NextResponse.json({ ok: true }, { status: 202 });
}
