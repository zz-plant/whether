import { buildSlackBrief } from "../export/briefBuilders";
import { loadReportDataSafe } from "../report/reportData";
import { buildPostureState } from "../report/postureStateSource";

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

type SlackDeliveryStatus = "posted" | "partial" | "skipped_unconfigured" | "failed";

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
          url: "https://whether.work",
          action_id: "open_brief",
        },
      ],
    },
  ];
};

/** Same data path as GET /api/brief/slack, so both surfaces say the same thing. */
const buildSlackBriefPayload = async (): Promise<{
  text: string;
  recordDate: string;
  degraded: boolean;
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
  return { text, recordDate: treasury.record_date, degraded: !reportResult.ok };
};

export const resolveConfiguredSlackWebhooks = (): string[] => {
  const urls = new Set<string>();
  const envUrl = process.env.SLACK_WEBHOOK_URL?.trim();
  if (envUrl && isSlackWebhookUrl(envUrl)) {
    urls.add(envUrl);
  }
  return [...urls];
};

export const deliverSlackBrief = async (options?: {
  webhookUrls?: string[];
  fetchImpl?: typeof fetch;
  payload?: { text: string; recordDate: string };
  /** Public URL of this week's stored screenshot; omitted, the post is text blocks as before. */
  imageUrl?: string;
}): Promise<SlackDeliveryResult> => {
  const urls = options?.webhookUrls ?? resolveConfiguredSlackWebhooks();
  if (urls.length === 0) {
    /* Nothing configured is a real state, not a failure — but it must never be
       reported as "posted". */
    return { ok: true, status: "skipped_unconfigured", attempted: 0, delivered: 0 };
  }

  const doFetch = options?.fetchImpl ?? fetch;

  let payload = options?.payload;
  if (!payload) {
    try {
      payload = await buildSlackBriefPayload();
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
