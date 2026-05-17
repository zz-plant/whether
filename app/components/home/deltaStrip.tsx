"use client";

import { useEffect, useState } from "react";

const SNAPSHOT_KEY = "whether_home_delta_snapshot";

type ScoreSnapshot = {
  tightness: number;
  riskAppetite: number;
  recordDate: string;
};

export function HomeDeltaStrip({
  tightness,
  riskAppetite,
  recordDate,
}: {
  tightness: number;
  riskAppetite: number;
  recordDate: string;
}) {
  const [previous, setPrevious] = useState<ScoreSnapshot | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SNAPSHOT_KEY);
      if (stored) {
        setPrevious(JSON.parse(stored));
      }
    } catch {
      /* noop */
    }
    localStorage.setItem(
      SNAPSHOT_KEY,
      JSON.stringify({ tightness, riskAppetite, recordDate }),
    );
  }, [tightness, riskAppetite, recordDate]);

  if (!previous || previous.recordDate === recordDate) return null;

  const tightDelta = tightness - previous.tightness;
  const riskDelta = riskAppetite - previous.riskAppetite;
  const hasChange = Math.abs(tightDelta) >= 1 || Math.abs(riskDelta) >= 1;

  if (!hasChange) return null;

  const formatDelta = (val: number) =>
    `${val > 0 ? "+" : ""}${val}`;

  return (
    <div className="mb-3 rounded-lg border border-sky-500/20 bg-slate-950/60 px-4 py-3 text-xs sm:px-5 sm:text-sm">
      <p className="text-fluid-micro font-semibold uppercase tracking-[0.14em] text-slate-400">
        Since last week
      </p>
      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
        {tightDelta !== 0 ? (
          <span className={tightDelta > 0 ? "text-amber-200" : "text-emerald-200"}>
            Tightness {formatDelta(tightDelta)} (now {tightness})
          </span>
        ) : null}
        {riskDelta !== 0 ? (
          <span className={riskDelta > 0 ? "text-emerald-200" : "text-amber-200"}>
            Risk appetite {formatDelta(riskDelta)} (now {riskAppetite})
          </span>
        ) : null}
      </div>
    </div>
  );
}
