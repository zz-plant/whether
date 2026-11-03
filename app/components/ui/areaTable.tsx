import Link from "next/link";
import type { ReactNode } from "react";
import {
  decisionAreaLabel,
  decisionAreaOrder,
  type DecisionArea,
} from "../../../lib/report/boundedDecisionRules";
import { NOTHING_TO_RESUME, type LineState } from "../../../lib/report/operatingCalls";
import type { Route } from "../../../lib/navigation/routeType";
import { DECISION_CONTRACT_LABELS } from "../../../lib/report/reportCopy";
import { AreaIcon, AreaLabel, LineStateBadge } from "./conceptIcons";

/**
 * The decision area as a stable row.
 *
 * Hiring, Roadmap, Fundraising, Spending and New bets are the reader's frame,
 * and they appeared as rules on the homepage, as the playbook on /operate, as
 * scenario routes under /signals and as guardrail tags on /share, each with
 * its own layout and order. This is the one row: fixed slots, fixed order
 * (`decisionAreaOrder`), so the eye learns position. A surface with less to
 * say leaves a slot empty rather than reflowing.
 */
/**
 * One side of an area's rule as a cell prints it. `state` (`resolveLineState`)
 * draws the distance as the state badge; without one the distance is plain
 * text. `qualifier` is the rule's non-numeric condition, printed after the
 * badge rather than inside it.
 */
type AreaLineValue = {
  line: ReactNode;
  distance?: ReactNode;
  state?: LineState;
  qualifier?: ReactNode;
};

export type AreaRowData = {
  area: DecisionArea;
  /** This week's rule for the area, as an imperative. */
  rule: ReactNode;
  /**
   * The pause line, the distance to it as the caller formats it, and its state
   * for the badge. A `"crossed"` state puts the area on hold, and the row then
   * draws its restart side instead.
   */
  pause?: AreaLineValue;
  /** The restart line, the distance to it, and its state once it is met. Drawn only for an area on hold, or with `bothSides`. */
  resume?: AreaLineValue;
  /** What moved for this area this week, if anything. */
  changed?: ReactNode;
  /**
   * The week crossed one of this area's own lines. The row takes a caution
   * tint and its "Changed" cell the caution ink, so the one area whose answer
   * moved is found without reading five cells that mostly say nothing did.
   */
  moved?: boolean;
  /** Where to read more: the area's toolkit, scenario or answer. */
  href?: Route;
  hrefLabel?: string;
  /**
   * A line under the rule that qualifies it for this reader — the runway
   * note the homepage adds once a band is set. Rendered inside the rule cell,
   * so a slot that resolves to nothing adds no row.
   */
  note?: ReactNode;
  /**
   * A control for this row — on /share, the button that copies the area's tag.
   * Drawn in a last column so it stays with the row it acts on; the five sat in
   * a row under the table until 2026-10-02, a table's height from their rows.
   */
  action?: ReactNode;
};

type AreaTableProps = {
  rows: readonly AreaRowData[];
  caption: string;
  /** Hide the "what changed" column when no row carries one. */
  className?: string;
  /**
   * Draw both sides of every rule. /operate is where a reader sets rules of
   * their own, so it needs the pair; every other surface draws one side.
   */
  bothSides?: boolean;
};

const orderIndex = (area: DecisionArea) => decisionAreaOrder.indexOf(area);

type RuleSide = "pause" | "resume";

/* Only one side of a rule can change an area's state: an area on hold changes
   when it restarts, any other area when it pauses. The row drew both until
   2026-11-03, each with its distance, so a reader held four numbers to find
   the one that decides. A held row with no restart side keeps its pause,
   stamped in effect. */
const decidingSide = (row: AreaRowData): RuleSide =>
  row.pause?.state === "crossed" && row.resume ? "resume" : "pause";

const SIDE_LABEL: Record<RuleSide, string> = {
  pause: DECISION_CONTRACT_LABELS.threshold.pauseIf,
  resume: DECISION_CONTRACT_LABELS.reversal.resumeWhen,
};

const SIDE_INK: Record<RuleSide, string> = {
  pause: "text-semantic-caution-fg",
  resume: "text-semantic-easing-fg",
};

