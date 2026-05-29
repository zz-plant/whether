"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "whether_last_tightness";

type Props = {
  tightness: number;
  children: React.ReactNode;
};

export function DeltaBadge({ tightness, children }: Props) {
  const [delta, setDelta] = useState<number | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const last = stored ? Number(stored) : null;
      if (last !== null && last !== tightness) {
        setDelta(tightness - last);
        setVisible(true);
        const timer = setTimeout(() => setVisible(false), 4000);
        return () => clearTimeout(timer);
      }
      localStorage.setItem(STORAGE_KEY, String(tightness));
    } catch { /* localStorage unavailable */ }
  }, [tightness]);

  if (!visible || delta === null || delta === 0) return <>{children}</>;

  const sign = delta > 0 ? "+" : "";
  const color = delta > 0 ? "text-rose-300" : "text-emerald-300";
  const arrow = delta > 0 ? "↑" : "↓";

  return (
    <div className="relative inline-flex items-center">
      {children}
      <span
        className={`absolute -top-2 -right-2 translate-x-full rounded-full border px-2 py-0.5 text-fluid-nano font-bold tracking-[0.04em] whitespace-nowrap animate-[pulse_400ms_ease-out_2] ${color} border-current/20 bg-current/5`}
      >
        {arrow} {sign}{Math.abs(delta).toFixed(1)}
      </span>
    </div>
  );
}
