import type { RegimeAssessment } from "../../../lib/regimeEngine";
import { DataProvenanceStrip, type DataProvenance } from "../dataProvenanceStrip";
import { getRegimeBadge, getRegimeLabel } from "../reportSectionUtils";

export const RegimeSummaryPanel = ({
  assessment,
  provenance,
}: {
  assessment: RegimeAssessment;
  provenance: DataProvenance;
}) => {
  const regimeLabel = getRegimeLabel(assessment.regime);
  const regimeBadge = getRegimeBadge(assessment.regime);
  const tightnessStatus =
    assessment.scores.tightness > assessment.thresholds.tightnessRegime ? "tight" : "loose";
  const riskStatus =
    assessment.scores.riskAppetite > assessment.thresholds.riskAppetiteRegime
      ? "open"
      : "cautious";
  const narrative = `Cash availability is ${tightnessStatus} and risk appetite is ${riskStatus}. ${assessment.description}`;
  const constraintHighlights = assessment.constraints.slice(0, 3);

  return (
    <section id="regime-summary" aria-labelledby="regime-summary-title" className="mt-10">
      <div className="weather-panel p-6">
        <div>
          <p className="type-label text-slate-400">Capital posture summary</p>
          <h3 id="regime-summary-title" className="type-section text-slate-100">
            Plain-English market readout
          </h3>
          <p className="mt-2 type-data text-slate-300">
            A direct interpretation of Treasury signals into the posture you should operate under
            this week.
          </p>
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr,0.9fr]">
          <div className="space-y-4">
            <div className="weather-surface bg-gradient-to-br from-slate-950 via-slate-900/80 to-slate-950 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span
                  className={`inline-flex min-h-[44px] items-center rounded-full border px-3 py-1 text-xs font-semibold tracking-[0.12em] ${regimeBadge?.classes ?? "border-slate-600/60 bg-slate-500/10 text-slate-100"}`}
                >
                  {regimeBadge?.label ?? assessment.regime}
                </span>
                <DataProvenanceStrip provenance={provenance} label="Treasury source" />
              </div>
              <p className="mt-3 text-sm text-slate-200">{narrative}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-md border border-slate-800/80 bg-slate-950/70 p-3">
                  <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
                    Cash availability
                  </p>
                  <p className="mono mt-2 text-lg text-slate-100">
                    {assessment.scores.tightness}/100
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Threshold {assessment.thresholds.tightnessRegime}
                  </p>
                </div>
                <div className="rounded-md border border-slate-800/80 bg-slate-950/70 p-3">
                  <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
                    Risk appetite
                  </p>
                  <p className="mono mt-2 text-lg text-slate-100">
                    {assessment.scores.riskAppetite}/100
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Threshold {assessment.thresholds.riskAppetiteRegime}
                  </p>
                </div>
              </div>
              <p className="mt-4 text-xs text-slate-400">
                Regime label: <span className="text-slate-200">{regimeLabel}</span>
              </p>
            </div>
            <div className="weather-surface p-4">
              <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
                Operational consequences
              </p>
              <p className="mt-3 text-sm text-slate-200">
                Use these guardrails to align product, engineering, and GTM planning.
              </p>
              <ul className="mt-4 space-y-3 text-sm text-slate-300">
                {assessment.constraints.map((constraint) => (
                  <li key={constraint} className="flex gap-2">
                    <span className="text-slate-400">•</span>
                    <span className="break-words">{constraint}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="space-y-4">
            <div className="weather-surface p-4">
              <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
                Regime highlights
              </p>
              <p className="mt-3 text-sm text-slate-200">
                This regime is defined by the tightness and risk scores above. Use these highlights
                to anchor leadership conversations.
              </p>
              <ul className="mt-4 space-y-3 text-sm text-slate-300">
                {constraintHighlights.map((constraint) => (
                  <li key={constraint} className="flex gap-2">
                    <span className="text-slate-400">•</span>
                    <span className="break-words">{constraint}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="weather-surface p-4">
              <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
                Decision signals
              </p>
              <p className="mt-3 text-sm text-slate-200">
                Translate the scores into how you run next-week approvals.
              </p>
              <div className="mt-4 space-y-3 text-sm text-slate-300">
                <div className="rounded-lg border border-slate-800/80 bg-slate-950/60 p-3">
                  <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
                    Funding posture
                  </p>
                  <p className="mt-2 text-sm text-slate-200">
                    {tightnessStatus === "tight"
                      ? "Cap spend increases; require hard ROI evidence on any new headcount."
                      : "Keep growth spend, but insist on payback clarity and runway updates."}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-800/80 bg-slate-950/60 p-3">
                  <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
                    Risk posture
                  </p>
                  <p className="mt-2 text-sm text-slate-200">
                    {riskStatus === "open"
                      ? "Greenlight growth experiments with guardrails and explicit exit points."
                      : "Favor reliability bets and retention improvements over new launches."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
