"use client";

import { useEffect, useId, useState } from "react";
import type { CompanyMetrics } from "../../../lib/report/companyMetrics";
import { computeMetricsGuidance } from "../../../lib/report/companyMetrics";
import { useCrossDeviceSync } from "../../../lib/hooks/useCrossDeviceSync";

const STORAGE_KEY = "whether_company_metrics";

function loadMetrics(): CompanyMetrics | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveMetrics(metrics: CompanyMetrics) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(metrics));
  } catch { /* quota exceeded — ignore */ }
}

const STAGE_DEFAULTS: Record<string, Partial<CompanyMetrics>> = {
  "pre-seed": { burnRate: 40000, runwayMonths: 12, headcount: 5 },
  seed: { burnRate: 100000, runwayMonths: 18, headcount: 15 },
  "series-a": { burnRate: 200000, runwayMonths: 18, headcount: 40 },
  "series-b-plus": { burnRate: 500000, runwayMonths: 24, headcount: 120 },
  public: { burnRate: 2000000, runwayMonths: 36, headcount: 500 },
};

export function CompanyMetricsPanel({
  tightness,
  companyStage,
}: {
  tightness: number;
  companyStage?: string;
}) {
  const [metrics, setMetrics] = useState<CompanyMetrics | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<CompanyMetrics>({ burnRate: 0, runwayMonths: 0, headcount: 0 });
  const [hydrated, setHydrated] = useState(false);
  const { markDirty } = useCrossDeviceSync(STORAGE_KEY, null);
  const inputId = useId();

  useEffect(() => {
    const saved = loadMetrics();
    if (saved) {
      setMetrics(saved);
    } else if (companyStage && STAGE_DEFAULTS[companyStage]) {
      const defaults = STAGE_DEFAULTS[companyStage];
      const m: CompanyMetrics = {
        burnRate: defaults.burnRate ?? 100000,
        runwayMonths: defaults.runwayMonths ?? 18,
        headcount: defaults.headcount ?? 20,
      };
      setMetrics(m);
      saveMetrics(m);
      markDirty(STORAGE_KEY);
    }
    setHydrated(true);
  }, [companyStage, markDirty]);

  if (!hydrated) return null;

  const guidance = metrics ? computeMetricsGuidance(metrics, tightness) : null;

  const handleSave = () => {
    const m: CompanyMetrics = {
      burnRate: Math.max(1000, form.burnRate),
      runwayMonths: Math.max(1, form.runwayMonths),
      headcount: Math.max(1, form.headcount),
    };
    setMetrics(m);
    saveMetrics(m);
    setEditing(false);
  };

  const handleStartEdit = () => {
    setForm(metrics ?? { burnRate: 100000, runwayMonths: 18, headcount: 20 });
    setEditing(true);
  };

  const formatCurrency = (n: number) =>
    n >= 1000000 ? `$${(n / 1000000).toFixed(1)}M` : `$${Math.round(n / 1000)}K`;

  return (
    <div className="rounded-lg border border-slate-800/60 bg-slate-950/30 px-4 py-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="text-fluid-xs font-semibold uppercase tracking-[0.1em] text-slate-400">Your numbers</p>
        <button
          type="button"
          onClick={editing ? handleSave : handleStartEdit}
          className="min-h-11 min-w-11 px-2 text-fluid-micro text-sky-300 hover:text-sky-200"
        >
          {editing ? "Save" : metrics ? "Edit" : "Set your numbers"}
        </button>
      </div>

      {editing ? (
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div>
            <label htmlFor={`${inputId}-burn`} className="text-slate-500">Monthly burn</label>
            <input
              id={`${inputId}-burn`}
              type="number"
              value={form.burnRate || ""}
              onChange={(e) => setForm((f) => ({ ...f, burnRate: Number(e.target.value) }))}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-slate-200 text-base sm:text-xs"
              placeholder="85000"
            />
          </div>
          <div>
            <label htmlFor={`${inputId}-runway`} className="text-slate-500">Runway (months)</label>
            <input
              id={`${inputId}-runway`}
              type="number"
              value={form.runwayMonths || ""}
              onChange={(e) => setForm((f) => ({ ...f, runwayMonths: Number(e.target.value) }))}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-slate-200 text-base sm:text-xs"
              placeholder="18"
            />
          </div>
          <div>
            <label htmlFor={`${inputId}-headcount`} className="text-slate-500">Headcount</label>
            <input
              id={`${inputId}-headcount`}
              type="number"
              value={form.headcount || ""}
              onChange={(e) => setForm((f) => ({ ...f, headcount: Number(e.target.value) }))}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-slate-200 text-base sm:text-xs"
              placeholder="20"
            />
          </div>
        </div>
      ) : guidance ? (
        <div className="space-y-1 text-xs">
          <p className="text-slate-300">
            <span className="text-slate-500">Burn:</span>{" "}
            <span className="text-slate-200 font-medium">{formatCurrency(metrics!.burnRate)}/mo</span>
            <span className="text-slate-600 mx-1.5">·</span>
            <span className="text-slate-500">Runway:</span>{" "}
            <span className="text-slate-200 font-medium">{metrics!.runwayMonths} mo</span>
            <span className="text-slate-600 mx-1.5">·</span>
            <span className="text-slate-500">Team:</span>{" "}
            <span className="text-slate-200 font-medium">{metrics!.headcount}</span>
          </p>
          {guidance.direction !== "maintain" ? (
            <p className="text-slate-400">
              At current tightness ({tightness}), consider{" "}
              <span className={guidance.direction === "reduce" ? "text-rose-200 font-medium" : "text-emerald-200 font-medium"}>
                {guidance.direction === "reduce" ? "reducing" : "expanding"}
              </span>{" "}
              burn to {formatCurrency(guidance.recommendedBurn)}/mo
              ({guidance.adjustmentPercent > 0 ? `−${guidance.adjustmentPercent}` : `+${Math.abs(guidance.adjustmentPercent)}`}%).
              Extends runway to {guidance.extendedRunway} months.
            </p>
          ) : (
            <p className="text-slate-400">Current burn is appropriate for these conditions.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
