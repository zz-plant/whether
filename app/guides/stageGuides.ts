/*
 * What the weekly reading is for at each stage. The first version rated each
 * stage's "operational leverage" and "narrative leverage" from Low to Very
 * high — scores with no measurement behind them, printed as a table — and
 * promised to "delete planning entropy". A stage guide says what the reading
 * helps with at that size and where it stops helping.
 */
type StageGuide = {
  slug: string;
  title: string;
  teamSize: string;
  /** What the reading is most useful for at this stage, in a few words. */
  primaryValue: string;
  summary: string;
  whoBenefitsMost: readonly string[];
  bestUse: string;
  failureMode?: string;
};

export const stageGuides: readonly StageGuide[] = [
  {
    slug: "seed",
    title: "Seed",
    teamSize: "0–15 people",
    primaryValue: "Timing and explaining a raise",
    summary:
      "At seed, the reading helps you time a raise and explain it. It should not become a reason to put off product and customer decisions.",
    whoBenefitsMost: ["Founders preparing to raise."],
    bestUse: "Quote this week's guidance in investor updates and when an investor asks \"why now\".",
    failureMode: "Blaming the market for problems that are really about the product or the customers.",
  },
  {
    slug: "series-a",
    title: "Series A",
    teamSize: "15–50 people",
    primaryValue: "Hiring and burn limits",
    summary:
      "At Series A, it sets hiring, spend and roadmap limits for the next six to eight weeks, before habits you can't afford settle in.",
    whoBenefitsMost: [
      "Founders setting hiring pace and burn.",
      "A first head of product arguing from limits rather than preference.",
    ],
    bestUse: "Write short-cycle rules with a pause line and a resume line for each.",
  },
  {
    slug: "series-b",
    title: "Series B",
    teamSize: "50–150 people",
    primaryValue: "One baseline for planning",
    summary:
      "At Series B, product, finance and leadership plan from one reading, so the arguments are about the numbers.",
    whoBenefitsMost: [
      "A CEO and CFO agreeing one set of lines.",
      "A head of product deciding how hard to push the roadmap.",
      "A chief of staff keeping each team's plan consistent with the others.",
    ],
    bestUse: "Start planning, investor updates and cross-team trade-offs from the weekly reading.",
  },
  {
    slug: "series-c",
    title: "Series C and later",
    teamSize: "150–500+ people",
    primaryValue: "Consistent board reporting",
    summary:
      "At Series C and later, it gives the board and leadership a consistent record of conditions and of the rules the company ran under.",
    whoBenefitsMost: [
      "A CFO setting limits and the wording used with the board.",
      "A CEO keeping decisions consistent from quarter to quarter.",
      "A head of product managing commitments that run several quarters.",
    ],
    bestUse: "Keep the same lines quarter to quarter, and export the reasoning for board packs.",
  },
] as const;

export const findStageGuide = (slug: string) =>
  stageGuides.find((guide) => guide.slug === slug);
