import Link from "next/link";
import type { Route } from "next";
import { publicDecisionLabels } from "../../lib/report/reportFormatting";
import {
  PRIMARY_AUDIENCE_ACTION,
  PRIMARY_AUDIENCE_LABEL,
  PRIMARY_AUDIENCE_SUMMARY,
} from "../../lib/report/reportCopy";
import { ConfidenceMiniChart } from "./weekly-card/ConfidenceMiniChart";
import type { CallModePanelModel } from "./weekly-card/callModePanelModel";

type PolicyDetails = {
  summary: string;
  chips: string[];
};

export type { CallModePanelModel } from "./weekly-card/callModePanelModel";

const compactChangedThisWeekDetail = (detail: string) => {
  const lead = detail.split(/\b(?:Do now|Action|Flip):/i)[0]?.trim();
  return lead && lead.length > 0 ? lead : detail;
};

export function WeeklyCallModePanel({
  model,
}: {
  model: CallModePanelModel;
}) {
  const {
    startupVariantPolicy,
    operatingCall,
    actionNow,
    snapshotGuardrail,
    snapshotWatch,
    revisitDecisions,
    revisitQueue,
    decisionReadiness,
    effectiveFlipLabels,
    compactInsetClassName,
    tierOnePanelClassName,
    sectionSpacingClassName,
    tierOneHeadingClassName,
    whyItMattersLine,
    needsTrustWarning = false,
    trustStateDetail,
    trustReason,
    inlineTrustLabel,
    inlineTrustTone,
    comparisonSummary,
    postureSteps,
    trajectoryDeltaSummary,
    stabilityRule,
    weeklyLeadershipSummary,
    decisionBullets,
    driverHighlights,
    guardrailPolicyDetails,
    flipPolicyDetails,
    glossaryHref,
    citationMetaLine,
    citation,
    actions,
    confidenceHistory,
    confidenceTrend,
    confidencePercent,
  } = model;
  const selectedModeLabel = startupVariantPolicy.options.find((option) => option.mode === startupVariantPolicy.selectedMode)?.label ?? "Default";
  const detailDisclosureBase = "mt-2 rounded-xl border border-slate-800/80 bg-slate-950/55 px-3 py-2.5";
  const flipSupport = effectiveFlipLabels
    .filter((label) => label.trim().length > 0 && label.trim() !== snapshotWatch.trim())
    .slice(0, 2);
  const changedThisWeekDetail = compactChangedThisWeekDetail(
    decisionBullets.find((item) => item.label === "What changed")?.detail ?? "No material weekly delta.",
  );
  const recommendationLine = decisionBullets.find((item) => item.label === "What that changes")?.detail ?? operatingCall;
  const revisitLabel = revisitDecisions ? "Yes. Last week's decisions need another look." : "No. This week's plan can stay on track.";
  const revisitDetail = revisitDecisions
    ? "Revisit last week's approvals before adding fixed cost."
    : "";
  const shouldShowReadinessCallout = needsTrustWarning || inlineTrustTone !== "stable" || Boolean(trustReason);
  const trustStatusSummary = trustReason
    ? `Using the last clean snapshot because ${trustReason}`
    : trustStateDetail;
  const compactMetricCardBase = "rounded-xl border border-slate-800/65 bg-slate-950/35 px-3 py-3";
  const primaryDriver = driverHighlights[0] ?? null;
  const supportingDrivers = primaryDriver ? driverHighlights.slice(1, 3) : driverHighlights.slice(0, 2);
  const featuredRevisitItem = revisitDecisions ? revisitQueue[0] ?? null : null;
  const deferredRevisitItems = revisitDecisions ? revisitQueue.slice(1) : [];
  const hasSecondaryLane = revisitDecisions || flipSupport.length > 0;
  const boldnessDeltaLabel = weeklyLeadershipSummary.boldnessDelta > 0
    ? `+${weeklyLeadershipSummary.boldnessDelta}`
    : `${weeklyLeadershipSummary.boldnessDelta}`;
  const formatBackdropValue = (
    value: string,
    kind: "hiring" | "expansion" | "raise",
  ) => {
    if (kind === "raise") {
      if (value === "Improving") {
        return "Opening";
      }
      if (value === "Stable") {
        return "Steady";
      }
      return value;
    }

    if (value === "Strong") {
      return "Supportive";
    }
    if (value === "Constrained") {
      return "Tight";
    }
    return value;
  };
  const postureSummaryCards = [
    {
      label: "Boldness budget",
      value: `${weeklyLeadershipSummary.boldnessScore} / 100`,
      detail: weeklyLeadershipSummary.boldnessDelta === 0
        ? "No change vs last week"
        : `${boldnessDeltaLabel} vs last week`,
      className: `${compactMetricCardBase} border-slate-700/80 bg-slate-900/65`,
    },
    {
      label: "Hiring market",
      value: formatBackdropValue(weeklyLeadershipSummary.hiringWindow, "hiring"),
      detail: "U.S. labor backdrop",
      className: compactMetricCardBase,
    },
    {
      label: "Expansion market",
      value: formatBackdropValue(weeklyLeadershipSummary.expansionWindow, "expansion"),
      detail: "U.S. demand backdrop",
      className: compactMetricCardBase,
    },
    {
      label: "Funding market",
      value: formatBackdropValue(weeklyLeadershipSummary.raiseWindow, "raise"),
      detail: "U.S. funding backdrop",
      className: compactMetricCardBase,
    },
  ] as const;
  const trustChipClass =
    inlineTrustTone === "warning"
      ? "border-amber-400/25 bg-amber-500/8 text-amber-100"
      : inlineTrustTone === "historical"
        ? "border-violet-400/25 bg-violet-500/8 text-violet-100"
        : "border-slate-700/70 bg-slate-950/60 text-slate-200";
  const showModeChip = selectedModeLabel !== "Default";
  const driverToneClass = (direction: CallModePanelModel["driverHighlights"][number]["postureDirection"]) =>
    direction === "tightening"
      ? "border-amber-400/25 bg-amber-500/8 text-amber-100"
      : direction === "opening"
        ? "border-emerald-400/25 bg-emerald-500/8 text-emerald-100"
        : "border-slate-700/70 bg-slate-950/60 text-slate-300";

  return (
    <>
      <article className={sectionSpacingClassName} aria-label="Weekly brief">
        <article id="weekly-call-core" className={`${tierOnePanelClassName} relative overflow-hidden border-slate-800/70 bg-[linear-gradient(180deg,rgba(6,11,20,0.96),rgba(4,8,16,0.99))]`}>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-500/35 to-transparent" />
          <div className="relative space-y-4">
            <div className={`grid gap-4 ${hasSecondaryLane ? "xl:grid-cols-[minmax(0,1.48fr)_minmax(15rem,0.52fr)]" : ""}`}>
              <article className="rounded-[1rem] border border-slate-800/60 bg-[linear-gradient(180deg,rgba(10,18,32,0.62),rgba(2,6,23,0.34))] px-4 py-4 shadow-[0_22px_50px_-36px_rgba(8,15,28,0.98)]">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-[0.7rem] border border-slate-700/80 bg-slate-950/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-300">
                      This week
                    </span>
                    <span className="rounded-[0.7rem] border border-emerald-400/25 bg-emerald-500/8 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-emerald-100">
                      {decisionReadiness.label}
                    </span>
                    <span className={`rounded-[0.7rem] border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] ${trustChipClass}`}>
                      {inlineTrustLabel}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Net delta
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-100">
                      {weeklyLeadershipSummary.netDeltaLabel}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {showModeChip ? (
                    <span className="text-[11px] font-medium text-slate-500">
                      {selectedModeLabel}
                    </span>
                  ) : null}
                </div>
                <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  What this means now
                </p>
                <h2 className={`${tierOneHeadingClassName} mt-3 max-w-4xl text-xl leading-tight text-slate-50 sm:text-[2.05rem] sm:leading-[2.4rem]`}>
                  {recommendationLine}
                </h2>
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] leading-5 text-slate-300">
                  <span className="font-semibold text-slate-100">{weeklyLeadershipSummary.shorthandLine}</span>
                  <span>Boldness budget {weeklyLeadershipSummary.boldnessScore}/100</span>
                  <span>{Math.round(confidencePercent)}% confidence</span>
                </div>
                {shouldShowReadinessCallout ? (
                  <p className="mt-3 rounded-lg border border-slate-800/70 bg-slate-950/55 px-3 py-2 text-[12px] leading-5 text-slate-300">
                    {trustStatusSummary}
                  </p>
                ) : null}

                <section className="mt-4 rounded-[1rem] border border-slate-700/75 bg-[linear-gradient(180deg,rgba(8,17,31,0.78),rgba(4,10,20,0.88))] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="max-w-2xl">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                        {publicDecisionLabels.call}
                      </p>
                      <p className="mt-1 text-[11px] leading-5 text-slate-400">
                        The standing recommendation this week.
                      </p>
                      <p className="mt-2 text-sm font-semibold leading-6 text-slate-50">{operatingCall}</p>
                    </div>
                    <div className="rounded-xl border border-slate-700/70 bg-slate-950/70 px-3 py-2.5 sm:max-w-[14rem]">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Meeting shorthand</p>
                      <p className="mt-1 text-[11px] leading-5 text-slate-200">{weeklyLeadershipSummary.shorthandLine}</p>
                    </div>
                  </div>
                </section>

                <section className="mt-4 rounded-[0.95rem] border border-slate-800/75 bg-slate-950/52 px-3 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {primaryDriver ? (
                        <span aria-hidden="true" className="text-base leading-none">
                          {primaryDriver.postureDirection === "tightening" ? "⬇" : primaryDriver.postureDirection === "opening" ? "⬆" : "→"}
                        </span>
                      ) : null}
                      <p className="text-sm font-medium text-amber-100">What changed this week</p>
                    </div>
                    {primaryDriver ? (
                      <span className={`rounded-[0.65rem] border px-2 py-0.5 text-[10px] font-semibold ${driverToneClass(primaryDriver.postureDirection)}`}>
                        {primaryDriver.label} {primaryDriver.deltaLabel}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-50">{changedThisWeekDetail}</p>
                  {primaryDriver ? (
                    <p className="mt-2 text-[12px] leading-5 text-slate-300">{primaryDriver.implication}</p>
                  ) : null}
                  {supportingDrivers.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] font-semibold">
                      {supportingDrivers.map((driver) => (
                        <span key={`${driver.label}-${driver.deltaLabel}`} className={`rounded-[0.65rem] border px-2 py-0.5 ${driverToneClass(driver.postureDirection)}`}>
                          {driver.label} {driver.deltaLabel}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </section>

                <p className="sr-only">Weekly decision strip: current call, action now, pause if, and change course if.</p>

                <section className="mt-4 rounded-[1rem] border border-slate-800/75 bg-slate-950/40 px-3 py-3">
                  <dl className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_repeat(2,minmax(0,1fr))]">
                    <div className="rounded-lg border border-emerald-400/15 bg-emerald-500/8 px-3 py-3">
                      <dt className="text-[11px] font-medium text-emerald-200">{publicDecisionLabels.action}</dt>
                      <dd className="mt-1 text-sm font-semibold leading-6 text-emerald-50">{actionNow}</dd>
                    </div>
                    <div className="rounded-lg border border-rose-400/18 bg-rose-500/8 px-3 py-3">
                      <dt className="text-[11px] font-medium text-rose-200">{publicDecisionLabels.threshold}</dt>
                      <dd className="mt-1 text-sm font-semibold leading-6 text-rose-50">{snapshotGuardrail}</dd>
                    </div>
                    <div className="rounded-lg border border-sky-400/18 bg-sky-500/8 px-3 py-3">
                      <dt className="text-[11px] font-medium text-sky-200">{publicDecisionLabels.reversal}</dt>
                      <dd className="mt-1 text-sm font-semibold leading-6 text-sky-50">{snapshotWatch}</dd>
                    </div>
                  </dl>
                </section>
              </article>

              {hasSecondaryLane ? (
                <aside className="space-y-3 xl:pt-1">
                  <article className="rounded-[1rem] border border-slate-800/60 bg-[linear-gradient(180deg,rgba(10,18,32,0.46),rgba(3,7,18,0.26))] px-3 py-3 text-slate-100">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[11px] font-medium text-slate-300">Watch this week</p>
                      {revisitQueue.length > 0 ? (
                        <span className="rounded-[0.65rem] border border-slate-700/70 bg-slate-950/70 px-2 py-0.5 text-[10px] font-semibold text-slate-200">
                          {revisitQueue.length} decisions
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm font-semibold leading-6 text-slate-100">
                      {revisitDecisions ? revisitLabel : "Nothing major needs revisiting right now. Keep the main action moving."}
                    </p>
                    {revisitDetail ? <p className="mt-1 text-xs leading-5 text-slate-400">{revisitDetail}</p> : null}
                    {flipSupport.length > 0 ? (
                      <div className="mt-3 rounded-lg border border-slate-800/70 bg-slate-950/45 px-3 py-3">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">{publicDecisionLabels.reversal}</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {flipSupport.map((label) => (
                            <span key={label} className="rounded-[0.65rem] border border-slate-700/70 bg-slate-950/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-200">
                              {label}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {featuredRevisitItem ? (
                      <div className="mt-4 border-t border-slate-800/70 pt-3">
                        <article className="rounded-lg border border-slate-800/70 bg-slate-950/60 px-3 py-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-[11px] font-medium text-slate-300">Start with</p>
                              <p className="mt-1 text-sm font-semibold text-slate-100">{featuredRevisitItem.label}</p>
                            </div>
                            <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-emerald-100">
                              Revisit now
                            </span>
                          </div>
                          <p className="mt-3 text-[11px] leading-5 text-slate-200">{featuredRevisitItem.action}</p>
                          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                            <div>
                              <dt className="text-[11px] font-medium text-slate-400">Why it matters</dt>
                              <dd className="mt-1 text-[11px] leading-5 text-slate-400">{featuredRevisitItem.reason}</dd>
                            </div>
                            <div>
                              <dt className="text-[11px] font-medium text-slate-300">{publicDecisionLabels.reversal}</dt>
                              <dd className="mt-1 text-[11px] leading-5 text-slate-200">{featuredRevisitItem.flipCondition}.</dd>
                            </div>
                          </dl>
                        </article>
                      </div>
                    ) : null}

                    {deferredRevisitItems.length > 0 ? (
                      <details className="mt-3 rounded-lg border border-slate-800/70 bg-slate-950/55 px-3 py-2.5">
                        <summary className="cursor-pointer list-none text-[11px] font-medium text-slate-300">
                          More to revisit
                        </summary>
                        <div className="mt-3 divide-y divide-slate-800/70">
                          {deferredRevisitItems.map((item) => (
                            <article key={item.id} className="py-3 first:pt-0 last:pb-0">
                              <div className="flex items-start justify-between gap-3">
                                <p className="text-sm font-semibold text-slate-100">{item.label}</p>
                                <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-emerald-100">
                                  Revisit now
                                </span>
                              </div>
                              <p className="mt-2 text-[11px] leading-5 text-slate-200">{item.action}</p>
                              <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                                <div>
                                  <dt className="text-[11px] font-medium text-slate-400">Why it matters</dt>
                                  <dd className="mt-1 text-[11px] leading-5 text-slate-400">{item.reason}</dd>
                                </div>
                                <div>
                                  <dt className="text-[11px] font-medium text-slate-300">{publicDecisionLabels.reversal}</dt>
                                  <dd className="mt-1 text-[11px] leading-5 text-slate-200">{item.flipCondition}.</dd>
                                </div>
                              </dl>
                            </article>
                          ))}
                        </div>
                      </details>
                    ) : null}
                  </article>
                </aside>
              ) : null}
            </div>

            <div className="rounded-[1rem] border border-slate-800/60 bg-[linear-gradient(180deg,rgba(8,17,31,0.52),rgba(3,7,18,0.22))] px-3 py-3">
              <div className="border-b border-slate-800/70 pb-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  {PRIMARY_AUDIENCE_LABEL}
                </p>
                <p className="mt-1 text-[11px] leading-5 text-slate-300">
                  {PRIMARY_AUDIENCE_SUMMARY}
                </p>
                <p className="mt-1 text-[11px] leading-5 text-slate-400">
                  {PRIMARY_AUDIENCE_ACTION}
                </p>
              </div>
              <dl className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {postureSummaryCards.map((card) => (
                <div key={card.label} className={card.className}>
                  <dt className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">{card.label}</dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-100">{card.value}</dd>
                  <dd className="mt-1 text-[10px] leading-4 text-slate-500">{card.detail}</dd>
                </div>
              ))}
              </dl>
            </div>

            {postureSteps.length > 1 || confidenceTrend ? (
              <div className="rounded-[1rem] border border-slate-800/60 bg-[linear-gradient(180deg,rgba(8,17,31,0.52),rgba(3,7,18,0.22))] px-3 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Continuity</p>
                  {trajectoryDeltaSummary ? (
                    <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">{trajectoryDeltaSummary}</p>
                  ) : null}
                  {confidenceTrend ? (
                    <span className="rounded-[0.65rem] border border-slate-700/70 bg-slate-950/70 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
                      {Math.round(confidencePercent)}% confidence
                    </span>
                  ) : null}
                </div>
                {postureSteps.length > 1 ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {postureSteps.map((step, index) => (
                      <div key={`${step.label}-${step.detail}`} className="flex items-center gap-2">
                        <article className={`min-w-[8rem] rounded-lg border px-2.5 py-2 ${step.isCurrent ? "border-sky-400/30 bg-sky-500/8" : "border-slate-800/70 bg-slate-950/55"}`}>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">{step.label}</p>
                          <p className={`mt-1 text-xs font-semibold ${step.isCurrent ? "text-sky-50" : "text-slate-100"}`}>{step.posture}</p>
                          <p className="mt-1 text-[10px] leading-4 text-slate-400">{step.detail}</p>
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
              className="space-y-3"
            >
              {actions ? (
                actions
              ) : (
                <p className="rounded-xl border border-slate-800/80 bg-slate-950/45 px-3 py-3 text-xs leading-5 text-slate-300">
                  Share actions are temporarily unavailable. Use the summary above as the copy-ready source.
                </p>
              )}

              <details className="rounded-lg border border-slate-800/70 bg-slate-950/55 px-3 py-2.5">
                <summary className="cursor-pointer list-none text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300">
                  Citation
                </summary>
                <div className="mt-3">
                  <div className="rounded-lg border border-slate-800/70 bg-slate-950/50 px-3 py-3">
                    <p className="text-xs leading-5 text-slate-300">{citationMetaLine}</p>
                    <pre className="mt-2 overflow-x-auto rounded-md border border-slate-700/70 bg-slate-950/75 px-3 py-2 font-mono whitespace-pre-wrap text-xs leading-5 text-slate-300">
                      {citation}
                    </pre>
                  </div>
                </div>
              </details>
            </section>
          </div>
        </article>

        <details className={`group ${detailDisclosureBase} weather-auto-chevron mt-3`}>
          <summary className="min-h-[44px] cursor-pointer list-none pt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-300">
            <span className="min-w-0 flex-1">
              <span className="block">Why this lands here</span>
              <span className="mt-1 block text-[11px] font-normal normal-case tracking-normal text-slate-400">
                {guardrailPolicyDetails.summary}
              </span>
            </span>
            <span aria-hidden="true" className="text-sm transition group-open:rotate-180">▾</span>
          </summary>
          <div className="mt-2 grid gap-3 xl:grid-cols-2">
            <article className="rounded-xl border border-rose-400/25 bg-rose-500/8 px-3 py-3 shadow-[0_14px_24px_-24px_rgba(244,63,94,0.35)]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-rose-200">Why this lands here</p>
              <p className="mt-1 text-xs leading-5 text-slate-200">{guardrailPolicyDetails.summary}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {guardrailPolicyDetails.chips.map((chip) => (
                  <span key={chip} className={compactInsetClassName}>{chip}</span>
                ))}
              </div>
            </article>

            <article className="rounded-xl border border-slate-700/60 bg-slate-950/65 px-3 py-3 shadow-[0_14px_24px_-24px_rgba(2,6,23,0.62)]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Best for</p>
              <p className="mt-1 text-sm font-semibold text-slate-100">{selectedModeLabel}</p>
              <p className="mt-1 text-xs leading-5 text-slate-300">{stabilityRule}</p>
            </article>

            <article className="rounded-xl border border-sky-400/25 bg-sky-500/8 px-3 py-3 shadow-[0_14px_24px_-24px_rgba(56,189,248,0.35)]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-200">What would change this read</p>
              <p className="mt-1 text-xs leading-5 text-slate-200">{flipPolicyDetails.summary}</p>
              {flipSupport.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {flipSupport.map((label) => (
                    <span key={label} className="rounded-full border border-sky-400/25 bg-sky-500/8 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-sky-100">
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
              <article className="rounded-xl border border-slate-700/60 bg-slate-950/65 px-3 py-3 shadow-[0_14px_24px_-24px_rgba(2,6,23,0.62)] xl:col-span-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">What this means now</p>
                {whyItMattersLine ? <p className="mt-1 text-xs leading-5 text-slate-200">{whyItMattersLine}</p> : null}
                {trustReason ? (
                  <p className="mt-2 text-[11px] leading-5 text-slate-400">
                    Using the last verified weekly read because {trustReason}
                  </p>
                ) : null}
                {glossaryHref ? (
                  <p className="mt-2 text-[11px] leading-5 text-slate-300">
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
      </article>
    </>
  );
}
