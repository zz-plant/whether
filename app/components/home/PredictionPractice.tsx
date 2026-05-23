"use client";

import { useEffect, useState } from "react";
import { useCrossDeviceSync } from "../../../lib/hooks/useCrossDeviceSync";

const STORAGE_KEY = "whether_predictions";

type PredictionRecord = {
  date: string;
  predicted: "tighten" | "hold" | "ease";
  actual: "tighten" | "hold" | "ease";
  correct: boolean;
};

function loadHistory(): PredictionRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(records: PredictionRecord[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(-26)));
  } catch { /* quota */ }
}

export function PredictionPractice({
  tightness,
  prevTightness,
  recordDate,
}: {
  tightness: number;
  prevTightness?: number;
  recordDate: string;
}) {
  const [prediction, setPrediction] = useState<"tighten" | "hold" | "ease" | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [history, setHistory] = useState<PredictionRecord[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const { markDirty } = useCrossDeviceSync(STORAGE_KEY, []);

  useEffect(() => {
    setHistory(loadHistory());
    setHydrated(true);
  }, []);

  if (!hydrated) return null;

  const delta = prevTightness != null ? tightness - prevTightness : 0;
  const actual: "tighten" | "hold" | "ease" = delta > 1 ? "tighten" : delta < -1 ? "ease" : "hold";

  const handleSubmit = (pred: "tighten" | "hold" | "ease") => {
    setPrediction(pred);
    setSubmitted(true);
    const correct = pred === actual;
    const record: PredictionRecord = { date: recordDate, predicted: pred, actual, correct };
    const updated = [...history, record];
    setHistory(updated);
    saveHistory(updated);
    markDirty(STORAGE_KEY);
  };

  const accuracy = history.length > 0
    ? Math.round((history.filter((r) => r.correct).length / history.length) * 100)
    : null;

  const tendency = history.length >= 4
    ? (() => {
        const tightens = history.filter((r) => r.predicted === "tighten").length;
        const holds = history.filter((r) => r.predicted === "hold").length;
        const eases = history.filter((r) => r.predicted === "ease").length;
        if (tightens > holds && tightens > eases) return "You tend to predict tightening.";
        if (eases > holds && eases > tightens) return "You tend to predict easing.";
        return "You tend to predict holding steady.";
      })()
    : null;

  const missesPattern = history.length >= 6
    ? (() => {
        const misses = history.filter((r) => !r.correct);
        const overTightens = misses.filter((r) => r.predicted === "tighten" && r.actual === "hold");
        const underTightens = misses.filter((r) => r.predicted === "hold" && r.actual === "tighten");
        if (overTightens.length > underTightens.length) return "When you're wrong, you tend to overestimate tightening.";
        if (underTightens.length > overTightens.length) return "When you're wrong, you tend to underestimate tightening.";
        return null;
      })()
    : null;

  if (!submitted) {
    return (
      <div className="rounded-lg border border-slate-800/60 bg-slate-950/20 px-4 py-3">
        <p className="text-fluid-xs font-semibold text-slate-400 mb-2">What do you think changed this week?</p>
        <div className="flex gap-2">
          {(["tighten", "hold", "ease"] as const).map((pred) => (
            <button
              key={pred}
              type="button"
              onClick={() => handleSubmit(pred)}
              className="flex-1 rounded-md border border-slate-700 bg-slate-900/50 px-3 py-2 text-xs font-medium text-slate-300 hover:border-sky-500/40 hover:text-sky-200 transition-colors"
            >
              {pred === "tighten" ? "↑ Tightened" : pred === "ease" ? "↓ Eased" : "→ Held steady"}
            </button>
          ))}
        </div>
        {accuracy != null ? (
          <p className="mt-2 text-fluid-micro text-slate-600">
            Your accuracy: {accuracy}% over {history.length} week{history.length === 1 ? "" : "s"}
          </p>
        ) : null}
      </div>
    );
  }

  const wasCorrect = prediction === actual;

  return (
    <div className={`rounded-lg border px-4 py-3 ${wasCorrect ? "border-emerald-500/20 bg-emerald-500/5" : "border-amber-500/20 bg-amber-500/5"}`}>
      <p className="text-fluid-xs font-semibold text-slate-400">
        {wasCorrect ? "✓ Correct" : "✗ Missed it"}
      </p>
      <p className="mt-1 text-sm text-slate-300">
        You predicted {prediction === "tighten" ? "tightening" : prediction === "ease" ? "easing" : "holding steady"}.
        Tightness {actual === "tighten" ? "increased" : actual === "ease" ? "decreased" : "held steady"}
        {delta !== 0 ? ` (${delta > 0 ? "+" : ""}${delta.toFixed(0)} pts)` : ""}.
      </p>
      {accuracy != null ? (
        <p className="mt-1 text-fluid-micro text-slate-500">
          Your accuracy: {accuracy}% over {history.length} week{history.length === 1 ? "" : "s"}.
          {tendency ? ` ${tendency}` : ""}
        </p>
      ) : null}
      {missesPattern ? (
        <p className="mt-1 text-fluid-micro text-amber-200/80">{missesPattern}</p>
      ) : null}
      <p className="mt-1.5 text-[0.55rem] text-slate-700">Local only — not synced across devices</p>
    </div>
  );
}
