import { NextResponse } from "next/server";
import { serverStore } from "../../../lib/serverStore";
import { buildDeliverySummary, type AlertChannel, type AlertDeliveryEvent } from "../../../lib/signalOps";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ deliveries: serverStore.snapshot.alertDeliveries });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    clientId?: string;
    alertId?: string;
    channels?: AlertChannel[];
  };

  const clientId = body.clientId ?? "anonymous";
  const alertId = body.alertId ?? serverStore.snapshot.regimeAlerts[0]?.id;

  if (!alertId) {
    return NextResponse.json({ error: "No alert available for delivery." }, { status: 400 });
  }

  const alert = serverStore.snapshot.regimeAlerts.find((item) => item.id === alertId);
  if (!alert) {
    return NextResponse.json({ error: "Alert not found." }, { status: 404 });
  }

  const preferenceMap = serverStore.getPreferences(clientId);
  const channelCandidates = body.channels ?? (Object.keys(preferenceMap) as AlertChannel[]);
  const summary = buildDeliverySummary(alert);

  const deliveries: AlertDeliveryEvent[] = channelCandidates.map((channel) => ({
    id: typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${channel}`,
    alertId,
    channel,
    deliveredAt: new Date().toISOString(),
    status: preferenceMap[channel] ? "sent" : "skipped",
    summary,
  }));

  serverStore.save({
    ...serverStore.snapshot,
    alertDeliveries: [...deliveries, ...serverStore.snapshot.alertDeliveries].slice(0, 500),
  });

  return NextResponse.json({ deliveries, preferences: preferenceMap });
}
