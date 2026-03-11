import { evaluateSeoQualityGates } from "./seoQualityGates";

export type SeoPageIndexEligibilityInput = {
  currentCall?: string;
  immediateAction?: string;
  triggerThreshold?: string;
  reversalCondition?: string;
  evidenceCount?: number;
  fetchedAtIso?: string;
  isFallbackSnapshot?: boolean;
  provenanceStatusLabel?: string;
  freshnessWindowHours?: number;
};

export type SeoPageIndexEligibilityResult = {
  eligible: boolean;
  reasons: string[];
};

export const isSeoPageIndexEligible = (
  input: SeoPageIndexEligibilityInput,
  now: Date = new Date(),
): SeoPageIndexEligibilityResult => {
  const result = evaluateSeoQualityGates({
    pageKey: "metadata-eligibility",
    currentCall: input.currentCall,
    immediateAction: input.immediateAction,
    triggerThreshold: input.triggerThreshold,
    reversalCondition: input.reversalCondition,
    evidenceCount: input.evidenceCount,
    fetchedAtIso: input.fetchedAtIso,
    isFallbackSnapshot: input.isFallbackSnapshot,
    provenanceStatusLabel: input.provenanceStatusLabel,
    freshnessWindowHours: input.freshnessWindowHours,
    trustSummary: "metadata",
    citationMeta: "metadata",
    confidenceLabel: "metadata",
    fallbackLabel: "metadata",
    provenanceLinks: ["metadata"],
  }, now);

  return {
    eligible: result.eligible,
    reasons: result.reasons,
  };
};
