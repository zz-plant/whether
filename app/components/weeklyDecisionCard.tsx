import { Fragment, type ReactNode } from "react";
import type { ConfidenceTrendFraming, WeeklyConfidencePoint } from "../../lib/report/reportData";
import type { BoundedDecisionRule } from "../../lib/report/boundedDecisionRules";
import { decisionAreaLabel, formatBoundedDecisionTriplet } from "../../lib/report/boundedDecisionRules";
import type { RoleAwareOperatingTemplate } from "../../lib/report/operatingCalls";
import { WeeklyCallModePanel } from "./weeklyCallModePanel";
import { DecisionHeroSection } from "./weekly-card/DecisionHeroSection";
import { DiagnosticsSection } from "./weekly-card/DiagnosticsSection";
import { ActionStripSection } from "./weekly-card/ActionStripSection";
import { PostureHistoryTimeline } from "./weekly-card/HistorySection";
import type { DiagnosticsSectionProps } from "./weekly-card/types";
import { compactActionCue, compactInset, disclosureSummaryClass, sectionSpacing, tierOneHeading, tierOnePanel, tierThreeHeading, tierThreePanel } from "./weekly-card/shared";
import type { RegimeKey } from "../../lib/regimeEngine";
import type { DecisionMatrixPayload, InputInfluenceItem, StartupVariantPolicy, WeeklyDecisionCardViewModel } from "../../lib/report/homeBriefModel";
import { buildCompactFreshnessMeta } from "../../lib/report/reportFormatting";
import { getRegimeWeatherIcon, getRegimeWeatherLabel, REGIME_BANNER_TOKENS, type RegimeWeatherIcon } from "../../lib/regimePresentation";
import { formatDateUTC } from "../../lib/formatters";
import {
  buildWeeklyCitationMetaLine,
  buildCompactTrustSummary,
} from "../../lib/report/trustStatus";

type WeeklyDecisionCardModel =
  & WeeklyDecisionCardViewModel["status"]
  & WeeklyDecisionCardViewModel["decision"]
  & NonNullable<WeeklyDecisionCardViewModel["presentation"]>
  & WeeklyDecisionCardViewModel["diagnostics"]
  & WeeklyDecisionCardViewModel["history"]
  & WeeklyDecisionCardViewModel["artifact"];

export type WeeklyDecisionCardProps = {
  model: WeeklyDecisionCardViewModel;
  actions?: ReactNode;
  diagnosticsLane?: ReactNode;
  searchParams?: Record<string, string | undefined>;
};

export type WeeklyDecisionDiagnosticsLaneProps = DiagnosticsSectionProps;
export const WeeklyDecisionDiagnosticsLane = DiagnosticsSection;
// Legacy hero export retained for isolated section tests only.
export const DecisionCallHeader = DecisionHeroSection;

