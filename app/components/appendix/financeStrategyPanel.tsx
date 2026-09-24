import { insightDatabase } from "../../../data/recommendations";
import type { RegimeAssessment } from "../../../lib/regimeEngine";
import { Details } from "../details";
import { DataProvenanceStrip, type DataProvenance } from "../dataProvenanceStrip";

export const FinanceStrategyPanel = ({
  regime,
  provenance,
  showProvenance = true,
}: {
  regime: RegimeAssessment["regime"];
  provenance: DataProvenance;
  showProvenance?: boolean;
}) => {
  const financeMode = insightDatabase.financeStrategyMode;
  const entry = financeMode.regimes.find((item) => item.key === regime);

  return (
    <section id="finance-strategy" aria-labelledby="finance-strategy-title" className="mt-10">
      <div className="weather-panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="type-label text-slate-400">Finance strategy</p>
            <h3 id="finance-strategy-title" className="type-section text-slate-100">
              {financeMode.title}
            </h3>
            <p className="mt-2 type-data text-slate-300">{financeMode.subtitle}</p>
            <p className="mt-2 text-sm text-slate-400">{financeMode.description}</p>
          </div>
          {showProvenance ? <DataProvenanceStrip provenance={provenance} /> : null}
        </div>
        <div className="mt-4 weather-surface p-4">
          <p className="text-xs font-semibold text-slate-400">
            Executive summary
          </p>
          <p className="mt-2 text-sm text-slate-200">
            {entry?.runwayPosture ?? "The runway plan updates when data refreshes."}
          </p>
        </div>
        <Details
          summary={<span className="text-xs font-semibold text-slate-300">Deep dive: runway guidance and watchlist</span>}
          className="mt-4"
        >
          <div className="grid gap-4 lg:grid-cols-[1.1fr,0.9fr]">
          <div className="weather-surface p-4">
            <p className="text-xs font-semibold text-slate-400">
              Runway plan
            </p>
            <p className="mt-3 text-sm text-slate-200">{entry?.runwayPosture}</p>
            <div className="mt-4 grid gap-3 text-sm text-slate-300">
              <div>
                <p className="text-xs font-semibold text-slate-400">
                  Hiring throttle
                </p>
                <p className="mt-2">{entry?.hiringThrottle}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400">
                  Budget focus
                </p>
                <ul className="mt-2 space-y-1">
                  {(entry?.budgetFocus ?? []).map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="text-slate-400">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
          <div className="weather-surface p-4">
            <p className="text-xs font-semibold text-slate-400">
              Watch these signals
            </p>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">
              {(entry?.watchSignals ?? []).map((signal) => (
                <li key={signal} className="flex gap-2">
                  <span className="text-slate-400">•</span>
                  <span>{signal}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-slate-300">
              Public data only. No internal finance inputs required.
            </p>
          </div>
          </div>
        </Details>
      </div>
    </section>
  );
};
