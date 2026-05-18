"use client";

import { useEffect, useState } from "react";

const HISTORY_KEY = "whether_decision_history";

export type DecisionRecord = {
  action: string;
  regime: string;
  recordDate: string;
  confidence: string;
};

const MAX_HISTORY = 24;

export function useDecisionHistory() {
  const [history, setHistory] = useState<DecisionRecord[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      if (stored) setHistory(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  const addRecord = (record: DecisionRecord) => {
    setHistory((prev) => {
      const exists = prev.some((r) => r.recordDate === record.recordDate);
      if (exists) return prev;
      const next = [record, ...prev].slice(0, MAX_HISTORY);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      return next;
    });
  };

  return { history, addRecord };
}
