import type { ReactNode } from "react";
import Link from "next/link";
import { Accordion } from "@base-ui/react/accordion";
import { CircleTargetIcon, ShieldIcon } from "./uiIcons";
import type { ConfidenceTrendFraming, ReportDynamics, ReportEvidenceItem, WeeklyConfidencePoint } from "../../lib/report/reportData";
import type { BoundedDecisionRule } from "../../lib/report/boundedDecisionRules";
import { decisionAreaLabel, type StartupVariantMode } from "../../lib/report/boundedDecisionRules";
import type { StartupModeContent } from "./startupModeSelector";
import { WeeklyCallModePanel } from "./weeklyCallModePanel";
import type { ActionStripItem, RoleAwareOperatingTemplate } from "../../lib/report/operatingCalls";
import type { ForecastRegimeLabel, TransitionVelocityEstimate } from "../../lib/report/forecastModel";
import type { RegimeKey } from "../../lib/regimeEngine";
import type { DecisionMatrixPayload, StartupVariantPolicy } from "../../lib/report/homeBriefModel";
import { formatProbabilityPercent } from "../../lib/report/reportFormatting";
import { getOrderedRegimeLegend, REGIME_BANNER_TOKENS, REGIME_LEGEND_DESCRIPTORS, type RegimeBannerTone } from "../../lib/regimePresentation";
import { formatDateUTC } from "../../lib/formatters";
import {
  buildWeeklyCitationMetaLine,
  buildCompactTrustSummary,
} from "../../lib/report/trustStatus";
import type { CanonicalDecisionCopy } from "../../lib/report/canonicalDecisionCopy";

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

type DecisionDeltaStripItem = {
  id: "changed" | "revisit" | "flip";
  label: string;
  detail: string;
  impact: "high" | "medium" | "low";
  href: string;
};

export type WeeklyDecisionCardProps = {
  statusLabel: string;
  regimeKey?: RegimeKey;
  postureLabel: string;
  stageLabel: string;
  postureWithStageLabel?: string;
  postureDelta: string;
  confidenceLabel: "HIGH" | "MED" | "LOW";
  confidencePercent: number;
  signalConfidenceReason: string;
  regimeHeader: {
    regime: string;
    confidence: string;
    primaryRisk: string;
  };
  trendLabel: string;
  confidenceHistory: WeeklyConfidencePoint[];
  confidenceTrend: ConfidenceTrendFraming;
  regimeSignalIndicators: Array<{
    key: "tightness" | "riskAppetite" | "baseRate" | "curveSlope";
    label: string;
    valueLabel: string;
    rawValue: number | null;
    trendArrow: "↑" | "↓" | "→";
    trendDeltaLabel: string;
    sparkline: number[];
    isFallback: boolean;
  }>;
  transitionWatch: "ON" | "OFF";
  operatingStanceLine: string;
  weeklyMemoLines: string[];
  netConstraintSummary: string;
  guardrail: string;
  reversalTrigger: string;
  actionNowShort?: string;
  guardrailThreshold?: string;
  flipThreshold?: string;
  compactFlipConditionLabels?: string[];
  canonicalDecisionCopy?: CanonicalDecisionCopy;
  canonicalFlipConditions?: Array<{
    area: BoundedDecisionRule["area"];
    metric: "tightness" | "riskAppetite";
    operator: ">" | ">=" | "<" | "<=";
    value: number;
    label: string;
  }>;
  recordDateLabel: string;
  fetchedAtLabel: string;
  reportDynamics: ReportDynamics;
  decisionShiftSummary: string;
  transitionProbabilities: Record<ForecastRegimeLabel, number>;
  decisionRules: BoundedDecisionRule[];
  decisionMatrix?: DecisionMatrixPayload;
  startupVariantPolicy?: StartupVariantPolicy;
  actionStripItems?: ActionStripItem[];
  roleAwareTemplates: RoleAwareOperatingTemplate[];
  executiveOperationalStance: { expand: string[]; avoid: string[] };
  revisitDecisions: boolean;
  weeklyMovement: WeeklyMovement;
  memoryRail: MemoryRailItem[];
  historicalTimeline: Array<{ label: string; posture: string; month?: number; year?: number; recordDate?: string; summary?: string; isCurrent?: boolean }>;
  historicalAnalogs: HistoricalAnalogItem[];
  macroOverlay: MacroOverlayItem[];
  whyThisCall: WhyThisCallItem[];
  evidenceItems: ReportEvidenceItem[];
  startupClimateIndex: {
    score: number;
    status: string;
    breakdown: Array<{ label: string; score: number }>;
  };
  regimeDistance: {
    dimensionLabel: string;
    dimensionKey: "tightness" | "riskAppetite";
    currentValue: number;
    thresholdValue: number;
    pointsToFlip: number;
    thresholdDirection: "riseAbove" | "fallToOrBelow";
  };
  regimeVelocity: TransitionVelocityEstimate;
  citation: string;
  isFallbackSnapshot?: boolean;
  failureModes?: FailureModeWarningItem[];
  actions?: ReactNode;
};

