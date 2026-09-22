import { getRegimePublicLabel } from "../../../lib/regimePresentation";
import type { RegimeAssessment } from "../../../lib/regimeEngine";
import type { getPlaybookGuidance } from "../../../lib/playbook";
import { Tag } from "../../components/ui/tag";
import { DECISION_CONTRACT_LABELS } from "../../../lib/report/reportCopy";
import { ruleMetricLabel } from "../../../lib/report/boundedDecisionRules";
import { formatScenarioDelta } from "../../../lib/report/scenarioStudio";

export function ScenarioDeltas({
  liveAssessment,
  simulatedAssessment,
  simulatedPlaybook,
  tightnessDelta,
  riskAppetiteDelta,
}: {
  liveAssessment: RegimeAssessment;
  simulatedAssessment: RegimeAssessment;
  simulatedPlaybook: ReturnType<typeof getPlaybookGuidance>;
  /** Computed once by the simulator, so the copied brief and this panel cannot disagree. */
  tightnessDelta: number;
  riskAppetiteDelta: number;
}) {
  const regimeShifted = simulatedAssessment.regime !== liveAssessment.regime;

  return (
    <>
      {/* Side-by-Side Then-vs-Now / Live vs Simulated Delta Panel */}
      <section aria-labelledby="deltas-heading" className="weather-panel p-6 space-y-5">
        <h3 id="deltas-heading" className="type-eyebrow">
          This week vs. this scenario
        </h3>

        <div className="grid gap-4 sm:grid-cols-3">
          {/* Regime Shift Card */}
          <div className="weather-surface p-4 flex flex-col justify-between">
            <p className="type-eyebrow text-slate-400">Conditions</p>
            <div className="mt-3 flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-400 line-through">
                {getRegimePublicLabel(liveAssessment.regime)}
              </span>
              <span className="text-slate-500">→</span>
              <Tag tone={regimeShifted ? "sky" : "slate"}>
                {getRegimePublicLabel(simulatedAssessment.regime)}
              </Tag>
            </div>
            <p className="mt-2 text-[11px] text-slate-400">
              {regimeShifted ? "The call would change" : "Same call as this week"}
            </p>
          </div>

          {/* Funding Pressure Card */}
          <div className="weather-surface p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <p className="type-eyebrow text-slate-400">{ruleMetricLabel.tightness}</p>
              <span
                className={`text-xs font-semibold tabular-nums ${
                  tightnessDelta > 0
                    ? "text-rose-400"
                    : tightnessDelta < 0
                    ? "text-emerald-400"
                    : "text-slate-400"
                }`}
              >
                {formatScenarioDelta(tightnessDelta, " pts")}
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2 tabular-nums">
              <span className="text-2xl font-bold text-slate-100">
                {simulatedAssessment.scores.tightness}
              </span>
              <span className="text-xs text-slate-400">/ 100</span>
              {simulatedAssessment.scores.tightnessSaturated && (
                <span className="text-[10px] text-amber-300">· ceiling</span>
              )}
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              This week: {liveAssessment.scores.tightness}
            </p>
          </div>

          {/* Risk Appetite Card */}
          <div className="weather-surface p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <p className="type-eyebrow text-slate-400">{ruleMetricLabel.riskAppetite}</p>
              <span
                className={`text-xs font-semibold tabular-nums ${
                  riskAppetiteDelta > 0
                    ? "text-emerald-400"
                    : riskAppetiteDelta < 0
                    ? "text-rose-400"
                    : "text-slate-400"
                }`}
              >
                {formatScenarioDelta(riskAppetiteDelta, " pts")}
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2 tabular-nums">
              <span className="text-2xl font-bold text-slate-100">
                {simulatedAssessment.scores.riskAppetite}
              </span>
              <span className="text-xs text-slate-400">/ 100</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              This week: {liveAssessment.scores.riskAppetite}
            </p>
          </div>
        </div>
      </section>

      {/* Simulated Operating Mandate & Playbook Deltas */}
      <section aria-labelledby="playbook-deltas-heading" className="weather-panel p-6 space-y-6">
        <div>
          <h3 id="playbook-deltas-heading" className="type-section text-slate-100">
            What you&apos;d stop and start in this scenario
          </h3>
        </div>

        {simulatedPlaybook.playbook && (
          <div className="weather-surface p-4 border-l-4 border-sky-400">
            <p className="type-eyebrow text-sky-200">The call in this scenario</p>
            <p className="mt-1 text-base font-semibold text-slate-100">
              &quot;{simulatedPlaybook.playbook.mandate}&quot;
            </p>
            <p className="mt-1 text-xs text-slate-300">
              Tone: {simulatedPlaybook.playbook.tone} · {simulatedPlaybook.playbook.insight}
            </p>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {/* Stop Items */}
          <div className="weather-surface p-5 space-y-3">
            <h4 className="type-eyebrow text-rose-300">What to STOP in this scenario</h4>
            <ul className="list-disc space-y-2 pl-4 text-xs text-slate-300">
              {simulatedPlaybook.stopItems.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>

          {/* Start Items */}
          <div className="weather-surface p-5 space-y-3">
            <h4 className="type-eyebrow text-emerald-300">What to START in this scenario</h4>
            <ul className="list-disc space-y-2 pl-4 text-xs text-slate-300">
              {simulatedPlaybook.startItems.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Operating Levers Table */}
        <div className="space-y-3">
          <h4 className="type-eyebrow text-slate-400">
            Rules by area in this scenario
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300 border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-medium">
                  <th scope="col" className="py-2 pr-3 w-1/5">Area</th>
                  <th scope="col" className="py-2 pr-3 w-2/5">{DECISION_CONTRACT_LABELS.action.actionNow}</th>
                  <th scope="col" className="py-2 pr-3 w-2/5">{DECISION_CONTRACT_LABELS.threshold.pauseIf}</th>
                </tr>
              </thead>
              <tbody>
                {simulatedPlaybook.operatingLevers.map((lever) => (
                  <tr key={lever.lever} className="border-b border-slate-800/50 last:border-0">
                    <td className="py-2.5 pr-3 font-semibold text-slate-200">
                      {lever.label}
                    </td>
                    <td className="py-2.5 pr-3 text-slate-300 leading-relaxed">
                      {lever.actionNow}
                    </td>
                    <td className="py-2.5 pr-3 text-amber-200/90 leading-relaxed">
                      {lever.triggerThreshold}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  );
}
