import { NextResponse } from "next/server";
import { isWebVitalMetric } from "../../../../lib/webVitalsTelemetry";

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

  console.info("[web-vitals]", payload);

  return NextResponse.json({ ok: true }, { status: 202 });
}