const sectionSpacing = "space-y-3";
const tierOneHeading = "text-sm font-semibold tracking-[0.01em] text-slate-50";
const tierTwoHeading = "text-sm font-semibold tracking-[0.01em] text-slate-200";
const tierThreeHeading = "text-xs font-medium tracking-normal text-slate-400";
const tierOnePanel = "rounded-xl border border-slate-700/55 bg-slate-950/84 p-5";
const tierTwoPanel = "rounded-xl border border-slate-800/45 bg-slate-950/62 p-4";
const tierThreePanel = "rounded-xl border border-slate-800/28 bg-slate-950/32 p-2.5";
const tierOneInset = "rounded-lg border border-slate-800/55 bg-slate-950/62 px-3 py-3";
const tierTwoInset = "rounded-md border border-slate-800/38 bg-slate-950/50 px-3 py-2.5";
const tierThreeInset = "rounded-md border border-slate-800/24 bg-slate-950/28 px-2.5 py-2.5 text-slate-400";
const compactSectionSpacing = "space-y-2";
const compactInset = "rounded-md border border-slate-800/32 bg-slate-950/42 px-2.5 py-2";
const neutralLabel = "font-semibold tracking-[0.01em] text-slate-300";
const disclosureSummaryClass =
  "flex min-h-[44px] w-full items-center justify-between gap-3 rounded-md border border-slate-800/52 bg-slate-950/56 px-3 py-2 text-left text-xs font-semibold tracking-[0.01em] text-slate-100 transition hover:border-slate-600/60 hover:bg-slate-900/74 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300";

const disclosurePanelClass = "mt-3";