/* The column's name when its rows are on different sides; each cell then names its own. */
const MIXED_SIDES_HEADER = "What changes it";

/* The column names, repeated inside each cell for the stacked phone layout,
   where the header row is not drawn. Hidden from md up, where the header is,
   unless the header cannot name the cell (`fromMd`). */
const CellLabel = ({ children, className = "", fromMd = false }: { children: ReactNode; className?: string; fromMd?: boolean }) => (
  <span className={`mb-0.5 block text-xs font-medium ${fromMd ? "" : "md:hidden"} ${className}`.replace(/\s+/g, " ").trim()}>{children}</span>
);

const LineCell = ({
  value,
  kind,
}: {
  value?: AreaLineValue;
  kind: "pause" | "resume";
}) => {
  if (!value) return <span className="text-slate-500">—</span>;

  /* A line in force is a status, so its badge is a stamp (§XIV): a pause line
     crossed, or a restart line met. A distance still to go stays unframed. A
     crossed pause line takes the caution ink, the colour of the column it sits
     in; it was red, the same red a Freezing week paints the page, so "in
     force" read as "error". */
  const inForce = kind === "pause" ? value.state === "crossed" : value.state !== undefined;

  return (
    <>
      {value.line}
      {value.distance ? (
        <span className={value.state ? "mt-1 block text-xs" : "block text-xs text-slate-400"}>
          {value.state ? (
            <LineStateBadge state={value.state} stamp={inForce}>
              {value.distance}
            </LineStateBadge>
          ) : (
            value.distance
          )}
          {value.qualifier ? <span className="text-slate-400"> · {value.qualifier}</span> : null}
        </span>
      ) : null}
    </>
  );
};

/* The one side that can change the row's area, named in the cell: on a phone,
   where no header is drawn, and from md up when the rows are on different sides. */
const SideCell = ({ row, labelFromMd }: { row: AreaRowData; labelFromMd: boolean }) => {
  const side = decidingSide(row);
  return (
    <td className="py-2.5 pr-3 tabular-nums text-slate-300 max-md:col-span-2 max-md:p-0" data-rule-side={side}>
      <CellLabel className={SIDE_INK[side]} fromMd={labelFromMd}>{SIDE_LABEL[side]}</CellLabel>
      <LineCell value={side === "resume" ? row.resume : row.pause} kind={side} />
    </td>
  );
};

/**
 * A table from md up. Below it the columns do not fit a phone — the restart
 * line sat off the right edge behind a sideways scroll — so each row restacks
 * as a block: the area, the rule across the full width, then the side that can
 * change the area (both sides, side by side, with `bothSides`), labelled in its
 * cell. One DOM for both, so the row order and content cannot drift between
 * layouts.
 */
