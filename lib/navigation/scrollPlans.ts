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
  eyebrow: "Scroll path",
  title: "Move through the weekly brief in one pass",
  description:
    "Confirm why the call changed, lock the operating plan, then use replay only when continuity helps this week’s decision.",
  items: [
    {
      href: "#audit-this-call",
      label: "Audit",
      summary: "Confirm the delta, trust status, and top evidence movers first.",
    },
    {
      href: "#approve-this-weeks-plan",
      label: "Approve",
      summary: "Lock the weekly operating summary before opening deeper execution views.",
    },
    {
      href: "#historical-replay-workspace",
      label: "Replay",
      summary: "Compare against prior months only after the live call is settled.",
    },
  ],
};

export const signalsScrollPlan: ScrollPlan = {
  eyebrow: "Evidence path",
  title: "Read Signals from decision to proof",
  description:
    "Start with the decision delta, then move through replay, live scores, priority drivers, and threshold logic in that order.",
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
  eyebrow: "Execution path",
  title: "Use Operations as a controlled review sequence",
  description:
    "Approve the weekly plan first, then validate guardrails, finance posture, sharing output, and optional implementation handoffs.",
  items: [
    {
      href: "#ops-monthly-action-summary",
      label: "Plan",
      summary: "Confirm what to approve, hold, or revisit this cycle.",
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
      href: "#ops-implementation-handoffs",
      label: "Handoffs",
      summary: "Open delivery, data, or terminal handoffs only if needed.",
    },
  ],
};

export const decideScrollPlan: ScrollPlan = {
  eyebrow: "Decision path",
  title: "Start fast, then widen only if the call needs it",
  description:
    "Begin with runnable tools, use utilities when validation is required, and browse role or situation paths only after that.",
  items: [
    {
      href: "#run-this-now",
      label: "Run",
      summary: "Open the fastest weekly toolkit shortcut first.",
    },
    {
      href: "#decision-utilities",
      label: "Validate",
      summary: "Use decision utilities only when the weekly call needs a second pass.",
    },
    {
      href: "#explore-by-role",
      label: "Role",
      summary: "Browse role-specific paths after the fast paths are exhausted.",
    },
    {
      href: "#explore-by-situation",
      label: "Situation",
      summary: "Use scenario paths when you need broader discovery.",
    },
  ],
};

export const methodScrollPlan: ScrollPlan = {
  eyebrow: "Trust path",
  title: "Audit trust from surfaces to reversal conditions",
  description:
    "Open the primary trust surfaces first, confirm the current status, then review flip conditions and optional glossary support.",
  items: [
    {
      href: "#trust-hub-links",
      label: "Surfaces",
      summary: "Open sources, confidence, formulas, or learn support from one place.",
    },
    {
      href: "#trust-snapshot",
      label: "Snapshot",
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
