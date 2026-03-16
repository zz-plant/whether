export const homeSectionSequence = [
  { href: "#weekly-posture-brief-title", label: "Call" },
  { href: "#audit-this-call", label: "Audit" },
  { href: "#historical-replay-workspace", label: "Replay" },
  { href: "#approve-this-weeks-plan", label: "Plan" },
  { href: "#translate-or-run-tool", label: "Tools" },
] as const;

export const homeSectionCompactLabelByHref: Record<(typeof homeSectionSequence)[number]["href"], string> = {
  "#weekly-posture-brief-title": "Call",
  "#audit-this-call": "Audit",
  "#historical-replay-workspace": "Replay",
  "#approve-this-weeks-plan": "Plan",
  "#translate-or-run-tool": "Tools",
};
