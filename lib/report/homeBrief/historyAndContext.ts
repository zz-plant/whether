import { getWeeklyPostureHistory } from "../../summary/weeklyPostureHistory";
import { REGIME_SHORT_LABELS } from "../../regimePresentation";
import { deriveSectorAdjustedPosture, SECTOR_TAXONOMY } from "../sectorSensitivity";
import { joinSentences, regimeSignalLabelByKey } from "../reportFormatting";
import { isImprovingSignalDelta } from "../reportData";
import type {
  BoundaryDirection,
  FlipRiskMeterState,
  HistoricalTimelineItem,
  HomeBriefTrustWarning,
  HomeReportData,
  MacroOverlayItem,
  MemoryRailItem,
  Regime,
  SignalChange,
  WhyThisCallItem,
} from "../homeBriefModel";
import type { WeeklyDecisionCardViewModel } from "../homeBriefModel";

export const buildMemoryRail = (
  recordDateLabel: string | undefined,
  currentRegime: Regime,
): MemoryRailItem[] => {
  const priorEntries = getWeeklyPostureHistory()
    .filter((entry) => (recordDateLabel ? entry.record_date !== recordDateLabel : true))
    .slice(-3)
    .map((entry) => ({
      label: entry.record_date,
      posture: REGIME_SHORT_LABELS[entry.regime],
    }));

  return [
    ...priorEntries,
    {
      label: recordDateLabel ?? "Current",
      posture: REGIME_SHORT_LABELS[currentRegime],
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
    { label: "Current", posture: REGIME_SHORT_LABELS[currentRegime], isCurrent: true },
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
      posture: REGIME_SHORT_LABELS[entry.regime],
      month: entry.month,
      year: entry.year,
      recordDate: entry.recordDate,
      summary: entry.summary,
      isCurrent: `${entry.year}-${entry.month}` === currentKey,
    };
  });
};

const formatDelta = (value: number | null, positiveIsImproving: boolean) => {
  if (value === null || Number.isNaN(value) || value === 0) {
    return "→ unchanged";
  }

  const improving = positiveIsImproving ? value > 0 : value < 0;
  const arrow = improving ? "↑" : "↓";
  const direction = improving ? "improving" : "deteriorating";
  return `${arrow} ${direction}`;
};

const getMacroSeriesDelta = (
  macroSeries: HomeReportData["macroSeries"],
  id: NonNullable<HomeReportData["macroSeries"]>[number]["id"],
) => {
  const series = macroSeries?.find((reading) => reading.id === id);
  const latest = typeof series?.value === "number" ? series.value : null;
  const history = series?.history ?? [];
  const previousValue = history.length >= 2 ? history[history.length - 2]?.value : null;
  const previous = typeof previousValue === "number" ? previousValue : null;
  const delta = typeof latest === "number" && typeof previous === "number" ? latest - previous : null;

  return { latest, delta };
};

const sectorActionBiasCopy = {
  loosen: "Run a step ahead of the base call.",
  tighten: "Run a step behind the base call.",
  hold: "Hold the base call as written.",
} as const;

const describeSectorOverlay = (
  overlay: ReturnType<typeof deriveSectorAdjustedPosture>,
): string => {
  const bias = sectorActionBiasCopy[overlay.actionBias];

  if (overlay.adjustmentStrength === "none") {
    return `${overlay.adjustedPostureLabel}, with no meaningful sector tilt. ${bias}`;
  }

  const tilt = overlay.adjustmentDelta > 0 ? "upside" : "downside";
  return `${overlay.adjustedPostureLabel}, a ${overlay.adjustmentStrength} ${tilt} tilt against the base posture. ${bias}`;
};

export const buildMacroOverlay = (
  macroSeries: HomeReportData["macroSeries"],
  assessment: HomeReportData["assessment"],
  overlaySector: NonNullable<Parameters<typeof deriveSectorAdjustedPosture>[1]>,
): MacroOverlayItem[] => {
  const vcFunding = getMacroSeriesDelta(macroSeries, "VC_FUNDING_VELOCITY");
  const layoffs = getMacroSeriesDelta(macroSeries, "TECH_LAYOFF_TREND");
  const ipoWindow = getMacroSeriesDelta(macroSeries, "VIX_INDEX");
  const saasValuations = getMacroSeriesDelta(macroSeries, "SAAS_VALUATION_MULTIPLE");

  const sectorOverlay = deriveSectorAdjustedPosture(assessment, overlaySector);
  const sectorLabel = SECTOR_TAXONOMY[overlaySector].label;

  return [
    {
      label: "VC funding",
      detail: `${typeof vcFunding.latest === "number" ? vcFunding.latest.toFixed(1) : "n/a"} · ${formatDelta(vcFunding.delta, true)}`,
    },
    {
      label: "Startup layoffs",
      detail: `${typeof layoffs.latest === "number" ? layoffs.latest.toFixed(1) : "n/a"} · ${formatDelta(layoffs.delta, false)}`,
    },
    {
      label: "IPO window (VIX)",
      detail: `${typeof ipoWindow.latest === "number" ? ipoWindow.latest.toFixed(1) : "n/a"} · ${formatDelta(ipoWindow.delta, false)}`,
    },
    {
      label: "SaaS multiples",
      detail: `${typeof saasValuations.latest === "number" ? saasValuations.latest.toFixed(1) : "n/a"} · ${formatDelta(saasValuations.delta, true)}`,
    },
    {
      label: `Sector sensitivity (${sectorLabel})`,
      detail: describeSectorOverlay(sectorOverlay),
    },
  ];
};

