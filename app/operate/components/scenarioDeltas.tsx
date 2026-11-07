import { useMemo, useState, type ReactNode } from "react";
import { getRegimePublicLabel } from "../../../lib/regimePresentation";
import type { RegimeAssessment } from "../../../lib/regimeEngine";
import { getPlaybookGuidance } from "../../../lib/playbook";
import { Tag } from "../../components/ui/tag";
import { OrdinalMarker } from "../../components/ui/ordinalMarker";
import { CellLabel } from "../../components/ui/cellLabel";
import { CheckIcon, CloseIcon } from "../../components/uiIcons";
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

type PlaybookListProps = {
  title: string;
  titleColorClass: string;
  items: readonly string[];
  liveSet: Set<string>;
  diffTagText: string;
  diffTagTone: "amber" | "emerald";
  /** Drawn from the icon set: neither text face carries a cross or a check, so
   *  a glyph string rendered in whatever symbol font the reader's OS had. */
  glyph: ReactNode;
  glyphClass: string;
};

function PlaybookDiffList({
  title,
  titleColorClass,
  items,
  liveSet,
  diffTagText,
  diffTagTone,
  glyph,
  glyphClass,
}: PlaybookListProps) {
  return (
    <div className="space-y-3">
      <h4 className={`text-sm font-semibold ${titleColorClass}`}>{title}</h4>
      <ul className="space-y-2.5 text-xs text-slate-300">
        {items.map((item, idx) => {
          const isNew = !liveSet.has(item);
          return (
            <li key={idx} className="flex items-start gap-2.5">
              <span
                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${glyphClass}`}
                aria-hidden="true"
              >
                {glyph}
              </span>
              <div className="space-y-0.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={isNew ? "font-medium text-slate-100" : "text-slate-300"}>{item}</span>
                  {isNew ? <Tag tone={diffTagTone}>{diffTagText}</Tag> : null}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function ScenarioDeltas({
  liveAssessment,
  simulatedAssessment,
  simulatedPlaybook,
  livePlaybook: propLivePlaybook,
  tightnessDelta,
  riskAppetiteDelta,
  onScrubScores,
}: {
  liveAssessment: RegimeAssessment;
  simulatedAssessment: RegimeAssessment;
  simulatedPlaybook: ReturnType<typeof getPlaybookGuidance>;
  livePlaybook?: ReturnType<typeof getPlaybookGuidance>;
  /** Computed once by the simulator, so the copied brief and this panel cannot disagree. */
  tightnessDelta: number;
  riskAppetiteDelta: number;
  /** One pair of scores, because the two ladders move the same point on the map. */
  onScrubScores?: ({ tightness, riskAppetite }: { tightness: number; riskAppetite: number }) => void;
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

  const handleTightnessScrub = onScrubScores
    ? (next: number) => onScrubScores({ tightness: next, riskAppetite: simulatedAssessment.scores.riskAppetite })
    : undefined;

  const handleRiskAppetiteScrub = onScrubScores
    ? (next: number) => onScrubScores({ tightness: simulatedAssessment.scores.tightness, riskAppetite: next })
    : undefined;

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
            onScrubValue={handleTightnessScrub}
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
            onScrubValue={handleRiskAppetiteScrub}
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
          <PlaybookDiffList
            title="What to stop in this scenario"
            titleColorClass="text-semantic-tightening-fg"
            items={simulatedPlaybook.stopItems}
            liveSet={liveStopSet}
            diffTagText="Added in scenario"
            diffTagTone="amber"
            glyph={<CloseIcon className="h-3 w-3" />}
            glyphClass="border-rose-500/30 bg-rose-500/15 text-rose-300"
          />
          <PlaybookDiffList
            title="What to start in this scenario"
            titleColorClass="text-semantic-easing-fg"
            items={simulatedPlaybook.startItems}
            liveSet={liveStartSet}
            diffTagText="Unblocks in scenario"
            diffTagTone="emerald"
            glyph={<CheckIcon className="h-3 w-3" />}
            glyphClass="border-emerald-500/30 bg-emerald-500/15 text-emerald-300"
          />
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
            <table className="w-full text-left text-xs text-slate-300 border-collapse max-md:block md:min-w-[36rem]">
              <caption className="sr-only">Operating rules by business area comparing this week and this scenario</caption>
              <thead className="max-md:hidden">
                <tr className="border-b border-slate-800 text-slate-400 font-medium">
                  <th scope="col" className="py-2.5 pr-3 w-48 shrink-0">Area</th>
                  <th scope="col" className="py-2.5 pr-3">{DECISION_CONTRACT_LABELS.action.actionNow}</th>
                  <th scope="col" className="py-2.5 pr-3">{DECISION_CONTRACT_LABELS.threshold.pauseIf}</th>
                  {showRestartLines ? (
                    <th scope="col" className="py-2.5 pr-3 text-emerald-400/90">{DECISION_CONTRACT_LABELS.slot.reversal}</th>
                  ) : null}
                </tr>
              </thead>
              <tbody className="max-md:block">
                {displayedLevers.map((lever, index) => (
                  /* A table from md up. Below it the four columns do not fit a
                     phone, so each row restacks as a block and each cell names
                     its column — the same phone pattern as `AreaTable`. */
                  <tr key={lever.lever} className="border-b border-slate-800/50 last:border-0 align-top max-md:block max-md:space-y-3 max-md:py-4">
                    <th scope="row" aria-label={lever.label} className="py-3 pr-3 text-left font-normal max-md:block max-md:p-0">
                      <div className="flex items-start gap-2">
                        <OrdinalMarker className="mt-0.5">{index + 1}</OrdinalMarker>
                        <div>
                          <div className="font-semibold text-slate-200">{lever.label}</div>
                          <div className="text-slate-400 text-fluid-nano mt-0.5">{lever.owner}</div>
                        </div>
                      </div>
                    </th>
                    <td className="py-3 pr-3 leading-relaxed max-md:block max-md:p-0">
                      <CellLabel>{DECISION_CONTRACT_LABELS.action.actionNow}</CellLabel>
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
                    <td className="py-3 pr-3 text-amber-200/90 leading-relaxed max-md:block max-md:p-0">
                      <CellLabel>{DECISION_CONTRACT_LABELS.threshold.pauseIf}</CellLabel>
                      <div>{lever.triggerThreshold}</div>
                      {lever.pauseLineChanged && lever.liveTriggerThreshold ? (
                        <div className="text-slate-400 text-fluid-nano line-through leading-normal mt-1">
                          This week: {lever.liveTriggerThreshold}
                        </div>
                      ) : null}
                    </td>
                    {showRestartLines ? (
                      <td className="py-3 pr-3 text-emerald-200/90 leading-relaxed max-md:block max-md:p-0">
                        <CellLabel>{DECISION_CONTRACT_LABELS.slot.reversal}</CellLabel>
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
