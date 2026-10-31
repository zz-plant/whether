/**
 * What a piece of advice tells a company to do with money and headcount.
 *
 * One definition for every list that tags advice this way: the reading list on
 * /concepts (`lib/productCanon.ts`) and the advice corpus (`scripts/advice-corpus/`),
 * which classifies every dated post from ten investors' archives. A tag that meant
 * one thing on the page and another in the corpus would make the two impossible to
 * compare, so both import this.
 *
 * The values are deliberately three. A finer scale (how strongly, about which
 * area) is a taxonomy, and the first version of /concepts was deleted partly
 * for sprawling into taxonomies.
 */
export type AdviceStance = "expand" | "conserve" | "craft";

export const ADVICE_STANCES = ["expand", "conserve", "craft"] as const satisfies readonly AdviceStance[];

/**
 * Reader-facing name, the question it answers, and one-line meaning for each value, plus the
 * long form the corpus's local model labels by. The long forms were registered before any post
 * was labelled (docs/research/advice-corpus-preregistration.md §4, prompt `advice-v1`, whose
 * hash a test holds), so they change only with a new registered prompt version. They spell out
 * the same three values; one difference is known: the one-liner puts "focus" under conserve, and
 * the corpus has no word for focus, so a post that only narrows scope is craft there.
 */
export const ADVICE_STANCE_DEFINITIONS: Record<
  AdviceStance,
  {
    label: string;
    /** The question the label answers, for a reader meeting it cold. */
    question: string;
    definition: string;
    corpusDefinition: string;
  }
> = {
  expand: {
    label: "Expand",
    question: "Told founders to grow faster",
    definition: "Invest, grow, hire or move faster.",
    corpusDefinition:
      "Tells founders to grow faster: hire or spend ahead of revenue, raise more to accelerate, take bigger or more bets, or put growth ahead of efficiency.",
  },
  conserve: {
    label: "Conserve",
    question: "Told founders to protect cash",
    definition: "Focus, cut, extend runway, run leaner or reach profitability.",
    corpusDefinition:
      "Tells founders to protect cash: cut or hold spending, slow or freeze hiring, extend runway, reach profitability, raise to survive rather than to accelerate, or put efficiency ahead of growth.",
  },
  craft: {
    label: "Craft",
    question: "Taught a method, no direction for money",
    definition: "Method advice that sets no direction for money or headcount.",
    corpusDefinition:
      "Teaches a method (product, hiring practice, sales, management, how to run a fundraise) without telling founders to speed up or slow down their spending.",
  },
};

/**
 * The rule a tagger applies, in one sentence. Each tag on /concepts also
 * carries the line of the text it rests on, so a reader can disagree with a
 * tag on the evidence rather than on trust.
 */
export const ADVICE_STANCE_RUBRIC =
  "Tag by what the text tells a company to do with money and headcount: more or faster is expand, less or leaner is conserve, and a method with no direction for either is craft.";
