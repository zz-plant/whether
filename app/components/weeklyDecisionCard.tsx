import type { ReactNode } from "react";
import { HapticAnchor } from "./hapticAnchor";
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
  actionStripItems: ActionStripItem[];
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


const ActionStrip = ({ items }: { items: ActionStripItem[] }) => (
  <section className={`${tierTwoPanel} ${sectionSpacing}`} aria-label="Action strip">
    <div className="flex flex-wrap items-end justify-between gap-2">
      <h3 className={tierTwoHeading}>This week&apos;s action strip</h3>
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
  weeklyMemoLines: string[];
  freshnessLabel: string;
  trustCueLine: string;
  needsTrustWarning: boolean;
  trustWarningCopy: string;
  failureModes: FailureModeWarningItem[];
  regimeDistance: WeeklyDecisionCardProps["regimeDistance"];
  topContributorInline: string;
  startupClimateIndex: Pick<WeeklyDecisionCardProps["startupClimateIndex"], "score" | "status">;
  executiveOperationalStance: WeeklyDecisionCardProps["executiveOperationalStance"];
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
  weeklyMemoLines,
  freshnessLabel,
  trustCueLine,
  needsTrustWarning,
  trustWarningCopy,
  failureModes,
  regimeDistance,
  topContributorInline,
  startupClimateIndex,
  executiveOperationalStance,
}: DecisionCallHeaderProps) {
  const [derivedPostureLabel, derivedStageLabel] = (postureWithStageLabel ?? "").split(" — ");
  const resolvedPostureLabel = postureLabel ?? derivedPostureLabel ?? statusLabel;
  const resolvedStageLabel = stageLabel ?? derivedStageLabel ?? "Unspecified";
  const founderDecisionRows = buildFounderDecisionRows({
    postureLabel: resolvedPostureLabel,
    guardrail,
    reversalTrigger: `Flip: ${regimeDistance.dimensionLabel} ${regimeDistance.thresholdDirection === "riseAbove" ? "rises above" : "falls to or below"} ${regimeDistance.thresholdValue.toFixed(1)}`,
  });
  const flipDistancePoints = Math.abs(regimeDistance.pointsToFlip);
  const flipDistanceGaugePercent = Math.max(
    8,
    Math.min(100, Math.round((flipDistancePoints / Math.max(Math.abs(regimeDistance.thresholdValue), 1)) * 100)),
  );

  return (
    <header className="space-y-4 border-b border-slate-700/80 pb-6" data-testid="weekly-top-fold">
      <article className={`${tierOnePanel} space-y-4`} data-testid="weekly-viral-hero" aria-label="Weekly posture strip">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">This week&apos;s operating call</p>
        <h1 id="weekly-posture-brief-title" className="text-2xl font-semibold text-slate-50 sm:text-3xl">
          {resolvedPostureLabel.toUpperCase()} — {resolvedStageLabel.toUpperCase()}
        </h1>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-md border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-xs text-slate-200">
            <SummaryLabel label="Posture + stage" icon={<CircleTargetIcon className="h-3.5 w-3.5" aria-hidden="true" />} />
            <p className="mt-1 text-sm font-semibold text-slate-100">{resolvedPostureLabel} — {resolvedStageLabel}</p>
          </div>
          <div className="rounded-md border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-xs text-slate-200">
            <SummaryLabel label="Signal confidence" icon={<ShieldIcon className="h-3.5 w-3.5" aria-hidden="true" />} />
            <p className="mt-1 text-sm font-semibold text-slate-100">{confidenceLabel} ({Math.round(confidencePercent)}%)</p>
          </div>
          <div className="rounded-md border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-xs text-slate-200">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">Trend</p>
            <p className="mt-1 text-sm font-semibold text-slate-100">{trendLabel.toUpperCase()} · Watch {transitionWatch}</p>
          </div>
          <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
            <p className="text-xs font-semibold uppercase tracking-[0.12em]">Flip distance</p>
            <p className="mt-1 text-sm font-semibold">{flipDistancePoints.toFixed(1)} pts to trigger</p>
            <div className="mt-2 h-1.5 rounded-full bg-amber-200/20">
              <div className="h-1.5 rounded-full bg-amber-300/90" style={{ width: `${flipDistanceGaugePercent}%` }} />
            </div>
          </div>
        </div>

        <div className="grid gap-2 lg:grid-cols-3" aria-label="This week's operating call">
          <article className="rounded-lg border border-violet-500/45 bg-violet-500/10 px-3 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-violet-100">Decision now</p>
            <p className="mt-1 text-sm font-semibold text-slate-100">{immediateDecision}</p>
            <p className="mt-1 text-xs text-slate-200">{operatingStanceLine}</p>
          </article>
          <article className="rounded-lg border border-amber-500/45 bg-amber-500/10 px-3 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-amber-100">Guardrail</p>
            <p className="mt-1 text-sm text-slate-100">{guardrail}</p>
          </article>
          <article className="rounded-lg border border-sky-500/45 bg-sky-500/10 px-3 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-sky-100">Flip condition</p>
            <p className="mt-1 text-sm text-slate-100">{regimeDistance.dimensionLabel} {regimeDistance.thresholdDirection === "riseAbove" ? "rises above" : "falls to or below"} {regimeDistance.thresholdValue.toFixed(1)}</p>
          </article>
        </div>
      </article>

      <details className={`${tierTwoPanel} ${sectionSpacing}`}>
        <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.14em] text-slate-200">
          Why this call and what to share ▼
        </summary>

        <article className="mt-3 space-y-4" aria-label="Operating call rationale">
        <h2 className={tierOneHeading}>Where we are in the capital cycle</h2>
        <p className="text-xs text-slate-300">Scarcity → Mixed → Guarded Expansion → Aggressive Expansion</p>
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-sky-200">↑ You are here: {resolvedPostureLabel}</p>
        <p className="text-sm leading-relaxed text-slate-200">{meetingShorthand}</p>
        <p className="text-xs text-slate-300">Distance to regime change: {flipDistancePoints.toFixed(1)} points · Regime shift watch: {transitionWatch}</p>

        <article className={tierOneInset} aria-label="Founders decision triad this week">
          <h3 className={tierTwoHeading}>Founder decisions this week</h3>
          <ul className="mt-2 grid gap-2 text-xs text-slate-200 sm:grid-cols-3">
            {founderDecisionRows.map((row) => (
              <li key={row.area} className="rounded-md border border-slate-700/70 bg-slate-950/70 px-2 py-2">
                <p className="font-semibold uppercase tracking-[0.1em] text-slate-100">{row.area}</p>
                <p className="mt-1 text-slate-200">{row.action}</p>
                <p className="mt-1 text-slate-400">{row.cue}</p>
              </li>
            ))}
          </ul>
        </article>

        <article className={tierOneInset} aria-label="Why this call">
          <h3 className={tierTwoHeading}>Why this call</h3>
          <p className="text-xs text-slate-300">Top contributors: {topContributorInline}</p>
          <p className="mt-1 text-xs text-slate-300">{STARTUP_INDEX_CONTEXT_LABEL} {startupClimateIndex.score} / 100 ({startupClimateIndex.status})</p>
        </article>

        <article className={tierOneInset} aria-label="Weekly memo shareable">
          <h3 className={tierTwoHeading}>Share-ready weekly memo</h3>
          <ul className="space-y-1 text-xs text-slate-200">
            {weeklyMemoLines.map((line) => (
              <li key={line}>• {line}</li>
            ))}
          </ul>
        </article>

        <article className={tierOneInset} aria-label="Key operating posture this week">
          <h3 className={tierTwoHeading}>Where to lean in vs hold back</h3>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-emerald-200">Expand:</p>
              <ul className="mt-1 space-y-1 text-xs text-slate-200">
                {executiveOperationalStance.expand.slice(0, 4).map((item) => (
                  <li key={`expand-${item}`} className="leading-relaxed">• {item}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-rose-200">Avoid:</p>
              <ul className="mt-1 space-y-1 text-xs text-slate-200">
                {executiveOperationalStance.avoid.slice(0, 4).map((item) => (
                  <li key={`avoid-${item}`} className="leading-relaxed">• {item}</li>
                ))}
              </ul>
            </div>
          </div>
        </article>

        <article className={tierOneInset} aria-label="Token notes">
          <p className={`text-xs ${neutralLabel}`}>Token notes</p>
          <p className="mt-1 text-xs text-slate-300">Freshness: {freshnessLabel}</p>
          <p className="mt-1 text-xs text-slate-300">Current: {regimeDistance.currentValue.toFixed(1)} · Trigger: {regimeDistance.thresholdValue.toFixed(1)}</p>
        </article>

        <article className="rounded-lg border border-amber-500/45 bg-amber-500/10 px-3 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-100">Guardrail</p>
          <p className="mt-1 text-sm font-semibold text-amber-50">{guardrail}</p>
        </article>

        <article className={tierOneInset}>
          <p className={`text-xs ${neutralLabel}`}>Flip condition</p>
          <p className="mt-1 text-xs text-slate-300">Current: {regimeDistance.currentValue.toFixed(1)} · Trigger: {regimeDistance.thresholdValue.toFixed(1)}</p>
          <p className="mt-2 text-xs text-amber-100">{flipDistancePoints.toFixed(1)} points away from trigger.</p>
        </article>

        <p className="text-xs text-slate-300">{netConstraintSummary}</p>
        <p className="inline-flex items-center gap-1.5 text-xs text-slate-300"><span aria-hidden="true" className="text-slate-400"><ShieldIcon className="h-3 w-3" /></span>Trust status: {trustCueLine}</p>
        {needsTrustWarning ? (
          <p className="rounded-md border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">{trustWarningCopy}</p>
        ) : null}

        {failureModes.length > 0 ? (
          <article className="space-y-2 rounded-md border border-amber-500/45 bg-amber-500/10 px-3 py-3" aria-label="False-signal warnings">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-100">False-signal warnings</p>
            <ul className="space-y-1.5">
              {failureModes.map((mode) => (
                <li key={mode.id} className="text-xs text-amber-50">
                  <p>{mode.warning}</p>
                  <p className="text-amber-100/95">{mode.mitigationCheck}</p>
                </li>
              ))}
            </ul>
          </article>
        ) : null}
        </article>
      </details>
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
      <h2 className={tierOneHeading}>Decision matrix this week</h2>
      <p className="text-xs text-slate-300">Do, avoid, and trigger cues by operating area.</p>
      <ul className="mt-2 grid gap-3 sm:grid-cols-2 sm:auto-rows-fr">
        {topDecisionRules.map((rule) => {
          const doCues = compactRuleList(rule.doNow);
          const avoidCues = compactRuleList(rule.avoidNow);

          return (
            <li key={rule.area} className={`${tierOneInset} flex h-full flex-col gap-2 text-xs text-slate-200`}>
              <p className="font-semibold uppercase tracking-[0.12em] text-slate-200">{decisionAreaLabel(rule.area)}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-emerald-100">Do now</p>
                  <ul className="mt-1 space-y-1 text-[11px] text-emerald-50">
                    {doCues.length > 0 ? doCues.map((cue) => <li key={cue}>• {cue}</li>) : <li>• No immediate action</li>}
                  </ul>
                </div>
                <div className="rounded-md border border-rose-500/40 bg-rose-500/10 px-2.5 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-rose-100">Avoid now</p>
                  <ul className="mt-1 space-y-1 text-[11px] text-rose-50">
                    {avoidCues.length > 0 ? avoidCues.map((cue) => <li key={cue}>• {cue}</li>) : <li>• No avoid-now constraint</li>}
                  </ul>
                </div>
              </div>
              <p className="rounded-full border border-amber-500/45 bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-100">
                <span className="font-semibold uppercase tracking-[0.1em]">Guardrail</span> {compactActionCue(rule.pauseTrigger)}
              </p>
              <p className="rounded-full border border-sky-500/45 bg-sky-500/10 px-2.5 py-1 text-[11px] text-sky-100">
                <span className="font-semibold uppercase tracking-[0.1em]">Flip condition</span> {compactActionCue(rule.resumeTrigger)}
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
      <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs text-slate-300">{citation}</pre>
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
  executiveOperationalStance,
  revisitDecisions,
  memoryRail,
  historicalTimeline,
  historicalAnalogs,
  macroOverlay,
  whyThisCall,
  primaryDrivers,
  startupClimateIndex,
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

  const allSignalContributions = reportDynamics.signalContributions ?? [];
  const topContributors = allSignalContributions.slice(0, 3);
  const topContributorInline =
    topContributors.length > 0
      ? topContributors
          .map((item) => `${item.label} (${item.normalizedPercentLabel})`)
          .join(" · ")
      : "No active contributors this week.";

  const movementVelocity = resolveVelocityLabel(macroMovementRows);
  const decisionPressurePercent = Math.max(10, Math.min(95, reportDynamics.changedSignals.length * 22 + (revisitDecisions ? 25 : 8)));
  const decisionStabilityPercent = Math.max(8, Math.min(100, 100 - reportDynamics.changedSignals.length * 25 - (revisitDecisions ? 25 : 0)));
  const needsTrustWarning = isFallbackSnapshot || confidenceLabel !== "HIGH" || freshnessLabel === "Unavailable";
  const trustWarningCopy = isFallbackSnapshot
    ? "Using a cached snapshot. Use this call for near-term pacing only and pause irreversible decisions until live refresh returns."
    : "Use this call for near-term pacing only until confidence returns to HIGH with fresh data.";

  const transitionStrip = [
    { label: "Expansion", value: transitionProbabilities.Expansion, tone: "bg-emerald-300/70" },
    { label: "Mixed", value: transitionProbabilities.Mixed, tone: "bg-sky-300/75" },
    { label: "Scarcity", value: transitionProbabilities.Scarcity, tone: "bg-amber-300/80" },
    { label: "Defensive", value: transitionProbabilities.Defensive, tone: "bg-violet-300/80" },
  ] as const;

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
        weeklyMemoLines={weeklyMemoLines}
        freshnessLabel={freshnessLabel}
        trustCueLine={trustCueLine}
        needsTrustWarning={needsTrustWarning}
        trustWarningCopy={trustWarningCopy}
        failureModes={failureModes}
        regimeDistance={regimeDistance}
        topContributorInline={topContributorInline}
        startupClimateIndex={startupClimateIndex}
        executiveOperationalStance={executiveOperationalStance}
      />

      {actions ? (
        <div
          id="primary-artifact-actions"
          className="rounded-xl border border-sky-500/40 bg-slate-950/92 p-3 sm:hidden"
          aria-label="Primary artifact actions"
        >
          {actions}
        </div>
      ) : null}

      {actions ? (
        <HapticAnchor
          href="#primary-artifact-actions"
          className="weather-button-primary fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-20 inline-flex min-h-[44px] items-center justify-center rounded-full px-4 py-2 text-xs font-semibold tracking-[0.12em] text-slate-100 shadow-[0_10px_24px_rgba(2,6,23,0.65)] sm:hidden"
        >
          Jump to weekly actions
        </HapticAnchor>
      ) : null}

      <article className={`${tierOnePanel} ${sectionSpacing}`}>
        <h2 className={tierOneHeading}>What changed and trigger points</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className={tierOneInset}>
            <p className={`text-xs ${neutralLabel}`}>Change this week</p>
            <p className="mt-1 text-xs text-slate-200">{decisionShiftSummary}</p>
          </div>
          <div className={tierOneInset}>
            <p className={`text-xs ${neutralLabel}`}>Canonical decision</p>
            <p className="mt-1 text-xs text-slate-300">Use the top call above for action, guardrail, and flip condition.</p>
          </div>
          <div className={tierOneInset}>
            <p className={`text-xs ${neutralLabel}`}>4-week transition watch</p>
            <p className="mt-1 text-xs text-slate-200">P(flip to Scarcity): <span className="font-semibold text-amber-100">{formatProbabilityPercent(transitionProbabilities.Scarcity)}</span> · P(stabilize in Mixed): <span className="font-semibold text-sky-100">{formatProbabilityPercent(transitionProbabilities.Mixed)}</span></p>
            <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-slate-800">
              {transitionStrip.map((segment) => (
                <div key={segment.label} className={segment.tone} style={{ width: `${segment.value}%` }} aria-label={`${segment.label} ${formatProbabilityPercent(segment.value)}`} />
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] uppercase tracking-[0.08em] text-slate-300">
              {transitionStrip.map((segment) => (
                <span key={`${segment.label}-label`}>{segment.label} {formatProbabilityPercent(segment.value)}</span>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-amber-500/45 bg-slate-950/72 px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-100">Guardrail reference</p>
            <p className="mt-1 text-xs text-slate-200">{effectiveGuardrail}</p>
          </div>
          <div className="rounded-lg border border-sky-500/35 bg-slate-950/72 px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sky-200">Flip condition reference</p>
            <p className="mt-1 text-xs text-slate-200">{effectiveFlipThreshold}</p>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <article className={tierOneInset}>
            <p className={`text-xs ${neutralLabel}`}>Diagnostics at a glance</p>
            <p className="mt-2 text-xs text-slate-200">Top contributors: {topContributorInline}</p>
            <p className="mt-2 text-xs text-slate-300">Flip distance: {Math.abs(regimeDistance.pointsToFlip).toFixed(1)} points</p>
            <p className="mt-1 text-xs text-slate-300">Regime transition pace: {regimeVelocity.displayLabel}</p>
          </article>

          <article className={tierOneInset}>
            <p className={`text-xs ${neutralLabel}`}>Plan stability</p>
            <div className="mt-2 h-2 rounded-full bg-slate-800">
              <div className="h-2 rounded-full bg-sky-300/80" style={{ width: `${decisionStabilityPercent}%` }} />
            </div>
            <p className="mt-2 text-xs text-slate-200">
              {revisitDecisions ? "Material change versus last week." : "No material change versus last week."}
            </p>
            <p className="mt-2 text-xs text-slate-300">Decision pressure</p>
            <div className="mt-1 h-3 rounded-full bg-slate-800">
              <div className="h-3 rounded-full bg-violet-300/80" style={{ width: `${decisionPressurePercent}%` }} />
            </div>
          </article>
        </div>
      </article>


      <article className={`${tierOnePanel} ${sectionSpacing}`}>
        <h2 className={tierOneHeading}>Role-based calls this week</h2>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          {roleAwareTemplates.map((template, index) => (
            <article key={template.role} className={`${tierOneInset} space-y-2`}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-200">{template.roleLabel}</p>
                <span className="rounded-full border border-slate-600/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-300">{index + 1}</span>
              </div>
              <div className="grid gap-2">
                <p className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-2 text-xs text-emerald-100">
                  <span className="font-semibold uppercase tracking-[0.1em]">Do now</span> {compactRoleCue(template.doNow)}
                </p>
                <p className="rounded-md border border-rose-500/40 bg-rose-500/10 px-2.5 py-2 text-xs text-rose-100">
                  <span className="font-semibold uppercase tracking-[0.1em]">Avoid now</span> {compactRoleCue(template.avoidNow)}
                </p>
                <p className="rounded-md border border-sky-500/40 bg-sky-500/10 px-2.5 py-2 text-xs text-sky-100">
                  <span className="font-semibold uppercase tracking-[0.1em]">Flip trigger</span> {compactActionCue(template.flipTrigger)}
                </p>
              </div>
            </article>
          ))}
        </div>
      </article>

      <ActionStrip items={actionStripItems} />
      <BoundedRulesMatrix decisionRules={decisionRules} />
      <details className={`${tierTwoPanel} ${sectionSpacing}`}>
        <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.14em] text-slate-200">
          Evidence behind this call ▼
        </summary>
        <div className="mt-3 space-y-4">
          <article className={tierOneInset}>
            <p className={`text-xs ${neutralLabel}`}>Signal changes this week</p>
            <p className="mt-1 text-xs text-slate-300">Velocity: {movementVelocity}</p>
            <div className="mt-3 rounded-md border border-slate-700/70 bg-slate-950/60 px-2.5 py-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-300">Contribution weight</p>
                <HapticAnchor href="/methodology" className="text-[11px] text-sky-200 underline underline-offset-2">Methodology</HapticAnchor>
              </div>
              <ul className="mt-2 space-y-1.5 text-xs text-slate-200" aria-label="Top signal contributors">
                {topContributors.map((item) => (
                  <li key={`top-${item.key}`} className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span>{item.label}</span>
                      <span className="font-semibold text-slate-100">{item.unavailable ? "Unavailable" : item.normalizedPercentLabel}</span>
                    </div>
                    <div className={`${meterTrackBase} border border-slate-700/60 bg-slate-900/70`}>
                      <div className="h-2 rounded-full bg-sky-300/75" style={{ width: `${Math.round(item.normalized * 100)}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[11px] text-slate-300">Full contribution diagnostics</p>
              <ul className="mt-2 space-y-1.5">
                {allSignalContributions.map((item) => (
                  <li key={`full-${item.key}`} className="flex items-center justify-between gap-2 rounded border border-slate-700/50 px-2 py-1 text-xs text-slate-200">
                    <span>{item.label}</span>
                    <span className="font-semibold text-slate-100">{item.unavailable ? "Unavailable" : item.normalizedPercentLabel}</span>
                  </li>
                ))}
              </ul>
            </div>

            <ul className="mt-3 space-y-2 text-xs text-slate-200">
              {macroMovementRows.map((signal) => (
                <li key={signal.key} className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span>{renderSignalLabel(signal.key, signal.label)}</span>
                    <span className={`font-semibold ${signal.delta > 0 ? "text-amber-100" : signal.delta < 0 ? "text-emerald-100" : "text-slate-100"}`}>
                      {signal.arrow} {signal.delta > 0 ? `+${signal.delta.toFixed(1)}` : signal.delta.toFixed(1)}
                    </span>
                  </div>
                  <div className="text-[10px] uppercase tracking-[0.1em] text-slate-400">{signal.significance} move</div>
                  <div className={`${meterTrackBase} border border-slate-700/70 bg-slate-900/80`}>
                    <div className="pointer-events-none absolute inset-y-0 left-1/3 w-px bg-slate-600/70" aria-hidden="true" />
                    <div className="pointer-events-none absolute inset-y-0 left-2/3 w-px bg-slate-600/70" aria-hidden="true" />
                    <div
                      className={`${meterFillBase} ${movementMeterToneByDirection[resolveSignalDirection(signal.delta)]}`}
                      style={{ width: `${signal.meter}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-300">{signalActionRuleText[signal.key]}</p>
                </li>
              ))}
            </ul>
          </article>

          <MoreContextDisclosureBody
            startupClimateIndex={startupClimateIndex}
            primaryDrivers={primaryDrivers}
            whyThisCall={whyThisCall}
            memoryRail={memoryRail}
            historicalTimeline={historicalTimeline}
            historicalAnalogs={historicalAnalogs}
            macroOverlay={macroOverlay}
          />

          {historicalAnalogs.length > 0 ? (
            <article className={`${tierThreePanel} ${sectionSpacing}`} aria-label="Historical analogs">
              <h2 className={tierThreeHeading}>Historical analogs</h2>
              <ul className="mt-2 space-y-2 text-xs text-slate-200">
                {historicalAnalogs.map((analog) => (
                  <li key={`${analog.date}-${analog.similarityScore}`} className="rounded-md border border-slate-700/60 bg-slate-950/60 px-3 py-2">
                    <p className="font-semibold text-slate-100">{analog.date} · similarity {(analog.similarityScore * 100).toFixed(0)}%</p>
                    <p className="mt-1 text-slate-300">{analog.implication}</p>
                  </li>
                ))}
              </ul>
            </article>
          ) : null}
        </div>
      </details>
      <CitationActionFooter citationMetaLine={citationMetaLine} citation={citation} actions={actions} />
    </section>
  );
}
