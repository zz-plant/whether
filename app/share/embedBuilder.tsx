"use client";

import { useCallback, useState } from "react";
import { useClipboardCopy } from "../components/useClipboardCopy";
import { OPERATOR_STAGE_OPTIONS } from "../../lib/report/operatorStage";
import { siteUrl } from "../../lib/siteUrl";

/**
 * The embed snippet builder, as a section of `/share`.
 *
 * It was its own route. An embed is the same artifact as everything else on
 * this page in a different container, and a reader arriving to "get the brief
 * out" was offered two doors — /share for text, /embed for a widget — with
 * nothing on either saying the other existed. `/embed` redirects here.
 */
const STAGE_OPTIONS = [
  { value: "", label: "Any stage" },
  ...OPERATOR_STAGE_OPTIONS.map((option) => ({ value: option.key, label: option.label })),
] as const;

const DEFAULT_TICKERS = ["", "GOOGL", "MSFT", "DOCU", "COIN", "UBER", "AAPL"];

export function EmbedBuilder() {
  const [ticker, setTicker] = useState("");
  const [stage, setStage] = useState("");
  const { status, copyToClipboard } = useClipboardCopy();
  const copied = status === "copied";
  /* Remounts the preview whenever the snippet's attributes change, so embed.js
     hydrates it again. This was a counter bumped from an effect on every change
     to either field — a second render to reach a value both fields already
     determine. The key is those fields. */
  const previewKey = `${ticker}|${stage}`;

  /* The origin is resolved, not written in: this snippet is the thing a reader
     copies into somebody else's page, and on the preview lane a literal made it
     advertise production — so the preview of the embed could never be a preview
     of the embed. `app/api-docs/page.tsx` already builds this with `siteUrl`. */
  const embedCode = `<div data-whether-embed="brief"${
    ticker ? ` data-whether-ticker="${ticker}"` : ""
  }${stage ? ` data-whether-stage="${stage}"` : ""}></div>
<script async src="${siteUrl}/embed.js"></script>`;

  const handleCopy = useCallback(() => {
    void copyToClipboard(embedCode, "embed");
  }, [copyToClipboard, embedCode]);

  return (
    <div className="space-y-8">
        <div className="mb-8">
          <p className="text-fluid-xs font-semibold tracking-[0.04em] text-sky-300">
            Embed
          </p>
          <h2 className="mt-2 text-xl font-bold tracking-tight text-white/90 sm:text-2xl">
            Add a live brief to a newsletter, wiki or dashboard
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/60">
            Embed the live brief in any newsletter or webpage. Readers get this week&apos;s call, what to do
            now, and what would change it — updated automatically every week.
          </p>
        </div>

        {/* minmax(0,…) and min-w-0: a grid item defaults to min-width:auto, so
            the embed snippet's <pre> pushed its column to 520px inside a 358px
            grid and the page scrolled sideways on a phone. */}
        {/* The default snippet is what nearly everyone pastes. Ticker and stage
            used to be asked for before any preview appeared; they are a
            refinement now, after the copy button. */}
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="min-w-0 space-y-5">
            <div className="weather-card">
              <p className="mb-3 text-fluid-micro font-semibold tracking-[0.04em] text-white/60">
                Live preview
              </p>
              <div
                key={previewKey}
                data-whether-embed="brief"
                {...(ticker ? { "data-whether-ticker": ticker } : {})}
                {...(stage ? { "data-whether-stage": stage } : {})}
                style={{ minHeight: "80px" }}
              >
                <div className="text-fluid-micro text-white/50 py-3 px-3">
                  {`Loading the live brief${ticker ? ` for ${ticker}` : ""}${stage ? ` (${stage})` : ""}…`}
                </div>
              </div>
            </div>
          </div>
          <div className="min-w-0 space-y-5">
            <div className="weather-card">
              <p className="mb-3 text-fluid-micro font-semibold tracking-[0.04em] text-white/60">
                Embed code
              </p>

              <pre className="overflow-x-auto rounded-lg border border-white/[0.10] bg-[var(--bg-nested)] p-3 text-fluid-xs leading-relaxed text-white/60">
                <code>{embedCode}</code>
              </pre>

              <div className="mt-3">
                <button
                  onClick={handleCopy}
                  className={`w-full rounded-lg px-3 py-2 text-fluid-xs font-semibold tracking-[0.04em] transition-colors active:scale-[0.97] ${
                    copied
                      ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40"
                      : "bg-sky-500/20 text-sky-300 hover:bg-sky-500/30 hover:text-sky-200 ring-1 ring-sky-500/30"
                  }`}
                >
                  {copied ? "Copied" : "Copy code"}
                </button>
              </div>

              <p className="mt-3 text-fluid-micro leading-relaxed text-white/60">
                Paste this into any HTML newsletter or webpage. The brief renders live and
                auto-updates weekly. No API key needed.
              </p>
            </div>
          </div>
        </div>

        <details className="weather-auto-chevron rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3">
          <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-3 text-fluid-xs font-semibold text-white/70">
            <span>Customise: ticker and company stage</span>
          </summary>
          <div className="mt-3 max-w-sm">
            <div className="weather-card">
              <p className="mb-3 text-fluid-micro font-semibold tracking-[0.04em] text-white/60">
                Configure
              </p>

              <div className="space-y-3">
                <div>
                  <label htmlFor="embed-ticker" className="block text-fluid-xs font-medium text-white/60">
                    Ticker
                  </label>
                  <input
                    id="embed-ticker"
                    type="text"
                    placeholder="e.g. DOCU…"
                    value={ticker}
                    onChange={(e) => setTicker(e.target.value.toUpperCase().slice(0, 10))}
                    className="mt-1 w-full rounded-lg border border-white/[0.10] bg-[var(--bg-nested)] px-2.5 py-1.5 text-xs text-white/80 focus:border-sky-500/50 focus:outline-none"
                    maxLength={10}
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>

                <div className="flex flex-wrap gap-1">
                  {DEFAULT_TICKERS.map((t) => (
                    <button
                      key={t}
                      onClick={() => setTicker(t)}
                      className={`rounded-md px-2 py-0.5 text-fluid-micro font-medium transition-colors active:scale-[0.97] ${
                        ticker === t
                          ? "bg-sky-500/20 text-sky-300 ring-1 ring-sky-500/40"
                          : "bg-white/[0.06] text-white/60 hover:bg-white/[0.10] hover:text-white/60"
                      }`}
                    >
                      {t || "None"}
                    </button>
                  ))}
                </div>

                <div>
                  <label htmlFor="embed-stage" className="block text-fluid-xs font-medium text-white/60">
                    Company stage
                  </label>
                  <select
                    id="embed-stage"
                    value={stage}
                    onChange={(e) => setStage(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-white/[0.10] bg-[var(--bg-nested)] px-2.5 py-1.5 text-xs text-white/80 focus:border-sky-500/50 focus:outline-none"
                  >
                    {STAGE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

          </div>
        </details>

        <div className="mt-14 border-t border-white/[0.04] pt-10">
          <h3 className="mb-5 text-lg font-semibold text-white/70">How it works</h3>
          <div className="grid gap-5 sm:grid-cols-3">
            {[
              { step: "Copy", desc: "Paste the snippet into your newsletter HTML or website. No API key needed." },
              { step: "Customise", desc: "Optional: pick a ticker and company stage that fits your audience." },
              { step: "Publish", desc: "The brief updates automatically every week. Nothing to maintain." },
            ].map((item) => (
              <div key={item.step} className="weather-card">
                <p className="text-fluid-xs font-semibold tracking-[0.04em] text-sky-300">{item.step}</p>
                <p className="mt-2 text-xs leading-relaxed text-white/60">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 weather-card">
          <p className="text-fluid-xs leading-relaxed text-white/60">
            <strong className="text-white/60">Attribution:</strong> The embed block includes a small
            &ldquo;Macro brief by Whether&rdquo; footer with a link back to whether.work.
            This attribution is required for free embed usage.
          </p>
        </div>
    </div>
  );
}
