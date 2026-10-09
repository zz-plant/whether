import Link from "next/link";
import type { ReactNode } from "react";
import {
  decisionAreaLabel,
  decisionAreaOrder,
  decisionAreaUsualMetrics,
  type DecisionArea,
  type RuleConditionMetric,
} from "../../../lib/report/boundedDecisionRules";
import type { LineState } from "../../../lib/report/operatingCalls";
import type { Route } from "../../../lib/navigation/routeType";
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
  /** The pause line, the distance to it as the caller formats it, and its state for the badge. */
  pause?: AreaLineValue;
  /** The resume line, the distance to it, and its state once it is met. */
  resume?: AreaLineValue;
  /**
   * The scores the printed lines are drawn on, for the "Line set by" note
   * under the area. Absent on a row whose lines are sentences, which falls back
   * to the score the area is usually ruled by.
   */
  scores?: readonly RuleConditionMetric[];
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
   * Where the "Line set by" links find the two scores. They name anchors only
   * the brief draws (`WhatChangedSection`), so a table on another page passes
   * "/" to send them there; left empty, they stay in the page.
   */
  signalLinkBase?: "" | "/";
};

const orderIndex = (area: DecisionArea) => decisionAreaOrder.indexOf(area);

/*
 * The scores named under the area are the scores its printed lines are drawn
 * on. They were fixed per area, so on a week New bets paused on funding
 * pressure the row read "Line set by Risk appetite" over "Funding pressure >
 * 76", and Hiring's "Funding pressure > 76 or Risk appetite < 44" sat under
 * "Line set by Funding pressure".
 */
const scoresSettingRow = (row: AreaRowData): readonly RuleConditionMetric[] => {
  const named = row.scores && row.scores.length > 0 ? row.scores : decisionAreaUsualMetrics(row.area);
  return (["tightness", "riskAppetite"] as const).filter((score) => named.includes(score));
};

/* The column names, repeated inside each cell for the stacked phone layout,
   where the header row is not drawn. Hidden from md up, where the header is. */
const CellLabel = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <span className={`mb-0.5 block text-xs font-medium md:hidden ${className}`.trim()}>{children}</span>
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
     crossed, or a resume line met. A distance still to go stays unframed. A
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

/**
 * A table from md up. Below it the four columns do not fit a phone — the
 * resume line sat off the right edge behind a sideways scroll — so each row
 * restacks as a block: the area, the rule across the full width, then the
 * pause and resume lines side by side, each labelled in its cell. One DOM for
 * both, so the row order and content cannot drift between layouts.
 */
export function AreaTable({ rows, caption, className = "", signalLinkBase = "" }: AreaTableProps) {
  const fundingHref = `${signalLinkBase}#signal-funding-pressure`;
  const riskHref = `${signalLinkBase}#signal-risk-appetite`;
  const ordered = [...rows].sort((a, b) => orderIndex(a.area) - orderIndex(b.area));
  const showChanged = ordered.some((row) => row.changed);
  const showAction = ordered.some((row) => row.action);
  return (
    <div className={`md:overflow-x-auto overscroll-x-contain ${className}`.trim()}>
      <table className="w-full border-collapse text-left text-sm max-md:block md:min-w-[36rem]">
        <caption className="sr-only">{caption}</caption>
        <thead className="max-md:hidden">
          <tr className="border-b border-slate-800/80 text-xs text-slate-400">
            <th scope="col" className="py-2 pr-3 font-medium">Area</th>
            <th scope="col" className="py-2 pr-3 font-medium">This week</th>
            <th scope="col" className="py-2 pr-3 font-medium text-semantic-caution-fg">Pause line</th>
            <th scope="col" className="py-2 pr-3 font-medium text-semantic-easing-fg">Resume line</th>
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
              id={`area-${row.area}`}
              /* The space before each `${` is load-bearing: Tailwind reads a class
                 glued to an interpolation ("max-md:py-3${") as one token it cannot
                 parse and never generates it (tests/tailwindClassBoundaries).
                 On a phone the moved row's tint is inset from its text. */
              className={`border-b border-slate-800/50 align-top max-md:grid max-md:grid-cols-2 max-md:gap-x-4 max-md:gap-y-2 max-md:py-3 ${
                row.moved ? "bg-amber-500/[0.06] max-md:-mx-2 max-md:rounded-md max-md:px-2" : ""
              }`}
              data-area={row.area}
              data-moved={row.moved ? "true" : undefined}
            >
              <th scope="row" className="py-2.5 pr-3 font-semibold text-slate-100 max-md:col-span-2 max-md:p-0">
                {row.href ? (
                  <Link
                    href={row.href}
                    className="weather-hit inline-flex items-center gap-1.5 underline decoration-slate-600 underline-offset-4 hover:text-white"
                  >
                    <AreaIcon area={row.area} />
                    {row.hrefLabel ?? decisionAreaLabel(row.area)}
                  </Link>
                ) : (
                  <AreaLabel area={row.area} />
                )}
                <span className="mt-0.5 block text-fluid-nano font-normal text-slate-400">
                  {(() => {
                    const scores = scoresSettingRow(row);
                    const links = scores.map((score) => (
                      <a
                        key={score}
                        href={score === "tightness" ? fundingHref : riskHref}
                        className="weather-hit underline decoration-slate-600 underline-offset-2 hover:text-sky-300"
                      >
                        {score === "tightness" ? "Funding pressure" : "Risk appetite"}
                      </a>
                    ));
                    return scores.length > 1 ? (
                      <>Lines set by {links[0]} &amp; {links[1]}</>
                    ) : (
                      <>Line set by {links[0]}</>
                    );
                  })()}
                </span>
              </th>
              <td className="py-2.5 pr-3 text-slate-200 max-md:col-span-2 max-md:p-0">
                {row.rule}
                {row.note}
              </td>
              <td className="py-2.5 pr-3 tabular-nums text-slate-300 max-md:p-0">
                <CellLabel className="text-semantic-caution-fg">Pause line</CellLabel>
                <LineCell value={row.pause} kind="pause" />
              </td>
              <td className="py-2.5 pr-3 tabular-nums text-slate-300 max-md:p-0">
                <CellLabel className="text-semantic-easing-fg">Resume line</CellLabel>
                <LineCell value={row.resume} kind="resume" />
              </td>
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
