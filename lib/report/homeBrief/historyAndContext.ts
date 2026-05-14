import { getWeeklyPostureHistory } from "../../summary/weeklyPostureHistory";
import { REGIME_SHORT_LABELS } from "../../regimePresentation";
import { deriveSectorAdjustedPosture, SECTOR_TAXONOMY } from "../sectorSensitivity";
import { regimeSignalLabelByKey } from "../reportFormatting";
import { isImprovingSignalDelta } from "../reportData";
import type {
  BoundaryDirection,
  FlipRiskMeterState,
  HistoricalTimelineItem,
  HomeBriefFailureMode,
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
      detail:
        sectorOverlay.adjustmentStrength === "none"
          ? `${sectorOverlay.adjustedPostureLabel} (${sectorOverlay.postureVariant}); action bias: ${sectorOverlay.actionBias}.`
          : `${sectorOverlay.adjustedPostureLabel} (${sectorOverlay.adjustmentStrength} ${sectorOverlay.adjustmentDelta > 0 ? "upside" : "downside"} tilt, ${sectorOverlay.postureVariant}); action bias: ${sectorOverlay.actionBias}.`,
    },
  ];
};

const describeSignalDirection = (
  signal: SignalChange,
): "improving" | "deteriorating" | "held" => {
  if (signal.delta === 0) {
    return "held";
  }

  return isImprovingSignalDelta(signal.key, signal.delta) ? "improving" : "deteriorating";
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
  const boundaryLabel =
    nearestGap <= 5 ? "near threshold" : nearestGap <= 12 ? "within monitor range" : "well outside threshold";
  const changedSignal = reportDynamics?.changedSignals[0];

  return [
    {
      key: "distance-to-regime-change",
      label: "Distance to regime change",
      detail: `Nearest regime change trigger is ${nearestGap.toFixed(1)} points away (${boundaryLabel}).`,
    },
    {
      key: "momentum",
      label: "What moved this week",
      detail:
        reportDynamics?.changedSignals.length
          ? `${regimeSignalLabelByKey[changedSignal?.key ?? "tightness"]} ${changedSignal ? describeSignalDirection(changedSignal) : "held"} this week; ${reportDynamics.directionLabel} overall.`
          : "No material signal move this week; posture is driven by current levels and threshold distance.",
    },
    {
      key: "signal-reliability",
      label: "Signal reliability",
      detail:
        transitionWatch === "ON"
          ? "Transition watch is ON; check next release before irreversible commitments."
          : "Transition watch is OFF; signal set is stable for near-term planning.",
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
  failureModes: HomeBriefFailureMode[];
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
      detail: topDriverEvidence?.immediateImplication
        ? `${regimeSignalLabelByKey[topDriver.key]} ${describeSignalDirection(topDriver)}. ${topDriverEvidence.immediateImplication}`
        : `${regimeSignalLabelByKey[topDriver.key]} ${describeSignalDirection(topDriver)}; trend is ${trendLabel.toLowerCase()}.`,
      href: "/evidence" as const,
    });
  }

  items.push({
    id: "trigger-risk" as const,
    label: "Trigger / risk change",
    detail: topFailureMode
      ? `${topFailureMode} Guardrail now: ${guardrail} Flip when: ${reversalTrigger}`
      : `Guardrail now: ${guardrail} Flip when: ${reversalTrigger}`,
    href: "/planning" as const,
  });

  return {
    isReturningUser: true,
    hasMeaningfulDelta: true,
    fallbackCopy: "",
    items: items.slice(0, 3),
  };
};
