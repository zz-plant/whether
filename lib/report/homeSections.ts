export const homeSectionSequence = [
  { href: "#weekly-posture-brief-title", label: "Call" },
  { href: "#decision-snapshot-for-leadership-this-week", label: "Decide the call" },
  { href: "#execution-guidance", label: "Run the plan" },
  { href: "#evidence-diagnostics", label: "Stress-test evidence" },
] as const;

export const homeSectionCompactLabelByHref: Record<(typeof homeSectionSequence)[number]["href"], string> = {
  "#weekly-posture-brief-title": "Call",
  "#decision-snapshot-for-leadership-this-week": "Decide",
  "#execution-guidance": "Run",
  "#evidence-diagnostics": "Evidence",
};

