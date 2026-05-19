"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useLocalStorageState } from "../../../lib/hooks/useLocalStorageState";

const COMPLETE_KEY = "whether_reviewed";

export function RitualComplete({ recordDate }: { recordDate?: string }) {
  const [data, setData] = useLocalStorageState<Record<string, { reviewed: boolean }>>(COMPLETE_KEY, {});

  const reviewed = recordDate ? data[recordDate]?.reviewed ?? false : false;

  const { streak, totalReviews } = useMemo(() => {
    const values = Object.values(data);
    const keys = Object.keys(data).sort().reverse();
    let s = 0;
    for (const key of keys) {
      if (data[key]?.reviewed) s++;
      else break;
    }
    return { streak: s, totalReviews: values.filter((v) => v.reviewed).length };
  }, [data]);

  const handleReview = () => {
    if (!recordDate) return;
    setData((prev) => ({
      ...prev,
      [recordDate]: { reviewed: !reviewed },
    }));
  };

  if (!recordDate) return null;

  return (
    <div className="weather-card space-y-2">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleReview}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-fluid-xs font-semibold tracking-[0.08em] transition-colors ${
            reviewed
              ? "bg-emerald-500/12 text-emerald-200 border border-emerald-500/30"
              : "bg-slate-800/50 text-slate-300 border border-slate-700/60 hover:border-sky-500/40"
          }`}
        >
          <span className={`${reviewed ? "opacity-100" : "opacity-40"}`}>
            {reviewed ? "✓" : "○"}
          </span>
          {reviewed ? "Reviewed" : "Mark as reviewed"}
        </button>
        {streak > 1 ? (
          <span className="text-fluid-micro text-slate-500">
            {streak}-week streak {streak >= 4 ? "🔥" : ""}
          </span>
        ) : null}
      </div>

      {totalReviews >= 4 ? (
        <div className="flex items-center gap-2 text-fluid-micro text-slate-500">
          <span>{totalReviews} briefs reviewed</span>
          <span className="text-slate-700">·</span>
          <Link href="/history" className="text-sky-400 hover:text-sky-300 no-underline">
            See your history →
          </Link>
        </div>
      ) : null}
    </div>
  );
}
