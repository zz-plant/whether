import Link from "next/link";
import type { CSSProperties } from "react";
import { decisionAreaLabel } from "../../../lib/report/boundedDecisionRules";
import type { AreaStripModel } from "../../../lib/report/home/homeSectionModel";
import type { WeekMove } from "../../../lib/report/home/weekMove";
import { LineStateIcon } from "../ui/conceptIcons";

/**
 * The five areas under the call, as five ruled rows (docs/design/rebuild-covenant.md,
 * one-page brief 2026-11-21): the area's number and name in the binding voice, where it
 * stands, the action that goes with it, and the one canonical line that can change that
 * standing — pause if it is running, restart when it is held.
 *
 * The action and the line used to live only in "Your decisions this week", a scroll
 * below the call, so a screenshot of the brief carried five states and no instruction.
 * They are in the row now, and the area's name still opens the full rule, the cash test
 * and the links below (`#area-<area>`). A row is one link, so the whole row is the
 * target and "View lines" is the row's affordance rather than a second anchor.
 *
 * Rows and no boxes: a card inside the block is a list (§XXV). Numbered in the one order
 * the areas are always given, so "area 3" can be cited.
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
    <div data-area-strip className="border-t-2 border-[color:var(--app-text)]">
      <ol>
        {model.cells.map((cell, index) => (
          <li key={cell.area} className="max-w-none border-b border-[color:var(--border-default)]">
            <Link
              href={cell.href}
              data-line-state={cell.state}
              className="group grid min-h-11 grid-cols-[1.25rem_minmax(0,1fr)_auto] items-baseline gap-x-3 gap-y-1 py-3.5 text-fluid-sm leading-snug no-underline @[44rem]:grid-cols-[1.25rem_8rem_6.25rem_minmax(0,1fr)_auto] @[44rem]:gap-x-4"
            >
              <span aria-hidden="true" className="col-start-1 row-start-1 text-xs tabular-nums text-slate-400">
                {index + 1}
              </span>
              <span className="col-start-2 row-start-1 font-[family-name:var(--font-display)] text-[1.25rem] font-bold leading-none text-slate-100 group-hover:underline group-hover:underline-offset-4">
                {decisionAreaLabel(cell.area)}
              </span>
              <span className="col-start-3 row-start-1 justify-self-end @[44rem]:col-start-3 @[44rem]:justify-self-start">
                <AreaStanding cell={cell} was={earlier?.[cell.area]} order={movedAreas.indexOf(cell.area)} />
              </span>
              <span
                className="col-span-2 col-start-2 row-start-2 space-y-1 @[44rem]:col-span-1 @[44rem]:col-start-4 @[44rem]:row-start-1"
                data-area-copy
              >
                {cell.action ? (
                  <span className="block text-fluid-sm leading-[1.25] text-slate-200" data-area-rule>
                    {cell.action}
                  </span>
                ) : null}
                {cell.line ? (
                  <span className="block text-fluid-sm leading-[1.25] text-slate-300" data-area-line>
                    <span className="font-semibold text-slate-100">{cell.line.label}</span>{" "}
                    <span className="tabular-nums">{cell.line.text}</span>
                  </span>
                ) : null}
              </span>
              <span className="col-span-2 col-start-2 row-start-3 hidden justify-self-start text-fluid-sm font-medium text-slate-300 group-hover:text-slate-100 @[44rem]:col-span-1 @[44rem]:col-start-5 @[44rem]:row-start-1 @[44rem]:inline @[44rem]:justify-self-end">
                View lines <span aria-hidden="true">→</span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
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
