import { publicDecisionLabels } from "../report/reportFormatting";
import {
  applyPlainEnglishSubstitutions,
  buildOperatorContextSummary,
  type WeeklyOperatorContext,
} from "../report/signalTranslations";

export const buildExplainerBriefContent = ({
  boardSummary,
  weeklyOperatorBrief,
  citation,
  operatorContext,
}: {
  boardSummary: string;
  weeklyOperatorBrief: string;
  citation: string;
  /** When provided, generates a "What this means for you" section with plain-English context. */
  operatorContext?: WeeklyOperatorContext;
}) => {
  const sections: string[] = [];

  // Header
  sections.push(
    "PLAIN-ENGLISH BRIEF",
    "",
    "What this is",
    "A jargon-free version of the weekly operating brief. Designed for team members who don't follow macroeconomics but need to make decisions this week.",
    "",
  );

  // Operator context summary (the key new section)
  if (operatorContext) {
    const contextLines = buildOperatorContextSummary(operatorContext);
    sections.push("What this means for you this week");
    sections.push(contextLines.join("\n"));
    sections.push("");
  }

  // Decision summary - translate the board summary for plain English
  const plainBoardSummary = applyPlainEnglishSubstitutions(boardSummary);
  sections.push("Bottom line");
  sections.push(plainBoardSummary);
  sections.push("");

  // How to read section
  sections.push(
    "How to read this",
    "• Funding pressure = how hard it is to raise or borrow money right now.",
    "• Risk appetite = how willing investors are to take risk on new bets.",
    "• Recession warning gauge = whether the yield curve warns of a slowdown.",
    `• ${publicDecisionLabels.call} = the weekly forecast for operating conditions.`,
    `• ${publicDecisionLabels.action} = what to do this week.`,
    `• ${publicDecisionLabels.threshold} = the condition to watch for that would pause the plan.`,
    `• ${publicDecisionLabels.reversal} = what must improve before conditions clear.`,
    "",
  );

  // Leadership team brief (translated)
  const plainOperatorBrief = applyPlainEnglishSubstitutions(weeklyOperatorBrief);
  sections.push("Simplified leadership brief");
  sections.push(plainOperatorBrief);
  sections.push("");

  // Source note
  sections.push("Source note");
  sections.push(citation);
  sections.push("");

  // Quick reference for terms
  sections.push("Need definitions?");
  sections.push("Open the glossary at /trust#beginner-glossary to translate any unfamiliar U.S. market terms.");
  sections.push("Or scan this quick reference:");
  sections.push("• Funding pressure: a score from 0-100. Higher = cash is harder to access → conserve.");
  sections.push("• Risk appetite: a score from 0-100. Lower = investors are more cautious → de-risk.");
  sections.push("• Recession warning gauge: measures the yield curve. Inverted = favor short-payback bets.");
  sections.push("• Fed interest rate: the cost of borrowing. Higher = debt is more expensive.");
  sections.push("• Operating environment (regime) → Defend / Conserve / Guarded Expand / Expand");
  sections.push("• Clears-when condition: the threshold that, once crossed, would change the recommendation.");
  sections.push("• Watch-for condition: the boundary that pauses or slows current plans.");

  return sections.join("\n");
};

/**
 * Legacy signature for backward compatibility.
 * Prefer the new signature with operatorContext for richer output.
 */
export const buildExplainerBriefContentLegacy = ({
  boardSummary,
  weeklyOperatorBrief,
  citation,
}: {
  boardSummary: string;
  weeklyOperatorBrief: string;
  citation: string;
}) => buildExplainerBriefContent({ boardSummary, weeklyOperatorBrief, citation });