const DEFAULT_FRESHNESS_WINDOW_HOURS = 72;

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

const hasValue = (value?: string) => Boolean(value && value.trim().length > 0);

const isIndexableProvenance = (statusLabel?: string): boolean => {
  if (!hasValue(statusLabel)) return false;
  const normalized = statusLabel!.toLowerCase();
  return !["fallback", "cached", "unavailable", "stale", "simulated"].some((token) => normalized.includes(token));
};

export const isSeoPageIndexEligible = (
  input: SeoPageIndexEligibilityInput,
  now: Date = new Date(),
): SeoPageIndexEligibilityResult => {
  const reasons: string[] = [];

  if (!hasValue(input.currentCall) || !hasValue(input.immediateAction) || !hasValue(input.triggerThreshold) || !hasValue(input.reversalCondition)) {
    reasons.push("decision-incomplete");
  }

  if (!input.evidenceCount || input.evidenceCount <= 0) {
    reasons.push("decision-evidence-missing");
  }

  if (!isIndexableProvenance(input.provenanceStatusLabel)) {
    reasons.push("provenance-missing-or-degraded");
  }

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
    eligible: reasons.length === 0,
    reasons,
  };
};

