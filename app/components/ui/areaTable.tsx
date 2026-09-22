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

export function AreaTable({ rows, caption, className = "" }: AreaTableProps) {
  const ordered = [...rows].sort((a, b) => orderIndex(a.area) - orderIndex(b.area));
  const showChanged = ordered.some((row) => row.changed);
  return (
    <div className={`overflow-x-auto ${className}`.trim()}>
      <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-slate-800/80 text-xs text-slate-400">
            <th scope="col" className="py-2 pr-3 font-medium">Area</th>
            <th scope="col" className="py-2 pr-3 font-medium">This week</th>
            <th scope="col" className="py-2 pr-3 font-medium text-semantic-caution-fg">Pause line</th>
            <th scope="col" className="py-2 pr-3 font-medium text-semantic-easing-fg">Resume line</th>
            {showChanged ? <th scope="col" className="py-2 pr-3 font-medium">Changed</th> : null}
          </tr>
        </thead>
        <tbody>
          {ordered.map((row) => (
            <tr key={row.area} className="border-b border-slate-800/50 align-top" data-area={row.area}>
              <th scope="row" className="py-2.5 pr-3 font-semibold text-slate-100">
                {row.href ? (
                  <Link href={row.href} className="underline decoration-slate-600 underline-offset-4 hover:text-white">
                    {row.hrefLabel ?? decisionAreaLabel(row.area)}
                  </Link>
                ) : (
                  decisionAreaLabel(row.area)
                )}
              </th>
              <td className="py-2.5 pr-3 text-slate-200">
                {row.rule}
                {row.note}
              </td>
              <td className="py-2.5 pr-3 tabular-nums text-slate-300">
                {row.pause ? (
                  <>
                    {row.pause.line}
                    {row.pause.distance ? <span className="block text-xs text-slate-400">{row.pause.distance}</span> : null}
                  </>
                ) : (
                  <span className="text-slate-500">—</span>
                )}
              </td>
              <td className="py-2.5 pr-3 tabular-nums text-slate-300">
                {row.resume ? (
                  <>
                    {row.resume.line}
                    {row.resume.distance ? <span className="block text-xs text-slate-400">{row.resume.distance}</span> : null}
                  </>
                ) : (
                  <span className="text-slate-500">—</span>
                )}
              </td>
              {showChanged ? <td className="py-2.5 pr-3 text-slate-300">{row.changed ?? <span className="text-slate-500">—</span>}</td> : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
