"use client";

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
};

const postureHeadlineByRegime: Record<Regime, string> = {
  SCARCITY: "Maintain constraint discipline. Approvals require immediate return and reversibility.",
  DEFENSIVE: "Protect core delivery and cash durability. Expand only with hard ROI proof.",
  VOLATILE: "Preserve optionality. Stage commitments behind concrete milestones.",
  EXPANSION: "Expand selectively while enforcing burn and payback guardrails.",
};

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
}: WeeklyDecisionCardProps) {
  return (
    <section className="weather-panel space-y-6 px-5 py-6 sm:px-7 sm:py-8" aria-labelledby="weekly-posture-brief-title">
      <header className="space-y-3 border-b border-slate-700/70 pb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-200">Weekly Capital Posture Brief</p>
        <h1 id="weekly-posture-brief-title" className="text-3xl font-semibold text-slate-50 sm:text-4xl">
          {statusLabel}
        </h1>
        <p className="max-w-3xl text-base text-slate-200">{postureHeadlineByRegime[regime]}</p>
        <p className="text-sm text-slate-300">Regime delta: {postureDelta}</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3" aria-label="Posture confidence and watch state">
        <article className="rounded-xl border border-slate-700/70 bg-slate-900/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">Confidence</p>
          <p className="mt-2 text-2xl font-semibold text-slate-50">{confidenceLabel}</p>
        </article>
        <article className="rounded-xl border border-slate-700/70 bg-slate-900/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">Transition watch</p>
          <p className="mt-2 text-2xl font-semibold text-slate-50">{transitionWatch}</p>
        </article>
        <article className="rounded-xl border border-rose-500/40 bg-slate-900/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-200">High-risk decisions</p>
          <p className="mt-2 text-sm font-semibold text-rose-100">{dangerousCategory}</p>
        </article>
      </div>

      <article className="rounded-xl border border-slate-700/70 bg-slate-900/50 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-100">Operating constraints (this week)</h2>
        <ul className="mt-3 space-y-2 text-sm text-slate-200">
          {constraints.slice(0, 3).map((item) => (
            <li key={item}>• {item}</li>
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
