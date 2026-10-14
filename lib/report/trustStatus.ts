import type { RegimeDiagnostics } from "../regimeEngine";
import { MARGIN_LABEL, formatMarginBand, publicDecisionLabels, type CompactFreshnessMeta } from "./reportFormatting";
import { DECISION_CONTRACT_LABELS, type PolicyHoldCall } from "./reportCopy";
import type { RegimeStateTransition } from "../regimeStateMachine";

type TrustStatusTone = "stable" | "warning" | "historical";

type TrustOutageSeverity = "advisory" | "blocking" | "critical";

type TrustOutageType = "live-data" | "feed-unavailable" | "stale-cache" | "source-divergence" | "historical-snapshot";

type TrustApprovalBucket = {
  label: "Allowed now" | "Hold" | "Blocked";
  detail: string;
};

type TrustRecoveryPlan = {
  owner: string;
  nextCheckpoint: string;
  exitCondition: string;
};

type TrustExitGateCriterion = {
  key: "live-mode" | "freshness" | "confidence";
  label: string;
  met: boolean;
};

type TrustExitGate = {
  label: string;
  summary: string;
  metCount: number;
  totalCount: number;
  criteria: TrustExitGateCriterion[];
};

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

const buildOutageExitGate = ({
  isFallback,
  confidenceLow,
  freshnessUnavailable,
}: {
  isFallback: boolean;
  confidenceLow: boolean;
  freshnessUnavailable: boolean;
}): TrustExitGate => {
  const criteria: TrustExitGateCriterion[] = [
    {
      key: "live-mode",
      label: "Live data is back",
      met: !isFallback,
    },
    {
      key: "freshness",
      label: "The reading carries a fresh timestamp",
      met: !freshnessUnavailable,
    },
    {
      key: "confidence",
      label: "The scores are clear of a change line",
      met: !confidenceLow,
    },
  ];
  const metCount = criteria.filter((criterion) => criterion.met).length;

  return {
    label: "The hold lifts once all three are true.",
    summary: `${metCount} of ${criteria.length} are true on this refresh.`,
    metCount,
    totalCount: criteria.length,
    criteria,
  };
};

const ALLOWED_DETAILS: Record<TrustStatusTone, [string, string, string]> = {
  historical: [
    "Reading a past week and testing a plan against it.",
    "Any change to this week's plan, until you are back on the current week.",
    "New fixed-cost commitments.",
  ],
  warning: [
    "Changes you can undo, inside the pause lines already set.",
    "New hires and multi-quarter vendor contracts.",
    "Anything you can't undo, until one live refresh lands.",
  ],
  stable: [
    "This week's normal approvals under the current guidance.",
    "Nothing extra.",
    "Nothing.",
  ],
};

const buildApprovalBuckets = ({
  tone,
}: {
  tone: TrustStatusTone;
}): TrustApprovalBucket[] => {
  const [allowed, hold, blocked] = ALLOWED_DETAILS[tone];
  return [
    { label: "Allowed now", detail: allowed },
    { label: "Hold", detail: hold },
    { label: "Blocked", detail: blocked },
  ];
};

const buildRecoveryPlan = ({
  tone,
}: {
  tone: TrustStatusTone;
}): TrustRecoveryPlan => {
  if (tone === "warning") {
    return {
      owner: "Whoever owns the plan",
      nextCheckpoint: "Daily, until live data is back",
      exitCondition: "Every source has answered once with live data.",
    };
  }

  if (tone === "historical") {
    return {
      owner: "Whoever owns the plan",
      nextCheckpoint: "Before acting on it",
      exitCondition: "You are reading the current week, not a past one.",
    };
  }

  return {
    owner: "Whoever owns the plan",
    nextCheckpoint: "The next weekly review",
    exitCondition: "The scores are clear of a change line.",
  };
};

