import { NextResponse } from "next/server";
import { serverStore } from "../../../lib/serverStore";
import { buildWeeklyDigest } from "../../../lib/signalOps";

export const runtime = "edge";

export async function GET() {
  const snapshot = await serverStore.getSnapshot();
  const digest = buildWeeklyDigest(snapshot.regimeAlerts);
  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    digest,
    alertCount: snapshot.regimeAlerts.length,
    deliveryCount: snapshot.alertDeliveries.length,
  });
}
