"use client";

import type { MacroSeriesReading } from "../../../lib/types";
import { buildMacroPriorityScore, rankMacroSignalsByPriority } from "../../../lib/macroPrioritization";
import { useMemo } from "react";
import { DataProvenanceStrip, type DataProvenance } from "../dataProvenanceStrip";
import { CollapsibleDeepDive } from "../collapsibleDeepDive";
import { SeriesFreshnessBadge } from "./SeriesFreshnessBadge";
import {
  buildSparkline,
  formatDelta,
  formatNumber,
  SPARKLINE_HEIGHT,
  SPARKLINE_WIDTH,
} from "../reportSectionUtils";

export const MacroSignalsPanel = ({
  series,
  provenance,
}: {
  series: MacroSeriesReading[];
  provenance: DataProvenance;
}) => {
  const prioritizedSeries = useMemo(() => rankMacroSignalsByPriority(series), [series]);

  return (
    <section id="macro-signals" aria-labelledby="macro-signals-title" className="mt-10">
      <div className="weather-panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="type-label text-slate-400">Macro signals</p>
            <h3 id="macro-signals-title" className="type-section text-slate-100">
              Expanded signal pack
            </h3>
            <p className="mt-2 type-data text-slate-300">
              Supplement Treasury yields with inflation, labor health, and credit stress indicators.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="weather-pill px-3 py-1 text-xs font-semibold tracking-[0.12em] text-slate-300">
              {provenance.statusLabel}
            </span>
            <DataProvenanceStrip provenance={provenance} />
          </div>
        </div>
        <div className="mt-4 weather-surface p-4">
          <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">Executive summary</p>
          <p className="mt-2 text-sm text-slate-200">
            Use this expanded pack to validate the Treasury-led climate call against inflation,
            labor, and credit stress signals.
          </p>
          <p className="mt-2 text-xs text-slate-400">
            Cards are ranked by action impact × recency so the first scan surfaces the most urgent
            checks.
          </p>
        </div>
        <CollapsibleDeepDive label="Deep dive: signal cards and freshness checks" panelClassName="mt-4 grid gap-4 md:grid-cols-3">
          {prioritizedSeries.map((signal, index) => {
            const sparkline = buildSparkline(signal.history);
            const sparklineId = `macro-spark-${signal.id}`;
            const priority = buildMacroPriorityScore(signal);

            return (
              <div key={signal.id} className="weather-surface rounded-2xl p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
                    {signal.label}
                  </p>
                  <span className="rounded-full border border-sky-400/40 bg-sky-500/10 px-2 py-1 text-[10px] font-semibold tracking-[0.14em] text-sky-100">
                    Priority #{index + 1}
                  </span>
                </div>
                <p className="mono mt-3 text-2xl text-slate-100">
                  {formatNumber(signal.value, signal.unit)}
                </p>
                <p className="mt-2 text-xs text-slate-400">
                  Impact {Math.round(priority.impact * 100)} · Recency {Math.round(priority.recency * 100)}
                </p>
                <figure className="mt-3">
                  {sparkline ? (
                    <svg
                      viewBox={`0 0 ${SPARKLINE_WIDTH} ${SPARKLINE_HEIGHT}`}
                      className="h-8 w-full"
                      aria-hidden="true"
                      focusable="false"
                      preserveAspectRatio="none"
                    >
                      <defs>
                        <linearGradient id={sparklineId} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="rgba(251,191,36,0.3)" />
                          <stop offset="100%" stopColor="rgba(251,191,36,0)" />
                        </linearGradient>
                      </defs>
                      {sparkline.areas.map((area, areaIndex) => (
                        <path key={`area-${signal.id}-${areaIndex}`} d={area} fill={`url(#${sparklineId})`} pathLength={100} />
                      ))}
                      {sparkline.paths.map((path, pathIndex) => (
                        <path
                          key={`path-${signal.id}-${pathIndex}`}
                          d={path}
                          fill="none"
                          stroke="#fbbf24"
                          strokeWidth="1.5"
                          vectorEffect="non-scaling-stroke"
                          pathLength={100}
                        />
                      ))}
                      <circle cx={sparkline.latest.x} cy={sparkline.latest.y} r="1.8" fill="#fde68a" />
                    </svg>
                  ) : (
                    <div
                      className="h-8 rounded-md border border-sky-900/40 bg-slate-950/80"
                      aria-hidden="true"
                    />
                  )}
                  <figcaption className="mt-2 space-y-1 text-xs text-slate-500">
                    {sparkline ? (
                      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        {sparkline.direction === "up" ? "Direction up" : sparkline.direction === "down" ? "Direction down" : "Direction flat"} · Δ {formatDelta(sparkline.delta, signal.unit)}
                      </p>
                    ) : null}
                    {sparkline?.hasGaps ? (
                      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Breaks mark missing readings
                      </p>
                    ) : null}
                    {!signal.isLive ? (
                      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Cache-backed read
                      </p>
                    ) : null}
                    <p>{signal.explanation}</p>
                  </figcaption>
                </figure>
                <div className="mt-3 text-xs text-slate-500">
                  <p>
                    Formula:{" "}
                    <a
                      href={signal.formulaUrl}
                      className="touch-target text-slate-300 underline decoration-slate-500 underline-offset-4 hover:text-slate-100"
                    >
                      Formula notes
                    </a>
                  </p>
                  <div className="mt-3">
                    <SeriesFreshnessBadge
                      sourceLabel={signal.sourceLabel}
                      sourceUrl={signal.sourceUrl}
                      recordDate={signal.record_date}
                      fetchedAt={signal.fetched_at}
                      isLive={signal.isLive}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </CollapsibleDeepDive>
      </div>
    </section>
  );
};
