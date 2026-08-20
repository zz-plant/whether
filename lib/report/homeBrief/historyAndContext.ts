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
};

export const buildWhyThisCall = ({
  tightnessGap,
  riskGap,
  tightnessNow,
  riskNow,
  tightnessThreshold,
  riskThreshold,
  tightnessDirection,
  riskDirection,
  reportDynamics,
  transitionWatch,
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
}): WhyThisCallItem[] => {
  const nearestIsTightness = tightnessGap <= riskGap;
  const nearestGap = nearestIsTightness ? tightnessGap : riskGap;
  const boundaryLabel = nearestIsTightness ? "Funding pressure" : "Risk appetite";
  const boundaryNow = nearestIsTightness ? tightnessNow : riskNow;
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
      label: "Distance to regime change",
      detail: `${boundaryLabel} is ${nearestGap.toFixed(1)} points from its ${boundaryThreshold.toFixed(1)} line. If it ${boundaryDirection} ${boundaryThreshold.toFixed(1)}, ${boundaryConsequence}.`,
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
          ? "Transition watch is on. Hold net-new headcount, multi-quarter vendors, and irreversible roadmap expansion until the next live weekly refresh confirms the call."
          : "Transition watch is off. Use this live read for this week's approvals and apply the thresholds in the current call.",
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
        "First review this cycle. Start with the current posture call, then set your first bounded operating decision.",
      items: [],
    };
  }

  if (!hasMeaningfulDelta) {
    return {
      isReturningUser: true,
      hasMeaningfulDelta: false,
      fallbackCopy:
        `No change. Last week's calls stand. ${heldDecision} Re-check when: ${reversalTrigger}`,
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
      href: "/answer" as const,
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
      `The guardrail to hold is: ${guardrail}`,
      `The call flips when: ${reversalTrigger}`,
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
