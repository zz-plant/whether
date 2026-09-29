import { resolveWeekEndingIsoDateUTC } from "../formatters";
import { OPERATING_LATITUDE_GLOSS, OPERATING_LATITUDE_LABEL, DECISION_CONTRACT_LABELS } from "../report/reportCopy";
import { describeConditions, formatExportConfidence, pauseConditionOnly } from "./exportTerms";
import { getRegimePublicLabel } from "../regimePresentation";
import { NO_LIVE_READING_CALL } from "../report/reportCopy";
import type { RegimeAssessment } from "../regimeEngine";
import type { TreasuryData } from "../types";
import type { ActionStripItem } from "../report/operatingCalls";
import type { PostureStateContract } from "../report/postureStateContract";
import { buildFlipConditionsWithoutTriggerDuplication, type CanonicalDecisionCopy } from "../report/canonicalDecisionCopy";
import { publicDecisionLabels } from "../report/reportFormatting";
import { weeklyCallChangeLines, type WeeklyCallContract } from "../report/weeklyCallContract";
import { buildFlipProximity } from "../report/flipProximity";
import { resolvePublishedConfidence } from "../report/confidence";

type WeeklyOperatorBriefPayload = {
  date: string;
  boldnessBudget?: {
    score: number;
    delta: number;
    line: string;
  };
  regimeStage: string;
  /** `regimeStage` with what the weather means for money, as the paste prints it. */
  conditions: string;
  confidence: string;
  currentCall: string;
  actionNow: string;
  pauseIf: string;
  /** Where the call itself changes. */
  callChangesIf: string;
  /** A stage's discipline for lifting its hold; absent without a stage. */
  resumeWhen?: string;
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
  /** A stage's discipline for lifting its hold; printed beside `watch`, never as it. */
  resume?: string;
  flipConditions: string[];
};

/* One line per slot, in the order the note prints them. The resume line is
   optional because only a week with a per-area rule carries one. */
type WeeklyBoardSnippetPayload = {
  dataLine: string;
  latitudeLine: string;
  conditionsLine: string;
  changedLine: string;
  pauseLine: string;
  resumeLine?: string;
  callChangeLine: string;
  stabilityLine: string;
};

