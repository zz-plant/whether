import type { ReactNode } from "react";
import { CircleTargetIcon, ShieldIcon } from "./uiIcons";
import type { ReportDynamics } from "../../lib/report/reportData";
import type { BoundedDecisionRule } from "../../lib/report/boundedDecisionRules";
import type { ActionStripItem, RoleAwareOperatingTemplate } from "../../lib/report/operatingCalls";
import { decisionAreaLabel } from "../../lib/report/boundedDecisionRules";
import type { ForecastRegimeLabel, TransitionVelocityEstimate } from "../../lib/report/forecastModel";
import { formatProbabilityPercent } from "../../lib/report/reportFormatting";
import {
  buildWeeklyCitationMetaLine,
  buildCompactTrustSummary,
} from "../../lib/report/trustStatus";
import {
  deltaLabelBySignal,
  movementMeterToneByDirection,
  resolveSignalDirection,
  signalOrder,
  STARTUP_INDEX_CONTEXT_LABEL,
} from "../../lib/report/briefFormatting";

type WhyThisCallItem = { label: string; detail: string };
type MemoryRailItem = { label: string; posture: string };
type PrimaryDriverItem = { label: string; detail: string };
type MacroOverlayItem = { label: string; detail: string };
type HistoricalAnalogItem = { date: string; similarityScore: number; implication: string };
type FailureModeWarningItem = { id: string; warning: string; mitigationCheck: string };

