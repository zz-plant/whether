/**
 * Alert email templates — dark-themed HTML emails matching the send-weekly style.
 * Each template returns { subject, html, text } for use with the email adapter.
 */

import { DECISION_CONTRACT_LABELS } from "../report/reportCopy";

export type EmailContent = {
  subject: string;
  html: string;
  text: string;
};

const baseHtml = (title: string, body: string): string =>
  [
    `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#0a0a0a;color:#e2e8f0;">`,
    `<h1 style="font-size:1.25rem;font-weight:600;margin:0 0 4px;color:#f1f5f9;">${title}</h1>`,
    body,
    `<div style="margin-top:24px;">`,
    `<a href="https://whether.work" style="display:inline-block;padding:12px 24px;border-radius:8px;background:linear-gradient(135deg,rgba(56,189,248,0.9),rgba(14,116,144,0.85));color:white;text-decoration:none;font-weight:600;font-size:0.9rem;">View full brief →</a>`,
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

const sectionBlock = (label: string, value: string, labelColor = "#94a3b8", valueColor = "#f1f5f9"): string =>
  [
    `<table role="presentation" style="width:100%;border-collapse:collapse;">`,
    `<tr>`,
    `<td style="padding:16px;border:1px solid rgba(148,163,184,0.15);border-radius:8px;background:#1a1a1a;">`,
    `<p style="font-size:0.75rem;text-transform:uppercase;letter-spacing:0.1em;color:${labelColor};margin:0 0 6px;">${label}</p>`,
    `<p style="font-size:1.1rem;font-weight:600;margin:0;color:${valueColor};">${value}</p>`,
    `</td></tr></table>`,
  ].join("\n");

const alertBanner = (severity: "warning" | "critical" | "info", message: string): string => {
  const colors: Record<string, { bg: string; border: string; text: string; accent: string }> = {
    critical: { bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.25)", text: "#fca5a5", accent: "#ef4444" },
    warning: { bg: "rgba(251,191,36,0.08)", border: "rgba(251,191,36,0.25)", text: "#fde68a", accent: "#fbbf24" },
    info: { bg: "rgba(56,189,248,0.08)", border: "rgba(56,189,248,0.25)", text: "#bae6fd", accent: "#38bdf8" },
  };
  const c = colors[severity] ?? colors.info;
  return [
    `<table role="presentation" style="width:100%;border-collapse:collapse;margin-top:12px;">`,
    `<tr>`,
    `<td style="padding:12px 16px;border:1px solid ${c.border};border-radius:8px;background:${c.bg};">`,
    `<p style="font-size:0.85rem;color:${c.text};margin:0;">${message}</p>`,
    `</td></tr></table>`,
  ].join("\n");
};

/**
 * Decision-verdict alert — the analysis's good surface names the decision an
 * alert affects ("RECONSIDER Q4 HIRING") rather than the raw signal move.
 */
export const decisionVerdictEmail = ({
  headline,
  why,
  actionNow,
  reversal,
}: {
  headline: string;
  why: string;
  actionNow: string;
  reversal: string;
}): EmailContent => {
  const subject = `Whether Alert — ${headline}`;
  const text = [
    `Whether Decision Alert`,
    headline,
    why,
    `${DECISION_CONTRACT_LABELS.slot.action}: ${actionNow}`,
    `${DECISION_CONTRACT_LABELS.reversal.reversal}: ${reversal}`,
    ``,
    `View full brief: https://whether.work`,
    `---`,
    `Whether · weekly operating brief`,
  ].join("\n");
  const html = baseHtml(
    "Whether Decision Alert",
    [
      alertBanner("critical", `<strong>${headline}</strong> — conditions have moved outside the range recorded when this decision was made.`),
      `<div style="margin-top:12px;">`,
      sectionBlock("Why", why),
      `</div>`,
      `<div style="margin-top:12px;">`,
      sectionBlock(DECISION_CONTRACT_LABELS.action.actionNow, actionNow),
      `</div>`,
      `<div style="margin-top:12px;">`,
      sectionBlock(DECISION_CONTRACT_LABELS.reversal.reversal, reversal, "#94a3b8", "#f1f5f9"),
      `</div>`,
    ].join("\n"),
  );
  return { subject, html, text };
};

/**
 * Threshold crossing alert — sent when a key metric crosses a defined boundary.
 */
export const thresholdCrossingEmail = (
  metric: "credit" | "sentiment",
  value: number,
  threshold: number,
): EmailContent => {
  const metricLabel = metric === "credit" ? "Funding pressure" : "Risk appetite";
  const direction = value > threshold ? "above" : "below";
  const subject = `Whether Alert — ${metricLabel} crossed ${threshold} threshold`;
  const text = [
    `Whether Threshold Alert`,
    `${metricLabel} score: ${value.toFixed(1)} (threshold: ${threshold})`,
    `Direction: crossed ${direction} the ${threshold} boundary.`,
    ``,
    `View full brief: https://whether.work`,
    `---`,
    `Whether · weekly operating brief`,
  ].join("\n");
  const severity = threshold === 75 ? "warning" : "info";
  const html = baseHtml(
    "Whether Threshold Alert",
    [
      alertBanner(
        severity,
        `<strong>${metricLabel}</strong> crossed the <strong>${threshold}</strong> threshold at <strong>${value.toFixed(1)}</strong>. Review your operating posture.`,
      ),
      `<div style="margin-top:12px;">`,
      sectionBlock(metricLabel, `${value.toFixed(1)} / ${threshold}`, "#fbbf24", "#fde68a"),
      `</div>`,
    ].join("\n"),
  );
  return { subject, html, text };
};

/**
 * Weekly brief ready notification — signals that the weekly brief has been generated.
 */
export const weeklyBriefReadyEmail = (
  regime: string,
): EmailContent => {
  const subject = `Whether — Weekly Brief Ready`;
  const text = [
    `Whether Weekly Brief`,
    `Current regime: ${regime}`,
    ``,
    `View full brief: https://whether.work`,
    `---`,
    `Whether · weekly operating brief`,
  ].join("\n");
  const html = baseHtml(
    "Whether Weekly Brief",
    [
      `<p style="color:#94a3b8;font-size:0.85rem;margin:0 0 20px;">Your weekly operating brief is ready.</p>`,
      sectionBlock("Current Regime", regime),
    ].join("\n"),
  );
  return { subject, html, text };
};
