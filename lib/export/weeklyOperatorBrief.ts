import { resolveWeekEndingIsoDateUTC } from "../formatters";
import { OPERATING_LATITUDE_GLOSS, OPERATING_LATITUDE_LABEL } from "../report/reportCopy";
import { describeConditions, formatExportConfidence, pauseConditionOnly } from "./exportTerms";
import type { RegimeAssessment } from "../regimeEngine";
import type { TreasuryData } from "../types";
import { publicDecisionLabels } from "../report/reportFormatting";
import { weeklyCallChangeLines, type WeeklyCallContract } from "../report/weeklyCallContract";
import { resolvePublishedConfidence } from "../report/confidence";
import { comparisonBasis } from "../report/comparisonBasis";
import type { ComparedWith } from "../report/reportDataTypes";

type WeeklyOperatorBriefPayload = {
  date: string;
  boldnessBudget?: {
    score: number;
    delta: number;
    line: string;
    /** The earlier reading `delta` is measured against; the paste says "vs last week" without one. */
    comparedWith?: ComparedWith;
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
  doNowBullets: string[];
  whyCouldBeWrong: string;
  flipConditionLabels: string[];
  customTeamNote?: string;
};

/*
 * The weekly call is required. This used to take it as optional and, without
 * one, re-derive every slot from the action strip, the posture state and the
 * canonical copy in a fallback chain of its own: a second answer to "what is
 * this week's call" that only tests ever reached, because every production
 * caller passed the contract. The contract is the one answer now.
 */
export const buildWeeklyOperatorBriefPayload = ({
  assessment,
  treasury,
  date,
  weeklyCall,
  weeklyLeadershipSummary,
  customTeamNote,
}: {
  assessment: RegimeAssessment;
  treasury: TreasuryData;
  date?: string;
  weeklyCall: WeeklyCallContract;
  weeklyLeadershipSummary?: {
    boldnessScore: number;
    boldnessDelta: number;
    shorthandLine: string;
    comparedWith?: ComparedWith;
  };
  customTeamNote?: string;
}): WeeklyOperatorBriefPayload => {
  const boldnessBudget = weeklyLeadershipSummary
    ? {
        score: weeklyLeadershipSummary.boldnessScore,
        delta: weeklyLeadershipSummary.boldnessDelta,
        line: weeklyLeadershipSummary.shorthandLine,
        ...(weeklyLeadershipSummary.comparedWith ? { comparedWith: weeklyLeadershipSummary.comparedWith } : {}),
      }
    : undefined;
  /* From the reading, not from a caller. This took an optional label and fell
     back to a sentence with no band in it, and the /share caller passed none. */
  const confidenceLabel = resolvePublishedConfidence({ assessment, record: treasury }).label;

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
    flipConditionLabels: weeklyCall.flipConditionLabels,
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
      ? `${OPERATING_LATITUDE_LABEL}: ${payload.boldnessBudget.score}/100 (${OPERATING_LATITUDE_GLOSS}) · ${comparisonBasis(payload.boldnessBudget.comparedWith).versus}: ${boldnessDeltaLabel}`
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
    `Why this could be wrong: ${payload.whyCouldBeWrong}`,
    ...(payload.flipConditionLabels.length > 0
      ? ["", "Other things that would change this guidance:", ...payload.flipConditionLabels.map((condition) => `• ${condition}`)]
      : []),
  ].filter((line): line is string => line != null).join("\n");
};
