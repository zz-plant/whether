import type { RegimeAssessment } from "./regimeEngine";
import type { PostureStateContract } from "./report/postureStateContract";
import type { BriefDocument } from "./report/briefArtifact";
import { getRegimePublicLabel } from "./regimePresentation";
import { formatSignalReading } from "./report/signalTranslations";
import { DECISION_CONTRACT_LABELS } from "./report/reportCopy";
import { briefResumeLine } from "./export/briefBuilders";

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

/**
 * The mandate a Slack channel, a Notion database or a Linear issue receives,
 * from the week's brief document.
 *
 * The conditions, the readings, the limits and the lines are the document's,
 * so a card states the same change line as the brief. It used to print the
 * posture state's lock-commitment line as "Conditions change if" — a different
 * line from the brief's — and its other flip conditions, one of which ended
 * "tighten again", under "Resume when". The posture state still supplies what
 * the document does not carry: when conditions last changed and why, and the
 * structured flip data the JSON keeps (`nextFlip`). A missing posture state
 * used to be filled with "Check again after the next update."; the route
 * always builds one, so it is required.
 */
export const buildWeeklyMandateEnvelope = (
  document: BriefDocument,
  postureState: PostureStateContract,
): WeeklyMandateEnvelope => {
  const recordDate = document.provenance.recordDate;
  const title = `Whether weekly mandate — ${recordDate}`;
  const { scores } = document.readings;
  /* Pasted into a channel, card or database row that has no page beside it, so
     the conditions and both scores carry their meaning in the line. */
  const summary = [
    `Conditions: ${document.conditions.line}.`,
    `${formatSignalReading("tightness", scores.tightness)}.`,
    `${formatSignalReading("riskAppetite", scores.riskAppetite)}.`,
  ].join(" ");
  const constraints = document.constraints.slice(0, 3);
  const resumeLine = briefResumeLine(document);
  const { flipConditionLabels } = document.slots;

  return {
    title,
    summary,
    recordDate,
    regime: document.conditions.regime,
    constraints,
    lastChange: postureState.lastCommittedChangeEvent,
    nextFlip: postureState.whatFlipsNext,
    markdown: [
      `## ${title}`,
      summary,
      "",
      "### What to hold",
      ...constraints.map((item) => `- ${item}`),
      "",
      /* Only when there is one to date: with none on record this printed
         "not recorded · No committed transition event in store.", the event
         store's own name for an empty table. */
      ...(postureState.lastCommittedChangeEvent.timestamp
        ? [`Last change in conditions: ${postureState.lastCommittedChangeEvent.timestamp.slice(0, 10)} · ${postureState.lastCommittedChangeEvent.reason}`]
        : []),
      `${DECISION_CONTRACT_LABELS.watch.postureFlips}: ${document.slots.callChangesIf}`,
      ...(resumeLine ? [`${DECISION_CONTRACT_LABELS.reversal.resumeWhen}: ${resumeLine}`] : []),
      ...(flipConditionLabels.length > 0
        ? [`${DECISION_CONTRACT_LABELS.watch.watchThisWeek}: ${flipConditionLabels.join("; ")}`]
        : []),
      "",
      `Source: ${document.provenance.sourceUrl}`,
    ].join("\n"),
  };
};

export const buildWeeklyMandatePayload = (
  target: IntegrationTarget,
  document: BriefDocument,
  postureState: PostureStateContract,
) => {
  const envelope = buildWeeklyMandateEnvelope(document, postureState);

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
        Conditions: { select: { name: getRegimePublicLabel(envelope.regime) } },
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
    labels: ["whether", getRegimePublicLabel(envelope.regime).toLowerCase()],
    metadata: envelope,
  };
};
