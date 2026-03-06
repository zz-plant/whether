import type { ReactNode } from "react";
import type { ReportDynamics } from "../../lib/report/reportData";
import type { BoundedDecisionRule } from "../../lib/report/boundedDecisionRules";
import { decisionAreaLabel } from "../../lib/report/boundedDecisionRules";

type MemoryRailItem = {
  label: string;
  posture: string;
};

type WeeklyDecisionCardProps = {
  statusLabel: string;
  postureDelta: string;
  confidenceLabel: "HIGH" | "MED" | "LOW";
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
  citation: string;
  actions?: ReactNode;
};

const deltaLabel: Record<ReportDynamics["changedSignals"][number]["key"], string> = {
  tightness: "Capital tightness",
  riskAppetite: "Risk appetite",
  baseRate: "Base rate",
  curveSlope: "Yield curve slope",
};

const directionHint = (delta: number) => (delta > 0 ? "tightening" : delta < 0 ? "easing" : "unchanged");

const signalDeltaTone: Record<"tightening" | "easing" | "unchanged", string> = {
  tightening: "border-semantic-tightening-border/70 bg-semantic-tightening-bg/70 text-semantic-tightening-fg",
  easing: "border-semantic-easing-border/70 bg-semantic-easing-bg/70 text-semantic-easing-fg",
  unchanged: "border-semantic-unchanged-border/70 bg-semantic-unchanged-bg/70 text-semantic-unchanged-fg",
};

const sectionSpacing = "space-y-3";
const primaryHeading = "text-sm font-semibold uppercase tracking-[0.14em] text-slate-100";
const secondaryHeading = "text-xs font-semibold uppercase tracking-[0.12em] text-slate-300";
const primaryPanel = "rounded-xl border border-slate-600/80 bg-slate-900/70 p-4";
const secondaryPanel = "rounded-xl border border-slate-700/70 bg-slate-900/50 p-4";
const supportingPanel = "rounded-xl border border-slate-800/70 bg-slate-900/35 p-4";

export function WeeklyDecisionCard({
  statusLabel,
  postureDelta,
  confidenceLabel,
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
  citation,
  actions,
}: WeeklyDecisionCardProps) {
  return (
    <section className="weather-panel space-y-5 px-5 py-6 sm:space-y-6 sm:px-7 sm:py-8" aria-labelledby="weekly-posture-brief-title">
      <header className="space-y-2 border-b border-slate-600/70 pb-4 sm:pb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-200">This week&apos;s posture</p>
        <h1 id="weekly-posture-brief-title" className="text-3xl font-semibold text-slate-50 sm:text-4xl">{statusLabel}</h1>
        <p className="text-sm text-slate-300">{netConstraintSummary}</p>
      </header>

      <article className={`${primaryPanel} ${sectionSpacing}`}>
        <h2 className={primaryHeading}>What changed this week</h2>
        <p className="text-sm text-sky-100">{decisionShiftSummary}</p>
        {reportDynamics.changedSignals.length === 0 ? (
          <p className="rounded-md border border-slate-700/80 bg-slate-950/60 px-3 py-2 text-xs text-slate-300">No material signal deltas this week.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {reportDynamics.changedSignals.slice(0, 3).map((signal) => {
              const deltaDirection = directionHint(signal.delta);
              return (
                <span
                  key={signal.key}
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-xs ${signalDeltaTone[deltaDirection]}`}
                >
                  {deltaLabel[signal.key]}: {signal.delta > 0 ? "↑" : signal.delta < 0 ? "↓" : "→"} {deltaDirection}
                </span>
              );
            })}
          </div>
        )}
      </article>

      <article className={`${primaryPanel} ${sectionSpacing}`}>
        <h2 className={primaryHeading}>Should we revisit last week&apos;s decisions?</h2>
        <p className="mt-2 text-sm font-semibold text-slate-100">{revisitDecisions ? "Yes — update hiring and roadmap calls." : "No — keep the current posture."}</p>
        <p className="mt-1 text-xs text-slate-300">Posture change: {postureDelta} · Confidence: {confidenceLabel} · Shift watch: {transitionWatch}</p>
      </article>

      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
        <article className={`${primaryPanel} ${sectionSpacing} border-amber-500/50`}>
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-amber-200">Main guardrail</h2>
          <p className="text-sm text-slate-100">{guardrail}</p>
        </article>
        <article className={`${primaryPanel} ${sectionSpacing} border-sky-500/50`}>
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-sky-200">What changes if we’re wrong?</h2>
          <p className="text-sm text-slate-100">{reversalTrigger}</p>
        </article>
      </div>

      <article className={`${secondaryPanel} ${sectionSpacing}`}>
        <h2 className={primaryHeading}>Decision rules for this week</h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {decisionRules.slice(0, 4).map((rule) => (
            <li key={rule.area} className="rounded-lg border border-slate-700/60 bg-slate-950/60 p-3 text-sm text-slate-200">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sky-200">{decisionAreaLabel(rule.area)}</p>
              <p className="mt-1 font-semibold text-slate-100">{rule.recommendation}</p>
              <p className="mt-2 text-xs text-slate-300">Applies to: {rule.scope}</p>
              <p className="mt-1 text-xs text-semantic-caution-fg">Pause when: {rule.pauseTrigger}</p>
              <p className="mt-1 text-xs text-semantic-reversal-fg">Resume when: {rule.resumeTrigger}</p>
            </li>
          ))}
        </ul>
      </article>

      <article className={`${supportingPanel} ${sectionSpacing}`}>
        <h2 className={secondaryHeading}>Past 4 weeks at a glance</h2>
        <ul className="mt-2 grid gap-2 sm:grid-cols-4">
          {memoryRail.map((item) => (
            <li key={`${item.label}-${item.posture}`} className="rounded-md border border-slate-700/60 bg-slate-950/60 px-2 py-2 text-xs text-slate-200">
              <p className="text-slate-400">{item.label}</p>
              <p className="font-semibold text-slate-100">{item.posture}</p>
            </li>
          ))}
        </ul>
      </article>

      <article className={`${supportingPanel} ${sectionSpacing}`}>
        <h2 className={secondaryHeading}>Cite this call</h2>
        <p className="mt-2 text-xs text-slate-300">Posture {statusLabel} · Confidence {confidenceLabel} · Effective {recordDateLabel} · Freshness {fetchedAtLabel}</p>
        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs text-slate-300">{citation}</pre>
        <div className="mt-3">{actions}</div>
      </article>
    </section>
  );
}