const resolveOutageClassification = ({
  historicalSelection,
  isFallback,
  fallbackReason,
}: {
  historicalSelection: boolean;
  isFallback: boolean;
  fallbackReason?: string;
}): { outageType: TrustOutageType; outageSeverity: TrustOutageSeverity } => {
  if (historicalSelection) {
    return { outageType: "historical-snapshot", outageSeverity: "advisory" };
  }

  if (!isFallback) {
    return { outageType: "live-data", outageSeverity: "advisory" };
  }

  const normalizedReason = fallbackReason?.toLowerCase() ?? "";

  if (normalizedReason.includes("timeout") || normalizedReason.includes("unavailable") || normalizedReason.includes("down")) {
    return { outageType: "feed-unavailable", outageSeverity: "critical" };
  }

  if (normalizedReason.includes("diverg") || normalizedReason.includes("anomal")) {
    return { outageType: "source-divergence", outageSeverity: "blocking" };
  }

  return { outageType: "stale-cache", outageSeverity: "blocking" };
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
      mitigationCheck: "Wait for the next live update before approving anything you can't undo.",
    });
  }

  if (
    confidenceLabel === "LOW" &&
    transitionWatch === "ON" &&
    (changedSignals.length >= 2 || hasStrongSignalDisagreement(changedSignals))
  ) {
    warnings.push({
      id: "boundary-whipsaw",
      warning: "Conditions sit near a line and the scores moved both ways this week.",
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
    return `Cached snapshot (${normalizedFreshness}). Live data is late; hold anything you can't undo until it lands.`;
  }

  if (confidenceLabel !== "HIGH") {
    return `${MARGIN_LABEL}: ${formatMarginBand(confidenceLabel).toLowerCase()} (${normalizedFreshness}). Hold anything you can't undo until the scores are clear of the line.`;
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
  partlyCached: "Partly cached",
  cachedSnapshot: "Cached snapshot",
  historical: "Historical snapshot",
} as const;

type DataStatusKey = keyof typeof DATA_STATUS_LABELS;

/**
 * What each data state means for approvals, in one sentence each. The homepage
 * banner, the freshness popover and the export panel used to word this four
 * different ways for the same boolean; a reader comparing them could not tell
 * whether they described one state or three.
 */
const DATA_STATUS_GUIDANCE: Record<DataStatusKey, string> = {
  live: "All sources live and current.",
  partlyCached: "Some sources are cached. Hold anything you can't undo until every source is current.",
  cachedSnapshot: "Live data is late. Keep last week's plan; hold new hires, spend and vendor contracts until it returns.",
  historical: "Historical snapshot. Compare against the live read before changing current plans.",
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
  /** @deprecated No longer read. The headline is derived from state, not sniffed from prose. */
  trustStatusDetail?: string;
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
    ? `${DATA_STATUS_LABELS.live} · close to a change line`
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
      detail: "Live data is late. Keep last week's plan; anything you can't undo can wait for it.",
    };
  }

  /* A held week's reason outranks the generic one: missing inputs also lower the
     confidence, and "close to a line" was printed for a week held because its
     inputs were missing. */
  if (confidenceLabel === "LOW") {
    return {
      label: "Hold",
      tone: "warning",
      detail: `${policyHold ? policyHold.currentCall : "Conditions sit close to a line."} Keep last week's plan; anything you can't undo can wait for a clearer reading.`,
    };
  }

  if (policyHold) {
    return {
      label: "Act with caution",
      tone: "warning",
      detail: `${policyHold.currentCall} Keep approvals reversible.`,
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
        : "The scores are within reach of a change line. Act on moves you can undo; hold the rest until they are clear of it.",
    };
  }

  /* Points back to the guidance rather than past it: "Nothing here argues for
     holding back this week" read as this week's action under guidance to
     freeze new commitments, the reason `buildTrustStatus`'s detail lost it. */
  return {
    label: "Act",
    tone: "stable",
    detail: "Live data, with the scores clear of the change lines. This week's guidance and its pause lines apply as written.",
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
 * The status block a reader pastes into meeting notes: the conditions, the
 * reading's dates, how sure it is, what would change it and what to do now.
 *
 * Built on /trust until 2026-10-08 and offered there as "Meeting snippet"; it is
 * one of /share's formats now, beside the brief's other pastes, and is built
 * here so the two pages could never have printed different blocks.
 */
export const buildMeetingSnippet = ({
  statusLabel,
  recordDateLabel,
  freshnessLabel,
  confidenceLabel,
  isFallbackSnapshot,
  isHistoricalSelection,
  flipThreshold,
  guidance,
}: {
  statusLabel: string;
  recordDateLabel: string;
  freshnessLabel: string;
  confidenceLabel: "HIGH" | "MED" | "LOW";
  isFallbackSnapshot: boolean;
  isHistoricalSelection: boolean;
  flipThreshold: string;
  /** The week's headline action as a paste leads with it (`weeklyHeadline(…).composed`). */
  guidance: string;
}) => {
  /* The margin rides in the trust line ("Margin: clear of the line (…)"), so it is
     stated once; the two dates say which is which (2026-10-09). */
  const trustSummary = buildCompactTrustSummary({ confidenceLabel, freshnessLabel, isFallbackSnapshot, isHistoricalSelection });
  return [
    `Conditions: ${statusLabel}`,
    `Data as of: ${recordDateLabel}`,
    `Checked: ${freshnessLabel}`,
    `Trust: ${trustSummary}`,
    `${DECISION_CONTRACT_LABELS.watch.postureFlips}: ${flipThreshold}`,
    `${publicDecisionLabels.call}: ${guidance}`,
  ].join("\n");
};

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
  confidenceLabel = "MED",
  freshnessLabel = FALLBACK_FRESHNESS_LABEL,
  freshnessState,
  policyHold = null,
  historicalMacroCoverageLabel,
}: {
  historicalSelection: boolean;
  isFallback: boolean;
  fallbackReason?: string;
  historicalAction: string;
  fallbackAction: string;
  stableAction: string;
  confidenceLabel?: "HIGH" | "MED" | "LOW";
  freshnessLabel?: string;
  freshnessState?: Partial<SourceFreshnessState>;
  /** Set when the guidance is held: the held guidance for the reason it is held (`describePolicyHold`). */
  policyHold?: PolicyHoldCall | null;
  historicalMacroCoverageLabel?: string | null;
}) => {
  const confidenceLow = confidenceLabel === "LOW";
  const resolvedFreshness = resolveFreshnessState({
    freshnessLabel,
    freshnessState,
    isFallbackSnapshot: isFallback,
    isHistoricalSelection: historicalSelection,
  });
  const freshnessUnavailable = resolvedFreshness.freshnessStatus === "unknown";
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
      ? `Live data is late; this is a cached reading. Keep last week's plan and hold anything you can't undo until it returns.${fallbackReason ? ` (${fallbackReason})` : ""}`
      : policyHold
        ? `${policyHold.currentCall} Hold approvals.`
      /* About the data, not the decision: "nothing here argues for holding
         back" read as this week's action in a week whose guidance was to
         freeze new commitments. */
      : "Every source answered, so this week's guidance rests on current data.";

  const action = historicalSelection
    ? `${historicalAction} Switch to current live data before changing spending pace.`
    : isFallback
      ? `${fallbackAction} ${DECISION_CONTRACT_LABELS.reversal.resumeWhen}: live data returns from every source.`
      : policyHold
        ? `Keep approvals reversible. ${DECISION_CONTRACT_LABELS.reversal.resumeWhen}: ${policyHold.holdsUntil}.`
      : stableAction;

  const tone: TrustStatusTone = historicalSelection
    ? "historical"
    : isFallback || policyHold
      ? "warning"
      : "stable";

  const classification = resolveOutageClassification({
    historicalSelection,
    isFallback,
    fallbackReason,
  });

  const outageWindow = historicalSelection
    ? "A past week. Not for live approvals."
    : isFallback
      ? "Only moves you can undo, until a live update lands."
      : policyHold
        ? `Only moves you can undo, until ${policyHold.holdsUntil}.`
      : "Use this live reading for this week's approvals; the pause lines in this week's guidance apply.";

  const outageExitGate = buildOutageExitGate({
    isFallback,
    confidenceLow,
    freshnessUnavailable,
  });

  return {
    trustStatusLabel: label,
    trustStatusDetail: detail,
    trustStatusAction: action,
    trustStatusTone: tone,
    outageType: classification.outageType,
    outageSeverity: classification.outageSeverity,
    decisionImpactWindow: outageWindow,
    approvalBuckets: buildApprovalBuckets({ tone }),
    recoveryPlan: buildRecoveryPlan({ tone }),
    outageExitGate,
  };
};

export const buildTrustMarker = ({
  confidenceLabel,
  freshnessMeta,
  isFallbackSnapshot,
  isHistoricalSelection = false,
}: {
  confidenceLabel: "HIGH" | "MED" | "LOW";
  freshnessMeta: CompactFreshnessMeta;
  isFallbackSnapshot: boolean;
  isHistoricalSelection?: boolean;
}) => {
  const trustSummary = buildCompactTrustSummary({
    confidenceLabel,
    freshnessLabel: freshnessMeta.updatedAtLabel,
    isFallbackSnapshot,
    isHistoricalSelection,
  });
  const degraded = isFallbackSnapshot || freshnessMeta.maxAge === "stale" || confidenceLabel === "LOW";
  const label = isHistoricalSelection
    ? "Historical snapshot"
    : degraded
      ? "Degraded trust"
      : "Live trust";
  const tone: "stable" | "warning" | "historical" = isHistoricalSelection
    ? "historical"
    : degraded
      ? "warning"
      : "stable";

  return {
    label,
    tone,
    degraded,
    summaryLine: freshnessMeta.line,
    detail: trustSummary,
  };
};
