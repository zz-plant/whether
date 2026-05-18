"use client";

import { useEffect, useState } from "react";
import { useDecisionHistory } from "./useDecisionHistory";

export function DecisionTracker({ action, regime, recordDate, confidence }: {
  action?: string; regime?: string; recordDate?: string; confidence?: string;
}) {
  const [lastDecision, setLastDecision] = useState<{ action: string; regime: string; recordDate: string } | null>(null);
  const { addRecord } = useDecisionHistory();

  useEffect(() => {
    if (!action || !regime || !recordDate) return;
    addRecord({ action, regime, recordDate, confidence: confidence ?? "MED" });
    try {
      const stored = localStorage.getItem("whether_last_decision");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.recordDate !== recordDate) setLastDecision(parsed);
      }
    } catch { /* ignore */ }
    localStorage.setItem("whether_last_decision", JSON.stringify({ action, regime, recordDate }));
  }, [action, regime, recordDate, confidence, addRecord]);

  if (!lastDecision) return null;

  return (
    <div className="mb-3 rounded-lg border border-slate-700/60 bg-slate-950/50 px-4 py-3 text-xs">
      <p className="text-fluid-micro font-semibold uppercase tracking-[0.1em] text-slate-500">Last week</p>
      <p className="mt-1 text-sm text-slate-300">
        <span className="text-slate-400">Decided:</span> {lastDecision.action}
        <span className="text-slate-500 ml-2">· {lastDecision.regime}</span>
      </p>
    </div>
  );
}
