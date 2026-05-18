import { NextResponse } from "next/server";
import { createCloudflareEmailAdapter, getActiveSubscriptions } from "../../../../lib/email/emailDelivery";
import { buildAgentInterfaceResponse } from "../../../../lib/agentInterface";

export const runtime = "edge";

/* POST /api/email/send-weekly — send the weekly brief to all active subscribers.
   Called by the cron trigger (Mon 14:00 UTC) or manually. */
export async function POST(request: Request) {
  try {
    const authToken = request.headers.get("authorization")?.replace("Bearer ", "");
    const expectedToken = process.env.WHETHER_CRON_SECRET;
    if (expectedToken && authToken !== expectedToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subscriptions = getActiveSubscriptions();
    if (subscriptions.length === 0) {
      return NextResponse.json({ ok: true, sent: 0, message: "No active subscriptions." });
    }

    const brief = await buildAgentInterfaceResponse("weekly");
    const adapter = createCloudflareEmailAdapter();

    const results = await Promise.allSettled(
      subscriptions.map((recipient) => {
        const regime = String((brief as any).summary?.regime ?? "Stable");
        const actionNow = String((brief as any).summary?.action ?? "Hold current posture");
        const recordDate = String((brief as any).summary?.recordDate ?? "this week");
        const subject = `Whether Brief — ${regime}`;
        const briefUrl = "https://whether.work";

        const text = [
          `Whether Weekly Brief — ${recordDate}`,
          `Regime: ${regime}`,
          `Action: ${actionNow}`,
          `View full brief: ${briefUrl}`,
          `---`,
          `Whether · weekly operating brief`,
        ].join("\n");

        const html = [
          `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#121212;color:#e2e8f0;">`,
          `<h1 style="font-size:1.25rem;font-weight:600;margin:0 0 4px;">Whether Weekly Brief</h1>`,
          `<p style="color:#94a3b8;font-size:0.85rem;margin:0 0 20px;">${recordDate}</p>`,
          `<div style="border:1px solid rgba(148,163,184,0.15);border-radius:8px;padding:16px;margin-bottom:16px;">`,
          `<p style="font-size:0.75rem;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;margin:0 0 8px;">Call</p>`,
          `<p style="font-size:1.1rem;font-weight:600;margin:0;color:#f1f5f9;">${regime}</p></div>`,
          `<div style="border:1px solid rgba(148,163,184,0.15);border-radius:8px;padding:16px;margin-bottom:20px;">`,
          `<p style="font-size:0.75rem;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;margin:0 0 8px;">Action</p>`,
          `<p style="font-size:1.1rem;font-weight:600;margin:0;color:#f1f5f9;">${actionNow}</p></div>`,
          `<a href="${briefUrl}" style="display:inline-block;padding:12px 24px;border-radius:8px;background:linear-gradient(135deg,rgba(36,99,235,0.94),rgba(14,116,144,0.92));color:white;text-decoration:none;font-weight:600;font-size:0.9rem;">View full brief →</a>`,
          `<p style="margin-top:32px;font-size:0.75rem;color:#64748b;">Whether · weekly operating brief</p></body></html>`,
        ].join("\n");

        return adapter.send({ to: recipient, subject, html, text });
      }),
    );

    const sent = results.filter((r) => r.status === "fulfilled" && r.value.ok).length;
    const errors = results.filter((r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value.ok)).length;

    return NextResponse.json({ ok: true, sent, errors, total: subscriptions.length });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