const DiagnosticsAccordionTrigger = ({ label }: { label: string }) => (
  <Accordion.Header>
    <Accordion.Trigger className={`${disclosureSummaryClass} group cursor-pointer list-none touch-manipulation`}>
      <span>{label}</span>
      <span aria-hidden="true" className="text-sm transition group-data-[panel-open]:rotate-180">▾</span>
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

const buildFounderDecisionRows = ({
  postureLabel,
  guardrail,
  reversalTrigger,
}: {
  postureLabel: string;
  guardrail: string;
  reversalTrigger: string;
}) => {
  const normalizedLabel = postureLabel.toLowerCase();

  if (normalizedLabel.includes("scarcity") || normalizedLabel.includes("contraction")) {
    return [
      { area: "Hiring", action: "Tighten to backfills and revenue-critical roles", cue: guardrail },
      { area: "Fundraising", action: "Prioritize raise readiness now; avoid timing risk", cue: reversalTrigger },
      { area: "Runway", action: "Extend runway and freeze irreversible spend", cue: "Review weekly until trigger clears" },
    ];
  }

  if (normalizedLabel.includes("defensive") || normalizedLabel.includes("mixed") || normalizedLabel.includes("transitional")) {
    return [
      { area: "Hiring", action: "Hold net-new hiring to highest-payback roles", cue: guardrail },
      { area: "Fundraising", action: "Prepare raise narrative and move when window improves", cue: reversalTrigger },
      { area: "Runway", action: "Maintain runway floor with tranche-based releases", cue: "Require explicit stop triggers" },
    ];
  }

  return [
    { area: "Hiring", action: "Accelerate selectively in proven demand lanes", cue: guardrail },
    { area: "Fundraising", action: "Run a planned process while market weather is supportive", cue: reversalTrigger },
    { area: "Runway", action: "Deploy on reversible bets and protect downside bands", cue: "Pause if threshold trigger fires" },
  ];
};

const compactActionCue = (text: string) =>
  text
    .replace(/^(Pause|Resume)\s+/i, "")
    .replace(/\.$/, "")
    .replace(/^when\s+/i, "")
    .trim();

const compactRoleCue = (text: string) =>
  text
    .replace(/\s+/g, " ")
    .replace(/\.\s+/g, "; ")
    .replace(/;\s*$/, "")
    .trim();

const normalizeCueFragments = (text: string) =>
  compactRoleCue(text)
    .split(";")
    .map((fragment) => fragment.trim().replace(/[.;]+$/, ""))
    .filter(Boolean);

const buildDecisionDeltaStripItems = ({
  weeklyMemoLines,
  immediateDecision,
  revisitDecisions,
  guardrail,
  regimeDistance,
}: {
  weeklyMemoLines: string[];
  immediateDecision: string;
  revisitDecisions: boolean;
  guardrail: string;
  regimeDistance: WeeklyDecisionCardProps["regimeDistance"];
}): DecisionDeltaStripItem[] => {
  const firstDelta = weeklyMemoLines.find((line) => line.trim().length > 0) ?? immediateDecision;
  const flipDirection = regimeDistance.thresholdDirection === "riseAbove" ? "rises above" : "falls to or below";
  const flipDistance = Math.max(0, Math.round(regimeDistance.pointsToFlip));

  return [
    {
      id: "changed",
      label: "Changed",
      detail: firstDelta,
      impact: "high",
      href: "#weekly-call-core",
    },
    {
      id: "revisit",
      label: "Revisit",
      detail: revisitDecisions ? `YES — ${guardrail}` : "NO — Hold last week’s operating posture.",
      impact: revisitDecisions ? "high" : "low",
      href: "#decision-snapshot-for-leadership-this-week",
    },
    {
      id: "flip",
      label: "Flip",
      detail: `${regimeDistance.dimensionLabel} ${flipDirection} ${regimeDistance.thresholdValue.toFixed(1)} (${flipDistance} pts away).`,
      impact: flipDistance <= 3 ? "high" : "medium",
      href: "#evidence-diagnostics",
    },
  ];
};

const impactToneClass: Record<DecisionDeltaStripItem["impact"], string> = {
  high: "border-amber-400/45 bg-amber-500/10 text-amber-100",
  medium: "border-sky-400/45 bg-sky-500/10 text-sky-100",
  low: "border-emerald-400/45 bg-emerald-500/10 text-emerald-100",
};

const buildRoleTemplateBullets = ({
  roleAwareTemplates,
  field,
  maxItems = 5,
}: {
  roleAwareTemplates: RoleAwareOperatingTemplate[];
  field: "doNow" | "avoidNow";
  maxItems?: number;
}) => {
  const uniqueBullets = new Set<string>();

  roleAwareTemplates.forEach((template) => {
    normalizeCueFragments(template[field]).forEach((fragment) => {
      const normalized = fragment.toLowerCase();
      if (!uniqueBullets.has(normalized)) {
        uniqueBullets.add(normalized);
      }
    });
  });

  return Array.from(uniqueBullets)
    .slice(0, Math.max(1, maxItems))
    .map((bullet) => bullet.charAt(0).toUpperCase() + bullet.slice(1));
};

const buildWatchBullets = ({
  regimeDistance,
  regimeVelocity,
}: {
  regimeDistance: WeeklyDecisionCardProps["regimeDistance"];
  regimeVelocity: TransitionVelocityEstimate;
}) => {
  const distanceDirection = regimeDistance.thresholdDirection === "riseAbove" ? "rises above" : "falls to or below";
  const distanceBullet = `${regimeDistance.dimensionLabel} ${distanceDirection} ${regimeDistance.thresholdValue.toFixed(1)} (${Math.max(0, regimeDistance.pointsToFlip).toFixed(1)} pts away)`;
  const velocityBullet = regimeVelocity.status === "ok"
    ? `${regimeVelocity.from}→${regimeVelocity.to} can flip in ${regimeVelocity.typicalRangeLabel}`
    : `${regimeVelocity.from}→${regimeVelocity.to} timing is uncertain (${regimeVelocity.sampleSize} sample${regimeVelocity.sampleSize === 1 ? "" : "s"})`;

  return [distanceBullet, velocityBullet].slice(0, 5);
};


type LiveBandChip = {
  id: string;
  label: string;
  tone: "neutral" | "positive" | "warning";
};

const resolveLiveBandChips = ({
  confidenceLabel,
  confidencePercent,
  trendLabel,
  transitionWatch,
  regimeDistance,
}: {
  confidenceLabel: WeeklyDecisionCardProps["confidenceLabel"];
  confidencePercent: number;
  trendLabel: string;
  transitionWatch: WeeklyDecisionCardProps["transitionWatch"];
  regimeDistance: WeeklyDecisionCardProps["regimeDistance"];
}): LiveBandChip[] => {
  const trendLower = trendLabel.toLowerCase();
  const confidenceTone = confidenceLabel === "HIGH" ? "positive" : confidenceLabel === "MED" ? "neutral" : "warning";
  const trendTone = trendLower.includes("improv") ? "positive" : trendLower.includes("deterior") ? "warning" : "neutral";
  const watchTone = transitionWatch === "ON" ? "warning" : "neutral";
  const flipTone = regimeDistance.pointsToFlip <= 3 ? "warning" : "neutral";

  return [
    {
      id: "confidence",
      label: `Confidence ${confidenceLabel} ${Math.round(confidencePercent)}%`,
      tone: confidenceTone,
    },
    {
      id: "trend",
      label: `Trend ${trendLabel}`,
      tone: trendTone,
    },
    {
      id: "watch",
      label: transitionWatch === "ON" ? "Transition watch active" : "Transition watch stable",
      tone: watchTone,
    },
    {
      id: "flip",
      label: `Flip risk in ${Math.max(1, Math.round(regimeDistance.pointsToFlip))} pts`,
      tone: flipTone,
    },
  ];
};

const resolveHeroUrgency = ({
  confidenceLabel,
  transitionWatch,
  pointsToFlip,
}: {
  confidenceLabel: WeeklyDecisionCardProps["confidenceLabel"];
  transitionWatch: WeeklyDecisionCardProps["transitionWatch"];
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


const ActionStrip = ({ items }: { items: ActionStripItem[] }) => (
  <section className={`${tierTwoPanel} ${sectionSpacing}`} aria-label="Action strip">
    <div className="flex flex-wrap items-end justify-between gap-2">
      <h3 className={tierTwoHeading}>Operating levers this week</h3>
      <p className="text-[11px] text-slate-400">Action now · Trigger/threshold to tighten or loosen · Reversal condition</p>
    </div>
    <ul className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <li key={item.lever} className={`${tierThreeInset} flex h-full flex-col gap-2`}>
          <p className="text-[11px] font-semibold text-slate-300">{item.label}</p>
          <p className="text-sm leading-6 font-semibold text-slate-100"><span className="font-semibold text-emerald-200">Action now:</span> {item.actionNow}</p>
          <div className="mt-auto space-y-1.5 text-[11px]">
            <p className="rounded-full border border-amber-500/45 bg-amber-500/10 px-2.5 py-1 text-amber-100">
              <span className="font-semibold">Trigger/threshold to tighten or loosen:</span> {compactActionCue(item.triggerThreshold)}
            </p>
            <p className="rounded-full border border-sky-500/45 bg-sky-500/10 px-2.5 py-1 text-sky-100">
              <span className="font-semibold">Reversal condition:</span> {compactActionCue(item.reversalCondition)}
            </p>
          </div>
        </li>
      ))}
    </ul>
  </section>
);

