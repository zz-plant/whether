"use client";

import { useEffect, useRef, useState } from "react";

type LiveTightnessProps = {
  initialTightness: number;
  recordDate: string;
};

export function LiveTightness({ initialTightness, recordDate }: LiveTightnessProps) {
  const [tightness, setTightness] = useState(initialTightness);
  const [changed, setChanged] = useState(false);
  const mounted = useRef(true);
  const currentTightness = useRef(initialTightness);

  useEffect(() => {
    mounted.current = true;
    const POLL_MS = 300_000;

    const poll = async () => {
      if (!mounted.current) return;
      try {
        const res = await fetch("/api/agent?cadence=weekly");
        if (!res.ok || !mounted.current) return;
        const json = await res.json();
        if (!mounted.current) return;
        const next = json.diagnostics?.currentScores?.tightness;
        if (typeof next === "number" && next !== currentTightness.current) {
          currentTightness.current = next;
          setTightness(next);
          setChanged(true);
          setTimeout(() => mounted.current && setChanged(false), 3000);
        }
      } catch {}
    };

    const interval = setInterval(poll, POLL_MS);
    return () => {
      mounted.current = false;
      clearInterval(interval);
    };
  }, []);

  if (tightness === initialTightness && !changed) return null;

  return (
    <div
      className={`text-fluid-micro text-slate-500 text-center mt-1 transition-opacity duration-500 ${changed ? "animate-pulse" : ""}`}
    >
      Updated: tightness now <span className="font-bold text-slate-300">{tightness}</span>
      {changed ? " (changed since page load)" : ""}
    </div>
  );
}
