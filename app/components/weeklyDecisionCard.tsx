import type { ReactNode } from "react";
import type { DecisionKnob } from "../../lib/report/decisionKnobs";
import type { ReportDynamics } from "../../lib/report/reportData";

type Regime = "SCARCITY" | "DEFENSIVE" | "VOLATILE" | "EXPANSION";

type WeeklyDecisionCardProps = {
  regime: Regime;
  statusLabel: string;
  postureDelta: string;
  confidenceLabel: "HIGH" | "MED" | "LOW";
  transitionWatch: "ON" | "OFF";
  constraints: string[];
  guardrail: string;
  reversalTrigger: string;
  dangerousCategory: string;
  recordDateLabel: string;
  fetchedAtLabel: string;
  reportDynamics: ReportDynamics;
  decisionKnobs: DecisionKnob[];
  actions?: ReactNode;
};

const postureHeadlineByRegime: Record<Regime, string> = {
  SCARCITY: "Maintain constraint discipline. Approvals require immediate return and reversibility.",
  DEFENSIVE: "Protect core delivery and cash durability. Expand only with hard ROI proof.",
  VOLATILE: "Preserve optionality. Stage commitments behind concrete milestones.",
  EXPANSION: "Expand selectively while enforcing burn and payback guardrails.",
};

const deltaSignalOrder: Array<{
  key: ReportDynamics["changedSignals"][number]["key"];
  label: string;
}> = [
  { key: "tightness", label: "Cash availability" },
  { key: "riskAppetite", label: "Risk appetite" },
  { key: "baseRate", label: "Base rate" },
  { key: "curveSlope", label: "Curve slope" },
];

