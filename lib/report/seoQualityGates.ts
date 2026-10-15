/** How old a reading may be and still be published as current. Shared with `lib/seo/freshnessIndexation.ts`. */
export const DEFAULT_FRESHNESS_WINDOW_HOURS = 72;

type SeoQualityGateId =
  | "decision-completeness"
  | "decision-transmission"
  | "freshness"
  | "uniqueness"
  | "thin-page"
  | "trust"
  | "artifact-readiness"
  | "canonical-progression";

type SeoQualityGateStatus = {
  passed: boolean;
  reasons: string[];
  details?: Record<string, unknown>;
};

export type SeoQualityGateResult = {
  eligible: boolean;
  noindex: boolean;
  reasons: string[];
  gates: Record<SeoQualityGateId, SeoQualityGateStatus>;
};

export type SeoQualitySiblingInput = {
  pageKey: string;
  interpretationLabel?: string;
  currentCall?: string;
  immediateAction?: string;
  evidenceTitles?: string[];
};

type EvaluateSeoQualityGatesInput = {
  pageKey: string;
  currentCall?: string;
  immediateAction?: string;
  triggerThreshold?: string;
  reversalCondition?: string;
  evidenceCount?: number;
  evidenceTitles?: string[];
  fetchedAtIso?: string;
  isFallbackSnapshot?: boolean;
  freshnessWindowHours?: number;
  trustSummary?: string;
  citationMeta?: string;
  provenanceStatusLabel?: string;
  provenanceLinks?: string[];
  confidenceLabel?: string;
  fallbackLabel?: string;
  interpretationLabel?: string;
  siblingsInCluster?: SeoQualitySiblingInput[];
  enforceLaunchChecklist?: boolean;
  scanSecondsEstimate?: number;
  hasDecisionBullets?: boolean;
  hasCopyableDecision?: boolean;
  linksToWeeklyBrief?: boolean;
  linksToDecideOrOperations?: boolean;
};

const hasValue = (value?: string) => Boolean(value && value.trim().length > 0);
const normalize = (value?: string) => (value ?? "").trim().toLowerCase();

const isIndexableProvenance = (statusLabel?: string): boolean => {
  if (!hasValue(statusLabel)) return false;
  const normalized = statusLabel!.toLowerCase();
  return !["fallback", "cached", "unavailable", "stale", "simulated"].some((token) => normalized.includes(token));
};

const buildDecisionCompletenessGate = (input: EvaluateSeoQualityGatesInput): SeoQualityGateStatus => {
  const reasons: string[] = [];
  if (!hasValue(input.currentCall) || !hasValue(input.immediateAction) || !hasValue(input.triggerThreshold) || !hasValue(input.reversalCondition)) {
    reasons.push("decision-incomplete");
  }
  if (!input.evidenceCount || input.evidenceCount <= 0) {
    reasons.push("decision-evidence-missing");
  }

  return {
    passed: reasons.length === 0,
    reasons,
    details: { evidenceCount: input.evidenceCount ?? 0 },
  };
};

const buildFreshnessGate = (input: EvaluateSeoQualityGatesInput, now: Date): SeoQualityGateStatus => {
  const reasons: string[] = [];
  if (input.isFallbackSnapshot) {
    reasons.push("fallback-snapshot");
  }

  const freshnessWindowHours = input.freshnessWindowHours ?? DEFAULT_FRESHNESS_WINDOW_HOURS;
  const fetchedAtMs = input.fetchedAtIso ? new Date(input.fetchedAtIso).getTime() : Number.NaN;
  if (Number.isNaN(fetchedAtMs)) {
    reasons.push("freshness-unknown");
  } else {
    const ageHours = (now.getTime() - fetchedAtMs) / (1000 * 60 * 60);
    if (ageHours > freshnessWindowHours) {
      reasons.push("freshness-stale");
    }
  }

  return {
    passed: reasons.length === 0,
    reasons,
  };
};

const buildUniquenessGate = (input: EvaluateSeoQualityGatesInput): SeoQualityGateStatus => {
  const siblings = (input.siblingsInCluster ?? []).filter((sibling) => sibling.pageKey !== input.pageKey);
  if (siblings.length === 0) {
    return { passed: true, reasons: [], details: { uniquenessScore: 1 } };
  }

  const pageEvidence = new Set((input.evidenceTitles ?? []).map(normalize).filter(Boolean));
  const siblingEvidence = new Set(
    siblings.flatMap((sibling) => (sibling.evidenceTitles ?? []).map(normalize)).filter(Boolean),
  );

  const hasDistinctDataPoint = [...pageEvidence].some((title) => !siblingEvidence.has(title));
  const interpretation = normalize(input.interpretationLabel ?? `${input.currentCall ?? ""}|${input.immediateAction ?? ""}`);
  const siblingInterpretations = new Set(
    siblings.map((sibling) => normalize(sibling.interpretationLabel ?? `${sibling.currentCall ?? ""}|${sibling.immediateAction ?? ""}`)),
  );
  const hasDistinctInterpretation = Boolean(interpretation) && !siblingInterpretations.has(interpretation);

  const uniquenessScore = (hasDistinctDataPoint ? 0.5 : 0) + (hasDistinctInterpretation ? 0.5 : 0);
  const reasons: string[] = [];
  if (!hasDistinctDataPoint && !hasDistinctInterpretation) {
    reasons.push("cluster-duplicate-no-distinct-datapoint-or-interpretation");
  }

  return {
    passed: reasons.length === 0,
    reasons,
    details: { uniquenessScore, siblingCount: siblings.length, hasDistinctDataPoint, hasDistinctInterpretation },
  };
};

