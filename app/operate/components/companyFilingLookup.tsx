"use client";

import { useId, useState, type FormEvent } from "react";
import {
  companyFilingLookupSchema,
  describeLookupFailure,
  type companyFilingSchema,
} from "../../../lib/report/companyFiling";
import type { z } from "zod";

type CompanyFiling = z.infer<typeof companyFilingSchema>;

/**
 * Fills the figures below from a public company's latest SEC filing, so a public company's
 * operator types one word instead of four numbers. It says what it will change before it does.
 */
export function CompanyFilingLookup({ onFiling }: { onFiling: (filing: CompanyFiling) => void }) {
  const inputId = useId();
  const [ticker, setTicker] = useState("");
  const [status, setStatus] = useState<"idle" | "loading">("idle");
  const [failure, setFailure] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!ticker.trim()) return;
    setStatus("loading");
    setFailure(null);
    try {
      const response = await fetch(`/api/company-filing?ticker=${encodeURIComponent(ticker.trim())}`);
      const lookup = companyFilingLookupSchema.parse(await response.json());
      if (lookup.ok) onFiling(lookup.filing);
      else setFailure(describeLookupFailure(lookup.failure));
    } catch {
      setFailure(describeLookupFailure("unavailable"));
    } finally {
      setStatus("idle");
    }
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
      <p className="text-xs text-slate-400">
        Replaces your cash, spend, revenue and growth with the latest SEC filing, and sets your stage to Series B+.
      </p>
      {failure ? (
        <output className="block text-xs text-amber-200">{failure}</output>
      ) : null}
    </form>
  );
}
