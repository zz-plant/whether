import { publicDecisionLabels } from "../report/reportFormatting";

export const buildExplainerBriefContent = ({
  boardSummary,
  weeklyOperatorBrief,
  citation,
}: {
  boardSummary: string;
  weeklyOperatorBrief: string;
  citation: string;
}) => [
  "PLAIN-ENGLISH UPDATE",
  "",
  "Bottom line",
  boardSummary,
  "",
  "How to read this",
  "• Market pressure = how hard it is to make long-payback commitments.",
  "• Expansion support = how willing markets are to back faster growth.",
  `• ${publicDecisionLabels.call} = the standing weekly recommendation.`,
  `• ${publicDecisionLabels.action} = what to do this week.`,
  `• ${publicDecisionLabels.threshold} = the trip line that pauses or tightens the recommendation.`,
  `• ${publicDecisionLabels.reversal} = what must improve before loosening again.`,
  "",
  "Leadership update",
  weeklyOperatorBrief,
  "",
  "Source note",
  citation,
].join("\n");
