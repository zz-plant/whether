import Link from "next/link";
import type { Route } from "next";
import { ConfidenceGauge } from "../ConfidenceGauge";
import { ConfidenceMiniChart } from "./ConfidenceMiniChart";
import type { CallModePanelViewModel } from "./callModePanelModel";

export function CallModeSections({ viewModel }: { viewModel: CallModePanelViewModel }) {
  const {
    compactInsetClassName,
    whyItMattersLine,
    trustReason,
    trustStatusSummary,
    postureSteps,
    trajectoryDeltaSummary,
    stabilityRule,
    guardrailPolicyDetails,
    flipPolicyDetails,
    glossaryHref,
    citationMetaLine,
    citation,
    actions,
    confidenceHistory,
    confidenceTrend,
    confidencePercent,
    selectedModeLabel,
    flipSupport,
    postureSummaryCards,
    operatingCall,
    actionNow,
    snapshotGuardrail,
    snapshotWatch,
    revisitDecisions,
    revisitLabel,
    revisitDetail,
    effectiveFlipLabels,
    shouldShowReadinessCallout,
    trustChipClass,
    inlineTrustLabel,
    decisionBullets,
  } = viewModel;

  const hasSecondaryLane = revisitDecisions || flipSupport.length > 0;
  const changedItem = decisionBullets.find((item) => item.label === "What changed");
  const changedDetail = changedItem?.detail ?? null;
  const recommendationItem = decisionBullets.find((item) => item.label === "What that changes");
  const recommendationDetail = recommendationItem?.detail ?? null;

  return (
    <article className="max-w-3xl mx-auto space-y-5 py-4 sm:py-6">
      <header className="space-y-1 border-b border-slate-800/60 pb-4">
        <div className="grid grid-cols-[4rem_1fr] gap-x-3 gap-y-0.5 text-sm">
          <span className="text-slate-500 font-medium">From</span>
          <span className="text-slate-200 font-semibold">Whether</span>
          <span className="text-slate-500 font-medium">Re</span>
          <span className="text-slate-100 font-semibold">Weekly operating guidance</span>
        </div>

        {shouldShowReadinessCallout ? (
          <p className={`mt-3 rounded-md px-3 py-2 text-fluid-xs leading-5 ${trustChipClass}`}>
            {inlineTrustLabel}: {trustStatusSummary}
          </p>
        ) : null}

        {changedDetail ? (
          <p className="mt-3 text-sm leading-relaxed text-slate-300">{changedDetail}</p>
        ) : null}
      </header>

      <div className="space-y-4 text-sm leading-relaxed text-slate-200">
        <p className="font-semibold text-slate-100">{operatingCall}</p>

        {actionNow ? (
          <p>{actionNow}</p>
        ) : null}

        {snapshotGuardrail ? (
          <p>Pause if {snapshotGuardrail}.</p>
        ) : null}

        {snapshotWatch ? (
          <p>Watch {snapshotWatch}.</p>
        ) : null}

        {recommendationDetail ? (
          <p>{recommendationDetail}</p>
        ) : null}
      </div>

      <section>
        <h3 className="text-fluid-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Why this call</h3>
        <p className="mt-1 text-sm leading-relaxed text-slate-300">{guardrailPolicyDetails.summary}</p>
        {guardrailPolicyDetails.chips.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {guardrailPolicyDetails.chips.map((chip) => (
              <span key={chip} className={compactInsetClassName}>{chip}</span>
            ))}
          </div>
        ) : null}
      </section>

      <section>
        <h3 className="text-fluid-xs font-semibold uppercase tracking-[0.12em] text-slate-400">What would change this read</h3>
        <p className="mt-1 text-sm leading-relaxed text-slate-300">{flipPolicyDetails.summary}</p>
        {flipSupport.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {flipSupport.map((label) => (
              <span key={label} className="weather-chip weather-chip-sky">{label}</span>
            ))}
          </div>
        ) : null}
        {effectiveFlipLabels.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {effectiveFlipLabels.map((label) => (
              <span key={label} className={compactInsetClassName}>{label}</span>
            ))}
          </div>
        ) : null}
      </section>

      {whyItMattersLine ? (
        <section>
          <h3 className="text-fluid-xs font-semibold uppercase tracking-[0.12em] text-slate-400">What this means now</h3>
          <p className="mt-1 text-sm leading-relaxed text-slate-300">{whyItMattersLine}</p>
        </section>
      ) : null}

      {(confidencePercent != null) ? (
        <section>
          <h3 className="text-fluid-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Confidence</h3>
          <div className="mt-2 space-y-3">
            <ConfidenceGauge percent={confidencePercent} size="md" />
            {postureSteps.length > 1 ? (
              <div className="flex flex-wrap items-center gap-2">
                {postureSteps.map((step, index) => (
                  <div key={`${step.label}-${step.detail}`} className="flex items-center gap-2">
                    <span className={`rounded-lg px-2.5 py-1.5 text-xs ${step.isCurrent ? "bg-sky-500/8 text-sky-100 font-semibold" : "bg-slate-950/35 text-slate-300"}`}>
                      {step.posture}
                    </span>
                    {index < postureSteps.length - 1 ? (
                      <span className="text-xs text-slate-500">→</span>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
            {confidenceTrend ? (
              <ConfidenceMiniChart
                confidenceHistory={confidenceHistory}
                confidenceTrend={confidenceTrend}
                currentConfidencePercent={confidencePercent}
              />
            ) : null}
            {trajectoryDeltaSummary ? (
              <p className="text-xs text-slate-400">{trajectoryDeltaSummary}</p>
            ) : null}
          </div>
        </section>
      ) : null}

      {hasSecondaryLane ? (
        <section>
          <h3 className="text-fluid-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Revisit</h3>
          <p className="mt-1 text-sm leading-relaxed text-slate-300">{revisitLabel}</p>
          {revisitDetail ? (
            <p className="mt-1 text-xs text-slate-400">{revisitDetail}</p>
          ) : null}
        </section>
      ) : null}

      {stabilityRule ? (
        <section>
          <h3 className="text-fluid-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Stability</h3>
          <p className="mt-1 text-sm leading-relaxed text-slate-300">{stabilityRule}</p>
        </section>
      ) : null}

      {trustReason ? (
        <p className="text-xs text-slate-500 italic">Using the last verified weekly read because {trustReason}</p>
      ) : null}

      <section className="border-t border-slate-800/60 pt-4">
        <h3 className="text-fluid-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Citation</h3>
        <p className="mt-1 text-xs leading-5 text-slate-400">{citationMetaLine}</p>
        <pre className="mt-2 overflow-x-auto rounded-md bg-slate-950/60 px-3 py-2 font-mono whitespace-pre-wrap text-xs leading-5 text-slate-300">
          {citation}
        </pre>
      </section>

      {glossaryHref ? (
        <p className="text-xs text-slate-500">
          <Link href={glossaryHref as Route} className="font-semibold text-sky-200 underline decoration-slate-600 underline-offset-4 hover:text-slate-100">
            Open the glossary
          </Link>
        </p>
      ) : null}

      <footer className="border-t border-slate-800/60 pt-4">
        <p className="text-fluid-micro font-semibold uppercase tracking-[0.1em] text-slate-500 mb-2">Decision at a glance</p>
        <div className="grid grid-cols-2 gap-2 text-xs mb-4">
          <div className="rounded-md bg-emerald-500/6 px-3 py-2">
            <p className="text-emerald-200 font-semibold uppercase tracking-[0.08em]">Do now</p>
            <p className="mt-1 text-slate-200">{actionNow || operatingCall}</p>
          </div>
          <div className="rounded-md bg-rose-500/6 px-3 py-2">
            <p className="text-rose-200 font-semibold uppercase tracking-[0.08em]">Pause if</p>
            <p className="mt-1 text-slate-200">{snapshotGuardrail || "No active pause trigger"}</p>
          </div>
          <div className="rounded-md bg-sky-500/6 px-3 py-2">
            <p className="text-sky-200 font-semibold uppercase tracking-[0.08em]">Watch</p>
            <p className="mt-1 text-slate-200">{snapshotWatch || "No active watch"}</p>
          </div>
          <div className="rounded-md bg-amber-500/6 px-3 py-2">
            <p className="text-amber-200 font-semibold uppercase tracking-[0.08em]">Flip if</p>
            <p className="mt-1 text-slate-200">{effectiveFlipLabels.length ? effectiveFlipLabels.join(" · ") : "No active flip trigger"}</p>
          </div>
        </div>
        {postureSummaryCards.length > 0 ? (
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {postureSummaryCards.map((card) => (
              <div key={card.label} className={card.className}>
                <dt className="text-fluid-micro uppercase tracking-[0.1em] text-slate-500">{card.label}</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-100">{card.value}</dd>
                <dd className="mt-0.5 text-fluid-micro text-slate-500">{card.detail}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </footer>

      {actions ? (
        <footer className="border-t border-slate-800/60 pt-4">
          {actions}
        </footer>
      ) : null}
    </article>
  );
}
