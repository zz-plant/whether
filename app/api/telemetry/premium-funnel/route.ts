import { NextResponse } from "next/server";
import { dispatchPremiumFunnelEvent, isValidPremiumFunnelEvent } from "../../../../lib/premiumFunnel";

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (!isValidPremiumFunnelEvent(payload)) {
    return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
  }

  try {
    await dispatchPremiumFunnelEvent(payload);
  } catch {
    // Keep telemetry non-blocking for operator workflows.
  }

  return NextResponse.json({ ok: true }, { status: 202 });
}
