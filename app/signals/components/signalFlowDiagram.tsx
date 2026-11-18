"use client";

import { useState } from "react";
import type { SignalFlow } from "../../../lib/report/signalFlow";
import { AreaIcon } from "../../components/ui/conceptIcons";
import { TrendGlyph, trendDirectionFromDelta, trendToneClass } from "../../components/illustrations/TrendGlyph";

/**
 * Inputs → scores → areas, beside the table (2026-11-18): the two market inputs, the two
 * scores they feed, and the five areas whose lines the scores set, an edge per feed and
 * per governed area (`buildSignalFlow`, from the table's rows). It replaces the line under
 * each row that said the same in words ("Feeds into Funding pressure", "Affects: Hiring,
 * Fundraising, Spending"), which the rows keep for a screen reader.
 *
 * Pointing at a node, or focusing it, lights every path through it and dims the rest; the
 * edges are drawn either way, so a touch screen reads the same diagram. Every node is a
 * link: a signal to its row in the table, an area to the brief opened on it. A signal that
 * moved since the earlier reading carries its trend glyph.
 *
 * The labels are HTML, so they wrap and zoom (ui-ux-standards §XVII); the edges are one
 * SVG stretched over the same box. Each column is a grid of equal rows with its node
 * centred in its row, so a node's centre is at (i + ½) / n of the height in both, and a
 * node spans its column, so an edge meets its box at the column's edge.
 */
const COLUMNS = [
  { column: "input", left: 0, right: 26 },
  { column: "score", left: 35, right: 60 },
  { column: "area", left: 69, right: 100 },
] as const;

const HEIGHT_REM = 14;

type FlowNode = SignalFlow["nodes"][number];

export function SignalFlowDiagram({ flow }: { flow: SignalFlow }) {
  const [active, setActive] = useState<string | null>(null);
  const lit = active ? new Set(flow.reach[active] ?? [active]) : null;
  const columnOf = (column: FlowNode["column"]) => flow.nodes.filter((node) => node.column === column);
  const centre = (id: string) => {
    const node = flow.nodes.find((candidate) => candidate.id === id);
    if (!node) return null;
    const siblings = columnOf(node.column);
    const index = siblings.findIndex((candidate) => candidate.id === id);
    const bounds = COLUMNS.find((entry) => entry.column === node.column);
    return bounds ? { y: ((index + 0.5) / siblings.length) * 100, left: bounds.left, right: bounds.right } : null;
  };
  const dim = (on: boolean) => (lit && !on ? "opacity-25" : "opacity-100");

  return (
    <figure className="max-w-[40rem]" data-signal-flow>
      <div
        className="relative"
        style={{ height: `${HEIGHT_REM}rem` }}
        onPointerLeave={() => setActive(null)}
      >
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
          className="absolute inset-0 h-full w-full overflow-visible text-slate-400"
        >
          {flow.edges.map((edge) => {
            const from = centre(edge.from);
            const to = centre(edge.to);
            if (!from || !to) return null;
            const x1 = from.right;
            const x2 = to.left;
            const mid = (x1 + x2) / 2;
            const on = !lit || (lit.has(edge.from) && lit.has(edge.to));
            return (
              <path
                key={`${edge.from}-${edge.to}`}
                data-signal-flow-edge={`${edge.from} ${edge.to}`}
                d={`M${x1},${from.y} C${mid},${from.y} ${mid},${to.y} ${x2},${to.y}`}
                fill="none"
                stroke="currentColor"
                strokeWidth={lit && on ? 2 : 1.25}
                strokeDasharray={edge.condition ? "4 3" : undefined}
                vectorEffect="non-scaling-stroke"
                className={`transition-opacity duration-150 motion-reduce:transition-none ${dim(on)}`}
              />
            );
          })}
        </svg>
        {COLUMNS.map((bounds) => (
          <ul
            key={bounds.column}
            aria-label={bounds.column === "input" ? "Market inputs" : bounds.column === "score" ? "Scores" : "Areas"}
            className="absolute inset-y-0 grid"
            style={{
              left: `${bounds.left}%`,
              width: `${bounds.right - bounds.left}%`,
              gridTemplateRows: `repeat(${columnOf(bounds.column).length}, minmax(0, 1fr))`,
            }}
          >
            {columnOf(bounds.column).map((node) => {
              const direction = trendDirectionFromDelta(node.delta);
              return (
                <li key={node.id} className={`self-center transition-opacity duration-150 motion-reduce:transition-none ${dim(!lit || lit.has(node.id))}`}>
                  <a
                    href={node.href}
                    data-signal-flow-node={node.id}
                    onPointerEnter={() => setActive(node.id)}
                    onFocus={() => setActive(node.id)}
                    onBlur={() => setActive(null)}
                    className={`weather-hit-box flex min-h-8 w-full items-center gap-1 rounded-lg border border-[color:var(--border-subtle)] bg-[var(--bg-body)] px-1.5 py-1 text-fluid-nano leading-tight text-slate-200 underline decoration-slate-600 underline-offset-2 hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent-action)] ${
                      bounds.column === "input" ? "justify-end text-right" : bounds.column === "score" ? "justify-center text-center font-semibold" : "justify-start"
                    }`}
                    style={{ touchAction: "manipulation" }}
                  >
                    {node.area ? <AreaIcon area={node.area} className="shrink-0" /> : null}
                    <span>{node.label}</span>
                    {node.column !== "area" && direction !== "flat" ? (
                      <>
                        <TrendGlyph
                          direction={direction}
                          className={`h-3 w-3 shrink-0 ${trendToneClass(direction, node.betterWhen === "higher")}`}
                        />
                        {node.moved ? <span className="sr-only">{`, ${node.moved}`}</span> : null}
                      </>
                    ) : null}
                  </a>
                </li>
              );
            })}
          </ul>
        ))}
      </div>
      <figcaption className="mt-2 max-w-[60ch] text-fluid-nano text-slate-400">{flow.caption}</figcaption>
    </figure>
  );
}
