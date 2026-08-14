import { NextResponse } from "next/server";
import { getRegimeAlertRepository } from "../../../lib/storage/regimeAlertRepository";
import {
  buildSignalAlertPayload,
  shouldCreateSignalAlert,
  type RegimeAlertEvent,
  type SignalAlertInputPayload,
} from "../../../lib/signalOps";
import { buildLineage } from "../../../lib/storage/lineage";
import { requireCronAuth } from "../../../lib/api/cronAuth";

export const runtime = "edge";

/* GET requires authentication — exposes internal alert data. */
export async function GET(request: Request) {
  const authError = requireCronAuth(request);
  if (authError) return authError;
  const url = new URL(request.url);
  const cursor = url.searchParams.get("cursor");
  const limitRaw = url.searchParams.get("limit");
  const limit = limitRaw ? Math.max(1, Math.min(200, Number.parseInt(limitRaw, 10) || 64)) : 64;

  const repository = getRegimeAlertRepository();
  const listed = await repository.listAlerts({ cursor, limit });

  return NextResponse.json({
    alerts: listed.alerts,
    pagination: {
      cursor,
      nextCursor: listed.nextCursor,
      limit,
      returned: listed.alerts.length,
    },
    backend: repository.backendStatus(),
  });
}

export async function POST(request: Request) {
  const authError = requireCronAuth(request);
  if (authError) return authError;
  const requestPayload = (await request.json()) as SignalAlertInputPayload;
  const repository = getRegimeAlertRepository();
  const latest = await repository.latestAlert();
  const payload = buildSignalAlertPayload(requestPayload, latest ?? undefined);

  const listed = await repository.listAlerts({ limit: 64 });
  if (!shouldCreateSignalAlert(payload, latest ?? undefined)) {
    return NextResponse.json({ created: false, alerts: listed.alerts, backend: repository.backendStatus() });
  }

  const lineage = buildLineage("request-received-at");
  const entry: RegimeAlertEvent = {
    ...lineage,
    canonicalTimestampSource: "request-received-at",
    id: lineage.eventId,
    createdAt: new Date().toISOString(),
    payload,
  };

  await repository.appendAlert(entry);
  const updated = await repository.listAlerts({ limit: 64 });

  return NextResponse.json({
    created: true,
    alert: entry,
    alerts: updated.alerts,
    backend: repository.backendStatus(),
  });
}
