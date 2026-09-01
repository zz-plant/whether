import { createCloudflareEmailAdapter, getActiveSubscriptions } from "./emailDelivery";
import type { OperatingSnapshot } from "../operatingState/types";
import type { WeeklyCallContract } from "../report/weeklyCallContract";
import { getOperatingSnapshotStore } from "../operatingState/snapshotStore";

export type SendWeeklyBriefResult = {
  ok: boolean;
  sent: number;
  errors: number;
  total: number;
  slackPosted: boolean;
  message?: string;
};

/**
 * Send the weekly brief to all active subscribers, and mirror it to Slack when a
 * webhook is configured. Shared by the cron trigger (direct call from worker/index.ts)
 * and the POST /api/email/send-weekly route, projecting the authoritative OperatingSnapshot.
 */
export const sendWeeklyBrief = async (options?: {
  snapshot?: OperatingSnapshot;
  weeklyCall?: WeeklyCallContract;
}): Promise<SendWeeklyBriefResult> => {
  const subscriptions = await getActiveSubscriptions();
  if (subscriptions.length === 0) {
    return { ok: true, sent: 0, errors: 0, total: 0, slackPosted: false, message: "No active subscriptions." };
  }

  let snapshot = options?.snapshot;
  let weeklyCall = options?.weeklyCall;

  if (!snapshot || !weeklyCall) {
    const store = getOperatingSnapshotStore();
    const stored = await store.readLatest();
    if (stored) {
      snapshot = stored;
      weeklyCall = stored.weeklyCall;
    }
  }

  const regime = snapshot?.assessment.regime ?? "DEFENSIVE";
  const actionNow = weeklyCall?.actionNow ?? weeklyCall?.currentCall ?? "Hold bounded operating discipline.";
  const pauseIf = weeklyCall?.pauseIf ?? "Pause irreversible commitments if funding tightness rises.";
  const changeCourseIf = weeklyCall?.changeCourseIf ?? "Resume staged approvals when conditions stabilize.";
  const recordDate = snapshot?.provenance.recordDateLabel ?? "this week";
  const adapter = createCloudflareEmailAdapter();

  const results = await Promise.allSettled(
    subscriptions.map((recipient) => {
      const subject = regime === "SCARCITY" || regime === "DEFENSIVE"
        ? `Whether — ${regime}: ${actionNow}`
        : `Whether Brief — ${regime}`;
      const briefUrl = "https://whether.work";
      const isContraction = regime === "SCARCITY" || regime === "DEFENSIVE";
      const isExpansion = regime === "EXPANSION";

      const text = [
        `Whether Weekly Brief — ${recordDate}`,
        `Regime: ${regime}`,
        `Action Now: ${actionNow}`,
        `Pause If: ${pauseIf}`,
        `Change Course If: ${changeCourseIf}`,
        ...(isContraction ? [] : [`\nView the full brief, toolkits, and trends:`]),
        briefUrl,
        `---`,
        `Whether · weekly operating brief`,
      ].join("\n");

      /* Regime-adaptive email */
      const sections = [];
      sections.push(
        `<table role="presentation" style="width:100%;border-collapse:collapse;"><tr>`,
        `<td style="padding:16px;border:1px solid rgba(148,163,184,0.15);border-radius:8px;background:#1a1a1a;">`,
        `<p style="font-size:0.75rem;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;margin:0 0 6px;">Regime</p>`,
        `<p style="font-size:1.1rem;font-weight:600;margin:0;color:#f1f5f9;">${regime}</p>`,
        `</td></tr></table>`
      );
      sections.push(
        `<table role="presentation" style="width:100%;border-collapse:collapse;margin-top:12px;"><tr>`,
        `<td style="padding:16px;border:1px solid rgba(148,163,184,0.15);border-radius:8px;background:#1a1a1a;">`,
        `<p style="font-size:0.75rem;text-transform:uppercase;letter-spacing:0.1em;color:#38bdf8;margin:0 0 6px;">Action Now</p>`,
        `<p style="font-size:1.05rem;font-weight:600;margin:0 0 12px;color:#f1f5f9;">${actionNow}</p>`,
        `<p style="font-size:0.75rem;text-transform:uppercase;letter-spacing:0.1em;color:#f59e0b;margin:0 0 6px;">Pause If</p>`,
        `<p style="font-size:0.9rem;margin:0 0 12px;color:#cbd5e1;">${pauseIf}</p>`,
        `<p style="font-size:0.75rem;text-transform:uppercase;letter-spacing:0.1em;color:#10b981;margin:0 0 6px;">Change Course If</p>`,
        `<p style="font-size:0.9rem;margin:0;color:#cbd5e1;">${changeCourseIf}</p>`,
        `</td></tr></table>`
      );

      /* Expansion emails include additional toolkits and trend context */
      if (isExpansion) {
        sections.push(
          `<table role="presentation" style="width:100%;border-collapse:collapse;margin-top:16px;"><tr>`,
          `<td style="padding:12px 16px;border:1px solid rgba(52,211,153,0.2);border-radius:8px;background:rgba(16,185,129,0.06);">`,
          `<p style="font-size:0.75rem;text-transform:uppercase;letter-spacing:0.1em;color:#34d399;margin:0 0 6px;">Expansion conditions</p>`,
          `<p style="font-size:0.85rem;color:#e2e8f0;margin:0;">Risk appetite is strong. Consider updating your fundraising materials and exploring growth-stage toolkits on the site.</p>`,
          `</td></tr></table>`
        );
      }

      /* Volatile gets a caution note */
      if (regime === "VOLATILE") {
        sections.push(
          `<table role="presentation" style="width:100%;border-collapse:collapse;margin-top:12px;"><tr>`,
          `<td style="padding:12px 16px;border:1px solid rgba(251,191,36,0.2);border-radius:8px;background:rgba(245,158,11,0.06);">`,
          `<p style="font-size:0.75rem;text-transform:uppercase;letter-spacing:0.1em;color:#fbbf24;margin:0 0 6px;">Uncertain conditions</p>`,
          `<p style="font-size:0.85rem;color:#e2e8f0;margin:0;">Conditions can shift quickly. Favor reversible decisions and keep checkpoints active.</p>`,
          `</td></tr></table>`
        );
      }

      const html = [
        `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#0a0a0a;color:#e2e8f0;">`,
        `<h1 style="font-size:1.25rem;font-weight:600;margin:0 0 4px;color:#f1f5f9;">Whether Weekly Brief</h1>`,
        `<p style="color:#94a3b8;font-size:0.85rem;margin:0 0 20px;">${recordDate}</p>`,
        ...sections,
        `<div style="margin-top:24px;">`,
        `<a href="${briefUrl}" style="display:inline-block;padding:12px 24px;border-radius:8px;background:linear-gradient(135deg,rgba(56,189,248,0.9),rgba(14,116,144,0.85));color:white;text-decoration:none;font-weight:600;font-size:0.9rem;">View full brief →</a>`,
        `</div>`,
        `<p style="margin-top:32px;font-size:0.75rem;color:#64748b;">Based on public data. Your situation may vary.</p>`,
        `<hr style="border:none;border-top:1px solid rgba(148,163,184,0.15);margin-top:24px;" />`,
        `<table role="presentation" style="width:100%;border-collapse:collapse;"><tr>`,
        `<td style="font-size:0.7rem;color:#64748b;padding-top:12px;">`,
        `<a href="https://whether.work/trust" style="color:#64748b;text-decoration:underline;">Methodology</a>`,
        ` · `,
        `<a href="https://whether.work/share" style="color:#64748b;text-decoration:underline;">Share</a>`,
        ` · `,
        `<a href="https://whether.work" style="color:#64748b;text-decoration:underline;">whether.work</a>`,
        `</td></tr></table>`,
        `</body></html>`,
      ].join("\n");

      return adapter.send({ to: recipient, subject, html, text });
    }),
  );

  const sent = results.filter((r) => r.status === "fulfilled" && r.value.ok).length;
  const errors = results.filter((r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value.ok)).length;

  /* Also post to Slack if a webhook is configured */
  const slackWebhook = process.env.SLACK_WEBHOOK_URL;
  let slackOk = false;
  if (slackWebhook) {
    try {
      const blocks = [
        { type: "header", text: { type: "plain_text", text: `Whether Weekly Brief — ${recordDate}` } },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Regime:* ${regime}\n*Action Now:* ${actionNow}\n*Pause If:* ${pauseIf}\n*Change Course If:* ${changeCourseIf}`,
          },
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: { type: "plain_text", text: "View Full Brief" },
              url: "https://whether.work",
              action_id: "open_brief",
            },
          ],
        },
      ];
      await fetch(slackWebhook, { method: "POST", body: JSON.stringify({ blocks }) });
      slackOk = true;
    } catch { /* Slack post failure is non-fatal */ }
  }

  return { ok: true, sent, errors, total: subscriptions.length, slackPosted: slackOk };
};