const PostureHistoryTimeline = ({ historicalTimeline }: { historicalTimeline: WeeklyDecisionCardProps["historicalTimeline"] }) => (
  <ol className="mt-2 space-y-2" aria-label="Posture change timeline">
    {historicalTimeline.map((item, index) => {
      const isCurrent = item.isCurrent ?? index === historicalTimeline.length - 1;
      const href = item.month && item.year ? `/?month=${item.month}&year=${item.year}` : null;
      const previous = historicalTimeline[index - 1];
      const hasPostureShift = previous ? previous.posture !== item.posture : false;
      const shiftLabel = previous ? (hasPostureShift ? "Changed" : "Held") : "Start";
      const node = (
        <>
          <div className="absolute top-0 bottom-0 left-2.5 w-px bg-slate-700/70" aria-hidden="true" />
          <div className={`relative mt-1 h-3 w-3 rounded-full border ${isCurrent ? "border-sky-200 bg-sky-300" : "border-slate-500 bg-slate-700"}`} aria-hidden="true" />
          <div className="min-w-0 flex-1 rounded-lg border border-slate-700/60 bg-slate-950/65 px-2.5 py-2">
            <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-300">
              <span>{item.label}</span>
              <span className={`rounded-full border px-1.5 py-0.5 ${shiftLabel === "Changed" ? "border-amber-300/60 bg-amber-500/15 text-amber-100" : "border-slate-500/70 bg-slate-800/85 text-slate-300"}`}>{shiftLabel}</span>
              {isCurrent ? <span className="rounded-full border border-sky-300/50 bg-sky-500/20 px-1.5 py-0.5 text-sky-100">Current</span> : null}
            </div>
            <p className="mt-1 text-xs font-semibold text-slate-100">{item.posture}</p>
            {item.summary ? <p className="mt-1 text-[11px] leading-4 text-slate-300">{item.summary}</p> : null}
            {item.recordDate ? <p className="mt-1 text-[10px] text-slate-400">{item.recordDate}</p> : null}
          </div>
        </>
      );

      return (
        <li key={`${item.label}-${item.posture}-${index}`} className="relative">
          {href ? (
            <Link
              href={href}
              className="group relative flex min-h-[44px] items-start gap-2.5 rounded-lg pr-1 text-xs transition hover:bg-slate-900/35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
              aria-label={`Load weekly call for ${item.label}`}
              prefetch={false}
            >
              {node}
            </Link>
          ) : (
            <div className="relative flex min-h-[44px] items-start gap-2.5 pr-1 text-xs">{node}</div>
          )}
        </li>
      );
    })}
  </ol>
);


