import { resolveWeekEndingIsoDateUTC } from "../formatters";
import { formatRegimeLabel } from "../regimeFormat";
import type { RegimeAssessment } from "../regimeEngine";
import type { TreasuryData } from "../types";
import type { ActionStripItem } from "../report/operatingCalls";
import type { PostureStateContract } from "../report/postureStateContract";
import { buildFlipConditionsWithoutTriggerDuplication, type CanonicalDecisionCopy } from "../report/canonicalDecisionCopy";

export type WeeklyOperatorBriefPayload = {
  date: string;
  regimeStage: string;
  confidence: string;
  doNowBullets: string[];
  whyCouldBeWrong: string;
  flipTrigger: string;
  flipConditionLabels: string[];
};

export type WeeklyCallSnapshotPayload = {
  regime: string;
  call: string;
  trend: string;
  confidence: string;
  doNow: string;
  avoid: string;
  watch: string;
  flipConditions: string[];
};

export type WeeklyBoardSnippetPayload = {
  trustLine: string;
  postureLine: string;
  changedLine: string;
  guardrailLine: string;
  flipLine: string;
  stabilityLine: string;
};

export const buildWeeklyOperatorBriefPayload = ({
  assessment,
  treasury,
  date,
  postureWithStageLabel,
  confidenceLabel,
  actionStripItems = [],
  flipConditionLabels = [],
  postureState,
  canonicalDecisionCopy,
}: {
  assessment: RegimeAssessment;
  treasury: TreasuryData;
  date?: string;
  postureWithStageLabel?: string;
  confidenceLabel?: "HIGH" | "MED" | "LOW";
  actionStripItems?: ActionStripItem[];
  flipConditionLabels?: string[];
  postureState?: PostureStateContract;
  canonicalDecisionCopy?: CanonicalDecisionCopy;
}): WeeklyOperatorBriefPayload => {

  const doNowBullets = actionStripItems.length > 0
    ? actionStripItems.slice(0, 3).map((item) => item.actionNow)
    : assessment.constraints.slice(0, 3);

  const normalizedFlipConditionLabels = flipConditionLabels
    .map((label) => label.trim())
    .filter((label) => label.length > 0)
    .filter((label, index, labels) => labels.indexOf(label) === index)
    .slice(0, 4);

  return {
    date: date ?? resolveWeekEndingIsoDateUTC(treasury.record_date),
    regimeStage: canonicalDecisionCopy?.currentRegimeLabel ?? postureWithStageLabel ?? formatRegimeLabel(assessment.regime),
    confidence: confidenceLabel ? `${confidenceLabel} confidence` : "Score-based posture confidence",
    doNowBullets: canonicalDecisionCopy?.doNowLines.length ? canonicalDecisionCopy.doNowLines : doNowBullets,
    whyCouldBeWrong:
      postureState?.currentState.confidenceLabel === "HIGH"
        ? "Cross-signal confirmation could still fade; keep irreversible approvals gated until next weekly checkpoint."
        : "Confidence is not high; near-threshold moves can reverse quickly and invalidate this week’s call.",
    flipTrigger:
      canonicalDecisionCopy?.flipTrigger
      ?? postureState?.whatFlipsNext.flipTrigger
      ?? normalizedFlipConditionLabels[0]
      ?? "Flip when live indicators cross the weekly guardrail threshold.",
    flipConditionLabels: canonicalDecisionCopy?.flipConditions.length
      ? buildFlipConditionsWithoutTriggerDuplication({
        flipTrigger:
          canonicalDecisionCopy.flipTrigger
          ?? postureState?.whatFlipsNext.flipTrigger
          ?? "",
        flipConditions: canonicalDecisionCopy.flipConditions,
      })
      : normalizedFlipConditionLabels.length > 0
      ? normalizedFlipConditionLabels
      : buildFlipConditionsWithoutTriggerDuplication({
        flipTrigger: postureState?.whatFlipsNext.flipTrigger ?? "",
        flipConditions: [...(postureState?.whatFlipsNext.thresholds ?? [])],
      }),
  };
};

export const buildWeeklyOperatorBriefPlainText = (payload: WeeklyOperatorBriefPayload) => [
  `Weekly Operator Brief — ${payload.date}`,
  `Regime + stage: ${payload.regimeStage}`,
  `Confidence: ${payload.confidence}`,
  "",
  "Do now:",
  ...payload.doNowBullets.map((bullet) => `• ${bullet}`),
  "",
  `Why this could be wrong: ${payload.whyCouldBeWrong}`,
  `What would change our mind: ${payload.flipTrigger}`,
  "",
  `Change course if: ${payload.flipTrigger}`,
  ...(payload.flipConditionLabels.length > 0
    ? ["", "Supporting change-course signals:", ...payload.flipConditionLabels.map((condition) => `• ${condition}`)]
    : []),
].join("\n");

export const buildWeeklyOperatorBriefSlackBlocks = (payload: WeeklyOperatorBriefPayload) =>
  JSON.stringify(
    {
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: `Weekly Operator Brief — ${payload.date}`,
          },
        },
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: `*Regime + stage*\n${payload.regimeStage}` },
            { type: "mrkdwn", text: `*Confidence*\n${payload.confidence}` },
          ],
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Do now*\n${payload.doNowBullets.map((bullet) => `• ${bullet}`).join("\n")}`,
          },
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `*Why this could be wrong:* ${payload.whyCouldBeWrong}\n*What would change our mind:* ${payload.flipTrigger}`,
            },
          ],
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: payload.flipConditionLabels.length > 0
                ? `*Change course if:* ${payload.flipTrigger}\n${payload.flipConditionLabels.map((condition) => `• ${condition}`).join("\n")}`
                : `*Change course if:* ${payload.flipTrigger}`,
            },
          ],
        },
      ],
    },
    null,
    2,
  );

export const buildWeeklyOperatorBriefCardText = (payload: WeeklyOperatorBriefPayload) =>
  buildWeeklyOperatorBriefPlainText(payload);

export const buildWeeklyCallSnapshotPlainText = (payload: WeeklyCallSnapshotPayload) => [
  "Weekly call snapshot",
  `REGIME: ${payload.regime}`,
  `CALL: ${payload.call}`,
  `DO NOW: ${payload.doNow}`,
  `AVOID: ${payload.avoid}`,
  `WATCH: ${payload.watch}`,
  "FLIP CONDITIONS:",
  ...(payload.flipConditions.length > 0
    ? payload.flipConditions.map((condition) => `• ${condition}`)
    : ["• Recheck thresholds on next refresh."]),
].join("\n");

export const buildWeeklyBoardSnippetPlainText = (payload: WeeklyBoardSnippetPayload) => [
  payload.trustLine,
  payload.postureLine,
  payload.changedLine,
  payload.guardrailLine,
  payload.flipLine,
  payload.stabilityLine,
].join("\n");
