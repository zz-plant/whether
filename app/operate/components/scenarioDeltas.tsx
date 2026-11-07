import { useMemo, useState } from "react";
import { getRegimePublicLabel } from "../../../lib/regimePresentation";
import type { RegimeAssessment } from "../../../lib/regimeEngine";
import { getPlaybookGuidance } from "../../../lib/playbook";
import { Tag } from "../../components/ui/tag";
import { ScoreLadder, buildLadderLines } from "../../components/ui/scoreLadder";
import { DECISION_CONTRACT_LABELS } from "../../../lib/report/reportCopy";
import { ruleMetricLabel } from "../../../lib/report/boundedDecisionRules";
import { buildScenarioLadderLines, formatScenarioDelta } from "../../../lib/report/scenarioStudio";
import { businessAreaOwner } from "../../../lib/report/decisionKnobs";

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
  livePlaybook: propLivePlaybook,
  tightnessDelta,
  riskAppetiteDelta,
  onScrubTightness,
  onScrubRiskAppetite,
}: {
  liveAssessment: RegimeAssessment;
  simulatedAssessment: RegimeAssessment;
  simulatedPlaybook: ReturnType<typeof getPlaybookGuidance>;
  livePlaybook?: ReturnType<typeof getPlaybookGuidance>;
  /** Computed once by the simulator, so the copied brief and this panel cannot disagree. */
  tightnessDelta: number;
  riskAppetiteDelta: number;
  onScrubTightness?: (nextTightness: number) => void;
  onScrubRiskAppetite?: (nextRiskAppetite: number) => void;
}) {
  const livePlaybook = useMemo(
    () =>
      propLivePlaybook ??
      getPlaybookGuidance(liveAssessment.regime, {
        scores: liveAssessment.scores,
        thresholds: liveAssessment.thresholds,
      }),
    [propLivePlaybook, liveAssessment],
  );

  const regimeShifted = simulatedAssessment.regime !== liveAssessment.regime;
  /* The scenario's own lines: where its call would change, and the pause and
     restart lines its rules state. This week's reading is the hollow dot. */
  const ladderLines = buildScenarioLadderLines(simulatedAssessment);

  const liveStopSet = useMemo(() => new Set(livePlaybook.stopItems), [livePlaybook.stopItems]);
  const liveStartSet = useMemo(() => new Set(livePlaybook.startItems), [livePlaybook.startItems]);

  const liveLeverByArea = useMemo(
    () => new Map(livePlaybook.operatingLevers.map((lever) => [lever.lever, lever])),
    [livePlaybook],
  );

  const leverComparisons = useMemo(() => {
    return simulatedPlaybook.operatingLevers.map((simLever) => {
      const liveLever = liveLeverByArea.get(simLever.lever);
      const actionFlipped = Boolean(liveLever && liveLever.actionNow !== simLever.actionNow);
      const pauseLineChanged = Boolean(liveLever && liveLever.triggerThreshold !== simLever.triggerThreshold);
      const restartLineChanged = Boolean(liveLever && liveLever.reversalCondition !== simLever.reversalCondition);
      const owner = businessAreaOwner[simLever.lever] ?? "Owner";

      return {
        ...simLever,
        owner,
        liveActionNow: liveLever?.actionNow,
        liveTriggerThreshold: liveLever?.triggerThreshold,
        liveReversalCondition: liveLever?.reversalCondition,
        actionFlipped,
        pauseLineChanged,
        restartLineChanged,
      };
    });
  }, [simulatedPlaybook.operatingLevers, liveLeverByArea]);

  const flippedLevers = useMemo(
    () => leverComparisons.filter((lever) => lever.actionFlipped),
    [leverComparisons],
  );

  const [filterFlippedOnly, setFilterFlippedOnly] = useState(false);
  const [showRestartLines, setShowRestartLines] = useState(false);

  const displayedLevers = filterFlippedOnly && flippedLevers.length > 0 ? flippedLevers : leverComparisons;

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
          <p className="text-fluid-nano text-slate-400">
            {regimeShifted ? "Conditions would change" : "Same conditions as this week"}
          </p>
        </div>

        {/* Two ladders, one drawing: the scenario's score as the dot, this
            week's as the hollow one, the three lines labelled. The tiles this
            replaces printed "79 / 100" with the line nowhere on the page. */}
        <div className="weather-switch gap-6 [--col-min:18rem]">
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
            onScrubValue={onScrubTightness}
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
            onScrubValue={onScrubRiskAppetite}
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

        {/* Two lists with the colour on their names */}
        <div className="weather-switch gap-x-8 gap-y-6 [--col-min:14rem]">
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-semantic-tightening-fg">What to stop in this scenario</h4>
            <ul className="space-y-2.5 text-xs text-slate-300">
              {simulatedPlaybook.stopItems.map((item, idx) => {
                const isNew = !liveStopSet.has(item);
                return (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" aria-hidden="true" />
                    <div className="space-y-0.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={isNew ? "text-slate-100 font-medium" : "text-slate-300"}>{item}</span>
                        {isNew ? <Tag tone="amber">Added in scenario</Tag> : null}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-semantic-easing-fg">What to start in this scenario</h4>
            <ul className="space-y-2.5 text-xs text-slate-300">
              {simulatedPlaybook.startItems.map((item, idx) => {
                const isNew = !liveStartSet.has(item);
                return (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" aria-hidden="true" />
                    <div className="space-y-0.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={isNew ? "text-slate-100 font-medium" : "text-slate-300"}>{item}</span>
                        {isNew ? <Tag tone="emerald">Unblocks in scenario</Tag> : null}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Operating Levers Matrix */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="type-eyebrow text-slate-400">
                Rules by area in this scenario
              </h4>
              <p className="mt-0.5 text-xs text-slate-300">
                {flippedLevers.length === 0
                  ? "All 5 areas steady with this week's plan"
                  : `${flippedLevers.length} of 5 operating rules flip in this scenario`}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {flippedLevers.length > 0 && flippedLevers.length < leverComparisons.length ? (
                <fieldset className="m-0 flex items-center gap-1.5 border-0 p-0">
                  <legend className="sr-only">Filter rules by change</legend>
                  <button
                    type="button"
                    aria-pressed={!filterFlippedOnly}
                    onClick={() => setFilterFlippedOnly(false)}
                    className={`weather-button inline-flex min-h-[44px] items-center px-3 py-1 text-xs font-semibold ${
                      !filterFlippedOnly ? "!border-slate-500 !bg-slate-800 text-slate-100" : "text-slate-400"
                    }`}
                  >
                    All areas (5)
                  </button>
                  <button
                    type="button"
                    aria-pressed={filterFlippedOnly}
                    onClick={() => setFilterFlippedOnly(true)}
                    className={`weather-button inline-flex min-h-[44px] items-center px-3 py-1 text-xs font-semibold ${
                      filterFlippedOnly ? "!border-amber-400/50 !bg-amber-400/10 text-amber-200" : "text-slate-400"
                    }`}
                  >
                    Flipped only ({flippedLevers.length})
                  </button>
                </fieldset>
              ) : null}

              <button
                type="button"
                aria-expanded={showRestartLines}
                onClick={() => setShowRestartLines((prev) => !prev)}
                className="weather-button inline-flex min-h-[44px] items-center px-3 py-1 text-xs font-semibold text-slate-300"
              >
                {showRestartLines ? "Hide restart lines" : `Show ${DECISION_CONTRACT_LABELS.slot.reversal.toLowerCase()}s`}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto overscroll-x-contain">
            <table className="w-full text-left text-xs text-slate-300 border-collapse">
              <caption className="sr-only">Operating rules by business area comparing this week and this scenario</caption>
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-medium">
                  <th scope="col" className="py-2.5 pr-3 w-1/5">Area</th>
                  <th scope="col" className="py-2.5 pr-3 w-2/5">{DECISION_CONTRACT_LABELS.action.actionNow}</th>
                  <th scope="col" className="py-2.5 pr-3 w-2/5">{DECISION_CONTRACT_LABELS.threshold.pauseIf}</th>
                  {showRestartLines ? (
                    <th scope="col" className="py-2.5 pr-3 w-1/4 text-emerald-400/90">{DECISION_CONTRACT_LABELS.slot.reversal}</th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {displayedLevers.map((lever) => (
                  <tr key={lever.lever} className="border-b border-slate-800/50 last:border-0 align-top">
                    <td className="py-3 pr-3">
                      <div className="font-semibold text-slate-200">{lever.label}</div>
                      <div className="text-slate-400 text-fluid-nano mt-0.5">{lever.owner}</div>
                    </td>
                    <td className="py-3 pr-3 leading-relaxed">
                      {lever.actionFlipped ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <Tag tone="amber">Rule flips</Tag>
                          </div>
                          <div className="font-medium text-slate-100">{lever.actionNow}</div>
                          {lever.liveActionNow ? (
                            <div className="text-slate-400 text-fluid-nano line-through leading-normal">
                              This week: {lever.liveActionNow}
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <div>
                          <div className="text-slate-300">{lever.actionNow}</div>
                          <div className="text-slate-400 text-fluid-nano mt-0.5">Steady with this week</div>
                        </div>
                      )}
                    </td>
                    <td className="py-3 pr-3 text-amber-200/90 leading-relaxed">
                      <div>{lever.triggerThreshold}</div>
                      {lever.pauseLineChanged && lever.liveTriggerThreshold ? (
                        <div className="text-slate-400 text-fluid-nano line-through leading-normal mt-1">
                          This week: {lever.liveTriggerThreshold}
                        </div>
                      ) : null}
                    </td>
                    {showRestartLines ? (
                      <td className="py-3 pr-3 text-emerald-200/90 leading-relaxed">
                        <div>{lever.reversalCondition}</div>
                        {lever.restartLineChanged && lever.liveReversalCondition ? (
                          <div className="text-slate-400 text-fluid-nano line-through leading-normal mt-1">
                            This week: {lever.liveReversalCondition}
                          </div>
                        ) : null}
                      </td>
                    ) : null}
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
