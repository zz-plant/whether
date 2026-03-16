import type { ReactNode } from "react";
import Link from "next/link";
import { Accordion } from "@base-ui/react/accordion";
import { CircleTargetIcon, ShieldIcon } from "./uiIcons";
import type { ConfidenceTrendFraming, ReportDynamics, ReportEvidenceItem, WeeklyConfidencePoint } from "../../lib/report/reportData";
import type { BoundedDecisionRule } from "../../lib/report/boundedDecisionRules";
import { decisionAreaLabel, type StartupVariantMode } from "../../lib/report/boundedDecisionRules";
import type { StartupModeContent } from "./startupModeSelector";
import { WeeklyCallModePanel } from "./weeklyCallModePanel";
import { DecisionHeroSection } from "./weekly-card/DecisionHeroSection";
import { DiagnosticsSection } from "./weekly-card/DiagnosticsSection";
import { ActionStripSection } from "./weekly-card/ActionStripSection";
import { PostureHistoryTimeline } from "./weekly-card/HistorySection";
import type { DiagnosticsSectionProps } from "./weekly-card/types";
import { compactActionCue, compactInset, compactRoleCue, compactSectionSpacing, disclosurePanelClass, disclosureSummaryClass, neutralLabel, sectionSpacing, tierOneHeading, tierOneInset, tierOnePanel, tierThreeHeading, tierThreePanel, tierTwoHeading, tierTwoInset, tierTwoPanel } from "./weekly-card/shared";
import type { ActionStripItem, RoleAwareOperatingTemplate } from "../../lib/report/operatingCalls";
import type { ForecastRegimeLabel, TransitionVelocityEstimate } from "../../lib/report/forecastModel";
import type { RegimeKey } from "../../lib/regimeEngine";
import type { DecisionMatrixPayload, StartupVariantPolicy, WeeklyDecisionCardViewModel } from "../../lib/report/homeBriefModel";
import { buildCompactFreshnessMeta, formatProbabilityPercent } from "../../lib/report/reportFormatting";
import { getOrderedRegimeLegend, getRegimeWeatherIcon, getRegimeWeatherLabel, getRegimeWeatherRationale, REGIME_BANNER_TOKENS, REGIME_LEGEND_DESCRIPTORS, type RegimeBannerTone, type RegimeWeatherIcon } from "../../lib/regimePresentation";
import { formatDateUTC } from "../../lib/formatters";
import {
  buildWeeklyCitationMetaLine,
  buildCompactTrustSummary,
} from "../../lib/report/trustStatus";
import type { CanonicalDecisionCopy } from "../../lib/report/canonicalDecisionCopy";
import { homeSectionSequence } from "../../lib/report/homeSections";
import {
  buildRoleTemplateBullets,
  buildWatchBullets,
} from "./weekly-card/decisionSupport";

const callSectionHref = homeSectionSequence[0]?.href ?? "#weekly-posture-brief-title";
const decideSectionHref = "#approve-this-weeks-plan";
const evidenceSectionHref = "#audit-this-call";

const sectionHrefByLabel = {
  call: callSectionHref,
  decide: decideSectionHref,
  evidence: evidenceSectionHref,
} as const;

type WhyThisCallItem = { label: string; detail: string };
type MemoryRailItem = { label: string; posture: string };
type MacroOverlayItem = { label: string; detail: string };
type HistoricalAnalogItem = { date: string; similarityScore: number; implication: string };
type FailureModeWarningItem = { id: string; warning: string; mitigationCheck: string };

type WeeklyMovement = {
  score: number;
  direction: "defensive" | "expansionary" | "neutral";
  summary: string;
};

type WeeklyDecisionCardModel =
  & WeeklyDecisionCardViewModel["status"]
  & WeeklyDecisionCardViewModel["decision"]
  & NonNullable<WeeklyDecisionCardViewModel["presentation"]>
  & WeeklyDecisionCardViewModel["diagnostics"]
  & WeeklyDecisionCardViewModel["history"]
  & WeeklyDecisionCardViewModel["artifact"];

