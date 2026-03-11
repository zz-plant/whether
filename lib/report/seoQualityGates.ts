const DEFAULT_FRESHNESS_WINDOW_HOURS = 72;

export type SeoQualityGateId =
  | "decision-completeness"
  | "freshness"
  | "uniqueness"
  | "thin-page"
  | "trust";

export type SeoQualityGateStatus = {
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

export type EvaluateSeoQualityGatesInput = {
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

const buildTrustGate = (input: EvaluateSeoQualityGatesInput): SeoQualityGateStatus => {
  const reasons: string[] = [];

  if ((input.provenanceLinks ?? []).filter((link) => hasValue(link)).length === 0) {
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

export const evaluateSeoQualityGates = (
  input: EvaluateSeoQualityGatesInput,
  now: Date = new Date(),
): SeoQualityGateResult => {
  const gates: Record<SeoQualityGateId, SeoQualityGateStatus> = {
    "decision-completeness": buildDecisionCompletenessGate(input),
    freshness: buildFreshnessGate(input, now),
    uniqueness: buildUniquenessGate(input),
    "thin-page": buildThinPageGate(input),
    trust: buildTrustGate(input),
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
