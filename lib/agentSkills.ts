/**
 * Agent skill definitions for autonomous PM assistants.
 * These guide downstream agents on expected outputs and inputs.
 *
 * The briefing an agent writes has five steps, one per skill, and they were written three
 * times: here, as `pm_handoff.briefing_actions` and as the numbered asks in the handoff prompt
 * (`lib/agentHandoff.ts`), each in its own words and kept in order by hand. Each step is written
 * once below, with the skill it is, the action the PM handoff lists and the line the prompt
 * asks for; the three lists are read from it.
 */
interface AgentSkill {
  id: string;
  label: string;
  purpose: string;
  inputs: string[];
  outputs: string[];
}

type BriefingStep = {
  skill: AgentSkill;
  /** The step as `pm_handoff.briefing_actions` lists it. */
  briefingAction: string;
  /** What the handoff prompt asks the agent to draft for it. */
  promptAsk: string;
};

const BRIEFING_STEPS: readonly BriefingStep[] = [
  {
    skill: {
      id: "regime-summary",
      label: "Regime summary",
      purpose: "Explain the capital posture in plain English with the top macro signals.",
      inputs: ["regime", "scores", "macro_signals", "data_warnings"],
      outputs: ["summary_bullets"],
    },
    briefingAction: "Summarize the regime in plain English.",
    promptAsk: "A 3-bullet summary of the capital posture.",
  },
  {
    skill: {
      id: "decision-delta",
      label: "Decision delta",
      purpose: "Explain what changed this week and which decisions should tighten, loosen, or hold.",
      inputs: ["decision_delta", "decision_rules", "signals"],
      outputs: ["delta_brief"],
    },
    briefingAction: "State what changed this week and what decisions should change now.",
    promptAsk: "A concise decision delta: what changed this week and what changes now.",
  },
  {
    skill: {
      id: "constraint-translation",
      label: "Constraint translation",
      purpose: "Turn constraints into clear guardrails for roadmap, hiring, and pricing.",
      inputs: ["constraints", "decision_rules", "signals"],
      outputs: ["constraint_brief"],
    },
    briefingAction: "Call out constraints that block or enable new initiatives.",
    promptAsk: "The top 3 constraints that should shape roadmap decisions.",
  },
  {
    skill: {
      id: "flip-watch",
      label: "Flip watch",
      purpose: "Track the change lines, the pause and resume lines, and each score's distance from them before irreversible moves.",
      inputs: ["flip_watch", "decision_rules", "signals"],
      outputs: ["flip_watchlist"],
    },
    briefingAction: "Track the change lines before making irreversible commitments.",
    promptAsk: "A watchlist of the change lines and the pause and resume lines, with how far each score sits from them.",
  },
  {
    skill: {
      id: "pm-questions",
      label: "PM question log",
      purpose: "Surface open questions the PM must answer before acting.",
      inputs: ["constraints", "decision_delta", "flip_watch", "macro_signals"],
      outputs: ["pm_questions"],
    },
    briefingAction: "List open questions for the product manager.",
    promptAsk: "A short list of questions to confirm with the PM before acting.",
  },
];

export const agentSkills: AgentSkill[] = BRIEFING_STEPS.map((step) => step.skill);

/** The briefing steps in skill order, as the PM handoff lists them. */
export const agentBriefingActions: string[] = BRIEFING_STEPS.map((step) => step.briefingAction);

/** The numbered asks the handoff prompt makes, in skill order: "1) A 3-bullet summary ...". */
export const agentPromptAsks: string[] = BRIEFING_STEPS.map((step, index) => `${index + 1}) ${step.promptAsk}`);
