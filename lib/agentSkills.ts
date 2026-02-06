/**
 * Agent skill definitions for autonomous PM assistants.
 * These guide downstream agents on expected outputs and inputs.
 */
export interface AgentSkill {
  id: string;
  label: string;
  purpose: string;
  inputs: string[];
  outputs: string[];
}

export const agentSkills: AgentSkill[] = [
  {
    id: "regime-summary",
    label: "Regime summary",
    purpose: "Explain the market climate in plain English with the top macro signals.",
    inputs: ["regime", "scores", "macro_signals", "data_warnings"],
    outputs: ["summary_bullets"],
  },
  {
    id: "constraint-translation",
    label: "Constraint translation",
    purpose: "Turn constraints into clear guardrails for roadmap, hiring, and pricing.",
    inputs: ["constraints", "thresholds", "signals"],
    outputs: ["constraint_brief"],
  },
  {
    id: "pm-questions",
    label: "PM question log",
    purpose: "Surface open questions the PM must answer before acting.",
    inputs: ["constraints", "signals", "macro_signals"],
    outputs: ["pm_questions"],
  },
];
