import type { ReactNode } from "react";
import type { DecisionKnob } from "../../lib/report/decisionKnobs";
import { isImprovingSignalDelta } from "../../lib/report/reportData";
import type { ReportDynamics } from "../../lib/report/reportData";
import type { BoundedDecision } from "../../lib/report/homeBriefModel";

type Regime = "SCARCITY" | "DEFENSIVE" | "VOLATILE" | "EXPANSION";

type WeeklyDecisionCardProps = {
  regime: Regime;
  statusLabel: string;
  postureDelta: string;
  confidenceLabel: "HIGH" | "MED" | "LOW";
  transitionWatch: "ON" | "OFF";
  constraints: string[];
  netConstraintSummary: string;
  guardrail: string;
  reversalTrigger: string;
  dangerousCategory: string;
  recordDateLabel: string;
  fetchedAtLabel: string;
  reportDynamics: ReportDynamics;
  decisionKnobs: DecisionKnob[];
  decisionShiftSummary: string;
  leadershipImplications: string[];
  boundedDecisions: BoundedDecision[];
  actions?: ReactNode;
};

const postureHeadlineByRegime: Record<Regime, string> = {
  SCARCITY: "Maintain constraint discipline. Approvals require immediate return and reversibility.",
  DEFENSIVE: "Protect core delivery and cash durability. Expand only with hard ROI proof.",
  VOLATILE: "Preserve optionality. Stage commitments behind concrete milestones.",
  EXPANSION: "Expand selectively while enforcing burn and payback guardrails.",
};

