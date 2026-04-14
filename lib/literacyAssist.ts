export type LiteracyAssistMode = "decision" | "evidence" | "trust" | "share";

export type ArtifactMode = "operator" | "explainer";

export const literacyAssistOptions: Array<{
  id: LiteracyAssistMode;
  label: string;
  description: string;
}> = [
  {
    id: "decision",
    label: "What Should We Do Now?",
    description: "Show the move to make now, what to pause, and what would change the call.",
  },
  {
    id: "evidence",
    label: "Why Is The Call Changing?",
    description: "Explain the main signals and thresholds in plain operating language.",
  },
  {
    id: "trust",
    label: "Can We Rely On This?",
    description: "Turn freshness, confidence, and fallback state into a clear use-or-caution read.",
  },
  {
    id: "share",
    label: "Which Brief Should I Send?",
    description: "Point me to the right brief, snapshot, or update to share.",
  },
] as const;

export const literacyAssistStorageKeys = {
  focus: "whether.literacy.focus",
  decision: "whether.literacy.decisionHelp",
  evidence: "whether.literacy.evidenceHelp",
  trust: "whether.literacy.trustHelp",
  share: "whether.literacy.shareHelp",
  artifactMode: "whether.artifact.mode",
} as const satisfies Record<"focus" | LiteracyAssistMode | "artifactMode", string>;

export const artifactModeLabels: Record<ArtifactMode, string> = {
  operator: "Weekly brief",
  explainer: "Explainer brief",
};

export const literacyFocusLabels: Record<LiteracyAssistMode, string> = {
  decision: "What to do",
  evidence: "Why it changed",
  trust: "Can I rely on it?",
  share: "What to send",
};
