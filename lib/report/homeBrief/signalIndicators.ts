import { buildSignalInfluence, DEFAULT_THRESHOLDS } from "../../regimeEngine";
import {
  formatConfidencePlainLabel,
  formatRegimeSignalValue,
  formatTrendArrow,
  regimeSignalLabelByKey,
  type RegimeSignalKey,
} from "../reportFormatting";
import { normalizeSignalContributions } from "../signalFormatting";
import type { NormalizedSignalContribution } from "../signalFormatting";
import type {
  HomeReportData,
  InputInfluenceItem,
  RegimeSignalIndicator,
} from "../homeBriefModel";

const signalSeriesByKey: Partial<
  Record<RegimeSignalKey, NonNullable<HomeReportData["macroSeries"]>[number]["id"]>
> = {
  tightness: "CHICAGO_FCI",
  riskAppetite: "VIX_INDEX",
};

const fallbackTrendDeltaByKey: Record<RegimeSignalKey, number | null> = {
  tightness: null,
  riskAppetite: null,
  baseRate: null,
  curveSlope: null,
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

export const buildRegimeSignalIndicators = ({
  assessment,
  reportDynamics,
  macroSeries,
}: {
  assessment: HomeReportData["assessment"];
  reportDynamics: HomeReportData["reportDynamics"];
  macroSeries: HomeReportData["macroSeries"];
}): RegimeSignalIndicator[] => {
  const changedSignals = reportDynamics?.changedSignals ?? [];

  const resolveSparkline = (key: RegimeSignalKey): number[] => {
    if (key === "tightness") {
      return [assessment.thresholds.tightnessRegime, assessment.scores.tightness];
    }
    if (key === "riskAppetite") {
      return [assessment.thresholds.riskAppetiteRegime, assessment.scores.riskAppetite];
    }
    if (key === "baseRate") {
      return typeof assessment.scores.baseRate === "number"
        ? [DEFAULT_THRESHOLDS.baseRateTightness, assessment.scores.baseRate]
        : [];
    }
    if (key === "curveSlope") {
      return typeof assessment.scores.curveSlope === "number"
        ? [0, assessment.scores.curveSlope]
        : [];
    }

    const seriesId = signalSeriesByKey[key];
    const series = seriesId ? macroSeries?.find((entry) => entry.id === seriesId) : undefined;
    const historyValues = (series?.history ?? [])
      .slice(-3)
      .map((entry) => entry.value)
      .filter((value): value is number => typeof value === "number");
    const latestValue = typeof series?.value === "number" ? [series.value] : [];
    const sparkline = [...historyValues, ...latestValue];
    return sparkline.length ? sparkline.slice(-4) : [];
  };

  const indicatorForSignal = (key: RegimeSignalKey): RegimeSignalIndicator => {
    if (key === "tightness" || key === "riskAppetite") {
      const rawValue = key === "tightness" ? assessment.scores.tightness : assessment.scores.riskAppetite;
      const changed = changedSignals.find((signal) => signal.key === key);
      const delta = changed?.delta ?? fallbackTrendDeltaByKey[key];
      return {
        key,
        label: regimeSignalLabelByKey[key],
        valueLabel: formatRegimeSignalValue(rawValue, key),
        rawValue,
        trendArrow: formatTrendArrow(delta),
        trendDeltaLabel: delta === null ? "No weekly delta" : `${delta > 0 ? "+" : ""}${delta.toFixed(1)} vs last week`,
        sparkline: resolveSparkline(key),
        isFallback: delta === null,
      };
    }

    if (key === "baseRate" || key === "curveSlope") {
      const rawValue =
        key === "baseRate"
          ? typeof assessment.scores.baseRate === "number"
            ? assessment.scores.baseRate
            : null
          : typeof assessment.scores.curveSlope === "number"
            ? assessment.scores.curveSlope
            : null;
      const changed = changedSignals.find((signal) => signal.key === key);
      const delta = changed?.delta ?? fallbackTrendDeltaByKey[key];
      return {
        key,
        label: regimeSignalLabelByKey[key],
        valueLabel: formatRegimeSignalValue(rawValue, key),
        rawValue,
        trendArrow: formatTrendArrow(delta),
        trendDeltaLabel: delta === null ? "No weekly delta" : `${delta > 0 ? "+" : ""}${delta.toFixed(1)} vs last week`,
        sparkline: resolveSparkline(key),
        isFallback: rawValue === null || delta === null,
      };
    }

    const seriesId = signalSeriesByKey[key];
    const macroDelta = seriesId
      ? getMacroSeriesDelta(macroSeries, seriesId)
      : { latest: null, delta: null };
    return {
      key,
      label: regimeSignalLabelByKey[key],
      valueLabel: formatRegimeSignalValue(macroDelta.latest, key),
      rawValue: macroDelta.latest,
      trendArrow: formatTrendArrow(macroDelta.delta),
      trendDeltaLabel:
        macroDelta.delta === null ? "No weekly delta" : `${macroDelta.delta > 0 ? "+" : ""}${macroDelta.delta.toFixed(1)} vs last week`,
      sparkline: resolveSparkline(key),
      isFallback: macroDelta.latest === null || macroDelta.delta === null,
    };
  };

  return (["tightness", "riskAppetite", "baseRate", "curveSlope"] as const).map((key) =>
    indicatorForSignal(key),
  );
};

const inputInfluenceKeyOrder: RegimeSignalKey[] = ["tightness", "riskAppetite", "baseRate", "curveSlope"];

const buildInputInfluenceFallback = ({
  assessment,
}: {
  assessment: HomeReportData["assessment"];
}) =>
  normalizeSignalContributions(
    buildSignalInfluence({
      tightness: assessment.scores.tightness,
      riskAppetite: assessment.scores.riskAppetite,
      baseRate: typeof assessment.scores.baseRate === "number" ? assessment.scores.baseRate : null,
      curveSlope:
        typeof assessment.scores.curveSlope === "number" ? assessment.scores.curveSlope : null,
      thresholds: {
        ...DEFAULT_THRESHOLDS,
        ...assessment.thresholds,
      },
    }),
  );

const buildInputInfluenceDescription = ({
  key,
  rawValue,
  assessment,
}: {
  key: RegimeSignalKey;
  rawValue: number | null;
  assessment: HomeReportData["assessment"];
}): Pick<
  InputInfluenceItem,
  | "pressureLabel"
  | "effectDetail"
  | "watchLabel"
  | "watchValue"
  | "watchDistanceLabel"
  | "watchBuffer"
  | "chartDomain"
  | "pressureDirection"
  | "tone"
> => {
  if (typeof rawValue !== "number") {
    return {
      pressureLabel: "Waiting on a fresh read",
      effectDetail: "This input is not carrying a current directional push into the call yet.",
      watchLabel: "Refresh pending",
      watchValue: null,
      watchDistanceLabel: "Watch line unavailable",
      watchBuffer: null,
      chartDomain: null,
      pressureDirection: "higher-is-worse",
      tone: "neutral",
    };
  }

  const buildChartDomain = ({
    current,
    threshold,
    buffer,
    minClamp,
    maxClamp,
  }: {
    current: number;
    threshold: number;
    buffer: number;
    minClamp?: number;
    maxClamp?: number;
  }) => {
    const padding = Math.max(buffer * 1.5, Math.abs(current - threshold) * 0.7, 0.1);
    const min = Math.min(current, threshold) - padding;
    const max = Math.max(current, threshold) + padding;
    return {
      min: typeof minClamp === "number" ? Math.min(min, minClamp) : min,
      max: typeof maxClamp === "number" ? Math.max(max, maxClamp) : max,
    };
  };

  if (key === "tightness") {
    const gap = rawValue - assessment.thresholds.tightnessRegime;
    const tightnessLine = assessment.thresholds.tightnessRegime.toFixed(1);
    const threshold = assessment.thresholds.tightnessRegime;
    const watchBuffer = 8;
    return gap >= 0
      ? {
          pressureLabel: gap >= 8 ? "Strong defensive pull" : "Defensive pull",
          effectDetail: `Funding pressure is ${rawValue.toFixed(1)}, which is ${gap.toFixed(1)} points above the watch line at ${tightnessLine}; approvals and fixed-cost tolerance stay tighter.`,
          watchLabel: `Watch line ${tightnessLine}`,
          watchValue: threshold,
          watchDistanceLabel: `${gap.toFixed(1)} pts above watch line`,
          watchBuffer,
          chartDomain: { min: 0, max: 100 },
          pressureDirection: "higher-is-worse",
          tone: "warning",
        }
      : {
          pressureLabel: Math.abs(gap) >= 8 ? "Expansion support" : "Room to loosen",
          effectDetail: `Funding pressure is ${rawValue.toFixed(1)}, which is ${Math.abs(gap).toFixed(1)} points below the watch line at ${tightnessLine}; the call has room to loosen if other inputs confirm.`,
          watchLabel: `Watch line ${tightnessLine}`,
          watchValue: threshold,
          watchDistanceLabel: `${Math.abs(gap).toFixed(1)} pts below watch line`,
          watchBuffer,
          chartDomain: { min: 0, max: 100 },
          pressureDirection: "higher-is-worse",
          tone: "positive",
        };
  }

  if (key === "riskAppetite") {
    const gap = rawValue - assessment.thresholds.riskAppetiteRegime;
    const riskLine = assessment.thresholds.riskAppetiteRegime.toFixed(1);
    const threshold = assessment.thresholds.riskAppetiteRegime;
    const watchBuffer = 8;
    return gap >= 0
      ? {
          pressureLabel: gap >= 8 ? "Strong expansion support" : "Expansion support",
          effectDetail: `Risk appetite is ${rawValue.toFixed(1)}, which is ${gap.toFixed(1)} points above the watch line at ${riskLine}; the call can carry larger reversible bets.`,
          watchLabel: `Watch line ${riskLine}`,
          watchValue: threshold,
          watchDistanceLabel: `${gap.toFixed(1)} pts above watch line`,
          watchBuffer,
          chartDomain: { min: 0, max: 100 },
          pressureDirection: "lower-is-worse",
          tone: "positive",
        }
      : {
          pressureLabel: Math.abs(gap) >= 8 ? "Risk-off pressure" : "Capping risk-taking",
          effectDetail: `Risk appetite is ${rawValue.toFixed(1)}, which is ${Math.abs(gap).toFixed(1)} points below the watch line at ${riskLine}; bet size and expansion appetite stay capped.`,
          watchLabel: `Watch line ${riskLine}`,
          watchValue: threshold,
          watchDistanceLabel: `${Math.abs(gap).toFixed(1)} pts below watch line`,
          watchBuffer,
          chartDomain: { min: 0, max: 100 },
          pressureDirection: "lower-is-worse",
          tone: "warning",
        };
  }

  if (key === "baseRate") {
    const gap = rawValue - DEFAULT_THRESHOLDS.baseRateTightness;
    const threshold = DEFAULT_THRESHOLDS.baseRateTightness;
    const watchBuffer = 0.25;
    const chartDomain = buildChartDomain({
      current: rawValue,
      threshold,
      buffer: 0.35,
      minClamp: 0,
    });
    if (gap > 0.25) {
      return {
        pressureLabel: "Payback pressure",
        effectDetail: `${gap.toFixed(1)} pts above the cost-of-money line, so long-payback work needs harder proof.`,
        watchLabel: `Cost-of-money line ${threshold.toFixed(1)}%`,
        watchValue: threshold,
        watchDistanceLabel: `${gap.toFixed(2)}% above watch line`,
        watchBuffer,
        chartDomain,
        pressureDirection: "higher-is-worse",
        tone: "warning",
      };
    }
    if (gap < -0.25) {
      return {
        pressureLabel: "Rate relief",
        effectDetail: `${Math.abs(gap).toFixed(1)} pts below the cost-of-money line, so rates are not the main drag on approvals.`,
        watchLabel: `Cost-of-money line ${threshold.toFixed(1)}%`,
        watchValue: threshold,
        watchDistanceLabel: `${Math.abs(gap).toFixed(2)}% below watch line`,
        watchBuffer,
        chartDomain,
        pressureDirection: "higher-is-worse",
        tone: "positive",
      };
    }
    return {
      pressureLabel: "Neutral rate read",
      effectDetail: "Rates are near the cost-of-money line, so they are not giving the model a strong directional shove.",
      watchLabel: `Cost-of-money line ${threshold.toFixed(1)}%`,
      watchValue: threshold,
      watchDistanceLabel: `${Math.abs(gap).toFixed(2)}% from watch line`,
      watchBuffer,
      chartDomain,
      pressureDirection: "higher-is-worse",
      tone: "neutral",
    };
  }

  const threshold = 0;
  const watchBuffer = 0.1;
  const chartDomain = buildChartDomain({
    current: rawValue,
    threshold,
    buffer: 0.12,
  });
  if (rawValue < -0.1) {
    return {
      pressureLabel: "Recession caution",
      effectDetail: "The curve is still inverted, so expansion confidence stays capped even if other inputs improve.",
      watchLabel: "Below 0.0% = inversion",
      watchValue: threshold,
      watchDistanceLabel: `${Math.abs(rawValue - threshold).toFixed(2)}% below watch line`,
      watchBuffer,
      chartDomain,
      pressureDirection: "lower-is-worse",
      tone: "warning",
    };
  }
  if (rawValue > 0.1) {
    return {
      pressureLabel: "Expansion confidence",
      effectDetail: "The curve is positive, which supports a looser call if tightness also cooperates.",
      watchLabel: "Below 0.0% = inversion",
      watchValue: threshold,
      watchDistanceLabel: `${Math.abs(rawValue - threshold).toFixed(2)}% above watch line`,
      watchBuffer,
      chartDomain,
      pressureDirection: "lower-is-worse",
      tone: "positive",
    };
  }
  return {
    pressureLabel: "Boundary watch",
    effectDetail: "The curve is near flat, so it is not giving the model a strong directional push yet.",
    watchLabel: "Below 0.0% = inversion",
    watchValue: threshold,
    watchDistanceLabel: `${Math.abs(rawValue - threshold).toFixed(2)}% from watch line`,
    watchBuffer,
    chartDomain,
    pressureDirection: "lower-is-worse",
    tone: "neutral",
  };
};

export const buildInputInfluenceItems = ({
  assessment,
  reportDynamics,
  regimeSignalIndicators,
}: {
  assessment: HomeReportData["assessment"];
  reportDynamics: HomeReportData["reportDynamics"];
  regimeSignalIndicators: RegimeSignalIndicator[];
}): InputInfluenceItem[] => {
  const signalContributions = reportDynamics?.signalContributions?.length
    ? reportDynamics.signalContributions
    : buildInputInfluenceFallback({ assessment });
  const contributionByKey = new Map(
    signalContributions.map((item: NormalizedSignalContribution) => [
      item.key,
      item,
    ] as const),
  );
  const indicatorByKey = new Map(regimeSignalIndicators.map((item) => [item.key, item]));

  return inputInfluenceKeyOrder.map((key) => {
    const indicator = indicatorByKey.get(key);
    const contribution = contributionByKey.get(key);
    const influencePercent = contribution ? Math.round(contribution.normalized * 100) : 0;
    const description = buildInputInfluenceDescription({
      key,
      rawValue: indicator?.rawValue ?? null,
      assessment,
    });

    return {
      key,
      label: indicator?.label ?? regimeSignalLabelByKey[key],
      valueLabel: indicator?.valueLabel ?? "—",
      currentValue: indicator?.rawValue ?? null,
      pressureLabel: description.pressureLabel,
      effectDetail: description.effectDetail,
      influencePercent,
      influencePercentLabel: contribution?.normalizedPercentLabel ?? `${influencePercent}%`,
      trendArrow: indicator?.trendArrow ?? "→",
      trendLabel: indicator?.isFallback
        ? "No fresh weekly delta yet."
        : indicator?.trendDeltaLabel ?? "Weekly delta unavailable.",
      watchLabel: description.watchLabel,
      watchValue: description.watchValue,
      watchDistanceLabel: description.watchDistanceLabel,
      watchBuffer: description.watchBuffer,
      chartDomain: description.chartDomain,
      pressureDirection: description.pressureDirection,
      sparkline: indicator?.sparkline ?? [],
      tone: description.tone,
    };
  });
};
