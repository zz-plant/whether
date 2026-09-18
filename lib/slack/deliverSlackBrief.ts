import { buildSlackBrief } from "../export/briefBuilders";
import { assessPublishReadiness } from "../report/briefPublishGuard";
import { loadReportDataSafe } from "../report/reportData";
import { buildPostureState } from "../report/postureStateSource";
import { siteUrl } from "../siteUrl";

/**
 * Slack delivery for the weekly brief.
 *
 * The previous implementation lived inline in sendWeeklyBrief and posted a
 * two-line message (regime + action) while the full buildSlackBrief text —
 * posture, scores, signal check, bounded decisions, citations — sat unused in
 * lib/export/briefBuilders. It also conflated "no webhook configured" with
 * "post failed". This module posts the real brief and reports which of the
 * three outcomes actually happened.
 */

type SlackDeliveryStatus =
  | "posted"
  | "partial"
  | "skipped_unconfigured"
  | "refused_unpublishable"
  | "failed";

type SlackDeliveryResult = {
  /** True when every configured webhook accepted the post, or none are configured. */
  ok: boolean;
  status: SlackDeliveryStatus;
  attempted: number;
  delivered: number;
  recordDate?: string;
  error?: string;
};

export const isSlackWebhookUrl = (value: string): boolean =>
  value.startsWith("https://hooks.slack.com/");

/* Slack caps a section's mrkdwn text at 3000 characters. */
const SECTION_TEXT_LIMIT = 2900;

export const buildSlackBriefBlocks = (
  briefText: string,
  recordDate: string,
  options: { imageUrl?: string } = {},
) => {
  const body =
    briefText.length > SECTION_TEXT_LIMIT
      ? `${briefText.slice(0, SECTION_TEXT_LIMIT)}\n… (truncated — full brief on the site)`
      : briefText;

  return [
    { type: "header", text: { type: "plain_text", text: `Whether Weekly Brief — ${recordDate}` } },
    /* The weekly call as rendered, when the Monday cron captured one (lib/export/briefScreenshot.ts).
       Slack fetches the URL once and proxies it, so the block costs one read of the stored PNG. */
    ...(options.imageUrl
      ? [{ type: "image", image_url: options.imageUrl, alt_text: `Whether weekly call card for ${recordDate}` }]
      : []),
    { type: "section", text: { type: "mrkdwn", text: body } },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "Open the brief" },
          url: siteUrl,
          action_id: "open_brief",
        },
      ],
    },
  ];
};

/**
 * Same data path as GET /api/brief/slack, so both surfaces say the same thing —
 * and, since 2026-09-17, the same readiness judgement.
 *
 * This function already computed a `degraded` flag and the one caller
 * destructured `{ text, recordDate }` and dropped it, so the Monday post went
 * out identically whether the reading was live or a bundled snapshot. The read
 * endpoint published the flag; the artifact people actually read did not.
 *
 * `degraded` was also the wrong flag to have carried: it is `!reportResult.ok`,
 * which stays false through a total upstream outage, because falling back is a
 * success for this loader. That is the exact reading `briefPublishGuard` exists
 * to correct, so readiness is judged there, on the flags that move.
 */
const buildSlackBriefPayload = async (
  now: Date,
): Promise<{
  text: string;
  recordDate: string;
  readiness: ReturnType<typeof assessPublishReadiness>;
}> => {
  const reportResult = await loadReportDataSafe(undefined, { route: "slack/deliver-brief" });
  const reportData = reportResult.ok ? reportResult.data : reportResult.fallback;
  const { assessment, treasury, sensors, macroSeries } = reportData;
  const postureState = await buildPostureState({
    recordDate: treasury.record_date,
    assessment,
    reportDynamics: reportData.reportDynamics,
  });
  const text = buildSlackBrief(assessment, treasury, sensors, macroSeries, { postureState });
  return {
    text,
    recordDate: treasury.record_date,
    readiness: assessPublishReadiness({
      degraded: !reportResult.ok,
      isFallback: Boolean(treasury.fallback_at || treasury.fallback_reason),
      isLive: treasury.isLive,
      fallbackReason: treasury.fallback_reason,
      recordDate: treasury.record_date ?? treasury.fetched_at,
      now,
    }),
  };
};

import { getSlackWebhookStore } from "./slackWebhookStore";

export const resolveConfiguredSlackWebhooks = (): string[] => {
  const urls = new Set<string>();
  const envUrl = process.env.SLACK_WEBHOOK_URL?.trim();
  if (envUrl && isSlackWebhookUrl(envUrl)) {
    urls.add(envUrl);
  }
  return [...urls];
};

const resolveAllTargetSlackWebhooks = async (): Promise<string[]> => {
  const urls = new Set<string>(resolveConfiguredSlackWebhooks());
  try {
    const store = getSlackWebhookStore();
    const stored = await store.listActiveWebhooks();
    for (const url of stored) {
      if (isSlackWebhookUrl(url)) {
        urls.add(url);
      }
    }
  } catch (error) {
    console.warn("[slack] failed to load stored webhooks", error);
  }
  return [...urls];
};

export const deliverSlackBrief = async (options?: {
  webhookUrls?: string[];
  fetchImpl?: typeof fetch;
  payload?: { text: string; recordDate: string };
  /** Public URL of this week's stored screenshot; omitted, the post is text blocks as before. */
  imageUrl?: string;
  now?: Date;
}): Promise<SlackDeliveryResult> => {
  const urls = options?.webhookUrls ?? (await resolveAllTargetSlackWebhooks());
  if (urls.length === 0) {
    /* Nothing configured is a real state, not a failure — but it must never be
       reported as "posted". */
    return { ok: true, status: "skipped_unconfigured", attempted: 0, delivered: 0 };
  }

  const doFetch = options?.fetchImpl ?? fetch;

  let payload = options?.payload;
  if (!payload) {
    try {
      const built = await buildSlackBriefPayload(options?.now ?? new Date());
      if (!built.readiness.ok) {
        /* Not a failure of this dispatcher, and not a post either. A channel
           that is told nothing this Monday can ask; a channel handed a stale
           reading under this week's heading cannot tell. */
        return {
          ok: false,
          status: "refused_unpublishable",
          attempted: 0,
          delivered: 0,
          recordDate: built.recordDate,
          error: `refused_unpublishable: ${built.readiness.reason}`,
        };
      }
      payload = { text: built.text, recordDate: built.recordDate };
    } catch (error) {
      return {
        ok: false,
        status: "failed",
        attempted: urls.length,
        delivered: 0,
        error: `brief build failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  const { text, recordDate } = payload;
  const blocks = buildSlackBriefBlocks(text, recordDate, { imageUrl: options?.imageUrl });
  const results = await Promise.allSettled(
    urls.map(async (url) => {
      const response = await doFetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        /* The top-level text is the notification-preview fallback. */
        body: JSON.stringify({ blocks, text: `Whether Weekly Brief — ${recordDate}` }),
      });
      if (!response.ok) {
        if (response.status === 404 || response.status === 410) {
          getSlackWebhookStore().deactivateByUrl(url).catch(() => undefined);
        }
        throw new Error(`slack_webhook_${response.status}`);
      }
    }),
  );

  const delivered = results.filter((entry) => entry.status === "fulfilled").length;
  const failed = urls.length - delivered;
  const status: SlackDeliveryStatus = delivered === 0 ? "failed" : failed > 0 ? "partial" : "posted";

  return {
    ok: failed === 0,
    status,
    attempted: urls.length,
    delivered,
    recordDate,
    ...(failed > 0 ? { error: `${failed}/${urls.length} Slack webhooks failed` } : {}),
  };
};
