export type LiteracyAssistMode = "decision" | "evidence" | "trust" | "share";

export type ArtifactMode = "operator" | "explainer";

export const literacyAssistStorageKeys = {
  focus: "whether.literacy.focus",
  decision: "whether.literacy.decisionHelp",
  evidence: "whether.literacy.evidenceHelp",
  trust: "whether.literacy.trustHelp",
  share: "whether.literacy.shareHelp",
  artifactMode: "whether.artifact.mode",
} as const satisfies Record<"focus" | LiteracyAssistMode | "artifactMode", string>;

export const artifactModeLabels: Record<ArtifactMode, string> = {
  operator: "Leadership team brief",
  explainer: "Plain-English brief",
};
