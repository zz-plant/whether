/**
 * The Slack channel: who gets a post, how one is sent, and what happens to a
 * webhook Slack has revoked.
 *
 * Three senders resolved their targets and posted on their own — the weekly
 * brief (`lib/slack/deliverSlackBrief.ts`), the between-Monday alerts
 * (`lib/alert/checkRegimeChange.ts`) and the month-end pulse
 * (`lib/alert/monthEndPulse.ts`). They agreed on the targets (the env webhook
 * plus every active stored one) and disagreed on the rest: the alerts and the
 * pulse posted with no timeout, so one Slack edge that accepted the connection
 * and never answered held the cron step to its deadline; and the pulse never
 * retired a 404/410 webhook, so a channel that deleted its webhook stayed a
 * target of every month-end. One poster, bounded, for all three.
 */
import { isSlackWebhookUrl } from "../slack/deliverSlackBrief";
import { getSlackWebhookStore } from "../slack/slackWebhookStore";
import { siteUrl } from "../siteUrl";
import { withDeadline } from "../withDeadline";
import { fanOut, type DeliveryOutcome, type SentMarkers } from "./fanOut";

/**
 * How long one webhook post may take. Slack answers in well under a second; a
 * post still open after this is an edge that will not answer, and every Slack
 * send runs inside a cron step whose whole budget is 60s.
 */
const SLACK_POST_TIMEOUT_MS = 10_000;

/** What Slack answers for a webhook that has been revoked or deleted. */
const GONE_STATUSES = new Set([404, 410]);

type SlackMessage = { blocks: unknown[]; text?: string };

type SlackPostOptions = {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

/** Every webhook a post goes to: the operator's own, plus every channel that subscribed through the form. */
const listTargets = async (): Promise<string[]> => {
  const urls = new Set<string>();
  const envUrl = process.env.SLACK_WEBHOOK_URL?.trim();
  if (envUrl && isSlackWebhookUrl(envUrl)) urls.add(envUrl);
  try {
    for (const url of await getSlackWebhookStore().listActiveWebhooks()) {
      if (isSlackWebhookUrl(url)) urls.add(url);
    }
  } catch (error) {
    console.warn("[slack] failed to load stored webhooks", error);
  }
  return [...urls];
};

/** One post to one webhook, bounded. Never throws. */
const post = async (url: string, message: SlackMessage, options: SlackPostOptions = {}): Promise<DeliveryOutcome> => {
  const doFetch = options.fetchImpl ?? globalThis.fetch;
  const timeoutMs = options.timeoutMs ?? SLACK_POST_TIMEOUT_MS;
  try {
    const response = await withDeadline(
      doFetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(message),
        signal: AbortSignal.timeout(timeoutMs),
      }),
      timeoutMs,
      "slack-post",
    );
    if (response.ok) return "sent";
    return GONE_STATUSES.has(response.status) ? "gone" : "failed";
  } catch {
    return "failed";
  }
};

/** Stops counting a revoked webhook as a target. Awaited by the fan-out, never thrown. */
const retire = async (url: string): Promise<void> => {
  await getSlackWebhookStore().deactivateByUrl(url).catch(() => undefined);
};

/** One message to every target, retiring the ones Slack says are gone. */
const deliver = (
  targets: readonly string[],
  message: SlackMessage,
  options: SlackPostOptions & { once?: SentMarkers } = {},
) =>
  fanOut(targets, (url) => post(url, message, options), {
    retire,
    once: options.once ? { markers: options.once, keyOf: (url) => url } : undefined,
  });

export const slackChannel = { listTargets, post, retire, deliver };

/** The block shape every alert and pulse uses: a header, the body, and a button to the brief. */
export const slackAlertBlocks = (header: string, body: string) => [
  { type: "header", text: { type: "plain_text", text: header } },
  { type: "section", text: { type: "mrkdwn", text: body } },
  {
    type: "actions",
    elements: [{ type: "button", text: { type: "plain_text", text: "View brief" }, url: siteUrl, action_id: "open_brief" }],
  },
];