export const buildWeeklyOperatorBriefPayload = ({
  assessment,
  treasury,
  date,
  postureWithStageLabel,
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
  /* From the reading, not from a caller. This took an optional label and fell
     back to a sentence with no band in it, and the /share caller passed none. */
  const confidenceLabel = resolvePublishedConfidence({ assessment, record: treasury }).label;

  if (weeklyCall) {
    return {
      date: date ?? resolveWeekEndingIsoDateUTC(treasury.record_date),
      boldnessBudget,
      regimeStage: weeklyCall.regimeStage,
      conditions: describeConditions(assessment.regime, weeklyCall.regimeStage),
      confidence: formatExportConfidence(confidenceLabel),
      currentCall: weeklyCall.currentCall,
      actionNow: weeklyCall.actionNow,
      pauseIf: weeklyCall.pauseIf,
      callChangesIf: weeklyCall.callChangesIf,
      ...(weeklyCall.resumeWhen ? { resumeWhen: weeklyCall.resumeWhen } : {}),
      doNowBullets: weeklyCall.doNowBullets,
      whyCouldBeWrong: weeklyCall.whyCouldBeWrong,
      flipTrigger: weeklyCall.callChangesIf,
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
  const postureFlipTrigger = postureState?.whatFlipsNext?.flipTrigger;
  const postureFlipConditions = [...(postureState?.whatFlipsNext?.thresholds ?? [])];
  const resolvedFlipTrigger =
    canonicalDecisionCopy?.flipTrigger
    ?? postureFlipTrigger
    ?? normalizedFlipConditionLabels[0]
    ?? NO_LIVE_READING_CALL.callChangesIf;

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
    conditions: describeConditions(assessment.regime, canonicalDecisionCopy?.currentRegimeLabel ?? postureWithStageLabel),
    confidence: formatExportConfidence(confidenceLabel),
    currentCall,
    actionNow,
    pauseIf,
    flipWatchLine: buildFlipProximity(assessment)[0]?.sentence,
    callChangesIf: resolvedFlipTrigger,
    doNowBullets: canonicalDoNowLines.length > 0 ? canonicalDoNowLines : doNowBullets,
    whyCouldBeWrong:
      confidenceLabel === "HIGH"
        ? "The sources agree this week and can stop agreeing before next Monday. Hold anything you can't undo until then."
        : "Confidence is not high: a score sits near a line, and a small move could change conditions.",
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
      ? "no change"
      : `${payload.boldnessBudget.delta > 0 ? "+" : ""}${payload.boldnessBudget.delta.toFixed(0)} ${Math.abs(payload.boldnessBudget.delta) === 1 ? "point" : "points"}`
    : null;

  return [
    `Weekly Operator Brief — ${payload.date}`,
    /* The number never travels without what it measures: a paste is read by
       people who have not seen the hero that explains it. */
    payload.boldnessBudget
      ? `${OPERATING_LATITUDE_LABEL}: ${payload.boldnessBudget.score}/100 (${OPERATING_LATITUDE_GLOSS}) · vs last week: ${boldnessDeltaLabel}`
      : null,
    payload.boldnessBudget?.line ?? null,
    `Conditions: ${payload.conditions}`,
    payload.confidence,
    payload.customTeamNote ? `\nTeam context: ${payload.customTeamNote}` : null,
    "",
    `${publicDecisionLabels.call}: ${payload.currentCall}`,
    `${publicDecisionLabels.action}: ${payload.actionNow}`,
    `${publicDecisionLabels.threshold}: ${pauseConditionOnly(payload.pauseIf)}`,
    ...weeklyCallChangeLines(payload).map(({ label, value }) => `${label}: ${value}`),
    ...(supportingActionLines.length > 0
      ? ["", "Also this week:", ...supportingActionLines.map((bullet) => `• ${bullet}`)]
      : []),
    /* What would change the call sits with the other conditions that would,
       after the actions, in the page's order. */
    "",
    ...(payload.flipWatchLine ? [`${DECISION_CONTRACT_LABELS.watch.flipWatch}: ${payload.flipWatchLine}`] : []),
    `Why this could be wrong: ${payload.whyCouldBeWrong}`,
    ...(payload.flipConditionLabels.length > 0
      ? ["", "Other things that would change this guidance:", ...payload.flipConditionLabels.map((condition) => `• ${condition}`)]
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
            ...(payload.boldnessBudget
              ? [{ type: "mrkdwn" as const, text: `*${OPERATING_LATITUDE_LABEL}*\n${payload.boldnessBudget.score}/100: ${OPERATING_LATITUDE_GLOSS}` }]
              : []),
            { type: "mrkdwn", text: `*Conditions*\n${payload.conditions}` },
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
              text: [
                `*${publicDecisionLabels.threshold}:* ${pauseConditionOnly(payload.pauseIf)}`,
                ...weeklyCallChangeLines(payload).map(({ label, value }) => `*${label}:* ${value}`),
              ].join("\n"),
            },
          ],
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: [
                ...(payload.flipWatchLine ? [`*${DECISION_CONTRACT_LABELS.watch.flipWatch}:* ${payload.flipWatchLine}`] : []),
                `*Why this could be wrong:* ${payload.whyCouldBeWrong}`,
                ...(payload.flipConditionLabels.length > 0
                  ? [`*Other things that would change this guidance:*\n${payload.flipConditionLabels.map((condition) => `• ${condition}`).join("\n")}`]
                  : []),
              ].join("\n"),
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
  "Weekly guidance snapshot",
  `CONDITIONS: ${payload.regime}`,
  `GUIDANCE: ${payload.call}`,
  `${publicDecisionLabels.action.toUpperCase()}: ${payload.doNow}`,
  `${DECISION_CONTRACT_LABELS.threshold.pauseIf.toUpperCase()}: ${pauseConditionOnly(payload.avoid)}`,
  `${DECISION_CONTRACT_LABELS.watch.postureFlips.toUpperCase()}: ${payload.watch}`,
  ...(payload.resume ? [`${DECISION_CONTRACT_LABELS.reversal.resumeWhen.toUpperCase()}: ${payload.resume}`] : []),
  "OTHER THINGS THAT WOULD CHANGE THIS GUIDANCE:",
  ...(payload.flipConditions.length > 0
    ? payload.flipConditions.map((condition) => `• ${condition}`)
    : ["• No live line this week; check again after the next refresh."]),
].join("\n");

export const buildWeeklyBoardSnippetPlainText = (payload: WeeklyBoardSnippetPayload) => [
  payload.dataLine,
  payload.latitudeLine,
  payload.conditionsLine,
  payload.changedLine,
  payload.pauseLine,
  payload.resumeLine,
  payload.callChangeLine,
  payload.stabilityLine,
].filter((line): line is string => line != null).join("\n");
