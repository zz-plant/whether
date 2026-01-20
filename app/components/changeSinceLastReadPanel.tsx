/**
 * Panel for summarizing changes since the last report view.
 * Persists a lightweight snapshot in localStorage for delta comparisons.
 */
"use client";

import { useEffect, useMemo, useState } from "react";
import type { RegimeAssessment, RegimeKey } from "../../lib/regimeEngine";
import { DataProvenanceStrip, type DataProvenance } from "./dataProvenanceStrip";

type LastReadSnapshot = {
  recordDate: string;
  regime: RegimeKey;
  tightness: number;
  riskAppetite: number;
  baseRate: number;
  curveSlope: number | null;
  readAt: string;
};

const storageKey = "whether.lastReadSnapshot";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeZone: "UTC",
});

const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? value : dateFormatter.format(date);
};

const formatDelta = (thenValue: number, nowValue: number, unit = "") => {
  const delta = nowValue - thenValue;
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta.toFixed(2)}${unit}`;
};

const formatOptionalDelta = (thenValue: number | null, nowValue: number | null, unit = "") =>
  thenValue === null || nowValue === null ? "—" : formatDelta(thenValue, nowValue, unit);

export const ChangeSinceLastReadPanel = ({
  assessment,
  recordDate,
  provenance,
}: {
  assessment: RegimeAssessment;
  recordDate: string;
  provenance: DataProvenance;
}) => {
  const [previous, setPrevious] = useState<LastReadSnapshot | null>(null);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as LastReadSnapshot;
        if (parsed?.recordDate) {
          setPrevious(parsed);
        }
      }
    } catch {
      // Ignore storage errors to keep console clean.
    }

    const nextSnapshot: LastReadSnapshot = {
      recordDate,
      regime: assessment.regime,
      tightness: assessment.scores.tightness,
      riskAppetite: assessment.scores.riskAppetite,
      baseRate: assessment.scores.baseRate,
      curveSlope: assessment.scores.curveSlope,
      readAt: new Date().toISOString(),
    };

    try {
      window.localStorage.setItem(storageKey, JSON.stringify(nextSnapshot));
    } catch {
      // Ignore storage errors to keep console clean.
    }
  }, [assessment, recordDate]);

  const timeMachineLink = useMemo(() => {
    if (!previous) {
      return "/signals#time-machine";
    }
    const date = new Date(previous.recordDate);
    if (Number.isNaN(date.valueOf())) {
      return "/signals#time-machine";
    }
    const month = date.getUTCMonth() + 1;
    const year = date.getUTCFullYear();
    return `/?month=${month}&year=${year}`;
  }, [previous]);

  const hasChange =
    previous &&
    (previous.recordDate !== recordDate ||
      previous.regime !== assessment.regime ||
      previous.tightness !== assessment.scores.tightness ||
      previous.riskAppetite !== assessment.scores.riskAppetite ||
      previous.baseRate !== assessment.scores.baseRate ||
      previous.curveSlope !== assessment.scores.curveSlope);

  return (
    <section
      id="change-since-last-read"
      aria-labelledby="change-since-last-read-title"
      className="mt-10"
    >
      <div className="weather-panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="type-label text-slate-400">What changed since last read</p>
            <h3 id="change-since-last-read-title" className="type-section text-slate-100">
              Delta snapshot
            </h3>
            <p className="mt-2 type-data text-slate-300">
              Compare the current climate against the last report you opened, then jump to the
              Time Machine to replay that previous view.
            </p>
          </div>
          <DataProvenanceStrip provenance={provenance} />
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr,0.9fr]">
          <div className="weather-surface p-4">
            <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">Delta signals</p>
            <p className="mt-2 text-sm text-slate-200">
              Previous read:{" "}
              <span className="mono text-slate-100">
                {previous ? formatDate(previous.recordDate) : "—"}
              </span>
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3">
                <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
                  Regime shift
                </p>
                <p className="mt-2 text-sm text-slate-100">
                  {previous ? `${previous.regime} → ${assessment.regime}` : "—"}
                </p>
              </div>
              <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3">
                <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
                  Tightness delta
                </p>
                <p className="mt-2 text-sm text-slate-100">
                  {previous
                    ? formatDelta(previous.tightness, assessment.scores.tightness)
                    : "—"}
                </p>
              </div>
              <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3">
                <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
                  Risk appetite delta
                </p>
                <p className="mt-2 text-sm text-slate-100">
                  {previous
                    ? formatDelta(previous.riskAppetite, assessment.scores.riskAppetite)
                    : "—"}
                </p>
              </div>
              <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3">
                <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
                  Base rate delta
                </p>
                <p className="mt-2 text-sm text-slate-100">
                  {previous
                    ? formatDelta(previous.baseRate, assessment.scores.baseRate, "%")
                    : "—"}
                </p>
              </div>
              <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3">
                <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
                  Curve slope delta
                </p>
                <p className="mt-2 text-sm text-slate-100">
                  {previous
                    ? formatOptionalDelta(
                        previous.curveSlope,
                        assessment.scores.curveSlope,
                        "%"
                      )
                    : "—"}
                </p>
              </div>
            </div>
            <p className="mt-4 text-xs text-slate-400">
              {previous
                ? `Last read logged ${formatDate(previous.readAt)}.`
                : "No previous read captured yet. Open the report again to view a delta snapshot."}
            </p>
            {hasChange ? (
              <p className="mt-4 text-xs text-emerald-200">
                Changes detected since your last read.
              </p>
            ) : (
              <p className="mt-4 text-xs text-slate-500">
                No detected deltas yet. Keep checking as new Treasury data arrives.
              </p>
            )}
          </div>
          <div className="weather-surface p-4">
            <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
              Replay the last view
            </p>
            <p className="mt-3 text-sm text-slate-200">
              Use Time Machine to replay the exact month from your previous read and share the
              delta in leadership syncs.
            </p>
            <a
              href={timeMachineLink}
              className="weather-button mt-4 inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.2em] text-slate-100 transition-colors hover:border-sky-400/70 hover:text-slate-100 touch-manipulation"
            >
              Open Time Machine
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};
