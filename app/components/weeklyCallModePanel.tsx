import Link from "next/link";
import type { Route } from "next";
import type { ReactNode } from "react";
import type { DecisionReadinessState } from "../../lib/report/trustStatus";
import type { ConfidenceTrendFraming, WeeklyConfidencePoint } from "../../lib/report/reportData";
import type { RevisitQueueItem, StartupVariantPolicy } from "../../lib/report/homeBriefModel";
import { publicDecisionLabels } from "../../lib/report/reportFormatting";
import { CompactDisclosure } from "./compactDisclosure";
import { ConfidenceMiniChart } from "./weekly-card/ConfidenceMiniChart";

type PolicyDetails = {
  summary: string;
  chips: string[];
};

type WeeklyCallModePanelProps = {
  startupVariantPolicy: StartupVariantPolicy;
  operatingCall: string;
  snapshotGuardrail: string;
  snapshotWatch: string;
  revisitDecisions: boolean;
  revisitQueue: RevisitQueueItem[];
  decisionReadiness: DecisionReadinessState;
  effectiveFlipLabels: string[];
  compactInsetClassName: string;
  tierOnePanelClassName: string;
  sectionSpacingClassName: string;
  tierOneHeadingClassName: string;
  whyItMattersLine?: string;
  needsTrustWarning?: boolean;
  trustStateDetail: string;
  trustReason?: string;
  inlineTrustLabel: string;
  inlineTrustTone: "stable" | "warning" | "historical";
  comparisonSummary: string;
  postureSteps: Array<{ label: string; posture: string; detail: string; isCurrent: boolean }>;
  trajectoryDeltaSummary?: string;
  stabilityRule: string;
  weeklyLeadershipSummary: {
    boldnessScore: number;
    boldnessDelta: number;
    notchShiftLabel: string;
    shorthandLine: string;
    hiringWindow: string;
    expansionWindow: string;
    raiseWindow: string;
    netDeltaLabel: string;
  };
  decisionBullets: Array<{ label: string; detail: string }>;
  driverHighlights: Array<{
    label: string;
    weightLabel: string;
    weightPercent: number | null;
    deltaLabel: string;
    implication: string;
    postureDirection: "tightening" | "opening" | "flat";
    postureDirectionLabel: string;
  }>;
  guardrailPolicyDetails: PolicyDetails;
  flipPolicyDetails: PolicyDetails;
  glossaryHref?: string;
  citationMetaLine: string;
  citation: string;
  actions?: ReactNode;
  confidenceHistory: WeeklyConfidencePoint[];
  confidenceTrend?: ConfidenceTrendFraming;
  confidencePercent: number;
};

const compactChangedThisWeekDetail = (detail: string) => {
  const lead = detail.split(/\b(?:Do now|Action|Flip):/i)[0]?.trim();
  return lead && lead.length > 0 ? lead : detail;
};

