import { decisionAreaLabel, type DecisionArea } from "../report/boundedDecisionRules";

/**
 * Section headings for an answer page, derived from the page rather than shared.
 *
 * All eleven answer pages shipped the same six `h2`s — "This week's posture",
 * "Bounded calls", "What would change this answer" — so the only heading that
 * varied across the corpus was the `h1`. Headings are the outline a reader
 * skims and a crawler reads as structure, and six identical ones say the pages
 * are six copies of a template, which is close to what they were.
 *
 * Two stay fixed on purpose. "Copy this answer" labels a button and "Citation"
 * labels a provenance block; both are the same thing on every page, and
 * inventing per-page wording for them would be decoration, not structure. The
 * four that describe content are built from the page's own audience, decision
 * areas, and threshold focus.
 */
type AnswerSectionHeadingInput = {
  applyHeading: string;
  mappedDecisionAreas: readonly DecisionArea[];
  thresholdFocus: "tightness" | "risk" | "both";
};

const THRESHOLD_FOCUS_LABELS = {
  tightness: "funding pressure",
  risk: "risk appetite",
  both: "funding pressure and risk appetite",
} as const;

/** "hiring, roadmap and spending" — lowercase, for mid-heading use. */
const joinAreas = (areas: readonly DecisionArea[]): string => {
  const labels = areas.map((area) => decisionAreaLabel(area).toLowerCase());
  if (labels.length === 0) return "this week's guidance";
  if (labels.length === 1) return labels[0];
  return `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
};

export const buildAnswerSectionHeadings = (page: AnswerSectionHeadingInput) => ({
  /** Labels the copy button. The same affordance on every page. */
  copy: "Copy this answer",
  /**
   * Written per page (`applyHeading` in content/answers/pages.json). It was
   * "What this means for {audience}", which named who reads the section rather
   * than what it answers, and read "What this means for Founders, finance
   * leaders and board operators" on the climate page.
   */
  posture: page.applyHeading,
  rules: `Rules in force: ${joinAreas(page.mappedDecisionAreas)}`,
  threshold: `What would change this answer: ${THRESHOLD_FOCUS_LABELS[page.thresholdFocus]}`,
  /** Labels the provenance block. The same block on every page. */
  citation: "Citation",
  next: `Next for ${joinAreas(page.mappedDecisionAreas)}`,
});