const buildThinPageGate = (input: EvaluateSeoQualityGatesInput): SeoQualityGateStatus => {
  const reasons: string[] = [];

  const sectionCompleteness = [input.currentCall, input.immediateAction, input.triggerThreshold, input.reversalCondition, input.trustSummary, input.citationMeta]
    .filter((field) => hasValue(field)).length;

  if (sectionCompleteness < 6) {
    reasons.push("section-incomplete");
  }

  if ((input.evidenceCount ?? 0) < 1 || !hasValue(input.triggerThreshold) || !hasValue(input.reversalCondition)) {
    reasons.push("decision-value-below-minimum");
  }

  return {
    passed: reasons.length === 0,
    reasons,
    details: { sectionCompleteness },
  };
};

const estimateScanSeconds = (input: EvaluateSeoQualityGatesInput): number => {
  if (typeof input.scanSecondsEstimate === "number") return input.scanSecondsEstimate;

  const text = [input.currentCall, input.immediateAction, input.triggerThreshold, input.reversalCondition].filter(hasValue).join(" ");
  const words = text.split(/\s+/).filter(Boolean).length;
  const wordsPerMinute = 180;
  return Math.ceil((words / wordsPerMinute) * 60);
};

const buildDecisionTransmissionGate = (input: EvaluateSeoQualityGatesInput): SeoQualityGateStatus => {
  if (!input.enforceLaunchChecklist) {
    return { passed: true, reasons: [] };
  }

  const reasons: string[] = [];
  const scanSeconds = estimateScanSeconds(input);
  if (scanSeconds > 60) {
    reasons.push("decision-transmission-over-60s");
  }

  if (!hasValue(input.immediateAction) || !hasValue(input.triggerThreshold) || !hasValue(input.reversalCondition)) {
    reasons.push("decision-transmission-missing-bounded-rule");
  }

  return {
    passed: reasons.length === 0,
    reasons,
    details: { scanSeconds },
  };
};

const buildTrustGate = (input: EvaluateSeoQualityGatesInput): SeoQualityGateStatus => {
  const reasons: string[] = [];

  if (!(input.provenanceLinks ?? []).some((link) => hasValue(link))) {
    reasons.push("provenance-links-missing");
  }

  if (!hasValue(input.confidenceLabel)) {
    reasons.push("confidence-label-missing");
  }

  if (!hasValue(input.provenanceStatusLabel) || !isIndexableProvenance(input.provenanceStatusLabel)) {
    reasons.push("provenance-missing-or-degraded");
  }

  if (!hasValue(input.fallbackLabel)) {
    reasons.push("fallback-label-missing");
  }

  return {
    passed: reasons.length === 0,
    reasons,
  };
};

const buildArtifactReadinessGate = (input: EvaluateSeoQualityGatesInput): SeoQualityGateStatus => {
  if (!input.enforceLaunchChecklist) {
    return { passed: true, reasons: [] };
  }

  const reasons: string[] = [];
  if (!input.hasDecisionBullets) {
    reasons.push("artifact-missing-decision-bullets");
  }
  if (!input.hasCopyableDecision) {
    reasons.push("artifact-missing-copyable-decision");
  }

  return {
    passed: reasons.length === 0,
    reasons,
  };
};

const buildCanonicalProgressionGate = (input: EvaluateSeoQualityGatesInput): SeoQualityGateStatus => {
  if (!input.enforceLaunchChecklist) {
    return { passed: true, reasons: [] };
  }

  const reasons: string[] = [];
  if (!input.linksToWeeklyBrief) {
    reasons.push("canonical-link-weekly-brief-missing");
  }
  if (!input.linksToDecideOrOperations) {
    reasons.push("canonical-link-decide-or-operations-missing");
  }

  return {
    passed: reasons.length === 0,
    reasons,
  };
};

export const evaluateSeoQualityGates = (
  input: EvaluateSeoQualityGatesInput,
  now: Date = new Date(),
): SeoQualityGateResult => {
  const gates: Record<SeoQualityGateId, SeoQualityGateStatus> = {
    "decision-completeness": buildDecisionCompletenessGate(input),
    "decision-transmission": buildDecisionTransmissionGate(input),
    freshness: buildFreshnessGate(input, now),
    uniqueness: buildUniquenessGate(input),
    "thin-page": buildThinPageGate(input),
    trust: buildTrustGate(input),
    "artifact-readiness": buildArtifactReadinessGate(input),
    "canonical-progression": buildCanonicalProgressionGate(input),
  };

  const reasons = Object.values(gates).flatMap((gate) => gate.reasons);
  const eligible = reasons.length === 0;

  return {
    eligible,
    noindex: !eligible,
    reasons,
    gates,
  };
};
