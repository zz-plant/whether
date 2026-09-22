/**
 * The month-end pulse: one deliverable a month, at the cadence an investor
 * letter actually runs on.
 *
 * The Monday brief is weekly; the investor update block
 * (`lib/export/investorUpdateSnippet.ts`) compares against the prior month-end
 * reading and is what a monthly letter quotes. This module fires that block
 * once per month — when the record date's month advances past the month last
 * pulsed — and only when the reading actually differs from the prior month-end.
 * A quiet month-end sends nothing: a message that arrives whether or not
 * anything moved is a cadence-synced nag, which is the one kind of
 * notification this repo refuses to send.
 *
 * State is one KV key holding the month key of the last pulse, so a re-run
 * within the same month is a no-op and a deploy that doubles the daily cron
 * cannot double the letter.
 */
import type { OperatingSnapshot } from "../operatingState/types";
import type { WeeklyCallContract } from "../report/weeklyCallContract";
import type { MonthlyRegimeHistoryEntry } from "../summary/monthlyRegimeHistory";
import { getMonthlyRegimeHistory } from "../summary/monthlyRegimeHistory";
import {
  buildInvestorUpdateSnippetParts,
  findPriorMonthEnd,
  formatInvestorUpdateSnippet,
} from "../export/investorUpdateSnippet";
import { getWhetherKv } from "../runtime/kv";
import { monthKeyFor } from "../summary/monthlyRegimeHistory";
import { getSubscriberStore } from "../email/subscriberStore";
import { createCloudflareEmailAdapter } from "../email/emailDelivery";
import { unsubscribeFooterText } from "./alertTemplates";
import { getSlackWebhookStore } from "../slack/slackWebhookStore";
import { isSlackWebhookUrl } from "../slack/deliverSlackBrief";
import { siteUrl } from "../siteUrl";
import { getRegimePublicLabel } from "../regimePresentation";

const LAST_PULSED_KEY = "month-end:last-pulsed";

/** A move smaller than this on a score reads as "unchanged" to the investor
 *  update's own `describeMove`; the pulse uses the same cut so the trigger and
 *  the copy cannot disagree about whether a month changed. */
const SCORE_CHANGE_CUT = 0.5;

type MonthEndPulseVerdict = {
  monthKey: string;
  /** True when this month's reading differs from the prior month-end. */
  changed: boolean;
  /** Human line naming what moved, for the subject/header. */
  headline: string;
  /** The investor update block as pasted, when changed. */
  block?: string;
};

const describeMonthChange = (
  assessment: OperatingSnapshot["assessment"],
  prior: MonthlyRegimeHistoryEntry,
): { changed: boolean; headline: string } => {
  const regimeChanged = prior.regime !== assessment.regime;
  const tightness = assessment.scores.tightness;
  const riskAppetite = assessment.scores.riskAppetite;
  const tightnessMoved =
    typeof prior.tightness === "number" && Math.abs(tightness - prior.tightness) >= SCORE_CHANGE_CUT;
  const riskMoved =
    typeof prior.riskAppetite === "number" && Math.abs(riskAppetite - prior.riskAppetite) >= SCORE_CHANGE_CUT;

  if (!regimeChanged && !tightnessMoved && !riskMoved) {
    return {
      changed: false,
      headline: "Month-end reading unchanged from the prior month-end.",
    };
  }

  const parts: string[] = [];
  if (regimeChanged) {
    parts.push(`conditions moved to ${getRegimePublicLabel(assessment.regime)} from ${getRegimePublicLabel(prior.regime)}`);
  }
  if (tightnessMoved) parts.push(`funding pressure moved ${tightness > prior.tightness! ? "up" : "down"} to ${tightness}`);
  if (riskMoved) parts.push(`risk appetite moved ${riskAppetite > prior.riskAppetite! ? "up" : "down"} to ${riskAppetite}`);

  /* "Call moved" only when the conditions did; a score moving inside the same conditions is a change, not a new call. */
  const lead = regimeChanged ? "The call moved since last month-end" : "Changed since last month-end";
  return { changed: true, headline: `${lead}: ${parts.join("; ")}.` };
};

/** The month-end evaluation, pure and testable. */
export const evaluateMonthEndPulse = ({
  assessment,
  recordDate,
  monthlyHistory,
}: {
  assessment: OperatingSnapshot["assessment"];
  recordDate: string;
  monthlyHistory: readonly MonthlyRegimeHistoryEntry[];
}): MonthEndPulseVerdict => {
  const monthKey = monthKeyFor(recordDate);
  const prior = findPriorMonthEnd(monthlyHistory, recordDate);
  if (!prior) {
    return { monthKey, changed: false, headline: "No prior month-end reading to compare against." };
  }
  const { changed, headline } = describeMonthChange(assessment, prior);
  return { monthKey, changed, headline };
};

/** The block plus its stamp, assembled from the same builder /share reads. */
const buildBlock = (
  snapshot: OperatingSnapshot,
  weeklyCall: WeeklyCallContract,
): string => {
  const parts = buildInvestorUpdateSnippetParts({
    assessment: snapshot.assessment,
    recordDate: snapshot.recordDate,
    weeklyCall,
    monthlyHistory: getMonthlyRegimeHistory(),
    sourceLabel: snapshot.provenance.sourceLabel,
    isFallback: snapshot.freshness.status === "fallback",
  });
  return formatInvestorUpdateSnippet(parts, null);
};

type MonthEndPulseResult = {
  ok: boolean;
  error?: string;
  monthKey?: string;
  changed?: boolean;
  sentEmail?: number;
  postedSlack?: number;
  headline?: string;
};

