import type { RegimeDiagnostics } from "../regimeEngine";
import { MARGIN_LABEL, formatMarginBand, type CompactFreshnessMeta } from "./reportFormatting";
import { DECISION_CONTRACT_LABELS, type PolicyHoldCall } from "./reportCopy";
import type { RegimeStateTransition } from "../regimeStateMachine";
import { formatDateUTC } from "../formatters";

type TrustStatusTone = "stable" | "warning" | "historical";

export type TrustWarning = {
  id: "boundary-whipsaw" | "stale-cached" | "anomaly-divergence";
  warning: string;
  mitigationCheck: string;
};

export type DecisionReadinessState = {
  label: "Act" | "Act with caution" | "Hold";
  tone: TrustStatusTone;
  detail: string;
};

/**
 * The name for `DecisionReadinessState` where a reader sees it: whether this
 * reading can carry this week's decisions. It is not `DATA_CAVEAT_LABEL`,
 * which says what the state of the data adds; on a live week close to a line
 * the caveat is "None." and this verdict is the Hold.
 */
export const DECISION_READINESS_LABEL = "Decision readiness";

type SourceFreshnessState = Pick<
  CompactFreshnessMeta,
  "updatedAtLabel" | "freshnessStatus" | "mode" | "timestamp" | "ageHours"
>;

const FALLBACK_FRESHNESS_LABEL = "Unavailable";

const normalizeFreshnessLabel = (freshnessLabel: string) => {
  const trimmedLabel = freshnessLabel.trim();
  return trimmedLabel.length > 0 ? trimmedLabel : FALLBACK_FRESHNESS_LABEL;
};

const isUnavailableFreshness = (freshnessLabel: string) =>
  normalizeFreshnessLabel(freshnessLabel) === FALLBACK_FRESHNESS_LABEL;

const resolveFreshnessState = ({
  freshnessLabel,
  freshnessState,
  isFallbackSnapshot,
  isHistoricalSelection,
}: {
  freshnessLabel?: string;
  freshnessState?: Partial<SourceFreshnessState>;
  isFallbackSnapshot: boolean;
  isHistoricalSelection?: boolean;
}): SourceFreshnessState => {
  if (freshnessState?.updatedAtLabel && freshnessState.freshnessStatus && freshnessState.mode) {
    return {
      updatedAtLabel: normalizeFreshnessLabel(freshnessState.updatedAtLabel),
      freshnessStatus: freshnessState.freshnessStatus,
      mode: freshnessState.mode,
      timestamp: freshnessState.timestamp ?? null,
      ageHours: typeof freshnessState.ageHours === "number" ? freshnessState.ageHours : null,
    };
  }

  const normalizedFreshness = normalizeFreshnessLabel(freshnessLabel ?? FALLBACK_FRESHNESS_LABEL);
  return {
    updatedAtLabel: normalizedFreshness,
    freshnessStatus: isUnavailableFreshness(normalizedFreshness)
      ? "unknown"
      : isFallbackSnapshot
        ? "stale"
        : "fresh",
    mode: isHistoricalSelection ? "historical" : isFallbackSnapshot ? "cached" : "live",
    timestamp: null,
    ageHours: null,
  };
};

const hasStrongSignalDisagreement = (
  changedSignals: Array<{ delta: number }>,
) => {
  let positive = 0;
  let negative = 0;

  for (const signal of changedSignals) {
    if (signal.delta > 0) positive += 1;
    if (signal.delta < 0) negative += 1;
  }

  return positive > 0 && negative > 0;
};

