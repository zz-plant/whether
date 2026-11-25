import type { loadHomePageAssembly } from "../lib/report/homePageAssemblyLoader";
import type { HomePageSearchParams } from "../lib/report/homeMetadata";
import type { DecisionArea } from "../lib/report/boundedDecisionRules";
import { buildRuleChartModel } from "../lib/report/ruleRegions";
import { parseRuleChartDecision, parseRuleChartReading } from "../lib/report/ruleChartParams";
import { buildRateMoves, fundingPressureRateLookup } from "../lib/report/rateScenario";
import { buildScoreComposition } from "../lib/report/scoreComposition";
import { evaluateRegime } from "../lib/regimeEngine";

type ReportData = Awaited<ReturnType<typeof loadHomePageAssembly>>["reportData"];
type RuleChartInput = Parameters<typeof buildRuleChartModel>[0];

/**
 * The conditions chart's rule layer on `/`, out of the route so the page stays under its
 * line cap (it went over when the 2026-11-21 reading-measure wrapper met the chart's
 * readings). Each area's regions, opening on the decision the reader chose, else on the lead
 * rule only when the sentence beside the chart is that rule's. On a live read the chart can
 * also plot the reading with the left-out inputs counted, or after a Fed cut or hike, and
 * label funding pressure's lines with the short rate where the rate makes the whole score;
 * all three re-score through the engine.
 */
export function buildHomeRuleChart({
  reportData,
  rules,
  scores,
  leadArea,
  changeLines,
  regime,
  live,
  searchParams,
  rememberedArea,
}: Pick<RuleChartInput, "rules" | "scores" | "leadArea" | "changeLines" | "regime"> & {
  reportData: ReportData;
  /** A live read: not an archived month and not the saved copy a failed read serves. */
  live: boolean;
  searchParams: HomePageSearchParams | undefined;
  /** The area the reader last picked (the decision picker's cookie). */
  rememberedArea: DecisionArea | null | undefined;
}) {
  const rateInputs = { assessment: reportData.assessment, treasury: reportData.treasury, macroSeries: reportData.macroSeries, evaluate: evaluateRegime };
  const model = buildRuleChartModel({
    rules,
    scores,
    leadArea,
    notCounted: live ? reportData.scoringBasis?.notCounted ?? [] : [],
    changeLines,
    regime,
    rateMoves: live ? buildRateMoves(rateInputs) : [],
    rateAtFundingPressure: live
      ? fundingPressureRateLookup({
          assessment: reportData.assessment,
          composition: buildScoreComposition({
            ...rateInputs,
            treasurySource: { label: reportData.treasuryProvenance.sourceLabel, url: reportData.treasuryProvenance.sourceUrl },
            scoringBasis: reportData.scoringBasis,
          }),
        })
      : undefined,
  });
  const chosenReading = parseRuleChartReading(searchParams);
  /* The closed quiet-week row's miniature radar: the lead rule's pause region and this
     week's dot, so the fold shows what it is holding. */
  const quietWeekRule = model.areas.find((candidate) => candidate.area === model.defaultArea) ?? model.areas[0];
  return {
    ...model,
    quietWeekPreview: quietWeekRule ? { area: quietWeekRule.area, regions: quietWeekRule.regions, scores, changeLines } : null,
    initialArea: parseRuleChartDecision(searchParams) ?? rememberedArea ?? undefined,
    initialReading: model.readings.some((reading) => reading.key === chosenReading) ? chosenReading : null,
    query: searchParams,
  };
}
