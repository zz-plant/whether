/**
 * What a piece of advice tells a company to do with money and headcount.
 *
 * One definition for every list that tags advice this way: the reading list on
 * /concepts (`lib/productCanon.ts`) and any larger corpus classified against
 * the same rubric. A tag that meant one thing on the page and another in a
 * corpus would make the two impossible to compare, so both import this.
 *
 * The values are deliberately three. A finer scale (how strongly, about which
 * area) is a taxonomy, and the first version of /concepts was deleted partly
 * for sprawling into taxonomies.
 */
export type AdviceStance = "expand" | "conserve" | "craft";

export const ADVICE_STANCES = ["expand", "conserve", "craft"] as const satisfies readonly AdviceStance[];

/** Reader-facing name and one-line meaning for each value. */
export const ADVICE_STANCE_DEFINITIONS: Record<AdviceStance, { label: string; definition: string }> = {
  expand: { label: "Expand", definition: "Invest, grow, hire or move faster." },
  conserve: { label: "Conserve", definition: "Focus, cut, extend runway, run leaner or reach profitability." },
  craft: { label: "Craft", definition: "Method advice that sets no direction for money or headcount." },
};

/**
 * The rule a tagger applies, in one sentence. Each tag on /concepts also
 * carries the line of the text it rests on, so a reader can disagree with a
 * tag on the evidence rather than on trust.
 */
export const ADVICE_STANCE_RUBRIC =
  "Tag by what the text tells a company to do with money and headcount: more or faster is expand, less or leaner is conserve, and a method with no direction for either is craft.";
