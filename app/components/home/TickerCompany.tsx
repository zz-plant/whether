"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { DataCard } from "../DataCard";
import { computeSensitivity } from "../../../lib/sensitivityCoefficient";
import { ErrorState } from "./ErrorState";

const STORAGE_KEY = "whether_ticker";
const METRICS_KEY = "whether_company_metrics";

type CompanyData = {
  ticker: string;
  price?: number;
  marketCap?: number;
  revenue?: number;
  revenueGrowth?: number;
  totalDebt?: number;
  totalCash?: number;
  fcfMargin?: number | null;
  evToRevenue?: number | null;
  peerGrowthRank?: { rank: number; total: number; percentile: number };
  peerFcfRank?: { rank: number; total: number; percentile: number };
};

function formatCurrency(n?: number): string {
  if (n == null) return "—";
  if (n >= 1e12) return `$${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${Math.round(n / 1000)}K`;
}

export function TickerCompany({
  tightness,
}: {
  tightness: number;
}) {
  const [ticker, setTicker] = useState("");
  const [input, setInput] = useState("");
  const [data, setData] = useState<CompanyData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [sensitivity, setSensitivity] = useState<{
    score: number;
    primaryRisk: string;
    explanation: string;
    adjustment: string;
  } | null>(null);

  const fetchData = async (symbol: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/company?ticker=${encodeURIComponent(symbol)}`);
      if (res.ok) {
        const json: CompanyData = await res.json();
        setData(json);
      } else {
        const err = await res.json().catch(() => ({ error: "Failed" }));
        setError(err.error ?? "Failed to fetch");
        setData(null);
      }
    } catch {
      setError("Network error");
    }
    setLoading(false);
  };

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setTicker(saved);
      fetchData(saved);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!data) {
      setSensitivity(null);
      return;
    }
    const metricsRaw = localStorage.getItem(METRICS_KEY);
    const metrics = metricsRaw ? JSON.parse(metricsRaw) : {};
    const s = computeSensitivity({
      stage: metrics.companyStage,
      revenueGrowth: data.revenueGrowth ? data.revenueGrowth / 100 : undefined,
      fcfMargin: data.fcfMargin ? data.fcfMargin / 100 : undefined,
      runwayMonths: metrics.runwayMonths,
      burnRate: metrics.burnRate,
      tightness,
    });
    setSensitivity(s);
  }, [data, tightness]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const symbol = input.toUpperCase().trim();
    if (!symbol || symbol.length > 5) return;
    setTicker(symbol);
    localStorage.setItem(STORAGE_KEY, symbol);
    fetchData(symbol);
  };

  const handleClear = () => {
    setTicker("");
    setInput("");
    setData(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  if (!hydrated) return null;

  return (
    <div className="space-y-3">
      {!ticker ? (
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <label htmlFor="ticker-input" className="sr-only">Ticker symbol</label>
          <input
            id="ticker-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value.toUpperCase())}
            placeholder="e.g. CRM…"
            className="flex-1 rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 max-w-[14rem]"
            maxLength={5}
            autoComplete="off"
          />
          <Button
            type="submit"
            disabled={loading || input.length < 1}
            variant="default"
            size="sm"
          >
            {loading ? "…" : "Load"}
          </Button>
        </form>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-100">{ticker}</span>
          <button
            type="button"
            onClick={handleClear}
            className="min-h-11 min-w-11 px-2 text-fluid-micro text-slate-500 hover:text-slate-300"
          >
            Change
          </button>
          {loading ? (
            <span className="text-fluid-micro text-slate-600">Loading…</span>
          ) : null}
        </div>
      )}

      {error ? (
        <ErrorState title={error} description="Check the ticker symbol or try again later." onRetry={() => ticker ? fetchData(ticker) : undefined} />
      ) : null}

      {data ? (
        <div className="space-y-2">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <DataCard
              variant="metric"
              label="Revenue"
              value={formatCurrency(data.revenue)}
            />
            <DataCard
              variant="metric"
              label="Growth"
              value={data.revenueGrowth != null ? `${data.revenueGrowth}%` : "—"}
              status={data.revenueGrowth != null && data.revenueGrowth > 15 ? { label: "Strong", tone: "positive" } : data.revenueGrowth != null && data.revenueGrowth > 5 ? { label: "Moderate", tone: "warning" } : data.revenueGrowth != null ? { label: "Slow", tone: "negative" } : undefined}
            />
            <DataCard
              variant="metric"
              label="FCF margin"
              value={data.fcfMargin != null ? `${data.fcfMargin > 0 ? "+" : ""}${data.fcfMargin}%` : "—"}
              status={data.fcfMargin != null && data.fcfMargin > 5 ? { label: "Strong", tone: "positive" } : data.fcfMargin != null && data.fcfMargin > 0 ? { label: "OK", tone: "warning" } : data.fcfMargin != null ? { label: "Burning", tone: "negative" } : undefined}
            />
            <DataCard
              variant="metric"
              label="EV/Revenue"
              value={data.evToRevenue != null ? `${data.evToRevenue}x` : "—"}
            />
          </div>

          {(data.peerGrowthRank || data.peerFcfRank) ? (
            <DataCard variant="narrative" label="Peer comparison">
              <div className="space-y-1 text-xs text-slate-300 mt-1">
                {data.peerGrowthRank ? (
                  <p>
                    Growth: <span className="font-semibold text-slate-100">#{data.peerGrowthRank.rank} of {data.peerGrowthRank.total}</span>{" "}
                    peers ({data.peerGrowthRank.percentile}th percentile)
                  </p>
                ) : null}
                {data.peerFcfRank ? (
                  <p>
                    Capital efficiency: <span className="font-semibold text-slate-100">#{data.peerFcfRank.rank} of {data.peerFcfRank.total}</span>{" "}
                    peers ({data.peerFcfRank.percentile}th percentile)
                  </p>
                ) : null}
              </div>
            </DataCard>
          ) : null}

          {sensitivity ? (
            <DataCard variant="narrative" label="Macro sensitivity">
              <div className="space-y-1.5 mt-1">
                <div className="flex items-center gap-2">
                  <span className={`inline-block w-10 h-6 rounded-full text-center text-xs font-bold leading-6 ${
                    sensitivity.score >= 7 ? "bg-rose-500/20 text-rose-300" :
                    sensitivity.score >= 4 ? "bg-amber-500/20 text-amber-300" :
                    "bg-emerald-500/20 text-emerald-300"
                  }`}>
                    {sensitivity.score}/10
                  </span>
                  <span className="text-xs text-slate-300">{sensitivity.explanation}</span>
                </div>
                <p className="text-xs text-slate-500">
                  <span className="font-semibold text-slate-400">Adjust:</span>{" "}
                  {sensitivity.adjustment}
                </p>
              </div>
            </DataCard>
          ) : null}

          {data.revenue && tightness ? (
            <p className="text-fluid-xs text-slate-500">
              At current tightness ({tightness}),{" "}
              {data.revenueGrowth != null && data.revenueGrowth > 10
                ? "your growth is above the sector median. Focus tightening on spend efficiency rather than headcount."
                : data.fcfMargin != null && data.fcfMargin < 0
                  ? "your burn rate is above peers. Prioritize reducing spend to reach FCF breakeven."
                  : "your metrics are in-line with peers. Follow the macro call without additional adjustments."}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
