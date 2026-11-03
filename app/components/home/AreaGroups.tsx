import type { ReactNode } from "react";
import { AreaIcon, LineStateIcon } from "../ui/conceptIcons";
import type { DecisionArea } from "../../../lib/report/boundedDecisionRules";
import type { AreaGroup } from "../../../lib/report/home/homeSectionModel";

/*
 * Every area's rule, grouped by the condition that changes it (2026-11-03). It takes
 * the place of the folded "Every area's rule" table and the one-line first answer:
 * "On hold: Hiring, Fundraising, Spending and New bets", the condition, today's score
 * and how big a move that is, then each area's action. One fact, said once, with the
 * actions under it; the table printed the same restart line in four rows.
 *
 * Groups are divided by hairline rules, not cards (DESIGN.md, Layout). A held group
 * carries the crossed-line glyph and its word in the line ink, the way every crossed
 * line on the site does; no side stripe, no "WARNING".
 */
const HEADING_INK: Record<AreaGroup["state"], string> = {
  crossed: "text-line-crossed-fg",
  near: "text-line-crossed-fg",
  clear: "text-slate-100",
};

const joinAnd = (items: readonly string[]) =>
  items.length <= 1 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} and ${items.at(-1) ?? ""}`;

const sentence = (text: string) => (/[.!?]$/.test(text) ? text : `${text}.`);

export function AreaGroups({
  groups,
  note,
}: {
  groups: readonly AreaGroup[];
  /** A note under an area's action, e.g. what its rule means at the reader's runway. */
  note?: (area: DecisionArea) => ReactNode;
}) {
  if (groups.length === 0) return null;
  return (
    <div data-area-groups className="divide-y divide-[color:var(--border-subtle)] border-y border-[color:var(--border-subtle)]">
      {groups.map((group) => {
        const names = joinAnd(group.areas.map((entry) => entry.label));
        return (
          <section key={`${group.state}-${group.condition ?? ""}`} aria-label={`${group.status}: ${names}`} className="space-y-2 py-4">
            <h3 className={`flex items-center gap-2 text-fluid-lg font-semibold leading-snug ${HEADING_INK[group.state]}`}>
              <LineStateIcon state={group.state} className="shrink-0" />
              <span>
                {group.status}: {names}
              </span>
            </h3>
            {group.condition || group.distance ? (
              <p className="max-w-[64ch] text-fluid-sm text-slate-300" data-group-condition>
                {[group.condition, group.distance].filter(Boolean).join(" ")}
              </p>
            ) : null}
            <ul className="space-y-2">
              {group.areas.map((entry) => (
                <li key={entry.area} id={`area-${entry.area}`} className="flex max-w-[68ch] gap-2.5 text-fluid-base leading-snug text-slate-200">
                  <AreaIcon area={entry.area} className="mt-1 shrink-0 text-slate-400" />
                  <div className="min-w-0 space-y-1">
                    <p>
                      <span className="font-semibold text-slate-50">{entry.label}.</span> {sentence(entry.rule)}
                    </p>
                    {entry.changed ? <p className="text-fluid-xs text-slate-400">{entry.changed}</p> : null}
                    {note ? note(entry.area) : null}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
