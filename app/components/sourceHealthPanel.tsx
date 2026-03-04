"use client";

import { useEffect, useState } from "react";

type HealthPayload = {
  status: "ok" | "degraded" | "down";
  generatedAt: string;
  checks?: {
    treasuryData?: {
      status?: string;
      stale?: boolean;
      ageHours?: number | null;
      fetchedAt?: string;
      recordDate?: string;
      source?: string;
    };
  };
};

export function SourceHealthPanel() {
  const [payload, setPayload] = useState<HealthPayload | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    void fetch("/api/health")
      .then(async (response) => {
        const data = (await response.json()) as HealthPayload;
        if (!active) {
          return;
        }
        setPayload(data);
        setFailed(false);
      })
      .catch(() => {
        if (!active) {
          return;
        }
        setFailed(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const status = payload?.status ?? (failed ? "down" : "ok");
  const toneClassName =
    status === "ok"
      ? "border-emerald-400/55 bg-emerald-500/10 text-emerald-100"
      : status === "degraded"
        ? "border-amber-400/60 bg-amber-500/10 text-amber-100"
        : "border-rose-400/55 bg-rose-500/10 text-rose-100";

  const treasury = payload?.checks?.treasuryData;

  return (
    <section className={`weather-surface space-y-2 rounded-xl border px-3 py-3 ${toneClassName}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.12em]">Source health</p>
      <p className="text-xs">
        {failed
          ? "Health status unavailable."
          : status === "ok"
            ? "All critical signal feeds are healthy."
            : status === "degraded"
              ? "Feed freshness is degraded. Review fallback status before committing."
              : "Health checks failed. Pause irreversible decisions."}
      </p>
      {treasury ? (
        <div className="grid gap-1 text-[11px] text-slate-100">
          <p>Treasury feed: {treasury.status ?? "unknown"}</p>
          <p>Stale: {treasury.stale ? "Yes" : "No"}</p>
          <p>Age (hours): {typeof treasury.ageHours === "number" ? treasury.ageHours.toFixed(2) : "—"}</p>
          <p>Last fetched: {treasury.fetchedAt ?? "—"}</p>
          <p>Record date: {treasury.recordDate ?? "—"}</p>
        </div>
      ) : null}
    </section>
  );
}
