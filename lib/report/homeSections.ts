export const homeSectionSequence = [
  { href: "#weekly-posture-brief-title", label: "Call" },
  { href: "#audit-this-call", label: "Why" },
  { href: "#approve-this-weeks-plan", label: "Plan" },
  { href: "#historical-replay-workspace", label: "Replay" },
  { href: "#translate-or-run-tool", label: "Tools" },
] as const;

export const homeSectionCompactLabelByHref: Record<(typeof homeSectionSequence)[number]["href"], string> = {
  "#weekly-posture-brief-title": "Call",
  "#audit-this-call": "Why",
  "#approve-this-weeks-plan": "Plan",
  "#historical-replay-workspace": "Replay",
  "#translate-or-run-tool": "Tools",
};
