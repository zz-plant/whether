import type { ReactNode } from "react";
import Link from "next/link";
import type { ReportDynamics } from "../../lib/report/reportData";
import type { BoundedDecisionRule } from "../../lib/report/boundedDecisionRules";
import { decisionAreaLabel } from "../../lib/report/boundedDecisionRules";
import {
  buildWeeklyCitationMetaLine,
  buildCompactTrustSummary,
} from "../../lib/report/trustStatus";
import {
  deltaLabelBySignal,
  movementMeterToneByDirection,
  postureDisplayLabel,
  resolveSignalDirection,
  signalOrder,
} from "../../lib/report/briefFormatting";

type WhyThisCallItem = { label: string; detail: string };
type MemoryRailItem = { label: string; posture: string };
type PrimaryDriverItem = { label: string; detail: string };
type MacroOverlayItem = { label: string; detail: string };

export type WeeklyDecisionCardProps = {
  statusLabel: string;
  postureDelta: string;
  confidenceLabel: "HIGH" | "MED" | "LOW";
  confidencePercent: number;
  trendLabel: string;
  transitionWatch: "ON" | "OFF";
  netConstraintSummary: string;
  guardrail: string;
  reversalTrigger: string;
  recordDateLabel: string;
  fetchedAtLabel: string;
  reportDynamics: ReportDynamics;
  decisionShiftSummary: string;
  decisionRules: BoundedDecisionRule[];
  revisitDecisions: boolean;
  memoryRail: MemoryRailItem[];
  historicalTimeline: Array<{ label: string; posture: string }>;
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
  citation: string;
  isFallbackSnapshot?: boolean;
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

const regimeSegments = [
  { key: "EXPANSION", label: "Expansion", shortLabel: "EX", classes: "bg-emerald-400/30 text-emerald-100" },
  { key: "VOLATILE", label: "Volatile", shortLabel: "VO", classes: "bg-amber-300/30 text-amber-100" },
  { key: "SCARCITY", label: "Scarcity", shortLabel: "SC", classes: "bg-rose-300/30 text-rose-100" },
  { key: "DEFENSIVE", label: "Defensive", shortLabel: "DE", classes: "bg-violet-300/30 text-violet-100" },
] as const;
const regimeGaugePercentByLabel: Record<string, number> = {
  EXPANSION: 12.5,
  BALANCED: 37.5,
  VOLATILE: 37.5,
  SCARCITY: 62.5,
  DEFENSIVE: 87.5,
};

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

const meterTrackBase = "relative h-2 rounded-full";
const meterFillBase = "h-2 rounded-full";

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
  netConstraintSummary: string;
  meetingShorthand: string;
  postureDelta: string;
  immediateDecision: string;
  guardrail: string;
  confidencePercent: number;
  confidenceLabel: WeeklyDecisionCardProps["confidenceLabel"];
  trendLabel: WeeklyDecisionCardProps["trendLabel"];
  transitionWatch: WeeklyDecisionCardProps["transitionWatch"];
  freshnessLabel: string;
  trustCueLine: string;
  needsTrustWarning: boolean;
  trustWarningCopy: string;
  regimeDistance: WeeklyDecisionCardProps["regimeDistance"];
  movementVelocity: "Low" | "Medium" | "High";
};

