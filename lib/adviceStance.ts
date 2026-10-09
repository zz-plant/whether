/**
 * The three directions investor advice can point, defined once.
 *
 * The advice corpus (`scripts/advice-corpus/`) classifies every post against these words, and
 * `/concepts` prints them beside the measured shares. The curated essay list on
 * `/concepts` tags the same three ways; when that list exports its own definitions, the two
 * reconcile here rather than in either caller. Registered wording:
 * docs/research/advice-corpus-preregistration.md §4.
 */
type AdviceStance = "expand" | "conserve" | "craft";

type AdviceStanceDefinition = {
  stance: AdviceStance;
  /** The word a reader sees. */
  label: string;
  /** What a post has to tell founders to carry this stance. */
  definition: string;
};

export const ADVICE_STANCES: readonly AdviceStanceDefinition[] = [
  {
    stance: "expand",
    label: "Expand",
    definition:
      "Tells founders to grow faster: hire or spend ahead of revenue, raise more to accelerate, take bigger or more bets, or put growth ahead of efficiency.",
  },
  {
    stance: "conserve",
    label: "Conserve",
    definition:
      "Tells founders to protect cash: cut or hold spending, slow or freeze hiring, extend runway, reach profitability, raise to survive rather than to accelerate, or put efficiency ahead of growth.",
  },
  {
    stance: "craft",
    label: "Craft",
    definition:
      "Teaches a method (product, hiring practice, sales, management, how to run a fundraise) without telling founders to speed up or slow down their spending.",
  },
];