const regimeEnvironmentByRegime: Record<Regime, string> = {
  SCARCITY: "capital is tight",
  DEFENSIVE: "risk is elevated",
  VOLATILE: "conditions are mixed",
  EXPANSION: "capital is more available",
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

function getDeltaMagnitudeLabel(delta: number): string {
  const absoluteDelta = Math.abs(delta);
  if (absoluteDelta === 0) return "no";
  if (absoluteDelta < 0.5) return "minor";
  if (absoluteDelta < 2) return "moderate";
  return "major";
}

export function WeeklyDecisionCard({
  regime,
  statusLabel,
  postureDelta,
  confidenceLabel,
  transitionWatch,
  constraints,
  netConstraintSummary,
  guardrail,
  reversalTrigger,
  dangerousCategory,
  recordDateLabel,
  fetchedAtLabel,
  reportDynamics,
  decisionKnobs,
  decisionShiftSummary,
  leadershipImplications,
  boundedDecisions,
  actions,
}: WeeklyDecisionCardProps) {
  const deltasByKey = new Map(reportDynamics.changedSignals.map((item) => [item.key, item.delta]));
  const confidenceScore = confidenceLabel === "HIGH" ? 0.9 : confidenceLabel === "MED" ? 0.64 : 0.38;
  const confidencePct = Math.round(confidenceScore * 100);

  return (
    <section className="weather-panel space-y-6 px-5 py-6 sm:px-7 sm:py-8" aria-labelledby="weekly-posture-brief-title">
      <header className="space-y-3 border-b border-slate-700/70 pb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-200">Weekly Operating Posture (Hiring • Spend • Roadmap)</p>
        <h1 id="weekly-posture-brief-title" className="text-3xl font-semibold text-slate-50 sm:text-4xl">
          Current environment: {statusLabel} ({regimeEnvironmentByRegime[regime]})
        </h1>
        <p className="max-w-3xl text-sm text-slate-300">A weekly operating posture for hiring, roadmap, and spend decisions — based on macro signals.</p>
        <p className="max-w-3xl text-base text-slate-200">{postureHeadlineByRegime[regime]}</p>
        <p className="text-sm text-slate-300">Change vs last week: {postureDelta}</p>
      </header>

      <article className="rounded-xl border border-sky-500/40 bg-slate-900/50 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-sky-100">Leadership brief (one-screen)</h2>
        <p className="mt-2 text-sm text-slate-100">Environment: {statusLabel} · Confidence: {confidenceLabel} · Shift watch: {transitionWatch}</p>
        <ul className="mt-3 grid gap-2 text-sm text-slate-200 sm:grid-cols-3">
          {leadershipImplications.slice(0, 3).map((line) => (
            <li key={line} className="rounded-lg border border-slate-700/60 bg-slate-950/60 px-3 py-2">{line}</li>
          ))}
        </ul>
      </article>

      <article className="rounded-xl border border-slate-700/70 bg-slate-900/50 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-100">What changed since last week</h2>
        <p className="mt-2 text-xs text-slate-300">Each line shows direction (improving/weakening) and impact (minor/moderate/major).</p>
        <p className="mt-2 text-sm font-semibold text-sky-100">{decisionShiftSummary}</p>
        {reportDynamics.changedSignals.length === 0 ? (
          <p className="mt-3 rounded-lg border border-slate-700/60 bg-slate-950/60 p-3 text-sm text-slate-200">No tracked signal moved meaningfully this week.</p>
        ) : null}
        <ul className="mt-3 grid gap-3 text-sm text-slate-100 sm:grid-cols-2">
          {deltaSignalOrder.map((item) => {
            const delta = deltasByKey.get(item.key) ?? 0;
            const isImproving = isImprovingSignalDelta(item.key, delta);
            const interpretationLabel = delta === 0 ? "unchanged" : isImproving ? "improving" : "weakening";
            const trendClassName = delta === 0 ? "text-slate-300" : isImproving ? "text-emerald-200" : "text-rose-200";
            const deltaMagnitudeLabel = getDeltaMagnitudeLabel(delta);
            const directionIcon = delta === 0 ? "→" : isImproving ? "↑" : "↓";

            return (
              <li key={item.key} className="rounded-lg border border-slate-700/60 bg-slate-950/60 p-3">
                <p className="mt-1 text-base font-semibold text-slate-50">{item.label}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 font-semibold uppercase tracking-[0.08em] ${
                      delta === 0
                        ? "border-slate-600 text-slate-300"
                        : isImproving
                          ? "border-emerald-400/60 text-emerald-200"
                          : "border-rose-400/60 text-rose-200"
                    }`}
                  >
                    <span aria-hidden="true">{directionIcon}</span>
                    {interpretationLabel}
                  </span>
                  <span className="rounded-full border border-slate-700 px-2 py-1 text-slate-300">{deltaMagnitudeLabel} move</span>
                  <span className={`font-semibold ${trendClassName}`}>{delta > 0 ? "+" : ""}{delta.toFixed(1)}</span>
                </div>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-xs text-slate-300">These shifts determine the operating posture below.</p>
      </article>

      <article className="rounded-xl border border-violet-500/40 bg-slate-900/50 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-violet-100">Bounded decisions this week</h2>
        <p className="mt-2 text-xs text-slate-300">Each line is action + pause trigger + resume condition.</p>
        <ul className="mt-3 space-y-3 text-sm text-slate-100">
          {boundedDecisions.map((decision) => (
            <li key={decision.title} className="rounded-lg border border-slate-700/60 bg-slate-950/60 p-3">
              <p className="text-xs uppercase tracking-[0.12em] text-violet-200">{decision.title}</p>
              <p className="mt-1">{decision.action}</p>
              <p className="mt-1 text-amber-100">Stop: {decision.pauseIf}</p>
              <p className="mt-1 text-emerald-100">Resume: {decision.resumeWhen}</p>
            </li>
          ))}
        </ul>
      </article>

      <article className="rounded-xl border border-slate-700/70 bg-slate-900/50 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-100">Operating dials (0–3)</h2>
        <p className="mt-2 text-xs text-slate-300">How strict leadership decisions should be right now.</p>
        <p className="mt-2 text-sm text-slate-200">{netConstraintSummary}</p>
        <div className="mt-3 grid gap-3 text-sm text-slate-100 sm:grid-cols-2">
          {decisionKnobs.map((knob) => {
            const deltaLabel = knob.delta === 0 ? "unchanged" : knob.delta > 0 ? "raised" : "lowered";
            return (
              <div key={knob.key} className="rounded-lg border border-slate-700/60 bg-slate-950/60 p-3">
                <p className="text-xs uppercase tracking-[0.12em] text-slate-300">{knob.label}</p>
                <p className="mt-1 text-sm font-semibold text-slate-100">
                  {knob.levelLabels[knob.value]} <span className="text-slate-300">({deltaLabel})</span>
                </p>
                <p className="mt-1 text-xs text-slate-300">{knob.rationale}</p>
                <div className="mt-2 flex items-center gap-1.5" aria-hidden="true">
                  {[0, 1, 2, 3].map((level) => (
                    <span
                      key={level}
                      className={`flex h-7 min-w-0 flex-1 items-center justify-center rounded-md text-[11px] font-semibold ${
                        level <= knob.value ? "bg-sky-300 text-slate-950" : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {level}
                    </span>
                  ))}
                </div>
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
            <span>{dangerousCategory}</span>
          </p>
          <p className="mt-2 text-xs text-rose-100/90">Delay large hiring or expansion commitments until conditions improve.</p>
        </article>
      </div>

      <article className="rounded-xl border border-slate-700/70 bg-slate-900/50 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-100">Rules of engagement this week</h2>
        <ul className="mt-3 flex flex-wrap gap-2 text-sm text-slate-200">
          {constraints.slice(0, 3).map((item) => (
            <li key={item} className="inline-flex min-h-[44px] items-center rounded-full border border-slate-700/80 bg-slate-950/60 px-3 py-2">
              <span aria-hidden="true" className="mr-2 text-sky-300">◆</span>
              {item}
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
          <p className="mt-2 text-sm text-slate-100">{reversalTrigger} If this triggers, update approval velocity and hiring stance immediately.</p>
        </article>
      </div>

      <article className="rounded-xl border border-slate-700/70 bg-slate-900/50 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-100">Share this call</h2>
        <p className="mt-2 text-xs text-slate-300">Copy Slack/board artifacts or export a PDF for leadership and board packets.</p>
        <div className="mt-3">{actions}</div>
      </article>

      <p className="text-xs text-slate-400">Effective date: {recordDateLabel} · Data freshness: {fetchedAtLabel}</p>
    </section>
  );
}
