"use client";

import { useEffect, useState } from "react";
import type { StartupActivitySignals } from "../../../lib/startupActivity";

export function StartupActivity() {
  const [signals, setSignals] = useState<StartupActivitySignals | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    import("../../../lib/startupActivity")
      .then((mod) => mod.getStartupActivitySignals())
      .then((s) => setSignals(s))
      .catch(() => setError(true));
  }, []);

  if (error) return null;

  if (!signals) return null;

  const items: string[] = [];
  if (signals.hiringCommentCount !== null) {
    items.push(`HN hiring thread: ${signals.hiringCommentCount} comments`);
  }
  if (signals.layoffCount !== null && signals.layoffCount > 0) {
    items.push(`${signals.layoffCount} layoff mentions (30d)`);
  }
  if (items.length === 0) return null;

  return (
    <p className="text-fluid-micro text-slate-500">
      {items.join(" · ")}
    </p>
  );
}
