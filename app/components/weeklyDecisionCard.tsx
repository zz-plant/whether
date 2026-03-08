import type { ReactNode } from "react";
import Link from "next/link";
import type { ReportDynamics } from "../../lib/report/reportData";
import type { BoundedDecisionRule } from "../../lib/report/boundedDecisionRules";
import { decisionAreaLabel } from "../../lib/report/boundedDecisionRules";
import {
  buildWeeklyCitationMetaLine,
  buildWeeklyTrustCueLine,
} from "../../lib/report/trustStatus";
import {
  deltaLabelBySignal,
  movementMeterToneByDirection,
  normalizeMeterToPercent,
  postureDisplayLabel,
  resolveSignalDirection,
  signalOrder,
  timelinePosturePercent,
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
const primaryHeading = "text-sm font-semibold uppercase tracking-[0.14em] text-slate-100";
const secondaryHeading = "text-xs font-semibold uppercase tracking-[0.12em] text-slate-300";
const primaryPanel = "rounded-xl border border-slate-700/80 bg-slate-950/72 p-4";
const secondaryPanel = "rounded-xl border border-slate-700/70 bg-slate-950/64 p-4";
const supportingPanel = "rounded-xl border border-slate-800/75 bg-slate-950/56 p-4";

const regimeGaugeStops = ["Expansion", "Mixed", "Scarcity", "Defensive"] as const;
const regimeGaugePercentByLabel: Record<string, number> = {
  EXPANSION: 12,
  BALANCED: 40,
  VOLATILE: 40,
  SCARCITY: 68,
  DEFENSIVE: 92,
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

      <article className={`${primaryPanel} ${sectionSpacing}`} aria-label="Operating call panel">
        <h2 className={primaryHeading}>This week in 15 seconds</h2>
        <p className="text-sm leading-relaxed text-slate-200">{meetingShorthand}</p>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Operating call summary">
          <div className="rounded-lg border border-slate-700/75 bg-slate-950/72 px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">Posture</p>
            <p className="mt-1 text-lg font-semibold text-slate-100">{postureLabel}</p>
          </div>
          <div className="rounded-lg border border-slate-700/75 bg-slate-950/72 px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">Movement</p>
            <p className="mt-1 text-lg font-semibold text-slate-100">{movementVelocity}</p>
            <p className="text-xs text-slate-300">{postureDelta}</p>
          </div>
          <div className="rounded-lg border border-slate-700/75 bg-slate-950/72 px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">Confidence</p>
            <p className="mt-1 text-lg font-semibold text-slate-100">{confidenceLabel}</p>
            <p className="mt-2 text-[11px] uppercase tracking-[0.1em] text-slate-400">quality</p>
            <div className={`mt-1 ${meterTrackBase} bg-slate-800/80`}>
              <div className={`${meterFillBase} bg-gradient-to-r from-slate-300/75 to-emerald-300/85`} style={{ width: `${confidenceMeterPercent}%` }} />
              <div className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border border-emerald-100/80 bg-slate-950" style={{ left: `calc(${confidenceMeterPercent}% - 6px)` }} />
            </div>
          </div>
          <div className="rounded-lg border border-slate-700/75 bg-slate-950/72 px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">Instruction</p>
            <p className="mt-1 text-sm font-semibold text-slate-100">{immediateDecision}</p>
          </div>
        </div>

        <article className="rounded-lg border border-slate-700/75 bg-slate-950/72 px-3 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">Macro posture dial</p>
          <div className="mt-2">
            <div className="mb-2 grid grid-cols-4 text-[11px] uppercase tracking-[0.1em] text-slate-400">
              {regimeGaugeStops.map((item) => <span key={item}>{item}</span>)}
            </div>
            <div className="relative h-2 rounded-full bg-slate-800">
              <div className="absolute -top-1 h-4 w-4 -translate-x-1/2 rounded-full border-2 border-slate-100 bg-sky-200" style={{ left: `${gaugePercent}%` }} />
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-300">Trend: {trendLabel} · Regime shift watch {transitionWatch}</p>
        </article>

        <article className="rounded-lg border border-amber-500/45 bg-amber-500/10 px-3 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-100">Primary guardrail</p>
          <p className="mt-1 text-sm font-semibold text-amber-50">{guardrail}</p>
        </article>

        <article className="rounded-lg border border-slate-700/75 bg-slate-950/72 px-3 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">Flip trigger</p>
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
        <p className="text-xs text-slate-300">Trust check: {trustCueLine} · Freshness {freshnessLabel}</p>
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
    <article className={`${secondaryPanel} ${sectionSpacing}`}>
      <h2 className={primaryHeading}>Decision matrix this week</h2>
      <p className="text-xs text-slate-300">Action now, then stop/restart thresholds.</p>
      <ul className="mt-2 grid gap-3 sm:grid-cols-2">
        {topDecisionRules.map((rule) => (
          <li key={rule.area} className="rounded-lg border border-slate-700/60 bg-slate-950/60 px-3 py-3 text-xs text-slate-200">
            <p className="font-semibold uppercase tracking-[0.12em] text-sky-200">{decisionAreaLabel(rule.area)}</p>
            <p className="mt-2 text-base font-semibold text-slate-100">{rule.recommendation}</p>
            <p className="mt-3 rounded-md border border-rose-500/50 bg-rose-500/10 px-2 py-2 text-rose-100">
              <span className="font-semibold uppercase tracking-[0.12em]">Stop if</span> {rule.pauseTrigger}
            </p>
            <p className="mt-2 rounded-md border border-emerald-500/50 bg-emerald-500/10 px-2 py-2 text-emerald-100">
              <span className="font-semibold uppercase tracking-[0.12em]">Restart when</span> {rule.resumeTrigger}
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
    <details className={`${secondaryPanel} ${sectionSpacing}`}>
      <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.14em] text-slate-200">
        Why this call ▼
      </summary>
      <div className="mt-3 space-y-4">
        <article className="space-y-2">
          <h2 className={secondaryHeading}>Startup Climate Index</h2>
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
          <h2 className={secondaryHeading}>Supporting evidence</h2>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {primaryDrivers.map((driver) => (
              <li key={driver.label} className="rounded-md border border-slate-700/60 bg-slate-950/60 px-3 py-3 text-xs text-slate-200">
                <p className="font-semibold uppercase tracking-[0.12em] text-sky-200">{driver.label}</p>
                <p className="mt-1 text-slate-300">{driver.detail}</p>
              </li>
            ))}
          </ul>
        </article>

        <article className="space-y-2">
          <h2 className={secondaryHeading}>Why this posture call</h2>
          <ul className="mt-2 grid gap-2 sm:grid-cols-3">
            {whyThisCall.map((reason) => (
              <li key={reason.label} className="rounded-md border border-slate-700/60 bg-slate-950/60 px-3 py-3 text-xs text-slate-200">
                <p className="font-semibold uppercase tracking-[0.12em] text-sky-200">{reason.label}</p>
                <p className="mt-1 text-slate-300">{reason.detail}</p>
              </li>
            ))}
          </ul>
        </article>

        <article className="space-y-3">
          <h2 className={secondaryHeading}>Posture history</h2>
          <div className="flex flex-wrap items-center gap-2" aria-label="Macro regime timeline">
            {historicalTimeline.map((item) => (
              <div key={`${item.label}-${item.posture}`} className="rounded-md border border-slate-700/60 bg-slate-950/60 px-3 py-2 text-xs text-slate-200">
                <p className="text-slate-400">{item.label}</p>
                <p className="font-semibold text-slate-100">{item.posture}</p>
              </div>
            ))}
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Historical memory rail</p>
            <ul className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {memoryRail.map((item) => (
                <li key={`${item.label}-${item.posture}`} className="rounded-md border border-slate-700/60 bg-slate-950/60 px-3 py-3 text-xs text-slate-200">
                  <p className="text-slate-400">{item.label}</p>
                  <p className="mt-1 font-semibold text-slate-100">{item.posture}</p>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {historicalTimeline.map((item, index) => (
              <div key={`${item.label}-${item.posture}-bar`} className="flex items-center gap-2">
                <div className="h-2 w-12 rounded-full bg-slate-800">
                  <div className="h-2 rounded-full bg-sky-300/75" style={{ width: `${timelinePosturePercent(item.posture)}%` }} />
                </div>
                {index < historicalTimeline.length - 1 ? <span className="text-slate-500">→</span> : null}
              </div>
            ))}
          </div>
          <ul className="grid gap-2 text-xs text-slate-300 sm:grid-cols-2 lg:grid-cols-4">
            {macroOverlay.map((item) => (
              <li key={item.label} className="rounded-md border border-slate-700/60 bg-slate-950/60 px-3 py-3">
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
    <article className={`${supportingPanel} ${sectionSpacing}`}>
      <h2 className={secondaryHeading}>Cite this call</h2>
      <p className="mt-2 text-xs text-slate-300">{citationMetaLine}</p>
      <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs text-slate-300">{citation}</pre>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-700/60 bg-slate-950/60 px-3 py-3 text-xs text-slate-300">
        <span>Use this citation in meeting notes, board updates, or operating memos.</span>
        <span className="font-semibold uppercase tracking-[0.12em] text-slate-200">Send to team</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-3">
        {actions}
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
  const trustCueLine = buildWeeklyTrustCueLine({ confidenceLabel, freshnessLabel, transitionWatch });
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

  const signalMagnitude = Math.max(
    ...signalOrder.map((key) => {
      const signal = reportDynamics.changedSignals.find((item) => item.key === key);
      return Math.abs(signal?.delta ?? 0);
    }),
    1,
  );

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
      meter: normalizeMeterToPercent(delta, signalMagnitude),
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

      <article className={`${primaryPanel} ${sectionSpacing}`}>
        <h2 className={primaryHeading}>Decision delta this week</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-slate-700/75 bg-slate-950/72 px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">Change this week</p>
            <p className="mt-1 text-xs text-slate-200">{decisionShiftSummary}</p>
          </div>
          <div className="rounded-lg border border-slate-700/75 bg-slate-950/72 px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">What to do now</p>
            <p className="mt-1 text-xs font-semibold text-slate-100">{immediateDecision}</p>
          </div>
          <div className="rounded-lg border border-amber-500/45 bg-slate-950/72 px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-100">Primary guardrail</p>
            <p className="mt-1 text-xs text-slate-200">{guardrail}</p>
          </div>
          <div className="rounded-lg border border-sky-500/35 bg-slate-950/72 px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sky-200">Flip trigger</p>
            <p className="mt-1 text-xs text-slate-200">{reversalTrigger}</p>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <article className="rounded-lg border border-slate-700/75 bg-slate-950/72 px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">Macro drift this week</p>
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
                  <div className={`${meterTrackBase} border border-slate-700/70 bg-slate-900/80`}>
                    <div
                      className={`${meterFillBase} ${movementMeterToneByDirection[resolveSignalDirection(signal.delta)]}`}
                      style={{ width: `${signal.meter}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </article>

          <article className="rounded-lg border border-slate-700/75 bg-slate-950/72 px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">Plan stability</p>
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
