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
  "EXPLAINER BRIEF",
  "",
  "What this call is saying",
  boardSummary,
  "",
  "Plain-English guide",
  "• Tightness = how hard it is to make long-payback commitments.",
  "• Risk appetite = how willing markets are to support faster expansion.",
  `• ${publicDecisionLabels.call} = the standing weekly operating summary.`,
  `• ${publicDecisionLabels.action} = what to do this week.`,
  `• ${publicDecisionLabels.threshold} = the trip line that pauses or tightens the call.`,
  `• ${publicDecisionLabels.reversal} = what must improve before loosening again.`,
  "",
  "Weekly brief",
  weeklyOperatorBrief,
  "",
  "Citation",
  citation,
].join("\n");
