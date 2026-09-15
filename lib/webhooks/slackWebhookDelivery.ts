/**
 * Slack Webhook Delivery Dispatcher for Whether.
 * Dispatches weekly operating briefs and immediate assumption-break alerts to team channels.
 */
import type { WeeklyOperatorBriefPayload } from "../export/weeklyOperatorBrief";
import { buildWeeklyOperatorBriefSlackBlocks } from "../export/weeklyOperatorBrief";
import type { DecisionAssumptionVerdict, DecisionMemoryEntry } from "../decisionMemory";
import { DECISION_CONTRACT_LABELS } from "../report/reportCopy";

interface SlackWebhookDeliveryOptions {
  webhookUrl: string;
  channelName?: string;
  fetchFn?: typeof fetch;
}

export interface SlackDeliveryResult {
  ok: boolean;
  statusCode: number;
  error?: string;
}

export async function dispatchWeeklyBriefSlackWebhook(
  payload: WeeklyOperatorBriefPayload,
  options: SlackWebhookDeliveryOptions
): Promise<SlackDeliveryResult> {
  const blocks = buildWeeklyOperatorBriefSlackBlocks(payload);
  const fetcher = options.fetchFn ?? fetch;

  try {
    const response = await fetcher(options.webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        text: `Whether Weekly Brief (${payload.date}): ${payload.currentCall}`,
        blocks: JSON.parse(blocks).blocks,
      }),
    });

    if (!response.ok) {
      return {
        ok: false,
        statusCode: response.status,
        error: `Slack webhook responded with HTTP ${response.status}`,
      };
    }

    return { ok: true, statusCode: response.status };
  } catch (err) {
    return {
      ok: false,
      statusCode: 500,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

interface AssumptionAlertPayload {
  decision: DecisionMemoryEntry;
  verdict: DecisionAssumptionVerdict;
  reason: string;
  currentRecordDate: string;
}

export async function dispatchAssumptionAlertSlackWebhook(
  alert: AssumptionAlertPayload,
  options: SlackWebhookDeliveryOptions
): Promise<SlackDeliveryResult> {
  const fetcher = options.fetchFn ?? fetch;
  const isBroken = alert.verdict === "RECONSIDER";
  const icon = isBroken ? "🚨" : "⚠️";

  const decisionLabel = alert.decision.outcome.summary || "Recorded Decision";
  const recordDate = alert.decision.context.recordDate;
  const guardrail = alert.decision.outcome.guardrail || "No explicit guardrail recorded.";

  const blocks = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `${icon} Whether Decision Alert: Assumption Status [${alert.verdict}]`,
        emoji: true,
      },
    },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*Decision:* ${decisionLabel}`,
        },
        {
          type: "mrkdwn",
          text: `*Approved On:* ${recordDate}`,
        },
        {
          type: "mrkdwn",
          text: `*Status:* \`${alert.verdict}\``,
        },
        {
          type: "mrkdwn",
          text: `*Current Record Date:* ${alert.currentRecordDate}`,
        },
      ],
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Audit Reason:* ${alert.reason}\n*${DECISION_CONTRACT_LABELS.threshold.guardrail}:* ${guardrail}`,
      },
    },
  ];

  try {
    const response = await fetcher(options.webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        text: `${icon} Whether Decision Alert: ${decisionLabel} flipped to [${alert.verdict}]`,
        blocks,
      }),
    });

    if (!response.ok) {
      return {
        ok: false,
        statusCode: response.status,
        error: `Slack webhook responded with HTTP ${response.status}`,
      };
    }

    return { ok: true, statusCode: response.status };
  } catch (err) {
    return {
      ok: false,
      statusCode: 500,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