type LegacyWeeklyDecisionCardProps = Omit<WeeklyDecisionCardModel, "immediateDecision" | "whyItMattersLine" | "readThisCardItems" | "glossaryHref"> & {
  immediateDecision?: string;
  whyItMattersLine?: string;
  readThisCardItems?: Array<{
    label: string;
    detail: string;
  }>;
  glossaryHref?: string;
  actions?: ReactNode;
  diagnosticsLane?: ReactNode;
};

export type WeeklyDecisionCardProps =
  | { model: WeeklyDecisionCardViewModel; actions?: ReactNode; diagnosticsLane?: ReactNode }
  | LegacyWeeklyDecisionCardProps;

export type WeeklyDecisionDiagnosticsLaneProps = DiagnosticsSectionProps;
export const WeeklyDecisionDiagnosticsLane = DiagnosticsSection;
export const DecisionCallHeader = DecisionHeroSection;

const DiagnosticsAccordionTrigger = ({ label }: { label: string }) => (
  <Accordion.Header>
    <Accordion.Trigger className={`${disclosureSummaryClass} group cursor-pointer list-none touch-manipulation`}>
      <span>{label}</span>
      <span aria-hidden="true" className="weather-disclosure-trigger-indicator text-sm group-data-[panel-open]:rotate-180">▾</span>
    </Accordion.Trigger>
  </Accordion.Header>
);

const SummaryLabel = ({
  label,
  icon,
}: {
  label: string;
  icon: ReactNode;
}) => (
  <p className={`inline-flex items-center gap-1.5 text-xs ${neutralLabel}`}>
    <span className="text-slate-400" aria-hidden="true">{icon}</span>
    <span>{label}</span>
  </p>
);


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

const resolveHeroUrgency = ({
  confidenceLabel,
  transitionWatch,
  pointsToFlip,
}: {
  confidenceLabel: WeeklyDecisionCardModel["confidenceLabel"];
  transitionWatch: WeeklyDecisionCardModel["transitionWatch"];
  pointsToFlip: number;
}) => {
  if (confidenceLabel === "LOW" || transitionWatch === "ON" || pointsToFlip <= 3) {
    return "high";
  }
  if (confidenceLabel === "MED" || pointsToFlip <= 6) {
    return "medium";
  }
  return "low";
};



const resolveEvidenceTone = (directionLabel: string): "positive" | "warning" | "neutral" => {
  const normalized = directionLabel.toLowerCase();
  if (normalized.includes("improv") || normalized.includes("ease") || normalized.includes("loos")) {
    return "positive";
  }
  if (normalized.includes("tight") || normalized.includes("deterior") || normalized.includes("stress")) {
    return "warning";
  }
  return "neutral";
};

const resolvePosturePosition = (label: string) => {
  const normalized = label.toLowerCase();
  if (normalized.includes("defensive") || normalized.includes("scarcity")) return 20;
  if (normalized.includes("mixed") || normalized.includes("watch")) return 45;
  if (normalized.includes("expansion") || normalized.includes("accelerat")) return 80;
  return 50;
};



const MicroSignalIndicators = ({
  indicators,
}: {
  indicators: WeeklyDecisionCardModel["regimeSignalIndicators"];
}) => (
  <div className="grid gap-1.5 sm:grid-cols-2" aria-label="Regime micro indicators">
    {indicators.map((indicator) => {
      const sparkline = indicator.sparkline.length > 0 ? indicator.sparkline : [0];
      const max = Math.max(...sparkline.map((value) => Math.abs(value)), 1);

      return (
        <div key={indicator.key} className="rounded-md border border-slate-700/60 bg-slate-950/55 px-2.5 py-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-300">{indicator.label}</p>
            <p className="text-xs font-semibold text-slate-100">{indicator.valueLabel}</p>
          </div>
          <div className="mt-1.5 flex items-center justify-between gap-2">
            <p className="text-[11px] text-slate-300">
              <span className="font-semibold text-slate-100" aria-hidden="true">{indicator.trendArrow}</span>{" "}
              {indicator.isFallback ? "Fallback" : indicator.trendDeltaLabel}
            </p>
            <div className="flex h-4 items-end gap-0.5" aria-hidden="true">
              {sparkline.map((value, index) => {
                const height = Math.max(3, Math.round((Math.abs(value) / max) * 14));
                return (
                  <span
                    key={`${indicator.key}-${index}-${value}`}
                    className="w-1 rounded-sm bg-slate-400/80"
                    style={{ height: `${height}px` }}
                  />
                );
              })}
            </div>
          </div>
        </div>
      );
    })}
  </div>
);