const RegimeWeatherGlyph = ({ icon, title }: { icon: RegimeWeatherIcon; title: string }) => {
  if (icon === "snowflake") {
    return (
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 text-sky-100" aria-hidden="true" focusable="false">
        <title>{title}</title>
        <path d="M8 1.5v13M2.6 4.2l10.8 7.6M13.4 4.2L2.6 11.8M4.8 2.7l1.7 1.1M11.2 2.7L9.5 3.8M4.8 13.3l1.7-1.1M11.2 13.3l-1.7-1.1" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
      </svg>
    );
  }

  if (icon === "cloud") {
    return (
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 text-slate-100" aria-hidden="true" focusable="false">
        <title>{title}</title>
        <path d="M5.1 12.4h6.3a2.6 2.6 0 1 0-.3-5.1 3.7 3.7 0 0 0-7.2.9A2.1 2.1 0 1 0 5.1 12.4Z" fill="currentColor" opacity="0.95"/>
      </svg>
    );
  }

  if (icon === "storm") {
    return (
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 text-sky-100" aria-hidden="true" focusable="false">
        <title>{title}</title>
        <path d="M5.1 9.8h6.3a2.6 2.6 0 1 0-.3-5.1 3.7 3.7 0 0 0-7.2.9A2.1 2.1 0 1 0 5.1 9.8Z" fill="currentColor" opacity="0.92"/>
        <path d="M8.8 9 6.9 12h1.6L7.4 14.5 10 11h-1.5L9.6 9Z" fill="rgb(253 224 71)"/>
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 text-amber-200" aria-hidden="true" focusable="false">
      <title>{title}</title>
      <circle cx="8" cy="8" r="3.1" fill="currentColor"/>
      <path d="M8 1.5v1.6M8 12.9v1.6M1.5 8h1.6M12.9 8h1.6M3.2 3.2l1.1 1.1M11.7 11.7l1.1 1.1M12.8 3.2l-1.1 1.1M4.3 11.7l-1.1 1.1" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
};

const resolvePostureAndStage = ({
  statusLabel,
  postureLabel,
  stageLabel,
  postureWithStageLabel,
}: {
  statusLabel: string;
  postureLabel?: string;
  stageLabel?: string;
  postureWithStageLabel?: string;
}) => {
  const [derivedPostureLabel, derivedStageLabel] = (postureWithStageLabel ?? "").split(" — ");

  return {
    resolvedPostureLabel: postureLabel ?? derivedPostureLabel ?? statusLabel,
    resolvedStageLabel: stageLabel ?? derivedStageLabel ?? "Unspecified",
  };
};

type RegimeBannerProps = {
  statusLabel: string;
  regimeKey: RegimeKey;
  postureLabel?: string;
  stageLabel?: string;
  postureWithStageLabel?: string;
  recordDateLabel: string;
  confidencePercent: number;
  confidenceLabel: WeeklyDecisionCardModel["confidenceLabel"];
  trendLabel?: string;
  regimeDistance?: WeeklyDecisionCardModel["regimeDistance"];
};

type FlipRiskMeterState = {
  progressPercent: number;
  urgencyLabel: "Low" | "Medium" | "High" | "Unknown";
  detailLabel: string;
  triggerLabel: string;
};

const resolveFlipRiskMeterState = (regimeDistance?: WeeklyDecisionCardModel["regimeDistance"]): FlipRiskMeterState => {
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

const flipRiskFillClass: Record<FlipRiskMeterState["urgencyLabel"], string> = {
  High: "bg-rose-300",
  Medium: "bg-amber-200",
  Low: "bg-emerald-200",
  Unknown: "bg-slate-300/70",
};

const flipRiskStrokeClass: Record<FlipRiskMeterState["urgencyLabel"], string> = {
  High: "stroke-rose-300",
  Medium: "stroke-amber-200",
  Low: "stroke-emerald-200",
  Unknown: "stroke-slate-300/70",
};

const confidenceBandTone: Record<RegimeBannerProps["confidenceLabel"], {
  label: string;
  activeIndex: number;
  fillClass: string;
  textClass: string;
}> = {
  HIGH: {
    label: "High confidence",
    activeIndex: 2,
    fillClass: "bg-emerald-300",
    textClass: "text-emerald-100",
  },
  MED: {
    label: "Medium confidence",
    activeIndex: 1,
    fillClass: "bg-amber-200",
    textClass: "text-amber-100",
  },
  LOW: {
    label: "Low confidence",
    activeIndex: 0,
    fillClass: "bg-rose-300",
    textClass: "text-rose-200",
  },
};

const trendIconTone: Record<string, string> = {
  improving: "text-emerald-200",
  strengthening: "text-emerald-200",
  stable: "text-slate-200",
  mixed: "text-amber-200",
  unstable: "text-amber-200",
  deteriorating: "text-rose-200",
  weakening: "text-rose-200",
};

const normalizeTrendKey = (trendLabel?: string) => trendLabel?.trim().toLowerCase() ?? "stable";

const TrendGlyph = ({ trendLabel }: { trendLabel?: string }) => {
  const trendKey = normalizeTrendKey(trendLabel);
  const toneClass = trendIconTone[trendKey] ?? "text-slate-200";

  if (trendKey === "improving" || trendKey === "strengthening") {
    return (
      <svg viewBox="0 0 16 16" className={`h-3.5 w-3.5 ${toneClass}`} aria-hidden="true" focusable="false">
        <path d="M3.5 11.5 11.5 3.5M7.5 3.5h4v4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (trendKey === "deteriorating" || trendKey === "weakening") {
    return (
      <svg viewBox="0 0 16 16" className={`h-3.5 w-3.5 ${toneClass}`} aria-hidden="true" focusable="false">
        <path d="M3.5 4.5 11.5 12.5M7.5 12.5h4v-4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (trendKey === "mixed" || trendKey === "unstable") {
    return (
      <svg viewBox="0 0 16 16" className={`h-3.5 w-3.5 ${toneClass}`} aria-hidden="true" focusable="false">
        <path d="M2.5 10.5 5.3 7.7l2.2 2.2 3.8-3.8 2.2 2.2" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 16 16" className={`h-3.5 w-3.5 ${toneClass}`} aria-hidden="true" focusable="false">
      <path d="M3 8h10" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
};

const ConfidenceBandMeter = ({
  confidencePercent,
  confidenceLabel,
}: {
  confidencePercent: number;
  confidenceLabel: RegimeBannerProps["confidenceLabel"];
}) => {
  const tone = confidenceBandTone[confidenceLabel];

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <p className={`text-sm font-semibold ${tone.textClass}`}>{tone.label}</p>
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300" title={`Exact confidence ${Math.round(confidencePercent)} percent`}>
          {confidenceLabel} {Math.round(confidencePercent)}%
        </span>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-1" role="img" aria-label={`${tone.label}. Exact confidence ${Math.round(confidencePercent)} percent`}>
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            className={`h-2.5 rounded-full ${index === tone.activeIndex ? tone.fillClass : "bg-slate-800/85"}`}
            aria-hidden="true"
          />
        ))}
      </div>
      <p className="mt-2 text-[11px] leading-5 text-slate-300">Band first, percent second.</p>
    </div>
  );
};

const FlipRiskDial = ({ flipRiskState }: { flipRiskState: FlipRiskMeterState }) => {
  const radius = 14;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - flipRiskState.progressPercent / 100);
  const strokeClass = flipRiskStrokeClass[flipRiskState.urgencyLabel];
  const zoneLabel = flipRiskState.urgencyLabel === "High"
    ? "Near flip"
    : flipRiskState.urgencyLabel === "Medium"
      ? "Flip in play"
      : flipRiskState.urgencyLabel === "Low"
        ? "Room before flip"
        : "Flip pending data";

  return (
    <div className="flex items-center gap-3">
      <div className="relative flex h-11 w-11 items-center justify-center">
        <svg viewBox="0 0 36 36" className="h-11 w-11 -rotate-90" aria-hidden="true" focusable="false">
          <circle cx="18" cy="18" r={radius} className="fill-none stroke-slate-800/80" strokeWidth="4" />
          <circle
            cx="18"
            cy="18"
            r={radius}
            className={`fill-none ${strokeClass}`}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
          />
        </svg>
        <span className="absolute text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-100">
          {flipRiskState.urgencyLabel === "Unknown" ? "?" : flipRiskState.urgencyLabel.slice(0, 1)}
        </span>
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-50">{zoneLabel}</p>
        <p className="mt-1 text-[11px] leading-5 text-slate-300">{flipRiskState.triggerLabel}</p>
      </div>
    </div>
  );
};

const parseMetricNumber = (label: string) => {
  const match = label.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
};

const buildThresholdMarkerState = (valueLabel: string, watchLabel: string) => {
  const currentValue = parseMetricNumber(valueLabel);
  const thresholdValue = parseMetricNumber(watchLabel);

  if (currentValue === null || thresholdValue === null) {
    return null;
  }

  const lowerBound = Math.min(currentValue, thresholdValue, 0);
  const upperBound = Math.max(currentValue, thresholdValue, 0);
  const padding = Math.max((upperBound - lowerBound) * 0.2, Math.abs(thresholdValue) * 0.15, 0.5);
  const domainMin = lowerBound - padding;
  const domainMax = upperBound + padding;
  const domainRange = Math.max(domainMax - domainMin, 1);
  const normalize = (value: number) => Math.min(96, Math.max(4, ((value - domainMin) / domainRange) * 100));

  return {
    currentPercent: normalize(currentValue),
    thresholdPercent: normalize(thresholdValue),
  };
};

function RegimeBanner({
  statusLabel,
  regimeKey = "VOLATILE",
  postureLabel,
  stageLabel,
  postureWithStageLabel,
  recordDateLabel,
  confidencePercent,
  confidenceLabel,
  trendLabel,
  regimeDistance,
}: RegimeBannerProps) {
  const { resolvedPostureLabel, resolvedStageLabel } = resolvePostureAndStage({
    statusLabel,
    postureLabel,
    stageLabel,
    postureWithStageLabel,
  });
  const trendValue = trendLabel?.trim() || "Unspecified";
  const flipRiskValue = regimeDistance && Number.isFinite(regimeDistance.pointsToFlip)
    ? `${Math.max(0, Math.round(regimeDistance.pointsToFlip))} pts`
    : "Unknown";
  const bannerTone = REGIME_BANNER_TOKENS[regimeKey];
  const activeWeather = getRegimeWeatherLabel(regimeKey);
  const activeWeatherIcon = getRegimeWeatherIcon(regimeKey);
  const flipRiskState = resolveFlipRiskMeterState(regimeDistance);
  const exactConfidenceLabel = `${Math.round(confidencePercent)}%`;
  const compactMetricChips = [
    `Trend ${trendValue}`,
    `Confidence ${confidenceLabel} ${exactConfidenceLabel}`,
    `Flip window ${flipRiskValue}`,
  ];

  return (
    <header className={`z-10 rounded-2xl border px-4 py-3 shadow-[0_20px_44px_rgba(2,6,23,0.42)] backdrop-blur sm:px-5 sm:py-4 ${bannerTone.shell}`} data-testid="weekly-regime-banner" aria-label="Weekly regime banner">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-100/85">
            <span>Current outlook</span>
            <span className="rounded-full border border-white/10 bg-slate-950/35 px-2.5 py-1">
              Week of {recordDateLabel}
            </span>
          </div>
          <div id="weekly-posture-brief-title" className="flex items-start gap-3">
            <span className="weather-icon-chip mt-0.5 h-10 w-10 flex-shrink-0 text-slate-50">
              <RegimeWeatherGlyph icon={activeWeatherIcon} title={activeWeather} />
            </span>
            <div className="min-w-0">
              <p className="text-xl font-semibold leading-tight sm:text-[1.7rem]">{resolvedPostureLabel}</p>
              <p className="mt-0.5 text-sm font-semibold text-slate-100/90">{resolvedStageLabel} cycle</p>
              <p className="mt-1 text-xs leading-5 text-slate-300">
                {activeWeather}. {flipRiskState.detailLabel}
              </p>
            </div>
          </div>
        </div>
        <div className="space-y-2 lg:max-w-[24rem]">
          <div className={`flex flex-wrap gap-1.5 text-xs font-semibold ${bannerTone.metrics}`} aria-label="Current outlook metadata">
            {compactMetricChips.map((metric) => (
              <span key={metric} className="inline-flex min-h-8 items-center rounded-full border border-white/10 bg-slate-950/25 px-2.5 py-1 leading-4">
                {metric}
              </span>
            ))}
          </div>
          <p className="flex items-center gap-1.5 text-[11px] text-slate-300" aria-label={`Trend ${trendValue}`}>
            <TrendGlyph trendLabel={trendValue} />
            <span>{flipRiskState.triggerLabel}</span>
          </p>
        </div>
      </div>
    </header>
  );
}


const confidenceTrendTone: Record<ConfidenceTrendFraming, string> = {
  strengthening: "text-emerald-200",
  weakening: "text-rose-200",
  unstable: "text-amber-200",
};

const ConfidenceMiniChart = ({
  confidenceHistory,
  confidenceTrend,
}: {
  confidenceHistory: WeeklyConfidencePoint[];
  confidenceTrend: ConfidenceTrendFraming;
}) => {
  const knownValues = confidenceHistory
    .filter((point): point is WeeklyConfidencePoint & { confidencePercent: number } => typeof point.confidencePercent === "number")
    .map((point) => point.confidencePercent);
  const min = knownValues.length > 0 ? Math.min(...knownValues) : 0;
  const max = knownValues.length > 0 ? Math.max(...knownValues) : 100;
  const range = Math.max(max - min, 1);

  return (
    <article className={`${tierOnePanel} ${sectionSpacing}`}>
      <h2 className={tierOneHeading}>Confidence trend (8w)</h2>
      <p className={`text-xs font-semibold uppercase tracking-[0.1em] ${confidenceTrendTone[confidenceTrend]}`}>{confidenceTrend}</p>
      <div className="mt-1 flex h-14 items-end gap-1.5" role="img" aria-label="Last 8 weekly confidence values">
        {confidenceHistory.length === 0 ? <p className="text-xs text-slate-400">No confidence history available.</p> : null}
        {confidenceHistory.map((point) => {
          const missing = point.isMissing || typeof point.confidencePercent !== "number";
          const confidencePercent = typeof point.confidencePercent === "number" ? point.confidencePercent : null;
          const height = missing || confidencePercent === null ? 14 : Math.max(14, Math.round(((confidencePercent - min) / range) * 44) + 14);
          return (
            <div key={point.recordDate} className="group relative flex-1">
              <span
                className={missing ? "block rounded-sm border border-amber-400/80 border-dashed bg-amber-500/5" : "block rounded-sm bg-sky-300/80"}
                style={{ height }}
                aria-label={missing || confidencePercent === null ? `${point.recordDate} missing confidence data` : `${point.recordDate} confidence ${Math.round(confidencePercent)}%`}
              />
              <span className="pointer-events-none absolute -top-7 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-1.5 py-0.5 text-[10px] text-slate-100 group-hover:block">
                {missing || confidencePercent === null ? `${point.recordDate}: missing` : `${point.recordDate}: ${Math.round(confidencePercent)}%`}
              </span>
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-slate-400">Missing weeks are dashed markers.</p>
    </article>
  );
};

type BoundedRulesMatrixProps = {
  decisionMatrix?: DecisionMatrixPayload;
  startupVariantPolicy?: StartupVariantPolicy;
  decisionRules?: BoundedDecisionRule[];
};

const decisionLaneTone: Record<"approve" | "delay" | "flip", {
  label: string;
  badgeClassName: string;
}> = {
  approve: {
    label: "↑ Now",
    badgeClassName: "border-emerald-400/35 bg-emerald-500/10 text-emerald-100",
  },
  delay: {
    label: "∥ Hold",
    badgeClassName: "border-rose-400/35 bg-rose-500/10 text-rose-100",
  },
  flip: {
    label: "↺ Flip",
    badgeClassName: "border-sky-400/35 bg-sky-500/10 text-sky-100",
  },
};

const matrixLineTone: Record<"action" | "threshold" | "reverse", string> = {
  action: "text-emerald-100",
  threshold: "text-amber-100",
  reverse: "text-sky-100",
};

const MatrixRuleSummary = ({
  action,
  threshold,
  reversal,
}: {
  action: string;
  threshold: string;
  reversal: string;
}) => (
  <div className="space-y-1.5 text-[11px] leading-5">
    {[
      { label: "Act", value: action, tone: matrixLineTone.action },
      { label: "Trip", value: threshold, tone: matrixLineTone.threshold },
      { label: "Flip", value: reversal, tone: matrixLineTone.reverse },
    ].map((item) => (
      <p key={item.label} className="text-slate-200">
        <span className={`mr-1 font-semibold uppercase tracking-[0.08em] ${item.tone}`}>{item.label}</span>
        <span>{item.value}</span>
      </p>
    ))}
  </div>
);

export function BoundedRulesMatrix({ decisionMatrix, decisionRules = [] }: BoundedRulesMatrixProps) {
  const matrixAreaByKey: Record<"hiring" | "product" | "capital" | "burn", BoundedDecisionRule["area"]> = {
    hiring: "hiring",
    product: "product-tempo",
    capital: "capital-raising",
    burn: "burn-discipline",
  };
  const rowOrder: Array<"hiring" | "product" | "capital" | "burn"> = ["hiring", "product", "capital", "burn"];
  const rulesByArea = new Map(decisionRules.map((rule) => [rule.area, rule]));
  const fallbackMatrix = {
    columns: [
      { key: "approve" as const, label: "Approve" },
      { key: "delay" as const, label: "Delay" },
      { key: "flip" as const, label: "Flip" },
    ],
    rows: rowOrder.map((key) => {
      const rule = rulesByArea.get(matrixAreaByKey[key]);
      return {
        key,
        label: rule ? decisionAreaLabel(rule.area) : key.charAt(0).toUpperCase() + key.slice(1),
        cells: {
          approve: {
            text: rule?.doNow[0] ?? "Stage approvals",
            detail: rule?.rationale ?? "Keep approvals tied to near-term proof.",
            action: rule ? formatBoundedDecisionTriplet(rule).action : "Stage approvals",
            threshold: rule ? formatBoundedDecisionTriplet(rule).threshold : "Pause if thresholds weaken",
            reversal: rule ? formatBoundedDecisionTriplet(rule).reverse : "Reverse only after threshold recovery",
          },
          delay: {
            text: rule?.avoidNow[0] ?? "Delay irreversible commitments",
            detail: rule?.pauseTrigger ?? "Pause when thresholds weaken.",
            action: rule?.avoidNow[0] ?? "Delay irreversible commitments",
            threshold: rule ? formatBoundedDecisionTriplet(rule).threshold : "Pause if thresholds weaken",
            reversal: rule ? formatBoundedDecisionTriplet(rule).reverse : "Reverse only after threshold recovery",
          },
          flip: {
            text: rule?.resumeTrigger ?? "Flip after threshold recovery",
            detail: rule?.resumeTrigger ?? "Resume only after threshold recovery holds.",
            action: rule ? formatBoundedDecisionTriplet(rule).action : "Stage approvals",
            threshold: rule ? formatBoundedDecisionTriplet(rule).threshold : "Pause if thresholds weaken",
            reversal: rule ? formatBoundedDecisionTriplet(rule).reverse : "Reverse only after threshold recovery",
          },
        },
        context: rule?.scope ?? "Apply this rule to related weekly operating decisions.",
      };
    }),
  };

  const matrix = decisionMatrix
    ? {
      ...decisionMatrix,
      rows: rowOrder.map((rowKey) => {
        const matrixRow = decisionMatrix.rows.find((row) => row.key === rowKey);
        const rule = rulesByArea.get(matrixAreaByKey[rowKey]);
        return {
          key: rowKey,
          label: matrixRow?.label ?? (rule ? decisionAreaLabel(rule.area) : rowKey.charAt(0).toUpperCase() + rowKey.slice(1)),
          cells: {
            approve: {
              text: matrixRow?.cells.approve.text ?? rule?.doNow[0] ?? "Stage approvals",
              detail: matrixRow?.cells.approve.detail ?? rule?.rationale ?? "Keep approvals tied to near-term proof.",
              action: matrixRow?.cells.approve.action ?? (rule ? formatBoundedDecisionTriplet(rule).action : "Stage approvals"),
              threshold: matrixRow?.cells.approve.threshold ?? (rule ? formatBoundedDecisionTriplet(rule).threshold : "Pause if thresholds weaken"),
              reversal: matrixRow?.cells.approve.reversal ?? (rule ? formatBoundedDecisionTriplet(rule).reverse : "Reverse only after threshold recovery"),
            },
            delay: {
              text: matrixRow?.cells.delay.text ?? rule?.avoidNow[0] ?? "Delay irreversible commitments",
              detail: matrixRow?.cells.delay.detail ?? rule?.pauseTrigger ?? "Pause when thresholds weaken.",
              action: matrixRow?.cells.delay.action ?? rule?.avoidNow[0] ?? "Delay irreversible commitments",
              threshold: matrixRow?.cells.delay.threshold ?? (rule ? formatBoundedDecisionTriplet(rule).threshold : "Pause if thresholds weaken"),
              reversal: matrixRow?.cells.delay.reversal ?? (rule ? formatBoundedDecisionTriplet(rule).reverse : "Reverse only after threshold recovery"),
            },
            flip: {
              text: matrixRow?.cells.flip.text ?? rule?.resumeTrigger ?? "Flip after threshold recovery",
              detail: matrixRow?.cells.flip.detail ?? rule?.resumeTrigger ?? "Resume only after threshold recovery holds.",
              action: matrixRow?.cells.flip.action ?? (rule ? formatBoundedDecisionTriplet(rule).action : "Stage approvals"),
              threshold: matrixRow?.cells.flip.threshold ?? (rule ? formatBoundedDecisionTriplet(rule).threshold : "Pause if thresholds weaken"),
              reversal: matrixRow?.cells.flip.reversal ?? (rule ? formatBoundedDecisionTriplet(rule).reverse : "Reverse only after threshold recovery"),
            },
          },
          context: rule?.scope ?? "Apply this rule to related weekly operating decisions.",
        };
      }),
    }
    : fallbackMatrix;

  if (!matrix || matrix.rows.length === 0) {
    return (
      <article className={`${tierOnePanel} ${sectionSpacing}`}>
        <h2 className={tierOneHeading}>Decision snapshot for leadership this week</h2>
        <p className="text-xs leading-5 text-slate-300">Decision matrix unavailable; keep current guardrails and recheck after next refresh.</p>
      </article>
    );
  }

  return (
    <article className={`${tierOnePanel} ${sectionSpacing}`}>
      <h2 className={tierOneHeading}>Decision snapshot for leadership this week</h2>
      <p className="text-xs leading-5 text-slate-300">Each lane shows the bounded rule: act now, trip line, and flip condition.</p>
      <div className="mt-2 hidden md:block">
        <div className="grid grid-cols-[minmax(0,11rem)_repeat(3,minmax(0,1fr))] gap-2" aria-label="Bounded decision matrix">
          <div className="rounded-md border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-300">
            Decision area
          </div>
          {matrix.columns.map((column) => (
            <div key={`desktop-column-${column.key}`} className="rounded-md border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-left text-slate-200">
              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] ${decisionLaneTone[column.key].badgeClassName}`}>
                {decisionLaneTone[column.key].label}
              </span>
            </div>
          ))}
          {matrix.rows.map((row) => (
            <Fragment key={`desktop-row-${row.key}`}>
              <div className="rounded-md border border-slate-700/70 bg-slate-950/75 px-3 py-2.5">
                <p className="text-sm font-semibold text-slate-100">{row.label}</p>
                <p className="mt-1 text-[11px] leading-5 text-slate-300">{row.context}</p>
              </div>
              {matrix.columns.map((column) => {
                const cell = row.cells[column.key];
                return (
                  <div key={`${row.key}-${column.key}`} className="rounded-md border border-slate-700/55 bg-slate-950/60 px-3 py-2.5 align-top">
                    <p className="text-[11px] font-semibold leading-5 text-slate-100">{compactActionCue(cell.text)}</p>
                    <div className="mt-2 border-t border-slate-800/70 pt-2">
                      <MatrixRuleSummary action={cell.action} threshold={cell.threshold} reversal={cell.reversal} />
                    </div>
                  </div>
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>
      <div className="mt-2 space-y-2 md:hidden">
        {matrix.rows.map((row) => (
          <article key={`mobile-${row.key}`} className="rounded-md border border-slate-700/55 bg-slate-950/60 p-2.5">
            <p className="text-xs font-semibold text-slate-100">{row.label}</p>
            <p className="mt-1 text-[11px] leading-5 text-slate-300">{row.context}</p>
            <div className="mt-2 space-y-1.5">
              {matrix.columns.map((column) => {
                const cell = row.cells[column.key];
                return (
                  <div key={`mobile-${row.key}-${column.key}`} className="rounded border border-slate-700/60 bg-slate-950/70 px-2 py-2">
                    <p className="text-[11px] leading-5 text-slate-100">
                      <span className={`mr-1 inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${decisionLaneTone[column.key].badgeClassName}`}>
                        {decisionLaneTone[column.key].label}
                      </span>
                      {compactActionCue(cell.text)}
                    </p>
                    <div className="mt-2 border-t border-slate-800/70 pt-2">
                      <MatrixRuleSummary action={cell.action} threshold={cell.threshold} reversal={cell.reversal} />
                    </div>
                  </div>
                );
              })}
            </div>
          </article>
        ))}
      </div>
    </article>
  );
}

const inputInfluenceToneClasses: Record<InputInfluenceItem["tone"], { badge: string; fill: string }> = {
  warning: {
    badge: "border-rose-400/35 bg-rose-500/10 text-rose-100",
    fill: "bg-rose-300",
  },
  positive: {
    badge: "border-emerald-400/35 bg-emerald-500/10 text-emerald-100",
    fill: "bg-emerald-300",
  },
  neutral: {
    badge: "border-slate-600/75 bg-slate-950/60 text-slate-200",
    fill: "bg-slate-300",
  },
};

function InputInfluenceSection({ items }: { items: InputInfluenceItem[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <article className={`${tierOnePanel} ${sectionSpacing}`} aria-label="How inputs move this call">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className={tierOneHeading}>How inputs move this call</h2>
          <p className="mt-1 text-xs leading-5 text-slate-300">Bars show contribution share. Marker strips keep the current read anchored to its flip line.</p>
        </div>
        <p className="text-[11px] text-slate-400">Longer bars = bigger share of the weekly call.</p>
      </div>
      <ul className="mt-3 grid gap-2">
        {items.map((item, index) => {
          const tone = inputInfluenceToneClasses[item.tone];
          const thresholdMarker = buildThresholdMarkerState(item.valueLabel, item.watchLabel);

          return (
            <li key={item.key} className="border-b border-slate-800/60 px-1 py-3 last:border-b-0">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-100">{item.label}</p>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] ${tone.badge}`}>
                      {item.pressureLabel}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-300">{item.effectDetail}</p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    {item.trendArrow} {item.trendLabel}
                    <span className="px-1" aria-hidden="true">·</span>
                    {item.watchLabel}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-100">{item.valueLabel}</p>
                  {index === 0 ? <p className="text-[11px] text-slate-400">{item.influencePercentLabel} share</p> : null}
                </div>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800/90" aria-hidden="true">
                <div
                  className={`h-full origin-left rounded-full ${tone.fill}`}
                  style={{ transform: `scaleX(${Math.max(0.06, item.influencePercent / 100)})` }}
                />
              </div>
              <div className="mt-2">
                <div className="flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                  <span>Current vs trigger</span>
                  <span>{item.watchLabel}</span>
                </div>
                {thresholdMarker ? (
                  <div className="relative mt-1.5 h-5 rounded-full border border-slate-800/70 bg-slate-950/60" aria-hidden="true">
                    <span
                      className="absolute inset-y-0 w-px bg-slate-500/90"
                      style={{ left: `${thresholdMarker.thresholdPercent}%` }}
                    />
                    <span
                      className={`absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-slate-950/90 ${tone.fill}`}
                      style={{ left: `${thresholdMarker.currentPercent}%` }}
                    />
                  </div>
                ) : (
                  <p className="mt-1 text-[11px] text-slate-400">{item.watchLabel}</p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </article>
  );
}

type MoreContextDisclosureProps = {
  startupClimateIndex: WeeklyDecisionCardModel["startupClimateIndex"];
  evidenceItems: WeeklyDecisionCardModel["evidenceItems"];
  whyThisCall: WeeklyDecisionCardModel["whyThisCall"];
  memoryRail: WeeklyDecisionCardModel["memoryRail"];
  historicalTimeline: WeeklyDecisionCardModel["historicalTimeline"];
  historicalAnalogs: WeeklyDecisionCardModel["historicalAnalogs"];
  macroOverlay: WeeklyDecisionCardModel["macroOverlay"];
};

export function MoreContextDisclosureBody({
  startupClimateIndex,
  evidenceItems,
  whyThisCall,
  memoryRail,
  historicalTimeline,
  historicalAnalogs: _historicalAnalogs,
  macroOverlay,
}: MoreContextDisclosureProps) {
  return (
    <div className="space-y-2.5">
      <details className="group rounded-lg border border-slate-800/45 bg-slate-950/38 px-2.5 py-2">
        <summary className={`${disclosureSummaryClass} cursor-pointer list-none`}>
          <span>Startup Climate Index (context)</span>
          <span aria-hidden="true" className="weather-disclosure-trigger-indicator text-sm group-open:rotate-180">▾</span>
        </summary>
        <div className="weather-disclosure-panel animate-collapsible-in mt-2 space-y-2">
          <p className="text-xs text-slate-300">Context metric for continuity: {startupClimateIndex.score} / 100 · {startupClimateIndex.status}</p>
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {startupClimateIndex.breakdown.map((item) => (
              <li key={item.label} className="space-y-1 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span>{item.label}</span>
                  <span className="font-semibold text-slate-100">{item.score}</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-800">
                  <div
                    className="h-1.5 w-full origin-left rounded-full bg-sky-300/70"
                    style={{ transform: `scaleX(${Math.max(0.05, Math.min(1, item.score / 100))})` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </details>

      <details className="group rounded-lg border border-slate-800/45 bg-slate-950/38 px-2.5 py-2">
        <summary className={`${disclosureSummaryClass} cursor-pointer list-none`}>
          <span>Evidence snapshot</span>
          <span aria-hidden="true" className="weather-disclosure-trigger-indicator text-sm group-open:rotate-180">▾</span>
        </summary>
        <ul className="weather-disclosure-panel animate-collapsible-in mt-2 grid gap-2 lg:grid-cols-3">
          {evidenceItems.map((item) => (
            <li key={item.key} className={`${compactInset} space-y-1.5 text-xs text-slate-200`}>
              <p className="font-semibold text-slate-100">{item.title}</p>
              <p className="text-[11px] text-slate-400">Updated {item.lastUpdated ? formatDateUTC(item.lastUpdated) : "—"}</p>
              <ul className="space-y-1 text-[11px] text-slate-300">
                {item.supportingBullets.slice(0, 3).map((bullet) => (
                  <li key={`${item.key}-${bullet}`}>• {bullet}</li>
                ))}
              </ul>
              <p className="text-[11px] text-slate-300"><span className="font-semibold text-slate-200">Confidence:</span> {item.confidenceLabel}</p>
              <p className="text-[11px] text-slate-300"><span className="font-semibold text-slate-200">Direction:</span> {item.directionLabel}</p>
              <p className="text-[11px] text-slate-300"><span className="font-semibold text-slate-200">Immediate implication:</span> {item.immediateImplication}</p>
            </li>
          ))}
        </ul>
      </details>

      <details className="group rounded-lg border border-slate-800/45 bg-slate-950/38 px-2.5 py-2">
        <summary className={`${disclosureSummaryClass} cursor-pointer list-none`}>
          <span>Why this posture call</span>
          <span aria-hidden="true" className="weather-disclosure-trigger-indicator text-sm group-open:rotate-180">▾</span>
        </summary>
        <ul className="weather-disclosure-panel animate-collapsible-in mt-2 grid gap-1.5 sm:grid-cols-3">
          {whyThisCall.map((reason) => (
            <li key={reason.label} className={`${compactInset} text-xs text-slate-200`}>
              <p className="font-semibold text-slate-300">{reason.label}</p>
              <p className="mt-1 leading-5 text-slate-300">{reason.detail}</p>
            </li>
          ))}
        </ul>
      </details>

      <details className="group rounded-lg border border-slate-800/45 bg-slate-950/38 px-2.5 py-2">
        <summary className={`${disclosureSummaryClass} cursor-pointer list-none`}>
          <span>Posture history and overlays</span>
          <span aria-hidden="true" className="weather-disclosure-trigger-indicator text-sm group-open:rotate-180">▾</span>
        </summary>
        <div className="weather-disclosure-panel animate-collapsible-in mt-2 space-y-2">
          <PostureHistoryTimeline historicalTimeline={historicalTimeline} />
          <div>
            <p className={tierThreeHeading}>Historical memory rail</p>
            <ul className="mt-1.5 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-4">
              {memoryRail.map((item) => (
                <li key={`${item.label}-${item.posture}`} className={`${compactInset} text-xs text-slate-200`}>
                  <p className="text-slate-400">{item.label}</p>
                  <p className="mt-1 font-semibold text-slate-100">{item.posture}</p>
                </li>
              ))}
            </ul>
          </div>
          <ul className="grid gap-1.5 text-xs text-slate-300 sm:grid-cols-2 lg:grid-cols-4">
            {macroOverlay.map((item) => (
              <li key={item.label} className={compactInset}>
                <p className="font-semibold text-slate-200">{item.label}</p>
                <p className="mt-1 leading-5 text-slate-300">{item.detail}</p>
              </li>
            ))}
          </ul>
        </div>
      </details>
    </div>
  );
}

type CitationActionFooterProps = {
  citationMetaLine: string;
  citation: string;
};

type DecisionTransmissionRailProps = {
  actionNow: string;
  guardrail: string;
  flipWhen: string;
  citationMetaLine: string;
  actions?: ReactNode;
};

function DecisionTransmissionRail({
  actionNow,
  guardrail,
  flipWhen,
  citationMetaLine,
  actions,
}: DecisionTransmissionRailProps) {
  return (
    <article className={`${tierOnePanel} ${sectionSpacing}`} aria-label="Decision transmission rail">
      <div className="flex items-center justify-between gap-3">
        <h2 className={tierOneHeading}>Share this call</h2>
        <span className="rounded-full border border-slate-700/70 bg-slate-950/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300">
          Share-ready
        </span>
      </div>
      <p className="text-xs leading-5 text-slate-300">
        Default artifacts already carry this week&apos;s action, guardrail, and flip condition. Use sharing here after the call is aligned.
      </p>
      <div className="rounded-xl border border-slate-700/60 bg-slate-950/60 px-3 py-3 text-xs text-slate-300">
        <p><span className="font-semibold text-slate-100">Action:</span> {actionNow}</p>
        <p className="mt-1"><span className="font-semibold text-slate-100">Guardrail:</span> {guardrail}</p>
        <p className="mt-1"><span className="font-semibold text-slate-100">Flip:</span> {flipWhen}</p>
      </div>
      <div className="rounded-xl border border-slate-700/60 bg-slate-950/70 px-3 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300">Artifact handoff</p>
        <p className="mt-1 text-xs leading-5 text-slate-300">{citationMetaLine}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {actions}
        </div>
      </div>
    </article>
  );
}

export function CitationActionFooter({ citationMetaLine, citation }: CitationActionFooterProps) {
  return (
    <article id="citation-actions" className={`${tierThreePanel} ${sectionSpacing}`}>
      <h2 className={tierThreeHeading}>Cite this call</h2>
      <p className="mt-2 text-xs text-slate-300">{citationMetaLine}</p>
      <pre className="mt-2 overflow-x-auto rounded-md border border-slate-700/70 bg-slate-950/75 px-3 py-2 font-mono whitespace-pre-wrap text-xs text-slate-300">{citation}</pre>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-700/60 bg-slate-950/60 px-3 py-3 text-xs text-slate-300">
        <span>Use this citation in meeting notes, board updates, or operating memos.</span>
        <span className="font-semibold uppercase tracking-[0.12em] text-slate-200">Share actions stay in the transmission rail above.</span>
      </div>
    </article>
  );
}

const ownerLabelByArea: Record<BoundedDecisionRule["area"], string> = {
  hiring: "CEO",
  "product-tempo": "CPO",
  "capital-raising": "CEO / Finance",
  "burn-discipline": "CFO",
  "expansion-bets": "CEO",
};

const extractThresholdChips = (text: string): string[] => {
  const match = text.match(/(tightness|risk appetite)\s*(>=|<=|>|<)\s*(-?\d+(?:\.\d+)?)/i);

  if (!match) {
    return [];
  }

  const metricLabel = match[1].toLowerCase() === "risk appetite" ? "Risk appetite" : "Tightness";
  return [`Metric ${metricLabel}`, `Trigger ${match[2]} ${match[3]}`];
};

const buildPolicyDetails = ({
  rule,
  summary,
  fallbackOwner,
}: {
  rule?: BoundedDecisionRule;
  summary: string;
  fallbackOwner: string;
}) => {
  if (!rule) {
    return {
      summary,
      chips: [`Owner ${fallbackOwner}`],
    };
  }

  const pauseChips = extractThresholdChips(rule.pauseTrigger);
  const firstFlip = rule.flipConditions[0];

  return {
    summary,
    chips: [
      ...(pauseChips.length > 0
        ? pauseChips
        : firstFlip
          ? [
            `Metric ${firstFlip.metric === "riskAppetite" ? "Risk appetite" : "Tightness"}`,
            `Trigger ${firstFlip.operator} ${firstFlip.value.toFixed(1)}`,
          ]
          : []),
      `Owner ${ownerLabelByArea[rule.area]}`,
    ],
  };
};

const buildRoleTranslationCards = ({
  decisionRules,
}: {
  decisionRules: BoundedDecisionRule[];
}) => {
  const financeRule = decisionRules.find((rule) => rule.area === "burn-discipline");
  const productRule = decisionRules.find((rule) => rule.area === "product-tempo");

  return [
    {
      id: "finance" as const,
      label: "Finance",
      implication: financeRule?.recommendation ?? "Translate posture into approval limits and commitment discipline.",
      doLine: financeRule?.doNow[0] ?? "Keep new fixed-cost commitments reversible and staged.",
      holdLine: financeRule?.avoidNow[0] ?? "Do not approve multi-quarter spend without clear payback proof.",
    },
    {
      id: "product" as const,
      label: "Product",
      implication: productRule?.recommendation ?? "Translate posture into roadmap pacing and scope discipline.",
      doLine: productRule?.doNow[0] ?? "Prioritize near-term customer value and reversible roadmap bets.",
      holdLine: productRule?.avoidNow[0] ?? "Do not expand long-payback roadmap scope without stronger proof.",
    },
  ];
};

const resolveRoleView = (
  role: string | undefined,
): "finance" | "product" => (role === "product" ? "product" : "finance");

const buildRoleHref = (
  role: "finance" | "product",
  searchParams?: Record<string, string | undefined>,
) => {
  const params = new URLSearchParams();

  Object.entries(searchParams ?? {}).forEach(([key, value]) => {
    if (typeof value === "string" && value.length > 0 && key !== "role") {
      params.set(key, value);
    }
  });

  if (role !== "finance") {
    params.set("role", role);
  }

  const query = params.toString();
  return query.length > 0 ? `/?${query}#weekly-call-core` : "/#weekly-call-core";
};

export function WeeklyDecisionCard(props: WeeklyDecisionCardProps) {
  const { model, actions, diagnosticsLane, searchParams } = props;
  const { status, decision, presentation, diagnostics, history, artifact } = model;
  const {
    statusLabel,
    regimeKey,
    postureLabel,
    stageLabel,
    postureWithStageLabel,
    confidenceLabel,
    confidencePercent,
    trendLabel,
    confidenceHistory = [],
    confidenceTrend = "unstable",
    isFallbackSnapshot = false,
  } = status;
  const {
    operatingStanceLine,
    weeklyMemoLines,
    guardrail,
    reversalTrigger,
    actionNowShort,
    immediateDecision,
    guardrailThreshold,
    flipThreshold,
    compactFlipConditionLabels = [],
    canonicalDecisionCopy,
    canonicalFlipConditions = [],
    reportDynamics,
    decisionShiftSummary,
    transitionProbabilities,
    decisionRules,
    decisionMatrix,
    actionStripItems = [],
    startupVariantPolicy,
    roleAwareTemplates,
    executiveOperationalStance,
    revisitDecisions,
    weeklyMovement,
  } = decision;
  const {
    whyItMattersLine,
  } = presentation ?? {};
  const {
    regimeDistance,
    evidenceItems,
    failureModes = [],
    inputInfluence = [],
  } = diagnostics;
  const { historicalTimeline } = history;
  const sinceLastReview = model.sinceLastReview;
  const { citation, recordDateLabel, fetchedAtLabel } = artifact;
  const freshnessMeta = buildCompactFreshnessMeta({
    updatedAtLabel: fetchedAtLabel,
    confidenceLabel,
    isFallbackSnapshot,
  });
  const freshnessLabel = freshnessMeta.updatedAtLabel;
  const trustCueLine = buildCompactTrustSummary({
    confidenceLabel,
    freshnessLabel,
    isFallbackSnapshot,
  });
  const citationMetaLine = buildWeeklyCitationMetaLine({
    statusLabel,
    confidenceLabel,
    recordDateLabel,
    freshnessLabel,
  });
  const snapshotDoNow = immediateDecision;
  const snapshotGuardrail = guardrailThreshold?.trim()
    || executiveOperationalStance.avoid[0]?.trim()
    || guardrail;
  const snapshotWatch = canonicalDecisionCopy?.flipTrigger ?? flipThreshold ?? reversalTrigger;
  const structuredFlipLabels = canonicalFlipConditions
    .map((condition) => condition.label.trim())
    .filter((label) => label.length > 0)
    .filter((label, index, labels) => labels.indexOf(label) === index)
    .slice(0, 4);
  const canonicalFlipLabels = (canonicalDecisionCopy?.flipConditions ?? [])
    .map((label) => label.trim())
    .filter((label) => label.length > 0)
    .filter((label, index, labels) => labels.indexOf(label) === index)
    .slice(0, 4);
  const effectiveFlipLabels = canonicalFlipLabels.length > 0
    ? canonicalFlipLabels
    : structuredFlipLabels.length > 0
    ? structuredFlipLabels
    : compactFlipConditionLabels.filter((label, index, labels) => labels.indexOf(label) === index).slice(0, 4);
  const stabilityRule = "Stability rule: act on posture shifts only after 2 consecutive weekly reads, unless the flip trigger fires at HIGH confidence.";
  const trustStateLabel = isFallbackSnapshot ? "FALLBACK SNAPSHOT" : "LIVE";
  const trustStateDetail = isFallbackSnapshot
    ? "Cached weekly read. Use for pacing and defer irreversible approvals until live data returns."
    : confidenceLabel === "HIGH"
      ? "Live weekly read. Safe for near-term operating decisions."
      : "Live weekly read, but confidence is not HIGH yet. Keep approvals staged.";
  const decisionBullets = [
    { label: "What changed", detail: decisionShiftSummary.replace(/^Changed:\s*/i, "").trim() },
    { label: "What that changes", detail: immediateDecision.trim() },
    { label: "What to revisit", detail: guardrail.trim() },
    { label: "What would flip", detail: snapshotWatch.trim() },
  ];
  const guardrailPolicyDetails = buildPolicyDetails({
    rule: decisionRules.find((rule) => rule.area === "burn-discipline") ?? decisionRules[0],
    summary: "Use this as the enforceable weekly boundary before approving new fixed-cost commitments.",
    fallbackOwner: "CFO",
  });
  const flipPolicyDetails = canonicalFlipConditions[0]
    ? {
      summary: "This is the pre-committed trigger that reopens the weekly posture call.",
      chips: [
        `Metric ${canonicalFlipConditions[0].metric === "riskAppetite" ? "Risk appetite" : "Tightness"}`,
        `Trigger ${canonicalFlipConditions[0].operator} ${canonicalFlipConditions[0].value.toFixed(1)}`,
        `Owner ${ownerLabelByArea[canonicalFlipConditions[0].area]}`,
      ],
    }
    : buildPolicyDetails({
      rule: decisionRules.find((rule) => rule.area === "product-tempo") ?? decisionRules[0],
      summary: "Use the primary flip trigger to decide when this week’s posture should be revisited.",
      fallbackOwner: "CEO",
    });
  const roleTranslations = buildRoleTranslationCards({ decisionRules });
  const activeRole = resolveRoleView(searchParams?.role);
  const roleHrefs = {
    finance: buildRoleHref("finance", searchParams),
    product: buildRoleHref("product", searchParams),
  };

  const needsTrustWarning = isFallbackSnapshot || confidenceLabel !== "HIGH" || freshnessLabel === "Unavailable";
  const resolvedStartupVariantPolicy = startupVariantPolicy ?? {
    selectedMode: "series-a",
    options: [
      { mode: "seed", label: "Seed" },
      { mode: "series-a", label: "Series A" },
      { mode: "series-b", label: "Series B" },
      { mode: "growth", label: "Growth" },
      { mode: "public", label: "Public" },
      { mode: "bootstrapped", label: "Bootstrapped" },
    ],
    adjustmentsByMode: {
      seed: {
        mode: "seed",
        label: "Seed",
        description: "Protect runway while preserving rapid proof loops.",
        doNowAdjustments: ["Prioritize experiments that can prove customer pull inside one sprint."],
        avoidAdjustments: ["Avoid bundling multiple irreversible hires before one milestone clears."],
        watchAdjustments: ["Runway trigger: tighten immediately when boundary distance compresses."],
        thresholdEmphasis: "Emphasize runway and evidence cadence over growth breadth.",
        reversalTriggerDiscipline: "Reverse to faster hiring only after improving reads and shipped traction proof.",
      },
      "series-a": {
        mode: "series-a",
        label: "Series A",
        description: "Balance growth tempo with repeatability proof.",
        doNowAdjustments: ["Scale only where activation and retention targets are tracking."],
        avoidAdjustments: ["Avoid parallel expansion programs that obscure payback accountability."],
        watchAdjustments: ["Payback trigger: revisit if boundary distance narrows."],
        thresholdEmphasis: "Emphasize payback windows and repeatable pipeline conversion.",
        reversalTriggerDiscipline: "Reverse to aggressive expansion only after trigger clears and conversion quality holds.",
      },
      "series-b": {
        mode: "series-b",
        label: "Series B",
        description: "Protect operating leverage while preserving selective scale lanes.",
        doNowAdjustments: ["Concentrate approvals on lanes with measurable efficiency lift."],
        avoidAdjustments: ["Avoid fixed-cost expansions that assume forward multiple recovery."],
        watchAdjustments: ["Leverage trigger: hold expansion when boundary distance compresses."],
        thresholdEmphasis: "Emphasize efficiency lift and margin durability before headcount scale.",
        reversalTriggerDiscipline: "Reverse to broader scaling only when both boundaries clear resume bands.",
      },
      growth: {
        mode: "growth",
        label: "Growth",
        description: "Scale durable GTM and platform leverage without losing unit discipline.",
        doNowAdjustments: ["Concentrate scale on channels with proven CAC payback inside the planning window."],
        avoidAdjustments: ["Avoid top-line-first expansions that outrun support and margin readiness."],
        watchAdjustments: ["Growth trigger: rephase expansion when either boundary distance compresses."],
        thresholdEmphasis: "Emphasize CAC payback, retention durability, and support capacity before adding fixed cost.",
        reversalTriggerDiscipline: "Reverse to faster scaling only after conversion efficiency and macro reads improve together.",
      },
      public: {
        mode: "public",
        label: "Public",
        description: "Prioritize earnings resilience and guided execution consistency.",
        doNowAdjustments: ["Bias capital allocation toward initiatives with near-term margin and cash-flow reliability."],
        avoidAdjustments: ["Avoid guidance-risk programs that depend on optimistic macro re-rating."],
        watchAdjustments: ["Guidance trigger: tighten discretionary spend when boundary distance narrows."],
        thresholdEmphasis: "Emphasize earnings durability, cash conversion, and guidance credibility.",
        reversalTriggerDiscipline: "Reverse to broader spend only after boundary pressure eases and guidance confidence improves.",
      },
      bootstrapped: {
        mode: "bootstrapped",
        label: "Bootstrapped",
        description: "Maximize cash durability and compounding customer value.",
        doNowAdjustments: ["Prioritize self-funded growth loops with near-term cash payback."],
        avoidAdjustments: ["Avoid commitments that require external financing to finish."],
        watchAdjustments: ["Cash trigger: tighten spend when either boundary narrows."],
        thresholdEmphasis: "Emphasize cash conversion and reversible commitments over growth optics.",
        reversalTriggerDiscipline: "Reverse to higher spend only after cash payback proof holds across weekly reads.",
      },
    },
  } satisfies StartupVariantPolicy;
  const resolvedRegimeKey = regimeKey ?? "DEFENSIVE";

  return (
    <section className="weather-panel space-y-4 px-4 py-4 sm:space-y-5 sm:px-5 sm:py-5 lg:px-6 lg:py-6" aria-labelledby="weekly-posture-brief-title">
      <RegimeBanner
        statusLabel={statusLabel}
        regimeKey={resolvedRegimeKey}
        postureLabel={postureLabel}
        stageLabel={stageLabel}
        postureWithStageLabel={postureWithStageLabel}
        recordDateLabel={recordDateLabel}
        confidencePercent={confidencePercent}
        confidenceLabel={confidenceLabel}
        trendLabel={trendLabel}
        regimeDistance={regimeDistance}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.28fr)_minmax(19rem,0.82fr)] xl:items-start">
        <main className="space-y-4" aria-label="Weekly decision transmission order">
          <WeeklyCallModePanel
            startupVariantPolicy={resolvedStartupVariantPolicy}
            postureLabel={postureWithStageLabel ?? statusLabel}
            operatingCall={canonicalDecisionCopy?.operatingCall ?? operatingStanceLine}
            trendLabel={trendLabel}
            confidencePercent={confidencePercent}
            confidenceLabel={confidenceLabel}
            snapshotGuardrail={snapshotGuardrail}
            snapshotWatch={snapshotWatch}
            revisitDecisions={revisitDecisions}
            effectiveFlipLabels={effectiveFlipLabels}
            compactInsetClassName={compactInset}
            tierOnePanelClassName={tierOnePanel}
            sectionSpacingClassName={sectionSpacing}
            tierOneHeadingClassName={tierOneHeading}
            whyItMattersLine={whyItMattersLine}
            needsTrustWarning={needsTrustWarning}
            trustStateLabel={trustStateLabel}
            trustStateDetail={trustStateDetail}
            trustTimestamp={freshnessLabel}
            trustReason={isFallbackSnapshot ? artifact.freshnessLine ?? trustCueLine : undefined}
            stabilityRule={stabilityRule}
            decisionBullets={decisionBullets}
            guardrailPolicyDetails={guardrailPolicyDetails}
            flipPolicyDetails={flipPolicyDetails}
            roleTranslations={roleTranslations}
            activeRole={activeRole}
            roleHrefs={roleHrefs}
          />

          <InputInfluenceSection items={inputInfluence} />

          {diagnosticsLane ?? (
            <DiagnosticsSection
              weeklyMemoLines={weeklyMemoLines}
              immediateDecision={immediateDecision}
              revisitDecisions={revisitDecisions}
              guardrail={guardrail}
              regimeDistance={regimeDistance}
              postureWithStageLabel={postureWithStageLabel}
              statusLabel={statusLabel}
              trendLabel={trendLabel}
              confidencePercent={confidencePercent}
              decisionMatrix={decisionMatrix}
              decisionRules={decisionRules}
              roleAwareTemplates={roleAwareTemplates}
              evidenceItems={evidenceItems}
              reportDynamics={reportDynamics}
              weeklyMovement={weeklyMovement}
              transitionProbabilities={transitionProbabilities}
              failureModes={failureModes}
              sinceLastReview={sinceLastReview}
            />
          )}

          <BoundedRulesMatrix
            decisionMatrix={decisionMatrix}
            decisionRules={decisionRules}
            startupVariantPolicy={resolvedStartupVariantPolicy}
          />

          {actionStripItems.length > 0 ? (
            <ActionStripSection items={actionStripItems} />
          ) : null}

        </main>

        <aside className="space-y-4 xl:sticky xl:top-28">
          <ConfidenceMiniChart confidenceHistory={confidenceHistory} confidenceTrend={confidenceTrend} />
          <DecisionTransmissionRail
            actionNow={snapshotDoNow}
            guardrail={snapshotGuardrail}
            flipWhen={snapshotWatch}
            citationMetaLine={citationMetaLine}
            actions={actions}
          />

        </aside>
      </div>

      <CitationActionFooter citationMetaLine={citationMetaLine} citation={citation} />
    </section>
  );
}