export const buildTrustWarnings = ({
  confidenceLabel,
  transitionWatch,
  freshnessLabel,
  isFallbackSnapshot,
  provenanceStatusLabel,
  changedSignals,
  anomalySignals,
}: {
  confidenceLabel: "HIGH" | "MED" | "LOW";
  transitionWatch: "ON" | "OFF";
  freshnessLabel: string;
  isFallbackSnapshot: boolean;
  provenanceStatusLabel?: string;
  changedSignals: Array<{ delta: number }>;
  anomalySignals: Array<{ reason: string }>;
}): TrustWarning[] => {
  const warnings: TrustWarning[] = [];
  const staleSignal =
    isFallbackSnapshot ||
    isUnavailableFreshness(freshnessLabel) ||
    (provenanceStatusLabel?.toLowerCase().includes("cached") ?? false);

  if (staleSignal) {
    warnings.push({
      id: "stale-cached",
      warning: "No live reading: this is a cached snapshot.",
      mitigationCheck: "Wait for the next live update before committing to anything you can't undo.",
    });
  }

  if (
    confidenceLabel === "LOW" &&
    transitionWatch === "ON" &&
    (changedSignals.length >= 2 || hasStrongSignalDisagreement(changedSignals))
  ) {
    warnings.push({
      id: "boundary-whipsaw",
      warning: "Conditions are close to changing and the scores moved both ways this week.",
      mitigationCheck: "Wait for one more week that reads the same way before adding fixed costs.",
    });
  }

  if (anomalySignals.length >= 2) {
    warnings.push({
      id: "anomaly-divergence",
      warning: "Two or more inputs read as outliers this week, so the direction may be overstated.",
      mitigationCheck: "Check those inputs against the source pages before changing pace.",
    });
  }

  return warnings.slice(0, 2);
};

/**
 * Whether conditions could change at the next reading: yes when a score sits
 * inside the engine's near band (`transitionWatch`), or when the engine is
 * holding a change back for its confirming reading — the week conditions change
 * next reading if it holds, which a distance test alone reads as No.
 *
 * The one rule. The homepage model used to keep a second one — 8 points on the
 * one-scale distance, or any change since the month-end comparison — so on the
 * week of Sep 29, 2026 the homepage strip said "Not expected" and /brief.md said
 * "could change next week" about the same reading. A change since the month-end
 * has already passed its confirming reading; it says nothing about the next one.
 */
export const couldCallChangeNextWeek = (assessment: {
  diagnostics: Pick<RegimeDiagnostics, "transitionWatch">;
  regimeTransition?: Pick<RegimeStateTransition, "pending">;
}) => Boolean(assessment.diagnostics.transitionWatch || assessment.regimeTransition?.pending);

export const buildWeeklyTrustCueLine = ({
  confidenceLabel,
  freshnessLabel,
  transitionWatch,
}: {
  confidenceLabel: "HIGH" | "MED" | "LOW";
  freshnessLabel: string;
  transitionWatch: "ON" | "OFF";
}) => {
  /* "Not expected", as the trust strip says it: a score 6 points from its line
     is not "not close", only outside the band where the next reading could
     change conditions. */
  const changeWatch = transitionWatch === "ON" ? "Conditions could change next week" : "Conditions not expected to change next week";
  return `${MARGIN_LABEL}: ${formatMarginBand(confidenceLabel).toLowerCase()} · Freshness ${normalizeFreshnessLabel(freshnessLabel)} · ${changeWatch}`;
};
export const buildCompactTrustSummary = ({
  confidenceLabel,
  freshnessLabel,
  isFallbackSnapshot,
  isHistoricalSelection,
}: {
  confidenceLabel: "HIGH" | "MED" | "LOW";
  freshnessLabel: string;
  isFallbackSnapshot: boolean;
  isHistoricalSelection?: boolean;
}) => {
  const normalizedFreshness = normalizeFreshnessLabel(freshnessLabel);

  if (isHistoricalSelection) {
    return `Historical snapshot (${normalizedFreshness}). A past week, not this one; do not treat it like this week's.`;
  }

  if (isFallbackSnapshot) {
    return `Saved copy (${normalizedFreshness}). Live data is late; hold anything you can't undo until it lands.`;
  }

  if (confidenceLabel !== "HIGH") {
    return `${MARGIN_LABEL}: ${formatMarginBand(confidenceLabel).toLowerCase()} (${normalizedFreshness}). Hold anything you can't undo until there is more room.`;
  }

  return `${MARGIN_LABEL}: ${formatMarginBand(confidenceLabel).toLowerCase()} (${normalizedFreshness}). Fine to act on this week.`;
};

