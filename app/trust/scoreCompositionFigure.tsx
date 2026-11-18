import type { RateDial } from "../../lib/report/rateScenario";
import type { ScoreComposition } from "../../lib/report/scoreComposition";
import { ScoreCompositionBar } from "./scoreCompositionBar";

/**
 * This week's two scores, each as the sum of what its inputs gave it.
 *
 * Open on the page rather than inside "Show the exact arithmetic" (ui-ux-standards
 * §XII): the fold holds the method, the ramps and constants a reader checks a
 * claim against, while this is the claim itself for this week, and checking it
 * is `/trust`'s job. It is two short bars, so it costs a phone little.
 *
 * The sentence is the arithmetic a reader copies; the bar draws the same object
 * (`buildScoreComposition`), so the two cannot disagree, and the not-counted
 * line is the scoring basis's own sentence, the one `/signals` prints under the
 * score. Funding pressure's bar also takes the short rate on a range
 * (`buildRateDial`, 2026-11-18): moved, the bar redraws at that rate with this
 * week's total marked, and a sentence under the control says what would move.
 */
export function ScoreCompositionFigure({
  composition,
  rateDial = null,
}: {
  composition: { tightness: ScoreComposition; riskAppetite: ScoreComposition };
  /** Funding pressure at other short rates, with the rate the URL names; null where there is no rate to move. */
  rateDial?: (RateDial & { initialRate?: number }) | null;
}) {
  const scores = [composition.tightness, composition.riskAppetite];
  return (
    <figure className="mb-6 space-y-6" data-score-composition>
      {scores.map((score) => (
        <div key={score.metric} className="space-y-1" data-composition={score.metric}>
          <p className="text-sm tabular-nums text-slate-200" data-composition-sentence>
            {score.sentence}
            {score.notCountedSentence ? <> {score.notCountedSentence}</> : null}
          </p>
          <ScoreCompositionBar
            label={score.label}
            published={score.published}
            parts={score.parts}
            notCounted={score.notCounted}
            largest={score.largest}
            rateDial={score.metric === "tightness" ? rateDial : null}
          />
        </div>
      ))}
      {/* The key and the domain, once for both bars. */}
      <figcaption className="text-xs leading-5 text-slate-400">
        Each bar runs from 0 to 100. Solid parts are counted, hatched is what an input took away, and
        dashed is left out of the published score. Pick a part to read its input, its weight and its
        source.
      </figcaption>
    </figure>
  );
}