const SignalStrip = ({
  indicators,
}: {
  indicators: WeeklyDecisionCardModel["regimeSignalIndicators"];
}) => {
  if (indicators.length === 0) {
    return null;
  }

  return (
    <section
      className="rounded-md border border-slate-800/70 bg-slate-950/55 px-3 py-2"
      aria-label="Signals strip"
    >
      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
        <p className="mr-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">Signals</p>
        {indicators.map((indicator) => (
          <span
            key={`signal-strip-${indicator.key}`}
            className="inline-flex items-center gap-1 rounded-full border border-slate-700/70 bg-slate-900/80 px-2 py-0.5 text-slate-200"
          >
            <span className="font-medium text-slate-300">{indicator.label}</span>
            <span className="font-semibold text-slate-100">{indicator.valueLabel}</span>
            {!indicator.isFallback ? <span aria-hidden="true">{indicator.trendArrow}</span> : null}
          </span>
        ))}
      </div>
    </section>
  );
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
  operatingStanceLine: string;
  actionNowShort?: string;
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

function RegimeLegend({
  activeRegime,
  tone,
  operatingLine,
  regimeDistance,
}: {
  activeRegime: RegimeKey;
  tone: RegimeBannerTone;
  operatingLine: string;
  regimeDistance?: WeeklyDecisionCardModel["regimeDistance"];
}) {
  const legendItems = getOrderedRegimeLegend();
  const activeDescriptor = REGIME_LEGEND_DESCRIPTORS[activeRegime];
  const activeWeather = getRegimeWeatherLabel(activeRegime);
  const activeWeatherIcon = getRegimeWeatherIcon(activeRegime);
  const activeWeatherRationale = getRegimeWeatherRationale(activeRegime);
  const flipRiskState = resolveFlipRiskMeterState(regimeDistance);

  return (
    <div className={`mt-3 rounded-lg border px-3 py-2.5 ${tone.legendPanel}`} aria-label="Regime legend">
      <div className={`rounded-md border p-3 ${tone.calloutSurface}`}>
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(15rem,0.8fr)] lg:items-center">
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-slate-200">Current read</p>
            <div className={`flex flex-wrap items-center gap-2 text-sm ${tone.weatherHint}`}>
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/45 text-slate-100">
                <RegimeWeatherGlyph icon={activeWeatherIcon} title={activeWeather} />
              </span>
              <span className="text-base font-semibold text-slate-50">{activeWeather}</span>
              <span className="rounded-full border border-slate-700/70 bg-slate-950/55 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-200">
                {flipRiskState.urgencyLabel} flip risk
              </span>
            </div>
            <p className="text-sm font-semibold text-slate-50">{operatingLine}</p>
            <p className="text-xs leading-5 text-slate-200/90">
              {activeWeatherRationale} {activeDescriptor}
            </p>
          </div>
          <div className="rounded-xl border border-slate-700/65 bg-slate-950/45 px-3 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-slate-300">Flip window</p>
            <div className={`mt-2 h-2.5 overflow-hidden rounded-full ${tone.meterTrack}`} aria-hidden="true">
              <span
                className={`block h-full rounded-full ${flipRiskFillClass[flipRiskState.urgencyLabel]} ${tone.meterFill}`}
                style={{ ["--weather-meter-fill" as string]: `${flipRiskState.progressPercent / 100}` }}
              />
            </div>
            <p className="mt-2 text-[11px] leading-5 text-slate-200">{flipRiskState.detailLabel}</p>
            <p className="mt-1 text-[10px] leading-5 text-slate-300/95">
              <span className="font-semibold text-slate-200">Flip trigger:</span> {flipRiskState.triggerLabel}
            </p>
          </div>
        </div>
      </div>
      <div className="mt-2.5 flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-300">
        <p>Tighter conditions</p>
        <p aria-hidden="true">→</p>
        <p>Looser conditions</p>
      </div>
      <ol className="mt-2 flex flex-wrap items-center gap-1.5 sm:flex-nowrap" aria-label="Ordered regime states from scarcity to expansion">
        {legendItems.map((item, index) => {
          const active = item.regime === activeRegime;
          return (
            <li key={item.regime} className="inline-flex items-center gap-1.5">
              <span
                className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap ${active
                  ? tone.activePill
                  : "border-slate-600/70 bg-slate-900/85 text-slate-300"}`}
                aria-current={active ? "step" : undefined}
                aria-label={active ? `${item.ariaLabel} (current)` : item.ariaLabel}
              >
                <RegimeWeatherGlyph icon={item.weatherIcon} title={item.weather} />
                <span>{item.label}</span>
                <span className="text-[10px] font-medium text-slate-300/90">· {item.weather}</span>
                <span className="sr-only">{active ? " (current regime)" : ""}</span>
              </span>
              {index < legendItems.length - 1 ? <span className="text-slate-500" aria-hidden="true">→</span> : null}
            </li>
          );
        })}
      </ol>
      <p className={`mt-2 flex flex-wrap items-center gap-1.5 text-xs ${tone.weatherHint}`}>
        <RegimeWeatherGlyph icon={activeWeatherIcon} title={activeWeather} />
        <span>
          <span className="font-semibold text-slate-100">Why it fits:</span> {activeWeatherRationale}
        </span>
      </p>
    </div>
  );
}

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
  operatingStanceLine,
  actionNowShort,
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
  const operatingLine = operatingStanceLine.trim() || actionNowShort?.trim() || "Hold bounded operating rules until next refresh.";
  const bannerTone = REGIME_BANNER_TOKENS[regimeKey];
  const activeWeather = getRegimeWeatherLabel(regimeKey);
  const activeWeatherIcon = getRegimeWeatherIcon(regimeKey);
  const flipRiskState = resolveFlipRiskMeterState(regimeDistance);

  return (
    <header className={`z-10 rounded-2xl border px-5 py-5 shadow-[0_24px_54px_rgba(2,6,23,0.5)] backdrop-blur md:sticky md:top-2 sm:px-6 sm:py-6 ${bannerTone.shell}`} data-testid="weekly-regime-banner" aria-label="Weekly regime banner">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-100/85">
            <span>Current outlook</span>
            <span className="rounded-full border border-white/10 bg-slate-950/35 px-2.5 py-1">
              Week of {recordDateLabel}
            </span>
          </div>
          <div id="weekly-posture-brief-title" className="flex items-start gap-3">
            <span className="weather-icon-chip mt-1 h-12 w-12 flex-shrink-0 text-slate-50">
              <RegimeWeatherGlyph icon={activeWeatherIcon} title={activeWeather} />
            </span>
            <div className="min-w-0">
              <p className="text-2xl font-semibold leading-tight sm:text-3xl">{resolvedPostureLabel}</p>
              <p className="mt-1 text-sm font-semibold text-slate-100/90 sm:text-base">{resolvedStageLabel} cycle</p>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-50/90">{operatingLine}</p>
            </div>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-3 xl:min-w-[24rem]">
          <div className="rounded-xl border border-white/10 bg-slate-950/28 px-3 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-200/80">Weather</p>
            <p className="mt-1 text-sm font-semibold text-slate-50">{activeWeather}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-slate-950/28 px-3 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-200/80">Confidence</p>
            <p className="mt-1 text-sm font-semibold text-slate-50">{confidenceLabel} {Math.round(confidencePercent)}%</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-slate-950/28 px-3 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-200/80">Flip watch</p>
            <p className="mt-1 text-sm font-semibold text-slate-50">{flipRiskState.urgencyLabel} · {flipRiskValue}</p>
          </div>
        </div>
      </div>
      <p className={`mt-3 overflow-x-auto text-xs font-semibold whitespace-nowrap ${bannerTone.metrics}`} aria-label="Regime metrics line">
        <span>Trend {trendValue}</span>
        <span className="px-1.5" aria-hidden="true">·</span>
        <span>Stage {resolvedStageLabel}</span>
        <span className="px-1.5" aria-hidden="true">·</span>
        <span>Flip risk {flipRiskValue}</span>
      </p>
      <RegimeLegend activeRegime={regimeKey} tone={bannerTone} operatingLine={operatingLine} regimeDistance={regimeDistance} />
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
          approve: { text: rule?.doNow[0] ?? "Stage approvals", detail: rule?.rationale ?? "Keep approvals tied to near-term proof." },
          delay: { text: rule?.avoidNow[0] ?? "Delay irreversible commitments", detail: rule?.pauseTrigger ?? "Pause when thresholds weaken." },
          flip: { text: rule?.resumeTrigger ?? "Flip after threshold recovery", detail: rule?.resumeTrigger ?? "Resume only after threshold recovery holds." },
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
            },
            delay: {
              text: matrixRow?.cells.delay.text ?? rule?.avoidNow[0] ?? "Delay irreversible commitments",
              detail: matrixRow?.cells.delay.detail ?? rule?.pauseTrigger ?? "Pause when thresholds weaken.",
            },
            flip: {
              text: matrixRow?.cells.flip.text ?? rule?.resumeTrigger ?? "Flip after threshold recovery",
              detail: matrixRow?.cells.flip.detail ?? rule?.resumeTrigger ?? "Resume only after threshold recovery holds.",
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
      <p className="text-xs leading-5 text-slate-300">Scan Approve/Delay/Flip across core operating decisions, then open a cell for rationale and threshold context.</p>
      <div className="mt-2 overflow-x-auto hidden sm:block">
        <table className="min-w-full border-separate border-spacing-2 text-xs text-slate-100" aria-label="Bounded decision matrix">
          <thead>
            <tr>
              <th scope="col" className="rounded-md border border-slate-700/70 bg-slate-950/70 px-2.5 py-2 text-left font-semibold text-slate-300">Decision area</th>
              <th scope="col" className="rounded-md border border-slate-700/70 bg-slate-950/70 px-2.5 py-2 text-left font-semibold text-slate-300">Context</th>
              {matrix.columns.map((column) => (
                <th key={column.key} scope="col" className="rounded-md border border-slate-700/70 bg-slate-950/70 px-2.5 py-2 text-left font-semibold text-slate-200">{column.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.rows.map((row) => (
              <tr key={row.key}>
                <th scope="row" className="rounded-md border border-slate-700/70 bg-slate-950/75 px-2.5 py-2 text-left font-semibold text-slate-100">{row.label}</th>
                <td className="rounded-md border border-slate-700/55 bg-slate-950/60 px-2.5 py-2 align-top text-[11px] leading-5 text-slate-300">{row.context}</td>
                {matrix.columns.map((column) => {
                  const cell = row.cells[column.key];
                  return (
                    <td key={`${row.key}-${column.key}`} className="rounded-md border border-slate-700/55 bg-slate-950/60 px-2.5 py-2 align-top">
                      <details className="group">
                        <summary className="cursor-pointer list-none text-[11px] font-medium leading-5 text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300">
                          {compactActionCue(cell.text)}
                        </summary>
                        <p className="mt-1 text-[11px] leading-5 text-slate-300">{cell.detail}</p>
                      </details>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-2 space-y-2 sm:hidden">
        {matrix.rows.map((row) => (
          <article key={`mobile-${row.key}`} className="rounded-md border border-slate-700/55 bg-slate-950/60 p-2.5">
            <p className="text-xs font-semibold text-slate-100">{row.label}</p>
            <p className="mt-1 text-[11px] leading-5 text-slate-300">{row.context}</p>
            <div className="mt-2 space-y-1.5">
              {matrix.columns.map((column) => {
                const cell = row.cells[column.key];
                return (
                  <details key={`mobile-${row.key}-${column.key}`} className="rounded border border-slate-700/60 bg-slate-950/70 px-2 py-1.5">
                    <summary className="cursor-pointer list-none text-[11px] leading-5 text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300">
                      <span className="font-semibold text-slate-300">{column.label}:</span> {compactActionCue(cell.text)}
                    </summary>
                    <p className="mt-1 text-[11px] leading-5 text-slate-300">{cell.detail}</p>
                  </details>
                );
              })}
            </div>
          </article>
        ))}
      </div>
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
  actions?: ReactNode;
};

export function CitationActionFooter({ citationMetaLine, citation, actions }: CitationActionFooterProps) {
  return (
    <article id="citation-actions" className={`${tierThreePanel} ${sectionSpacing}`}>
      <h2 className={tierThreeHeading}>Cite this call</h2>
      <p className="mt-2 text-xs text-slate-300">{citationMetaLine}</p>
      <pre className="mt-2 overflow-x-auto rounded-md border border-slate-700/70 bg-slate-950/75 px-3 py-2 font-mono whitespace-pre-wrap text-xs text-slate-300">{citation}</pre>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-700/60 bg-slate-950/60 px-3 py-3 text-xs text-slate-300">
        <span>Use this citation in meeting notes, board updates, or operating memos.</span>
        <span className="font-semibold uppercase tracking-[0.12em] text-slate-200">Send to team</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-3">
        <div className="hidden sm:flex sm:flex-wrap sm:gap-3">{actions}</div>
      </div>
    </article>
  );
}

export function WeeklyDecisionCard(props: WeeklyDecisionCardProps) {
  const model = "model" in props
    ? props.model
    : ({
      status: {
        statusLabel: props.statusLabel,
        regimeKey: props.regimeKey,
        postureLabel: props.postureLabel,
        stageLabel: props.stageLabel,
        postureWithStageLabel: props.postureWithStageLabel,
        postureDelta: props.postureDelta,
        confidenceLabel: props.confidenceLabel,
        confidencePercent: props.confidencePercent,
        signalConfidenceReason: props.signalConfidenceReason,
        regimeHeader: props.regimeHeader,
        trendLabel: props.trendLabel,
        confidenceHistory: props.confidenceHistory,
        confidenceTrend: props.confidenceTrend,
        transitionWatch: props.transitionWatch,
        isFallbackSnapshot: props.isFallbackSnapshot,
      },
      decision: {
        operatingStanceLine: props.operatingStanceLine,
        weeklyMemoLines: props.weeklyMemoLines,
        netConstraintSummary: props.netConstraintSummary,
        guardrail: props.guardrail,
        reversalTrigger: props.reversalTrigger,
        actionNowShort: props.actionNowShort,
        immediateDecision: props.canonicalDecisionCopy?.doNowLines[0]
          ?? props.actionNowShort?.trim()
          ?? (props.revisitDecisions ? "Revise hiring and roadmap calls now." : "Hold last week's operating rules."),
        guardrailThreshold: props.guardrailThreshold,
        flipThreshold: props.flipThreshold,
        compactFlipConditionLabels: props.compactFlipConditionLabels,
        canonicalDecisionCopy: props.canonicalDecisionCopy,
        canonicalFlipConditions: props.canonicalFlipConditions,
        reportDynamics: props.reportDynamics,
        decisionShiftSummary: props.decisionShiftSummary,
        transitionProbabilities: props.transitionProbabilities,
        decisionRules: props.decisionRules,
        decisionMatrix: props.decisionMatrix,
        startupVariantPolicy: props.startupVariantPolicy,
        actionStripItems: props.actionStripItems,
        roleAwareTemplates: props.roleAwareTemplates,
        executiveOperationalStance: props.executiveOperationalStance,
        revisitDecisions: props.revisitDecisions,
        weeklyMovement: props.weeklyMovement,
      },
      presentation: {
        whyItMattersLine: props.whyItMattersLine,
        readThisCardItems: props.readThisCardItems ?? [],
        glossaryHref: props.glossaryHref,
      },
      diagnostics: {
        regimeSignalIndicators: props.regimeSignalIndicators,
        startupClimateIndex: props.startupClimateIndex,
        regimeDistance: props.regimeDistance,
        regimeVelocity: props.regimeVelocity,
        whyThisCall: props.whyThisCall,
        evidenceItems: props.evidenceItems,
        failureModes: props.failureModes,
      },
      history: {
        memoryRail: props.memoryRail,
        historicalTimeline: props.historicalTimeline,
        historicalAnalogs: props.historicalAnalogs,
        macroOverlay: props.macroOverlay,
      },
      sinceLastReview: {
        isReturningUser: false,
        hasMeaningfulDelta: false,
        fallbackCopy: "",
        items: [],
      },
      artifact: {
        citation: props.citation,
        recordDateLabel: props.recordDateLabel,
        fetchedAtLabel: props.fetchedAtLabel,
        freshnessLine: props.freshnessLine,
      },
    } satisfies WeeklyDecisionCardViewModel);

  const actions = props.actions;
  const diagnosticsLane = props.diagnosticsLane;
  const { status, decision, presentation, diagnostics, history, artifact } = model;
  const {
    statusLabel,
    regimeKey,
    postureLabel,
    stageLabel,
    postureWithStageLabel,
    confidenceLabel,
    confidencePercent,
    regimeHeader,
    trendLabel,
    confidenceHistory = [],
    confidenceTrend = "unstable",
    transitionWatch,
    isFallbackSnapshot = false,
  } = status;
  const {
    operatingStanceLine,
    weeklyMemoLines,
    netConstraintSummary,
    guardrail,
    reversalTrigger,
    actionNowShort,
    immediateDecision,
    flipThreshold,
    compactFlipConditionLabels = [],
    canonicalDecisionCopy,
    canonicalFlipConditions = [],
    reportDynamics,
    decisionShiftSummary: _decisionShiftSummary,
    transitionProbabilities,
    decisionRules,
    decisionMatrix,
    startupVariantPolicy,
    actionStripItems: _actionStripItems = [],
    roleAwareTemplates,
    executiveOperationalStance,
    revisitDecisions,
    weeklyMovement,
  } = decision;
  const {
    whyItMattersLine,
    readThisCardItems = [],
    glossaryHref,
  } = presentation ?? {};
  const {
    regimeSignalIndicators = [],
    startupClimateIndex,
    regimeDistance,
    regimeVelocity,
    whyThisCall,
    evidenceItems,
    failureModes = [],
  } = diagnostics;
  const { memoryRail, historicalTimeline, historicalAnalogs, macroOverlay } = history;
  const sinceLastReview = model.sinceLastReview;
  const { citation, recordDateLabel, fetchedAtLabel, freshnessLine } = artifact;
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
  const snapshotAvoid = executiveOperationalStance.avoid[0] ?? guardrail;
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

  const needsTrustWarning = isFallbackSnapshot || confidenceLabel !== "HIGH" || freshnessLabel === "Unavailable";
  const trustWarningCopy = isFallbackSnapshot
    ? "Using a cached snapshot. Use this call for near-term pacing only and pause irreversible decisions until live refresh returns."
    : "Use this call for near-term pacing only until confidence returns to HIGH with fresh data.";
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
  const modeContentByMode = resolvedStartupVariantPolicy.options.reduce<Partial<Record<StartupVariantMode, StartupModeContent>>>((contentMap, option) => {
    const scopedAdjustment = resolvedStartupVariantPolicy.adjustmentsByMode[option.mode];
    if (!scopedAdjustment) {
      return contentMap;
    }

    contentMap[option.mode] = {
      description: scopedAdjustment.description,
      thresholdEmphasis: scopedAdjustment.thresholdEmphasis,
      doNowBullets: [
        ...buildRoleTemplateBullets({ roleAwareTemplates, field: "doNow" }),
        ...scopedAdjustment.doNowAdjustments,
      ].slice(0, 5),
      avoidBullets: [
        ...buildRoleTemplateBullets({ roleAwareTemplates, field: "avoidNow" }),
        ...scopedAdjustment.avoidAdjustments,
      ].slice(0, 5),
      watchBullets: [
        ...buildWatchBullets({ regimeDistance, regimeVelocity }),
        ...scopedAdjustment.watchAdjustments,
      ].slice(0, 5),
      reversalTriggerDiscipline: scopedAdjustment.reversalTriggerDiscipline,
    };

    return contentMap;
  }, {});
  const resolvedRegimeKey = regimeKey ?? "DEFENSIVE";

  return (
    <section className="weather-panel space-y-4 px-4 py-5 sm:space-y-5 sm:px-6 sm:py-6 lg:px-7 lg:py-7" aria-labelledby="weekly-posture-brief-title">
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
        operatingStanceLine={operatingStanceLine}
        actionNowShort={actionNowShort}
        regimeDistance={regimeDistance}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.28fr)_minmax(19rem,0.82fr)] xl:items-start">
        <main className="space-y-4">
          <WeeklyCallModePanel
            startupVariantPolicy={resolvedStartupVariantPolicy}
            modeContentByMode={modeContentByMode}
            postureLabel={postureWithStageLabel ?? statusLabel}
            operatingCall={canonicalDecisionCopy?.operatingCall ?? operatingStanceLine}
            trendLabel={trendLabel}
            confidencePercent={confidencePercent}
            confidenceLabel={confidenceLabel}
            snapshotDoNow={snapshotDoNow}
            snapshotAvoid={snapshotAvoid}
            snapshotWatch={snapshotWatch}
            effectiveFlipLabels={effectiveFlipLabels}
            compactInsetClassName={compactInset}
            tierOnePanelClassName={tierOnePanel}
            sectionSpacingClassName={sectionSpacing}
            tierOneHeadingClassName={tierOneHeading}
            whyItMattersLine={whyItMattersLine}
            readThisCardItems={readThisCardItems}
            glossaryHref={glossaryHref}
            trustCueLine={trustCueLine}
            needsTrustWarning={needsTrustWarning}
            trustWarningCopy={trustWarningCopy}
            actions={actions}
          />

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
              historicalTimeline={historicalTimeline}
              sinceLastReview={sinceLastReview}
              renderBoundedRulesMatrix={({ decisionMatrix: matrix, decisionRules: rules }) => <BoundedRulesMatrix decisionMatrix={matrix} decisionRules={rules} />}
            />
          )}

        </main>

        <aside className="space-y-4 xl:sticky xl:top-28">
          <ConfidenceMiniChart confidenceHistory={confidenceHistory} confidenceTrend={confidenceTrend} />

        </aside>
      </div>

      {actions ? (
        <div id="primary-artifact-actions" className="rounded-xl border border-sky-500/40 bg-slate-950/92 p-3 sm:hidden" aria-label="Primary artifact actions">
          {actions}
        </div>
      ) : null}

      <CitationActionFooter citationMetaLine={citationMetaLine} citation={citation} actions={actions} />
    </section>
  );
}
