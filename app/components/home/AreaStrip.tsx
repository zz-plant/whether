import Link from "next/link";
import type { CSSProperties } from "react";
import { decisionAreaLabel, type DecisionArea } from "../../../lib/report/boundedDecisionRules";
import type { AreaStripModel } from "../../../lib/report/home/homeSectionModel";
import type { WeekMove } from "../../../lib/report/home/weekMove";
import { LineStateIcon } from "../ui/conceptIcons";

/**
 * The five areas under the guidance, as five ruled rows (docs/design/rebuild-covenant.md):
 * the area's number, its name in the binding voice, where it stands, and from `lg` up the
 * action that goes with it. A reader with a hire in flight sees "Hiring, on hold" and what
 * that permits in one line. Each row goes to that area's rule below.
 *
 * It was a row of five columns, a name over a state (2026-11-05), read the way a forecast
 * row is. Numbered in the one order the areas are always given, so "area 3" can be cited.
 * Rows and no boxes: a card inside the block is a list (§XXV).
 */
const STATE_INK = (state: AreaStripModel["cells"][number]["state"]) =>
  state === "clear" ? "text-line-clear-fg" : "text-line-crossed-fg";

export function AreaStrip({
  model,
  earlier,
  rules,
}: {
  model: AreaStripModel;
  /** Each moved area's standing at the earlier reading: the cell ticks from it to this week's (week-move.css). */
  earlier?: WeekMove["areas"];
  /**
   * Each area's action, printed beside its standing from `lg` up. Below that the row is
   * the name and the standing, and "Your decisions this week" carries the action; the
   * picker gives its own sentence up from `lg` so the action is said once at each width.
   */
  rules?: Partial<Record<DecisionArea, string>>;
}) {
  const movedAreas = model.cells.filter((cell) => earlier?.[cell.area]).map((cell) => cell.area);
  return (
    <div data-area-strip className="border-t-2 border-[color:var(--app-text)]">
      <ol>
        {model.cells.map((cell, index) => {
          const rule = rules?.[cell.area];
          return (
            <li key={cell.area} className="max-w-none border-b border-[color:var(--border-default)]">
              <Link
                href={cell.href}
                data-line-state={cell.state}
                className="group grid min-h-11 grid-cols-[1.25rem_minmax(0,1fr)_auto] items-baseline gap-x-2 py-1.5 text-sm leading-tight no-underline @[34rem]:grid-cols-[1.25rem_8.5rem_6.5rem_minmax(0,1fr)] @[34rem]:gap-x-3"
              >
                <span aria-hidden="true" className="text-xs tabular-nums text-slate-400">{index + 1}</span>
                <span className="font-[family-name:var(--font-display)] text-[1.25rem] font-bold leading-none text-slate-100 group-hover:underline group-hover:underline-offset-4">
                  {decisionAreaLabel(cell.area)}
                </span>
                <AreaStanding cell={cell} was={earlier?.[cell.area]} order={movedAreas.indexOf(cell.area)} />
                {rule ? (
                  <span className="col-span-full hidden text-sm leading-[1.3] text-slate-300 @[34rem]:col-span-1 lg:block" data-area-rule>
                    {rule}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ol>
      {model.restart ? <p className="mt-2 text-sm leading-snug text-slate-300">{model.restart}</p> : null}
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
    <span className={`inline-flex items-center gap-1.5 font-medium ${STATE_INK(cell.state)} ${was ? "week-move-flip-new" : ""}`}>
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
