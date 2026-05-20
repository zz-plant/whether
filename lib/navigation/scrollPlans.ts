export type ScrollPlanItem = {
  href: `#${string}`;
  label: string;
  summary: string;
};

export type ScrollPlan = {
  eyebrow: string;
  title: string;
  description: string;
  items: ScrollPlanItem[];
};

export const homeScrollPlan: ScrollPlan = {
  eyebrow: "What follows",
  title: "Start from the weekly call, then follow the loop",
  description:
    "Plan first, audit only when challenged, go deeper only when one question remains.",
  items: [
    {
      href: "#approve-this-weeks-plan",
      label: "Plan",
      summary: "Turn the weekly call into approvals before spending more time in proof.",
    },
    {
      href: "#audit-this-call",
      label: "Audit",
      summary: "Open evidence or check trust only when the call gets challenged.",
    },
    {
      href: "#historical-replay-workspace",
      label: "Resolve",
      summary: "Use a tool, replay a past week, or answer one remaining question.",
    },
  ],
};

export const signalsScrollPlan: ScrollPlan = {
  eyebrow: "Evidence",
  title: "Decision delta, then proof",
  description:
    "Decision delta first, then replay, live scores, priority drivers, and threshold logic.",
  items: [
    {
      href: "#decision-summary",
      label: "Decision",
      summary: "Confirm the active posture and what it means for this cycle.",
    },
    {
      href: "#historical-replay",
      label: "Replay",
      summary: "Pull historical context before you challenge the live read.",
    },
    {
      href: "#current-scores",
      label: "Scores",
      summary: "Inspect the three regime drivers and their current values.",
    },
    {
      href: "#evidence-priorities",
      label: "Drivers",
      summary: "Work through the highest-priority signals in the current queue.",
    },
    {
      href: "#thresholds",
      label: "Thresholds",
      summary: "Inspect trigger logic and advanced controls last.",
    },
  ],
};

export const operationsScrollPlan: ScrollPlan = {
  eyebrow: "Planning",
  title: "Approve the weekly plan before widening out",
  description:
    "Weekly plan first, then false-signal risk, guardrails, finance posture, and shareable output.",
  items: [
    {
      href: "#ops-monthly-action-summary",
      label: "Plan",
      summary: "Confirm what to approve, hold, or revisit this cycle.",
    },
    {
      href: "#ops-failure-patterns",
      label: "Risk checks",
      summary: "Pressure-test active false-signal patterns before you widen approvals.",
    },
    {
      href: "#ops-playbook",
      label: "Guardrails",
      summary: "Apply start, stop, and fence rules before committing work.",
    },
    {
      href: "#ops-finance-strategy",
      label: "Finance",
      summary: "Validate runway timing and budget posture before publishing.",
    },
    {
      href: "#ops-export-briefs",
      label: "Share",
      summary: "Copy the aligned brief and operator asks once the plan is set.",
    },
    {
      href: "#ops-edge-case-gate",
      label: "Escalate",
      summary: "Open Decision Tools or deeper artifacts only when one bounded question still remains.",
    },
  ],
};

export const decideScrollPlan: ScrollPlan = {
  eyebrow: "Decision tools",
  title: "Resolve the last open decision",
  description:
    "Start with the clearest tool. Go deeper only if one decision still stays open.",
  items: [
    {
      href: "#run-this-now",
      label: "Start",
      summary: "The fastest toolkit path.",
    },
    {
      href: "#direct-answers",
      label: "Answer",
      summary: "A direct answer when the question is already clear.",
    },
    {
      href: "#decision-utilities",
      label: "Validate",
      summary: "Use utilities only when one more check is necessary.",
    },
    {
      href: "#guided-translation",
      label: "Translate",
      summary: "Role or stage translation after the fast paths are exhausted.",
    },
  ],
};

export const methodScrollPlan: ScrollPlan = {
  eyebrow: "Readiness",
  title: "Freshness, confidence, and reversal conditions",
  description:
    "Current status first, then reversal conditions and glossary support if needed.",
  items: [
    {
      href: "#trust-hub-links",
      label: "Key questions",
      summary: "Sources, confidence, formulas, and revisit triggers.",
    },
    {
      href: "#trust-snapshot",
      label: "Status",
      summary: "Confirm freshness, confidence, and source coverage.",
    },
    {
      href: "#revisit-call",
      label: "Revisit",
      summary: "Review the trigger, impact, and recovery conditions.",
    },
    {
      href: "#beginner-glossary",
      label: "Glossary",
      summary: "Translate finance language into day-to-day operating terms.",
    },
  ],
};