export type WeeklyDecisionCardProps = {
  statusLabel: string;
  postureLabel: string;
  stageLabel: string;
  postureWithStageLabel?: string;
  postureDelta: string;
  confidenceLabel: "HIGH" | "MED" | "LOW";
  confidencePercent: number;
  signalConfidenceReason: string;
  trendLabel: string;
  transitionWatch: "ON" | "OFF";
  operatingStanceLine: string;
  weeklyMemoLines: string[];
  netConstraintSummary: string;
  guardrail: string;
  reversalTrigger: string;
  actionNowShort?: string;
  guardrailThreshold?: string;
  flipThreshold?: string;
  recordDateLabel: string;
  fetchedAtLabel: string;
  reportDynamics: ReportDynamics;
  decisionShiftSummary: string;
  transitionProbabilities: Record<ForecastRegimeLabel, number>;
  decisionRules: BoundedDecisionRule[];
  actionStripItems?: ActionStripItem[];
  roleAwareTemplates: RoleAwareOperatingTemplate[];
  executiveOperationalStance: { expand: string[]; avoid: string[] };
  revisitDecisions: boolean;
  memoryRail: MemoryRailItem[];
  historicalTimeline: Array<{ label: string; posture: string }>;
  historicalAnalogs: HistoricalAnalogItem[];
  macroOverlay: MacroOverlayItem[];
  whyThisCall: WhyThisCallItem[];
  primaryDrivers: PrimaryDriverItem[];
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

const sectionSpacing = "space-y-4";
const tierOneHeading = "text-sm font-bold uppercase tracking-[0.14em] text-slate-50";
const tierTwoHeading = "text-xs font-semibold uppercase tracking-[0.12em] text-slate-300";
const tierThreeHeading = "text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400";
const tierOnePanel = "rounded-xl border border-slate-600/85 bg-slate-950/82 p-5";
const tierTwoPanel = "rounded-xl border border-slate-700/55 bg-slate-950/62 p-4";
const tierThreePanel = "rounded-xl border border-slate-800/55 bg-slate-950/50 p-4";
const tierOneInset = "rounded-lg border border-slate-700/75 bg-slate-950/72 px-3 py-3";
const tierTwoInset = "rounded-md border border-slate-700/55 bg-slate-950/58 px-3 py-3";
const tierThreeInset = "rounded-md border border-slate-800/50 bg-slate-950/48 px-3 py-3";
const neutralLabel = "font-semibold uppercase tracking-[0.12em] text-slate-300";
const disclosureSummaryClass =
  "flex min-h-[44px] w-full items-center justify-between gap-3 rounded-md border border-slate-700/70 bg-slate-950/65 px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-100 transition hover:border-slate-500/70 hover:bg-slate-900/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300";

const meterTrackBase = "relative h-2 rounded-full";
const meterFillBase = "h-2 rounded-full";

const resolveVelocityLabel = (rows: Array<{ delta: number }>): "Low" | "Medium" | "High" => {
  const totalMagnitude = rows.reduce((sum, row) => sum + Math.abs(row.delta), 0);
  if (totalMagnitude >= 6) {
    return "High";
  }
  if (totalMagnitude >= 2.5) {
    return "Medium";
  }
  return "Low";
};

const movementDomainBySignal: Record<(typeof signalOrder)[number], number> = {
  tightness: 6,
  riskAppetite: 6,
  baseRate: 1.5,
  curveSlope: 1.5,
};

const toMovementPercent = (signalKey: (typeof signalOrder)[number], delta: number) => {
  if (delta === 0) {
    return 0;
  }
  const domain = movementDomainBySignal[signalKey] ?? 1.5;
  return Math.max(6, Math.min(100, Math.round((Math.abs(delta) / domain) * 100)));
};

const movementSignificance = (signalKey: (typeof signalOrder)[number], delta: number) => {
  const ratio = Math.abs(delta) / (movementDomainBySignal[signalKey] ?? 1.5);
  if (ratio >= 1) return "Extreme";
  if (ratio >= 0.66) return "Material";
  if (ratio >= 0.33) return "Mild";
  return "Low";
};

const signalActionRuleText: Record<(typeof signalOrder)[number], string> = {
  tightness: "If tightness rises another 4+ points, hold net-new fixed-cost approvals.",
  riskAppetite: "If risk appetite falls to 50 or below, freeze discretionary expansion approvals.",
  baseRate: "If base rate rises >0.5 this week, tighten payback windows before approving new spend.",
  curveSlope: "If curve slope turns negative by 0.25 or more, bias toward reversible roadmap bets.",
};


const termTooltipBySignal: Partial<Record<(typeof signalOrder)[number], string>> = {
  riskAppetite: "Risk appetite: how willing markets are to fund risk. Lower values usually tighten growth financing.",
  curveSlope: "Curve slope: 10Y minus 2Y Treasury yields. Negative readings can indicate recession risk.",
};

const renderSignalLabel = (signalKey: (typeof signalOrder)[number], label: string) => {
  const tooltip = termTooltipBySignal[signalKey];
  if (!tooltip) return <span>{label}</span>;
  return <abbr title={tooltip} className="cursor-help no-underline border-b border-dotted border-slate-400/80">{label}</abbr>;
};

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

const resolveDecisionShift = (label: "unchanged" | "higher" | "lower") => {
  if (label === "higher") return "higher";
  if (label === "lower") return "lower";
  return "unchanged";
};

const directionToken = (delta: number) => {
  if (delta > 0) return `+${delta.toFixed(1)}`;
  if (delta < 0) return delta.toFixed(1);
  return "unchanged";
};

const signalOperationalMeaning = (key: (typeof signalOrder)[number], delta: number) => {
  if (delta === 0) {
    return "No material operating change.";
  }

  if (key === "tightness") {
    return delta > 0
      ? "Financing and hiring get tighter; preserve approval discipline."
      : "Financing pressure eased; selective approvals become safer.";
  }

  if (key === "riskAppetite") {
    return delta > 0
      ? "Reversible experiments get safer this week."
      : "Shift to proof-first launches and smaller bet sizes.";
  }

  if (key === "curveSlope") {
    return delta > 0
      ? "Long-payback bets are marginally safer."
      : "Bias toward faster-payback execution.";
  }

  return delta > 0
    ? "Cost of capital pressure rose; gate commitments tightly."
    : "Rate pressure cooled; maintain discipline while testing upside.";
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
      <h3 className={tierTwoHeading}>Prioritize decisions by function</h3>
      <p className="text-[11px] uppercase tracking-[0.12em] text-slate-400">Action · guardrail · flip</p>
    </div>
    <ul className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <li key={item.area} className={`${tierThreeInset} flex h-full flex-col gap-2`}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">{decisionAreaLabel(item.area)}</p>
          <p className="text-sm font-semibold text-slate-100">{item.action}</p>
          <div className="mt-auto space-y-1.5 text-[11px]">
            <p className="rounded-full border border-amber-500/45 bg-amber-500/10 px-2.5 py-1 text-amber-100">
              <span className="font-semibold uppercase tracking-[0.1em]">Guardrail</span> {compactActionCue(item.threshold)}
            </p>
            <p className="rounded-full border border-sky-500/45 bg-sky-500/10 px-2.5 py-1 text-sky-100">
              <span className="font-semibold uppercase tracking-[0.1em]">Flip</span> {compactActionCue(item.reversalCondition)}
            </p>
          </div>
        </li>
      ))}
    </ul>
  </section>
);

