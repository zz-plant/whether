import { NextResponse } from "next/server";
import { isWebVitalMetric } from "../../../../lib/webVitalsTelemetry";
import { writeAnalytics } from "../../../../lib/telemetry/analyticsEngine";

export const runtime = "edge";

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (!isWebVitalMetric(payload)) {
    return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
  }

  // value + delta are the two numerics worth promoting to typed columns;
  // the rest of the payload (name, rating, path, etc.) lands in the JSON blob.
  writeAnalytics("web-vitals", payload, {
    doubles: [payload.value, payload.delta],
  });

  return NextResponse.json({ ok: true }, { status: 202 });
}