/**
 * The one vocabulary for "how live is the data behind this". Every badge that
 * states it — the freshness pill above the brief, the hero's provenance line,
 * the shell masthead on each report page, the Trust page's status card — reads
 * from here. They used to say DEGRADED, Trust clear, Trust constrained and All
 * systems operational about the same read at the same moment.
 */
const DATA_STATUS_LABELS = {
  /* "Live" alone was ambiguous beside a dated reading: it sounds like a claim
   * about the page ("this is live now") while the data is as-of its record
   * date and may be partly cached. What is live is the sources — the badge
   * says so. */
  live: "All sources live",
  partlyCached: "Partly current",
  cachedSnapshot: "Saved copy",
  historical: "Historical snapshot",
} as const;

type DataStatusKey = keyof typeof DATA_STATUS_LABELS;

/** What a saved copy holds, on every surface that states the saved-copy state. */
const SAVED_COPY_HOLD = "Keep your current plan; hold new hires, spend and vendor contracts until live data returns.";

/**
 * What each data state means for approvals, in one sentence each. The homepage
 * banner, the freshness popover and the export panel used to word this four
 * different ways for the same boolean; a reader comparing them could not tell
 * whether they described one state or three.
 */
const DATA_STATUS_GUIDANCE: Record<DataStatusKey, string> = {
  live: "All sources live and current.",
  partlyCached: "Some sources are saved copies. Hold anything you can't undo until every source is live.",
  cachedSnapshot: `Live data is late. ${SAVED_COPY_HOLD}`,
  historical: "Historical snapshot. Compare against the live read before changing current plans.",
};

const wholeMonthsBetween = (from: Date, to: Date) =>
  (to.getUTCFullYear() - from.getUTCFullYear()) * 12
  + (to.getUTCMonth() - from.getUTCMonth())
  - (to.getUTCDate() < from.getUTCDate() ? 1 : 0);

/**
 * How old a reading is, in the unit a reader would say it: "2 days old",
 * "3 weeks old", "4 months old". Null when the date does not parse.
 */