const PostureHistoryTimeline = ({ historicalTimeline }: { historicalTimeline: WeeklyDecisionCardProps["historicalTimeline"] }) => (
  <ol className="mt-2 grid gap-2 lg:grid-cols-4" aria-label="Posture change timeline">
    {historicalTimeline.map((item, index) => {
      const isCurrent = index === historicalTimeline.length - 1;
      return (
        <li key={`${item.label}-${item.posture}`} className={`${tierThreeInset} text-xs ${isCurrent ? "border-sky-400/70 bg-sky-500/10" : ""}`}>
          <p className="text-slate-400">{item.label}</p>
          <p className="mt-1 font-semibold text-slate-100">{item.posture}</p>
          {isCurrent ? <p className="mt-1 text-[10px] uppercase tracking-[0.1em] text-sky-200">Current week</p> : null}
        </li>
      );
    })}
  </ol>
);

type DecisionCallHeaderProps = {
  statusLabel: string;
  postureLabel?: string;
  stageLabel?: string;
  postureWithStageLabel?: string;
  netConstraintSummary: string;
  meetingShorthand: string;
  immediateDecision: string;
  guardrail: string;
  confidencePercent: number;
  confidenceLabel: WeeklyDecisionCardProps["confidenceLabel"];
  trendLabel: WeeklyDecisionCardProps["trendLabel"];
  transitionWatch: WeeklyDecisionCardProps["transitionWatch"];
  operatingStanceLine: string;
  freshnessLabel: string;
  trustCueLine: string;
  needsTrustWarning: boolean;
  trustWarningCopy: string;
  regimeDistance: WeeklyDecisionCardProps["regimeDistance"];
  weeklyMemoLines?: string[];
  failureModes?: FailureModeWarningItem[];
  topContributorInline?: string;
  startupClimateIndex?: Pick<WeeklyDecisionCardProps["startupClimateIndex"], "score" | "status">;
  executiveOperationalStance?: WeeklyDecisionCardProps["executiveOperationalStance"];
};

export function DecisionCallHeader({
  statusLabel,
  postureLabel,
  stageLabel,
  postureWithStageLabel,
  netConstraintSummary,
  meetingShorthand,
  immediateDecision,
  guardrail,
  confidencePercent,
  confidenceLabel,
  trendLabel,
  transitionWatch,
  operatingStanceLine,
  freshnessLabel,
  trustCueLine,
  needsTrustWarning,
  trustWarningCopy,
  regimeDistance,
}: DecisionCallHeaderProps) {
  const [derivedPostureLabel, derivedStageLabel] = (postureWithStageLabel ?? "").split(" — ");
  const resolvedPostureLabel = postureLabel ?? derivedPostureLabel ?? statusLabel;
  const resolvedStageLabel = stageLabel ?? derivedStageLabel ?? "Unspecified";

  return (
    <header className="space-y-4 border-b border-slate-700/80 pb-6" data-testid="weekly-top-fold">
      <article className={`${tierOnePanel} space-y-4`} data-testid="weekly-viral-hero" aria-label="Weekly posture strip">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Macro operating console</p>
        <h1 id="weekly-posture-brief-title" className="text-2xl font-semibold text-slate-50 sm:text-3xl">
          {resolvedPostureLabel.toUpperCase()} — {resolvedStageLabel.toUpperCase()}
        </h1>
        <p className="text-base font-semibold text-sky-100">{operatingStanceLine}</p>
        <p className="text-sm text-slate-200">{immediateDecision}</p>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4" aria-label="Quick weekly scan">
          <div className="rounded-md border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-xs text-slate-200">
            <SummaryLabel label="Current stance" icon={<CircleTargetIcon className="h-3.5 w-3.5" aria-hidden="true" />} />
            <p className="mt-1 text-sm font-semibold text-slate-100">{resolvedPostureLabel} — {resolvedStageLabel}</p>
          </div>
          <div className="rounded-md border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-xs text-slate-200">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">What changed this week</p>
            <p className="mt-1 text-sm font-semibold text-slate-100">{meetingShorthand}</p>
          </div>
          <div className="rounded-md border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-xs text-slate-200">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">Net effect on decisions</p>
            <p className="mt-1 text-sm font-semibold text-slate-100">{immediateDecision}</p>
          </div>
          <div className="rounded-md border border-violet-500/40 bg-violet-500/10 px-3 py-2 text-xs text-violet-100">
            <SummaryLabel label="Leadership call" icon={<ShieldIcon className="h-3.5 w-3.5" aria-hidden="true" />} />
            <p className="mt-1 text-sm font-semibold">{guardrail}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2" aria-label="Trust and momentum">
          <p className="rounded-full border border-slate-600/70 bg-slate-900/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-200">
            Confidence: {confidenceLabel} ({Math.round(confidencePercent)}%)
          </p>
          <p className="rounded-full border border-slate-600/70 bg-slate-900/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-200">
            Trend: {trendLabel.toUpperCase()} · Watch {transitionWatch}
          </p>
          <p className="rounded-full border border-slate-600/70 bg-slate-900/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-200">
            Freshness: {freshnessLabel}
          </p>
          <p className="rounded-full border border-slate-600/70 bg-slate-900/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-200">
            Trust cue: {trustCueLine}
          </p>
        </div>

        <p className="text-xs text-slate-300">{netConstraintSummary}</p>
        <p className="text-xs text-slate-300">Flip watch: {regimeDistance.dimensionLabel} {regimeDistance.thresholdDirection === "riseAbove" ? "rises above" : "falls to or below"} {regimeDistance.thresholdValue.toFixed(1)}.</p>
        {needsTrustWarning ? (
          <p className="rounded-md border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">{trustWarningCopy}</p>
        ) : null}
      </article>
    </header>
  );
}

