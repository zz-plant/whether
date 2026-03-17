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
    purpose: "Explain the capital posture in plain English with the top macro signals.",
    inputs: ["regime", "scores", "macro_signals", "data_warnings"],
    outputs: ["summary_bullets"],
  },
  {
    id: "decision-delta",
    label: "Decision delta",
    purpose: "Explain what changed this week and which decisions should tighten, loosen, or hold.",
    inputs: ["decision_delta", "decision_rules", "signals"],
    outputs: ["delta_brief"],
  },
  {
    id: "constraint-translation",
    label: "Constraint translation",
    purpose: "Turn constraints into clear guardrails for roadmap, hiring, and pricing.",
    inputs: ["constraints", "decision_rules", "signals"],
    outputs: ["constraint_brief"],
  },
  {
    id: "flip-watch",
    label: "Flip watch",
    purpose: "Track flip triggers, reversal conditions, and boundary pressure before irreversible moves.",
    inputs: ["flip_watch", "decision_rules", "signals"],
    outputs: ["flip_watchlist"],
  },
  {
    id: "pm-questions",
    label: "PM question log",
    purpose: "Surface open questions the PM must answer before acting.",
    inputs: ["constraints", "decision_delta", "flip_watch", "macro_signals"],
    outputs: ["pm_questions"],
  },
];
