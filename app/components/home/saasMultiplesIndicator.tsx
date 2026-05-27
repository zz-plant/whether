"use client";

import { useEffect, useState } from "react";

export function SaaSMultiplesIndicator() {
  const [data, setData] = useState<{ medianEv: number; growth: number; count: number } | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/comps", { priority: "low" })
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((r) => {
        if (active && r.medianEvToRevenue) {
          setData({ medianEv: r.medianEvToRevenue, growth: r.medianRevenueGrowth ?? 0, count: r.companyCount });
        }
      })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, []);

  if (failed) return null;
  if (!data) return null;

  return (
    <p className="text-fluid-micro text-slate-500">
      Public SaaS EV/Revenue: {data.medianEv.toFixed(1)}x median ({data.count} companies)
    </p>
  );
}
