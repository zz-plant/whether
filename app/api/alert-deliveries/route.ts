import { NextResponse } from "next/server";
import { getRegimeAlertRepository } from "../../../lib/storage/regimeAlertRepository";
import { runScheduledAlertDelivery } from "../../../lib/alert/alertDelivery";
import { requireCronAuth } from "../../../lib/api/cronAuth";
import { constantTimeCompare } from "../../../lib/constantTimeCompare";

export const runtime = "edge";

/* GET requires authentication — exposes internal alert delivery data. */
export async function GET(request: Request) {
  const authToken = request.headers
    .get("authorization")
    ?.replace("Bearer ", "");
  const expectedToken = process.env.WHETHER_CRON_SECRET;
  if (expectedToken && (!authToken || !constantTimeCompare(authToken, expectedToken))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const cursor = url.searchParams.get("cursor");
  const limitRaw = url.searchParams.get("limit");
  const clientId = url.searchParams.get("clientId") ?? undefined;
  const limit = limitRaw
    ? Math.max(1, Math.min(200, Number.parseInt(limitRaw, 10) || 64))
    : 64;

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

/**
 * Cron-only. This used to fall through to a "manual single-alert delivery from the UI"
 * branch for unauthenticated callers, which appended a delivery row with status "sent" for
 * every channel the preferences enabled — without contacting a single channel. The panel
 * that called it reported "Delivered to N channels" off those rows until #1290 removed the
 * control, which left an open endpoint whose only effect was writing delivery records for
 * sends that never happened. Real delivery goes through runScheduledAlertDelivery, which
 * mails verified subscribers and nobody else.
 */
export async function POST(request: Request) {
  const authError = requireCronAuth(request);
  if (authError) return authError;

  try {
    const result = await runScheduledAlertDelivery();

    return NextResponse.json({
      ok: true,
      sent: result.sent,
      skipped: result.skipped,
      alerts: result.alerts,
      errors: result.errors,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
