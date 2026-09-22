/**
 * Alert email templates — dark-themed HTML emails matching the send-weekly style.
 * Each template returns { subject, html, text } for use with the email adapter.
 */

import { DECISION_CONTRACT_LABELS } from "../report/reportCopy";
import { formatPointsMove, type FlashMove } from "./flashMoves";

/** What a flash asks of the reader, in the mail's text and HTML alike. */
const FLASH_GUIDANCE =
  "A move this size between two readings is unusual. This week's call stands until the next reading shows where the scores settle; until then, hold anything you can't undo.";

type EmailContent = {
  subject: string;
  html: string;
  text: string;
};

const UNSUBSCRIBE_BASE_URL = "https://whether.work/api/email/unsubscribe";

/**
 * The one-click unsubscribe URL for a subscriber token, or null without one.
 *
 * `/api/email/unsubscribe` has always worked and nothing has ever linked to it: no
 * template in this repo carried the link, on either mail stream. That was tolerable
 * while alert mail reached nobody; it is not, now that an opt-in actually enrolls
 * someone. A missing token yields no link rather than a broken one.
 */
const buildUnsubscribeUrl = (token: string | null | undefined): string | null =>
  token ? `${UNSUBSCRIBE_BASE_URL}?token=${encodeURIComponent(token)}` : null;

export const unsubscribeFooterHtml = (token: string | null | undefined): string => {
  const url = buildUnsubscribeUrl(token);
  return url
    ? ` · <a href="${url}" style="color:#64748b;text-decoration:underline;">Unsubscribe</a>`
    : "";
};

export const unsubscribeFooterText = (token: string | null | undefined): string[] => {
  const url = buildUnsubscribeUrl(token);
  return url ? [`Unsubscribe: ${url}`] : [];
};

const baseHtml = (title: string, body: string, unsubscribeToken?: string | null): string =>
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
    unsubscribeFooterHtml(unsubscribeToken),
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
  unsubscribeToken,
}: {
  headline: string;
  why: string;
  actionNow: string;
  reversal: string;
  unsubscribeToken?: string | null;
}): EmailContent => {
  const subject = `Whether Alert — ${headline}`;
  const text = [
    `Whether Decision Alert`,
    headline,
    why,
    `${DECISION_CONTRACT_LABELS.action.actionNow}: ${actionNow}`,
    `${DECISION_CONTRACT_LABELS.watch.postureFlips}: ${reversal}`,
    ``,
    `View full brief: https://whether.work`,
    `---`,
    `Whether · weekly operating brief`,
    ...unsubscribeFooterText(unsubscribeToken),
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
      sectionBlock(DECISION_CONTRACT_LABELS.watch.postureFlips, reversal, "#94a3b8", "#f1f5f9"),
      `</div>`,
    ].join("\n"),
    unsubscribeToken,
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
  unsubscribeToken?: string | null,
): EmailContent => {
  const metricLabel = metric === "credit" ? "Funding pressure" : "Risk appetite";
  const direction = value > threshold ? "above" : "below";
  /* 75 on funding pressure is the line the rules pause at; the rest are the
     50 and 75 marks on a 0-100 score, and are named as marks, not as rules. */
  const lineName = metric === "credit" && threshold === 75 ? "the pause line" : `the ${threshold} line`;
  const reading = `${metricLabel} is ${value.toFixed(1)}; ${lineName} is ${threshold}.`;
  const whatToDo = `It crossed ${direction} that line since the last reading. Read this week's call before acting on last week's plan.`;
  const subject = `Whether Alert — ${metricLabel} crossed ${threshold}`;
  const text = [
    `Whether Threshold Alert`,
    reading,
    whatToDo,
    ``,
    `View full brief: https://whether.work`,
    `---`,
    `Whether · weekly operating brief`,
    ...unsubscribeFooterText(unsubscribeToken),
  ].join("\n");
  const severity = threshold === 75 ? "warning" : "info";
  const html = baseHtml(
    "Whether Threshold Alert",
    [
      alertBanner(
        severity,
        `<strong>${metricLabel}</strong> is <strong>${value.toFixed(1)}</strong>; ${lineName} is <strong>${threshold}</strong>. ${whatToDo}`,
      ),
      `<div style="margin-top:12px;">`,
      sectionBlock(metricLabel, `${value.toFixed(1)} / ${threshold}`, "#fbbf24", "#fde68a"),
      `</div>`,
    ].join("\n"),
    unsubscribeToken,
  );
  return { subject, html, text };
};

/**
 * Flash alert — an emergency-sized move in a raw input between two reads,
 * pushed the day it lands. Names the input and the size in the input's own
 * units; the scores may not have crossed anything yet, and the mail says so.
 */
export const flashMoveEmail = (
  move: FlashMove,
  unsubscribeToken?: string | null,
): EmailContent => {
  const size = formatPointsMove(move.delta);
  const direction = move.delta < 0 ? "fell" : "rose";
  /* The subject line keeps the short name; the body's headline carries the gloss. */
  const shortLabel = move.label.replace(/\s*\(.*\)$/, "").toLowerCase();
  const subject = `Whether Flash — ${shortLabel} ${direction} ${size} since the last reading`;
  const text = [
    `Whether Flash Alert`,
    move.headline,
    FLASH_GUIDANCE,
    ``,
    `View full brief: https://whether.work`,
    `---`,
    `Whether · weekly operating brief`,
    ...unsubscribeFooterText(unsubscribeToken),
  ].join("\n");
  const html = baseHtml(
    "Whether Flash Alert",
    [
      alertBanner("critical", `<strong>${move.headline}</strong>`),
      `<div style="margin-top:12px;">`,
      sectionBlock(move.label, `${move.from.toFixed(2)}% → ${move.to.toFixed(2)}% (${direction === "rose" ? "up" : "down"} ${size})`, "#fbbf24", "#fde68a"),
      `</div>`,
      `<div style="margin-top:12px;">`,
      sectionBlock(
        "What to do",
        FLASH_GUIDANCE,
      ),
      `</div>`,
    ].join("\n"),
    unsubscribeToken,
  );
  return { subject, html, text };
};
