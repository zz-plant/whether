import type { ComparisonBasis } from "./comparisonBasis";

export const decisionTransmissionSearchDescription =
  "For hiring, fundraising, spending and runway: the action to take now, the line that pauses it, and the line that resumes it.";

/*
 * One phrase for the revisit slot everywhere the model's `revisitDecisions`
 * flag renders (answer pages, resource articles). The resources page used to
 * re-word it independently as "recheck last week's approvals" — the
 * approvals-committee register the 2026-09-22 copy audit retired.
 */
/*
 * Named by the reading the week was compared with. It said "last week's
 * decisions" whatever that was, and the comparison was the last month-end
 * snapshot: on Oct 5 the scores had moved since Aug 31, five weeks earlier, and
 * the answer pages told a reader to revisit last week's decisions. It is last
 * week's brief now where the archive has one, and still named by date. Where the
 * comparison is undated the wording stays "last week", as `comparisonBasis`
 * leaves it.
 */
export const revisitDecisionPhrase = (revisit: boolean, basis: ComparisonBasis) => {
  if (basis.date) {
    return revisit
      ? `revisit decisions made on the ${basis.date} reading`
      : `decisions made on the ${basis.date} reading stand`;
  }
  return revisit ? "revisit last week's decisions" : "last week's decisions stand";
};

export const homeDecisionFaqItems = [
  {
    question: "What changed this week?",
    answer:
      "The weekly brief shows which signals moved enough to shift this week's guidance.",
  },
  {
    question: "What should we do differently right now?",
    answer:
      "The brief shows what to do now, what to watch for, and when the conditions change.",
  },
  {
    question: "How sure are we, and what would change our mind?",
    answer:
      "The margin and freshness markers show how much to trust this week's guidance and what would change it.",
  },
] as const;