const MicroSignalIndicators = ({
  indicators,
}: {
  indicators: WeeklyDecisionCardProps["regimeSignalIndicators"];
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
  indicators: WeeklyDecisionCardProps["regimeSignalIndicators"];
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

type DecisionCallHeaderProps = {
  statusLabel: string;
  postureLabel?: string;
  stageLabel?: string;
  postureWithStageLabel?: string;
  netConstraintSummary: string;
  immediateDecision: string;
  meetingShorthand?: string;
  guardrail: string;
  confidencePercent: number;
  confidenceLabel: WeeklyDecisionCardProps["confidenceLabel"];
  regimeHeader: WeeklyDecisionCardProps["regimeHeader"];
  trendLabel: WeeklyDecisionCardProps["trendLabel"];
  regimeSignalIndicators: WeeklyDecisionCardProps["regimeSignalIndicators"];
  transitionWatch: WeeklyDecisionCardProps["transitionWatch"];
  operatingStanceLine: string;
  weeklyMemoLines?: string[];
  freshnessLabel: string;
  trustCueLine: string;
  needsTrustWarning: boolean;
  trustWarningCopy: string;
  regimeDistance: WeeklyDecisionCardProps["regimeDistance"];
  failureModes?: FailureModeWarningItem[];
  topContributorInline?: string;
  startupClimateIndex?: Pick<WeeklyDecisionCardProps["startupClimateIndex"], "score" | "status">;
  executiveOperationalStance?: WeeklyDecisionCardProps["executiveOperationalStance"];
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

export function DecisionCallHeader({
  statusLabel,
  postureLabel,
  stageLabel,
  postureWithStageLabel,
  netConstraintSummary,
  immediateDecision,
  meetingShorthand,
  guardrail,
  confidencePercent,
  confidenceLabel,
  regimeHeader,
  trendLabel,
  regimeSignalIndicators = [],
  transitionWatch,
  operatingStanceLine,
  weeklyMemoLines,
  freshnessLabel,
  trustCueLine,
  needsTrustWarning,
  trustWarningCopy,
  regimeDistance,
}: DecisionCallHeaderProps) {
  const { resolvedPostureLabel, resolvedStageLabel } = resolvePostureAndStage({
    statusLabel,
    postureLabel,
    stageLabel,
    postureWithStageLabel,
  });
  const liveBandChips = resolveLiveBandChips({
    confidenceLabel,
    confidencePercent,
    trendLabel,
    transitionWatch,
    regimeDistance,
  });
  const heroUrgency = resolveHeroUrgency({
    confidenceLabel,
    transitionWatch,
    pointsToFlip: regimeDistance.pointsToFlip,
  });

  return (
    <header className="space-y-4 border-b border-slate-700/80 pb-6" data-testid="weekly-top-fold">
      <article className={`${tierOnePanel} weather-live-hero weather-live-hero--${heroUrgency} space-y-4 border-sky-400/50 bg-gradient-to-br from-slate-950 via-slate-900/95 to-slate-950`} data-testid="weekly-viral-hero" aria-label="Canonical weekly decision card">
        <div id="weekly-posture-brief-title" className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-200">Weekly operating call</p>
          <p className="text-base text-slate-300">Scan this card to align this week&apos;s operating posture.</p>
        </div>

        <ol className="grid gap-2" aria-label="Weekly decision card sequence">
          <li className="rounded-md border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-xs text-slate-200">
            <SummaryLabel label="Regime" icon={<CircleTargetIcon className="h-3.5 w-3.5" aria-hidden="true" />} />
            <p className="mt-1 text-sm font-semibold text-slate-100">{resolvedPostureLabel} — {resolvedStageLabel}</p>
          </li>
          <li className="rounded-md border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-xs text-slate-200">
            <SummaryLabel label="Call" icon={<ShieldIcon className="h-3.5 w-3.5" aria-hidden="true" />} />
            <p className="mt-1 text-sm font-semibold text-slate-100">{operatingStanceLine}</p>
          </li>
          <li className="rounded-md border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-xs text-slate-200">
            <p className="text-xs font-semibold text-slate-300">Do now</p>
            <p className="mt-1 text-sm leading-6 font-semibold text-slate-100">{immediateDecision}</p>
          </li>
          <li className="rounded-md border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-xs text-slate-200">
            <p className="text-xs font-semibold text-slate-300">Flip conditions</p>
            <p className="mt-1 text-sm font-semibold text-slate-100">{regimeDistance.dimensionLabel} {regimeDistance.thresholdDirection === "riseAbove" ? "rises above" : "falls to or below"} {regimeDistance.thresholdValue.toFixed(1)} ({Math.max(0, Math.round(regimeDistance.pointsToFlip))} pts away).</p>
          </li>
        </ol>

        <div className="flex flex-wrap gap-2" aria-label="Compact trust and fallback cues">
          <p className="weather-live-chip rounded-full border border-emerald-400/45 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-emerald-100">Confidence {confidenceLabel} ({Math.round(confidencePercent)}%)</p>
          <p className="weather-live-chip rounded-full border border-slate-600/70 bg-slate-900/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-200">Trend {trendLabel} · Watch {transitionWatch}</p>
          <p className="weather-live-chip rounded-full border border-slate-600/70 bg-slate-900/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-200">Freshness {freshnessLabel}</p>
          <p className="weather-live-chip rounded-full border border-slate-600/70 bg-slate-900/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-200">Trust {trustCueLine}</p>
        </div>

        {needsTrustWarning ? (
          <p className="rounded-md border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">{trustWarningCopy}</p>
        ) : null}
      </article>
    </header>
  );
}

type RegimeBannerProps = {
  statusLabel: string;
  regimeKey: RegimeKey;
  postureLabel?: string;
  stageLabel?: string;
  postureWithStageLabel?: string;
  recordDateLabel: string;
  confidencePercent: number;
  confidenceLabel: WeeklyDecisionCardProps["confidenceLabel"];
  trendLabel?: string;
  operatingStanceLine: string;
  actionNowShort?: string;
  regimeDistance?: WeeklyDecisionCardProps["regimeDistance"];
};

function RegimeLegend({ activeRegime, tone }: { activeRegime: RegimeKey; tone: RegimeBannerTone }) {
  const legendItems = getOrderedRegimeLegend();
  const activeDescriptor = REGIME_LEGEND_DESCRIPTORS[activeRegime];

  return (
    <div className={`mt-3 rounded-lg border px-3 py-2.5 ${tone.legendPanel}`} aria-label="Regime legend">
      <div className="flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-300">
        <p>Capital tighter</p>
        <p aria-hidden="true">→</p>
        <p>Capital looser</p>
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
                {item.label}
                <span className="sr-only">{active ? " (current regime)" : ""}</span>
              </span>
              {index < legendItems.length - 1 ? <span className="text-slate-500" aria-hidden="true">→</span> : null}
            </li>
          );
        })}
      </ol>
      <p className="mt-2 text-xs text-slate-200"><span className="font-semibold text-slate-100">Current implication:</span> {activeDescriptor}</p>
    </div>
  );
}

