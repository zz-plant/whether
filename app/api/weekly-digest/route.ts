import { NextResponse } from "next/server";
import { serverStore } from "../../../lib/serverStore";
import { buildWeeklyDigest } from "../../../lib/signalOps";

export const runtime = "edge";

export async function GET() {
  const digest = buildWeeklyDigest(serverStore.snapshot.regimeAlerts);
  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    digest,
    alertCount: serverStore.snapshot.regimeAlerts.length,
    deliveryCount: serverStore.snapshot.alertDeliveries.length,
  });
}
