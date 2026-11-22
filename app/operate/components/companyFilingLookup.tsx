"use client";

import { useId, useState, type FormEvent } from "react";
import {
  companyFilingLookupSchema,
  describeLookupFailure,
  type companyFilingSchema,
} from "../../../lib/report/companyFiling";
import type { z } from "zod";

type CompanyFiling = z.infer<typeof companyFilingSchema>;

const SAMPLE_TICKERS = ["NET", "DOCU", "DDOG", "ABNB"] as const;

/**
 * Fills the figures below from a public company's latest SEC filing, so a public company's
 * operator types one word instead of four numbers. It says what it will change before it does.
 */
export function CompanyFilingLookup({ onFiling }: { onFiling: (filing: CompanyFiling) => void }) {
  const inputId = useId();
  const [ticker, setTicker] = useState("");
  const [status, setStatus] = useState<"idle" | "loading">("idle");
  const [failure, setFailure] = useState<string | null>(null);

  const fetchFiling = async (rawTicker: string) => {
    const clean = rawTicker.trim().toUpperCase().slice(0, 10);
    if (!clean) return;
    setTicker(clean);
    setStatus("loading");
    setFailure(null);
    try {
      const response = await fetch(`/api/company-filing?ticker=${encodeURIComponent(clean)}`);
      const lookup = companyFilingLookupSchema.parse(await response.json());
      if (lookup.ok) onFiling(lookup.filing);
      else setFailure(describeLookupFailure(lookup.failure));
    } catch {
      setFailure(describeLookupFailure("unavailable"));
    } finally {
      setStatus("idle");
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await fetchFiling(ticker);
  };

  return (
    <form onSubmit={handleSubmit} className="weather-surface space-y-2 p-3" data-testid="company-filing-lookup">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-0 flex-1">
          <label htmlFor={inputId} className="block text-sm text-slate-200">
            Public company? Your ticker
          </label>
          <input
            id={inputId}
            type="text"
            value={ticker}
            onChange={(event) => setTicker(event.target.value.toUpperCase().slice(0, 10))}
            placeholder="e.g. DOCU"
            maxLength={10}
            autoComplete="off"
            spellCheck={false}
            className="weather-input mt-1 w-full px-3 py-2"
          />
        </div>
        <button
          type="submit"
          disabled={status === "loading" || !ticker.trim()}
          className="weather-button weather-focus-ring weather-press-scale inline-flex min-h-11 items-center justify-center px-3 text-sm font-medium disabled:opacity-60"
        >
          {status === "loading" ? "Reading the filing…" : "Fill from filing"}
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400" data-sample-tickers>
        <span>Try a live filing:</span>
        {SAMPLE_TICKERS.map((symbol) => (
          <button
            key={symbol}
            type="button"
            disabled={status === "loading"}
            data-sample-ticker={symbol}
            onClick={() => {
              void fetchFiling(symbol);
            }}
            className="weather-hit weather-focus-ring rounded-md border border-[color:var(--border-subtle)] bg-[color:var(--bg-nested)] px-2 py-0.5 font-mono text-xs font-medium text-slate-200 transition-colors hover:border-[color:var(--border-strong)] hover:text-white disabled:opacity-60"
          >
            {symbol}
          </button>
        ))}
      </div>
      <p className="text-xs text-slate-400">
        Replaces your cash, spend, revenue and growth with the latest SEC filing, and sets your stage to Series B+.
      </p>
      {failure ? (
        <output className="block text-xs text-amber-200">{failure}</output>
      ) : null}
    </form>
  );
}
