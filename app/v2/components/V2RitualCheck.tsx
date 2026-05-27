"use client";

import { useMemo } from "react";
import { useLocalStorageState } from "../../../lib/hooks/useLocalStorageState";

const COMPLETE_KEY = "whether_reviewed";

export function V2RitualCheck({ recordDate }: { recordDate?: string }) {
  const [data, setData] = useLocalStorageState<Record<string, { reviewed: boolean }>>(COMPLETE_KEY, {});

  const reviewed = recordDate ? data[recordDate]?.reviewed ?? false : false;
  const streak = useMemo(() => {
    const keys = Object.keys(data).sort().reverse();
    let s = 0;
    for (const key of keys) {
      if (data[key]?.reviewed) s++;
      else break;
    }
    return s;
  }, [data]);

  const handleToggle = () => {
    if (!recordDate) return;
    setData((prev) => ({
      ...prev,
      [recordDate]: { reviewed: !reviewed },
    }));
  };

  if (!recordDate) return null;

  return (
    <div className="weather-card flex items-center justify-between">
      <button
        type="button"
        onClick={handleToggle}
        className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
          reviewed
            ? "bg-emerald-500/12 text-emerald-300 border border-emerald-500/30"
            : "bg-slate-800/50 text-slate-400 border border-slate-700/60 hover:border-slate-600"
        }`}
      >
        <span className={reviewed ? "" : "opacity-40"}>
          {reviewed ? "✓" : "○"}
        </span>
        {reviewed ? "Reviewed" : "Mark reviewed"}
      </button>
      {streak >= 4 ? (
        <span className="text-[0.6rem] text-slate-600">
          {streak}-week streak
        </span>
      ) : null}
    </div>
  );
}
