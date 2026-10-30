import { getRegimePublicLabel } from "../../../lib/regimePresentation";
import type { RegimeAssessment } from "../../../lib/regimeEngine";
import type { getPlaybookGuidance } from "../../../lib/playbook";
import { Tag } from "../../components/ui/tag";
import { ScoreLadder, buildLadderLines } from "../../components/ui/scoreLadder";
import { DECISION_CONTRACT_LABELS } from "../../../lib/report/reportCopy";
import { ruleMetricLabel } from "../../../lib/report/boundedDecisionRules";
import { buildScenarioLadderLines, formatScenarioDelta } from "../../../lib/report/scenarioStudio";

/* Warm for a move toward trouble, cool for a move away from it: pressure
   rising is the bad direction, appetite rising is the good one. */
const deltaClassName = (delta: number, worseWhenUp: boolean) => {
  if (delta === 0) return "text-slate-400";
  const worse = worseWhenUp ? delta > 0 : delta < 0;
  return worse ? "text-rose-400" : "text-emerald-400";
};

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
  /* The scenario's own lines: where its call would change, and the pause and
     restart lines its rules state. This week's reading is the hollow dot. */
  const ladderLines = buildScenarioLadderLines(simulatedAssessment);

  return (
    <>
      <section aria-labelledby="deltas-heading" className="weather-panel p-6 space-y-5">
        <h3 id="deltas-heading" className="type-eyebrow">
          This week vs. this scenario
        </h3>

        <div className="flex flex-wrap items-center gap-3">
          <p className="type-eyebrow text-slate-400">Conditions</p>
          <span className="text-xs font-semibold text-slate-400 line-through">
            {getRegimePublicLabel(liveAssessment.regime)}
          </span>
          <span className="text-slate-500">→</span>
          <Tag regime={simulatedAssessment.regime}>
            {getRegimePublicLabel(simulatedAssessment.regime)}
          </Tag>
          <p className="text-[11px] text-slate-400">
            {regimeShifted ? "Conditions would change" : "Same conditions as this week"}
          </p>
        </div>

        {/* Two ladders, one drawing: the scenario's score as the dot, this
            week's as the hollow one, the three lines labelled. The tiles this
            replaces printed "79 / 100" with the line nowhere on the page. */}
        <div className="grid gap-6 sm:grid-cols-2">
          <ScoreLadder
            label={
              <>
                {ruleMetricLabel.tightness}{" "}
                <span className={`tabular-nums ${deltaClassName(tightnessDelta, true)}`}>
                  {formatScenarioDelta(tightnessDelta, " pts")} vs this week
                </span>
                {simulatedAssessment.scores.tightnessSaturated ? (
                  <span className="text-fluid-nano text-amber-300"> · at the top of the scale</span>
                ) : null}
              </>
            }
            value={simulatedAssessment.scores.tightness}
            previous={liveAssessment.scores.tightness}
            previousLabel="This week"
            lines={buildLadderLines(ladderLines.tightness)}
          />
          <ScoreLadder
            label={
              <>
                {ruleMetricLabel.riskAppetite}{" "}
                <span className={`tabular-nums ${deltaClassName(riskAppetiteDelta, false)}`}>
                  {formatScenarioDelta(riskAppetiteDelta, " pts")} vs this week
                </span>
              </>
            }
            value={simulatedAssessment.scores.riskAppetite}
            previous={liveAssessment.scores.riskAppetite}
            previousLabel="This week"
            lines={buildLadderLines(ladderLines.riskAppetite)}
          />
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
          <div className="weather-surface p-4">
            <p className="type-eyebrow">Guidance in this scenario</p>
            <p className="mt-1 text-base font-semibold text-slate-100">
              &quot;{simulatedPlaybook.playbook.mandate}&quot;
            </p>
            <p className="mt-1 text-xs text-slate-300">
              Tone: {simulatedPlaybook.playbook.tone} · {simulatedPlaybook.playbook.insight}
            </p>
          </div>
        )}

        {/* Two plain lists with the colour on their names, like Decide's Stop and
            Start lists (2026-10-09); each was a card with a capitalised verb. */}
        <div className="grid gap-6 md:grid-cols-2 md:gap-8">
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-semantic-tightening-fg">What to stop in this scenario</h4>
            <ul className="list-disc space-y-2 pl-4 text-xs text-slate-300">
              {simulatedPlaybook.stopItems.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-semantic-easing-fg">What to start in this scenario</h4>
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
