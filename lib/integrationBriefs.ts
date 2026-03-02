import type { RegimeAssessment } from "./regimeEngine";
import type { TreasuryData } from "./types";

export type IntegrationTarget = "slack" | "notion" | "linear";

export const integrationTargets: IntegrationTarget[] = ["slack", "notion", "linear"];

export const parseIntegrationTarget = (value: string | null): IntegrationTarget | null => {
  if (!value) {
    return null;
  }
  return integrationTargets.find((target) => target === value) ?? null;
};

export type WeeklyMandateEnvelope = {
  title: string;
  summary: string;
  recordDate: string;
  regime: RegimeAssessment["regime"];
  markdown: string;
  constraints: string[];
};

export const buildWeeklyMandateEnvelope = (
  assessment: RegimeAssessment,
  treasury: TreasuryData,
): WeeklyMandateEnvelope => {
  const title = `Whether weekly mandate — ${treasury.record_date}`;
  const summary = `${assessment.regime}: Tightness ${assessment.scores.tightness}/100, Risk appetite ${assessment.scores.riskAppetite}/100.`;
  const constraints = assessment.constraints.slice(0, 3);

  return {
    title,
    summary,
    recordDate: treasury.record_date,
    regime: assessment.regime,
    constraints,
    markdown: [
      `## ${title}`,
      summary,
      "",
      "### Constraints",
      ...constraints.map((item) => `- ${item}`),
      "",
      `Source: ${treasury.source}`,
    ].join("\n"),
  };
};

export const buildWeeklyMandatePayload = (
  target: IntegrationTarget,
  assessment: RegimeAssessment,
  treasury: TreasuryData,
) => {
  const envelope = buildWeeklyMandateEnvelope(assessment, treasury);

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
        Regime: { select: { name: assessment.regime } },
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
    labels: ["whether", assessment.regime.toLowerCase()],
    metadata: envelope,
  };
};
