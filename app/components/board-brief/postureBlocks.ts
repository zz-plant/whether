import type { RegimeAssessment } from "../../../lib/regimeEngine";

export const postureBlocksByRegime: Record<
  RegimeAssessment["regime"],
  Array<{ title: string; bullets: string[] }>
> = {
  SCARCITY: [
    {
      title: "Hiring posture",
      bullets: [
        "Restrict hiring to revenue-supporting or reliability-critical roles.",
        "Delay speculative team expansion until signals improve.",
      ],
    },
    {
      title: "Roadmap posture",
      bullets: [
        "Prioritize reliability, retention, and near-term payback work.",
        "Defer long-cycle bets unless they are reversible.",
      ],
    },
    {
      title: "Capital posture",
      bullets: [
        "Maintain burn discipline and tighten approval gates.",
        "Require short payback windows for incremental spend.",
      ],
    },
  ],
  DEFENSIVE: [
    {
      title: "Hiring posture",
      bullets: ["Backfill only essential execution gaps.", "Gate net-new hires behind explicit ROI proof."],
    },
    {
      title: "Roadmap posture",
      bullets: [
        "Protect core delivery and customer commitments.",
        "Stage expansionary initiatives behind milestones.",
      ],
    },
    {
      title: "Capital posture",
      bullets: [
        "Preserve cash durability with measured spend.",
        "Keep optionality for downside scenarios.",
      ],
    },
  ],
  VOLATILE: [
    {
      title: "Hiring posture",
      bullets: ["Keep hiring selective and reversible.", "Use short planning cycles before adding fixed costs."],
    },
    {
      title: "Roadmap posture",
      bullets: [
        "Prioritize adaptable work that can be re-sequenced quickly.",
        "Avoid irreversible scope commitments.",
      ],
    },
    {
      title: "Capital posture",
      bullets: [
        "Sequence spend in tranches tied to checkpoints.",
        "Protect downside while preserving upside options.",
      ],
    },
  ],
  EXPANSION: [
    {
      title: "Hiring posture",
      bullets: ["Expand in proven demand areas first.", "Maintain quality bar and ramp discipline."],
    },
    {
      title: "Roadmap posture",
      bullets: [
        "Advance growth initiatives with milestone gates.",
        "Preserve reliability and margin guardrails.",
      ],
    },
    {
      title: "Capital posture",
      bullets: [
        "Deploy capital selectively with clear payback targets.",
        "Monitor burn as growth spend increases.",
      ],
    },
  ],
};
