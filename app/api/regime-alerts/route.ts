import { NextResponse } from "next/server";
import { serverStore } from "../../../lib/serverStore";
import {
  shouldCreateSignalAlert,
  type RegimeAlertEvent,
  type SignalAlertPayload,
} from "../../../lib/signalOps";

export const runtime = "edge";

export async function GET() {
  const snapshot = await serverStore.getSnapshot();
  return NextResponse.json({ alerts: snapshot.regimeAlerts });
}

export async function POST(request: Request) {
  const payload = (await request.json()) as SignalAlertPayload;
  const mutation = await serverStore.mutate<{ created: boolean; alert: RegimeAlertEvent | null }>((snapshot) => {
    const latest = snapshot.regimeAlerts[0];

    if (!shouldCreateSignalAlert(payload, latest)) {
      return {
        snapshot,
        result: { created: false, alert: null },
      };
    }

    const entry: RegimeAlertEvent = {
      id: typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}`,
      createdAt: new Date().toISOString(),
      payload,
    };

    return {
      snapshot: {
        ...snapshot,
        regimeAlerts: [entry, ...snapshot.regimeAlerts].slice(0, 64),
      },
      result: { created: true, alert: entry },
    };
  });

  if (!mutation.result.created) {
    return NextResponse.json({ created: false, alerts: mutation.snapshot.regimeAlerts });
  }

  return NextResponse.json({
    created: true,
    alert: mutation.result.alert,
    alerts: mutation.snapshot.regimeAlerts,
  });
}
