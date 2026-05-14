import { publicDecisionLabels } from "../report/reportFormatting";
import {
  applyPlainEnglishSubstitutions,
  buildOperatorContextSummary,
  type WeeklyOperatorContext,
} from "../report/indicatorTranslations";

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
    "• Cash availability = how hard it is to raise or borrow money right now.",
    "• Market risk appetite = how willing investors are to take risk on new bets.",
    "• Recession warning gauge = whether the yield curve warns of a slowdown.",
    `• ${publicDecisionLabels.call} = the standing weekly recommendation.`,
    `• ${publicDecisionLabels.action} = what to do this week.`,
    `• ${publicDecisionLabels.threshold} = the trip line that pauses or tightens the recommendation.`,
    `• ${publicDecisionLabels.reversal} = what must improve before loosening again.`,
    "",
  );

  // Leadership team brief (translated)
  const plainOperatorBrief = applyPlainEnglishSubstitutions(weeklyOperatorBrief);
  sections.push("Leadership team brief");
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
  sections.push("• Cash availability (capital tightness) → higher = conserve cash");
  sections.push("• Market risk appetite → lower = de-risk launches");
  sections.push("• Recession warning gauge (yield curve slope) → inverted = favor short-payback projects");
  sections.push("• Fed interest rate (base rate) → higher = borrowing costs more");
  sections.push("• Operating environment (regime) → Defend / Conserve / Guarded Expand / Expand");
  sections.push("• Flip condition → the threshold that changes the recommendation");
  sections.push("• Guardrail → when to pause current plans");

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