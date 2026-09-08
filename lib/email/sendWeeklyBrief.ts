import { createCloudflareEmailAdapter, getActiveSubscriptions } from "./emailDelivery";
import { unsubscribeFooterHtml, unsubscribeFooterText } from "../alert/alertTemplates";
import type { OperatingSnapshot } from "../operatingState/types";
import type { WeeklyCallContract } from "../report/weeklyCallContract";
import { getOperatingSnapshotStore } from "../operatingState/snapshotStore";
import { DECISION_CONTRACT_LABELS } from "../report/reportCopy";
import { getRegimePublicLabel } from "../regimePresentation";

const formatDelta = (delta: number | undefined) =>
  typeof delta === "number" && Number.isFinite(delta) && delta !== 0
    ? `${delta > 0 ? "+" : ""}${delta.toFixed(1)}`
    : null;

/**
 * The numbers the call was scored on, as one row.
 *
 * This is the highest-fanout artifact the product sends and it used to carry
 * no number at all — four sentences and a link. The scores, their weekly
 * deltas and the confidence label are what a reader forwards.
 */
export const buildWeeklyEmailReadings = (snapshot: OperatingSnapshot | undefined) => {
  if (!snapshot) return [];
  const { scores, diagnostics } = snapshot.assessment;
  const confidence = diagnostics.confidence === "MEDIUM" ? "MED" : diagnostics.confidence;
  return [
    { label: "Funding pressure", value: `${scores.tightness}/100`, delta: formatDelta(diagnostics.tightnessDelta), worseWhenUp: true },
    { label: "Risk appetite", value: `${scores.riskAppetite}/100`, delta: formatDelta(diagnostics.riskAppetiteDelta), worseWhenUp: false },
    { label: "Confidence", value: confidence, delta: null, worseWhenUp: false },
  ];
};

const readingsText = (readings: ReturnType<typeof buildWeeklyEmailReadings>) =>
  readings.map((reading) => `${reading.label}: ${reading.value}${reading.delta ? ` (${reading.delta} vs last week)` : ""}`);

const readingsHtml = (readings: ReturnType<typeof buildWeeklyEmailReadings>) =>
  readings.length === 0
    ? ""
    : [
        `<table role="presentation" style="width:100%;border-collapse:collapse;margin-top:12px;"><tr>`,
        ...readings.map((reading) => {
          const up = reading.delta?.startsWith("+");
          const deltaColor = reading.delta ? (up === reading.worseWhenUp ? "#f59e0b" : "#10b981") : "#64748b";
          return [
            `<td style="padding:12px 16px;border:1px solid rgba(148,163,184,0.15);border-radius:8px;background:#1a1a1a;vertical-align:top;">`,
            `<p style="font-size:0.7rem;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;margin:0 0 4px;">${reading.label}</p>`,
            `<p style="font-size:1.25rem;font-weight:600;margin:0;color:#f1f5f9;font-variant-numeric:tabular-nums;">${reading.value}</p>`,
            reading.delta ? `<p style="font-size:0.8rem;margin:4px 0 0;color:${deltaColor};">${reading.delta} vs last week</p>` : "",
            `</td>`,
          ].join("");
        }),
        `</tr></table>`,
      ].join("");

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
  const regimeLabel = getRegimePublicLabel(regime);
  const readings = buildWeeklyEmailReadings(snapshot);
  const actionNow = weeklyCall?.actionNow ?? weeklyCall?.currentCall ?? "Hold bounded operating discipline.";
  const pauseIf = weeklyCall?.pauseIf ?? "Pause irreversible commitments if funding tightness rises.";
  const changeCourseIf = weeklyCall?.changeCourseIf ?? "Resume staged approvals when conditions stabilize.";
  const recordDate = snapshot?.provenance.recordDateLabel ?? "this week";
  const adapter = createCloudflareEmailAdapter();

  const results = await Promise.allSettled(
    subscriptions.map((recipient) => {
      const subject = regime === "SCARCITY" || regime === "DEFENSIVE"
        ? `Whether — ${regimeLabel}: ${actionNow}`
        : `Whether Brief — ${regimeLabel}`;
      const briefUrl = "https://whether.work";
      const isContraction = regime === "SCARCITY" || regime === "DEFENSIVE";

      const text = [
        `Whether Weekly Brief — ${recordDate}`,
        `Conditions: ${regimeLabel}`,
        ...readingsText(readings),
        `${DECISION_CONTRACT_LABELS.action.actionNow}: ${actionNow}`,
        `${DECISION_CONTRACT_LABELS.threshold.pauseIf}: ${pauseIf}`,
        `${DECISION_CONTRACT_LABELS.reversal.changeCourseIf}: ${changeCourseIf}`,
        ...(isContraction ? [] : [`\nView the full brief, toolkits, and trends:`]),
        briefUrl,
        `---`,
        `Whether · weekly operating brief`,
        ...unsubscribeFooterText(recipient.token),
      ].join("\n");

      /* Regime-adaptive email */
      const sections = [];
      sections.push(
        `<table role="presentation" style="width:100%;border-collapse:collapse;"><tr>`,
        `<td style="padding:16px;border:1px solid rgba(148,163,184,0.15);border-radius:8px;background:#1a1a1a;">`,
        `<p style="font-size:0.75rem;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;margin:0 0 6px;">Conditions</p>`,
        `<p style="font-size:1.1rem;font-weight:600;margin:0;color:#f1f5f9;">${regimeLabel}</p>`,
        `</td></tr></table>`,
        readingsHtml(readings),
      );
      sections.push(
        `<table role="presentation" style="width:100%;border-collapse:collapse;margin-top:12px;"><tr>`,
        `<td style="padding:16px;border:1px solid rgba(148,163,184,0.15);border-radius:8px;background:#1a1a1a;">`,
        `<p style="font-size:0.75rem;text-transform:uppercase;letter-spacing:0.1em;color:#38bdf8;margin:0 0 6px;">${DECISION_CONTRACT_LABELS.action.actionNow}</p>`,
        `<p style="font-size:1.05rem;font-weight:600;margin:0 0 12px;color:#f1f5f9;">${actionNow}</p>`,
        `<p style="font-size:0.75rem;text-transform:uppercase;letter-spacing:0.1em;color:#f59e0b;margin:0 0 6px;">${DECISION_CONTRACT_LABELS.threshold.pauseIf}</p>`,
        `<p style="font-size:0.9rem;margin:0 0 12px;color:#cbd5e1;">${pauseIf}</p>`,
        `<p style="font-size:0.75rem;text-transform:uppercase;letter-spacing:0.1em;color:#10b981;margin:0 0 6px;">${DECISION_CONTRACT_LABELS.reversal.changeCourseIf}</p>`,
        `<p style="font-size:0.9rem;margin:0;color:#cbd5e1;">${changeCourseIf}</p>`,
        `</td></tr></table>`
      );

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
        unsubscribeFooterHtml(recipient.token),
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
            text: [
              `*Conditions:* ${regimeLabel}`,
              ...readingsText(readings).map((line) => `*${line.replace(": ", ":* ")}`),
              `*Action Now:* ${actionNow}`,
              `*Pause If:* ${pauseIf}`,
              `*Change Course If:* ${changeCourseIf}`,
            ].join("\n"),
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