export function AreaTable({ rows, caption, className = "", bothSides = false }: AreaTableProps) {
  const ordered = [...rows].sort((a, b) => orderIndex(a.area) - orderIndex(b.area));
  const showChanged = ordered.some((row) => row.changed);
  const showAction = ordered.some((row) => row.action);
  /* Every row on one side: the header names it, as each of the pair's headers did. */
  const [firstSide, ...otherSides] = ordered.map(decidingSide);
  const sharedSide = firstSide && otherSides.every((side) => side === firstSide) ? firstSide : null;
  return (
    <div className={`md:overflow-x-auto overscroll-x-contain ${className}`.trim()}>
      <table className="w-full border-collapse text-left text-sm max-md:block md:min-w-[36rem]">
        <caption className="sr-only">{caption}</caption>
        <thead className="max-md:hidden">
          <tr className="border-b border-[color:var(--border-subtle)] text-xs text-slate-400">
            <th scope="col" className="py-2 pr-3 font-medium">Area</th>
            <th scope="col" className="py-2 pr-3 font-medium">This week</th>
            {bothSides ? (
              <>
                <th scope="col" className={`py-2 pr-3 font-medium ${SIDE_INK.pause}`}>{SIDE_LABEL.pause}</th>
                <th scope="col" className={`py-2 pr-3 font-medium ${SIDE_INK.resume}`}>{SIDE_LABEL.resume}</th>
              </>
            ) : (
              <th scope="col" className={`py-2 pr-3 font-medium ${sharedSide ? SIDE_INK[sharedSide] : ""}`.trim()}>
                {sharedSide ? SIDE_LABEL[sharedSide] : MIXED_SIDES_HEADER}
              </th>
            )}
            {showChanged ? <th scope="col" className="py-2 pr-3 font-medium">Changed</th> : null}
            {showAction ? (
              <th scope="col" className="py-2 font-medium">
                <span className="sr-only">Copy</span>
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody className="max-md:block">
          {ordered.map((row) => (
            <tr
              key={row.area}
              /* One area per frame unit: on a phone the row is a card with its own line labels. */
              data-frame-block=""
              id={`area-${row.area}`}
              /* The space before each `${` is load-bearing: Tailwind reads a class
                 glued to an interpolation ("max-md:py-3${") as one token it cannot
                 parse and never generates it (tests/tailwindClassBoundaries).
                 On a phone the moved row's tint is inset from its text. */
              className={`border-b border-[color:var(--border-faint)] align-top max-md:grid max-md:grid-cols-2 max-md:gap-x-4 max-md:gap-y-2 max-md:py-3 ${
                row.moved ? "bg-amber-500/[0.06] max-md:-mx-2 max-md:rounded-md max-md:px-2" : ""
              }`}
              data-area={row.area}
              data-moved={row.moved ? "true" : undefined}
            >
              <th scope="row" className="py-2.5 pr-3 font-semibold text-slate-100 max-md:col-span-2 max-md:p-0">
                {row.href ? (
                  <Link
                    href={row.href}
                    className="weather-hit inline-flex items-center gap-1.5 underline decoration-slate-600 underline-offset-4 hover:text-slate-50"
                  >
                    <AreaIcon area={row.area} />
                    {row.hrefLabel ?? decisionAreaLabel(row.area)}
                  </Link>
                ) : (
                  <AreaLabel area={row.area} />
                )}
                {/* No "Lines set by Funding pressure & Risk appetite" under the area
                    (2026-10-27): the pause and restart lines beside it name their
                    scores, so every row said them twice. */}
              </th>
              <td className="py-2.5 pr-3 text-slate-200 max-md:col-span-2 max-md:p-0">
                {row.rule}
                {row.note}
              </td>
              {bothSides ? (
                <>
                  <td className="py-2.5 pr-3 tabular-nums text-slate-300 max-md:p-0">
                    <CellLabel className={SIDE_INK.pause}>{SIDE_LABEL.pause}</CellLabel>
                    <LineCell value={row.pause} kind="pause" />
                  </td>
                  <td className="py-2.5 pr-3 tabular-nums text-slate-300 max-md:p-0">
                    <CellLabel className={SIDE_INK.resume}>{SIDE_LABEL.resume}</CellLabel>
                    {/* A met restart line on an area that is not on hold stamped "already
                        met" beside "14 pts away" from its pause line, which read as a
                        restart (2026-10-14). With the pause line not crossed there is
                        nothing to resume, and the cell says that instead — short of the
                        restart line too, where it printed "2 pts away" (2026-11-02). */}
                    <LineCell
                      value={
                        row.pause && row.pause.state !== "crossed" && row.resume
                          ? { line: row.resume.line, distance: NOTHING_TO_RESUME }
                          : row.resume
                      }
                      kind="resume"
                    />
                  </td>
                </>
              ) : (
                <SideCell row={row} labelFromMd={sharedSide === null} />
              )}
              {showChanged ? (
                <td
                  className={`py-2.5 pr-3 max-md:col-span-2 max-md:p-0 ${row.moved ? "font-medium text-amber-200/90" : "text-slate-400"} ${
                    row.changed ? "" : "max-md:hidden"
                  }`.trim()}
                >
                  <CellLabel className="text-slate-400">Changed</CellLabel>
                  {row.changed ?? <span className="text-slate-500">—</span>}
                </td>
              ) : null}
              {showAction ? (
                <td className="whitespace-nowrap py-2.5 text-right max-md:col-span-2 max-md:p-0 max-md:text-left">{row.action}</td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
