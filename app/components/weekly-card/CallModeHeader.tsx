import { publicDecisionLabels } from "../../../lib/report/reportFormatting";
import type { CallModePanelModel, CallModePanelViewModel } from "./callModePanelModel";

const driverToneClass = (direction: CallModePanelModel["driverHighlights"][number]["postureDirection"]) =>
  direction === "tightening"
    ? "weather-chip-amber"
    : direction === "opening"
      ? "weather-chip-emerald"
      : "weather-chip-slate";

export function CallModeHeader({ viewModel }: { viewModel: CallModePanelViewModel }) {
  const {
    operatingCall,
    actionNow,
    snapshotGuardrail,
    snapshotWatch,
    revisitDecisions,
    revisitQueue,
    decisionReadiness,
    tierOneHeadingClassName,
    inlineTrustLabel,
    weeklyLeadershipSummary,
    confidencePercent,
    selectedModeLabel,
    flipSupport,
    changedThisWeekDetail,
    recommendationLine,
    revisitLabel,
    revisitDetail,
    shouldShowReadinessCallout,
    trustStatusSummary,
    primaryDriver,
    supportingDrivers,
    featuredRevisitItem,
    deferredRevisitItems,
    hasSecondaryLane,
    trustChipClass,
    showModeChip,
  } = viewModel;

  return (
    <div className={`weather-brief-container grid gap-4 ${hasSecondaryLane ? "xl:grid-cols-[minmax(0,1.48fr)_minmax(15rem,0.52fr)]" : ""}`}>
      <article className="weather-stream-reveal rounded px-4 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="weather-chip weather-chip-slate">
              This week
            </span>
            <span className="weather-chip weather-chip-emerald">
              {decisionReadiness.label}
            </span>
            <span className={`weather-chip ${trustChipClass}`}>
              {inlineTrustLabel}
            </span>
          </div>
          <div className="text-right">
            <p className="type-kicker text-slate-500">
              Net delta
            </p>
            <p className="mt-1 type-data font-semibold text-slate-100">
              {weeklyLeadershipSummary.netDeltaLabel}
            </p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {showModeChip ? (
            <span className="text-fluid-xs font-medium text-slate-500">
              {selectedModeLabel}
            </span>
          ) : null}
        </div>
        <h2 className={`weather-brief-call-heading ${tierOneHeadingClassName} mt-3 max-w-4xl font-semibold text-slate-50`} style={{ fontSize: "clamp(1.35rem, 1rem + 1.4vw, 2.15rem)", lineHeight: "clamp(1.18, 1.1 + 0.3vw, 1.08)", fontFamily: "var(--weather-font-display)", textWrap: "balance" }}>
          {recommendationLine}
        </h2>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs leading-5 text-slate-200" style={{ fontVariantNumeric: "tabular-nums" }}>
          <span className="font-semibold text-slate-50">{weeklyLeadershipSummary.shorthandLine}</span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span>Boldness budget {weeklyLeadershipSummary.boldnessScore}/100</span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span>{Math.round(confidencePercent)}% confidence</span>
        </div>

        {shouldShowReadinessCallout ? (
          <p className="mt-3 rounded-lg bg-slate-950/40 px-3 py-2 text-fluid-micro leading-5 text-slate-300">
            {trustStatusSummary}
          </p>
        ) : null}

        <section className="mt-4 rounded px-3 py-2.5">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-2xl">
              <p className="type-kicker text-slate-300">
                {publicDecisionLabels.call}
              </p>
              <p className="mt-1.5 type-data font-semibold text-slate-50">{operatingCall}</p>
            </div>
            <div className="weather-surface-utility px-3 py-2 sm:max-w-[14rem]">
              <p className="type-kicker text-slate-400">Meeting shorthand</p>
              <p className="mt-1 text-xs font-semibold leading-5 text-slate-100">{weeklyLeadershipSummary.shorthandLine}</p>
            </div>
          </div>
        </section>

        <div className="mt-4 flex flex-wrap items-start gap-x-3 gap-y-1.5 max-w-3xl">
          <p className="text-fluid-micro leading-5 text-slate-400">
            <span className="font-medium text-amber-200">Changed this week:</span>{" "}
            {changedThisWeekDetail}
          </p>
          {primaryDriver ? (
            <span className={`weather-chip ${driverToneClass(primaryDriver.postureDirection)}`}>
              {primaryDriver.label} {primaryDriver.deltaLabel}
            </span>
          ) : null}
          {supportingDrivers.length > 0 ? (
            <span className="flex flex-wrap gap-1.5">
              {supportingDrivers.map((driver) => (
                <span key={`${driver.label}-${driver.deltaLabel}`} className={`weather-chip ${driverToneClass(driver.postureDirection)}`}>
                  {driver.label} {driver.deltaLabel}
                </span>
              ))}
            </span>
          ) : null}
        </div>

        <p className="sr-only">Weekly decision strip: current call, action now, pause if, and change course if.</p>

        <div className="mt-4 grid gap-3 md:grid-cols-3 lg:grid-cols-[minmax(0,1.2fr)_repeat(2,minmax(0,1fr))]">
          <div className="weather-decision-cell bg-emerald-500/6">
            <dt className="type-kicker text-emerald-200">{publicDecisionLabels.action}</dt>
            <dd className="mt-1 type-data font-semibold text-emerald-50">{actionNow}</dd>
          </div>
          <div className="weather-decision-cell bg-rose-500/6">
            <dt className="type-kicker text-rose-200">{publicDecisionLabels.threshold}</dt>
            <dd className="mt-1 type-data font-semibold text-rose-50">{snapshotGuardrail}</dd>
          </div>
          <div className="weather-decision-cell bg-sky-500/6">
            <dt className="type-kicker text-sky-200">{publicDecisionLabels.reversal}</dt>
            <dd className="mt-1 type-data font-semibold text-sky-50">{snapshotWatch}</dd>
          </div>
        </div>
      </article>

      {hasSecondaryLane ? (
          <aside className="weather-brief-secondary-lane space-y-3 xl:pt-1">
            <article className="weather-stream-reveal weather-stream-reveal--medium rounded px-3 py-3 text-slate-100">
            <div className="flex items-center justify-between gap-3">
              <p className="text-fluid-xs font-medium text-slate-300">Revisit this week</p>
              {revisitQueue.length > 0 ? (
                <span className="weather-chip weather-chip-slate">
                  {revisitQueue.length} decisions
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-100">
              {revisitDecisions ? revisitLabel : "Nothing major needs revisiting right now. Keep the main action moving."}
            </p>
            {revisitDetail ? <p className="mt-1 text-xs leading-5 text-slate-400">{revisitDetail}</p> : null}
            {flipSupport.length > 0 ? (
              <div className="mt-3 rounded-lg bg-slate-950/30 px-3 py-3">
                <p className="type-kicker text-slate-400">Flip triggers</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {flipSupport.map((label) => (
                    <span key={label} className="weather-chip weather-chip-slate">
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {featuredRevisitItem ? (
              <div className="mt-4 pt-3">
                <article className="rounded-lg bg-slate-950/40 px-3 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-fluid-xs font-medium text-slate-300">Start with</p>
                      <p className="mt-1 text-sm font-semibold text-slate-100">{featuredRevisitItem.label}</p>
                    </div>
                    <span className="weather-chip weather-chip-emerald">
                      Revisit now
                    </span>
                  </div>
                  <p className="mt-3 text-fluid-xs leading-5 text-slate-200">{featuredRevisitItem.action}</p>
                  <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <dt className="text-fluid-xs font-medium text-slate-400">Why it matters</dt>
                      <dd className="mt-1 text-fluid-xs leading-5 text-slate-400">{featuredRevisitItem.reason}</dd>
                    </div>
                    <div>
                      <dt className="text-fluid-xs font-medium text-slate-300">{publicDecisionLabels.reversal}</dt>
                      <dd className="mt-1 text-fluid-xs leading-5 text-slate-200">{featuredRevisitItem.flipCondition}.</dd>
                    </div>
                  </dl>
                </article>
              </div>
            ) : null}

            {deferredRevisitItems.length > 0 ? (
              <details className="weather-auto-chevron mt-3 rounded-lg bg-slate-950/35 px-3 py-2.5">
                <summary className="cursor-pointer list-none text-fluid-xs font-medium text-slate-300">
                  More to revisit
                </summary>
                <div className="mt-3 divide-y divide-slate-800/70">
                  {deferredRevisitItems.map((item) => (
                    <article key={item.id} className="py-3 first:pt-0 last:pb-0">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-semibold text-slate-100">{item.label}</p>
                        <span className="weather-chip weather-chip-emerald">
                          Revisit now
                        </span>
                      </div>
                      <p className="mt-2 text-fluid-xs leading-5 text-slate-200">{item.action}</p>
                      <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                        <div>
                          <dt className="text-fluid-xs font-medium text-slate-400">Why it matters</dt>
                          <dd className="mt-1 text-fluid-xs leading-5 text-slate-400">{item.reason}</dd>
                        </div>
                        <div>
                          <dt className="text-fluid-xs font-medium text-slate-300">{publicDecisionLabels.reversal}</dt>
                          <dd className="mt-1 text-fluid-xs leading-5 text-slate-200">{item.flipCondition}.</dd>
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
  );
}
