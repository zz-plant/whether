import { RunwayConditionedNotes } from "../RunwayConditionedNotes";
import { CommitmentTestDisclosure } from "./CommitmentTest";
import type { RegimeKey } from "../../../lib/regimeEngine";

/**
 * What the week's rules mean for the reader's own cash, folded under the grouped rules.
 * A ladder of each area's distance sat here until 2026-11-05: with one score holding four
 * areas it drew the same row four times, and the groups state the distance in words.
 */
export function RunwayFold({
  regime,
  isHistorical,
}: {
  regime: RegimeKey;
  /** Live briefs only carry the operator's runway: it dates a company's cash position to today. */
  isHistorical: boolean;
}) {
  return (
    <details className="weather-auto-chevron group" data-runway-fold>
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm font-semibold text-sky-200 hover:text-slate-100">
        Your runway: what this means, and a test
      </summary>
      <div className="mt-4 space-y-4">
        {isHistorical ? null : <RunwayConditionedNotes regime={regime} />}
        {/* Live briefs only, like the runway notes: it reads today's cash. */}
        {isHistorical ? null : <CommitmentTestDisclosure regime={regime} />}
      </div>
    </details>
  );
}
