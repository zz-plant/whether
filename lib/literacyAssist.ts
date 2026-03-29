export type LiteracyAssistMode = "decision" | "evidence" | "trust" | "share";

export type ArtifactMode = "operator" | "explainer";

export const literacyAssistOptions: Array<{
  id: LiteracyAssistMode;
  label: string;
  description: string;
}> = [
  {
    id: "decision",
    label: "Recommend the move",
    description: "Translate the current read into what to do now, what to pause, and what would change the call.",
  },
  {
    id: "evidence",
    label: "Explain the evidence",
    description: "Translate the main signals and thresholds into plain operating language before you act.",
  },
  {
    id: "trust",
    label: "Show why this is reliable",
    description: "Translate freshness, confidence, and fallback state into a clear use-or-caution read.",
  },
  {
    id: "share",
    label: "Help me share this",
    description: "Translate the current call into the right brief, snapshot, or leadership artifact.",
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
  operator: "Operator brief",
  explainer: "Explainer brief",
};

export const literacyFocusLabels: Record<LiteracyAssistMode, string> = {
  decision: "Decision help",
  evidence: "Evidence help",
  trust: "Trust help",
  share: "Sharing help",
};
