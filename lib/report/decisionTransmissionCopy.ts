export const decisionTransmissionSearchDescription =
  "For hiring, fundraising, spending and runway: what to do now, the line that pauses it, and the line that resumes it.";

/*
 * One phrase for the revisit slot everywhere the model's `revisitDecisions`
 * flag renders (answer pages, resource articles). The resources page used to
 * re-word it independently as "recheck last week's approvals" — the
 * approvals-committee register the 2026-09-22 copy audit retired.
 */
export const revisitDecisionPhrase = (revisit: boolean) =>
  revisit ? "revisit last week's decisions" : "last week's decisions stand";

export const homeDecisionFaqItems = [
  {
    question: "What changed this week?",
    answer:
      "The weekly brief shows which signals moved enough to shift this week's forecast.",
  },
  {
    question: "What should we do differently right now?",
    answer:
      "The brief shows what to do now, what to watch for, and when the conditions change.",
  },
  {
    question: "How sure are we, and what would change our mind?",
    answer:
      "Confidence and freshness markers show how much to trust this week's forecast, and what would change it.",
  },
] as const;