const describeReadingAge = (recordDate: string, now: Date): string | null => {
  const recorded = new Date(`${recordDate.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(recorded.getTime())) return null;
  const days = Math.max(0, Math.floor((now.getTime() - recorded.getTime()) / 86_400_000));
  const months = wholeMonthsBetween(recorded, now);
  const count = (value: number, unit: string) => `${value} ${unit}${value === 1 ? "" : "s"} old`;
  if (days < 1) return "less than a day old";
  if (days < 14) return count(days, "day");
  if (months < 2) return count(Math.floor(days / 7), "week");
  return count(months, "month");
};

/**
 * The saved copy's banner, which says how late "late" is (2026-11-02).
 *
 * The bundled copy a failed read falls back to was the Jun 17 reading on a page
 * read on Oct 21, and the banner said only "Live data is late". It now names the
 * reading and its age. Where the guidance is already held, the hero's call is
 * the instruction, so the banner states the facts alone: the two used to give
 * the hold twice, over different decisions and until different events
 * ("until it returns" over "until the missing inputs return").
 */
export const describeSavedCopyBanner = ({
  recordDate,
  now,
  guidanceHeld,
}: {
  recordDate: string;
  now: Date;
  /** The week's guidance is a hold, which the hero prints as its call. */
  guidanceHeld: boolean;
}) => {
  const age = describeReadingAge(recordDate, now);
  const reading = `Live data is late, so this is the ${formatDateUTC(recordDate)} reading${age ? `, ${age}` : ""}.`;
  return guidanceHeld ? reading : `${reading} ${SAVED_COPY_HOLD}`;
};

export const resolveDataStatusGuidance = (input: Parameters<typeof resolveDataStatus>[0]) =>
  DATA_STATUS_GUIDANCE[resolveDataStatus(input)];

const resolveDataStatus = ({
  isHistoricalSelection = false,
  isFallbackSnapshot = false,
  degradedSourceCount = 0,
}: {
  isHistoricalSelection?: boolean;
  isFallbackSnapshot?: boolean;
  degradedSourceCount?: number;
}): DataStatusKey =>
  isHistoricalSelection
    ? "historical"
    : isFallbackSnapshot
      ? "cachedSnapshot"
      : degradedSourceCount > 0
        ? "partlyCached"
        : "live";

export const resolveDataStatusLabel = (input: Parameters<typeof resolveDataStatus>[0]) =>
  DATA_STATUS_LABELS[resolveDataStatus(input)];

export const resolveTrustReadinessCopy = ({
  trustStatusTone,
  degradedSourceRows,
  isFallbackSnapshot = false,
}: {
  trustStatusTone: TrustStatusTone;
  degradedSourceRows?: Array<unknown>;
  isFallbackSnapshot?: boolean;
}): { tone: TrustStatusTone; headline: string } => {
  const status = resolveDataStatus({
    isHistoricalSelection: trustStatusTone === "historical",
    isFallbackSnapshot,
    degradedSourceCount: degradedSourceRows?.length ?? 0,
  });
  const tone: TrustStatusTone = status === "historical"
    ? "historical"
    : status !== "live" || trustStatusTone === "warning"
      ? "warning"
      : "stable";

  // A live feed under reduced confidence is still live; the qualifier says why the
  // tone is amber without inventing a second data state.
  const headline = status === "live" && tone === "warning"
    ? `${DATA_STATUS_LABELS.live} · close to a change`
    : DATA_STATUS_LABELS[status];

  return { tone, headline };
};

export const buildDecisionReadinessState = ({
  confidenceLabel,
  freshnessLabel,
  freshnessState,
  isFallbackSnapshot,
  isHistoricalSelection = false,
  policyHold = null,
}: {
  confidenceLabel: "HIGH" | "MED" | "LOW";
  freshnessLabel?: string;
  freshnessState?: Partial<SourceFreshnessState>;
  isFallbackSnapshot: boolean;
  isHistoricalSelection?: boolean;
  /** Set when the guidance is held: the held guidance for the reason it is held (`describePolicyHold`). */
  policyHold?: PolicyHoldCall | null;
}): DecisionReadinessState => {
  const resolvedFreshness = resolveFreshnessState({
    freshnessLabel,
    freshnessState,
    isFallbackSnapshot,
    isHistoricalSelection,
  });
  const freshnessWeak =
    resolvedFreshness.freshnessStatus === "stale" || resolvedFreshness.freshnessStatus === "unknown";

  if (isHistoricalSelection) {
    return {
      label: "Hold",
      tone: "historical",
      detail: "Historical snapshot. A past week, not this one.",
    };
  }

  if (freshnessWeak) {
    return {
      label: "Hold",
      tone: "warning",
      detail: "Live data is late. Keep your current plan; anything you can't undo can wait for it.",
    };
  }

  /* A held week's reason outranks the generic one: missing inputs also lower the
     confidence, and "close to a line" was printed for a week held because its
     inputs were missing. */
  if (confidenceLabel === "LOW") {
    return {
      label: "Hold",
      tone: "warning",
      detail: `${policyHold ? policyHold.currentCall : "Conditions are close to changing."} Keep your current plan; anything you can't undo can wait for a clearer reading.`,
    };
  }

  if (policyHold) {
    return {
      label: "Act with caution",
      tone: "warning",
      detail: `${policyHold.currentCall} Keep new commitments reversible.`,
    };
  }

  /* No check time in the detail: /brief.md prints the detail between two lines
     that state it, and "(Mar 1, 2026 00:00 UTC)" after "within reach of a
     change line" read as the line's date. */
  if (isFallbackSnapshot || confidenceLabel === "MED") {
    return {
      label: "Act with caution",
      tone: "warning",
      detail: isFallbackSnapshot
        ? "Cached reading. Act on moves you can undo; hold the rest until live data returns."
        : "The scores are within reach of a change. Act on moves you can undo; hold the rest until there is more room.",
    };
  }

  /* Points back to the guidance rather than past it: "Nothing here argues for
     holding back this week" read as this week's action under guidance to
     freeze new commitments, the reason `buildTrustStatus`'s detail lost it. */
  return {
    label: "Act",
    tone: "stable",
    detail: "Live data, with the scores clear of a change. This week's guidance applies as written.",
  };
};

