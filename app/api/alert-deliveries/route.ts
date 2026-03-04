import { NextResponse } from "next/server";
import { getDeliveryPreferences } from "../../../lib/alertPreferencesStore";
import { serverStore } from "../../../lib/serverStore";
import {
  buildDeliverySummary,
  type AlertChannel,
  type AlertDeliveryEvent,
} from "../../../lib/signalOps";

export const runtime = "edge";

const channelOrder: AlertChannel[] = ["slack", "email", "webhook"];

export async function GET() {
  const snapshot = await serverStore.getSnapshot();
  return NextResponse.json({ deliveries: snapshot.alertDeliveries });
}

export async function POST(request: Request) {
  const payload = (await request.json()) as {
    clientId?: string;
    alertId?: string;
  };
  const clientId = payload.clientId?.trim();
  const alertId = payload.alertId?.trim();

  if (!clientId || !alertId) {
    return NextResponse.json(
      { error: "clientId and alertId are required" },
      { status: 400 },
    );
  }

  const mutation = await serverStore.mutate<{
    deliveries: AlertDeliveryEvent[];
    created: AlertDeliveryEvent[];
  }>((snapshot) => {
    const alert = snapshot.regimeAlerts.find((entry) => entry.id === alertId);
    if (!alert) {
      return {
        snapshot,
        result: {
          deliveries: snapshot.alertDeliveries,
          created: [],
        },
      };
    }

    const preferences = getDeliveryPreferences(clientId);
    const created = channelOrder.map<AlertDeliveryEvent>((channel) => ({
      id:
        typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `${Date.now()}-${channel}`,
      alertId,
      channel,
      deliveredAt: new Date().toISOString(),
      status: preferences[channel] ? "sent" : "skipped",
      summary: buildDeliverySummary(alert),
    }));

    const deliveries = [...created, ...snapshot.alertDeliveries].slice(0, 128);
    return {
      snapshot: {
        ...snapshot,
        alertDeliveries: deliveries,
      },
      result: {
        deliveries,
        created,
      },
    };
  });

  return NextResponse.json({
    deliveries: mutation.result.deliveries,
    created: mutation.result.created,
  });
}
