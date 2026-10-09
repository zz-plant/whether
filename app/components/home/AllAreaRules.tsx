import { AreaTable, type AreaRowData } from "../ui/areaTable";
import { RunwayAreaNote, RunwayConditionedNotes } from "../RunwayConditionedNotes";
import { CommitmentTestDisclosure } from "./CommitmentTest";
import { DECISION_CONTRACT_LABELS } from "../../../lib/report/reportCopy";
import type { HomeAreaRow } from "../../../lib/report/home/homeSectionModel";
import type { RegimeKey } from "../../../lib/regimeEngine";
import { toRoute, type Route } from "../../../lib/navigation/routeType";

/**
 * All five areas at once, folded under the picker (2026-10-09).
 *
 * This was its own section, "What that changes for you", the eighth thing on the
 * page, with the stage and runway controls at its head; the controls lead the
 * areas now (`CompanyCalibration`) and the picker is the areas. The table stays,
 * folded, for the reader who wants every rule side by side, and because it keeps
 * every rule and line in the server HTML whichever choice the picker shows.
 * Each row prints its lines and the distance to them; the runway notes sit under
 * the row they concern once a band is set.
 */
export function AllAreaRules({
  rows,
  regime,
  planHref,
  isHistorical,
}: {
  rows: readonly HomeAreaRow[];
  regime: RegimeKey;
  planHref: Route;
  /** Live briefs only carry the operator's runway: it dates a company's cash position to today. */
  isHistorical: boolean;
}) {
  const tableRows: AreaRowData[] = rows.map((row) => ({
    area: row.area,
    rule: row.rule,
    pause: row.pause
      ? {
          line: row.pause.line,
          distance: row.pauseQualifier ? `${row.pause.distance} · also if ${row.pauseQualifier}` : row.pause.distance,
        }
      : undefined,
    resume: row.resume
      ? {
          line: row.resume.line,
          distance: row.resumeQualifier ? `${row.resume.distance} · only when ${row.resumeQualifier}` : row.resume.distance,
        }
      : undefined,
    scores: [row.pause?.metric, row.resume?.metric].filter((metric) => metric !== undefined),
    changed: row.changed,
    moved: row.changed !== undefined && row.changedKind !== undefined && row.changedKind !== "held",
    href: toRoute(`${planHref}#ops-monthly-action-summary`),
    note: isHistorical ? undefined : <RunwayAreaNote regime={regime} area={row.area} />,
  }));

  return (
    <details className="weather-auto-chevron group" data-all-area-rules>
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm font-semibold text-sky-200 hover:text-slate-100">
        All five areas, side by side
      </summary>
      <div className="mt-4 space-y-4">
        {isHistorical ? null : <RunwayConditionedNotes regime={regime} />}
        <AreaTable
          rows={tableRows}
          caption={`${DECISION_CONTRACT_LABELS.action.actionNow}, ${DECISION_CONTRACT_LABELS.threshold.pauseIf} and ${DECISION_CONTRACT_LABELS.reversal.resumeWhen}, by area`}
        />
        {/* Live briefs only, like the runway notes: it reads today's cash. */}
        {isHistorical ? null : <CommitmentTestDisclosure regime={regime} />}
      </div>
    </details>
  );
}
