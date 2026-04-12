import { NextResponse } from "next/server";
import {
  DEFAULT_ALERT_PREFERENCES,
  getAlertPreferenceRepository,
} from "../../../lib/storage/alertPreferenceRepository";
import { buildRegimeAlertLineage, getRegimeAlertRepository } from "../../../lib/storage/regimeAlertRepository";
import { buildDeliverySummary, type AlertChannel, type AlertDeliveryEvent } from "../../../lib/signalOps";

export const runtime = "edge";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const cursor = url.searchParams.get("cursor");
  const limitRaw = url.searchParams.get("limit");
  const clientId = url.searchParams.get("clientId") ?? undefined;
  const limit = limitRaw ? Math.max(1, Math.min(200, Number.parseInt(limitRaw, 10) || 64)) : 64;

  const repository = getRegimeAlertRepository();
  const listed = await repository.listDeliveries({ cursor, limit, clientId });
  const degraded = repository.backendStatus() === "local-fallback";

  return NextResponse.json({
    deliveries: listed.deliveries,
    count: listed.deliveries.length,
    pagination: {
      cursor,
      nextCursor: listed.nextCursor,
      limit,
      returned: listed.deliveries.length,
    },
    clientId: clientId ?? null,
    degraded,
    backend: repository.backendStatus(),
  });
}

export async function POST(request: Request) {
  const repository = getRegimeAlertRepository();
  const preferenceRepository = getAlertPreferenceRepository();
  const degraded = repository.backendStatus() === "local-fallback" || preferenceRepository.backendStatus() === "local-fallback";

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ deliveries: [], error: "invalid-json", degraded, backend: repository.backendStatus() }, { status: 400 });
  }

  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ deliveries: [], error: "invalid-payload", degraded, backend: repository.backendStatus() }, { status: 400 });
  }

  const candidate = payload as { clientId?: unknown; alertId?: unknown };
  if (typeof candidate.clientId !== "string" || !candidate.clientId || typeof candidate.alertId !== "string" || !candidate.alertId) {
    return NextResponse.json({ deliveries: [], error: "invalid-payload", degraded, backend: repository.backendStatus() }, { status: 400 });
  }

  const preferences = (await preferenceRepository.get(candidate.clientId)) ?? DEFAULT_ALERT_PREFERENCES;
  const alertList = await repository.listAlerts({ limit: 64 });
  const alert = alertList.alerts.find((item) => item.id === candidate.alertId) ?? null;

  const channels: AlertChannel[] = ["slack", "email", "webhook"];
  const created: AlertDeliveryEvent[] = [];

  for (const channel of channels) {
    const lineage = buildRegimeAlertLineage();
    const event: AlertDeliveryEvent = {
      ...lineage,
      canonicalTimestampSource: "request-received-at",
      id: lineage.eventId,
      clientId: candidate.clientId,
      alertId: candidate.alertId,
      channel,
      deliveredAt: new Date().toISOString(),
      status: preferences[channel] ? "sent" : "skipped",
      summary: alert ? buildDeliverySummary(alert) : `Alert ${candidate.alertId}`,
    };
    await repository.appendDelivery(event);
    created.push(event);
  }

  const listed = await repository.listDeliveries({ limit: 128, clientId: candidate.clientId });

  return NextResponse.json({
    created: true,
    events: created,
    deliveries: listed.deliveries,
    clientId: candidate.clientId,
    degraded,
    backend: repository.backendStatus(),
  });
}
