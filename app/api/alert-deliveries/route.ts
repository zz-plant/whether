import { NextResponse } from "next/server";
import { getRegimeAlertRepository } from "../../../lib/storage/regimeAlertRepository";
import { runScheduledAlertDelivery } from "../../../lib/alert/alertDelivery";
import { requireCronAuth } from "../../../lib/api/cronAuth";
import { resolveEmailBaseUrl } from "../../../lib/email/publicBaseUrl";

export const runtime = "edge";

/**
 * Cron-only, failing closed. This listed every client's delivery history, and its guard
 * was written as "reject if a secret is configured and does not match" — so a deployment
 * with no WHETHER_CRON_SECRET served the whole log to anyone who asked. An endpoint whose
 * own comment says it exposes internal data should not be readable precisely when the
 * environment is misconfigured. requireCronAuth answers 503 in that case, which is the
 * rule /api/regime-alerts and the other cron routes already follow.
 */
export async function GET(request: Request) {
  const authError = requireCronAuth(request);
  if (authError) return authError;

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
    const result = await runScheduledAlertDelivery({ baseUrl: resolveEmailBaseUrl(request) });

    if (result.refused) {
      /* Nothing stored and the report read served the bundled copy: nothing was
         judged, sent or recorded. Same answer as /api/check-regime-change. */
      return NextResponse.json(
        {
          ok: false,
          error: result.refused,
          sent: result.sent,
          skipped: result.skipped,
          alerts: result.alerts,
          errors: result.errors,
        },
        { status: 503 },
      );
    }

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
