import Link from "next/link";
import type { ReactNode } from "react";
import { decisionAreaLabel, decisionAreaOrder, type DecisionArea } from "../../../lib/report/boundedDecisionRules";
import type { Route } from "../../../lib/navigation/routeType";

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
export type AreaRowData = {
  area: DecisionArea;
  /** This week's rule for the area, as an imperative. */
  rule: ReactNode;
  /** The pause line and the distance to it, as the caller formats them. */
  pause?: { line: ReactNode; distance?: ReactNode };
  /** The resume line and the distance to it. */
  resume?: { line: ReactNode; distance?: ReactNode };
  /** What moved for this area this week, if anything. */
  changed?: ReactNode;
  /** Where to read more: the area's toolkit, scenario or answer. */
  href?: Route;
  hrefLabel?: string;
  /**
   * A line under the rule that qualifies it for this reader — the runway
   * note the homepage adds once a band is set. Rendered inside the rule cell,
   * so a slot that resolves to nothing adds no row.
   */
  note?: ReactNode;
};

type AreaTableProps = {
  rows: readonly AreaRowData[];
  caption: string;
  /** Hide the "what changed" column when no row carries one. */
  className?: string;
};

const orderIndex = (area: DecisionArea) => decisionAreaOrder.indexOf(area);

/* The column names, repeated inside each cell for the stacked phone layout,
   where the header row is not drawn. Hidden from sm up, where the header is. */
const CellLabel = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <span className={`mb-0.5 block text-[11px] font-medium sm:hidden ${className}`.trim()}>{children}</span>
);

const LineCell = ({ value }: { value?: { line: ReactNode; distance?: ReactNode } }) =>
  value ? (
    <>
      {value.line}
      {value.distance ? <span className="block text-xs text-slate-400">{value.distance}</span> : null}
    </>
  ) : (
    <span className="text-slate-500">—</span>
  );

/**
 * A table from sm up. Below it the four columns do not fit a phone — the
 * resume line sat off the right edge behind a sideways scroll — so each row
 * restacks as a block: the area, the rule across the full width, then the
 * pause and resume lines side by side, each labelled in its cell. One DOM for
 * both, so the row order and content cannot drift between layouts.
 */
export function AreaTable({ rows, caption, className = "" }: AreaTableProps) {
  const ordered = [...rows].sort((a, b) => orderIndex(a.area) - orderIndex(b.area));
  const showChanged = ordered.some((row) => row.changed);
  return (
    <div className={`sm:overflow-x-auto ${className}`.trim()}>
      <table className="w-full border-collapse text-left text-sm max-sm:block sm:min-w-[36rem]">
        <caption className="sr-only">{caption}</caption>
        <thead className="max-sm:hidden">
          <tr className="border-b border-slate-800/80 text-xs text-slate-400">
            <th scope="col" className="py-2 pr-3 font-medium">Area</th>
            <th scope="col" className="py-2 pr-3 font-medium">This week</th>
            <th scope="col" className="py-2 pr-3 font-medium text-semantic-caution-fg">Pause line</th>
            <th scope="col" className="py-2 pr-3 font-medium text-semantic-easing-fg">Resume line</th>
            {showChanged ? <th scope="col" className="py-2 pr-3 font-medium">Changed</th> : null}
          </tr>
        </thead>
        <tbody className="max-sm:block">
          {ordered.map((row) => (
            <tr
              key={row.area}
              className="border-b border-slate-800/50 align-top max-sm:grid max-sm:grid-cols-2 max-sm:gap-x-4 max-sm:gap-y-2 max-sm:py-3"
              data-area={row.area}
            >
              <th scope="row" className="py-2.5 pr-3 font-semibold text-slate-100 max-sm:col-span-2 max-sm:p-0">
                {row.href ? (
                  <Link href={row.href} className="weather-hit underline decoration-slate-600 underline-offset-4 hover:text-white">
                    {row.hrefLabel ?? decisionAreaLabel(row.area)}
                  </Link>
                ) : (
                  decisionAreaLabel(row.area)
                )}
              </th>
              <td className="py-2.5 pr-3 text-slate-200 max-sm:col-span-2 max-sm:p-0">
                {row.rule}
                {row.note}
              </td>
              <td className="py-2.5 pr-3 tabular-nums text-slate-300 max-sm:p-0">
                <CellLabel className="text-semantic-caution-fg">Pause line</CellLabel>
                <LineCell value={row.pause} />
              </td>
              <td className="py-2.5 pr-3 tabular-nums text-slate-300 max-sm:p-0">
                <CellLabel className="text-semantic-easing-fg">Resume line</CellLabel>
                <LineCell value={row.resume} />
              </td>
              {showChanged ? (
                <td className={`py-2.5 pr-3 text-slate-300 max-sm:col-span-2 max-sm:p-0 ${row.changed ? "" : "max-sm:hidden"}`.trim()}>
                  <CellLabel className="text-slate-400">Changed</CellLabel>
                  {row.changed ?? <span className="text-slate-500">—</span>}
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
