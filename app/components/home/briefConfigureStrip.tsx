"use client";

import { useEffect, useState } from "react";

const CONFIG_DISMISS_KEY = "whether.config.dismissed";
const TICKER_KEY = "whether.config.ticker";
const STAGE_KEY = "whether.config.stage";

const STAGE_OPTIONS = [
  { value: "", label: "Generic US market" },
  { value: "seed", label: "Seed" },
  { value: "series-a", label: "Series A" },
  { value: "growth", label: "Growth stage" },
  { value: "public", label: "Public company" },
] as const;

export function BriefConfigureStrip() {
  const [visible, setVisible] = useState(false);
  const [ticker, setTicker] = useState("");
  const [stage, setStage] = useState("");

  useEffect(() => {
    const dismissed = localStorage.getItem(CONFIG_DISMISS_KEY);
    const savedTicker = localStorage.getItem(TICKER_KEY) ?? "";
    const savedStage = localStorage.getItem(STAGE_KEY) ?? "";
    setTicker(savedTicker);
    setStage(savedStage);
    if (!dismissed) {
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem(CONFIG_DISMISS_KEY, "1");
    if (ticker.trim()) localStorage.setItem(TICKER_KEY, ticker.trim());
    if (stage) localStorage.setItem(STAGE_KEY, stage);
    setVisible(false);
  };

  const clearConfig = () => {
    localStorage.removeItem(TICKER_KEY);
    localStorage.removeItem(STAGE_KEY);
    localStorage.removeItem(CONFIG_DISMISS_KEY);
    setTicker("");
    setStage("");
    setVisible(true);
  };

  if (!visible && !ticker && !stage) return null;

  return (
    <div className="weather-surface-secondary mx-auto mb-4 max-w-3xl px-4 py-3 text-sm text-slate-200">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-fluid-micro font-semibold uppercase tracking-[0.12em] text-slate-400">
            Configure your brief
          </p>
          <p className="mt-1 text-fluid-xs leading-5 text-slate-400">
            Tailor this brief to your situation &mdash; adjusts which decisions are highlighted and how they&apos;re framed.
          </p>
          {visible ? (
            <div className="mt-2 flex flex-wrap items-end gap-2">
              <div className="min-w-0 flex-1">
                <label htmlFor="brief-ticker" className="block text-fluid-xs font-medium text-slate-400">
                  Company ticker (optional)
                </label>
                <input
                  id="brief-ticker"
                  type="text"
                  placeholder="e.g. DOCU"
                  value={ticker}
                  onChange={(e) => setTicker(e.target.value.toUpperCase().slice(0, 10))}
                  className="mt-1 w-full max-w-[10rem] rounded-lg border border-slate-700/60 bg-slate-900/70 px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:border-sky-400/60 focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="brief-stage" className="block text-fluid-xs font-medium text-slate-400">
                  Company stage
                </label>
                <select
                  id="brief-stage"
                  value={stage}
                  onChange={(e) => setStage(e.target.value)}
                  className="mt-1 rounded-lg border border-slate-700/60 bg-slate-900/70 px-2.5 py-1.5 text-xs text-slate-100 focus:border-sky-400/60 focus:outline-none"
                >
                  {STAGE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          ) : null}
          {!visible && (ticker || stage) ? (
            <p className="mt-1 text-xs text-slate-300">
              Configured for{stage ? ` ${STAGE_OPTIONS.find((o) => o.value === stage)?.label ?? stage}` : ""}{ticker ? ` • ${ticker}` : ""}
              {" "}
              <button onClick={clearConfig} className="text-sky-400 underline underline-offset-2 hover:text-sky-300">
                Clear
              </button>
            </p>
          ) : null}
        </div>
        {visible ? (
          <button
            onClick={dismiss}
            className="flex-shrink-0 rounded-full px-3 py-1 text-fluid-xs font-semibold uppercase tracking-[0.08em] text-sky-300 hover:bg-sky-400/10 hover:text-sky-100 transition-colors"
            aria-label="Apply configuration"
          >
            Apply
          </button>
        ) : null}
      </div>
    </div>
  );
}