const resolveSnapshot = async (
  options?: { snapshot?: OperatingSnapshot; weeklyCall?: WeeklyCallContract },
): Promise<{ snapshot: OperatingSnapshot; weeklyCall: WeeklyCallContract } | null> => {
  if (options?.snapshot && options?.weeklyCall) {
    return { snapshot: options.snapshot, weeklyCall: options.weeklyCall };
  }
  const { getOperatingSnapshotStore } = await import("../operatingState/snapshotStore");
  const stored = await getOperatingSnapshotStore().readLatest();
  if (stored) return { snapshot: stored, weeklyCall: stored.weeklyCall };
  return null;
};

/** Post one month-end block to every Slack target, never throwing. */
const postSlackPulse = async (headline: string, block: string): Promise<number> => {
  const urls = new Set<string>();
  const envUrl = process.env.SLACK_WEBHOOK_URL?.trim();
  if (envUrl && isSlackWebhookUrl(envUrl)) urls.add(envUrl);
  try {
    const store = getSlackWebhookStore();
    for (const url of await store.listActiveWebhooks()) {
      if (isSlackWebhookUrl(url)) urls.add(url);
    }
  } catch {
    /* non-fatal */
  }
  if (urls.size === 0) return 0;

  const results = await Promise.allSettled(
    [...urls].map((webhook) =>
      fetch(webhook, {
        method: "POST",
        body: JSON.stringify({
          blocks: [
            { type: "header", text: { type: "plain_text", text: `📬 ${headline}` } },
            { type: "section", text: { type: "mrkdwn", text: block } },
            {
              type: "actions",
              elements: [
                { type: "button", text: { type: "plain_text", text: "View brief" }, url: siteUrl, action_id: "open_brief" },
              ],
            },
          ],
        }),
      }),
    ),
  );
  return results.filter((result) => result.status === "fulfilled" && result.value.ok).length;
};

/** Send the month-end block to every alert subscriber, never throwing. */
const sendEmailPulse = async (headline: string, block: string): Promise<number> => {
  const adapter = createCloudflareEmailAdapter();
  try {
    const subscribers = await getSubscriberStore().listAlertSubscribers();
    if (subscribers.length === 0) return 0;
    const results = await Promise.allSettled(
      subscribers.map((subscriber) =>
        adapter.send({
          to: subscriber,
          subject: `Whether — ${headline}`,
          text: [block, "", ...unsubscribeFooterText(subscriber.token)].join("\n"),
          html: [
            `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#e2e8f0;background:#0a0a0a;">`,
            `<h1 style="color:#f1f5f9;font-size:1.15rem;">${headline}</h1>`,
            `<div style="white-space:pre-wrap;color:#cbd5e1;font-size:0.9rem;line-height:1.6;">${block.replace(/</g, "&lt;").replace(/\n/g, "<br/>")}</div>`,
            `<p style="margin-top:24px;"><a href="${siteUrl}" style="color:#38bdf8;">View the brief →</a></p>`,
            `<p style="margin-top:24px;font-size:0.75rem;color:#64748b;">Based on public data. Your situation may vary.</p>`,
            `</div>`,
          ].join(""),
        }),
      ),
    );
    return results.filter((result) => result.status === "fulfilled" && result.value.ok).length;
  } catch {
    return 0;
  }
};

/**
 * Cron entry point: fire the month-end pulse when the month advances and the
 * reading differs from the prior month-end. Shared by the daily cron (direct
 * call from worker/index.ts) and the authenticated POST /api/month-end-pulse.
 */
export const runMonthEndPulse = async (options?: {
  snapshot?: OperatingSnapshot;
  weeklyCall?: WeeklyCallContract;
}): Promise<MonthEndPulseResult> => {
  const resolved = await resolveSnapshot(options);
  if (!resolved) {
    return { ok: false, error: "No operating snapshot is available; nothing to compare." };
  }
  const { snapshot, weeklyCall } = resolved;
  const verdict = evaluateMonthEndPulse({
    assessment: snapshot.assessment,
    recordDate: snapshot.recordDate,
    monthlyHistory: getMonthlyRegimeHistory(),
  });

  const kv = getWhetherKv();
  if (!kv) {
    return { ok: false, error: "KV not available; month-end state cannot be recorded." };
  }

  let lastPulsed: string | null = null;
  try {
    lastPulsed = await kv.get(LAST_PULSED_KEY);
  } catch {
    /* non-fatal: absence reads as never pulsed */
  }

  if (lastPulsed === verdict.monthKey) {
    return { ok: true, monthKey: verdict.monthKey, changed: verdict.changed, headline: verdict.headline };
  }

  if (!verdict.changed) {
    /* Quiet month: record the pulse so a daily cron does not re-evaluate until
       the next month, but send nothing. */
    await kv.put(LAST_PULSED_KEY, verdict.monthKey).catch(() => undefined);
    return { ok: true, monthKey: verdict.monthKey, changed: false, headline: verdict.headline };
  }

  const block = buildBlock(snapshot, weeklyCall);
  const sentEmail = await sendEmailPulse(verdict.headline, block);
  const postedSlack = await postSlackPulse(verdict.headline, block);
  await kv.put(LAST_PULSED_KEY, verdict.monthKey).catch(() => undefined);

  return {
    ok: true,
    monthKey: verdict.monthKey,
    changed: true,
    headline: verdict.headline,
    sentEmail,
    postedSlack,
  };
};