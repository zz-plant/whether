export const homeSectionSequence = [
  { href: "#weekly-posture-brief-title", label: "Call" },
  { href: "#audit-this-call", label: "Evidence" },
  { href: "#approve-this-weeks-plan", label: "Planning" },
  { href: "#historical-replay-workspace", label: "Depth" },
] as const;

export const homeSectionCompactLabelByHref: Record<(typeof homeSectionSequence)[number]["href"], string> = {
  "#weekly-posture-brief-title": "Call",
  "#audit-this-call": "Evidence",
  "#approve-this-weeks-plan": "Planning",
  "#historical-replay-workspace": "Depth",
};

const extendedSectionCompactLabelByHref: Record<string, string> = {
  ...homeSectionCompactLabelByHref,
  "#evidence-priorities": "Top drivers",
  "#ops-monthly-action-summary": "Monthly",
  "#ops-playbook": "Playbook",
  "#ops-finance-strategy": "Finance",
  "#ops-export-briefs": "Export",
};

export const getCompactSectionLabel = (href: string, fallbackLabel: string) =>
  extendedSectionCompactLabelByHref[href] ?? fallbackLabel;
