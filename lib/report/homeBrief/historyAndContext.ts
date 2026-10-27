import { comparisonBasis, describeGuidanceStands } from "../comparisonBasis";
import { getWeeklyPostureHistory } from "../../summary/weeklyPostureHistory";
import { formatThresholdNumber } from "../../formatters";
import { REGIME_LABELS } from "../../regimePresentation";
import { formatBoundaryDistance, joinSentences, regimeSignalLabelByKey } from "../reportFormatting";
import { isImprovingSignalDelta } from "../reportData";
import type {
  FlipRiskMeterState,
  HistoricalTimelineItem,
  HomeBriefTrustWarning,
  HomeReportData,
  MemoryRailItem,
  Regime,
  SignalChange,
  WhyThisCallItem,
} from "../homeBriefModel";
import type { WeeklyDecisionCardViewModel } from "../homeBriefModel";
import { regimeSignalLabel } from "../signalTranslations";

export const buildMemoryRail = (
  recordDateLabel: string | undefined,
  currentRegime: Regime,
): MemoryRailItem[] => {
  const priorEntries = getWeeklyPostureHistory()
    .filter((entry) => (recordDateLabel ? entry.record_date !== recordDateLabel : true))
    .slice(-3)
    .map((entry) => ({
      label: entry.record_date,
      posture: REGIME_LABELS[entry.regime],
    }));

  return [
    ...priorEntries,
    {
      label: recordDateLabel ?? "Current",
      posture: REGIME_LABELS[currentRegime],
    },
  ].slice(-4);
};

export const buildHistoricalTimeline = ({
  currentRegime,
  regimeSeries,
  historicalSelection,
}: {
  currentRegime: Regime;
  regimeSeries?: HomeReportData["regimeSeries"];
  historicalSelection?: HomeReportData["historicalSelection"];
}): HistoricalTimelineItem[] => {
  const selectedYear = historicalSelection?.year;
  const selectedMonth = historicalSelection?.month;
  const fallback = [
    { label: "Current", posture: REGIME_LABELS[currentRegime], isCurrent: true },
  ];

  if (!regimeSeries || regimeSeries.length === 0) {
    return fallback;
  }

  const scopedSeries = regimeSeries
    .filter((entry) => {
      if (!selectedYear || !selectedMonth) {
        return true;
      }

      if (entry.year < selectedYear) {
        return true;
      }

      return entry.year === selectedYear && entry.month <= selectedMonth;
    })
    .slice(-8);

  if (scopedSeries.length === 0) {
    return fallback;
  }

  const currentKey =
    selectedYear && selectedMonth
      ? `${selectedYear}-${selectedMonth}`
      : `${scopedSeries[scopedSeries.length - 1]?.year}-${scopedSeries[scopedSeries.length - 1]?.month}`;

  return scopedSeries.map((entry) => {
    const labelDate = new Date(entry.recordDate);
    const isValidDate = !Number.isNaN(labelDate.valueOf());
    const label = isValidDate
      ? labelDate.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          timeZone: "UTC",
        })
      : entry.recordDate;

    return {
      label,
      posture: REGIME_LABELS[entry.regime],
      month: entry.month,
      year: entry.year,
      recordDate: entry.recordDate,
      summary: entry.summary,
      isCurrent: `${entry.year}-${entry.month}` === currentKey,
    };
  });
};

/**
 * "Freezing for 5 months", or the weather word alone.
 *
 * This replaced a stage word ("Freezing — Late (Fragile)") that the engine
 * derived from direction and distance to the line, and that a reader could only
 * decode on the glossary. A duration needs no definition. It is counted in
 * month-end readings, the only history the page has, and only while the latest
 * month-end agrees with this week's call: the monthly series can trail the
 * weekly call by up to five weeks, and a run of Sunny months printed beside a
 * Freezing call would contradict it. Under two months the count says nothing a
 * reader can use, so the word stands alone.
 */
export const formatRegimeWithDuration = ({
  label,
  currentRegime,
  regimeSeries,
  historicalSelection,
}: {
  label: string;
  currentRegime: Regime;
  regimeSeries?: HomeReportData["regimeSeries"];
  historicalSelection?: HomeReportData["historicalSelection"];
}): string => {
  const selectedYear = historicalSelection?.year;
  const selectedMonth = historicalSelection?.month;
  const scoped = (regimeSeries ?? []).filter(
    (entry) =>
      !selectedYear ||
      !selectedMonth ||
      entry.year < selectedYear ||
      (entry.year === selectedYear && entry.month <= selectedMonth),
  );
  let months = 0;
  for (let index = scoped.length - 1; index >= 0; index -= 1) {
    if (scoped[index]?.regime !== currentRegime) break;
    months += 1;
  }
  return months >= 2 ? `${label} for ${months} months` : label;
};

