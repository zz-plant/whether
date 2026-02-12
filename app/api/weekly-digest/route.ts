import { NextResponse } from "next/server";
import { serverStore } from "../../../lib/serverStore";
import { buildWeeklyDigest } from "../../../lib/signalOps";

export const runtime = "nodejs";

export async function GET() {
  const digest = buildWeeklyDigest(serverStore.regimeAlerts);
  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    digest,
    alertCount: serverStore.regimeAlerts.length,
  });
}
