"use client";

import { useEffect, useState } from "react";

const LAST_VISIT_KEY = "whether_last_visit";
const DECISION_LOG_KEY = "whether_decision_log";

type DecisionEntry = { date: string; posture: string; action: string };

export function VisitorContext({
  recordDate,
  postureLabel,
  actionNow,
}: {
  recordDate: string;
  postureLabel: string;
  actionNow?: string;
}) {
  const [isNewWeek, setIsNewWeek] = useState(false);
  const [lastDecision, setLastDecision] = useState<DecisionEntry | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const lastVisit = localStorage.getItem(LAST_VISIT_KEY);
    const today = new Date().toDateString();

    if (lastVisit && lastVisit !== today) {
      const lastDate = new Date(lastVisit);
      const daysSince = Math.floor((Date.now() - lastDate.getTime()) / 86400000);
      if (daysSince >= 3) {
        setIsNewWeek(true);
      }
    }

    const logRaw = localStorage.getItem(DECISION_LOG_KEY);
    if (logRaw) {
      try {
        const log: DecisionEntry[] = JSON.parse(logRaw);
        if (log.length > 0) {
          setLastDecision(log[log.length - 1]);
        }
      } catch { /* ignore corrupt log */ }
    }

    const newEntry: DecisionEntry = { date: recordDate, posture: postureLabel, action: actionNow ?? "" };
    try {
      const existing: DecisionEntry[] = logRaw ? JSON.parse(logRaw) : [];
      const last = existing[existing.length - 1];
      if (!last || last.date !== recordDate || last.posture !== postureLabel) {
        existing.push(newEntry);
        if (existing.length > 52) existing.shift();
        localStorage.setItem(DECISION_LOG_KEY, JSON.stringify(existing));
      }
    } catch { /* ignore storage errors */ }

    localStorage.setItem(LAST_VISIT_KEY, today);
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!hydrated) return null;

  return (
    <>
      {isNewWeek ? (
        <p className="text-fluid-xs text-slate-400 max-w-xl mx-auto text-center">
          Since your last review, conditions have shifted. Here&rsquo;s what changed.
        </p>
      ) : null}

      {lastDecision && lastDecision.posture !== postureLabel ? (
        <p className="text-fluid-xs text-slate-400 max-w-xl mx-auto text-center">
          Previous posture: <span className="text-slate-300">{lastDecision.posture}</span> ·{" "}
          Current: <span className="text-slate-200 font-medium">{postureLabel}</span>
        </p>
      ) : null}
    </>
  );
}
