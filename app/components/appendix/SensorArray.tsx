"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  SensorReading,
  SensorTimeWindow,
} from "../../../lib/types";
import {
  getSensorWindowAggregation,
  sensorTimeWindows,
} from "../../../lib/sensors";
import { DataProvenanceStrip, type DataProvenance } from "../dataProvenanceStrip";
import { SeriesFreshnessBadge } from "./SeriesFreshnessBadge";
import {
  buildSparkline,
  formatDelta,
  formatNumber,
  SPARKLINE_HEIGHT,
  SPARKLINE_WIDTH,
} from "../reportSectionUtils";
import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";

export const SensorArray = ({
  sensors,
  provenance,
}: {
  sensors: SensorReading[];
  provenance: DataProvenance;
}) => {
  const [selectedWindow, setSelectedWindow] = useState<SensorTimeWindow>("3M");

  const availableWindows = useMemo(() => {
    const windowSet = new Set<SensorTimeWindow>();
    sensors.forEach((sensor) => {
      sensor.availableTimeWindows?.forEach((window) => windowSet.add(window));
    });
    if (windowSet.size === 0) {
      return sensorTimeWindows;
    }
    return sensorTimeWindows.filter((window) => windowSet.has(window.id));
  }, [sensors]);

  useEffect(() => {
    if (!availableWindows.find((window) => window.id === selectedWindow)) {
      setSelectedWindow(availableWindows[0]?.id ?? "3M");
    }
  }, [availableWindows, selectedWindow]);

  const activeWindow =
    availableWindows.find((window) => window.id === selectedWindow) ?? availableWindows[0];
  const mostChanged = useMemo(() => {
    const candidates = sensors.flatMap((sensor) => {
      const aggregation = getSensorWindowAggregation(sensor, selectedWindow);
      const change = aggregation?.change;
      return typeof change === "number" ? [{ sensor, aggregation, change }] : [];
    });

    if (!candidates.length) {
      return null;
    }

    return candidates.reduce((best, entry) =>
      Math.abs(entry.change) > Math.abs(best.change) ? entry : best,
    );
  }, [sensors, selectedWindow]);

  return (
    <section id="sensor-array" aria-labelledby="sensor-array-title" className="mt-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 id="sensor-array-title" className="type-label text-slate-400">
          Live Sensor Array
        </h3>
        <DataProvenanceStrip provenance={provenance} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr,0.8fr]">
        <div className="weather-panel p-6">
          <p className="type-label text-slate-400">Primary market pulse</p>
          <h4 className="mt-2 text-lg font-semibold text-slate-100">Signal spotlight</h4>
          <p className="mt-2 text-sm text-slate-300">
            Tracking {sensors.length} signal{sensors.length === 1 ? "" : "s"}.
          </p>
          {mostChanged ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-[1.1fr,0.9fr]">
              <div>
                <p className="text-sm text-slate-300">{mostChanged.sensor.label}</p>
                <p className="mono mt-2 text-3xl text-slate-100">
                  {formatDelta(mostChanged.change ?? null, mostChanged.sensor.unit)}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  {activeWindow.label} change · Current{" "}
                  <span className="text-slate-300">
                    {formatNumber(mostChanged.sensor.value, mostChanged.sensor.unit)}
                  </span>{" "}
                  · Prior{" "}
                  <span className="text-slate-300">
                    {formatNumber(
                      mostChanged.aggregation?.previousValue ?? null,
                      mostChanged.sensor.unit,
                    )}
                  </span>
                </p>
              </div>
              <div className="rounded-2xl border border-slate-800/70 bg-slate-950/70 p-4 text-xs text-slate-400">
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Leading group
                </p>
                <p className="mt-2 text-sm text-slate-200">{mostChanged.sensor.group.label}</p>
                <p className="mt-2 text-slate-500">{mostChanged.sensor.group.description}</p>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">No measurable change in this window.</p>
          )}
        </div>
        <div className="weather-panel p-5">
          <p className="type-label text-slate-400">Window</p>
          <ToggleGroup
            value={[selectedWindow]}
            onValueChange={(value) => {
              const nextValue = value[0] as SensorTimeWindow | undefined;
              if (nextValue) {
                setSelectedWindow(nextValue);
              }
            }}
            className="mt-3 flex flex-wrap gap-2"
          >
            {availableWindows.map((window) => (
              <Toggle
                key={window.id}
                value={window.id}
                className="min-h-[44px] rounded-full border border-slate-800/70 px-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-300 transition-colors data-[pressed]:border-sky-400/70 data-[pressed]:bg-sky-500/15 data-[pressed]:text-slate-100 touch-manipulation"
              >
                {window.label}
              </Toggle>
            ))}
          </ToggleGroup>
          {activeWindow ? <p className="mt-3 text-xs text-slate-500">{activeWindow.description}</p> : null}
        </div>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {sensors.map((sensor) => {
          const hasTrend = Boolean(sensor.trend?.length);
          const sparkline = buildSparkline(hasTrend ? sensor.trend : sensor.history);
          const sparklineId = `sensor-spark-${sensor.id}`;
          const windowAggregation = getSensorWindowAggregation(sensor, selectedWindow);

          return (
            <div key={sensor.id} className="weather-panel rounded-2xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="break-words text-sm text-slate-300">{sensor.label}</p>
                  <p className="mono mt-2 text-2xl text-slate-100">
                    {formatNumber(sensor.value, sensor.unit)}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    Δ {activeWindow.label}{" "}
                    <span className="text-slate-300">
                      {formatDelta(windowAggregation?.change ?? null, sensor.unit)}
                    </span>
                  </p>
                </div>
                <span className="weather-pill px-2 py-1 text-xs font-semibold tracking-[0.12em] text-slate-400">
                  {provenance.statusLabel}
                </span>
              </div>
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
                        <stop offset="0%" stopColor="rgba(56,189,248,0.35)" />
                        <stop offset="100%" stopColor="rgba(56,189,248,0)" />
                      </linearGradient>
                    </defs>
                    {sparkline.areas.map((area, areaIndex) => (
                      <path key={`area-${sensor.id}-${areaIndex}`} d={area} fill={`url(#${sparklineId})`} pathLength={100} />
                    ))}
                    {sparkline.paths.map((path, pathIndex) => (
                      <path
                        key={`path-${sensor.id}-${pathIndex}`}
                        d={path}
                        fill="none"
                        stroke="#38bdf8"
                        strokeWidth="1.5"
                        vectorEffect="non-scaling-stroke"
                        pathLength={100}
                      />
                    ))}
                    <circle cx={sparkline.latest.x} cy={sparkline.latest.y} r="1.8" fill="#e2e8f0" />
                  </svg>
                ) : (
                  <div
                    className="h-8 rounded-md border border-sky-900/40 bg-slate-950/80"
                    aria-hidden="true"
                  />
                )}
                <figcaption className="mt-3 space-y-2 text-xs text-slate-400">
                  {hasTrend ? (
                    <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      12-month trend (cache)
                    </p>
                  ) : null}
                  {sparkline ? (
                    <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      {sparkline.direction === "up" ? "Direction up" : sparkline.direction === "down" ? "Direction down" : "Direction flat"} · Δ {formatDelta(sparkline.delta, sensor.unit)}
                    </p>
                  ) : null}
                  {sparkline?.hasGaps ? (
                    <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Breaks mark missing readings
                    </p>
                  ) : null}
                  <p className="break-words">{sensor.explanation}</p>
                </figcaption>
              </figure>
              <div className="mt-4 text-xs text-slate-300">
                <p>
                  Formula:{" "}
                  <a
                    href={sensor.formulaUrl}
                    className="touch-target text-slate-300 underline decoration-slate-500 underline-offset-4 hover:text-slate-100"
                  >
                    Formula notes
                  </a>
                </p>
                <div className="mt-3">
                  <SeriesFreshnessBadge
                    sourceLabel={sensor.sourceLabel}
                    sourceUrl={sensor.sourceUrl}
                    recordDate={sensor.record_date}
                    fetchedAt={sensor.fetched_at}
                    isLive={sensor.isLive}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
