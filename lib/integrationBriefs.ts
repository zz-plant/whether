import type { RegimeAssessment } from "./regimeEngine";
import type { TreasuryData } from "./types";
import type { PostureStateContract } from "./report/postureStateContract";
import { getRegimePublicLabel } from "./regimePresentation";
import { formatSignalReading } from "./report/signalTranslations";
import { DECISION_CONTRACT_LABELS } from "./report/reportCopy";
import { describeConditions } from "./export/exportTerms";

type IntegrationTarget = "slack" | "notion" | "linear";

export const integrationTargets: IntegrationTarget[] = ["slack", "notion", "linear"];

export const parseIntegrationTarget = (value: string | null): IntegrationTarget | null => {
  if (!value) {
    return null;
  }
  return integrationTargets.find((target) => target === value) ?? null;
};

type WeeklyMandateEnvelope = {
  title: string;
  summary: string;
  recordDate: string;
  regime: RegimeAssessment["regime"];
  markdown: string;
  constraints: string[];
  lastChange: PostureStateContract["lastCommittedChangeEvent"];
  nextFlip: PostureStateContract["whatFlipsNext"];
};

const buildFallbackPostureState = (
  assessment: RegimeAssessment,
  treasury: TreasuryData,
): PostureStateContract => ({
  currentState: {
    regime: assessment.regime,
    postureLabel: getRegimePublicLabel(assessment.regime),
    confidenceLabel: "MED",
    confidencePercent: 55,
    transitionWatch: "OFF",
    recordDate: treasury.record_date,
  },
  lastCommittedChangeEvent: {
    timestamp: null,
    fromState: null,
    toState: assessment.regime,
    reason: "No record of the last change in conditions; this is the current reading.",
    source: "state-machine",
  },
  whatFlipsNext: {
    flipTrigger: "Check again after the next update.",
    thresholds: ["Check again after the next update."],
    reversalConditions: [],
  },
});

const resolvePostureState = (
  postureState: PostureStateContract | null | undefined,
  assessment: RegimeAssessment,
  treasury: TreasuryData,
): PostureStateContract => postureState?.currentState
  ? postureState
  : buildFallbackPostureState(assessment, treasury);

export const buildWeeklyMandateEnvelope = (
  assessment: RegimeAssessment,
  treasury: TreasuryData,
  postureState: PostureStateContract | null | undefined,
): WeeklyMandateEnvelope => {
  const resolvedPostureState = resolvePostureState(postureState, assessment, treasury);
  const title = `Whether weekly mandate — ${treasury.record_date}`;
  /* Pasted into a channel, card or database row that has no page beside it, so
     the conditions and both scores carry their meaning in the line. */
  const summary = [
    `Conditions: ${describeConditions(assessment.regime, resolvedPostureState.currentState.postureLabel)}.`,
    `${formatSignalReading("tightness", assessment.scores.tightness)}.`,
    `${formatSignalReading("riskAppetite", assessment.scores.riskAppetite)}.`,
  ].join(" ");
  const constraints = assessment.constraints.slice(0, 3);

  return {
    title,
    summary,
    recordDate: treasury.record_date,
    regime: assessment.regime,
    constraints,
    lastChange: resolvedPostureState.lastCommittedChangeEvent,
    nextFlip: resolvedPostureState.whatFlipsNext,
    markdown: [
      `## ${title}`,
      summary,
      "",
      "### What to hold",
      ...constraints.map((item) => `- ${item}`),
      "",
      `Last change in conditions: ${resolvedPostureState.lastCommittedChangeEvent.timestamp ?? "not recorded"} · ${resolvedPostureState.lastCommittedChangeEvent.reason}`,
      `${DECISION_CONTRACT_LABELS.watch.postureFlips}: ${resolvedPostureState.whatFlipsNext.flipTrigger}`,
      ...resolvedPostureState.whatFlipsNext.reversalConditions.map(
        (condition) => `- ${DECISION_CONTRACT_LABELS.reversal.resumeWhen}: ${condition}`,
      ),
      "",
      `Source: ${treasury.source}`,
    ].join("\n"),
  };
};

export const buildWeeklyMandatePayload = (
  target: IntegrationTarget,
  assessment: RegimeAssessment,
  treasury: TreasuryData,
  postureState: PostureStateContract | null | undefined,
) => {
  const envelope = buildWeeklyMandateEnvelope(assessment, treasury, postureState);

  if (target === "slack") {
    return {
      channel: "#planning",
      text: `${envelope.title}\n${envelope.summary}`,
      blocks: [
        { type: "header", text: { type: "plain_text", text: envelope.title } },
        { type: "section", text: { type: "mrkdwn", text: envelope.summary } },
        {
          type: "section",
          text: { type: "mrkdwn", text: envelope.constraints.map((item) => `• ${item}`).join("\n") },
        },
      ],
      metadata: envelope,
    };
  }

  if (target === "notion") {
    return {
      parent: { type: "database_id", database_id: "weekly-mandates" },
      properties: {
        Name: { title: [{ text: { content: envelope.title } }] },
        Conditions: { select: { name: getRegimePublicLabel(assessment.regime) } },
        Summary: { rich_text: [{ text: { content: envelope.summary } }] },
        RecordDate: { rich_text: [{ text: { content: envelope.recordDate } }] },
      },
      children: envelope.constraints.map((item) => ({
        object: "block",
        type: "bulleted_list_item",
        bulleted_list_item: { rich_text: [{ type: "text", text: { content: item } }] },
      })),
      metadata: envelope,
    };
  }

  return {
    title: envelope.title,
    description: envelope.markdown,
    labels: ["whether", getRegimePublicLabel(assessment.regime).toLowerCase()],
    metadata: envelope,
  };
};
