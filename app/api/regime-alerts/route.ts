import { NextResponse } from "next/server";
import { serverStore } from "../../../lib/serverStore";
import {
  buildSignalAlertPayload,
  shouldCreateSignalAlert,
  type RegimeAlertEvent,
  type SignalAlertInputPayload,
} from "../../../lib/signalOps";

export const runtime = "edge";

export async function GET() {
  return NextResponse.json({ alerts: serverStore.snapshot.regimeAlerts });
}

export async function POST(request: Request) {
  const requestPayload = (await request.json()) as SignalAlertInputPayload;
  const latest = serverStore.snapshot.regimeAlerts[0];
  const payload = buildSignalAlertPayload(requestPayload, latest);

  if (!shouldCreateSignalAlert(payload, latest)) {
    return NextResponse.json({ created: false, alerts: serverStore.snapshot.regimeAlerts });
  }

  const entry: RegimeAlertEvent = {
    id: typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}`,
    createdAt: new Date().toISOString(),
    payload,
  };

  serverStore.save({
    ...serverStore.snapshot,
    regimeAlerts: [entry, ...serverStore.snapshot.regimeAlerts].slice(0, 64),
  });

  return NextResponse.json({ created: true, alert: entry, alerts: serverStore.snapshot.regimeAlerts });
}
