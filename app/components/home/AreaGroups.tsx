import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { AreaIcon, LineStateIcon } from "../ui/conceptIcons";
import { ActionLink } from "../ui/actionLink";
import type { DecisionArea } from "../../../lib/report/boundedDecisionRules";
import type { AreaGroup } from "../../../lib/report/home/homeSectionModel";
import { buildPlanLinesWatchHref } from "../../../lib/navigation/planningNavigation";

/*
 * Every area's rule, grouped by the condition that changes it (2026-11-03). It takes
 * the place of the folded "Every area's rule" table and the one-line first answer:
 * "On hold: Hiring, Fundraising, Spending and New bets", the condition, today's score,
 * how big a move that is and which way it went, when the hold began and how long the
 * earlier ones took, then each area's action. One fact, said once, with the actions
 * under it; the table printed the same restart line in four rows.
 *
 * Groups are divided by hairline rules, not cards (DESIGN.md, Layout). A held group
 * carries the crossed-line glyph and its word in the line ink, the way every crossed
 * line on the site does; no side stripe, no "WARNING".
 *
 * Each area's name opens what the picker knows about it under its own rule (`detail`).
 * The five choices that did that sat under the groups and printed the five names again.
 *
 * The name is drawn as a control (2026-11-03): a bordered disclosure trigger, the
 * week picker's shape. It was a dotted underline, the mark the card's defined terms
 * carry, so the five names read as definitions and the runway test and "Set your own
 * rules" behind them went unopened. The border and fill are utilities, not
 * `.weather-button`: that class lifts on hover and presses on :active with a
 * transform, which would pin the row-wide ::after to the button mid-hover and drop a
 * press that started on the rule.
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
  selected,
  onToggle,
  detail,
  note,
  alerts = false,
}: {
  groups: readonly AreaGroup[];
  /** The area whose detail is open. */
  selected?: DecisionArea;
  /** Opens or closes an area; without it the names are plain text. */
  onToggle?: (area: DecisionArea) => void;
  /** What opens under an area's rule. */
  detail?: (area: DecisionArea) => ReactNode;
  /** A note under an area's action, e.g. what its rule means at the reader's runway. */
  note?: (area: DecisionArea) => ReactNode;
  /** Offer an email when a held group restarts. Live briefs only: plan lines watch today's reading. */
  alerts?: boolean;
}) {
  if (groups.length === 0) return null;
  return (
    <div data-area-groups className="divide-y divide-[color:var(--border-subtle)] border-y border-[color:var(--border-subtle)]">
      {groups.map((group) => {
        const names = joinAnd(group.areas.map((entry) => entry.label));
        return (
          <section
            key={`${group.state}-${group.condition ?? ""}-${group.history ?? ""}`}
            aria-label={`${group.status}: ${names}`}
            className="space-y-2 py-4"
          >
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
            {group.history ? (
              <p className="max-w-[64ch] text-fluid-xs text-slate-400" data-group-history>
                {group.history}
              </p>
            ) : null}
            <ul className="space-y-2">
              {group.areas.map((entry) => {
                const open = selected === entry.area;
                return (
                  <li
                    key={entry.area}
                    id={`area-${entry.area}`}
                    className="grid max-w-[68ch] grid-cols-[auto_minmax(0,1fr)] gap-x-2.5 gap-y-1 text-fluid-base leading-snug text-slate-200"
                  >
                    {/* The glyph and the rule answer a tap as the name does (2026-11-03): only
                        the name was the button, and a reader who learned the row opens tapped
                        the glyph or the sentence and got nothing. The button's ::after spans
                        this header, not the detail under it, so the detail's own links work. */}
                    <div className={`col-span-2 grid grid-cols-subgrid ${onToggle ? "group relative" : ""}`}>
                      {/* Centred on the bordered name when it is a button, on the first line of text when not. */}
                      <AreaIcon area={entry.area} className={`shrink-0 text-slate-400 ${onToggle ? "mt-1.5" : "mt-1"}`} />
                      <p>
                        {onToggle ? (
                          <button
                            type="button"
                            aria-expanded={open}
                            aria-controls={open ? `area-${entry.area}-detail` : undefined}
                            onClick={() => onToggle(entry.area)}
                            className="mr-1 inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[color:var(--border-strong)] bg-[var(--bg-raised)] px-2 py-0.5 align-baseline font-semibold text-slate-50 after:absolute after:inset-0 after:rounded-sm group-hover:border-[color:var(--accent-action)] aria-expanded:border-[color:var(--accent-action)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
                          >
                            {entry.label}
                            <ChevronDown
                              aria-hidden="true"
                              className={`size-3.5 text-slate-300 transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
                            />
                          </button>
                        ) : (
                          <span className="font-semibold text-slate-50">{entry.label}.</span>
                        )}{" "}
                        {sentence(entry.rule)}
                      </p>
                    </div>
                    {entry.changed ? <p className="col-start-2 text-fluid-xs text-slate-400">{entry.changed}</p> : null}
                    {note ? <div className="col-start-2 empty:hidden">{note(entry.area)}</div> : null}
                    {open && detail ? (
                      <div id={`area-${entry.area}-detail`} aria-live="polite" className="col-start-2">
                        {detail(entry.area)}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
            {alerts && group.state === "crossed" ? (
              <ActionLink href={buildPlanLinesWatchHref(group.areas.map((entry) => entry.area))} variant="inline">
                {group.areas.length === 1 ? "Email me when it restarts →" : "Email me when they restart →"}
              </ActionLink>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
