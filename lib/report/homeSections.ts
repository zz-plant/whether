/*
 * The stress tester was the one interactive thing on this page and was in no
 * section list, so it could not be linked, jumped to with J/K, or found in the
 * outline — a reader had to scroll past it to know it existed.
 */
export const homeSectionSequence = [
  { href: "#weekly-posture-brief-title", label: "Guidance" },
  { href: "#stress-test", label: "Stress-test a plan" },
  { href: "#audit-this-call", label: "Evidence" },
  { href: "#approve-this-weeks-plan", label: "Planning" },
  { href: "#historical-replay-workspace", label: "Depth" },
] as const;

const homeSectionCompactLabelByHref: Record<(typeof homeSectionSequence)[number]["href"], string> = {
  "#weekly-posture-brief-title": "Guidance",
  "#stress-test": "Stress-test",
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
