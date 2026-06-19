"use client";

import { useMemo } from "react";
import { useLocalStorageState } from "../../../lib/hooks/useLocalStorageState";

const COMPLETE_KEY = "whether_reviewed";

export function RitualCheck({
  recordDate,
  recentRecordDates = [],
}: {
  recordDate?: string;
  recentRecordDates?: string[];
}) {
  const [data, setData] = useLocalStorageState<Record<string, { reviewed: boolean }>>(COMPLETE_KEY, {});

  const reviewed = recordDate ? data[recordDate]?.reviewed ?? false : false;
  const streak = useMemo(() => {
    if (recentRecordDates.length === 0) {
      const keys = Object.keys(data).sort().reverse();
      let s = 0;
      for (const key of keys) {
        if (data[key]?.reviewed) s++;
        else break;
      }
      return s;
    }

    const datesDesc = [...recentRecordDates].reverse();
    let s = 0;
    const startIdx = data[datesDesc[0]]?.reviewed ? 0 : 1;
    for (let i = startIdx; i < datesDesc.length; i++) {
      if (data[datesDesc[i]]?.reviewed) s++;
      else break;
    }
    return s;
  }, [recentRecordDates, data]);

  const recentWeeks = useMemo(() => {
    if (recentRecordDates.length === 0) {
      const keys = Object.keys(data).sort().reverse().slice(0, 4);
      return keys.map((k) => data[k]?.reviewed ?? false);
    }
    return recentRecordDates.map((d) => data[d]?.reviewed ?? false);
  }, [recentRecordDates, data]);

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
        aria-label={reviewed ? "Reviewed: remove confirmation" : "Mark reviewed: confirm this week"}
        className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-colors active:scale-[0.97] ${
          reviewed
            ? "bg-emerald-500/12 text-emerald-300 border border-emerald-500/30"
            : "bg-white/[0.04] text-white/40 border border-white/[0.06] hover:border-white/[0.12] focus-visible:outline-2 focus-visible:outline-sky-400"
        }`}
      >
        <span className={reviewed ? "" : "opacity-40"}>
          {reviewed ? "✓" : "○"}
        </span>
        {reviewed ? "Reviewed" : "Mark reviewed"}
      </button>
      <div className="flex items-center gap-1.5">
        {recentWeeks.length > 0 ? (
          <div className="flex items-center gap-1" title={`${recentWeeks.filter(Boolean).length} of last ${recentWeeks.length} weeks reviewed`}>
            {recentWeeks.map((r, i) => (
              <span
                key={i}
                className={`block w-1.5 h-1.5 rounded-full transition-colors ${
                  r ? "bg-emerald-400/60" : "bg-white/[0.08]"
                }`}
              />
            ))}
          </div>
        ) : null}
        {streak >= 1 ? (
          <span className="text-fluid-nano text-white/20">
            {streak}w
          </span>
        ) : null}
      </div>
    </div>
  );
}