export function DecisionCallHeader({
  statusLabel,
  netConstraintSummary,
  meetingShorthand,
  postureDelta,
  immediateDecision,
  guardrail,
  confidencePercent,
  confidenceLabel,
  trendLabel,
  transitionWatch,
  freshnessLabel,
  trustCueLine,
  needsTrustWarning,
  trustWarningCopy,
  regimeDistance,
  movementVelocity,
}: DecisionCallHeaderProps) {
  const postureLabel = postureDisplayLabel(statusLabel);
  const gaugePercent = regimeGaugePercentByLabel[statusLabel] ?? 50;
  const thresholdBreached =
    regimeDistance.thresholdDirection === "riseAbove"
      ? regimeDistance.currentValue > regimeDistance.thresholdValue
      : regimeDistance.currentValue <= regimeDistance.thresholdValue;
  const thresholdDistance = Math.abs(regimeDistance.currentValue - regimeDistance.thresholdValue);
  const thresholdRatio = Math.max(8, Math.min(100, Math.round((thresholdDistance / 20) * 100)));
  const confidenceMeterPercent = Math.max(8, Math.min(100, confidencePercent));

  return (
    <header className="space-y-5 border-b border-slate-700/80 pb-6" data-testid="weekly-top-fold">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Weekly posture call</p>
      <h1 id="weekly-posture-brief-title" className="text-3xl font-semibold text-slate-50 sm:text-4xl">
        {statusLabel}
      </h1>

      <article className={`${tierOnePanel} ${sectionSpacing}`} aria-label="Operating call panel">
        <h2 className={tierOneHeading}>This week in 15 seconds</h2>
        <p className="text-sm leading-relaxed text-slate-200">{meetingShorthand}</p>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Operating call summary">
          <div className={tierOneInset}>
            <SummaryLabel
              label="Posture"
              icon={<svg viewBox="0 0 16 16" className="h-3.5 w-3.5"><circle cx="8" cy="8" r="5" fill="none" stroke="currentColor" strokeWidth="1.5" /><circle cx="8" cy="8" r="1.5" fill="currentColor" /></svg>}
            />
            <p className="mt-1 text-lg font-semibold text-slate-100">{postureLabel}</p>
          </div>
          <div className={tierOneInset}>
            <SummaryLabel
              label="Movement"
              icon={<svg viewBox="0 0 16 16" className="h-3.5 w-3.5"><path d="M2.5 11 6 7.5l2.3 2.2L13.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
            />
            <p className="mt-1 text-lg font-semibold text-slate-100">{movementVelocity}</p>
            <p className="text-xs text-slate-300">{postureDelta}</p>
          </div>
          <div className={tierOneInset}>
            <SummaryLabel
              label="Confidence"
              icon={<svg viewBox="0 0 16 16" className="h-3.5 w-3.5"><path d="M8 2.5 12 4v3.6c0 2.5-1.6 4.8-4 5.9-2.4-1.1-4-3.4-4-5.9V4l4-1.5Z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /></svg>}
            />
            <p className="mt-1 text-lg font-semibold text-slate-100">{confidenceLabel}</p>
            <p className="mt-2 text-[11px] uppercase tracking-[0.1em] text-slate-400">quality</p>
            <div className={`mt-1 ${meterTrackBase} bg-slate-800/80`}>
              <div className={`${meterFillBase} bg-gradient-to-r from-slate-300/75 to-emerald-300/85`} style={{ width: `${confidenceMeterPercent}%` }} />
              <div className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border border-emerald-100/80 bg-slate-950" style={{ left: `calc(${confidenceMeterPercent}% - 6px)` }} />
            </div>
          </div>
          <div className={tierOneInset}>
            <SummaryLabel
              label="Action"
              icon={<svg viewBox="0 0 16 16" className="h-3.5 w-3.5"><path d="M2.5 8h11" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /><path d="m9.5 4.8 3.2 3.2-3.2 3.2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
            />
            <p className="mt-1 text-sm font-semibold text-slate-100">{immediateDecision}</p>
          </div>
        </div>

        <article className={tierOneInset}>
          <p className={`text-xs ${neutralLabel}`}>Macro posture band</p>
          <div className="mt-2">
            <div className="mb-2 grid grid-cols-4 text-[11px] uppercase tracking-[0.1em]">
              {regimeSegments.map((segment) => <span key={segment.key} className="text-slate-400" title={segment.label}>{segment.shortLabel}</span>)}
            </div>
            <div className="relative grid h-3 grid-cols-4 overflow-hidden rounded-full border border-slate-700/70 bg-slate-900/80">
              {regimeSegments.map((segment) => (
                <div key={segment.key} className={segment.classes} aria-label={segment.label} />
              ))}
              <div className="absolute -top-1 h-4 w-4 -translate-x-1/2 rounded-full border-2 border-slate-100 bg-sky-200" style={{ left: `${gaugePercent}%` }} />
              {transitionWatch === "ON" ? <div className="absolute inset-y-[-2px] left-1/2 w-0.5 -translate-x-1/2 bg-amber-200/90" aria-hidden="true" /> : null}
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-300">Trend: {trendLabel} · {Math.abs(regimeDistance.pointsToFlip).toFixed(1)} points to flip · Regime shift watch {transitionWatch}</p>
        </article>

        <article className="rounded-lg border border-amber-500/45 bg-amber-500/10 px-3 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-100">Guardrail</p>
          <p className="mt-1 text-sm font-semibold text-amber-50">{guardrail}</p>
        </article>

        <article className={tierOneInset}>
          <p className={`text-xs ${neutralLabel}`}>Flip condition</p>
          <p className="mt-1 text-xs text-slate-300">Current: {regimeDistance.currentValue.toFixed(1)} · Trigger: {regimeDistance.thresholdValue.toFixed(1)}</p>
          <p className="mt-2 inline-flex rounded-full border border-slate-600/70 bg-slate-900/80 px-2 py-0.5 text-[11px] uppercase tracking-[0.1em] text-slate-300">
            distance to trigger
          </p>
          <div className={`mt-1 ${meterTrackBase} bg-slate-800/90`}>
            <div
              className={`${meterFillBase} ${thresholdBreached ? "bg-rose-300/85" : "bg-amber-300/80"}`}
              style={{ width: `${thresholdRatio}%` }}
            />
          </div>
          <p className={`mt-2 text-xs ${thresholdBreached ? "text-rose-100" : "text-amber-100"}`}>
            {thresholdBreached ? "Threshold breached." : `${Math.abs(regimeDistance.pointsToFlip).toFixed(1)} points away from trigger.`}
          </p>
        </article>

        <p className="text-xs text-slate-300">{netConstraintSummary}</p>
        <p className="inline-flex items-center gap-1.5 text-xs text-slate-300"><span aria-hidden="true" className="text-slate-400"><svg viewBox="0 0 12 12" className="h-3 w-3"><path d="M6 1.6 9 2.8v2.9c0 2-1.2 3.8-3 4.7-1.8-.9-3-2.7-3-4.7V2.8l3-1.2Z" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /></svg></span>Trust status: {trustCueLine}</p>
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

  return (
    <article className={`${tierOnePanel} ${sectionSpacing}`}>
      <h2 className={tierOneHeading}>Decision matrix this week</h2>
      <p className="text-xs text-slate-300">Action now, then guardrail + flip conditions.</p>
      <ul className="mt-2 grid gap-3 sm:grid-cols-2">
        {topDecisionRules.map((rule) => (
          <li key={rule.area} className={`${tierOneInset} text-xs text-slate-200`}>
            <p className="font-semibold uppercase tracking-[0.12em] text-slate-200">{decisionAreaLabel(rule.area)}</p>
            <p className="mt-2 text-base font-semibold text-slate-100">{rule.recommendation}</p>
            <p className="mt-3 rounded-md border border-rose-500/50 bg-rose-500/10 px-2 py-2 text-rose-100">
              <span className="font-semibold uppercase tracking-[0.12em]">Guardrail</span> {rule.pauseTrigger}
            </p>
            <p className="mt-2 rounded-md border border-emerald-500/50 bg-emerald-500/10 px-2 py-2 text-emerald-100">
              <span className="font-semibold uppercase tracking-[0.12em]">Flip condition</span> {rule.resumeTrigger}
            </p>
            <p className="mt-2 text-slate-400">Scope: {rule.scope}</p>
          </li>
        ))}
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
  macroOverlay: WeeklyDecisionCardProps["macroOverlay"];
};

export function MoreContextDisclosureBody({
  startupClimateIndex,
  primaryDrivers,
  whyThisCall,
  memoryRail,
  historicalTimeline,
  macroOverlay,
}: MoreContextDisclosureProps) {
  return (
    <details className={`${tierTwoPanel} ${sectionSpacing}`}>
      <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.14em] text-slate-200">
        Why this call ▼
      </summary>
      <div className="mt-3 space-y-4">
        <article className="space-y-2">
          <h2 className={tierTwoHeading}>Startup Climate Index</h2>
          <p className="text-xs text-slate-300">Score {startupClimateIndex.score} / 100 · {startupClimateIndex.status}</p>
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
    </details>
  );
}

type CitationActionFooterProps = {
  citationMetaLine: string;
  citation: string;
  actions?: ReactNode;
};

export function CitationActionFooter({ citationMetaLine, citation, actions }: CitationActionFooterProps) {
  return (
    <article className={`${tierThreePanel} ${sectionSpacing}`}>
      <h2 className={tierThreeHeading}>Cite this call</h2>
      <p className="mt-2 text-xs text-slate-300">{citationMetaLine}</p>
      <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs text-slate-300">{citation}</pre>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-700/60 bg-slate-950/60 px-3 py-3 text-xs text-slate-300">
        <span>Use this citation in meeting notes, board updates, or operating memos.</span>
        <span className="font-semibold uppercase tracking-[0.12em] text-slate-200">Send to team</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-3">
        <div className="hidden sm:flex sm:flex-wrap sm:gap-3">{actions}</div>
        <Link
          href="/toolkits/whether-to-ship"
          className="weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em] text-slate-200 transition-colors hover:border-sky-400/70 hover:text-slate-100"
        >
          Run risk check
        </Link>
      </div>
    </article>
  );
}

export function WeeklyDecisionCard({
  statusLabel,
  postureDelta,
  confidenceLabel,
  confidencePercent,
  trendLabel,
  transitionWatch,
  netConstraintSummary,
  guardrail,
  reversalTrigger,
  recordDateLabel,
  fetchedAtLabel,
  reportDynamics,
  decisionShiftSummary,
  decisionRules,
  revisitDecisions,
  memoryRail,
  historicalTimeline,
  macroOverlay,
  whyThisCall,
  primaryDrivers,
  startupClimateIndex,
  regimeDistance,
  citation,
  isFallbackSnapshot = false,
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
  const meetingShorthand = revisitDecisions
    ? "Posture updated. Tighten decisions this week and avoid irreversible commitments."
    : "Posture held. Keep last week's operating rules and avoid irreversible commitments.";
  const immediateDecision = revisitDecisions
    ? "Revise hiring and roadmap calls now."
    : "Hold last week's operating rules.";

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

  const movementVelocity = resolveVelocityLabel(macroMovementRows);
  const decisionPressurePercent = Math.max(10, Math.min(95, reportDynamics.changedSignals.length * 22 + (revisitDecisions ? 25 : 8)));
  const decisionStabilityPercent = Math.max(8, Math.min(100, 100 - reportDynamics.changedSignals.length * 25 - (revisitDecisions ? 25 : 0)));
  const needsTrustWarning = isFallbackSnapshot || confidenceLabel !== "HIGH" || freshnessLabel === "Unavailable";
  const trustWarningCopy = isFallbackSnapshot
    ? "Using a cached snapshot. Use this call for near-term pacing only and pause irreversible decisions until live refresh returns."
    : "Use this call for near-term pacing only until confidence returns to HIGH with fresh data.";

  return (
    <section className="weather-panel space-y-5 px-5 py-6 sm:space-y-6 sm:px-7 sm:py-8" aria-labelledby="weekly-posture-brief-title">
      <DecisionCallHeader
        statusLabel={statusLabel}
        netConstraintSummary={netConstraintSummary}
        meetingShorthand={meetingShorthand}
        postureDelta={postureDelta}
        immediateDecision={immediateDecision}
        guardrail={guardrail}
        confidencePercent={confidencePercent}
        confidenceLabel={confidenceLabel}
        trendLabel={trendLabel}
        transitionWatch={transitionWatch}
        freshnessLabel={freshnessLabel}
        trustCueLine={trustCueLine}
        needsTrustWarning={needsTrustWarning}
        trustWarningCopy={trustWarningCopy}
        regimeDistance={regimeDistance}
        movementVelocity={movementVelocity}
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
        <a
          href="#primary-artifact-actions"
          className="weather-button-primary fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-20 inline-flex min-h-[44px] items-center justify-center rounded-full px-4 py-2 text-xs font-semibold tracking-[0.12em] text-slate-100 shadow-[0_10px_24px_rgba(2,6,23,0.65)] sm:hidden"
        >
          Jump to copy actions
        </a>
      ) : null}

      <article className={`${tierOnePanel} ${sectionSpacing}`}>
        <h2 className={tierOneHeading}>Decision support details</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className={tierOneInset}>
            <p className={`text-xs ${neutralLabel}`}>Change this week</p>
            <p className="mt-1 text-xs text-slate-200">{decisionShiftSummary}</p>
          </div>
          <div className={tierOneInset}>
            <p className={`text-xs ${neutralLabel}`}>Canonical decision</p>
            <p className="mt-1 text-xs text-slate-300">Use the top call above for action, guardrail, and flip condition.</p>
          </div>
          <div className="rounded-lg border border-amber-500/45 bg-slate-950/72 px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-100">Guardrail reference</p>
            <p className="mt-1 text-xs text-slate-200">{guardrail}</p>
          </div>
          <div className="rounded-lg border border-sky-500/35 bg-slate-950/72 px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sky-200">Flip condition reference</p>
            <p className="mt-1 text-xs text-slate-200">{reversalTrigger}</p>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <article className={tierOneInset}>
            <p className={`text-xs ${neutralLabel}`}>Macro drift this week</p>
            <p className="mt-1 text-xs text-slate-300">Velocity: {movementVelocity}</p>
            <p className="mt-2 text-[11px] uppercase tracking-[0.1em] text-slate-400">weekly movement</p>
            <ul className="mt-2 space-y-2 text-xs text-slate-200">
              {macroMovementRows.map((signal) => (
                <li key={signal.key} className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span>{signal.label}</span>
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

      <BoundedRulesMatrix decisionRules={decisionRules} />
      <MoreContextDisclosureBody
        startupClimateIndex={startupClimateIndex}
        primaryDrivers={primaryDrivers}
        whyThisCall={whyThisCall}
        memoryRail={memoryRail}
        historicalTimeline={historicalTimeline}
        macroOverlay={macroOverlay}
      />
      <CitationActionFooter citationMetaLine={citationMetaLine} citation={citation} actions={actions} />
    </section>
  );
}
