"use client";

import { useEffect, useState } from "react";

export function SaaSMultiplesIndicator() {
  const [data, setData] = useState<{ medianEv: number; growth: number; count: number } | null>(null);

  useEffect(() => {
    fetch("/api/comps")
      .then((r) => r.json())
      .then((r) => {
        if (r.medianEvToRevenue) {
          setData({ medianEv: r.medianEvToRevenue, growth: r.medianRevenueGrowth ?? 0, count: r.companyCount });
        }
      })
      .catch(() => {});
  }, []);

  if (!data) return null;

  return (
    <p className="text-fluid-micro text-slate-500">
      Public SaaS EV/Revenue: {data.medianEv.toFixed(1)}x median ({data.count} companies)
    </p>
  );
}
