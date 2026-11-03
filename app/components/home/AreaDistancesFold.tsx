import { AreaCorridorLadder } from "../ui/areaCorridorLadder";
import { RunwayConditionedNotes } from "../RunwayConditionedNotes";
import { CommitmentTestDisclosure } from "./CommitmentTest";
import type { DecisionCorridorModel } from "../../../lib/report/operatingCalls";
import type { RegimeKey } from "../../../lib/regimeEngine";

/**
 * What sits behind the grouped rules, folded under the picker (2026-11-03).
 *
 * This held "Every area's rule", a table printing each area's action, both lines and the
 * distance to each, with the shared restart line repeated in four rows. The rules are in
 * the open now, grouped by the condition that changes them (`AreaGroups`), and keep every
 * area in the server HTML; the fold keeps what a reader opens on purpose: the distance
 * ladder drawn on one scale, what the guidance means at their runway, and a test against
 * their cash. The ladder was open above the fold and said in a drawing what each group's
 * "a rare move away" now says in words.
 */
export function AreaDistancesFold({
  regime,
  isHistorical,
  corridorModel,
}: {
  regime: RegimeKey;
  /** Live briefs only carry the operator's runway: it dates a company's cash position to today. */
  isHistorical: boolean;
  /** The 5-area normalized corridor ladder model. */
  corridorModel?: DecisionCorridorModel;
}) {
  return (
    <details className="weather-auto-chevron group" data-area-distances>
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm font-semibold text-sky-200 hover:text-slate-100">
        Each area&rsquo;s distance, and a test against your runway
      </summary>
      <div className="mt-4 space-y-4">
        {corridorModel ? <AreaCorridorLadder model={corridorModel} /> : null}
        {isHistorical ? null : <RunwayConditionedNotes regime={regime} />}
        {/* Live briefs only, like the runway notes: it reads today's cash. */}
        {isHistorical ? null : <CommitmentTestDisclosure regime={regime} />}
      </div>
    </details>
  );
}