type BoundedRulesMatrixProps = {
  decisionRules: BoundedDecisionRule[];
};

export function BoundedRulesMatrix({ decisionRules }: BoundedRulesMatrixProps) {
  const topDecisionRules = decisionRules.slice(0, 4);

  const compactRuleList = (items: string[]) => {
    if (items.length === 0) {
      return [];
    }

    return items.slice(0, 2).map((item) => compactActionCue(item));
  };

  return (
    <article className={`${tierOnePanel} ${sectionSpacing}`}>
      <h2 className={tierOneHeading}>Decision snapshot for leadership this week</h2>
      <p className="text-xs text-slate-300">Current posture, action, rationale, and flip trigger by operating area.</p>
      <ul className="mt-2 grid gap-3 sm:grid-cols-2 sm:auto-rows-fr">
        {topDecisionRules.map((rule) => {
          const doCues = compactRuleList(rule.doNow);
          const avoidCue = compactRuleList(rule.avoidNow)[0] ?? "No avoid-now constraint";

          return (
            <li key={rule.area} className={`${tierOneInset} flex h-full flex-col gap-2 text-xs text-slate-200`}>
              <p className="font-semibold uppercase tracking-[0.12em] text-slate-200">{decisionAreaLabel(rule.area)}</p>
              <div className="rounded-md border border-slate-700/70 bg-slate-950/70 px-2.5 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-300">Current posture</p>
                <p className="mt-1 text-[11px] text-slate-100">{compactActionCue(rule.recommendation)}</p>
              </div>
              <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-emerald-100">What to do</p>
                <p className="mt-1 text-[11px] text-emerald-50">{doCues[0] ?? "No immediate action"}</p>
                <p className="mt-1 text-[11px] text-rose-100">Delay: {avoidCue}</p>
              </div>
              <p className="rounded-md border border-violet-500/45 bg-violet-500/10 px-2.5 py-2 text-[11px] text-violet-100">
                <span className="font-semibold uppercase tracking-[0.1em]">Why</span> {compactActionCue(rule.rationale)}
              </p>
              <p className="rounded-full border border-amber-500/45 bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-100">
                <span className="font-semibold uppercase tracking-[0.1em]">Guardrail</span> {compactActionCue(rule.pauseTrigger)}
              </p>
              <p className="rounded-full border border-sky-500/45 bg-sky-500/10 px-2.5 py-1 text-[11px] text-sky-100">
                <span className="font-semibold uppercase tracking-[0.1em]">What would change it</span> {compactActionCue(rule.resumeTrigger)}
              </p>
            </li>
          );
        })}
      </ul>
    </article>
  );
}

type MoreContextDisclosureProps = {
  startupClimateIndex: WeeklyDecisionCardProps["startupClimateIndex"];
  primaryDrivers: WeeklyDecisionCardProps["primaryDrivers"];
  whyThisCall: WeeklyDecisionCardProps["whyThisCall"];
  memoryRail: WeeklyDecisionCardProps["memoryRail"];
  historicalTimeline: WeeklyDecisionCardProps["historicalTimeline"];
  historicalAnalogs: WeeklyDecisionCardProps["historicalAnalogs"];
  macroOverlay: WeeklyDecisionCardProps["macroOverlay"];
};

