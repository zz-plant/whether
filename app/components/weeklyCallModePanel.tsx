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
  const inlineTrustToneClass = inlineTrustTone === "stable"
    ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
    : inlineTrustTone === "historical"
      ? "border-violet-400/30 bg-violet-500/10 text-violet-100"
      : "border-amber-400/30 bg-amber-500/10 text-amber-100";
  const flipSupport = effectiveFlipLabels
    .filter((label) => label.trim().length > 0 && label.trim() !== snapshotWatch.trim())
    .slice(0, 2);
  const changedThisWeekDetail = compactChangedThisWeekDetail(
    decisionBullets.find((item) => item.label === "What changed")?.detail ?? "No material weekly delta.",
  );
  const actionNowDetail = decisionBullets.find((item) => item.label === "What that changes")?.detail ?? operatingCall;
  const revisitLabel = revisitDecisions ? "Yes. Last week's decisions need another look." : "No. Last week's decisions still hold.";
  const revisitDetail = revisitDecisions
    ? "Revisit last week's approvals before adding fixed cost."
    : "";
  const revisitToneClass = revisitDecisions
    ? "border-amber-400/25 bg-amber-500/8 text-amber-50"
    : "border-emerald-400/25 bg-emerald-500/8 text-emerald-50";
  const compactTrustToneClass = needsTrustWarning
    ? "border-amber-400/25 bg-amber-500/8"
    : "border-emerald-400/25 bg-emerald-500/8";
  const shouldShowReadinessCallout = needsTrustWarning || inlineTrustTone !== "stable" || Boolean(trustReason);
  const readinessSummaryToneClass = decisionReadiness.tone === "stable"
    ? "text-emerald-100"
    : decisionReadiness.tone === "historical"
      ? "text-violet-100"
      : "text-amber-100";
  const trustStatusSummary = trustReason
    ? `Using the last clean snapshot because ${trustReason}`
    : trustStateDetail;
  const supportingDeltaLine = comparisonSummary.trim().length > 0
    ? comparisonSummary
    : weeklyLeadershipSummary.shorthandLine;
  const compactMetricCardBase = "rounded-xl border border-slate-800/70 bg-slate-950/50 px-3 py-2.5";
  const primaryDriver = driverHighlights[0] ?? null;
  const supportingDrivers = primaryDriver ? driverHighlights.slice(1, 3) : driverHighlights.slice(0, 2);
  const featuredRevisitItem = revisitDecisions ? revisitQueue[0] ?? null : null;
  const deferredRevisitItems = revisitDecisions ? revisitQueue.slice(1) : [];
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
      className: compactMetricCardBase,
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
      <article className={`rounded-[1.35rem] border border-slate-800/85 bg-[linear-gradient(180deg,rgba(7,12,22,0.96),rgba(3,8,16,0.99))] p-3 shadow-[0_18px_34px_-30px_rgba(2,6,23,0.78)] sm:p-4 ${sectionSpacingClassName}`} aria-label="Weekly brief">
        <article id="weekly-call-core" className={`${tierOnePanelClassName} relative mt-3 overflow-hidden border-slate-800/80 bg-[linear-gradient(180deg,rgba(5,10,19,0.97),rgba(4,8,16,0.99))]`}>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-500/35 to-transparent" />
          <div className="relative space-y-4">
            <div className="grid gap-3 xl:grid-cols-[minmax(0,1.24fr)_minmax(18rem,0.76fr)]">
              <article className="rounded-[1.2rem] border border-slate-800/80 bg-slate-950/45 px-4 py-4 shadow-[0_16px_28px_-24px_rgba(2,6,23,0.72)]">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-slate-700/70 bg-slate-950/60 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-200">
                    {selectedModeLabel}
                  </span>
                  <span className="rounded-full border border-emerald-400/25 bg-emerald-500/8 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-emerald-100">
                    {decisionReadiness.label}
                  </span>
                </div>
                <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  This week&apos;s recommendation
                </p>
                <h2 className={`${tierOneHeadingClassName} mt-2 text-lg sm:text-[1.7rem] sm:leading-[2.05rem]`}>{actionNowDetail}</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">{supportingDeltaLine}</p>

                <div className="mt-4 rounded-xl border border-slate-800/80 bg-slate-950/50 px-3 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300">{publicDecisionLabels.call}</p>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${driverToneClass(primaryDriver?.postureDirection ?? "flat")}`}>
                      {weeklyLeadershipSummary.shorthandLine}
                    </span>
                  </div>
                  <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-100">{operatingCall}</p>
                </div>

                <p className="sr-only">Weekly decision strip: current call, action now, pause if, and change course if.</p>

                <dl className="mt-4 grid gap-2 lg:grid-cols-3">
                  <div className="rounded-xl border border-emerald-400/15 bg-emerald-500/8 px-3 py-3">
                    <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-200">{publicDecisionLabels.action}</dt>
                    <dd className="mt-1 text-sm font-semibold leading-6 text-emerald-50">{actionNowDetail}</dd>
                  </div>
                  <div className="rounded-xl border border-rose-400/18 bg-rose-500/8 px-3 py-3">
                    <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-rose-200">{publicDecisionLabels.threshold}</dt>
                    <dd className="mt-1 text-sm font-semibold leading-6 text-rose-50">{snapshotGuardrail}</dd>
                  </div>
                  <div className="rounded-xl border border-sky-400/18 bg-sky-500/8 px-3 py-3">
                    <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-200">{publicDecisionLabels.reversal}</dt>
                    <dd className="mt-1 text-sm font-semibold leading-6 text-sky-50">{snapshotWatch}</dd>
                  </div>
                </dl>

                <div className="mt-4 rounded-xl border border-slate-800/80 bg-slate-950/45 px-3 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-200">What changed</p>
                  <p className="mt-1 text-sm font-semibold leading-6 text-amber-50">{changedThisWeekDetail}</p>
                  {primaryDriver ? (
                    <div className="mt-3 rounded-lg border border-slate-800/70 bg-slate-950/55 px-2.5 py-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs font-semibold text-slate-100">{primaryDriver.label}</p>
                        <span className="rounded-full border border-slate-700/70 bg-slate-950/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-200">
                          {primaryDriver.weightLabel}
                        </span>
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${driverToneClass(primaryDriver.postureDirection)}`}>
                          {primaryDriver.deltaLabel}
                        </span>
                      </div>
                      <p className="mt-2 text-[11px] leading-5 text-slate-300">{primaryDriver.implication}</p>
                    </div>
                  ) : null}
                  {supportingDrivers.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] font-semibold uppercase tracking-[0.08em]">
                      {supportingDrivers.map((driver) => (
                        <span key={`${driver.label}-${driver.deltaLabel}`} className={`rounded-full border px-2 py-0.5 ${driverToneClass(driver.postureDirection)}`}>
                          {driver.label} {driver.deltaLabel}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </article>

              <aside className="space-y-3">
                <article className={`rounded-[1.1rem] border px-3 py-3 shadow-[0_14px_24px_-22px_rgba(2,6,23,0.68)] ${compactTrustToneClass}`}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-200">Can you rely on this?</p>
                    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] ${inlineTrustToneClass}`}>
                      {inlineTrustLabel}
                    </span>
                  </div>
                  <p className={`mt-2 text-base font-semibold leading-6 ${readinessSummaryToneClass}`}>
                    {decisionReadiness.label}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-200">
                    {shouldShowReadinessCallout ? trustStatusSummary : decisionReadiness.detail}
                  </p>
                  <div className="mt-3 rounded-lg border border-slate-800/70 bg-slate-950/55 px-3 py-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                      One-line version
                    </p>
                    <p className="mt-1 text-sm font-semibold leading-6 text-slate-100">
                      {weeklyLeadershipSummary.shorthandLine}
                    </p>
                    {whyItMattersLine ? (
                      <p className="mt-2 text-[11px] leading-5 text-slate-400">{whyItMattersLine}</p>
                    ) : null}
                  </div>
                </article>

                {(revisitDecisions || flipSupport.length > 0) ? (
                <article className={`rounded-[1.1rem] border px-3 py-3 shadow-[0_16px_28px_-26px_rgba(2,6,23,0.7)] ${revisitToneClass}`}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em]">What to watch this week</p>
                    {revisitQueue.length > 0 ? (
                      <span className="rounded-full border border-amber-300/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-amber-100">
                        {revisitQueue.length} decisions
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-base font-semibold leading-6">
                    {revisitDecisions ? revisitLabel : "No major reopen items right now."}
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
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-200">Start with</p>
                      <article className="mt-2 rounded-lg border border-slate-800/70 bg-slate-950/60 px-3 py-3">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-slate-100">{featuredRevisitItem.label}</p>
                          <span className="rounded-full border border-slate-700/70 bg-slate-950/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-300">
                            Review
                          </span>
                        </div>
                        <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-emerald-200">Revisit now</p>
                        <p className="mt-1 text-[11px] leading-5 text-slate-200">{featuredRevisitItem.action}</p>
                        <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">Why it matters</p>
                        <p className="mt-1 text-[11px] leading-5 text-slate-400">{featuredRevisitItem.reason}</p>
                        <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-sky-200">{publicDecisionLabels.reversal}</p>
                        <p className="mt-1 text-[11px] leading-5 text-sky-100">{featuredRevisitItem.flipCondition}.</p>
                      </article>
                    </div>
                  ) : null}

                  {deferredRevisitItems.length > 0 ? (
                    <details className="mt-3 rounded-lg border border-slate-800/70 bg-slate-950/55 px-3 py-2.5">
                      <summary className="cursor-pointer list-none text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300">
                        More to reopen
                      </summary>
                      <div className="mt-3 divide-y divide-slate-800/70">
                        {deferredRevisitItems.map((item) => (
                          <article key={item.id} className="py-3 first:pt-0 last:pb-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-semibold text-slate-100">{item.label}</p>
                              <span className="rounded-full border border-slate-700/70 bg-slate-950/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-300">
                                Review
                              </span>
                            </div>
                            <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-emerald-200">Revisit now</p>
                            <p className="mt-1 text-[11px] leading-5 text-slate-200">{item.action}</p>
                            <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">Why it matters</p>
                            <p className="mt-1 text-[11px] leading-5 text-slate-400">{item.reason}</p>
                            <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-sky-200">{publicDecisionLabels.reversal}</p>
                            <p className="mt-1 text-[11px] leading-5 text-sky-100">{item.flipCondition}.</p>
                          </article>
                        ))}
                      </div>
                    </details>
                  ) : null}
                </article>
                ) : null}
              </aside>
            </div>

            <dl className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {postureSummaryCards.map((card) => (
                <div key={card.label} className={card.className}>
                  <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">{card.label}</dt>
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
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Sharing help</p>
                  <h3 className="text-sm font-semibold text-slate-100">Send this update</h3>
                  <p className="text-xs leading-5 text-slate-300">
                    Decide first. Use the leadership update above as the default wording, then pick the format the room needs.
                  </p>
                </div>
                <span className="rounded-full border border-slate-700/70 bg-slate-950/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300">
                  Ready to send
                </span>
              </div>

              <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.86fr)]">
                <div className="rounded-xl border border-slate-800/80 bg-slate-950/45 px-3 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-300">Default share</p>
                  <p className="mt-1 text-sm font-semibold text-slate-100">Leadership update</p>
                  <p className="mt-2 text-xs leading-5 text-slate-300">
                    Includes the call, action now, pause if, and change course if. Use the shorter versions only when the room already knows the recommendation.
                  </p>
                  {actions ? (
                    <div className="mt-3">
                      {actions}
                    </div>
                  ) : null}
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
