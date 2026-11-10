import Link from "next/link";
import type { CSSProperties } from "react";
import { decisionAreaLabel } from "../../../lib/report/boundedDecisionRules";
import type { AreaStripModel } from "../../../lib/report/home/homeSectionModel";
import type { WeekMove } from "../../../lib/report/home/weekMove";
import { AreaIcon, LineStateIcon } from "../ui/conceptIcons";

/**
 * The five areas across the card, read the way a weather app's forecast row is read
 * (2026-11-05): a name and a state per column, so the card answers "which decisions does
 * this bind?" at a glance and in a crop. Columns and no boxes: a card inside the card is a
 * list (§XXV). Each column goes to that area's rule below.
 */
const STATE_INK = (state: AreaStripModel["cells"][number]["state"]) =>
  state === "clear" ? "text-line-clear-fg" : "text-line-crossed-fg";

export function AreaStrip({
  model,
  earlier,
}: {
  model: AreaStripModel;
  /** Each moved area's standing at the earlier reading: the cell ticks from it to this week's (week-move.css). */
  earlier?: WeekMove["areas"];
}) {
  const movedAreas = model.cells.filter((cell) => earlier?.[cell.area]).map((cell) => cell.area);
  return (
    <div data-area-strip className="border-t border-[color:var(--border-faint)] pt-2">
      <ul className="grid grid-cols-[repeat(auto-fit,minmax(6rem,1fr))] gap-x-1 gap-y-1">
        {model.cells.map((cell) => (
          <li key={cell.area} className="min-w-0">
            <Link
              href={cell.href}
              data-line-state={cell.state}
              className="group flex min-h-11 flex-col justify-center gap-0.5 rounded-lg text-sm leading-tight"
            >
              <span className="inline-flex items-center gap-1.5 font-medium text-slate-100 group-hover:underline group-hover:underline-offset-4">
                <AreaIcon area={cell.area} />
                {decisionAreaLabel(cell.area)}
              </span>
              <AreaStanding cell={cell} was={earlier?.[cell.area]} order={movedAreas.indexOf(cell.area)} />
            </Link>
          </li>
        ))}
      </ul>
      {model.restart ? <p className="mt-1 text-sm leading-snug text-slate-300">{model.restart}</p> : null}
    </div>
  );
}

/* An area's standing. On a week it moved, the earlier standing sits over it until its
   turn, printed from an attribute so the cell's text is this week's alone. */
function AreaStanding({
  cell,
  was,
  order,
}: {
  cell: AreaStripModel["cells"][number];
  was?: NonNullable<WeekMove["areas"][AreaStripModel["cells"][number]["area"]]>;
  order: number;
}) {
  const standing = (
    <span className={`inline-flex items-center gap-1.5 ${STATE_INK(cell.state)} ${was ? "week-move-flip-new" : ""}`}>
      <LineStateIcon state={cell.state} />
      {cell.label}
    </span>
  );
  if (!was) return standing;
  const turn: CSSProperties & { "--week-move-i": number } = { "--week-move-i": order };
  return (
    <span className="relative inline-flex" style={turn} data-week-move-area={was.state}>
      <span aria-hidden="true" className={`week-move-old week-move-flip-old inline-flex items-center gap-1.5 ${STATE_INK(was.state)}`}>
        <LineStateIcon state={was.state} />
        <span className="week-move-attr" data-text={was.label} />
      </span>
      {standing}
    </span>
  );
}
