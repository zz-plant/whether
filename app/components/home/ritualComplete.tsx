"use client";

import { useEffect, useState } from "react";

const COMPLETE_KEY = "whether_reviewed";
const NOTE_KEY = "whether_decision_note";

export function RitualComplete({ recordDate }: { recordDate?: string }) {
  const [reviewed, setReviewed] = useState(false);
  const [streak, setStreak] = useState(0);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!recordDate) return;
    try {
      const stored = localStorage.getItem(COMPLETE_KEY);
      if (stored) {
        const data = JSON.parse(stored) as Record<string, { reviewed: boolean; note: string }>;
        if (data[recordDate]?.reviewed) setReviewed(true);
        if (data[recordDate]?.note) setNote(data[recordDate].note);
      }
      /* Calculate streak */
      const allKeys = Object.keys(JSON.parse(localStorage.getItem(COMPLETE_KEY) ?? "{}")).sort().reverse();
      let count = 0;
      for (const key of allKeys) {
        if (JSON.parse(localStorage.getItem(COMPLETE_KEY) ?? "{}")[key]?.reviewed) count++;
        else break;
      }
      setStreak(count);
    } catch { /* ignore */ }
  }, [recordDate]);

  const save = (reviewedStatus: boolean, noteText: string) => {
    if (!recordDate) return;
    try {
      const stored = JSON.parse(localStorage.getItem(COMPLETE_KEY) ?? "{}");
      stored[recordDate] = { reviewed: reviewedStatus, note: noteText };
      localStorage.setItem(COMPLETE_KEY, JSON.stringify(stored));
      localStorage.setItem(NOTE_KEY, noteText);
    } catch { /* ignore */ }
  };

  const handleReview = () => {
    const next = !reviewed;
    setReviewed(next);
    save(next, note);
  };

  const handleNoteSave = () => {
    setSaving(true);
    save(reviewed, note);
    setTimeout(() => setSaving(false), 1000);
  };

  if (!recordDate) return null;

  return (
    <div className="rounded-lg border border-slate-700/60 bg-slate-950/45 px-4 py-3 space-y-3">
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
            {streak}-week streak
          </span>
        ) : null}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="This week I decided to..."
          className="weather-input flex-1 min-h-[44px] rounded-md px-3 py-2 text-xs"
        />
        <button
          type="button"
          onClick={handleNoteSave}
          className="weather-button min-h-[44px] rounded-md px-4 py-2 text-xs font-semibold"
        >
          {saving ? "Saved" : "Save"}
        </button>
      </div>
    </div>
  );
}