const describeSignalDirection = (
  signal: SignalChange,
): "improved" | "deteriorated" | "held flat" => {
  if (signal.delta === 0) {
    return "held flat";
  }

  return isImprovingSignalDelta(signal.key, signal.delta) ? "improved" : "deteriorated";
};

const overallDirectionCopy: Record<string, string> = {
  improving: "the signal set is improving overall",
  deteriorating: "the signal set is deteriorating overall",
  mixed: "the signal set is split overall",
  stable: "the signal set is otherwise flat",
};

export const buildWhyThisCall = ({
  tightnessGap,
  riskGap,
  reportDynamics,
  transitionWatch,
}: {
  tightnessGap: number;
  riskGap: number;
  reportDynamics: HomeReportData["reportDynamics"];
  transitionWatch: "ON" | "OFF";
}): WhyThisCallItem[] => {
  const nearestGap = Math.min(tightnessGap, riskGap);
  const boundaryCopy =
    nearestGap <= 5
      ? "close enough to trip on a single bad read"
      : nearestGap <= 12
        ? "close enough to be worth watching weekly"
        : "far enough that a single week will not move it";
  const changedSignal = reportDynamics?.changedSignals[0];

  return [
    {
      key: "distance-to-regime-change",
      label: "Distance to regime change",
      detail: `The nearest trigger is ${nearestGap.toFixed(1)} points away — ${boundaryCopy}.`,
    },
    {
      key: "momentum",
      label: "What moved this week",
      detail:
        changedSignal
          ? `${regimeSignalLabelByKey[changedSignal.key]} ${describeSignalDirection(changedSignal)}, and ${overallDirectionCopy[reportDynamics?.directionLabel ?? "stable"]}.`
          : "Nothing moved materially. This week's posture comes from where the signals already sit, not from new motion.",
    },
    {
      key: "signal-reliability",
      label: "Confidence",
      detail:
        transitionWatch === "ON"
          ? "Transition watch is on. Wait for the next release before committing anything you cannot undo."
          : "Transition watch is off. The signal set is steady enough for near-term planning.",
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
      detailLabel: "We need one more live update before we can size flip risk with confidence.",
      triggerLabel: "Flip trigger pending fresh data.",
    };
  }

  const pointsToFlip = Math.max(0, Math.round(regimeDistance.pointsToFlip));
  const clampedDistance = Math.min(pointsToFlip, 12);
  const progressPercent = Math.max(10, Math.round(((12 - clampedDistance) / 12) * 100));
  const triggerLabel = `${regimeDistance.dimensionLabel} ${regimeDistance.thresholdDirection === "riseAbove" ? "above" : "to or below"} ${regimeDistance.thresholdValue.toFixed(1)}.`;

  if (pointsToFlip <= 3) {
    return {
      progressPercent,
      urgencyLabel: "High",
      detailLabel: "We are close to a flip. Recheck major commitments before locking spend.",
      triggerLabel,
    };
  }

  if (pointsToFlip <= 6) {
    return {
      progressPercent,
      urgencyLabel: "Medium",
      detailLabel: "Flip risk is in play. Keep approvals reversible and review weekly.",
      triggerLabel,
    };
  }

  return {
    progressPercent,
    urgencyLabel: "Low",
    detailLabel: "There is room before a flip. Keep this week’s pace unless signals turn.",
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
}) => {
  const isReturningUser = historicalTimeline.length >= 2;
  const changedSignals = reportDynamics?.changedSignals ?? [];
  const hasMeaningfulDelta = Boolean(regimeAlert) || changedSignals.length > 0;

  if (!isReturningUser) {
    return {
      isReturningUser: false,
      hasMeaningfulDelta: false,
      fallbackCopy:
        "First review this cycle. Start with the current posture call, then set your first bounded operating decision.",
      items: [],
    };
  }

  if (!hasMeaningfulDelta) {
    return {
      isReturningUser: true,
      hasMeaningfulDelta: false,
      fallbackCopy:
        "No significant delta since your last review. Hold posture, keep current guardrails, and monitor thresholds before changing plans.",
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
      label: "Posture shift",
      detail: `Posture moved from ${REGIME_SHORT_LABELS[regimeAlert.previousRegime]} to ${REGIME_SHORT_LABELS[currentRegime]}. Re-check decision posture before committing irreversible work.`,
      href: "/resolve" as const,
    });
  }

  if (topDriver) {
    items.push({
      id: "top-driver" as const,
      label: "Top driver change",
      detail: joinSentences(
        `${regimeSignalLabelByKey[topDriver.key]} ${describeSignalDirection(topDriver)}`,
        topDriverEvidence?.immediateImplication
          ?? `That leaves ${overallDirectionCopy[trendLabel.toLowerCase()] ?? "the signal set otherwise flat"}`,
      ),
      href: "/evidence" as const,
    });
  }

  items.push({
    id: "trigger-risk" as const,
    label: "Trigger / risk change",
    detail: joinSentences(
      topFailureMode,
      `The guardrail to hold is: ${guardrail}`,
      `The call flips when: ${reversalTrigger}`,
    ),
    href: "/planning" as const,
  });

  return {
    isReturningUser: true,
    hasMeaningfulDelta: true,
    fallbackCopy: "",
    items: items.slice(0, 3),
  };
};
