import { formatRegimeLabel } from "../regimeFormat";
import type { RegimeAssessment } from "../regimeEngine";
import type { TreasuryData } from "../types";
import type { ActionStripItem } from "../report/operatingCalls";
import { buildWeeklyLockCommitment } from "../report/decisionKnobs";

export type WeeklyOperatorBriefPayload = {
  date: string;
  regimeStage: string;
  confidence: string;
  doNowBullets: string[];
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

export const buildWeeklyOperatorBriefPayload = ({
  assessment,
  treasury,
  postureWithStageLabel,
  confidenceLabel,
  actionStripItems = [],
  flipConditionLabels = [],
}: {
  assessment: RegimeAssessment;
  treasury: TreasuryData;
  postureWithStageLabel?: string;
  confidenceLabel?: "HIGH" | "MED" | "LOW";
  actionStripItems?: ActionStripItem[];
  flipConditionLabels?: string[];
}): WeeklyOperatorBriefPayload => {
  const lockCommitment = buildWeeklyLockCommitment({
    regime: assessment.regime,
    tightnessRegime: assessment.thresholds.tightnessRegime,
    riskAppetiteRegime: assessment.thresholds.riskAppetiteRegime,
    confidenceDegraded: confidenceLabel !== "HIGH",
    freshnessDegraded: false,
  });

  const doNowBullets = actionStripItems.length > 0
    ? actionStripItems.slice(0, 3).map((item) => item.actionNow)
    : assessment.constraints.slice(0, 3);

  const normalizedFlipConditionLabels = flipConditionLabels
    .map((label) => label.trim())
    .filter((label) => label.length > 0)
    .filter((label, index, labels) => labels.indexOf(label) === index)
    .slice(0, 4);

  return {
    date: treasury.record_date,
    regimeStage: postureWithStageLabel ?? formatRegimeLabel(assessment.regime),
    confidence: confidenceLabel ? `${confidenceLabel} confidence` : "Score-based posture confidence",
    doNowBullets,
    flipTrigger:
      normalizedFlipConditionLabels[0]
      ?? lockCommitment.flipConditions[0]
      ?? "Flip when live indicators cross the weekly guardrail threshold.",
    flipConditionLabels: normalizedFlipConditionLabels,
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
  `Flip trigger: ${payload.flipTrigger}`,
  ...(payload.flipConditionLabels.length > 1
    ? ["", "Flip conditions:", ...payload.flipConditionLabels.map((condition) => `• ${condition}`)]
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
              text: payload.flipConditionLabels.length > 0
                ? `*Flip trigger:* ${payload.flipTrigger}\n${payload.flipConditionLabels.map((condition) => `• ${condition}`).join("\n")}`
                : `*Flip trigger:* ${payload.flipTrigger}`,
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
