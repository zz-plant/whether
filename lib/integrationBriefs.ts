import type { RegimeAssessment } from "./regimeEngine";
import type { TreasuryData } from "./types";

export type IntegrationTarget = "slack" | "notion" | "linear";

export const buildWeeklyMandatePayload = (
  target: IntegrationTarget,
  assessment: RegimeAssessment,
  treasury: TreasuryData,
) => {
  const title = `Whether weekly mandate — ${treasury.record_date}`;
  const summary = `${assessment.regime}: Tightness ${assessment.scores.tightness}/100, Risk appetite ${assessment.scores.riskAppetite}/100.`;
  const constraints = assessment.constraints.slice(0, 3);

  if (target === "slack") {
    return {
      channel: "#planning",
      text: `${title}\n${summary}`,
      blocks: [
        { type: "header", text: { type: "plain_text", text: title } },
        { type: "section", text: { type: "mrkdwn", text: summary } },
        {
          type: "section",
          text: { type: "mrkdwn", text: constraints.map((item) => `• ${item}`).join("\n") },
        },
      ],
    };
  }

  if (target === "notion") {
    return {
      parent: { type: "database_id", database_id: "weekly-mandates" },
      properties: {
        Name: { title: [{ text: { content: title } }] },
        Regime: { select: { name: assessment.regime } },
        Summary: { rich_text: [{ text: { content: summary } }] },
      },
      children: constraints.map((item) => ({
        object: "block",
        type: "bulleted_list_item",
        bulleted_list_item: { rich_text: [{ type: "text", text: { content: item } }] },
      })),
    };
  }

  return {
    title,
    description: [summary, "", ...constraints.map((item) => `- ${item}`)].join("\n"),
    labels: ["whether", assessment.regime.toLowerCase()],
  };
};