export function MoreContextDisclosureBody({
  startupClimateIndex,
  primaryDrivers,
  whyThisCall,
  memoryRail,
  historicalTimeline,
  historicalAnalogs,
  macroOverlay,
}: MoreContextDisclosureProps) {
  return (
    <div className="space-y-4">
      <article className="space-y-2">
        <h2 className={tierTwoHeading}>Startup Climate Index (context)</h2>
        <p className="text-xs text-slate-300">Context metric for continuity: {startupClimateIndex.score} / 100 · {startupClimateIndex.status}</p>
        <ul className="mt-2 grid gap-2 sm:grid-cols-2">
          {startupClimateIndex.breakdown.map((item) => (
            <li key={item.label} className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span>{item.label}</span>
                <span className="font-semibold text-slate-100">{item.score}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-800">
                <div className="h-2 rounded-full bg-sky-300/70" style={{ width: `${Math.max(5, Math.min(100, item.score))}%` }} />
              </div>
            </li>
          ))}
        </ul>
      </article>

      <article className="space-y-2">
        <h2 className={tierTwoHeading}>Supporting evidence</h2>
        <ul className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {primaryDrivers.map((driver) => (
            <li key={driver.label} className={`${tierTwoInset} text-xs text-slate-200`}>
              <p className="font-semibold uppercase tracking-[0.12em] text-slate-300">{driver.label}</p>
              <p className="mt-1 text-slate-300">{driver.detail}</p>
            </li>
          ))}
        </ul>
      </article>

      <article className="space-y-2">
        <h2 className={tierTwoHeading}>Why this posture call</h2>
        <ul className="mt-2 grid gap-2 sm:grid-cols-3">
          {whyThisCall.map((reason) => (
            <li key={reason.label} className={`${tierTwoInset} text-xs text-slate-200`}>
              <p className="font-semibold uppercase tracking-[0.12em] text-slate-300">{reason.label}</p>
              <p className="mt-1 text-slate-300">{reason.detail}</p>
            </li>
          ))}
        </ul>
      </article>

      <article className="space-y-3">
        <h2 className={tierThreeHeading}>Posture history</h2>
        <PostureHistoryTimeline historicalTimeline={historicalTimeline} />
        <div>
          <p className={tierThreeHeading}>Historical memory rail</p>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {memoryRail.map((item) => (
              <li key={`${item.label}-${item.posture}`} className={`${tierThreeInset} text-xs text-slate-200`}>
                <p className="text-slate-400">{item.label}</p>
                <p className="mt-1 font-semibold text-slate-100">{item.posture}</p>
              </li>
            ))}
          </ul>
        </div>
        <ul className="grid gap-2 text-xs text-slate-300 sm:grid-cols-2 lg:grid-cols-4">
          {macroOverlay.map((item) => (
            <li key={item.label} className={tierThreeInset}>
              <p className="font-semibold uppercase tracking-[0.12em] text-slate-200">{item.label}</p>
              <p className="mt-1 text-slate-300">{item.detail}</p>
            </li>
          ))}
        </ul>
      </article>
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
  postureLabel,
  stageLabel,
  postureWithStageLabel,
  confidenceLabel,
  confidencePercent,
  trendLabel,
  transitionWatch,
  operatingStanceLine,
  weeklyMemoLines,
  netConstraintSummary,
  guardrail,
  reversalTrigger,
  actionNowShort,
  guardrailThreshold,
  flipThreshold,
  recordDateLabel,
  fetchedAtLabel,
  reportDynamics,
  decisionShiftSummary,
  transitionProbabilities,
  decisionRules,
  actionStripItems = [],
  roleAwareTemplates,
  revisitDecisions,
  memoryRail,
  historicalTimeline,
  historicalAnalogs,
  macroOverlay,
  whyThisCall,
  primaryDrivers,
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
  const effectiveGuardrail = guardrailThreshold?.trim() || guardrail;
  const effectiveFlipThreshold = flipThreshold?.trim() || reversalTrigger;
  const meetingShorthand = revisitDecisions
    ? "Posture updated. Tighten decisions this week and avoid irreversible commitments."
    : "Posture held. Keep last week's operating rules and avoid irreversible commitments.";
  const immediateDecision = actionNowShort?.trim()
    || (revisitDecisions
      ? "Revise hiring and roadmap calls now."
      : "Hold last week's operating rules.");

  const macroMovementRows = signalOrder.map((key) => {
    const signal = reportDynamics.changedSignals.find((item) => item.key === key);
    const delta = signal?.delta ?? 0;
    const direction = resolveSignalDirection(delta);
    const arrow = delta > 0 ? "↑" : delta < 0 ? "↓" : "→";
    return {
      key,
      label: deltaLabelBySignal[key],
      direction,
      delta,
      arrow,
      meter: toMovementPercent(key, delta),
      significance: movementSignificance(key, delta),
    };
  });

  const topContributors = (reportDynamics.signalContributions ?? []).slice(0, 3);
  const topContributorInline =
    topContributors.length > 0
      ? topContributors
          .map((item) => `${item.label} (${item.normalizedPercentLabel})`)
          .join(" · ")
      : "No active contributors this week.";

  const movementVelocity = resolveVelocityLabel(macroMovementRows);
  const needsTrustWarning = isFallbackSnapshot || confidenceLabel !== "HIGH" || freshnessLabel === "Unavailable";
  const trustWarningCopy = isFallbackSnapshot
    ? "Using a cached snapshot. Use this call for near-term pacing only and pause irreversible decisions until live refresh returns."
    : "Use this call for near-term pacing only until confidence returns to HIGH with fresh data.";

  const hiringShift = resolveDecisionShift(revisitDecisions ? "higher" : "unchanged");
  const experimentShift = resolveDecisionShift(revisitDecisions ? "lower" : "unchanged");
  const longPaybackShift = resolveDecisionShift(revisitDecisions ? "higher" : "unchanged");

  return (
    <section className="weather-panel space-y-5 px-5 py-6 sm:space-y-6 sm:px-7 sm:py-8" aria-labelledby="weekly-posture-brief-title">
      <DecisionCallHeader
        statusLabel={statusLabel}
        postureLabel={postureLabel}
        stageLabel={stageLabel}
        postureWithStageLabel={postureWithStageLabel}
        netConstraintSummary={netConstraintSummary}
        meetingShorthand={meetingShorthand}
        immediateDecision={immediateDecision}
        guardrail={effectiveGuardrail}
        confidencePercent={confidencePercent}
        confidenceLabel={confidenceLabel}
        trendLabel={trendLabel}
        transitionWatch={transitionWatch}
        operatingStanceLine={operatingStanceLine}
        freshnessLabel={freshnessLabel}
        trustCueLine={trustCueLine}
        needsTrustWarning={needsTrustWarning}
        trustWarningCopy={trustWarningCopy}
        regimeDistance={regimeDistance}
      />

      <div className="grid gap-4 lg:grid-cols-5">
        <article id="what-changed-this-week" className={`${tierOnePanel} ${sectionSpacing} lg:col-span-3 bg-gradient-to-b from-slate-950/95 to-slate-950/75`}>
          <div className="flex items-center justify-between gap-3">
            <h2 className={tierOneHeading}>Decision delta</h2>
            <span className="rounded-full border border-sky-400/40 bg-sky-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-100">Live weekly move</span>
          </div>
          <p className="text-xs text-slate-300">What changed, what it means, and what to do now.</p>
          <div className="overflow-x-auto rounded-lg border border-slate-700/70 bg-slate-950/60">
            <table className="min-w-full text-left text-xs text-slate-200">
              <thead>
                <tr className="border-b border-slate-700/70 text-[10px] uppercase tracking-[0.1em] text-slate-300">
                  <th className="px-3 py-2">Signal</th>
                  <th className="px-3 py-2">Change</th>
                  <th className="px-3 py-2">Operational meaning</th>
                </tr>
              </thead>
              <tbody>
                {macroMovementRows.map((signal) => (
                  <tr key={signal.key} className="border-b border-slate-800/60 last:border-b-0">
                    <td className="px-3 py-2 font-semibold text-slate-100">{renderSignalLabel(signal.key, signal.label)}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded-full px-2 py-0.5 font-semibold ${signal.delta > 0 ? "bg-amber-500/15 text-amber-100" : signal.delta < 0 ? "bg-emerald-500/15 text-emerald-100" : "bg-slate-700/60 text-slate-100"}`}>
                        {directionToken(signal.delta)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-300">{signalOperationalMeaning(signal.key, signal.delta)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="rounded-md border border-sky-500/40 bg-sky-500/10 px-3 py-2 text-xs font-semibold text-sky-100">
            Net effect: {immediateDecision}
          </p>
        </article>

        <article className={`${tierOnePanel} ${sectionSpacing} lg:col-span-2 bg-gradient-to-b from-slate-950/95 to-slate-950/75`}>
          <h2 className={tierOneHeading}>Operator posture</h2>
          <p className="text-sm font-semibold text-slate-100">{postureWithStageLabel ?? statusLabel}</p>
          <div className="rounded-lg border border-slate-700/70 bg-slate-950/65 p-3 space-y-2">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.1em] text-slate-400">
              <span>Conservation</span>
              <span>Expansion</span>
            </div>
            <div className="relative h-2 rounded-full bg-slate-800">
              <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-violet-500/40 via-sky-500/40 to-emerald-500/40" />
              <div className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border border-sky-200 bg-sky-400 shadow-[0_0_0_4px_rgba(14,165,233,0.2)]" style={{ left: `calc(${resolvePosturePosition(postureWithStageLabel ?? statusLabel)}% - 0.5rem)` }} />
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <p className="rounded-md border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-xs text-slate-200">Hiring pace: <span className="font-semibold uppercase">{hiringShift}</span></p>
            <p className="rounded-md border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-xs text-slate-200">Experiment tolerance: <span className="font-semibold uppercase">{experimentShift === "higher" ? "up" : experimentShift === "lower" ? "down" : "flat"}</span></p>
            <p className="rounded-md border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-xs text-slate-200">Commitment threshold: <span className="font-semibold uppercase">{longPaybackShift === "higher" ? "elevated" : "normal"}</span></p>
            <p className="rounded-md border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-xs text-slate-200">Payback tolerance: <span className="font-semibold uppercase">{longPaybackShift === "higher" ? "shorter" : "medium"}</span></p>
          </div>
        </article>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <article className={`${tierOnePanel} ${sectionSpacing} lg:col-span-2`}>
          <h2 className={tierOneHeading}>Decision guidance</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className={`${tierOneInset} space-y-1.5 border-emerald-500/35 bg-emerald-500/5`}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-emerald-200">Decisions favored</p>
              <ul className="space-y-1 text-xs text-emerald-100">
                {roleAwareTemplates.slice(0, 3).map((template) => <li key={`favor-${template.role}`}>• {compactRoleCue(template.doNow)}</li>)}
              </ul>
            </div>
            <div className={`${tierOneInset} space-y-1.5 border-rose-500/35 bg-rose-500/5`}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-rose-200">Decisions discouraged</p>
              <ul className="space-y-1 text-xs text-rose-100">
                {roleAwareTemplates.slice(0, 3).map((template) => <li key={`avoid-${template.role}`}>• {compactRoleCue(template.avoidNow)}</li>)}
              </ul>
            </div>
          </div>
        </article>

        <article className={`${tierOnePanel} ${sectionSpacing}`}>
          <h2 className={tierOneHeading}>Monitoring panel</h2>
          <ul className="space-y-1.5 text-xs text-slate-200">
            {macroMovementRows.filter((signal) => signal.delta !== 0).slice(0, 3).map((signal) => (
              <li key={`watch-${signal.key}`}>• {signalActionRuleText[signal.key]}</li>
            ))}
            <li>• Flip watch: {regimeDistance.dimensionLabel} {regimeDistance.thresholdDirection === "riseAbove" ? "rises above" : "falls to or below"} {regimeDistance.thresholdValue.toFixed(1)}.</li>
          </ul>
        </article>
      </div>

      <article className={`${tierOnePanel} ${sectionSpacing} bg-gradient-to-r from-slate-950/92 via-slate-900/85 to-slate-950/92`}>
        <h2 className={tierOneHeading}>Weekly change indicator</h2>
        <p className="text-sm font-semibold text-slate-100">Posture movement this week: {revisitDecisions ? "+1 (slightly more defensive)" : "0 (maintain posture)"}</p>
        <p className="text-xs text-slate-300">{revisitDecisions ? decisionShiftSummary : "No macro change this week. Maintain posture."}</p>
      </article>

      <div id="decision-snapshot-for-leadership-this-week"><BoundedRulesMatrix decisionRules={decisionRules} /></div>

      <article id="execution-guidance" className={`${tierOnePanel} ${sectionSpacing}`}>
        <h2 className={tierOneHeading}>Approve, hold, or escalate by role</h2>
        <p className="text-xs text-slate-300">Because the stance is {postureWithStageLabel ?? statusLabel}, execute in a gated, reversible way this week.</p>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          {roleAwareTemplates.map((template) => (
            <article key={template.role} className={`${tierOneInset} space-y-2`}>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-200">{template.roleLabel}</p>
              <p className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-2 text-xs text-emerald-100"><span className="font-semibold uppercase tracking-[0.1em]">Approve now</span> {compactRoleCue(template.doNow)}</p>
              <p className="rounded-md border border-rose-500/40 bg-rose-500/10 px-2.5 py-2 text-xs text-rose-100"><span className="font-semibold uppercase tracking-[0.1em]">Delay now</span> {compactRoleCue(template.avoidNow)}</p>
              <p className="rounded-md border border-sky-500/40 bg-sky-500/10 px-2.5 py-2 text-xs text-sky-100"><span className="font-semibold uppercase tracking-[0.1em]">Flip when</span> {compactActionCue(template.flipTrigger)}</p>
            </article>
          ))}
        </div>
      </article>

      <article className={`${tierOnePanel} ${sectionSpacing}`}>
        <h2 className={tierOneHeading}>Share the leadership brief</h2>
        <div className={`${tierOneInset} space-y-2 text-xs text-slate-200`}>
          <p><span className="font-semibold uppercase tracking-[0.1em] text-slate-300">Stance:</span> {postureWithStageLabel ?? statusLabel}</p>
          <p><span className="font-semibold uppercase tracking-[0.1em] text-slate-300">What changed:</span> {decisionShiftSummary}</p>
          <p><span className="font-semibold uppercase tracking-[0.1em] text-slate-300">Risk of defensive flip:</span> {formatProbabilityPercent(transitionProbabilities.Defensive)}</p>
          <ul className="space-y-1">
            {weeklyMemoLines.slice(0, 2).map((line) => (
              <li key={line}>• {line}</li>
            ))}
            {actionStripItems.slice(0, 5).map((item) => (
              <li key={item.area}>• {decisionAreaLabel(item.area)}: {compactActionCue(item.action)}</li>
            ))}
          </ul>
          <p className="font-semibold uppercase tracking-[0.1em] text-slate-300">Flip conditions</p>
          <ul className="space-y-1 text-slate-300">
            <li>• More expansionary if {compactActionCue(effectiveFlipThreshold)}.</li>
            <li>• More defensive if {compactActionCue(effectiveGuardrail)}.</li>
            <li>• Watch {regimeDistance.dimensionLabel} crossing {regimeDistance.thresholdValue.toFixed(1)}.</li>
          </ul>
        </div>
      </article>

      <details id="evidence-diagnostics" className={`${tierTwoPanel} ${sectionSpacing} group`}>
        <summary className={`${disclosureSummaryClass} cursor-pointer list-none`}>
          <span>Inspect call evidence and failure risks (secondary)</span>
          <span aria-hidden="true" className="text-sm transition group-open:rotate-180">▾</span>
        </summary>
        <div className="mt-3 space-y-4">
          <article className={tierOneInset}>
            <p className={`text-xs ${neutralLabel}`}>See the deltas that moved this call</p>
            <p className="mt-2 text-xs text-slate-200">Top contributors: {topContributorInline}</p>
            <p className="mt-2 text-xs text-slate-300">Transition pace: {regimeVelocity.displayLabel} · Velocity: {movementVelocity}</p>
          </article>
          <article className={tierOneInset}>
            <p className={`text-xs ${neutralLabel}`}>See where pressure rose vs cooled</p>
            <ul className="mt-2 space-y-1.5 text-xs text-slate-200">
              {macroMovementRows.map((signal) => (
                <li key={`evidence-${signal.key}`}>{renderSignalLabel(signal.key, signal.label)}: {signal.delta > 0 ? `+${signal.delta.toFixed(1)}` : signal.delta.toFixed(1)} ({signal.significance})</li>
              ))}
            </ul>
          </article>
          <article className={tierOneInset}>
            <p className={`text-xs ${neutralLabel}`}>Flip when</p>
            <p className="text-xs text-slate-300">More expansionary: {compactActionCue(effectiveFlipThreshold)}</p>
            <p className="mt-1 text-xs text-slate-300">More defensive: {compactActionCue(effectiveGuardrail)}</p>
          </article>
          {failureModes.length > 0 ? (
            <article className={tierOneInset}>
              <p className={`text-xs ${neutralLabel}`}>False-signal warnings</p>
              <ul className="mt-2 space-y-1 text-xs text-slate-300">
                {failureModes.slice(0, 2).map((mode) => (
                  <li key={mode.id}>• {mode.warning}</li>
                ))}
              </ul>
            </article>
          ) : null}
        </div>
      </details>

      {actions ? (
        <div id="primary-artifact-actions" className="rounded-xl border border-sky-500/40 bg-slate-950/92 p-3 sm:hidden" aria-label="Primary artifact actions">
          {actions}
        </div>
      ) : null}

      <CitationActionFooter citationMetaLine={citationMetaLine} citation={citation} actions={actions} />
    </section>
  );
}
