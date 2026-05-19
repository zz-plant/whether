import type { WeeklyDecisionCardViewModel } from "../../../lib/report/homeBriefModel";
import { formatDateUTC } from "../../../lib/formatters";
import { PostureHistoryTimeline } from "./HistorySection";
import { YearAgoComparator } from "./YearAgoComparator";
import { compactInset, disclosureSummaryClass, tierThreeHeading } from "./shared";

type WeeklyDecisionCardModel =
  & WeeklyDecisionCardViewModel["status"]
  & WeeklyDecisionCardViewModel["decision"]
  & NonNullable<WeeklyDecisionCardViewModel["presentation"]>
  & WeeklyDecisionCardViewModel["diagnostics"]
  & WeeklyDecisionCardViewModel["history"]
  & WeeklyDecisionCardViewModel["artifact"];

export type MoreContextDisclosureProps = {
  startupClimateIndex: WeeklyDecisionCardModel["startupClimateIndex"];
  evidenceItems: WeeklyDecisionCardModel["evidenceItems"];
  whyThisCall: WeeklyDecisionCardModel["whyThisCall"];
  memoryRail: WeeklyDecisionCardModel["memoryRail"];
  historicalTimeline: WeeklyDecisionCardModel["historicalTimeline"];
  historicalAnalogs: WeeklyDecisionCardModel["historicalAnalogs"];
  lastYearComparison: WeeklyDecisionCardModel["lastYearComparison"];
  macroOverlay: WeeklyDecisionCardModel["macroOverlay"];
};

export function MoreContextDisclosureBody({
  startupClimateIndex,
  evidenceItems,
  whyThisCall,
  memoryRail,
  historicalTimeline,
  historicalAnalogs,
  lastYearComparison,
  macroOverlay,
}: MoreContextDisclosureProps) {
  return (
    <div className="space-y-2.5">
      <details className="group rounded-lg border border-slate-800/45 bg-slate-950/38 px-2.5 py-2">
        <summary className={`${disclosureSummaryClass} cursor-pointer list-none`}>
          <span>Confidence &amp; context</span>
          <span
            aria-hidden="true"
            className="weather-disclosure-trigger-indicator text-sm group-open:rotate-180"
          >
            ▾
          </span>
        </summary>
        <div className="weather-disclosure-panel animate-collapsible-in mt-2 space-y-3">
          <section aria-labelledby="why-this-posture-call">
            <h3 id="why-this-posture-call" className={tierThreeHeading}>
              Why this posture call
            </h3>
            <ul className="mt-1.5 grid gap-1.5 sm:grid-cols-3">
              {whyThisCall.map((reason) => (
                <li key={reason.label} className={`${compactInset} text-xs text-slate-200`}>
                  <p className="font-semibold text-slate-300">{reason.label}</p>
                  <p className="mt-1 leading-5 text-slate-300">{reason.detail}</p>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="evidence-snapshot">
            <h3 id="evidence-snapshot" className={tierThreeHeading}>
              Evidence snapshot
            </h3>
            <ul className="mt-1.5 grid gap-2 lg:grid-cols-3">
              {evidenceItems.map((item) => (
                <li key={item.key} className={`${compactInset} space-y-1.5 text-xs text-slate-200`}>
                  <p className="font-semibold text-slate-100">{item.title}</p>
                  <p className="text-fluid-xs text-slate-400">
                    Updated {item.lastUpdated ? formatDateUTC(item.lastUpdated) : "—"}
                  </p>
                  <ul className="space-y-1 text-fluid-xs text-slate-300">
                    {item.supportingBullets.slice(0, 3).map((bullet) => (
                      <li key={`${item.key}-${bullet}`}>• {bullet}</li>
                    ))}
                  </ul>
                  <p className="text-fluid-xs text-slate-300">
                    <span className="font-semibold text-slate-200">Confidence:</span>{" "}
                    {item.confidenceLabel}
                  </p>
                  <p className="text-fluid-xs text-slate-300">
                    <span className="font-semibold text-slate-200">Direction:</span>{" "}
                    {item.directionLabel}
                  </p>
                  <p className="text-fluid-xs text-slate-300">
                    <span className="font-semibold text-slate-200">Immediate implication:</span>{" "}
                    {item.immediateImplication}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <details className="group rounded-lg border-l-2 border-slate-700/50 bg-slate-950/25 px-2.5 py-2">
            <summary className={`${disclosureSummaryClass} cursor-pointer list-none text-slate-400`}>
              <span>Additional context</span>
              <span aria-hidden="true" className="weather-disclosure-trigger-indicator text-sm group-open:rotate-180">▾</span>
            </summary>
            <div className="weather-disclosure-panel animate-collapsible-in mt-2 space-y-3">
              <section aria-labelledby="startup-climate-index-context">
                <h3 id="startup-climate-index-context" className={tierThreeHeading}>
                  Startup Climate Index (context)
                </h3>
                <p className="mt-1.5 text-xs text-slate-300">
                  Context metric for continuity: {startupClimateIndex.score} / 100 ·{" "}
                  {startupClimateIndex.status}
                </p>
                <ul className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
                  {startupClimateIndex.breakdown.map((item) => (
                    <li key={item.label} className="space-y-1 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span>{item.label}</span>
                        <span className="font-semibold text-slate-100">{item.score}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-800">
                        <div className="h-1.5 w-full origin-left rounded-full bg-sky-300/70" style={{ transform: `scaleX(${Math.max(0.05, Math.min(1, item.score / 100))})` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              </section>

              <section aria-labelledby="posture-history-and-overlays">
                <h3 id="posture-history-and-overlays" className={tierThreeHeading}>
                  Posture history and overlays
                </h3>
                <div className="mt-1.5 space-y-2">
                  <PostureHistoryTimeline historicalTimeline={historicalTimeline} />
                  {lastYearComparison ? <YearAgoComparator comparison={lastYearComparison} /> : null}
                  {historicalAnalogs.length > 0 ? (
                    <div>
                      <p className={tierThreeHeading}>Closest historical analogs</p>
                      <ul className="mt-1.5 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                        {historicalAnalogs.map((analog) => (
                          <li key={`${analog.date}-${analog.similarityScore}`} className={`${compactInset} text-xs text-slate-200`}>
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-semibold text-slate-100">{formatDateUTC(analog.date)}</p>
                              <span className="rounded-full border border-slate-700/70 bg-slate-950/70 px-2 py-0.5 text-fluid-micro font-semibold uppercase tracking-[0.08em] text-slate-300">
                                {Math.round(analog.similarityScore * 100)}% match
                              </span>
                            </div>
                            <p className="mt-1 leading-5 text-slate-300">{analog.implication}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  <div>
                    <p className={tierThreeHeading}>Historical memory rail</p>
                    <ul className="mt-1.5 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-4">
                      {memoryRail.map((item) => (
                        <li key={`${item.label}-${item.posture}`} className={`${compactInset} text-xs text-slate-200`}>
                          <p className="text-slate-400">{item.label}</p>
                          <p className="mt-1 font-semibold text-slate-100">{item.posture}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <ul className="grid gap-1.5 text-xs text-slate-300 sm:grid-cols-2 lg:grid-cols-4">
                    {macroOverlay.map((item) => (
                      <li key={item.label} className={compactInset}>
                        <p className="font-semibold text-slate-200">{item.label}</p>
                        <p className="mt-1 leading-5 text-slate-300">{item.detail}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            </div>
          </details>
        </div>
      </details>
    </div>
  );
}