const formatFlipTriggerLine = (regimeDistance?: WeeklyDecisionCardProps["regimeDistance"]) => {
  if (!regimeDistance) {
    return "Next flip trigger: watch weekly threshold movement updates.";
  }
  const safePoints = Number.isFinite(regimeDistance.pointsToFlip)
    ? Math.max(0, Math.round(regimeDistance.pointsToFlip))
    : null;
  return `Next flip trigger: ${regimeDistance.dimensionLabel} ${regimeDistance.thresholdDirection === "riseAbove" ? "rises above" : "falls to or below"} ${regimeDistance.thresholdValue.toFixed(1)}${safePoints !== null ? ` (${safePoints} pts away)` : ""}.`;
};

function RegimeBanner({
  statusLabel,
  regimeKey,
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

  return (
    <header className={`z-10 rounded-2xl border px-5 py-5 shadow-[0_24px_54px_rgba(2,6,23,0.5)] backdrop-blur md:sticky md:top-2 sm:px-6 sm:py-6 ${bannerTone.shell}`} data-testid="weekly-regime-banner" aria-label="Weekly regime banner">
      <p className="text-[11px] font-semibold uppercase tracking-[0.13em]">REGIME — WEEK OF {recordDateLabel}</p>
      <div id="weekly-posture-brief-title" className="mt-1 space-y-0.5">
        <p className="text-2xl font-semibold sm:text-3xl">Regime: {resolvedPostureLabel}</p>
        <p className="text-sm font-semibold sm:text-base">Cycle phase: {resolvedStageLabel}</p>
      </div>
      <p className={`mt-2 overflow-x-auto text-xs font-semibold whitespace-nowrap ${bannerTone.metrics}`} aria-label="Regime metrics line">
        <span>Confidence {confidenceLabel} {Math.round(confidencePercent)}%</span>
        <span className="px-1.5" aria-hidden="true">·</span>
        <span>Trend {trendValue}</span>
        <span className="px-1.5" aria-hidden="true">·</span>
        <span>Flip Risk {flipRiskValue}</span>
      </p>
      <RegimeLegend activeRegime={regimeKey} tone={bannerTone} />
      <p className="mt-2 text-sm leading-tight font-semibold sm:text-base sm:leading-5">{operatingLine}</p>
      <p className="mt-1 text-xs leading-6 text-slate-100">{formatFlipTriggerLine(regimeDistance)}</p>
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
          const height = missing ? 14 : Math.max(14, Math.round(((point.confidencePercent - min) / range) * 44) + 14);
          return (
            <div key={point.recordDate} className="group relative flex-1">
              <span
                className={missing ? "block rounded-sm border border-amber-400/80 border-dashed bg-amber-500/5" : "block rounded-sm bg-sky-300/80"}
                style={{ height }}
                aria-label={missing ? `${point.recordDate} missing confidence data` : `${point.recordDate} confidence ${Math.round(point.confidencePercent)}%`}
              />
              <span className="pointer-events-none absolute -top-7 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-1.5 py-0.5 text-[10px] text-slate-100 group-hover:block">
                {missing ? `${point.recordDate}: missing` : `${point.recordDate}: ${Math.round(point.confidencePercent)}%`}
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
  startupClimateIndex: WeeklyDecisionCardProps["startupClimateIndex"];
  evidenceItems: WeeklyDecisionCardProps["evidenceItems"];
  whyThisCall: WeeklyDecisionCardProps["whyThisCall"];
  memoryRail: WeeklyDecisionCardProps["memoryRail"];
  historicalTimeline: WeeklyDecisionCardProps["historicalTimeline"];
  historicalAnalogs: WeeklyDecisionCardProps["historicalAnalogs"];
  macroOverlay: WeeklyDecisionCardProps["macroOverlay"];
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
          <span aria-hidden="true" className="text-sm transition group-open:rotate-180">▾</span>
        </summary>
        <div className="mt-2 space-y-2">
          <p className="text-xs text-slate-300">Context metric for continuity: {startupClimateIndex.score} / 100 · {startupClimateIndex.status}</p>
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {startupClimateIndex.breakdown.map((item) => (
              <li key={item.label} className="space-y-1 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span>{item.label}</span>
                  <span className="font-semibold text-slate-100">{item.score}</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-800">
                  <div className="h-1.5 rounded-full bg-sky-300/70" style={{ width: `${Math.max(5, Math.min(100, item.score))}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </details>

      <details className="group rounded-lg border border-slate-800/45 bg-slate-950/38 px-2.5 py-2">
        <summary className={`${disclosureSummaryClass} cursor-pointer list-none`}>
          <span>Evidence snapshot</span>
          <span aria-hidden="true" className="text-sm transition group-open:rotate-180">▾</span>
        </summary>
        <ul className="mt-2 grid gap-2 lg:grid-cols-3">
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
          <span aria-hidden="true" className="text-sm transition group-open:rotate-180">▾</span>
        </summary>
        <ul className="mt-2 grid gap-1.5 sm:grid-cols-3">
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
          <span aria-hidden="true" className="text-sm transition group-open:rotate-180">▾</span>
        </summary>
        <div className="mt-2 space-y-2">
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

export function WeeklyDecisionCard({
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
  regimeSignalIndicators = [],
  transitionWatch,
  operatingStanceLine,
  weeklyMemoLines,
  netConstraintSummary,
  guardrail,
  reversalTrigger,
  actionNowShort,
  guardrailThreshold,
  flipThreshold,
  compactFlipConditionLabels = [],
  canonicalDecisionCopy,
  canonicalFlipConditions = [],
  recordDateLabel,
  fetchedAtLabel,
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
  memoryRail,
  historicalTimeline,
  historicalAnalogs,
  macroOverlay,
  whyThisCall,
  evidenceItems,
  regimeDistance,
  regimeVelocity,
  citation,
  isFallbackSnapshot = false,
  failureModes = [],
  actions,
}: WeeklyDecisionCardProps) {
  const freshnessLabel = fetchedAtLabel.trim().length > 0 ? fetchedAtLabel : "Unavailable";
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
  const immediateDecision = canonicalDecisionCopy?.doNowLines[0]
    ?? actionNowShort?.trim()
    ?? (revisitDecisions
      ? "Revise hiring and roadmap calls now."
      : "Hold last week's operating rules.");

  const topContributors = (reportDynamics.signalContributions ?? []).slice(0, 3);
  const topContributorInline =
    topContributors.length > 0
      ? topContributors
          .slice(0, 2)
          .map((item) => `${item.label} (${item.normalizedPercentLabel})`)
          .join(" · ")
      : "No active contributors this week.";
  const conciseWeeklyMovement = weeklyMovement.summary.replace(/\.$/, "");
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
  const decisionDeltaStripItems = buildDecisionDeltaStripItems({
    weeklyMemoLines,
    immediateDecision,
    revisitDecisions,
    guardrail,
    regimeDistance,
  });
  const recentTimeline = historicalTimeline.slice(-2);
  const resolvedRegimeKey = regimeKey ?? "DEFENSIVE";

  return (
    <section className="weather-panel space-y-3 px-4 py-5 sm:space-y-4 sm:px-6 sm:py-6" aria-labelledby="weekly-posture-brief-title">
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

      <div className="grid gap-3 xl:grid-cols-12">
        <main className="space-y-3 xl:col-span-8">
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
            actions={actions}
          />

          <article className={`${tierTwoPanel} ${sectionSpacing}`} aria-label="Need deeper analysis">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className={tierTwoHeading}>Need deeper analysis?</h2>
              <p className="text-[11px] uppercase tracking-[0.1em] text-slate-400">Optional depth</p>
            </div>
            <p className="text-xs text-slate-300">Open diagnostics only when you need proof detail, role-level execution plans, or model input context.</p>

            <Accordion.Root defaultValue={["since-last-review"]} className="space-y-2">
              <Accordion.Item value="since-last-review" className="group">
                <DiagnosticsAccordionTrigger label="Since last review" />
                <Accordion.Panel>
                  <ul className="mt-3 grid gap-2 sm:grid-cols-3">
                    {decisionDeltaStripItems.map((item) => (
                      <li key={item.id}>
                        <Link href={item.href} className={`block min-h-[44px] rounded-lg border px-3 py-2 text-xs transition hover:border-slate-300/45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 ${impactToneClass[item.impact]}`}>
                          <p className="font-semibold uppercase tracking-[0.1em]">{item.label}</p>
                          <p className="mt-1 leading-5 text-slate-100">{item.detail}</p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </Accordion.Panel>
              </Accordion.Item>

              <Accordion.Item value="weekly-decision-brief" className="group">
                <DiagnosticsAccordionTrigger label="Weekly decision brief" />
                <Accordion.Panel>
                  <ul className="mt-3 grid gap-2 text-xs text-slate-200 sm:grid-cols-2">
                    <li className={tierOneInset}><span className="font-semibold text-slate-100">Regime:</span> {postureWithStageLabel ?? statusLabel}</li>
                    <li className={tierOneInset}><span className="font-semibold text-slate-100">Trend:</span> {trendLabel}</li>
                    <li className={tierOneInset}><span className="font-semibold text-slate-100">Confidence:</span> {Math.round(confidencePercent)}%</li>
                    <li className={tierOneInset}><span className="font-semibold text-slate-100">Next flip:</span> {regimeDistance.dimensionLabel} {regimeDistance.thresholdDirection === "riseAbove" ? "rises above" : "falls to or below"} {regimeDistance.thresholdValue.toFixed(1)}</li>
                  </ul>
                </Accordion.Panel>
              </Accordion.Item>

              <Accordion.Item id="decision-snapshot-for-leadership-this-week" value="decision-snapshot" className="group">
                <DiagnosticsAccordionTrigger label="Open diagnostics: decision snapshot matrix" />
                <Accordion.Panel className={disclosurePanelClass}>
                  <BoundedRulesMatrix decisionMatrix={decisionMatrix} decisionRules={decisionRules} />
                </Accordion.Panel>
              </Accordion.Item>

              <Accordion.Item id="execution-guidance" value="role-plan" className="group">
                <DiagnosticsAccordionTrigger label="Open diagnostics: role plan" />
                <Accordion.Panel className={`${disclosurePanelClass} grid gap-3 sm:grid-cols-2`}>
                  {roleAwareTemplates.map((template) => (
                    <article key={template.role} className={`${tierOneInset} space-y-2`}>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-200">{template.roleLabel}</p>
                      <p className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-2 text-xs text-emerald-100"><span className="font-semibold uppercase tracking-[0.1em]">Approve now</span> {compactRoleCue(template.doNow)}</p>
                      <p className="rounded-md border border-rose-500/40 bg-rose-500/10 px-2.5 py-2 text-xs text-rose-100"><span className="font-semibold uppercase tracking-[0.1em]">Delay now</span> {compactRoleCue(template.avoidNow)}</p>
                      <p className="rounded-md border border-sky-500/40 bg-sky-500/10 px-2.5 py-2 text-xs text-sky-100"><span className="font-semibold uppercase tracking-[0.1em]">Flip when</span> {compactActionCue(template.flipTrigger)}</p>
                    </article>
                  ))}
                </Accordion.Panel>
              </Accordion.Item>

              <Accordion.Item id="evidence-diagnostics" value="evidence-drivers-model-inputs" className={`${tierThreePanel} ${compactSectionSpacing} group`}>
                <DiagnosticsAccordionTrigger label="Open diagnostics: evidence, drivers, and model inputs" />
                <Accordion.Panel className={disclosurePanelClass}>
                  <article className={compactInset}>
                <p className={`text-xs ${neutralLabel}`}>Evidence</p>
                <ul className="mt-1 space-y-1 text-xs text-slate-200">
                  {evidenceItems.map((item) => (
                    <li key={`evidence-${item.key}`}>• {item.title} (Updated {item.lastUpdated ? formatDateUTC(item.lastUpdated) : "—"}): {item.immediateImplication}</li>
                  ))}
                </ul>
              </article>

              <article className={`${compactInset} mt-2`}>
                <p className={`text-xs ${neutralLabel}`}>Drivers</p>
                <p className="mt-1 text-xs text-slate-300">Top contributors: {topContributorInline}</p>
                <p className="mt-1 text-xs text-slate-300">Weekly movement: {conciseWeeklyMovement}</p>
              </article>

              <article className={`${compactInset} mt-2`}>
                <p className={`text-xs ${neutralLabel}`}>Model inputs</p>
                <p className="mt-1 text-xs text-slate-300">Decision thresholds are in the matrix above.</p>
                <p className="mt-1 text-xs text-slate-300">Defensive probability: {formatProbabilityPercent(transitionProbabilities.Defensive)}</p>
              </article>
              {failureModes.length > 0 ? (
                <article className={`${compactInset} mt-2`}>
                  <p className={`text-xs ${neutralLabel}`}>False-signal warnings</p>
                  <ul className="mt-1 space-y-1 text-xs text-slate-300">
                    {failureModes.slice(0, 2).map((mode) => (
                      <li key={mode.id}>• {mode.warning}</li>
                    ))}
                  </ul>
                </article>
              ) : null}
                </Accordion.Panel>
              </Accordion.Item>
            </Accordion.Root>
          </article>

          <article className={`${tierOnePanel} ${sectionSpacing}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className={tierOneHeading}>Regime history (recent)</h2>
              <p className="text-[11px] uppercase tracking-[0.1em] text-slate-400">Last 2 checkpoints</p>
            </div>
            <PostureHistoryTimeline historicalTimeline={recentTimeline} />
          </article>

        </main>

        <aside className="space-y-3 xl:col-span-4">
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