export function WeeklyCallModePanel({
  startupVariantPolicy,
  operatingCall,
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
}: WeeklyCallModePanelProps) {
  const selectedModeLabel = startupVariantPolicy.options.find((option) => option.mode === startupVariantPolicy.selectedMode)?.label ?? "Default";
  const detailDisclosureBase = "mt-2 rounded-xl border border-slate-800/80 bg-slate-950/55 px-3 py-2.5";
  const flipSupport = effectiveFlipLabels
    .filter((label) => label.trim().length > 0 && label.trim() !== snapshotWatch.trim())
    .slice(0, 2);
  const changedThisWeekDetail = compactChangedThisWeekDetail(
    decisionBullets.find((item) => item.label === "What changed")?.detail ?? "No material weekly delta.",
  );
  const actionNowDetail = decisionBullets.find((item) => item.label === "What that changes")?.detail ?? operatingCall;
  const revisitLabel = revisitDecisions ? "Yes. Last week's decisions need another look." : "No. This week's plan can stay on track.";
  const revisitDetail = revisitDecisions
    ? "Revisit last week's approvals before adding fixed cost."
    : "";
  const revisitToneClass = revisitDecisions
    ? "border-amber-400/25 bg-amber-500/8 text-amber-50"
    : "border-emerald-400/25 bg-emerald-500/8 text-emerald-50";
  const shouldShowReadinessCallout = needsTrustWarning || inlineTrustTone !== "stable" || Boolean(trustReason);
  const trustStatusSummary = trustReason
    ? `Using the last clean snapshot because ${trustReason}`
    : trustStateDetail;
  const supportingDeltaLine = comparisonSummary.trim().length > 0
    ? comparisonSummary
    : weeklyLeadershipSummary.shorthandLine;
  const compactMetricCardBase = "rounded-xl border border-slate-800/65 bg-slate-950/35 px-3 py-3";
  const primaryDriver = driverHighlights[0] ?? null;
  const supportingDrivers = primaryDriver ? driverHighlights.slice(1, 3) : driverHighlights.slice(0, 2);
  const featuredRevisitItem = revisitDecisions ? revisitQueue[0] ?? null : null;
  const deferredRevisitItems = revisitDecisions ? revisitQueue.slice(1) : [];
  const hasSecondaryLane = revisitDecisions || flipSupport.length > 0;
  const aggressionDirectionLabel = weeklyLeadershipSummary.boldnessDelta > 0
    ? "More aggressive"
    : weeklyLeadershipSummary.boldnessDelta < 0
      ? "More defensive"
      : "No change";
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
      label: "Aggression vs last week",
      value: aggressionDirectionLabel,
      detail: `${weeklyLeadershipSummary.boldnessScore}/100 now`,
      className: `${compactMetricCardBase} border-slate-700/80 bg-slate-900/65`,
    },
    {
      label: "Hiring backdrop",
      value: formatBackdropValue(weeklyLeadershipSummary.hiringWindow, "hiring"),
      detail: "External backdrop",
      className: compactMetricCardBase,
    },
    {
      label: "Expansion backdrop",
      value: formatBackdropValue(weeklyLeadershipSummary.expansionWindow, "expansion"),
      detail: "External backdrop",
      className: compactMetricCardBase,
    },
    {
      label: "Funding backdrop",
      value: formatBackdropValue(weeklyLeadershipSummary.raiseWindow, "raise"),
      detail: "External backdrop",
      className: compactMetricCardBase,
    },
  ] as const;
  const driverToneClass = (direction: WeeklyCallModePanelProps["driverHighlights"][number]["postureDirection"]) =>
    direction === "tightening"
      ? "border-amber-400/25 bg-amber-500/8 text-amber-100"
      : direction === "opening"
        ? "border-emerald-400/25 bg-emerald-500/8 text-emerald-100"
        : "border-slate-700/70 bg-slate-950/60 text-slate-300";

  return (
    <>
      <article className={`rounded-[1.1rem] border border-slate-800/75 bg-[linear-gradient(180deg,rgba(7,12,22,0.94),rgba(3,8,16,0.98))] p-3 shadow-[0_18px_34px_-32px_rgba(2,6,23,0.72)] sm:p-4 ${sectionSpacingClassName}`} aria-label="Weekly brief">
        <article id="weekly-call-core" className={`${tierOnePanelClassName} relative mt-2 overflow-hidden border-slate-800/70 bg-[linear-gradient(180deg,rgba(6,11,20,0.96),rgba(4,8,16,0.99))]`}>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-500/35 to-transparent" />
          <div className="relative space-y-4">
            <div className={`grid gap-4 ${hasSecondaryLane ? "xl:grid-cols-[minmax(0,1.32fr)_minmax(17rem,0.68fr)]" : ""}`}>
              <article className="rounded-[1rem] border border-slate-800/70 bg-slate-950/30 px-4 py-4 shadow-[0_16px_28px_-26px_rgba(2,6,23,0.68)]">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-emerald-400/25 bg-emerald-500/8 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-emerald-100">
                    {decisionReadiness.label}
                  </span>
                  <span className="text-[11px] font-medium text-slate-400">
                    {selectedModeLabel}
                  </span>
                </div>
                <h2 className={`${tierOneHeadingClassName} mt-3 text-xl leading-tight text-slate-50 sm:text-[1.95rem] sm:leading-[2.3rem]`}>
                  {actionNowDetail}
                </h2>
                <p className="mt-2 max-w-3xl text-base font-semibold leading-7 text-slate-100">
                  {operatingCall}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] leading-5 text-slate-300">
                  <span className="font-semibold text-slate-100">{weeklyLeadershipSummary.shorthandLine}</span>
                  <span>{Math.round(confidencePercent)}% confidence</span>
                  <span>{inlineTrustLabel}</span>
                  <span>{weeklyLeadershipSummary.boldnessScore}/100 boldness</span>
                </div>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">{supportingDeltaLine}</p>
                {shouldShowReadinessCallout ? (
                  <p className="mt-3 rounded-lg border border-slate-800/70 bg-slate-950/55 px-3 py-2 text-[12px] leading-5 text-slate-300">
                    {trustStatusSummary}
                  </p>
                ) : null}

                <section className="mt-4 rounded-[0.95rem] border border-slate-800/75 bg-slate-950/52 px-3 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-amber-100">What changed this week</p>
                    {primaryDriver ? (
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${driverToneClass(primaryDriver.postureDirection)}`}>
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
                        <span key={`${driver.label}-${driver.deltaLabel}`} className={`rounded-full border px-2 py-0.5 ${driverToneClass(driver.postureDirection)}`}>
                          {driver.label} {driver.deltaLabel}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </section>

                <p className="sr-only">Weekly decision strip: current call, action now, pause if, and change course if.</p>

                <section className="mt-4 rounded-[1rem] border border-slate-800/75 bg-slate-950/40 px-3 py-3">
                  <dl className="grid gap-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_minmax(0,1fr)]">
                    <div className="rounded-lg border border-emerald-400/15 bg-emerald-500/8 px-3 py-3">
                      <dt className="text-[11px] font-medium text-emerald-200">{publicDecisionLabels.action}</dt>
                      <dd className="mt-1 text-sm font-semibold leading-6 text-emerald-50">{actionNowDetail}</dd>
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
                <aside className="space-y-3">
                  <article className={`rounded-[1rem] border px-3 py-3 shadow-[0_16px_28px_-28px_rgba(2,6,23,0.68)] ${revisitToneClass}`}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[11px] font-medium">Watch this week</p>
                    {revisitQueue.length > 0 ? (
                      <span className="rounded-full border border-amber-300/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold text-amber-100">
                        {revisitQueue.length} decisions
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-base font-semibold leading-6">
                    {revisitDecisions ? revisitLabel : "No major reopen items right now; keep the main action moving."}
                  </p>
                  {revisitDetail ? <p className="mt-1 text-xs leading-5 text-slate-200">{revisitDetail}</p> : null}
                  {flipSupport.length > 0 ? (
                    <div className="mt-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-sky-200">This would change the call</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {flipSupport.map((label) => (
                          <span key={label} className="rounded-full border border-sky-400/25 bg-sky-500/8 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-sky-100">
                            {label}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {featuredRevisitItem ? (
                    <div className="mt-4 border-t border-slate-800/70 pt-3">
                      <p className="text-[11px] font-medium text-amber-200">Start with</p>
                      <article className="mt-2 rounded-lg border border-slate-800/70 bg-slate-950/60 px-3 py-3">
                        <p className="text-sm font-semibold text-slate-100">{featuredRevisitItem.label}</p>
                        <p className="mt-2 text-[11px] font-medium text-emerald-200">Revisit now</p>
                        <p className="mt-1 text-[11px] leading-5 text-slate-200">{featuredRevisitItem.action}</p>
                        <p className="mt-2 text-[11px] font-medium text-slate-400">Why it matters</p>
                        <p className="mt-1 text-[11px] leading-5 text-slate-400">{featuredRevisitItem.reason}</p>
                        <p className="mt-2 text-[11px] font-medium text-sky-200">{publicDecisionLabels.reversal}</p>
                        <p className="mt-1 text-[11px] leading-5 text-sky-100">{featuredRevisitItem.flipCondition}.</p>
                      </article>
                    </div>
                  ) : null}

                  {deferredRevisitItems.length > 0 ? (
                    <details className="mt-3 rounded-lg border border-slate-800/70 bg-slate-950/55 px-3 py-2.5">
                      <summary className="cursor-pointer list-none text-[11px] font-medium text-slate-300">
                        More to reopen
                      </summary>
                      <div className="mt-3 divide-y divide-slate-800/70">
                        {deferredRevisitItems.map((item) => (
                          <article key={item.id} className="py-3 first:pt-0 last:pb-0">
                            <p className="text-sm font-semibold text-slate-100">{item.label}</p>
                            <p className="mt-2 text-[11px] font-medium text-emerald-200">Revisit now</p>
                            <p className="mt-1 text-[11px] leading-5 text-slate-200">{item.action}</p>
                            <p className="mt-2 text-[11px] font-medium text-slate-400">Why it matters</p>
                            <p className="mt-1 text-[11px] leading-5 text-slate-400">{item.reason}</p>
                            <p className="mt-2 text-[11px] font-medium text-sky-200">{publicDecisionLabels.reversal}</p>
                            <p className="mt-1 text-[11px] leading-5 text-sky-100">{item.flipCondition}.</p>
                          </article>
                        ))}
                      </div>
                    </details>
                  ) : null}
                  </article>
                </aside>
              ) : null}
            </div>

            <dl className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {postureSummaryCards.map((card) => (
                <div key={card.label} className={card.className}>
                  <dt className="text-[11px] font-medium text-slate-400">{card.label}</dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-100">{card.value}</dd>
                  <dd className="mt-1 text-[11px] leading-5 text-slate-400">{card.detail}</dd>
                </div>
              ))}
            </dl>

            <article
              id="share-ready-artifact"
              aria-label="Share-ready artifact"
              className="rounded-[1.15rem] border border-slate-800/75 bg-slate-950/42 px-4 py-4 shadow-[0_14px_24px_-22px_rgba(2,6,23,0.68)]"
            >
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(17rem,0.78fr)]">
                <div>
                  {actions ? (
                    actions
                  ) : (
                    <p className="rounded-xl border border-slate-800/80 bg-slate-950/45 px-3 py-3 text-xs leading-5 text-slate-300">
                      Share actions are temporarily unavailable. Use the weekly call above as the copy-ready source.
                    </p>
                  )}
                </div>
                <div className="space-y-3">
                  <details className="rounded-lg border border-slate-800/70 bg-slate-950/55 px-3 py-2.5">
                    <summary className="cursor-pointer list-none text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300">
                      Citation
                    </summary>
                    <div className="mt-3">
                      <p className="text-xs leading-5 text-slate-300">{citationMetaLine}</p>
                      <pre className="mt-2 overflow-x-auto rounded-md border border-slate-700/70 bg-slate-950/75 px-3 py-2 font-mono whitespace-pre-wrap text-xs leading-5 text-slate-300">
                        {citation}
                      </pre>
                    </div>
                  </details>

                  {confidenceTrend ? (
                    <details className="rounded-lg border border-slate-800/70 bg-slate-950/55 px-3 py-2.5">
                      <summary className="cursor-pointer list-none text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300">
                        Confidence and continuity
                      </summary>
                      <div className="mt-3">
                        <ConfidenceMiniChart
                          confidenceHistory={confidenceHistory}
                          confidenceTrend={confidenceTrend}
                          currentConfidencePercent={confidencePercent}
                        />
                      </div>
                    </details>
                  ) : null}
                </div>
              </div>
            </article>

            {postureSteps.length > 1 ? (
              <details className="rounded-xl border border-slate-800/70 bg-slate-950/55 px-3 py-2.5">
                <summary className="cursor-pointer list-none text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300">
                  How this moved over time
                </summary>
                <div className="mt-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[11px] leading-5 text-slate-300">{comparisonSummary}</p>
                    {trajectoryDeltaSummary ? (
                      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">{trajectoryDeltaSummary}</p>
                    ) : null}
                  </div>
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
                </div>
              </details>
            ) : null}
          </div>
        </article>

        <CompactDisclosure
          queryKey="moreContext"
          summary="Why this week points here"
          preview={guardrailPolicyDetails.summary}
          className={`group ${detailDisclosureBase} weather-auto-chevron mt-3`}
          summaryClassName="min-h-[44px] cursor-pointer list-none pt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-300"
        >
          <div className="mt-2 grid gap-3 xl:grid-cols-2">
            <article className="rounded-xl border border-rose-400/25 bg-rose-500/8 px-3 py-3 shadow-[0_14px_24px_-24px_rgba(244,63,94,0.35)]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-rose-200">Why this call points here</p>
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
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-200">What flips this call</p>
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
        </CompactDisclosure>
      </article>
    </>
  );
}