export function WeeklyDecisionCard({
  regime,
  statusLabel,
  postureDelta,
  confidenceLabel,
  transitionWatch,
  constraints,
  guardrail,
  reversalTrigger,
  dangerousCategory,
  recordDateLabel,
  fetchedAtLabel,
  reportDynamics,
  decisionKnobs,
  actions,
}: WeeklyDecisionCardProps) {
  const deltasByKey = new Map(reportDynamics.changedSignals.map((item) => [item.key, item.delta]));
  const confidenceScore = confidenceLabel === "HIGH" ? 0.9 : confidenceLabel === "MED" ? 0.64 : 0.38;
  const confidencePct = Math.round(confidenceScore * 100);

  return (
    <section className="weather-panel space-y-6 px-5 py-6 sm:px-7 sm:py-8" aria-labelledby="weekly-posture-brief-title">
      <header className="space-y-3 border-b border-slate-700/70 pb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-200">Weekly Operating Posture Brief</p>
        <h1 id="weekly-posture-brief-title" className="text-3xl font-semibold text-slate-50 sm:text-4xl">
          {statusLabel}
        </h1>
        <p className="max-w-3xl text-sm text-slate-300">
          A weekly read on how strict to be right now: hiring pace, approval bar, and long-bet tolerance — based on public macro signals.
        </p>
        <p className="max-w-3xl text-base text-slate-200">{postureHeadlineByRegime[regime]}</p>
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-slate-300">Change vs last week: {postureDelta}</p>
          {actions}
        </div>
      </header>

      <article className="rounded-xl border border-slate-700/70 bg-slate-900/50 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-100">What changed since last week</h2>
        <ul className="mt-3 grid gap-3 text-sm text-slate-100 sm:grid-cols-2">
          {deltaSignalOrder.map((item) => {
            const delta = deltasByKey.get(item.key) ?? 0;
            const directionLabel = delta === 0 ? "→" : delta > 0 ? "↗" : "↘";
            const trendClassName = delta === 0
              ? "text-slate-300"
              : delta > 0
                ? "text-emerald-200"
                : "text-rose-200";
            const barWidth = Math.max(8, Math.min(100, Math.round(Math.abs(delta) * 55)));
            return (
              <li key={item.key} className="rounded-lg border border-slate-700/60 bg-slate-950/60 p-3">
                <p className="text-[11px] uppercase tracking-[0.14em] text-slate-300">{item.label}</p>
                <p className={`mt-2 text-lg font-semibold ${trendClassName}`}>
                  <span aria-hidden="true" className="mr-1">{directionLabel}</span>
                  {delta > 0 ? "+" : ""}{delta.toFixed(1)}
                </p>
                <span className="mt-2 block h-1.5 rounded-full bg-slate-800" aria-hidden="true">
                  <span className={`block h-full rounded-full ${delta === 0 ? "bg-slate-500" : delta > 0 ? "bg-emerald-400" : "bg-rose-400"}`} style={{ width: `${barWidth}%` }} />
                </span>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-xs text-slate-300">These deltas drive the dial changes below.</p>
      </article>

      <article className="rounded-xl border border-slate-700/70 bg-slate-900/50 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-100">Operating dials (0–3)</h2>
        <div className="mt-3 grid gap-3 text-sm text-slate-100 sm:grid-cols-2">
          {decisionKnobs.map((knob) => {
            const deltaLabel = knob.delta === 0 ? "unchanged" : knob.delta > 0 ? "raised" : "lowered";
            return (
              <div key={knob.key} className="rounded-lg border border-slate-700/60 bg-slate-950/60 p-3">
                <p className="text-xs uppercase tracking-[0.12em] text-slate-300">{knob.label}</p>
                <div className="mt-2 flex items-center gap-2" aria-hidden="true">
                  {[0, 1, 2, 3].map((level) => (
                    <span
                      key={level}
                      className={`h-2.5 flex-1 rounded-full ${level <= knob.value ? "bg-sky-300" : "bg-slate-800"}`}
                    />
                  ))}
                </div>
                <p className="mt-2 text-sm text-slate-100">{knob.value}/3 <span className="text-slate-300">({deltaLabel})</span></p>
              </div>
            );
          })}
        </div>
      </article>

      <div className="grid gap-3 sm:grid-cols-3" aria-label="Posture confidence and watch state">
        <article className="rounded-xl border border-slate-700/70 bg-slate-900/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">Confidence</p>
          <p className="mt-2 text-2xl font-semibold text-slate-50">{confidenceLabel}</p>
          <p className="mt-1 text-xs text-slate-300">Signal confidence {confidencePct}%</p>
          <span className="mt-3 block h-2 rounded-full bg-slate-800" aria-hidden="true">
            <span className="block h-full rounded-full bg-sky-300" style={{ width: `${confidencePct}%` }} />
          </span>
        </article>
        <article className="rounded-xl border border-slate-700/70 bg-slate-900/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">Regime shift watch</p>
          <p className="mt-2 inline-flex items-center gap-2 text-2xl font-semibold text-slate-50">
            <span
              aria-hidden="true"
              className={`h-2.5 w-2.5 rounded-full ${transitionWatch === "ON" ? "animate-pulse bg-amber-300" : "bg-emerald-300"}`}
            />
            {transitionWatch}
          </p>
          <p className="mt-2 text-xs text-slate-300">ON = you’re near a threshold; expect a flip if the next print moves.</p>
        </article>
        <article className="rounded-xl border border-rose-500/40 bg-slate-900/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-200">Avoid this week</p>
          <p className="mt-2 flex items-start gap-2 text-sm font-semibold text-rose-100">
            <span aria-hidden="true" className="mt-0.5">⚠</span>
            <span>Avoid: {dangerousCategory}</span>
          </p>
        </article>
      </div>

      <article className="rounded-xl border border-slate-700/70 bg-slate-900/50 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-100">Operating constraints (this week)</h2>
        <ul className="mt-3 flex flex-wrap gap-2 text-sm text-slate-200">
          {constraints.slice(0, 3).map((item) => (
            <li key={item} className="inline-flex min-h-[44px] items-center rounded-full border border-slate-700/80 bg-slate-950/60 px-3 py-2">
              <span aria-hidden="true" className="mr-2 text-sky-300">◆</span>{item}
            </li>
          ))}
        </ul>
      </article>

      <div className="grid gap-4 md:grid-cols-2">
        <article className="rounded-xl border border-amber-500/40 bg-slate-900/50 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-amber-200">Guardrail</h2>
          <p className="mt-2 text-sm text-slate-100">{guardrail}</p>
        </article>
        <article className="rounded-xl border border-sky-500/40 bg-slate-900/50 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-sky-200">What would flip this call</h2>
          <p className="mt-2 text-sm text-slate-100">{reversalTrigger}</p>
        </article>
      </div>

      <p className="text-xs text-slate-400">Effective date: {recordDateLabel} · Data freshness: {fetchedAtLabel}</p>
    </section>
  );
}
