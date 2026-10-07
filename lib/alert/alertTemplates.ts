/**
 * Alert email templates, in the one shell every Whether email uses
 * (`lib/email/emailShell.ts`). Each template returns { subject, html, text }
 * for use with the email adapter. Links resolve through `lib/siteUrl`, like the
 * weekly brief's: these wrote the production origin until the shell stopped
 * being a copy.
 */

import { DECISION_CONTRACT_LABELS } from "../report/reportCopy";
import type { FlashMove } from "./flashMoves";
import type { PublishedLine } from "./alertEvaluator";
import { regimeSignalLabel } from "../report/signalTranslations";
import { emailTextFooter, renderEmailShell } from "../email/emailShell";
import { siteUrl } from "../siteUrl";
import { formatPointsMove, formatScoreValue } from "../formatters";

/** What a flash asks of the reader, in the mail's text and HTML alike. */
const FLASH_GUIDANCE =
  "A move this size between two readings is unusual. This week's guidance stands until the next reading shows where the scores settle; until then, hold anything you can't undo.";

type EmailContent = {
  subject: string;
  html: string;
  text: string;
};

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
    `View full brief: ${siteUrl}`,
    ...emailTextFooter(unsubscribeToken),
  ].join("\n");
  const html = renderEmailShell({
    title: "Whether Decision Alert",
    body: [
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
  });
  return { subject, html, text };
};

const LINE_NAME: Record<PublishedLine["kind"], string> = {
  pause: "the pause line",
  change: "the line where conditions change",
  resume: "the resume line",
};

/**
 * What crossing a line asks of the reader, by the line's kind and the side the
 * score is now on. A pause or resume line matters on the side where it holds;
 * crossing back out of it is said too, because a reader acting on last week's
 * pause needs to know it no longer applies.
 */
const describeLineCrossing = (line: PublishedLine, value: number): string => {
  const side = value > line.value ? "above" : "below";
  if (line.kind === "change") {
    return "Conditions change if it is still there at the next reading. Read this week's guidance before acting on last week's plan.";
  }
  const nowHolds = side === line.holdsWhen;
  if (line.kind === "pause") {
    return nowHolds
      ? "Every area whose rule pauses on this line pauses now. Read this week's guidance before acting on last week's plan."
      : "The pause on this line no longer holds. Held work resumes only once each area's resume line is met.";
  }
  return nowHolds
    ? "Work held on this line can resume once every resume line for its area is met."
    : "This resume line is no longer met. Read this week's guidance before resuming held work.";
};

/**
 * Threshold crossing alert — a score crossed one of the published lines: the
 * pause and resume lines every area's rule shares, or the line where
 * conditions change.
 */
export const thresholdCrossingEmail = (
  line: PublishedLine,
  value: number,
  unsubscribeToken?: string | null,
): EmailContent => {
  const metricLabel = regimeSignalLabel[line.metric];
  const lineName = LINE_NAME[line.kind];
  /* Whole points, the way every page and the brief print a score. This read
     "Funding pressure is 90.0; the pause line is 76." and "90.0 / 76": a
     decimal the scores are never published with, beside a line printed without one. */
  const score = formatScoreValue(value);
  const reading = `${metricLabel} is ${score}; ${lineName} is ${line.value}.`;
  const whatToDo = `It crossed ${value > line.value ? "above" : "below"} that line since the last alert. ${describeLineCrossing(line, value)}`;
  const subject = `Whether Alert — ${metricLabel} crossed ${lineName} (${line.value})`;
  const text = [
    `Whether Threshold Alert`,
    reading,
    whatToDo,
    ``,
    `View full brief: ${siteUrl}`,
    ...emailTextFooter(unsubscribeToken),
  ].join("\n");
  const severity = line.kind === "resume" ? "info" : "warning";
  const html = renderEmailShell({
    title: "Whether Threshold Alert",
    body: [
      alertBanner(
        severity,
        `<strong>${metricLabel}</strong> is <strong>${score}</strong>; ${lineName} is <strong>${line.value}</strong>. ${whatToDo}`,
      ),
      `<div style="margin-top:12px;">`,
      sectionBlock(metricLabel, `${score} / ${line.value}`, "#fbbf24", "#fde68a"),
      `</div>`,
    ].join("\n"),
    unsubscribeToken,
  });
  return { subject, html, text };
};

/**
 * Plan-line alert — one of the lines a reader set for their own plan on
 * /operate started to hold. Their area, their line and today's scores; nothing
 * about the published lines, which have their own letter.
 */
export const planLineEmail = (
  { headline, body }: { headline: string; body: string },
  unsubscribeToken?: string | null,
): EmailContent => {
  const subject = `Whether Alert — ${headline}`;
  const text = [
    `Whether Plan Alert`,
    headline,
    body,
    ``,
    `Your lines: ${siteUrl}/operate#ops-plan-lines`,
    ...emailTextFooter(unsubscribeToken),
  ].join("\n");
  const html = renderEmailShell({
    title: "Whether Plan Alert",
    body: [
      alertBanner("warning", `<strong>${headline}</strong>`),
      `<div style="margin-top:12px;">`,
      sectionBlock("What you set, and where the scores are", body),
      `</div>`,
    ].join("\n"),
    unsubscribeToken,
  });
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
    `View full brief: ${siteUrl}`,
    ...emailTextFooter(unsubscribeToken),
  ].join("\n");
  const html = renderEmailShell({
    title: "Whether Flash Alert",
    body: [
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
  });
  return { subject, html, text };
};