const describeSignalDirection = (
  signal: SignalChange,
): "improved" | "deteriorated" | "held flat" => {
  if (signal.delta === 0) {
    return "held flat";
  }

  return isImprovingSignalDelta(signal.key, signal.delta) ? "improved" : "deteriorated";
};

/**
 * Written as a clause that reads correctly both after "…, and" and on its own
 * as a sentence, so the same string can carry the momentum line and the
 * top-driver fallback without a carrier phrase gluing a verb onto a verb.
 */
const overallDirectionCopy: Record<string, string> = {
  improving: "the rest of the week's readings improved on balance",
  deteriorating: "the rest of the week's readings weakened on balance",
  mixed: "the rest of the week's readings pulled both ways",
  stable: "nothing else moved much",
  /* Unreachable while a signal is named beside it — a week with no comparison
     has no changed signals — and present so the map cannot answer "nothing else
     moved much" for a week nothing was compared. */
  unavailable: "the rest of the week was not compared against a previous reading",
};

export const buildWhyThisCall = ({
  tightnessGap,
  riskGap,
  tightnessThreshold,
  riskThreshold,
  tightnessDirection,
  riskDirection,
  reportDynamics,
  transitionWatch,
  pendingFlipDetail,
}: {
  tightnessGap: number;
  riskGap: number;
  tightnessNow: number;
  riskNow: number;
  tightnessThreshold: number;
  riskThreshold: number;
  tightnessDirection: "riseAbove" | "fallToOrBelow";
  riskDirection: "riseAbove" | "fallToOrBelow";
  reportDynamics: HomeReportData["reportDynamics"];
  transitionWatch: "ON" | "OFF";
  /** Set when the regime state machine already holds a pending quadrant change: replaces the
   *  distance line, which would otherwise measure a boundary the readings have already crossed. */
  pendingFlipDetail?: string;
}): WhyThisCallItem[] => {
  const nearestIsTightness = tightnessGap <= riskGap;
  const nearestGap = nearestIsTightness ? tightnessGap : riskGap;
  const boundaryLabel = nearestIsTightness ? regimeSignalLabel.tightness : regimeSignalLabel.riskAppetite;
  const boundaryThreshold = nearestIsTightness ? tightnessThreshold : riskThreshold;
  const boundaryDirection = (nearestIsTightness ? tightnessDirection : riskDirection) === "riseAbove"
    ? "rises above"
    : "falls to or below";
  const boundaryConsequence = nearestIsTightness
    ? "re-check fixed-cost approvals"
    : "re-check hiring and expansion approvals";
  const changedSignal = reportDynamics?.changedSignals[0];

  return [
    {
      key: "distance-to-regime-change",
      label: "How close conditions are to changing",
      detail: pendingFlipDetail ?? `${formatBoundaryDistance({ label: boundaryLabel, points: nearestGap, threshold: boundaryThreshold })} If it ${boundaryDirection} ${formatThresholdNumber(boundaryThreshold)}, ${boundaryConsequence}.`,
    },
    {
      key: "momentum",
      label: "What moved this week",
      detail:
        changedSignal
          ? `${regimeSignalLabelByKey[changedSignal.key]} ${describeSignalDirection(changedSignal)}, and ${overallDirectionCopy[reportDynamics?.directionLabel ?? "stable"]}.`
          : "Nothing moved materially. This week's guidance comes from where the signals already sit, not from new motion.",
    },
    {
      key: "signal-reliability",
      label: "Change watch",
      detail:
        transitionWatch === "ON"
          ? "On. Hold net-new headcount, multi-quarter vendors, and irreversible roadmap expansion until the next live weekly refresh confirms the guidance."
          : "Off. Use this live read for this week's approvals and apply the thresholds in the current guidance.",
    },
  ];
};

