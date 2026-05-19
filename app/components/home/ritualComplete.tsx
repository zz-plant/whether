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
        {streak >= 4 ? (
          <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-fluid-micro font-medium text-amber-200">
            {streak}-week streak 🔥
          </span>
        ) : streak > 1 ? (
          <span className="text-fluid-micro text-slate-500">
            {streak}-week streak
          </span>
        ) : null}
      </div>

      {reviewed ? (
        <Link href="/share" className="inline-flex items-center gap-1 text-fluid-micro text-slate-500 hover:text-sky-200 transition-colors no-underline">
          Share this brief with your team →
        </Link>
      ) : null}

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
