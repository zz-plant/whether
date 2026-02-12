import { NextResponse } from "next/server";
import { serverStore } from "../../../lib/serverStore";
import {
  shouldCreateSignalAlert,
  type RegimeAlertEvent,
  type SignalAlertPayload,
} from "../../../lib/signalOps";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ alerts: serverStore.regimeAlerts });
}

export async function POST(request: Request) {
  const payload = (await request.json()) as SignalAlertPayload;
  const latest = serverStore.regimeAlerts[0];

  if (!shouldCreateSignalAlert(payload, latest)) {
    return NextResponse.json({ created: false, alerts: serverStore.regimeAlerts });
  }

  const entry: RegimeAlertEvent = {
    id: typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}`,
    createdAt: new Date().toISOString(),
    payload,
  };

  serverStore.regimeAlerts = [entry, ...serverStore.regimeAlerts].slice(0, 64);

  return NextResponse.json({ created: true, alert: entry, alerts: serverStore.regimeAlerts });
}