export const buildWeeklyCitationMetaLine = ({
  statusLabel,
  confidenceLabel,
  recordDateLabel,
  freshnessLabel,
}: {
  statusLabel: string;
  confidenceLabel: "HIGH" | "MED" | "LOW";
  recordDateLabel: string;
  freshnessLabel: string;
}) =>
  `Conditions: ${statusLabel} · ${MARGIN_LABEL}: ${formatMarginBand(confidenceLabel).toLowerCase()} · Data as of ${recordDateLabel} · checked ${normalizeFreshnessLabel(freshnessLabel)}`;

/**
 * The name for `trustStatusAction` where a reader sees it: what the state of
 * the data asks of a reader on top of the guidance. It printed as "Action",
 * which is the decision contract's own word for the operating action
 * (`DECISION_CONTRACT_LABELS.slot.action`), so on the week of Sep 29, 2026
 * /brief.md's provenance section read "Action: … proceed with normal approval
 * flow" under guidance to freeze new commitments.
 */
export const DATA_CAVEAT_LABEL = "Data caveat";

export const buildTrustStatus = ({
  historicalSelection,
  isFallback,
  fallbackReason,
  historicalAction,
  fallbackAction,
  stableAction,
  policyHold = null,
  historicalMacroCoverageLabel,
}: {
  historicalSelection: boolean;
  isFallback: boolean;
  fallbackReason?: string;
  historicalAction: string;
  fallbackAction: string;
  stableAction: string;
  /** Set when the guidance is held: the held guidance for the reason it is held (`describePolicyHold`). */
  policyHold?: PolicyHoldCall | null;
  historicalMacroCoverageLabel?: string | null;
}) => {
  const historicalMacroCoverageDetail = historicalSelection && historicalMacroCoverageLabel
    ? ` Macro coverage: ${historicalMacroCoverageLabel}.`
    : "";

  const label = historicalSelection
    ? "Historical snapshot"
    : isFallback
      ? "Using cached data"
      /* Not "signals unstable": a hold is also missing inputs, and the detail
         below names which reason this one is. */
      : policyHold
        ? "Live data, but guidance held"
      : "Live · all sources answered";

  /* The hold's own sentence, which names its reason. This read "the two scores
     point in different directions" for every hold, then appended the stored
     reason, so a week held for missing inputs said both. */
  const detail = historicalSelection
    ? `A past week, not this one — not for live decisions.${historicalMacroCoverageDetail}`
    : isFallback
      ? `Live data is late; this is a cached reading. Keep your current plan and hold anything you can't undo until it returns.${fallbackReason ? ` (${fallbackReason})` : ""}`
      : policyHold
        ? `${policyHold.currentCall} Hold new commitments.`
      /* About the data, not the decision: "nothing here argues for holding
         back" read as this week's action in a week whose guidance was to
         freeze new commitments. */
      : "Every source answered, so this week's guidance rests on current data.";

  const action = historicalSelection
    ? `${historicalAction} Switch to current live data before changing spending pace.`
    : isFallback
      ? `${fallbackAction} ${DECISION_CONTRACT_LABELS.reversal.resumeWhen}: live data returns from every source.`
      : policyHold
        ? `Keep new commitments reversible. ${DECISION_CONTRACT_LABELS.reversal.resumeWhen}: ${policyHold.holdsUntil}.`
      : stableAction;

  const tone: TrustStatusTone = historicalSelection
    ? "historical"
    : isFallback || policyHold
      ? "warning"
      : "stable";

  return {
    trustStatusLabel: label,
    trustStatusDetail: detail,
    trustStatusAction: action,
    trustStatusTone: tone,
  };
};
