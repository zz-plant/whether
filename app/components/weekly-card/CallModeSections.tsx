import Link from "next/link";
import type { Route } from "next";
import { publicDecisionLabels } from "../../../lib/report/reportFormatting";
import {
  PRIMARY_AUDIENCE_ACTION,
  PRIMARY_AUDIENCE_LABEL,
  PRIMARY_AUDIENCE_SUMMARY,
} from "../../../lib/report/reportCopy";
import { ConfidenceMiniChart } from "./ConfidenceMiniChart";
import type { CallModePanelViewModel } from "./callModePanelModel";

export function CallModeSections({ viewModel }: { viewModel: CallModePanelViewModel }) {
  const {
    compactInsetClassName,
    whyItMattersLine,
    trustReason,
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
    detailDisclosureBase,
    flipSupport,
    postureSummaryCards,
  } = viewModel;

  return (
    <>
      <div className="weather-section-stage weather-section-stage--short rounded px-3 py-3" style={{ contentVisibility: "auto" }}>
        <div className="border-b border-slate-800/50 pb-3">
          <p className="type-kicker text-slate-400">
            {PRIMARY_AUDIENCE_LABEL}
          </p>
          <p className="mt-1 text-fluid-xs leading-5 text-slate-300">
            {PRIMARY_AUDIENCE_SUMMARY}
          </p>
          <p className="mt-1 text-fluid-xs leading-5 text-slate-400">
            {PRIMARY_AUDIENCE_ACTION}
          </p>
        </div>
        <dl className="mt-3 grid gap-2 grid-cols-2 xl:grid-cols-4 break-words">
        {postureSummaryCards.map((card) => (
          <div key={card.label} className={card.className}>
            <dt className="type-kicker text-slate-400">{card.label}</dt>
            <dd className="mt-1 type-data font-semibold text-slate-50">{card.value}</dd>
            <dd className="mt-1 text-fluid-micro leading-4 text-slate-400">{card.detail}</dd>
          </div>
        ))}
        </dl>
      </div>

      {postureSteps.length > 1 || confidenceTrend ? (
        <div className="weather-section-stage weather-section-stage--medium rounded px-3 py-3" style={{ contentVisibility: "auto" }}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="type-kicker text-slate-400">Confidence timeline</p>
            {trajectoryDeltaSummary ? (
              <p className="type-kicker text-slate-300">{trajectoryDeltaSummary}</p>
            ) : null}
            {confidenceTrend ? (
              <span className="weather-chip weather-chip-slate">
                {Math.round(confidencePercent)}% confidence
              </span>
            ) : null}
          </div>
          {postureSteps.length > 1 ? (
            <div className="weather-list-stagger mt-3 flex flex-wrap items-center gap-2">
              {postureSteps.map((step, index) => (
                <div key={`${step.label}-${step.detail}`} className="flex items-center gap-2">
                  <article className={`min-w-[8rem] rounded-lg px-2.5 py-2 ${step.isCurrent ? "bg-sky-500/8" : "bg-slate-950/35"}`}>
                    <p className="type-kicker text-slate-300">{step.label}</p>
                    <p className={`mt-1 type-data font-semibold ${step.isCurrent ? "text-sky-50" : "text-slate-50"}`}>{step.posture}</p>
                    <p className="mt-1 text-fluid-micro leading-4 text-slate-300">{step.detail}</p>
                  </article>
                  {index < postureSteps.length - 1 ? (
                    <span className="text-xs font-semibold text-slate-500" aria-hidden="true">→</span>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
          {confidenceTrend ? (
            <div className="mt-3 border-t border-slate-800/70 pt-3">
              <ConfidenceMiniChart
                confidenceHistory={confidenceHistory}
                confidenceTrend={confidenceTrend}
                currentConfidencePercent={confidencePercent}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      <section
        id="share-ready-artifact"
        aria-label="Send this brief"
        className="weather-section-stage weather-section-stage--long space-y-3"
      >
        {actions ? (
          actions
        ) : (
          <p className="rounded-md bg-slate-950/25 px-3 py-3 text-xs leading-5 text-slate-300">
            Share actions are temporarily unavailable. Use the summary above as the copy-ready source.
          </p>
        )}

        <details className="weather-auto-chevron rounded-lg bg-slate-950/35 px-3 py-2.5">
          <summary className="cursor-pointer list-none text-fluid-micro font-semibold uppercase tracking-[0.12em] text-slate-300">
            Citation
          </summary>
          <div className="mt-3">
            <div className="rounded-lg bg-slate-950/30 px-3 py-3">
              <p className="text-xs leading-5 text-slate-300">{citationMetaLine}</p>
              <pre className="mt-2 overflow-x-auto rounded-md bg-slate-950/60 px-3 py-2 font-mono whitespace-pre-wrap text-xs leading-5 text-slate-300">
                {citation}
              </pre>
            </div>
          </div>
        </details>
      </section>

      <details className={`group ${detailDisclosureBase} weather-auto-chevron mt-3`}>
        <summary className="min-h-[44px] cursor-pointer list-none pt-1 text-fluid-xs font-semibold uppercase tracking-[0.12em] text-slate-300">
          <span className="min-w-0 flex-1">
            <span className="block">Why this call</span>
            <span className="mt-1 block text-fluid-xs font-normal normal-case tracking-normal text-slate-400">
              {guardrailPolicyDetails.summary}
            </span>
          </span>
          <span aria-hidden="true" className="text-sm transition group-open:rotate-180">▾</span>
        </summary>
        <div className="mt-2 grid gap-3 xl:grid-cols-2">
          <article className="rounded-md bg-rose-500/8 px-3 py-3">
            <p className="type-kicker text-rose-200">Why this call</p>
            <p className="mt-1 type-data text-slate-200">{guardrailPolicyDetails.summary}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {guardrailPolicyDetails.chips.map((chip) => (
                <span key={chip} className={compactInsetClassName}>{chip}</span>
              ))}
            </div>
          </article>

          <article className="rounded-md bg-slate-950/45 px-3 py-3">
            <p className="type-kicker text-slate-400">Best for</p>
            <p className="mt-1 text-sm font-semibold text-slate-100">{selectedModeLabel}</p>
            <p className="mt-1 text-xs leading-5 text-slate-300">{stabilityRule}</p>
          </article>

          <article className="rounded-md bg-sky-500/8 px-3 py-3">
            <p className="type-kicker text-sky-200">What would change this read</p>
            <p className="mt-1 text-xs leading-5 text-slate-200">{flipPolicyDetails.summary}</p>
            {flipSupport.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {flipSupport.map((label) => (
                  <span key={label} className="weather-chip weather-chip-sky">
                    {label}
                  </span>
                ))}
              </div>
            ) : null}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {flipPolicyDetails.chips.map((chip) => (
                <span key={chip} className={compactInsetClassName}>{chip}</span>
              ))}
            </div>
          </article>

          {(whyItMattersLine || trustReason || glossaryHref) ? (
            <article className="rounded-md bg-slate-950/45 px-3 py-3 xl:col-span-2">
              <p className="type-kicker text-slate-400">What this means now</p>
              {whyItMattersLine ? <p className="mt-1 type-data text-slate-200">{whyItMattersLine}</p> : null}
              {trustReason ? (
                <p className="mt-2 text-fluid-xs leading-5 text-slate-400">
                  Using the last verified weekly read because {trustReason}
                </p>
              ) : null}
              {glossaryHref ? (
                <p className="mt-2 text-fluid-xs leading-5 text-slate-300">
                  Need definitions?{" "}
                  <Link href={glossaryHref as Route} className="font-semibold text-sky-200 underline decoration-slate-600 underline-offset-4 hover:text-slate-100">
                    Open the glossary
                  </Link>
                  .
                </p>
              ) : null}
            </article>
          ) : null}
        </div>
      </details>
    </>
  );
}