export const buildFlipRiskMeterState = (
  regimeDistance?: WeeklyDecisionCardViewModel["diagnostics"]["regimeDistance"],
): FlipRiskMeterState => {
  if (!regimeDistance || !Number.isFinite(regimeDistance.pointsToFlip)) {
    return {
      progressPercent: 8,
      urgencyLabel: "Unknown",
      detailLabel: "One more live reading is needed to tell how close conditions are to changing.",
      triggerLabel: "The line where conditions change needs a fresh reading.",
    };
  }

  const pointsToFlip = Math.max(0, Math.round(regimeDistance.pointsToFlip));
  const clampedDistance = Math.min(pointsToFlip, 12);
  const progressPercent = Math.max(10, Math.round(((12 - clampedDistance) / 12) * 100));
  const triggerLabel = `${regimeDistance.dimensionLabel} ${regimeDistance.thresholdDirection === "riseAbove" ? "above" : "to or below"} ${formatThresholdNumber(regimeDistance.thresholdValue)}.`;

  if (pointsToFlip <= 3) {
    return {
      progressPercent,
      urgencyLabel: "High",
      detailLabel: "Conditions are close to changing. Recheck major commitments before locking spend.",
      triggerLabel,
    };
  }

  if (pointsToFlip <= 6) {
    return {
      progressPercent,
      urgencyLabel: "Medium",
      detailLabel: "Conditions could change within weeks. Keep new commitments reversible and review weekly.",
      triggerLabel,
    };
  }

  return {
    progressPercent,
    urgencyLabel: "Low",
    detailLabel: "Conditions have room before they change. Keep this week’s pace unless signals turn.",
    triggerLabel,
  };
};

export const buildStartRouteDeltaBlock = ({
  currentRegime,
  regimeAlert,
  reportDynamics,
  evidenceItems,
  guardrail,
  reversalTrigger,
  failureModes,
  trendLabel,
  historicalTimeline,
  heldDecision,
}: {
  currentRegime: Regime;
  regimeAlert: HomeReportData["regimeAlert"];
  reportDynamics: HomeReportData["reportDynamics"];
  evidenceItems: NonNullable<HomeReportData["reportEvidenceItems"]>;
  guardrail: string;
  reversalTrigger: string;
  failureModes: HomeBriefTrustWarning[];
  trendLabel: string;
  historicalTimeline: HistoricalTimelineItem[];
  heldDecision: string;
}) => {
  const isReturningUser = historicalTimeline.length >= 2;
  const changedSignals = reportDynamics?.changedSignals ?? [];
  const hasMeaningfulDelta = Boolean(regimeAlert) || changedSignals.length > 0;

  if (!isReturningUser) {
    return {
      isReturningUser: false,
      hasMeaningfulDelta: false,
      fallbackCopy:
        "First review this cycle. Start with this week's guidance, then set your first bounded operating decision.",
      items: [],
    };
  }

  if (!hasMeaningfulDelta) {
    return {
      isReturningUser: true,
      hasMeaningfulDelta: false,
      fallbackCopy:
        `No change. ${describeGuidanceStands(comparisonBasis(reportDynamics?.comparedWith))} ${heldDecision} Re-check when: ${reversalTrigger}`,
      items: [],
    };
  }

  const topDriver = changedSignals[0];
  const topDriverEvidence = topDriver
    ? evidenceItems.find((item) => item.key === topDriver.key)
    : evidenceItems[0];
  const topFailureMode = failureModes[0]?.warning;
  const items = [];

  if (regimeAlert) {
    items.push({
      id: "posture-shift" as const,
      label: "Conditions changed",
      detail: `Conditions moved from ${REGIME_LABELS[regimeAlert.previousRegime]} to ${REGIME_LABELS[currentRegime]}. Re-check this week's guidance before committing anything you can't undo.`,
      href: "/operate" as const,
    });
  }

  if (topDriver) {
    items.push({
      id: "top-driver" as const,
      label: "Top driver change",
      detail: joinSentences(
        `${regimeSignalLabelByKey[topDriver.key]} ${describeSignalDirection(topDriver)}`,
        topDriverEvidence?.immediateImplication
          ?? overallDirectionCopy[trendLabel.toLowerCase()]
          ?? overallDirectionCopy.stable,
      ),
      href: "/signals" as const,
    });
  }

  items.push({
    id: "trigger-risk" as const,
    label: "Trigger / risk change",
    detail: joinSentences(
      topFailureMode,
      `The pause line: ${guardrail}`,
      `Conditions change if: ${reversalTrigger}`,
    ),
    href: "/operate" as const,
  });

  return {
    isReturningUser: true,
    hasMeaningfulDelta: true,
    fallbackCopy: "",
    items: items.slice(0, 3),
  };
};
