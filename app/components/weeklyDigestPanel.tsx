"use client";

import { useEffect, useState } from "react";
import type { RegimeAssessment } from "../../lib/regimeEngine";
import { buildSignsToWatch } from "../../lib/report/reportNarrative";
import { formatTimestampUTC } from "../../lib/formatters";

type WeeklyDigestPayload = {
  version?: string;
  generatedAt: string;
  alertCount?: number;
  deliveryCount?: number;
  degraded?: boolean;
  deprecated?: {
    alertCount?: number;
    deliveryCount?: number;
    note?: string;
  };
  digest: {
    summary: string;
    bullets: string[];
  };
};

export const WeeklyDigestPanel = ({ assessment }: { assessment: RegimeAssessment }) => {
  const [payload, setPayload] = useState<WeeklyDigestPayload | null>(null);
  const [failed, setFailed] = useState(false);
  const signsToWatch = buildSignsToWatch(assessment);
  const alertCount = payload?.alertCount ?? payload?.deprecated?.alertCount ?? 0;
  const deliveryCount = payload?.deliveryCount ?? payload?.deprecated?.deliveryCount ?? 0;

  useEffect(() => {
    let active = true;
    void fetch("/api/weekly-digest")
      .then(async (response) => {
        if (!response.ok) {
          return;
        }
        const data = (await response.json()) as WeeklyDigestPayload;
        if (active) {
          setPayload(data);
        }
      })
      .catch(() => { if (active) setFailed(true); });

    return () => {
      active = false;
    };
  }, []);

  return (
    <section id="weekly-digest" aria-labelledby="weekly-digest-title" className="mt-10">
      <div className="weather-panel p-6">
        <p className="type-label text-slate-400">Signal chronicle</p>
        <h3 id="weekly-digest-title" className="type-section text-slate-100">
          Weekly signs & outlook
        </h3>
        <p className="mt-2 type-data text-slate-300">
          Regime-change digest with threshold-crossing context and reason codes.
        </p>

        <div className="mt-6 weather-surface p-4">
          <p className="text-sm text-slate-100">{failed ? "Digest temporarily unavailable" : payload?.digest.summary ?? "Loading digest…"}</p>
          <ul className="mt-3 space-y-2 text-sm text-slate-300">
            {(payload?.digest.bullets ?? []).map((bullet) => (
              <li key={bullet} className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-500" />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
          {payload ? (
            <p className="mt-3 text-xs text-slate-400">
              {alertCount} alerts tracked · {deliveryCount} deliveries · generated {formatTimestampUTC(payload.generatedAt)}
            </p>
          ) : null}
        </div>

        <div className="mt-4 weather-surface p-4">
          <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">Signs to watch</p>
          <ul className="mt-3 space-y-2 text-sm text-slate-300">
            {signsToWatch.map((sign) => (
              <li key={sign} className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-sky-300" />
                <span>{sign}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};
