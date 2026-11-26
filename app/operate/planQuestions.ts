/**
 * The questions /operate's steps ask, and the first sentence that answers each
 * (docs/editorial-guardrails.md, "Questions and answers, as people say them").
 *
 * One object for both readers: the step heading and the line under it render
 * from it, and so do the page's `FAQPage` nodes (`buildOperateStructuredData`),
 * so the markup cannot carry a question the page does not ask. Until 2026-11-25
 * the FAQ named three questions no section asked ("How do I turn this week's
 * guidance into a plan?" among them) over labels such as "Rules before you
 * commit" and "Finance strategy".
 *
 * The index names the same sections in short question forms
 * (`operationsSectionLinks` in lib/navigation/planningNavigation.ts).
 */
type PlanQuestion = { question: string; answer: string };

/** The page's title, as the metadata and the `WebPage` node name it. */
export const operatePageName = "This week's plan: hiring, spending and runway rules";

/**
 * The page's question ("what's our plan this week?") answered in two spoken sentences, for the
 * meta description and the `WebPage` node. It read "Set the rules in advance: this week's
 * guidance, your runway, and your own pause and restart lines, so changing course is a line
 * being crossed", a list of what the page holds.
 */
export const operatePageDescription =
  "Each area pauses at one score and restarts at another, agreed in advance. Set your own numbers, check a plan against this week's guidance and size your runway.";

/* A list item opens a clause in a sentence: "Hiring ahead of revenue" → "hiring ahead of
   revenue". A word in capitals ("SaaS", "AI") keeps them. */
const asClause = (item: string) =>
  /^[A-Z][a-z]*(?:[\s,-]|$)/.test(item) ? `${item.charAt(0).toLowerCase()}${item.slice(1)}` : item;

const stripStop = (item: string) => item.replace(/[.\s]+$/, "");

export const buildPlanQuestions = ({
  stopItems,
  startItems,
  areaNames,
  runwayAnswer,
}: {
  stopItems: readonly string[];
  startItems: readonly string[];
  /** The areas the reader can set rules for, as the step lists them. */
  areaNames: string;
  /** The finance stance's runway target (`financeStrategyFor(regime).runwayPosture`). */
  runwayAnswer: string | null;
}) => {
  const stop = stopItems[0];
  const start = startItems[0];
  return {
    areas: {
      question: "When does each area pause or restart?",
      answer:
        "At two different scores: each area pauses at one and restarts at another, set apart so one noisy week can't reverse a decision.",
    },
    playbook: {
      question: "What should we stop, start and keep small?",
      answer:
        stop && start
          ? `Stop ${asClause(stripStop(stop))}, and start ${asClause(stripStop(start))}.`
          : "Hold new commitments until this week's rules load.",
    },
    test: {
      question: "Does this plan fit this week?",
      answer: "Describe it below to find out. A hire, a price change, a roadmap bet or an acquisition is scored against this week's guidance.",
    },
    ownRules: {
      question: "Want your own numbers?",
      answer: `Start from the published rules for ${areaNames}, change any number, and get an email the day an area pauses or restarts.`,
    },
    finance: {
      question: "How much runway should we keep?",
      answer: runwayAnswer ?? "Enough to hold this week's plan through the quarter; the runway planner sizes it against your figures.",
    },
  } satisfies Record<string, PlanQuestion>;
};

type PlanQuestions = ReturnType<typeof buildPlanQuestions>;

/** The steps whose first sentence answers its question, which is what the FAQ carries. */
export const answeredPlanQuestions = (questions: PlanQuestions): PlanQuestion[] => [
  questions.areas,
  questions.playbook,
  questions.finance,
];
