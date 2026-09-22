import { resolveWeekEndingIsoDateUTC } from "../formatters";
import { getRegimePublicLabel } from "../regimePresentation";
import { OPERATING_LATITUDE_LABEL, DECISION_CONTRACT_LABELS } from "../report/reportCopy";
import { NO_LIVE_READING_CALL } from "../report/reportCopy";
import type { RegimeAssessment } from "../regimeEngine";
import type { TreasuryData } from "../types";
import type { ActionStripItem } from "../report/operatingCalls";
import type { PostureStateContract } from "../report/postureStateContract";
import { buildFlipConditionsWithoutTriggerDuplication, type CanonicalDecisionCopy } from "../report/canonicalDecisionCopy";
import { publicDecisionLabels } from "../report/reportFormatting";
import type { WeeklyCallContract } from "../report/weeklyCallContract";
import { buildFlipProximity } from "../report/flipProximity";

/** The confidence line when no label was modeled: what the number measures rather than a grade. */
const CONFIDENCE_FROM_DISTANCE = "Confidence from how far the scores sit from the line that changes the call";

type WeeklyOperatorBriefPayload = {
  date: string;
  boldnessBudget?: {
    score: number;
    delta: number;
    line: string;
  };
  regimeStage: string;
  confidence: string;
  currentCall: string;
  actionNow: string;
  pauseIf: string;
  changeCourseIf: string;
  /**
   * The nearest flip distance in the market's units — "0.15% flatter on the
   * 10Y−2Y curve would change the call to X" — not in score points. The hero
   * prints it as its flip watch; this export carries the same sentence so an
   * artifact pasted into Slack states what has to happen in the market, which
   * the score-point flip conditions below do not.
   */
  flipWatchLine?: string;
  doNowBullets: string[];
  whyCouldBeWrong: string;
  flipTrigger: string;
  flipConditionLabels: string[];
  customTeamNote?: string;
};

type WeeklyCallSnapshotPayload = {
  regime: string;
  call: string;
  trend: string;
  confidence: string;
  doNow: string;
  avoid: string;
  watch: string;
  flipConditions: string[];
};

type WeeklyBoardSnippetPayload = {
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
  weeklyCall,
  weeklyLeadershipSummary,
  customTeamNote,
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
  weeklyCall?: WeeklyCallContract;
  weeklyLeadershipSummary?: {
    boldnessScore: number;
    boldnessDelta: number;
    shorthandLine: string;
  };
  customTeamNote?: string;
}): WeeklyOperatorBriefPayload => {
  const boldnessBudget = weeklyLeadershipSummary
    ? {
        score: weeklyLeadershipSummary.boldnessScore,
        delta: weeklyLeadershipSummary.boldnessDelta,
        line: weeklyLeadershipSummary.shorthandLine,
      }
    : undefined;

  if (weeklyCall) {
    return {
      date: date ?? resolveWeekEndingIsoDateUTC(treasury.record_date),
      boldnessBudget,
      regimeStage: weeklyCall.regimeStage,
      confidence: confidenceLabel ? `${confidenceLabel} confidence` : CONFIDENCE_FROM_DISTANCE,
      currentCall: weeklyCall.currentCall,
      actionNow: weeklyCall.actionNow,
      pauseIf: weeklyCall.pauseIf,
      changeCourseIf: weeklyCall.changeCourseIf,
      doNowBullets: weeklyCall.doNowBullets,
      whyCouldBeWrong: weeklyCall.whyCouldBeWrong,
      flipTrigger: weeklyCall.changeCourseIf,
      flipConditionLabels: weeklyCall.flipConditionLabels,
      customTeamNote,
    };
  }

  const doNowBullets = actionStripItems.length > 0
    ? actionStripItems.slice(0, 3).map((item) => item.areaActionNow)
    : assessment.constraints.slice(0, 3);

  const normalizedFlipConditionLabels = flipConditionLabels
    .map((label) => label.trim())
    .filter((label) => label.length > 0)
    .filter((label, index, labels) => labels.indexOf(label) === index)
    .slice(0, 4);

  const canonicalDoNowLines = canonicalDecisionCopy?.doNowLines ?? [];
  const canonicalFlipConditions = canonicalDecisionCopy?.flipConditions ?? [];
  const postureConfidenceLabel = postureState?.currentState?.confidenceLabel ?? confidenceLabel;
  const postureFlipTrigger = postureState?.whatFlipsNext?.flipTrigger;
  const postureFlipConditions = [...(postureState?.whatFlipsNext?.thresholds ?? [])];
  const resolvedFlipTrigger =
    canonicalDecisionCopy?.flipTrigger
    ?? postureFlipTrigger
    ?? normalizedFlipConditionLabels[0]
    ?? "The call changes when live data crosses the pause line.";

  const resolvedFlipConditionLabels = canonicalFlipConditions.length > 0
    ? buildFlipConditionsWithoutTriggerDuplication({
      flipTrigger: resolvedFlipTrigger,
      flipConditions: canonicalFlipConditions,
    })
    : normalizedFlipConditionLabels.length > 0
    ? normalizedFlipConditionLabels
    : buildFlipConditionsWithoutTriggerDuplication({
      flipTrigger: postureFlipTrigger ?? "",
      flipConditions: postureFlipConditions,
    });
  const currentCall =
    canonicalDecisionCopy?.operatingCall
    ?? actionStripItems[0]?.areaActionNow
    ?? assessment.constraints[0]
    ?? NO_LIVE_READING_CALL.currentCall;
  const actionNow =
    canonicalDoNowLines[0]
    ?? doNowBullets[0]
    ?? currentCall;
  const pauseIf =
    actionStripItems[0]?.triggerThreshold
    ?? assessment.constraints[1]
    ?? NO_LIVE_READING_CALL.pauseIf;

  return {
    date: date ?? resolveWeekEndingIsoDateUTC(treasury.record_date),
    boldnessBudget,
    regimeStage: canonicalDecisionCopy?.currentRegimeLabel ?? postureWithStageLabel ?? getRegimePublicLabel(assessment.regime),
    confidence: confidenceLabel ? `${confidenceLabel} confidence` : CONFIDENCE_FROM_DISTANCE,
    currentCall,
    actionNow,
    pauseIf,
    flipWatchLine: buildFlipProximity(assessment)[0]?.sentence,
    changeCourseIf: resolvedFlipTrigger,
    doNowBullets: canonicalDoNowLines.length > 0 ? canonicalDoNowLines : doNowBullets,
    whyCouldBeWrong:
      postureConfidenceLabel === "HIGH"
        ? "The sources agree this week and can stop agreeing before next Monday. Hold anything you can't undo until then."
        : "Confidence is not high: a score sits near a line, and a small move changes the call.",
    flipTrigger: resolvedFlipTrigger,
    flipConditionLabels: resolvedFlipConditionLabels,
    customTeamNote,
  };
};

