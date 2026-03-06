import type { ReactNode } from "react";
import type { DecisionKnob } from "../../lib/report/decisionKnobs";
import type { BoundedDecisionRule } from "../../lib/report/boundedDecisionRules";
import { isImprovingSignalDelta } from "../../lib/report/reportData";
import type { ReportDynamics } from "../../lib/report/reportData";

type Regime = "SCARCITY" | "DEFENSIVE" | "VOLATILE" | "EXPANSION";

type WeeklyDecisionCardProps = {
  regime: Regime;
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
  decisionKnobs: DecisionKnob[];
  decisionShiftSummary: string;
  decisionRules: BoundedDecisionRule[];
  revisitDecisions: boolean;
  memoryRail: string[];
  citation: string;
  actions?: ReactNode;
};

const regimeEnvironmentByRegime: Record<Regime, string> = {
  SCARCITY: "capital constrained",
  DEFENSIVE: "risk elevated",
  VOLATILE: "mixed signals",
  EXPANSION: "window open with guardrails",
};

const decisionAreaLabels: Record<BoundedDecisionRule["area"], string> = {
  hiring: "Hiring",
  "product-tempo": "Product tempo",
  "capital-raising": "Capital raising",
  "burn-discipline": "Burn discipline",
  "expansion-bets": "Expansion bets",
};

const deltaSignalOrder: Array<{
  key: ReportDynamics["changedSignals"][number]["key"];
  label: string;
}> = [
  { key: "tightness", label: "Capital tightness" },
  { key: "riskAppetite", label: "Risk appetite" },
  { key: "baseRate", label: "Base rate" },
  { key: "curveSlope", label: "Curve slope" },
];

const summarizeDelta = (key: ReportDynamics["changedSignals"][number]["key"], delta: number) => {
  if (delta === 0) {
    return "unchanged";
  }

  const improving = isImprovingSignalDelta(key, delta);
  return improving ? "easing" : "tightening";
};

export function WeeklyDecisionCard({
  regime,
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
  decisionKnobs,
  decisionShiftSummary,
  decisionRules,
  revisitDecisions,
  memoryRail,
  citation,
  actions,
}: WeeklyDecisionCardProps) {
  const deltasByKey = new Map(reportDynamics.changedSignals.map((item) => [item.key, item.delta]));
  const visibleRules = decisionRules.slice(0, 4);

  return (
    <section className="weather-panel space-y-5 px-5 py-6 sm:px-7 sm:py-7" aria-labelledby="weekly-posture-brief-title">
      <header className="space-y-2 border-b border-slate-700/70 pb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-200">This week</p>
        <h1 id="weekly-posture-brief-title" className="text-2xl font-semibold text-slate-50 sm:text-3xl">
          {statusLabel} — {regimeEnvironmentByRegime[regime]}
        </h1>
        <p className="text-sm text-slate-300">Change vs last week: {postureDelta}</p>
      </header>

      <article className="rounded-xl border border-sky-500/40 bg-slate-900/60 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-100">What changed this week</h2>
        <p className="mt-2 text-sm font-semibold text-slate-50">{decisionShiftSummary}</p>
        {reportDynamics.changedSignals.length === 0 ? (
          <p className="mt-2 text-sm text-slate-300">No macro change this week. Continue last week’s posture.</p>
        ) : (
          <ul className="mt-3 grid gap-2 sm:grid-cols-3">
            {deltaSignalOrder
              .filter((signal) => deltasByKey.has(signal.key))
              .slice(0, 3)
              .map((signal) => {
                const delta = deltasByKey.get(signal.key) ?? 0;
                const improving = delta !== 0 && isImprovingSignalDelta(signal.key, delta);
                const icon = delta === 0 ? "→" : improving ? "↑" : "↓";

                return (
                  <li key={signal.key} className="rounded-lg border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-sm text-slate-200">
                    <p className="text-xs uppercase tracking-[0.12em] text-slate-400">{signal.label}</p>
                    <p className="mt-1 font-semibold text-slate-100">{icon} {Math.abs(delta).toFixed(2)}</p>
                    <p className="text-xs text-slate-400">{summarizeDelta(signal.key, delta)}</p>
                  </li>
                );
              })}
          </ul>
        )}
      </article>

      <article className="rounded-xl border border-slate-700/70 bg-slate-900/60 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-200">Revisit last week&apos;s decisions?</h2>
        <p className={`mt-2 text-xl font-semibold ${revisitDecisions ? "text-amber-200" : "text-emerald-200"}`}>
          {revisitDecisions ? "YES — Update hiring/roadmap calls." : "NO — Hold current posture."}
        </p>
        <p className="mt-1 text-sm text-slate-300">{netConstraintSummary}</p>
      </article>

      <article className="rounded-xl border border-slate-700/70 bg-slate-900/60 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-200">Bounded decision rules</h2>
        <ul className="mt-3 grid gap-3 md:grid-cols-2">
          {visibleRules.map((rule) => (
            <li key={rule.area} className="rounded-lg border border-violet-500/30 bg-slate-950/60 p-3 text-sm text-slate-100">
              <p className="text-xs uppercase tracking-[0.12em] text-violet-200">{decisionAreaLabels[rule.area]}</p>
              <p className="mt-1 font-semibold text-violet-100">{rule.title}</p>
              <p className="mt-1">{rule.recommendation}</p>
              <p className="mt-1 text-amber-100">Pause trigger: {rule.pauseTrigger}</p>
              <p className="mt-1 text-emerald-100">Resume trigger: {rule.resumeTrigger}</p>
            </li>
          ))}
        </ul>
      </article>

      <article className="rounded-xl border border-slate-700/70 bg-slate-900/60 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-200">What changes if we&apos;re wrong?</h2>
        <p className="mt-2 text-sm text-slate-100">{guardrail}</p>
        <p className="mt-2 text-sm text-slate-100">{reversalTrigger}</p>
      </article>

      <article className="rounded-xl border border-slate-700/70 bg-slate-900/50 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-200">Last 4 weeks</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {memoryRail.map((entry) => (
            <span key={entry} className="weather-pill inline-flex min-h-[36px] items-center px-3 py-1 text-xs text-slate-200">{entry}</span>
          ))}
        </div>
      </article>

      <article className="rounded-xl border border-slate-700/70 bg-slate-900/50 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-200">Cite this call</h2>
        <p className="mt-2 whitespace-pre-line text-xs text-slate-300">{citation}</p>
        <p className="mt-2 text-xs text-slate-400">As of {recordDateLabel} · refreshed {fetchedAtLabel} · Confidence {confidenceLabel} · Shift watch {transitionWatch}</p>
      </article>

      <article className="rounded-xl border border-slate-700/70 bg-slate-900/50 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-200">Share artifact</h2>
        <div className="mt-3">{actions}</div>
      </article>

      <div className="hidden" aria-hidden="true">{decisionKnobs.length}</div>
    </section>
  );
}
