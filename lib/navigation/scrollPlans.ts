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
  title: "Keep the brief as the only source of truth",
  description:
    "Share from home, then open exactly one downstream surface only if evidence, planning, or translation still needs work.",
  items: [
    {
      href: "#audit-this-call",
      label: "Evidence",
      summary: "Open Evidence or Trust only when the brief needs proof or a trust audit.",
    },
    {
      href: "#approve-this-weeks-plan",
      label: "Planning",
      summary: "Commit the weekly plan before you widen into company-specific translation.",
    },
    {
      href: "#historical-replay-workspace",
      label: "Depth",
      summary: "Use Decision Tools, replay, or toolkits only for the one unresolved question that remains.",
    },
  ],
};

export const signalsScrollPlan: ScrollPlan = {
  eyebrow: "Evidence path",
  title: "Read Evidence from decision to proof",
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
  title: "Use Planning as a controlled review sequence",
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
  title: "Use Decision Tools only for unresolved edge cases",
  description:
    "Start with the fastest bounded tool, then widen into role or situation paths only if the weekly plan still leaves an owner-specific question.",
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
  title: "Audit Trust from freshness to reversal conditions",
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