export const buildWeeklyOperatorBriefPlainText = (payload: WeeklyOperatorBriefPayload) => {
  const supportingActionLines = payload.doNowBullets
    .filter((bullet) => bullet.trim().length > 0)
    .filter((bullet) => bullet !== payload.actionNow);

  const boldnessDeltaLabel = payload.boldnessBudget
    ? payload.boldnessBudget.delta === 0
      ? "no change vs last week"
      : `${payload.boldnessBudget.delta > 0 ? "+" : ""}${payload.boldnessBudget.delta.toFixed(0)} vs last week`
    : null;

  return [
    `Weekly Operator Brief — ${payload.date}`,
    payload.boldnessBudget ? `${OPERATING_LATITUDE_LABEL}: ${payload.boldnessBudget.score}/100 (${boldnessDeltaLabel})` : null,
    payload.boldnessBudget?.line ?? null,
    `Conditions: ${payload.regimeStage}`,
    `Confidence: ${payload.confidence}`,
    payload.customTeamNote ? `\nTeam context: ${payload.customTeamNote}` : null,
    "",
    `${publicDecisionLabels.call}: ${payload.currentCall}`,
    `${publicDecisionLabels.action}: ${payload.actionNow}`,
    `${publicDecisionLabels.threshold}: ${payload.pauseIf}`,
    `${publicDecisionLabels.reversal}: ${payload.changeCourseIf}`,
    ...(payload.flipWatchLine ? [`${DECISION_CONTRACT_LABELS.watch.flipWatch}: ${payload.flipWatchLine}`] : []),
    ...(supportingActionLines.length > 0
      ? ["", "Also this week:", ...supportingActionLines.map((bullet) => `• ${bullet}`)]
      : []),
    "",
    `Why this could be wrong: ${payload.whyCouldBeWrong}`,
    ...(payload.flipConditionLabels.length > 0
      ? ["", "Other things that would change the call:", ...payload.flipConditionLabels.map((condition) => `• ${condition}`)]
      : []),
  ].filter((line): line is string => line != null).join("\n");
};

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
            ...(payload.boldnessBudget ? [{ type: "mrkdwn" as const, text: `*${OPERATING_LATITUDE_LABEL}*\n${payload.boldnessBudget.score}/100` }] : []),
            { type: "mrkdwn", text: `*Conditions*\n${payload.regimeStage}` },
            { type: "mrkdwn", text: `*Confidence*\n${payload.confidence}` },
          ],
        },
        ...(payload.customTeamNote
          ? [
              {
                type: "section",
                text: {
                  type: "mrkdwn" as const,
                  text: `*Team Context*\n${payload.customTeamNote}`,
                },
              },
            ]
          : []),
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*${publicDecisionLabels.call}*\n${payload.currentCall}`,
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*${publicDecisionLabels.action}*\n${payload.actionNow}`,
          },
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `*${publicDecisionLabels.threshold}:* ${payload.pauseIf}\n*${publicDecisionLabels.reversal}:* ${payload.changeCourseIf}${payload.flipWatchLine ? `\n*${DECISION_CONTRACT_LABELS.watch.flipWatch}:* ${payload.flipWatchLine}` : ""}`,
            },
          ],
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: payload.flipConditionLabels.length > 0
                ? `*Why this could be wrong:* ${payload.whyCouldBeWrong}\n*Other things that would change the call:*\n${payload.flipConditionLabels.map((condition) => `• ${condition}`).join("\n")}`
                : `*Why this could be wrong:* ${payload.whyCouldBeWrong}`,
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
  `CONDITIONS: ${payload.regime}`,
  `CALL: ${payload.call}`,
  `${publicDecisionLabels.action.toUpperCase()}: ${payload.doNow}`,
  `AVOID: ${payload.avoid}`,
  `WATCH: ${payload.watch}`,
  `${DECISION_CONTRACT_LABELS.watch.flipWatch.toUpperCase()}:`,
  ...(payload.flipConditions.length > 0
    ? payload.flipConditions.map((condition) => `• ${condition}`)
    : ["• No live line this week; check again after the next refresh."]),
].join("\n");

export const buildWeeklyBoardSnippetPlainText = (payload: WeeklyBoardSnippetPayload) => [
  payload.trustLine,
  payload.postureLine,
  payload.changedLine,
  payload.guardrailLine,
  payload.flipLine,
  payload.stabilityLine,
].join("\n");
